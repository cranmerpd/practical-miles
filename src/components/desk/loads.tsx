import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { havMiles, labelPlace, lookupZip, type MapPoint } from "@/game/geo";
import {
  driversForVehicle,
  dueDayLabel,
  isCommitted,
  isTractor,
  KIND_INFO,
  money,
  quoteJob,
  SIM_PER_REAL_HOUR,
  trailersFor,
  type Company,
  type Driver,
  type MarketJob,
  type Vehicle,
} from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { cubes, hoursLeft, Notice, Panel, pounds, useWorld } from "@/components/desk/bits";

type SortKey = "pay" | "miles" | "due" | "weight" | "rate";

function capOf(company: Company, vehicle: Vehicle): { payload: number; cube: number } {
  if (isTractor(vehicle.kind)) {
    const trailer = company.vehicles.find((item) => item.kind === "trailer53");
    if (!trailer) return { payload: 0, cube: 0 };
    return { payload: KIND_INFO.trailer53.payload, cube: KIND_INFO.trailer53.cube };
  }
  const spec = KIND_INFO[vehicle.kind];
  return { payload: spec.payload, cube: spec.cube };
}

function pilotsFor(company: Company, vehicle: Vehicle, simHours: number): Driver[] {
  return driversForVehicle(company, vehicle, simHours).filter((driver) => !KIND_INFO[vehicle.kind].cdl || driver.cdl);
}

function canHaul(company: Company, job: MarketJob, simHours: number): { ok: boolean; label: string } {
  if (job.mode === "air") return { ok: false, label: "Air later" };
  if (job.mode === "sea") return { ok: false, label: "Sea later" };
  const trucks = company.vehicles.filter((vehicle) => vehicle.kind !== "trailer53");
  if (!trucks.length) return { ok: false, label: "No truck" };
  let size = false;
  let driver = false;
  let ready = false;
  for (const truck of trucks) {
    const cap = capOf(company, truck);
    if (job.weight > cap.payload || job.cube > cap.cube) continue;
    size = true;
    const pilots = pilotsFor(company, truck, simHours);
    if (!pilots.length) continue;
    driver = true;
    if (truck.status === "idle" && !isCommitted(truck)) ready = true;
  }
  if (ready) return { ok: true, label: "Can haul" };
  if (size && trucks.some((truck) => truck.status === "inbound" && job.weight <= capOf(company, truck).payload && job.cube <= capOf(company, truck).cube)) {
    return { ok: false, label: "On the way" };
  }
  if (driver) return { ok: false, label: "Truck is out" };
  if (size) return { ok: false, label: "Need a driver" };
  if (!company.vehicles.some((vehicle) => vehicle.kind === "trailer53") && trucks.some((vehicle) => isTractor(vehicle.kind))) {
    return { ok: false, label: "Need a trailer" };
  }
  return { ok: false, label: "Too big" };
}

function nearMiles(company: Company, zip: string): number {
  const place = lookupZip(zip);
  if (!place) return 1e9;
  let best = 1e9;
  for (const yard of company.warehouses) {
    const there = lookupZip(yard.zip);
    if (there) best = Math.min(best, havMiles(place.lat, place.lon, there.lat, there.lon));
  }
  for (const vehicle of company.vehicles) {
    const there = lookupZip(vehicle.zip);
    if (there) best = Math.min(best, havMiles(place.lat, place.lon, there.lat, there.lon));
  }
  return best;
}

function dueLeft(job: MarketJob, simHours: number): number {
  return job.postedAt + job.dueInHours - simHours;
}

