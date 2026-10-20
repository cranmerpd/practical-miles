import { useMemo, useState } from "react";
import { havMiles, labelPlace, lookupZip, planRoad } from "@/game/geo";
import { dueDayLabel, isCommitted, isTractor, KIND_INFO, money, type Kind, type Listing, type Vehicle } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { Notice, Panel, PlaceSearch, pounds, cubes, useWorld } from "@/components/desk/bits";
import { onTheRoad, readTrip, resale } from "@/components/desk/trip";

function sellOffer(vehicle: Vehicle): number {
  return Math.round(
    vehicle.price * 0.55 * (vehicle.condition / 100) * (vehicle.kind === "trailer53" ? 1 : Math.max(0.45, 1 - vehicle.mileage / 900000)),
  );
}

export function Fleet() {
  const { world, company } = useWorld();
  const [buying, setBuying] = useState(false);
  const [kind, setKind] = useState<Kind | "all">("all");
  const [age, setAge] = useState<"all" | "new" | "used">("all");
  if (!company) return null;
  const trucks = company.vehicles.filter((vehicle) => vehicle.kind !== "trailer53");
  const trailers = company.vehicles.length - trucks.length;
  const out = company.vehicles.filter((vehicle) => onTheRoad(vehicle));
  const fuelGallons = trucks.reduce((sum, vehicle) => sum + Math.max(0, vehicle.fuel), 0);
  const worth = company.vehicles.reduce((sum, vehicle) => sum + resale(vehicle), 0);
  const condition = trucks.length ? trucks.reduce((sum, vehicle) => sum + vehicle.condition, 0) / trucks.length : 0;
  const shown = world.listings
    .filter((listing) => (kind === "all" || listing.kind === kind) && (age === "all" || (age === "new" ? Boolean(listing.fresh) : !listing.fresh)))
    .slice()
    .sort((a, b) => LOT.indexOf(a.kind) - LOT.indexOf(b.kind) || Number(Boolean(b.fresh)) - Number(Boolean(a.fresh)) || a.price - b.price);

  return (
    <div className="space-y-4">
      <Panel title="The fleet">
        {company.vehicles.length === 0 ? (
          <p className="text-sm text-ink/70">No trucks yet. A used cargo van is the usual first buy. The seller drives it to a warehouse you pick. That delivery fee is not your fuel.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Power units" value={String(trucks.length)} />
            <Stat label="Trailers" value={String(trailers)} />
            <Stat label="Out" value={String(out.length)} />
            <Stat label="Parked" value={String(company.vehicles.length - out.length)} />
            <Stat label="Average condition" value={trucks.length ? String(Math.round(condition)) : "—"} />
            <Stat label="Fuel in the tanks" value={`${Math.round(fuelGallons).toLocaleString("en-US")} gal`} />
            <Stat label="Sell today" value={money(worth)} />
          </dl>
        )}
        <div className="mt-3">
          <Button variant={buying ? "quiet" : "primary"} onClick={() => setBuying((value) => !value)}>
            {buying ? "Hide the lot" : "Purchase more vehicles"}
          </Button>
        </div>
      </Panel>
      {buying || company.vehicles.length === 0 ? (
        <Panel title="For sale" extra={<span className="text-sm text-ink/60">{shown.length} shown</span>}>
          <div className="mb-3 flex flex-wrap gap-2">
            <LotFilter on={kind === "all"} label="All types" set={() => setKind("all")} />
            {LOT.map((item) => (
              <LotFilter key={item} on={kind === item} label={KIND_INFO[item].label} set={() => setKind(item)} />
            ))}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <LotFilter on={age === "all"} label="New and used" set={() => setAge("all")} />
            <LotFilter on={age === "new"} label="New" set={() => setAge("new")} />
            <LotFilter on={age === "used"} label="Used" set={() => setAge("used")} />
          </div>
          {shown.length === 0 ? (
            <p className="text-sm text-ink/70">Nothing in this filter. Sellers post again as trucks are bought.</p>
          ) : (
            <ul className="space-y-4">
              {shown.map((listing) => (
                <Lot key={listing.id} listing={listing} />
              ))}
            </ul>
          )}
        </Panel>
      ) : null}
      {company.vehicles.length > 0 ? (
        <Panel title="Equipment">
          <ul className="space-y-4">
            {company.vehicles.map((vehicle) => (
              <Owned key={vehicle.id} vehicle={vehicle} />
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function Owned({ vehicle }: { vehicle: Vehicle }) {
  const { world, company } = useWorld();
  const sellTruck = useDesk((s) => s.sellTruck);
  const repair = useDesk((s) => s.repair);
  const sendTruck = useDesk((s) => s.sendTruck);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [zip, setZip] = useState<string | null>(null);
  const [driverId, setDriverId] = useState(vehicle.driverId ?? "");
  if (!company) return null;
  const spec = KIND_INFO[vehicle.kind];
  const driver = company.drivers.find((item) => item.id === vehicle.driverId);
  const atYard = company.warehouses.some((yard) => yard.zip === vehicle.zip);
  const idle = vehicle.status === "idle" && !isCommitted(vehicle);
  const repairCost = Math.round(((100 - vehicle.condition) / 100) * 0.1 * vehicle.price);
  const drivers = company.drivers.filter((item) => !item.vehicleId && item.warehouseId && company.warehouses.some((yard) => yard.id === item.warehouseId && yard.zip === vehicle.zip));
  const eligible = drivers.filter((item) => (!spec.cdl || item.cdl) && !(item.restUntil != null && world.simHours < item.restUntil));
  const trip = readTrip(world, company, vehicle);
  const legLeft = Math.max(0, vehicle.routeMiles - vehicle.traveled);
  const dest = vehicle.legs[0]?.toZip ?? vehicle.zip;

  return (
    <li className="space-y-2 border-b border-ink/10 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{spec.label}</p>
        <p className="text-sm tabular-nums text-ink/70">
          {vehicle.status === "inbound" ? "Seller is delivering it" : trip ? trip.leg : "Parked"} · {labelPlace(vehicle.zip)}
        </p>
      </div>
      <p className="text-sm text-ink/70">
        {Math.round(vehicle.mileage).toLocaleString("en-US")} mi on the odometer
        {spec.tank > 0 ? ` · fuel ${Math.round(vehicle.fuel)}/${spec.tank} gal` : ""}
        {driver ? ` · ${driver.name}` : ""}
        {spec.payload ? ` · holds ${pounds(spec.payload)}, ${cubes(spec.cube)}` : ""}
        {isTractor(vehicle.kind) ? " · needs a trailer and a CDL" : ""}
      </p>
      <Meter label="Condition" used={vehicle.condition} cap={100} />
      {trip ? (
        <div className="space-y-2 border border-ink/10 p-3 text-sm">
          <p>
            Toward {trip.heading}. {Math.max(1, Math.round(trip.milesLeft)).toLocaleString("en-US")} miles left on the whole trip.
            {trip.stopsLeft > 1 ? ` ${trip.stopsLeft} deliveries still aboard.` : ""}
          </p>
          {vehicle.routeMiles > 0 ? <Meter label="This leg" used={vehicle.traveled} cap={vehicle.routeMiles} /> : null}
          <p className="text-ink/70">
            {legLeft > 0 ? `${Math.round(legLeft).toLocaleString("en-US")} miles left on this leg. ` : ""}
            Driven {(driver?.driveToday ?? vehicle.driveToday).toFixed(1)} of 11 hours today.
          </p>
          {trip.pay > 0 ? (
            <p className={trip.afterFuel < 0 ? "text-rust" : "text-pine"}>
              Still owed {money(trip.balance)}. Fuel still to burn {money(trip.burn)}. After that fuel, {money(trip.afterFuel)}.
            </p>
          ) : (
            <p>No customer is paying for this move. Fuel still to burn is about {money(trip.burn)}.</p>
          )}
          {trip.dueAt != null && trip.dueAt > 0 ? <p className="text-ink/70">{dueDayLabel(world.simHours, trip.dueAt, dest)}.</p> : trip.dueAt === 0 ? <p className="text-ink/70">The run starts at pickup.</p> : null}
        </div>
      ) : (
        <p className="text-sm text-ink/60">{atYard ? "Parked at your warehouse." : `Parked in ${labelPlace(vehicle.zip)}.`}</p>
      )}
      {idle && atYard ? (
        <div className="flex flex-wrap gap-2">
          {vehicle.condition < 99 ? (
            <Button variant="quiet" onClick={() => setNote(repair(vehicle.id))}>
              Repair for {money(repairCost)}
            </Button>
          ) : null}
          {!vehicle.driverId ? (
            <Button variant="quiet" onClick={() => setNote(sellTruck(vehicle.id))}>
              Sell for about {money(sellOffer(vehicle))}
            </Button>
          ) : (
            <p className="self-center text-sm text-ink/60">The driver stays with it until it parks at one of your warehouses.</p>
          )}
          {vehicle.kind !== "trailer53" ? (
            <Button variant="ghost" onClick={() => setOpen((value) => !value)}>
              {open ? "Close empty move" : "Send empty"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {open && idle ? (
        <div className="space-y-2">
          <PlaceSearch label="Send toward" onPick={setZip} />
          {!vehicle.driverId ? (
            <Field label="Driver">
              <Select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
                <option value="">Choose</option>
                {eligible.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.cdl ? " · CDL" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Button
            disabled={!zip || (!vehicle.driverId && !driverId)}
            onClick={() => setNote(sendTruck(vehicle.id, zip ?? "", vehicle.driverId ?? driverId))}
          >
            Send
          </Button>
        </div>
      ) : null}
      <Notice text={note} />
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className="mt-1 font-display text-3xl leading-none tabular-nums">{value}</dd>
    </div>
  );
}

function Meter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = cap > 0 ? Math.max(0, Math.min(100, (used / cap) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs uppercase tracking-widest text-ink/45">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="h-1 bg-ink/10">
        <div className="h-1 bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LotFilter({ on, label, set }: { on: boolean; label: string; set: () => void }) {
  return (
    <button type="button" className={`min-h-11 border px-3 text-sm ${on ? "border-ink bg-ink text-paper" : "border-ink/20"}`} onClick={set}>
      {label}
    </button>
  );
}

const LOT: Kind[] = ["van", "box16", "box26", "daycab", "sleeper", "trailer53"];

function Lot({ listing }: { listing: Listing }) {
  const { company } = useWorld();
  const buyTruck = useDesk((s) => s.buyTruck);
  const [yardId, setYardId] = useState(company?.warehouses[0]?.id ?? "");
  const [note, setNote] = useState<string | null>(null);
  const yard = company?.warehouses.find((item) => item.id === yardId) ?? company?.warehouses[0];
  const fee = useMemo(() => {
    if (!yard) return null;
    const plan = planRoad(listing.zip, yard.zip);
    return plan ? Math.round(plan.miles * 2) : null;
  }, [listing.zip, yard]);
  if (!company || !yard || fee == null) return null;
  const spec = KIND_INFO[listing.kind];
  const total = listing.price + fee;
  const here = lookupZip(listing.zip);
  const near = here
    ? company.warehouses.reduce<{ miles: number; zip: string } | null>((best, item) => {
        const place = lookupZip(item.zip);
        if (!place) return best;
        const miles = havMiles(here.lat, here.lon, place.lat, place.lon);
        return !best || miles < best.miles ? { miles, zip: item.zip } : best;
      }, null)
    : null;
  return (
    <li className="space-y-2 border-b border-ink/10 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{listing.fresh ? "New " : ""}{spec.label}</p>
        <p className="tabular-nums font-semibold">{money(listing.price)}</p>
      </div>
      <p className="text-sm text-ink/70">
        {listing.fresh ? "New. No miles. Priced above the used book." : `Used. Condition ${listing.condition}. ${listing.mileage.toLocaleString("en-US")} mi.`}
        {" "}Seller in {labelPlace(listing.zip)}
        {near ? `. About ${Math.round(near.miles).toLocaleString("en-US")} miles from ${labelPlace(near.zip)}` : ""}.
      </p>
      <p className="text-sm text-ink/70">
        {spec.payload ? `Holds ${pounds(spec.payload)} and ${cubes(spec.cube)}. ` : "Pulls a trailer. "}
        {spec.mpg ? `${spec.mpg} mpg. ` : ""}
        {spec.cdl ? "Needs a CDL driver. " : ""}
      </p>
      <Field label="Deliver to">
        <Select value={yard.id} onChange={(event) => setYardId(event.target.value)}>
          {company.warehouses.map((item) => (
            <option key={item.id} value={item.id}>
              {labelPlace(item.zip)}
            </option>
          ))}
        </Select>
      </Field>
      <p className="text-sm">
        Seller delivery {money(fee)}. You pay {money(total)} now.
      </p>
      <Button disabled={company.cash < total} onClick={() => setNote(buyTruck(listing.id, yard.id))}>
        Buy
      </Button>
      <Notice text={note} />
    </li>
  );
}
