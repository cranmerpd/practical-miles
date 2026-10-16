import { labelPlace } from "@/game/geo";
import { dueDayLabel, KIND_INFO, localDay, money, type LogLine } from "@/game/sim";
import { Panel, useWorld } from "@/components/desk/bits";
import { nextPayday, readTrip, resale, type TripRead } from "@/components/desk/trip";

export function Finance() {
  const { world, company } = useWorld();
  if (!company) return null;
  const trips = company.vehicles.map((vehicle) => readTrip(world, company, vehicle)).filter((trip): trip is TripRead => trip != null);
  const owedOnRoad = trips.reduce((sum, trip) => sum + trip.balance, 0);
  const fuel = trips.reduce((sum, trip) => sum + trip.burn, 0);
  const open = company.shipments.filter((shipment) => shipment.status !== "done");
  const stored = open.filter((shipment) => shipment.status === "stored");
  const receivable = open.reduce((sum, shipment) => sum + Math.max(0, shipment.pay - shipment.deposit), 0);
  const wages = company.drivers.reduce((sum, driver) => sum + driver.wage, 0);
  const yardValue = company.warehouses.reduce((sum, yard) => sum + (yard.starter ? 0 : Math.round(yard.price * 0.7)), 0);
  const iron = company.vehicles.reduce((sum, vehicle) => sum + resale(vehicle), 0);
  const records = (company.deliveries ?? []).filter((row) => row.at != null && row.payout != null);
  const month = localDay(world.simHours, company.homeZip).key.split("-").slice(0, 2).join("-");
  const thisMonth = records.filter((row) => localDay(row.at ?? 0, company.homeZip).key.startsWith(`${month}-`) || localDay(row.at ?? 0, company.homeZip).key.split("-").slice(0, 2).join("-") === month);
  const books = (rows: typeof records) => ({
    stops: rows.length,
    onTime: rows.filter((row) => !row.late).length,
    late: rows.filter((row) => row.late).length,
    contract: rows.reduce((sum, row) => sum + row.pay, 0),
    cuts: rows.reduce((sum, row) => sum + row.lateCut, 0),
    damage: rows.reduce((sum, row) => sum + row.damage, 0),
    collected: rows.reduce((sum, row) => sum + row.deposit + (row.payout ?? 0) - row.damage, 0),
  });
  const monthBooks = books(thisMonth);
  const allBooks = books(records);
  const partials = (company.deliveries ?? []).filter((row) => row.partial).length;
  const moneyLog = world.log.filter((line) => line.text.includes("$"));
  const days: { key: string; label: string; lines: LogLine[] }[] = [];
  for (const line of moneyLog) {
    const day = localDay(line.at, company.homeZip);
    const found = days.find((item) => item.key === day.key);
    if (found) found.lines.push(line);
    else days.push({ key: day.key, label: day.label, lines: [line] });
  }

  return (
    <div className="space-y-4">
      <Panel title="Position today">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Cell label="Cash" value={money(company.cash)} alert={company.cash < 0} />
          <Cell label="Still to collect" value={money(receivable)} />
          <Cell label="Fuel still to burn" value={money(fuel)} alert={fuel > owedOnRoad && fuel > 0} />
          <Cell label={`Wages on ${nextPayday(world.simHours)}`} value={money(wages)} />
          <Cell label="Equipment if sold" value={money(iron)} />
          <Cell label="Other buildings" value={money(yardValue)} />
        </dl>
        <p className="mt-3 text-sm text-ink/70">
          Still to collect is the unpaid balance on freight you already booked, including what is sitting in a warehouse. Deposits are already in cash. Fuel is what the trucks still out will burn at ${world.diesel.toFixed(2)} a gallon. The first building is not for sale.
        </p>
      </Panel>

      <Panel title="Delivered freight">
        <div className="grid gap-4 sm:grid-cols-2">
          <Books title="This month" row={monthBooks} />
          <Books title="On the record" row={allBooks} />
        </div>
        <p className="mt-3 text-sm text-ink/60">
          Collected is the deposit plus the balance the customer paid, minus damage claims. Late cuts are already out of the balance. Fuel and wages are not in this table. They leave the bank on their own lines below.
          {partials > 0 ? ` ${partials} older stop${partials === 1 ? "" : "s"} finished before the payout was kept, so ${partials === 1 ? "it is" : "they are"} not in these totals.` : ""}
        </p>
      </Panel>

      <Panel title="Open freight">
        {open.length === 0 ? (
          <p className="text-sm text-ink/70">Nothing is booked, rolling, or stored.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((shipment) => {
              const balance = Math.max(0, shipment.pay - shipment.deposit);
              const where = shipment.status === "stored" ? "In the warehouse" : shipment.status === "booked" ? "Booked" : "On the road";
              return (
                <li key={shipment.id} className="border-b border-ink/10 pb-3 text-sm last:border-0">
                  <p className="font-medium">
                    {labelPlace(shipment.fromZip)}
                    <span className="text-ink/50"> to </span>
                    {labelPlace(shipment.toZip)}
                  </p>
                  <p className="text-ink/70">
                    {where} · balance {money(balance)} · {dueDayLabel(world.simHours, shipment.dueAt, shipment.toZip)}
                    {shipment.lateFee ? " · late fee on the contract" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {stored.length > 0 ? <p className="mt-3 text-sm text-ink/60">{stored.length} of those are on a warehouse floor. The due day is still running.</p> : null}
      </Panel>

      <Panel title="Cash journal">
        {days.length === 0 ? (
          <p className="text-sm text-ink/70">Nothing has moved the bank yet.</p>
        ) : (
          <div className="space-y-4">
            {days.map((day) => (
              <section key={day.key}>
                <h3 className="text-xs uppercase tracking-widest text-ink/45">{day.label}</h3>
                <ul className="mt-2 space-y-2">
                  {day.lines.map((line) => (
                    <li key={line.id} className={`border-b border-ink/10 pb-2 text-sm last:border-0 ${line.tone === "bad" ? "text-rust" : line.tone === "good" ? "text-pine" : ""}`}>
                      {line.text}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <p className="mt-3 text-sm text-ink/60">The journal keeps the latest movements, not every dollar since the company opened.</p>
      </Panel>

      {company.vehicles.length > 0 ? (
        <Panel title="What the equipment would bring">
          <ul className="space-y-2">
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
      ) : null}
    </div>
  );
}

function Books({
  title,
  row,
}: {
  title: string;
  row: { stops: number; onTime: number; late: number; contract: number; cuts: number; damage: number; collected: number };
}) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-widest text-ink/45">{title}</h3>
      <dl className="mt-2 space-y-1 text-sm">
        <Line label="Stops" value={String(row.stops)} />
        <Line label="On time" value={String(row.onTime)} />
        <Line label="Late" value={String(row.late)} />
        <Line label="Contracted" value={money(row.contract)} />
        <Line label="Late cuts" value={money(row.cuts)} />
        <Line label="Damage" value={money(row.damage)} />
        <Line label="Collected" value={money(row.collected)} />
      </dl>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 py-1">
      <dt className="text-ink/60">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Cell({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className={`mt-1 font-display text-3xl leading-none tabular-nums ${alert ? "text-rust" : ""}`}>{value}</dd>
    </div>
  );
}
