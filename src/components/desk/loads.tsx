import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { havMiles, labelPlace, lookupZip, type MapPoint } from "@/game/geo";
import {
  driversForVehicle,
  insertPickup,
  isCommitted,
  isTractor,
  KIND_INFO,
  money,
  offerWhen,
  pickupChoices,
  previewStage,
  quoteJob,
  shipmentWhen,
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
import { cubes, hoursLeft, Notice, Panel, pounds, stamp, useWorld } from "@/components/desk/bits";
import { MapBoard } from "@/components/desk/map-board";

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

function moveId(order: string[], index: number, step: number): string[] {
  const next = order.slice();
  const to = index + step;
  if (to < 0 || to >= next.length) return order;
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item);
  return next;
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

export function Loads({ onRoute, route }: { onRoute: (points: MapPoint[] | null) => void; route: MapPoint[] | null }) {
  const { world, company } = useWorld();
  const holdJob = useDesk((s) => s.holdJob);
  const [haulOnly, setHaulOnly] = useState(false);
  const [nearOnly, setNearOnly] = useState(false);
  const [fragileOnly, setFragileOnly] = useState(false);
  const [lateOnly, setLateOnly] = useState(false);
  const [roadOnly, setRoadOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("rate");
  const heldId = world.heldJobId;

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
    <div className={`grid gap-3 ${held ? "xl:h-[calc(100dvh-7.5rem)] xl:grid-cols-[minmax(0,1fr)_28rem]" : ""}`}>
      <section className={`min-h-0 ${held ? "order-2 xl:order-1 xl:overflow-y-auto" : ""}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Filter on={haulOnly} set={setHaulOnly} label="Can haul" />
          <Filter on={nearOnly} set={setNearOnly} label="Near my trucks" />
          <Filter on={fragileOnly} set={setFragileOnly} label="Fragile" />
          <Filter on={lateOnly} set={setLateOnly} label="Late fee" />
          <Filter on={roadOnly} set={setRoadOnly} label="Road only" />
          <Select className="ml-auto w-44" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Sort">
            <option value="rate">Pay for the miles</option>
            <option value="pay">Pay</option>
            <option value="miles">Distance</option>
            <option value="due">Deadline</option>
            <option value="weight">Weight</option>
          </Select>
        </div>
        <p className="mb-3 text-sm text-ink/60">
          {rows.length} shown · {world.jobs.filter((job) => job.mode === "road").length} road · diesel ${world.diesel.toFixed(2)}/gal
        </p>
        {world.jobs.length === 0 ? (
          <p className="text-sm text-ink/70">Loads are still posting.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink/70">Nothing matches these filters.</p>
        ) : (
          <ul className="border border-ink/15">
            <li className="hidden grid-cols-[minmax(0,1.6fr)_5.5rem_4.2rem_4.2rem_5.5rem_8.5rem_5.5rem] gap-2 border-b border-ink/10 px-3 py-2 text-[10px] uppercase tracking-widest text-ink/40 md:grid">
              <span>Lane</span>
              <span>Pay</span>
              <span>Miles</span>
              <span>$/mi</span>
              <span>Weight</span>
              <span>Due</span>
              <span>Fit</span>
            </li>
            {rows.map((job) => {
              const fit = canHaul(company, job, world.simHours);
              const heldRow = job.id === world.heldJobId;
              const rate = (job.pay / Math.max(1, job.miles)).toFixed(2);
              const due = offerWhen(job.lateFee, job.postedAt + job.dueInHours, world.simHours, job.toZip, job.miles);
              return (
                <li key={job.id} className="border-b border-ink/10 last:border-0">
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left md:grid md:grid-cols-[minmax(0,1.6fr)_5.5rem_4.2rem_4.2rem_5.5rem_8.5rem_5.5rem] md:items-center md:gap-2 ${heldRow ? "bg-ink/10" : ""}`}
                    onClick={() => holdJob(heldRow ? null : job.id)}
                  >
                    <span className="block min-w-0">
                      <span className="font-medium">
                        {labelPlace(job.fromZip)}
                        <span className="text-ink/40"> → </span>
                        {labelPlace(job.toZip)}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/50">
                        {windowWords(job.pickupKind)} → {windowWords(job.dropKind)}
                        {job.miles <= 180 && job.weight <= 3500 && job.cube <= 400 ? " · van" : ""}
                        {job.fragile ? " · fragile" : ""}
                        {job.lateFee ? " · late fee" : ""}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums text-ink/70 md:contents">
                      <span className="font-semibold text-ink">{money(job.pay)}</span>
                      <span>{job.miles.toLocaleString("en-US")}</span>
                      <span>${rate}</span>
                      <span>{pounds(job.weight)}</span>
                      <span>{due}</span>
                      <span className={fit.ok ? "text-pine" : "text-ink/45"}>{fit.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {held ? (
        <div className="order-1 min-h-0 space-y-3 xl:order-2 xl:overflow-y-auto">
          {route && route.length > 1 ? <MapBoard route={route} compact /> : null}
          <Booking job={held} onRoute={onRoute} onClose={() => holdJob(null)} />
        </div>
      ) : null}
    </div>
  );
}

function windowWords(kind: MarketJob["pickupKind"]): string {
  if (kind === "commercial") return "commercial 8–5";
  if (kind === "residential") return "house 8–8";
  return "8–8";
}

function stopWindowLine(title: string, arrive: number, ready: number, zip: string, closed: boolean, kind: MarketJob["pickupKind"]): string {
  const hours = kind === "commercial" ? "8am–5pm" : "8am–8pm";
  const place = labelPlace(zip);
  if (!closed) return `${title} in ${place} at ${stamp(arrive, zip)}. That dock is open (${hours}).`;
  return `${title} in ${place} at ${stamp(arrive, zip)}. That dock is closed (${hours}). It can load at ${stamp(ready, zip)}.`;
}

function Filter({ on, set, label }: { on: boolean; set: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`min-h-9 rounded-md border px-3 text-sm ${on ? "border-ink bg-ink text-paper" : "border-ink/20 bg-transparent text-ink"}`}
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
    <Panel title="On your books" kicker="Already taken">
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
                {money(shipment.pay)} total · {money(shipment.deposit)} already paid · {shipmentWhen(world.simHours, shipment)}
                {shipment.fragile ? " · fragile" : ""}
                {shipment.lateFee ? " · late fee if you miss it" : ""}
              </p>
              <p className="text-sm">
                {shipment.status === "stored" && yard
                  ? `In ${labelPlace(yard.zip)}`
                  : shipment.status === "booked"
                    ? seconds > 0
                      ? `Leaves in ${Math.ceil(seconds)}s`
                      : "About to roll"
                    : `On the road${milesLeft != null ? ` · ${Math.round(milesLeft).toLocaleString("en-US")} mi left` : ""}`}
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
  const [order, setOrder] = useState<string[]>([]);
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
    setOrder([job.id]);
    setNote(null);
  }, [job.id, company]);

  const trucks = company?.vehicles.filter((vehicle) => vehicle.kind !== "trailer53" && vehicle.status === "idle" && !isCommitted(vehicle)) ?? [];
  const vehicle = trucks.find((item) => item.id === vehicleId) ?? null;
  const drivers = company && vehicle ? pilotsFor(company, vehicle, world.simHours) : [];
  const trailers = company && vehicle && isTractor(vehicle.kind) ? trailersFor(company, vehicle) : [];
  const driver = drivers.find((item) => item.id === driverId) ?? null;
  const trailer = trailers.find((item) => item.id === trailerId);

  const quote = company && vehicle && driver ? quoteJob(world, job, vehicle, driver, isTractor(vehicle.kind) ? trailer : undefined) : null;
  const home = company && vehicle ? company.warehouses.find((yard) => yard.zip === vehicle.zip) : undefined;
  const canStage = Boolean(quote?.ok && home && job.miles <= 400);
  const choices = canStage && vehicle ? pickupChoices(world, vehicle, job, isTractor(vehicle.kind) ? trailer : undefined) : [];
  const pickupOrder = order.includes(job.id) ? order.filter((id) => id === job.id || choices.some((item) => item.jobId === id)) : [job.id];
  const stage = canStage && vehicle && driver ? previewStage(world, vehicle, driver, pickupOrder, isTractor(vehicle.kind) ? trailer : undefined) : null;
  const sig = stage && pickupOrder.length > 1 && stage.ok ? `stage:${pickupOrder.join()}` : quote?.ok ? `${job.id}:${vehicleId}:${driverId}:${trailerId}:${Math.round(quote.deadhead)}` : job.id;

  useEffect(() => {
    onRoute(stage && pickupOrder.length > 1 && stage.ok ? stage.points : quote?.ok ? quote.points : null);
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
        <div className="mt-4 space-y-3 border border-ink/15 p-3">
          <p className="text-sm font-medium">Deliver to the customer</p>
          <p className="text-sm text-ink/60">This trip goes to the customer. It does not pick up anything else, and it does not come back to the warehouse unless the driver is finished.</p>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
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
          <p className={`text-sm ${quote.pickupClosed ? "text-rust" : "text-pine"}`}>
            {stopWindowLine("Pickup", quote.pickupArrive, quote.pickupReady, job.fromZip, quote.pickupClosed, job.pickupKind)}
          </p>
          <p className={`text-sm ${quote.dockClosed ? "text-rust" : "text-pine"}`}>
            {stopWindowLine("Delivery", quote.arriveAt, quote.unloadAt, job.toZip, quote.dockClosed, job.dropKind)}
          </p>
          {quote.warnings.map((warning) => (
            <p key={warning} className="text-sm text-rust">{warning}</p>
          ))}
          <Button
            disabled={job.mode !== "road"}
            onClick={() => {
              const error = accept(job.id, vehicleId, driverId, trailerId || undefined, Boolean(quote.warnings.length));
              if (error && error !== "CONFIRM") setNote(error);
              else setNote(null);
            }}
          >
            {quote.warnings.length ? "Deliver anyway" : "Deliver to the customer"}
          </Button>
        </div>
      ) : quote?.reason ? (
        <p className="mt-3 text-sm text-rust">{quote.reason}</p>
      ) : null}
      {canStage && vehicle && stage ? (
        <div className="mt-4 space-y-3 border border-ink/15 p-3">
          <p className="text-sm font-medium">Bring it to {labelPlace(vehicle.zip)}</p>
          <p className="text-sm text-ink/60">This trip does not go to the customer. The truck picks up and comes home. Check any other loads on the way, then confirm. Nothing is booked until you do.</p>
          {choices.length === 0 ? (
            <p className="text-sm text-ink/70">Nothing else on the board is on the way. One hop, and no more than 75 extra miles.</p>
          ) : (
            <ul className="space-y-2">
              {choices.map((choice) => {
                const on = pickupOrder.includes(choice.jobId);
                const room = stage.ok && (on || (stage.weight + choice.weight <= stage.payload && stage.cube + choice.cube <= stage.cubeCap && stage.weight + choice.weight <= stage.yardRoomWeight && stage.cube + choice.cube <= stage.yardRoomCube));
                return (
                  <li key={choice.jobId} className="border-b border-ink/10 pb-2 last:border-0">
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={on}
                        disabled={!on && !room}
                        onChange={() => {
                          setOrder((current) => {
                            const base = current.includes(job.id) ? current : [job.id];
                            if (base.includes(choice.jobId)) return base.filter((id) => id !== choice.jobId);
                            const known = base.map((id) => {
                              const item = id === job.id ? job : world.jobs.find((row) => row.id === id);
                              return item ? { id, zip: item.fromZip } : null;
                            }).filter((item): item is { id: string; zip: string } => item != null);
                            return insertPickup(vehicle.zip, known, { id: choice.jobId, zip: choice.fromZip });
                          });
                          setNote(null);
                        }}
                      />
                      <span>
                        <span className="font-medium">{labelPlace(choice.fromZip)}</span>
                        <span className="text-ink/50"> to </span>
                        {labelPlace(choice.toZip)}
                        <span className="mt-1 block text-ink/70">
                          {pounds(choice.weight)} · {cubes(choice.cube)} · +{choice.extraMiles} mi · {(() => {
                            const other = world.jobs.find((row) => row.id === choice.jobId);
                            return offerWhen(Boolean(other?.lateFee), choice.dueAt, world.simHours, choice.toZip, other?.miles ?? 0);
                          })()}
                          {!on && !room ? " · no room" : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {pickupOrder.length > 1 ? (
            <ol className="space-y-2">
              {pickupOrder.map((id, index) => {
                const item = id === job.id ? job : world.jobs.find((row) => row.id === id);
                if (!item) return null;
                return (
                  <li key={id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex h-7 w-7 items-center justify-center border border-ink/20 tabular-nums">{index + 1}</span>
                    <span className="min-w-0 flex-1">{labelPlace(item.fromZip)}{id === job.id ? " · the load you opened" : ""}</span>
                    <Button variant="quiet" disabled={index === 0} onClick={() => setOrder((current) => moveId(current, index, -1))}>Earlier</Button>
                    <Button variant="quiet" disabled={index === pickupOrder.length - 1} onClick={() => setOrder((current) => moveId(current, index, 1))}>Later</Button>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {stage.ok ? (
            <div className="space-y-1 text-sm text-ink/70">
              {stage.stops.map((stop) => (
                <p key={stop.jobId} className={stop.dockClosed ? "text-rust" : ""}>
                  {stopWindowLine("Pickup", stop.arriveAt, stop.readyAt, stop.zip, stop.dockClosed, world.jobs.find((row) => row.id === stop.jobId)?.pickupKind ?? job.pickupKind)}
                </p>
              ))}
              <p>
                {pickupOrder.length} pickup{pickupOrder.length === 1 ? "" : "s"}. Home about {stamp(stage.homeAt, vehicle.zip)}. Fuel about {money(stage.fuelCost)}. Truck {pounds(stage.weight)} of {pounds(stage.payload)}. A 2-day run picked up Tuesday is delivered Thursday.
              </p>
            </div>
          ) : (
            <p className="text-sm text-rust">{stage.reason}</p>
          )}
          <Button
            variant="quiet"
            disabled={!stage.ok}
            onClick={() => {
              const error = accept(job.id, vehicleId, driverId, trailerId || undefined, true, true, pickupOrder);
              if (error && error !== "CONFIRM") setNote(error);
              else setNote(null);
            }}
          >
            {pickupOrder.length > 1 ? `Confirm, bring ${pickupOrder.length} home` : `Confirm, bring it home`}
          </Button>
        </div>
      ) : null}
      <div className="mt-3">
        <Button variant="quiet" onClick={onClose}>
          Leave it on the board
        </Button>
      </div>
      <Notice text={note} />
    </Panel>
  );
}
