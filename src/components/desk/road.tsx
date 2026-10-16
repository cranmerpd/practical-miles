import { Link } from "@tanstack/react-router";
import { KIND_INFO, money } from "@/game/sim";
import { hoursLeft, Panel, whenLabel, useWorld } from "@/components/desk/bits";
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
          Book a load, or send a truck empty from <Link to="/fleet" className="underline">Fleet</Link>. Fuel against pay shows up here once a truck has a trip.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <TripCard key={trip.vehicle.id} trip={trip} diesel={world.diesel} simHours={world.simHours} />
      ))}
    </div>
  );
}

function TripCard({ trip, diesel, simHours }: { trip: TripRead; diesel: number; simHours: number }) {
  const spec = KIND_INFO[trip.vehicle.kind];
  const resting = trip.vehicle.restUntil != null && simHours < trip.vehicle.restUntil;
  const short = trip.pay > 0 && trip.afterFuel < 0;
  return (
    <Panel title={spec.label} extra={<span className="text-sm text-ink/60">{trip.leg}</span>}>
      <p className="text-sm text-ink/70">
        Toward {trip.heading}. {Math.max(1, Math.round(trip.milesLeft)).toLocaleString("en-US")} miles left.
        {trip.driverName ? ` ${trip.driverName} is driving.` : " No driver on it."}
      </p>
      <p className="mt-2 text-sm text-ink/70">
        {resting
          ? `Resting until ${whenLabel(trip.vehicle.restUntil ?? simHours)}.`
          : trip.vehicle.status === "inbound"
            ? "The seller is driving it. You are not paying fuel."
            : `Driven ${trip.vehicle.driveToday.toFixed(1)} hours today.`}
      </p>
      {trip.pay > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Cell label="Customer pays" value={money(trip.pay)} />
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
      {trip.dueAt != null ? <p className="mt-2 text-sm text-ink/60">Due {hoursLeft(trip.dueAt - simHours)}.</p> : null}
      {trip.lateFee ? <p className="mt-1 text-sm text-ink/60">Marked load. If it is late, 20% of the original pay comes off the unpaid balance each day.</p> : null}
      <p className="mt-2 text-sm text-ink/45">Diesel moves. This uses today's price, not a locked quote.</p>
    </Panel>
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
