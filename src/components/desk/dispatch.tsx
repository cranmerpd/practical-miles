import { useState } from "react";
import { labelPlace } from "@/game/geo";
import {
  driversForVehicle,
  hoursUntilMorning,
  isCommitted,
  isTractor,
  KIND_INFO,
  money,
  previewLoop,
  shipmentWhen,
  storedUse,
  trailersFor,
  type Shipment,
} from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { cubes, dockLine, Notice, Panel, pounds, stamp, useWorld } from "@/components/desk/bits";
import { DeliveryMap } from "@/components/desk/map-board";

export function Dispatch() {
  const { world, company } = useWorld();
  const send = useDesk((s) => s.dispatch);
  const sell = useDesk((s) => s.sellWarehouse);
  const [yardId, setYardId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [trailerId, setTrailerId] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [dawn, setDawn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [mapOn, setMapOn] = useState(false);
  if (!company) return null;
  const yard = company.warehouses.find((item) => item.id === yardId) ?? company.warehouses[0];
  if (!yard) return null;
  const trucks = company.vehicles.filter(
    (vehicle) => vehicle.kind !== "trailer53" && vehicle.status === "idle" && vehicle.zip === yard.zip && !isCommitted(vehicle),
  );
  const vehicle = trucks.find((item) => item.id === vehicleId) ?? null;
  const drivers = vehicle ? driversForVehicle(company, vehicle, world.simHours).filter((driver) => !KIND_INFO[vehicle.kind].cdl || driver.cdl) : [];
  const driver = drivers.find((item) => item.id === driverId) ?? null;
  const trailers = vehicle && isTractor(vehicle.kind) ? trailersFor(company, vehicle).filter((item) => item.zip === yard.zip && item.status === "idle") : [];
  const trailer = trailers.find((item) => item.id === trailerId);
  const floor = company.shipments
    .filter((shipment) => shipment.status === "stored" && shipment.warehouseId === yard.id)
    .slice()
    .sort((a, b) => a.dueAt - b.dueAt);
  const chosen = order.map((id) => floor.find((shipment) => shipment.id === id) ?? company.shipments.find((shipment) => shipment.id === id)).filter((item): item is Shipment => Boolean(item));
  const departAt = dawn ? world.simHours + hoursUntilMorning(world.simHours, yard.zip) : world.simHours;
  const preview =
    vehicle && driver && order.length > 0 && (!isTractor(vehicle.kind) || trailer)
      ? previewLoop(world, vehicle, driver, order, departAt, trailer)
      : null;
  const used = storedUse(company, yard.id);
  const weight = chosen.reduce((sum, item) => sum + item.weight, 0);
  const cube = chosen.reduce((sum, item) => sum + item.cube, 0);
  const cap = preview
    ? { payload: preview.payload, cube: preview.cubeCap }
    : vehicle
      ? isTractor(vehicle.kind)
        ? trailer
          ? { payload: KIND_INFO.trailer53.payload, cube: KIND_INFO.trailer53.cube }
          : { payload: 0, cube: 0 }
        : { payload: KIND_INFO[vehicle.kind].payload, cube: KIND_INFO[vehicle.kind].cube }
      : { payload: 0, cube: 0 };

  function add(id: string) {
    if (!vehicle || !driver) {
      setNote("Choose the truck and the driver first.");
      return;
    }
    if (isTractor(vehicle.kind) && !trailer) {
      setNote("Hook a trailer that is parked here.");
      return;
    }
    const next = [...order, id];
    const look = previewLoop(world, vehicle, driver, next, departAt, trailer);
    if (!look.ok) {
      setNote(look.reason || "That load does not fit.");
      return;
    }
    setOrder(next);
    setNote(null);
  }

  function move(index: number, direction: -1 | 1) {
    const next = order.slice();
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setOrder(next);
  }

  return (
    <div className="space-y-4">
      {company.warehouses.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {company.warehouses.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`min-h-11 shrink-0 border px-3 text-sm uppercase tracking-wide ${item.id === yard.id ? "border-ink bg-ink text-paper" : "border-ink/20"}`}
              onClick={() => {
                setYardId(item.id);
                setVehicleId("");
                setDriverId("");
                setTrailerId("");
                setOrder([]);
                setNote(null);
              }}
            >
              {labelPlace(item.zip)}
            </button>
          ))}
        </div>
      ) : null}

      <Panel title={labelPlace(yard.zip)}>
        <p className="text-sm text-ink/70">
          Freight on the floor {pounds(used.weight)} of {pounds(yard.payloadCap)} · {cubes(used.cube)} of {cubes(yard.cubeCap)}. A truck loaded here delivers each stop, then comes back.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Truck parked here">
            <Select
              value={vehicle?.id ?? ""}
              onChange={(event) => {
                setVehicleId(event.target.value);
                setDriverId("");
                setTrailerId("");
                setOrder([]);
                setNote(null);
              }}
            >
              <option value="">Choose</option>
              {trucks.map((item) => (
                <option key={item.id} value={item.id}>
                  {KIND_INFO[item.kind].label}
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
                    {KIND_INFO[item.kind].label}
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
                  {item.name}
                  {item.cdl ? " · CDL" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {trucks.length === 0 ? <p className="mt-3 text-sm text-ink/60">No free truck is parked at this building.</p> : null}
        {vehicle ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Meter label="Weight" used={weight} cap={cap.payload} />
            <Meter label="Cube" used={cube} cap={cap.cube} />
          </div>
        ) : null}
        {yard.starter ? (
          <p className="mt-3 text-sm text-ink/50">This first warehouse stays with the company.</p>
        ) : (
          <div className="mt-3">
            <Button variant="quiet" onClick={() => setNote(sell(yard.id))}>
              Sell this building
            </Button>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="On the floor"
          kicker="Waiting"
          extra={
            floor.length > 0 ? (
              <Button variant="quiet" onClick={() => setMapOn((value) => !value)}>
                {mapOn ? "Hide map" : "View map"}
              </Button>
            ) : null
          }
        >
          {mapOn && floor.length > 0 ? (
            <div className="mb-4">
              <DeliveryMap
                homeZip={yard.zip}
                pins={floor.map((shipment) => ({
                  id: shipment.id,
                  zip: shipment.toZip,
                  title: labelPlace(shipment.toZip),
                  detail: `${pounds(shipment.weight)} · ${shipmentWhen(world.simHours, shipment)}`,
                }))}
              />
            </div>
          ) : null}
          {floor.filter((shipment) => !order.includes(shipment.id)).length === 0 ? (
            <p className="text-sm text-ink/70">
              Nothing waiting. Divert a rolling truck here, or book a shorter load and bring it to this building. Then load several of them on one truck.
            </p>
          ) : (
            <ul className="space-y-3">
              {floor
                .filter((shipment) => !order.includes(shipment.id))
                .map((shipment) => (
                  <li key={shipment.id} className="flex items-start justify-between gap-3 border-b border-ink/10 pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{labelPlace(shipment.toZip)}</p>
                      <p className="text-sm text-ink/60">
                        {pounds(shipment.weight)} · {cubes(shipment.cube)} · {shipmentWhen(world.simHours, shipment)} · {money(Math.max(0, shipment.pay - shipment.deposit))} still owed
                        {shipment.fragile ? " · fragile" : ""}
                      </p>
                    </div>
                    <Button variant="quiet" onClick={() => add(shipment.id)}>
                      Load
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel title="On the truck" kicker="Manifest">
          {chosen.length === 0 ? (
            <p className="text-sm text-ink/70">The truck is empty. Load stops in the order you want them delivered.</p>
          ) : (
            <ol className="space-y-3">
              {chosen.map((shipment, index) => {
                const stop = preview?.stops.find((item) => item.shipmentId === shipment.id);
                return (
                  <li key={shipment.id} className="border-b border-ink/10 pb-3 last:border-0">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border border-ink/20 text-sm tabular-nums">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{labelPlace(shipment.toZip)}</p>
                        <p className="text-sm text-ink/60">
                          {stop ? `${Math.round(stop.miles).toLocaleString("en-US")} mi from the previous stop · ` : ""}
                          {shipmentWhen(world.simHours, shipment)}
                          {stop?.late ? " · misses that day" : ""}
                        </p>
                        {stop ? <p className={`text-sm ${stop.dockClosed ? "text-rust" : "text-pine"}`}>{dockLine(stop.rollup, stop.arriveAt, stop.zip, stop.dockClosed)}</p> : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 pl-10">
                      <Button variant="quiet" onClick={() => move(index, -1)} disabled={index === 0}>
                        Earlier
                      </Button>
                      <Button variant="quiet" onClick={() => move(index, 1)} disabled={index === chosen.length - 1}>
                        Later
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() => {
                          setOrder(order.filter((id) => id !== shipment.id));
                          setNote(null);
                        }}
                      >
                        Take off
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>

      <Panel title="The loop" kicker="Plan">
        {preview?.ok ? (
          <>
            <p className="text-sm text-ink/70">
              {preview.stops.map((stop) => labelPlace(stop.zip).split(",")[0]).join(" → ")} → back to {labelPlace(yard.zip).split(",")[0]}. {Math.round(preview.miles).toLocaleString("en-US")} miles. Home about {stamp(preview.backAt, yard.zip)}.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-widest text-ink/45">Still owed</dt>
                <dd className="mt-1 font-semibold tabular-nums">{money(preview.balance)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-ink/45">Fuel for the loop</dt>
                <dd className="mt-1 font-semibold tabular-nums">{money(preview.fuelCost)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-ink/45">After fuel</dt>
                <dd className={`mt-1 font-semibold tabular-nums ${preview.afterFuel < 0 ? "text-rust" : "text-pine"}`}>{money(preview.afterFuel)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-ink/45">Stops</dt>
                <dd className="mt-1 font-semibold tabular-nums">{preview.stops.length}</dd>
              </div>
            </dl>
            {preview.stops.some((stop) => stop.late) ? (
              <p className="mt-3 text-sm text-rust">In this order, at this departure, at least one stop misses its day. You can still send it.</p>
            ) : (
              <p className="mt-3 text-sm text-pine">Every stop makes its day if the truck leaves as planned.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-ink/70">{preview?.reason || "Load at least one stop to see the miles, the fuel, and which days you will miss."}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={`min-h-11 border px-3 text-sm uppercase tracking-wide ${dawn ? "border-ink/20" : "border-ink bg-ink text-paper"}`} onClick={() => setDawn(false)}>
            Leave now
          </button>
          <button type="button" className={`min-h-11 border px-3 text-sm uppercase tracking-wide ${dawn ? "border-ink bg-ink text-paper" : "border-ink/20"}`} onClick={() => setDawn(true)}>
            Leave at 8am
          </button>
        </div>
        <div className="mt-3">
          <Button
            disabled={!preview?.ok || !vehicle || !driver}
            onClick={() => {
              if (!vehicle || !driver) return;
              const error = send(yard.id, vehicle.id, driver.id, order, trailer?.id, dawn);
              setNote(error);
              if (!error) setOrder([]);
            }}
          >
            Send the truck
          </Button>
        </div>
        <Notice text={note} />
      </Panel>
    </div>
  );
}

function Meter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs uppercase tracking-widest text-ink/45">
        <span>{label}</span>
        <span className="tabular-nums">
          {Math.round(used).toLocaleString("en-US")} / {Math.round(cap).toLocaleString("en-US")}
        </span>
      </div>
      <div className="h-1 bg-ink/10">
        <div className="h-1 bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
