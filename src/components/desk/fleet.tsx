import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { labelPlace, planRoad } from "@/game/geo";
import { isCommitted, isTractor, KIND_INFO, money, type Listing, type Vehicle } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { Notice, Panel, PlaceSearch, pounds, cubes, useWorld } from "@/components/desk/bits";
import { onTheRoad } from "@/components/desk/trip";

function sellOffer(vehicle: Vehicle): number {
  return Math.round(
    vehicle.price * 0.55 * (vehicle.condition / 100) * (vehicle.kind === "trailer53" ? 1 : Math.max(0.45, 1 - vehicle.mileage / 900000)),
  );
}

export function Fleet() {
  const { world, company } = useWorld();
  if (!company) return null;
  return (
    <div className="space-y-4">
      <Panel title="Your equipment">
        {company.vehicles.length === 0 ? (
          <p className="text-sm text-ink/70">No trucks yet. A used cargo van is the usual first buy. The seller drives it to a warehouse you pick. That delivery fee is not your fuel.</p>
        ) : (
          <ul className="space-y-4">
            {company.vehicles.map((vehicle) => (
              <Owned key={vehicle.id} vehicle={vehicle} />
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="For sale" extra={<span className="text-sm text-ink/60">{world.listings.length} listed</span>}>
        {world.listings.length === 0 ? (
          <p className="text-sm text-ink/70">Sellers are still posting trucks.</p>
        ) : (
          <ul className="space-y-4">
            {world.listings.map((listing) => (
              <Lot key={listing.id} listing={listing} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Owned({ vehicle }: { vehicle: Vehicle }) {
  const { company } = useWorld();
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
  const eligible = drivers.filter((item) => !spec.cdl || item.cdl);

  return (
    <li className="space-y-2 border-b border-ink/10 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{spec.label}</p>
        <p className="text-sm tabular-nums text-ink/70">
          {vehicle.status === "inbound" ? "Seller is delivering it" : onTheRoad(vehicle) ? "Out" : "Parked"} · {labelPlace(vehicle.zip)}
        </p>
      </div>
      <p className="text-sm text-ink/70">
        Condition {Math.round(vehicle.condition)} · {Math.round(vehicle.mileage).toLocaleString("en-US")} mi
        {spec.tank > 0 ? ` · fuel ${Math.round(vehicle.fuel)}/${spec.tank} gal` : ""}
        {driver ? ` · ${driver.name}` : ""}
        {spec.payload ? ` · holds ${pounds(spec.payload)}, ${cubes(spec.cube)}` : ""}
        {isTractor(vehicle.kind) ? " · needs a trailer and a CDL" : ""}
      </p>
      {onTheRoad(vehicle) ? (
        <p className="text-sm text-ink/70">
          <Link to="/road" className="underline">
            Open Road
          </Link>{" "}
          for miles left, and whether fuel eats the pay.
        </p>
      ) : null}
      <div className="h-1 bg-ink/10">
        <div className="h-1 bg-pine" style={{ width: `${Math.max(0, Math.min(100, vehicle.condition))}%` }} />
      </div>
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
  return (
    <li className="space-y-2 border-b border-ink/10 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{spec.label}</p>
        <p className="tabular-nums font-semibold">{money(listing.price)}</p>
      </div>
      <p className="text-sm text-ink/70">
        Condition {listing.condition} · {listing.mileage.toLocaleString("en-US")} mi · seller in {labelPlace(listing.zip)}
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
