import { KIND_INFO, money } from "@/game/sim";
import { Panel, whenLabel, useWorld } from "@/components/desk/bits";
import { nextPayday, readTrip, resale, type TripRead } from "@/components/desk/trip";

export function Finance() {
  const { world, company } = useWorld();
  if (!company) return null;
  const trips = company.vehicles.map((vehicle) => readTrip(world, company, vehicle)).filter((trip): trip is TripRead => trip != null);
  const owedOnRoad = trips.reduce((sum, trip) => sum + trip.balance, 0);
  const fuel = trips.reduce((sum, trip) => sum + trip.burn, 0);
  const stored = company.shipments.filter((shipment) => shipment.status === "stored");
  const owedStored = stored.reduce((sum, shipment) => sum + Math.max(0, shipment.pay - shipment.deposit), 0);
  const wages = company.drivers.reduce((sum, driver) => sum + driver.wage, 0);
  const yardValue = company.warehouses.reduce((sum, yard) => sum + (yard.starter ? 0 : Math.round(yard.price * 0.7)), 0);
  const iron = company.vehicles.reduce((sum, vehicle) => sum + resale(vehicle), 0);
  const ifFinish = company.cash + owedOnRoad + owedStored - fuel - wages;
  const moneyLog = world.log.filter((line) => line.text.includes("$"));

  return (
    <div className="space-y-4">
      <Panel title="The books">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Cell label="Cash" value={money(company.cash)} alert={company.cash < 0} />
          <Cell label="Still owed on the road" value={money(owedOnRoad)} />
          <Cell label="Fuel still to burn" value={money(fuel)} alert={fuel > owedOnRoad && fuel > 0} />
          <Cell label="Owed on stored freight" value={money(owedStored)} />
          <Cell label={`Wages on ${nextPayday(world.simHours)}`} value={money(wages)} />
          <Cell label="If it all lands" value={money(ifFinish)} alert={ifFinish < 0} />
        </dl>
        <p className="mt-3 text-sm text-ink/70">
          “If it all lands” is cash, plus balances still owed, minus fuel still to burn at ${world.diesel.toFixed(2)} a gallon, minus the next full wages. It ignores late fees, damage, and new loads.
        </p>
      </Panel>
      <Panel title="What you could sell">
        <p className="text-sm text-ink/70">
          Trucks and trailers, about {money(iron)} if sold today.
          {yardValue > 0 ? ` Extra warehouses, about ${money(yardValue)}. The first building is not for sale.` : " The first building is not for sale."}
        </p>
        {company.vehicles.length === 0 ? <p className="mt-2 text-sm text-ink/60">No equipment yet.</p> : null}
        <ul className="mt-3 space-y-2">
          {company.vehicles.map((vehicle) => (
            <li key={vehicle.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/10 pb-2 text-sm last:border-0">
              <span>
                {KIND_INFO[vehicle.kind].label}
                <span className="text-ink/50"> · condition {Math.round(vehicle.condition)}</span>
              </span>
              <span className="tabular-nums">{money(resale(vehicle))}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Recent money">
        {moneyLog.length === 0 ? (
          <p className="text-sm text-ink/70">Nothing has moved the bank yet.</p>
        ) : (
          <ul className="space-y-2">
            {moneyLog.slice(0, 16).map((line) => (
              <li key={line.id} className="border-b border-ink/10 pb-2 text-sm last:border-0">
                <span className="text-ink/45">{whenLabel(line.at)}</span>
                <span className={line.tone === "bad" ? "text-rust" : line.tone === "good" ? "text-pine" : ""}> {line.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
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
