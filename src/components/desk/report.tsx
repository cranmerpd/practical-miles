import { useState } from "react";
import { labelPlace } from "@/game/geo";
import { KIND_INFO, localDay, money, type DeliveryRecord } from "@/game/sim";
import { cubes, Panel, pounds, useWorld } from "@/components/desk/bits";

export function Report() {
  const { world, company } = useWorld();
  const [shown, setShown] = useState(7);
  if (!company) return null;
  const rows = company.deliveries ?? [];
  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <Panel title="Nothing delivered yet">
          <p className="text-sm text-ink/70">When a customer pays the balance, the stop is written here. The day, the lane, the truck, and what the bank actually received.</p>
        </Panel>
      </div>
    );
  }

  const known = rows.filter((row) => !row.partial && row.at != null);
  const net = known.reduce((sum, row) => sum + (row.payout ?? 0) - row.damage, 0);
  const late = known.filter((row) => row.late).length;
  const groups = new Map<string, { key: string; label: string; at: number; rows: DeliveryRecord[] }>();
  const earlier: DeliveryRecord[] = [];
  for (const row of rows) {
    if (row.at == null) {
      earlier.push(row);
      continue;
    }
    const day = localDay(row.at, company.homeZip);
    const group = groups.get(day.key);
    if (group) group.rows.push(row);
    else groups.set(day.key, { key: day.key, label: day.label, at: row.at, rows: [row] });
  }
  const days = [...groups.values()].sort((a, b) => b.at - a.at);
  for (const day of days) day.rows.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  const visible = days.slice(0, shown);

  return (
    <div className="space-y-4">
      <Panel title="The record">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Cell label="Deliveries" value={String(rows.length)} />
          <Cell label="On time" value={String(known.length - late)} />
          <Cell label="Late" value={String(late)} alert={late > 0} />
          <Cell label="Net to the bank" value={money(net)} alert={net < 0} />
        </dl>
        <p className="mt-3 text-sm text-ink/60">
          Days follow the clock at your home warehouse. The time on each card is local at the dock. Empty miles back to the yard are not on these cards.
        </p>
      </Panel>
      {visible.map((day) => {
        const dayNet = day.rows.reduce((sum, row) => sum + (row.payout ?? 0) - row.damage, 0);
        return (
          <section key={day.key} className="space-y-3">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl uppercase leading-none tracking-tight">{day.label}</h2>
              <p className="text-sm tabular-nums text-ink/60">
                {day.rows.length} {day.rows.length === 1 ? "delivery" : "deliveries"} · {money(dayNet)}
              </p>
            </header>
            {day.rows.map((row) => (
              <Card key={row.id} row={row} />
            ))}
          </section>
        );
      })}
      {days.length > shown ? (
        <button type="button" className="min-h-11 border border-ink/20 px-4 text-sm font-semibold uppercase tracking-wide" onClick={() => setShown((value) => value + 7)}>
          Older days ({days.length - shown} left)
        </button>
      ) : null}
      {earlier.length > 0 && shown >= days.length ? (
        <section className="space-y-3">
          <header>
            <h2 className="font-display text-2xl uppercase leading-none tracking-tight">Before the report</h2>
            <p className="mt-1 text-sm text-ink/60">These finished before the record kept the driver, the truck, and the exact payout.</p>
          </header>
          {earlier.map((row) => (
            <Card key={row.id} row={row} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function Card({ row }: { row: DeliveryRecord }) {
  const dock = row.at != null ? localDay(row.at, row.toZip) : null;
  const due = localDay(row.dueAt, row.toZip);
  const net = (row.payout ?? 0) - row.damage;
  return (
    <article className="border border-ink/10 bg-sheet p-4">
      <p className="font-medium">
        {labelPlace(row.fromZip)}
        <span className="text-ink/50"> to </span>
        {labelPlace(row.toZip)}
      </p>
      <p className={`mt-1 text-sm ${row.late ? "text-rust" : "text-pine"}`}>
        {row.partial
          ? row.late
            ? "Late. The day count was not kept."
            : "Finished. On time or late was not kept."
          : row.late
            ? row.lateDays > 0
              ? `${row.lateDays} day${row.lateDays === 1 ? "" : "s"} late`
              : "Late"
            : "On time"}
        {dock ? ` · dock at ${dock.clock}` : ""}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
        <Fact label="Due" value={due.label} />
        <Fact label="This leg" value={`${Math.round(row.miles).toLocaleString("en-US")} mi`} />
        <Fact label="Freight" value={`${pounds(row.weight)} · ${cubes(row.cube)}`} />
        <Fact label="Cargo value" value={money(row.cargoValue)} />
        <Fact label="Contract" value={money(row.pay)} />
        <Fact label="Deposit" value={money(row.deposit)} />
        {row.partial ? null : (
          <>
            <Fact label="Late cut" value={row.lateCut > 0 ? money(row.lateCut) : "None"} alert={row.lateCut > 0} />
            <Fact label="Balance paid" value={money(row.payout ?? 0)} />
            <Fact label="Damage claim" value={row.damage > 0 ? money(row.damage) : "None"} alert={row.damage > 0} />
            <Fact label="Net" value={money(net)} alert={net < 0} />
            <Fact label="Reputation" value={row.rep > 0 ? `+${row.rep}` : String(row.rep)} alert={row.rep < 0} />
          </>
        )}
      </dl>
      <p className="mt-3 text-sm text-ink/70">
        {row.fragile ? "Fragile. " : "Not fragile. "}
        {row.lateFee ? "The contract cuts pay if it is late. " : "A late day costs reputation, not pay. "}
        {row.driver && row.truck
          ? `${row.driver} in the ${KIND_INFO[row.truck].label.toLowerCase()}, condition ${Math.round(row.condition ?? 0)}.`
          : "Driver and truck were not kept."}
      </p>
    </article>
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

function Fact({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className={`mt-0.5 tabular-nums ${alert ? "text-rust" : ""}`}>{value}</dd>
    </div>
  );
}
