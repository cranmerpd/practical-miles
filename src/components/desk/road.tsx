import { labelPlace } from "@/game/geo";
import { dockWait, dueDayLabel, KIND_INFO, localDay, money, type Leg } from "@/game/sim";
import { Panel, Split, Track, useWorld } from "@/components/desk/bits";
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

  const miles = trips.reduce((sum, trip) => sum + trip.milesLeft, 0);
  const owed = trips.reduce((sum, trip) => sum + trip.balance, 0);
  const after = trips.reduce((sum, trip) => sum + (trip.pay > 0 ? trip.afterFuel : -trip.burn), 0);

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 border border-ink/10 sm:grid-cols-4">
        <Stat label="Moving" value={String(trips.length)} />
        <Stat label="Miles left" value={Math.round(miles).toLocaleString("en-US")} />
        <Stat label="Still owed" value={money(owed)} />
        <Stat label="After fuel" value={money(after)} alert={after < 0} />
      </dl>
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {trips.map((trip) => (
          <TripCard key={trip.vehicle.id} trip={trip} diesel={world.diesel} simHours={world.simHours} company={company} />
        ))}
      </div>
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
    <Panel title={spec.label} extra={<span className="text-sm text-ink/60">{trip.driverName ?? "No driver"} · {trip.leg}</span>}>
      {trip.vehicle.routeMiles > 0 ? (
        <Track
          label="This leg"
          value={trip.vehicle.traveled}
          max={trip.vehicle.routeMiles}
          display={milesOnLeg(trip.vehicle.routeMiles, trip.vehicle.traveled)}
          tone={atDock ? "pine" : "ink"}
        />
      ) : null}
      <p className="mt-2 text-sm text-ink/70">
        Toward {trip.heading}.
        {trip.stopsLeft > 1 ? ` ${trip.stopsLeft} deliveries still aboard.` : ""}
        {closed && resting && atDock
          ? ` Waiting. ${there.clock} there. Open 8am–${closeLabel}.`
          : closed
            ? ` Stop is closed at ${there.clock}. Open 8am–${closeLabel}.`
            : resting
              ? ` Resting until ${localDay(trip.vehicle.restUntil ?? simHours, dest).clock}.`
              : trip.vehicle.status === "inbound"
                ? " Seller is driving it."
                : ` ${(trip.vehicle.driveToday).toFixed(1)}h driven today.`}
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
        <div className="mt-3 space-y-3">
          <Split leftLabel={`Owed ${money(trip.balance)}`} rightLabel={`Fuel ${money(trip.burn)}`} left={Math.max(0, trip.balance)} right={Math.max(0, trip.burn)} />
          <p className={`text-sm ${short ? "text-rust" : "text-pine"}`}>
            {short ? `${money(Math.abs(trip.afterFuel))} short after fuel` : `${money(trip.afterFuel)} left after fuel`}
            {trip.cashForFuel + 1 < trip.burn ? ` · ${money(trip.burn - trip.cashForFuel)} already in the tank` : ""}
            {` · $${diesel.toFixed(2)}/gal`}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm">
          {trip.vehicle.status === "inbound" ? "No customer on this move." : `Empty move. Fuel about ${money(trip.burn)}.`}
        </p>
      )}
      {trip.dues.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-ink/60">
          {trip.dues.map((due) => (
            <li key={`${due.toZip}-${due.dueAt}`}>
              {labelPlace(due.toZip)} · {due.dueAt > 0 ? dueDayLabel(simHours, due.dueAt, due.toZip) : "Day is set at pickup"}
            </li>
          ))}
        </ul>
      ) : null}
      {trip.lateFee ? <p className="mt-1 text-sm text-ink/60">Late fee. 20% of the original pay comes off each day.</p> : null}
    </Panel>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="border-ink/10 p-3 odd:border-r sm:border-r sm:last:border-r-0">
      <dt className="text-[10px] uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className={`font-display text-2xl leading-none tabular-nums ${alert ? "text-rust" : ""}`}>{value}</dd>
    </div>
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
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
      <span>
        <span className={`mr-3 text-[10px] font-medium uppercase tracking-[0.18em] ${live ? "text-pine" : mark === "Done" ? "text-ink/35" : "text-ink/55"}`}>{mark}</span>
        <span className={mark === "Done" ? "text-ink/45" : ""}>{text}</span>
      </span>
      {detail ? <span className="shrink-0 tabular-nums text-ink/60">{detail}</span> : null}
    </li>
  );
}
