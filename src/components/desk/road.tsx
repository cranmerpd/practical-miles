import { labelPlace } from "@/game/geo";
import { dockWait, dueDayLabel, KIND_INFO, localDay, money, type Leg } from "@/game/sim";
import { Panel, useWorld } from "@/components/desk/bits";
import { readTrip, type TripRead } from "@/components/desk/trip";

export function Road() {
  const { world, company } = useWorld();
  if (!company) return null;
  const trips = company.vehicles
    .map((vehicle) => readTrip(world, company, vehicle))
    .filter((trip): trip is TripRead => trip != null)
    .sort((a, b) => Number(b.pay > 0) - Number(a.pay > 0) || b.milesLeft - a.milesLeft);

  if (trips.length === 0) {
    return (
      <Panel title="Nothing is moving">
        <p className="text-sm text-ink/70">
          Book a load, or send a truck empty from Fleet. Fuel against pay shows up here once a truck has a trip.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <TripCard key={trip.vehicle.id} trip={trip} diesel={world.diesel} simHours={world.simHours} company={company} />
      ))}
    </div>
  );
}

function TripCard({ trip, diesel, simHours, company }: { trip: TripRead; diesel: number; simHours: number; company: { shipments: { id: string; pickupKind?: "commercial" | "residential"; dropKind?: "commercial" | "residential" }[] } }) {
  const spec = KIND_INFO[trip.vehicle.kind];
  const leg0 = trip.vehicle.legs[0];
  const dest = leg0?.toZip || trip.vehicle.zip;
  const shipment = leg0?.shipmentId ? company.shipments.find((item) => item.id === leg0.shipmentId) : undefined;
  const kind = leg0?.kind === "pickup" ? shipment?.pickupKind : shipment?.dropKind;
  const there = localDay(simHours, dest);
  const stop = leg0?.kind === "loaded" || leg0?.kind === "pickup";
  const closed = stop && dockWait(simHours, dest, kind) > 0.05;
  const closeLabel = kind === "commercial" ? "5pm" : "8pm";
  const atDock = trip.vehicle.routeMiles > 0 && trip.vehicle.traveled >= trip.vehicle.routeMiles - 0.2;
  const resting = trip.vehicle.restUntil != null && simHours < trip.vehicle.restUntil;
  const short = trip.pay > 0 && trip.afterFuel < 0;
  return (
    <Panel title={spec.label} extra={<span className="text-sm text-ink/60">{trip.leg}</span>}>
      <p className="text-sm text-ink/70">
        Toward {trip.heading}. {Math.max(1, Math.round(trip.milesLeft)).toLocaleString("en-US")} miles left.
        {trip.stopsLeft > 1 ? ` ${trip.stopsLeft} deliveries still on the truck.` : ""}
        {trip.driverName ? ` ${trip.driverName} is driving.` : " No driver on it."}
      </p>
      <p className="mt-2 text-sm text-ink/70">
        {closed && resting && atDock
          ? `Waiting at the stop. It is ${there.clock} there. Open 8am to ${closeLabel} local.`
          : closed
            ? `Still rolling. It is ${there.clock} at the stop, which is closed. Open 8am to ${closeLabel} local. The truck waits only if it gets there outside those hours.`
            : resting
              ? `Resting until ${localDay(trip.vehicle.restUntil ?? simHours, dest).clock} local.`
              : trip.vehicle.status === "inbound"
                ? "The seller is driving it. You are not paying fuel."
                : `Driven ${(trip.vehicle.driveToday).toFixed(1)} hours today.`}
      </p>
      <ol className="mt-3 divide-y divide-ink/10 border border-ink/10">
        {(trip.vehicle.done ?? []).map((leg, index) => (
          <LegRow key={`done-${index}`} mark="Done" text={legText(leg)} />
        ))}
        {trip.vehicle.legs.map((leg, index) => (
          <LegRow
            key={`leg-${index}`}
            mark={index === 0 ? "Now" : "Next"}
            text={legText(leg)}
            detail={[index === 0 ? milesOnLeg(trip.vehicle.routeMiles, trip.vehicle.traveled) : null, etaText(trip.etas[index], leg.toZip)].filter(Boolean).join(" · ")}
            live={index === 0}
          />
        ))}
      </ol>
      {trip.pay > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Cell label={trip.stopsLeft > 1 ? "Still on the truck" : "Customer pays"} value={money(trip.pay)} />
          <Cell label="Already in the bank" value={money(trip.deposit)} />
          <Cell label="Still owed" value={money(trip.balance)} />
          <Cell label="Fuel still to burn" value={money(trip.burn)} alert={short} />
        </dl>
      ) : (
        <p className="mt-3 text-sm">
          {trip.vehicle.status === "inbound"
            ? "No customer on this move."
            : `No one is paying for this move. Fuel still to burn is about ${money(trip.burn)}.`}
        </p>
      )}
      {trip.pay > 0 ? (
        <p className={`mt-3 text-sm ${short ? "text-rust" : "text-pine"}`}>
          {short
            ? `About ${money(Math.abs(trip.afterFuel))} more fuel than the balance still owed, at $${diesel.toFixed(2)} a gallon.`
            : `About ${money(trip.afterFuel)} left after that fuel, at $${diesel.toFixed(2)} a gallon.`}
          {trip.cashForFuel + 1 < trip.burn ? ` About ${money(trip.burn - trip.cashForFuel)} of the fuel is already in the tank, so less cash has to leave the bank.` : ""}
        </p>
      ) : null}
      {trip.dues.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-ink/60">
          {trip.dues.map((due) => (
            <li key={`${due.toZip}-${due.dueAt}`}>
              {labelPlace(due.toZip)} · {due.dueAt > 0 ? dueDayLabel(simHours, due.dueAt, due.toZip) : "Day is set at pickup"}
            </li>
          ))}
        </ul>
      ) : null}
      {trip.lateFee ? <p className="mt-1 text-sm text-ink/60">Marked load. If it is late, 20% of the original pay comes off the unpaid balance each day.</p> : null}
      <p className="mt-2 text-sm text-ink/45">Diesel moves. This uses today's price, not a locked quote.</p>
    </Panel>
  );
}