export function Loads({ onRoute }: { onRoute: (points: MapPoint[] | null) => void }) {
  const { world, company } = useWorld();
  const holdJob = useDesk((s) => s.holdJob);
  const [haulOnly, setHaulOnly] = useState(false);
  const [nearOnly, setNearOnly] = useState(false);
  const [fragileOnly, setFragileOnly] = useState(false);
  const [lateOnly, setLateOnly] = useState(false);
  const [roadOnly, setRoadOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("pay");
  const heldId = world.heldJobId;

  useEffect(() => {
    if (!heldId) return;
    document.getElementById("booking-card")?.scrollIntoView({ block: "start" });
  }, [heldId]);

  const rows = useMemo(() => {
    if (!company) return [];
    const list = world.jobs.filter((job) => {
      if (roadOnly && job.mode !== "road") return false;
      if (fragileOnly && !job.fragile) return false;
      if (lateOnly && !job.lateFee) return false;
      if (haulOnly && !canHaul(company, job, world.simHours).ok) return false;
      if (nearOnly && nearMiles(company, job.fromZip) > 250) return false;
      return true;
    });
    list.sort((a, b) => {
      const modeRank = (a.mode === "road" ? 0 : 1) - (b.mode === "road" ? 0 : 1);
      if (modeRank) return modeRank;
      if (sort === "pay") return b.pay - a.pay;
      if (sort === "miles") return a.miles - b.miles;
      if (sort === "weight") return b.weight - a.weight;
      if (sort === "rate") return b.pay / Math.max(1, b.miles) - a.pay / Math.max(1, a.miles);
      return dueLeft(a, world.simHours) - dueLeft(b, world.simHours);
    });
    return list;
  }, [world.jobs, world.simHours, company, haulOnly, nearOnly, fragileOnly, lateOnly, roadOnly, sort]);

  if (!company) return null;
  const held = world.jobs.find((job) => job.id === world.heldJobId) ?? null;

  return (
    <div className="space-y-4">
      <Books />
      {held ? (
        <div id="booking-card" className="sticky top-36 z-10">
          <Booking job={held} onRoute={onRoute} onClose={() => holdJob(null)} />
        </div>
      ) : null}
      <Panel
        title="Load board"
        extra={
          <span className="text-sm text-ink/60">
            {world.jobs.filter((job) => job.mode === "road").length} road · diesel ${world.diesel.toFixed(2)}/gal
          </span>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Filter on={haulOnly} set={setHaulOnly} label="Can haul" />
          <Filter on={nearOnly} set={setNearOnly} label="Near my trucks" />
          <Filter on={fragileOnly} set={setFragileOnly} label="Fragile" />
          <Filter on={lateOnly} set={setLateOnly} label="Late fee" />
          <Filter on={roadOnly} set={setRoadOnly} label="Road only" />
        </div>
        <Field label="Sort">
          <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="pay">Pay</option>
            <option value="rate">Pay for the miles</option>
            <option value="miles">Distance</option>
            <option value="due">Deadline</option>
            <option value="weight">Weight</option>
          </Select>
        </Field>
        {world.jobs.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">Loads are still posting.</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">Nothing matches these filters.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/10">
            {rows.map((job) => {
              const fit = canHaul(company, job, world.simHours);
              const heldRow = job.id === world.heldJobId;
              return (
                <li key={job.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full flex-col gap-1 py-3 text-left"
                    onClick={() => holdJob(heldRow ? null : job.id)}
                  >
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {labelPlace(job.fromZip)}
                        <span className="text-ink/50"> to </span>
                        {labelPlace(job.toZip)}
                      </span>
                      <span className="tabular-nums font-semibold">{money(job.pay)}</span>
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink/70">
                      <span className="tabular-nums">{job.miles.toLocaleString("en-US")} mi</span>
                      <span className="tabular-nums">${(job.pay / Math.max(1, job.miles)).toFixed(2)}/mi</span>
                      <span>{pounds(job.weight)}</span>
                      <span>{cubes(job.cube)}</span>
                      <span>{dueDayLabel(world.simHours, job.postedAt + job.dueInHours, job.toZip)}</span>
                      {job.miles <= 180 && job.weight <= 3500 && job.cube <= 400 ? <span>Van</span> : null}
                      {job.fragile ? <span>Fragile</span> : null}
                      {job.lateFee ? <span>Late fee</span> : null}
                      <span className={fit.ok ? "text-pine" : "text-ink/50"}>{fit.label}</span>
                      {heldRow ? <span className="text-rust">Open</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Filter({ on, set, label }: { on: boolean; set: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`min-h-11 rounded-md border px-3 text-sm font-medium uppercase tracking-wide ${on ? "border-ink bg-ink text-paper" : "border-ink/20 bg-transparent text-ink"}`}
      onClick={() => set(!on)}
    >
      {label}
    </button>
  );
}

function Books() {
  const { world, company } = useWorld();
  const cancel = useDesk((s) => s.cancel);
  const divert = useDesk((s) => s.divert);
  const speed = useDesk((s) => s.speed);
  const [note, setNote] = useState<string | null>(null);
  const [yardId, setYardId] = useState("");
  if (!company) return null;
  const active = company.shipments.filter((shipment) => shipment.status !== "done");
  if (!active.length) return null;

  return (
    <Panel title="On your books">
      <ul className="space-y-4">
        {active.map((shipment) => {
          const vehicle = company.vehicles.find(
            (item) => item.id === shipment.vehicleId || item.shipmentId === shipment.id || item.legs.some((leg) => leg.shipmentId === shipment.id),
          );
          const seconds =
            vehicle?.departAt != null && shipment.status === "booked"
              ? Math.max(0, (vehicle.departAt - world.simHours) * (3600 / (SIM_PER_REAL_HOUR * speed)))
              : 0;
          const milesLeft = vehicle && vehicle.routeMiles > 0 ? Math.max(0, vehicle.routeMiles - vehicle.traveled) : null;
          const yard = company.warehouses.find((item) => item.id === shipment.warehouseId);
          return (
            <li key={shipment.id} className="space-y-2 border-b border-ink/10 pb-4 last:border-0 last:pb-0">
              <p className="font-medium">
                {labelPlace(shipment.fromZip)}
                <span className="text-ink/50"> to </span>
                {labelPlace(shipment.toZip)}
              </p>
              <p className="text-sm text-ink/70">
                {money(shipment.pay)} total · {money(shipment.deposit)} already paid · {dueDayLabel(world.simHours, shipment.dueAt, shipment.toZip)}
                {shipment.fragile ? " · fragile" : ""}
                {shipment.lateFee ? " · late fee if you miss it" : ""}
              </p>
              <p className="text-sm">
                {shipment.status === "stored" && yard
                  ? `Sitting in ${labelPlace(yard.zip)}. Load it with other freight on the warehouse desk. The due day is still running.`
                  : shipment.status === "booked"
                    ? seconds > 120
                      ? "Booked. The truck is waiting to leave."
                      : seconds > 0
                        ? `Booked. The truck starts in ${Math.ceil(seconds)}s. You can still give the deposit back.`
                        : "Booked and about to roll."
                    : `On the road${milesLeft != null ? `, about ${Math.round(milesLeft).toLocaleString("en-US")} miles left on this leg` : ""}.`}
              </p>
              {shipment.status !== "stored" ? (
                <div className="flex flex-wrap gap-2">
                  {seconds > 0 ? (
                    <Button
                      variant="quiet"
                      onClick={() => setNote(cancel(shipment.id))}
                    >
                      Cancel and return {money(shipment.deposit)}
                    </Button>
                  ) : null}
                  <Select
                    className="max-w-xs"
                    value={yardId}
                    onChange={(event) => setYardId(event.target.value)}
                    aria-label="Divert to warehouse"
                  >
                    <option value="">Divert to a warehouse</option>
                    {company.warehouses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {labelPlace(item.zip)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="quiet"
                    disabled={!yardId}
                    onClick={() => setNote(divert(shipment.id, yardId))}
                  >
                    Divert
                  </Button>
                </div>
              ) : (
                <p className="text-sm">
                  <Link to="/yards" className="underline decoration-ink/30 underline-offset-4">
                    Open the warehouse desk
                  </Link>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <Notice text={note} />
    </Panel>
  );
}

function Booking({ job, onRoute, onClose }: { job: MarketJob; onRoute: (points: MapPoint[] | null) => void; onClose: () => void }) {
  const { world, company } = useWorld();
  const accept = useDesk((s) => s.accept);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [trailerId, setTrailerId] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!company) return;
    const truck = company.vehicles.find((item) => item.kind !== "trailer53" && item.status === "idle" && !isCommitted(item));
    if (!truck) return;
    const pilots = pilotsFor(company, truck, world.simHours);
    const trailer = isTractor(truck.kind) ? trailersFor(company, truck)[0] : undefined;
    setVehicleId(truck.id);
    setDriverId(pilots[0]?.id ?? "");
    setTrailerId(trailer?.id ?? "");
    setNote(null);
  }, [job.id, company]);

  const trucks = company?.vehicles.filter((vehicle) => vehicle.kind !== "trailer53" && vehicle.status === "idle" && !isCommitted(vehicle)) ?? [];
  const vehicle = trucks.find((item) => item.id === vehicleId) ?? null;
  const drivers = company && vehicle ? pilotsFor(company, vehicle, world.simHours) : [];
  const trailers = company && vehicle && isTractor(vehicle.kind) ? trailersFor(company, vehicle) : [];
  const driver = drivers.find((item) => item.id === driverId) ?? null;
  const trailer = trailers.find((item) => item.id === trailerId);

  const quote = company && vehicle && driver ? quoteJob(world, job, vehicle, driver, isTractor(vehicle.kind) ? trailer : undefined) : null;
  const sig = quote?.ok ? `${job.id}:${vehicleId}:${driverId}:${trailerId}:${Math.round(quote.deadhead)}` : job.id;

  useEffect(() => {
    onRoute(quote?.ok ? quote.points : null);
    return () => onRoute(null);
    // Route preview follows the current quote. Parent callback is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  if (!company) return null;

  return (
    <Panel
      title="Book this load"
      extra={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className="text-sm text-ink/70">
        Held. Other carriers will not take it while this card is open. The customer pays 10% when you accept, and the rest when they receive it.
      </p>
      <p className="mt-2 text-sm">
        Freight is worth {money(job.cargoValue)}. {pounds(job.weight)}, {cubes(job.cube)}.
        {job.fragile ? " Fragile." : ""} {job.lateFee ? " Marked loads lose 20% of the original pay per late day, and only from the unpaid balance." : " If you are late, reputation drops once. The balance is still paid in full."}
      </p>
      {job.mode !== "road" ? (
        <p className="mt-3 text-sm text-rust">Air and sea loads are on the board so you can see them. You cannot book them yet.</p>
      ) : trucks.length === 0 ? (
        <p className="mt-3 text-sm">You need a truck parked with no load on it. Used ones are on the Fleet page. The seller delivers them to your warehouse.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Truck">
            <Select
              value={vehicleId}
              onChange={(event) => {
                setVehicleId(event.target.value);
                setDriverId("");
                setTrailerId("");
                setNote(null);
              }}
            >
              <option value="">Choose</option>
              {trucks.map((item) => (
                <option key={item.id} value={item.id}>
                  {KIND_INFO[item.kind].label} · {labelPlace(item.zip)}
                </option>
              ))}
            </Select>
          </Field>
          {vehicle && isTractor(vehicle.kind) ? (
            <Field label="Trailer">
              <Select value={trailerId} onChange={(event) => setTrailerId(event.target.value)}>
                <option value="">Choose</option>
                {trailers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {KIND_INFO[item.kind].label} · {labelPlace(item.zip)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Driver">
            <Select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
              <option value="">Choose</option>
              {drivers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · skill {item.skill}
                  {item.cdl ? " · CDL" : ""}
                </option>
              ))}
            </Select>
          </Field>
          {vehicle && drivers.length === 0 ? (
            <p className="text-sm text-ink/70 sm:col-span-2">
              {KIND_INFO[vehicle.kind].cdl
                ? "This tractor needs a CDL driver waiting at the same warehouse."
                : "Hire a driver at the warehouse where this truck is parked."}
            </p>
          ) : null}
          {vehicle && isTractor(vehicle.kind) && trailers.length === 0 ? (
            <p className="text-sm text-ink/70 sm:col-span-2">Buy a 53 ft dry van. It can sit at another warehouse. Driving over to hook it is part of the trip, and that empty run can lose money.</p>
          ) : null}
        </div>
      )}
      {quote?.ok ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink/60">Empty miles</dt>
            <dd className="tabular-nums font-medium">{Math.round(quote.deadhead).toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-ink/60">Loaded miles</dt>
            <dd className="tabular-nums font-medium">{Math.round(quote.loaded).toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-ink/60">With breaks</dt>
            <dd className="tabular-nums font-medium">{hoursLeft(quote.hours)}</dd>
          </div>
          <div>
            <dt className="text-ink/60">Fuel</dt>
            <dd className="tabular-nums font-medium">{money(quote.fuelCost)}</dd>
          </div>
          <div>
            <dt className="text-ink/60">After fuel</dt>
            <dd className={`tabular-nums font-medium ${quote.profit < 0 ? "text-rust" : "text-pine"}`}>{money(quote.profit)}</dd>
          </div>
        </dl>
      ) : quote?.reason ? (
        <p className="mt-3 text-sm text-rust">{quote.reason}</p>
      ) : null}
      {quote?.warnings.map((warning) => (
        <p key={warning} className="mt-2 text-sm text-rust">
          {warning}
        </p>
      ))}
      {quote?.ok && vehicle && job.miles <= 400 && company.warehouses.some((yard) => yard.zip === vehicle.zip) ? (
        <p className="mt-3 text-sm text-ink/60">
          Bring it to the warehouse if you want to unload it there and deliver it later, with other freight. The customer’s day still runs.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={job.mode !== "road" || !quote?.ok}
          onClick={() => {
            const error = accept(job.id, vehicleId, driverId, trailerId || undefined, Boolean(quote?.warnings.length));
            if (error && error !== "CONFIRM") setNote(error);
            else setNote(null);
          }}
        >
          {quote?.warnings.length ? "Accept anyway" : "Accept shipment"}
        </Button>
        {quote?.ok && vehicle && job.miles <= 400 && company.warehouses.some((yard) => yard.zip === vehicle.zip) ? (
          <Button
            variant="quiet"
            onClick={() => {
              const error = accept(job.id, vehicleId, driverId, trailerId || undefined, true, true);
              if (error && error !== "CONFIRM") setNote(error);
              else setNote(null);
            }}
          >
            Bring it to {labelPlace(vehicle.zip)}
          </Button>
        ) : null}
        <Button variant="quiet" onClick={onClose}>
          Leave it on the board
        </Button>
      </div>
      <Notice text={note} />
    </Panel>
  );
}