function etaText(at: number | undefined, zip: string): string | null {
  if (at == null) return null;
  const day = localDay(at, zip);
  return `ETA ${day.short} ${day.clock}`;
}

function milesOnLeg(routeMiles: number, traveled: number): string {
  const left = Math.max(0, routeMiles - traveled);
  if (left < 1) return "Here";
  return `${Math.round(left).toLocaleString("en-US")} mi`;
}

function legText(leg: Leg): string {
  const place = labelPlace(leg.toZip);
  if (leg.kind === "pickup") return `Pick up in ${place}`;
  if (leg.kind === "loaded") return `Deliver in ${place}`;
  if (leg.kind === "yard") return `Unload at ${place}`;
  if (leg.kind === "reposition") return `Return to ${place}`;
  if (leg.kind === "trailer") return `Hook the trailer in ${place}`;
  return `Seller delivery to ${place}`;
}

function LegRow({ mark, text, detail, live = false }: { mark: string; text: string; detail?: string; live?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
      <span>
        <span className={`mr-3 text-[10px] font-medium uppercase tracking-[0.18em] ${live ? "text-pine" : mark === "Done" ? "text-ink/35" : "text-ink/55"}`}>{mark}</span>
        <span className={mark === "Done" ? "text-ink/45" : ""}>{text}</span>
      </span>
      {detail ? <span className="shrink-0 tabular-nums text-ink/60">{detail}</span> : null}
    </li>
  );
}

function Cell({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums ${alert ? "text-rust" : ""}`}>{value}</dd>
    </div>
  );
}
