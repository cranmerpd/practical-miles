import { useState, type ReactNode } from "react";
import { useDesk } from "@/game/store";
import { lookupZip, searchPlaces } from "@/game/geo";
import { formatWhen, gameDate, localDay } from "@/game/sim";
import { Input } from "@/components/ui/input";

export function useWorld() {
  const frame = useDesk((s) => s.frame);
  const world = useDesk((s) => s.world);
  return { frame, world, company: world.company };
}

export function Panel({ title, kicker, children, extra }: { title: string; kicker?: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="border border-ink/15 border-l-4 border-l-pine bg-sheet">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 px-4 py-3">
        <div>
          {kicker ? <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink/40">{kicker}</p> : null}
          <h2 className="font-display text-xl uppercase leading-none tracking-tight">{title}</h2>
        </div>
        {extra}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageTitle({ kicker, title }: { kicker: string; title: string; note?: string }) {
  return (
    <header>
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-pine">{kicker}</p>
      <h2 className="mt-1 font-display text-3xl uppercase leading-none tracking-tight">{title}</h2>
    </header>
  );
}

export function Track({ label, value, max, display, tone = "ink" }: { label: string; value: number; max: number; display?: string; tone?: "ink" | "pine" | "rust" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fill = tone === "pine" ? "bg-pine" : tone === "rust" ? "bg-rust" : "bg-ink";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs uppercase tracking-widest text-ink/45">
        <span>{label}</span>
        {display ? <span className="tabular-nums normal-case tracking-normal text-ink">{display}</span> : null}
      </div>
      <div className="mt-1.5 h-3 bg-ink/10">
        <div className={`h-3 ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Split({ leftLabel, rightLabel, left, right }: { leftLabel: string; rightLabel: string; left: number; right: number }) {
  const total = Math.max(0.01, left + right);
  const share = Math.max(0, Math.min(100, (left / total) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs uppercase tracking-widest text-ink/45">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="mt-1.5 flex h-3 overflow-hidden bg-ink/10">
        <div className="h-3 bg-pine" style={{ width: `${share}%` }} />
        <div className="h-3 bg-rust" style={{ width: `${100 - share}%` }} />
      </div>
    </div>
  );
}
export function Notice({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="text-sm text-rust" role="status">
      {text}
    </p>
  );
}

export function whenLabel(hours: number): string {
  const date = gameDate(hours);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${days[date.getUTCDay()]}, ${formatWhen(hours)}, ${date.getUTCFullYear()}`;
}

export function stamp(simHours: number, zip: string): string {
  const day = localDay(simHours, zip);
  return `${day.short}, ${day.clock}`;
}

export function dockLine(rollup: number, unloadAt: number, zip: string, closed: boolean): string {
  if (!closed) return `Arrives ${stamp(rollup, zip)} local. Dock is open.`;
  return `Arrives ${stamp(rollup, zip)} local. Dock is closed. Unloads ${stamp(unloadAt, zip)}.`;
}

export function hoursLeft(h: number): string {
  if (h < -0.05) return `${hoursLeft(-h)} late`;
  const hours = Math.max(0, Math.round(h));
  if (hours < 36) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

export function pounds(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} lb`;
}

export function cubes(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} cu ft`;
}

export function PlaceSearch({ label, onPick }: { label: string; onPick: (zip: string | null) => void }) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const hits = query.trim().length >= 2 ? searchPlaces(query, 6) : [];
  const direct = lookupZip(query);

  return (
    <div className="space-y-2">
      <label className="block space-y-1 text-sm font-medium">
        <span>{label}</span>
        <Input
          value={query}
          autoComplete="off"
          placeholder="City or ZIP"
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setChosen(null);
            onPick(lookupZip(next)?.zip ?? null);
          }}
        />
      </label>
      {chosen ? <p className="text-sm text-pine">{chosen}</p> : null}
      {!chosen && hits.length > 0 ? (
        <ul className="overflow-hidden rounded-md border border-ink/10">
          {hits.map((place) => (
            <li key={place.zip}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-ink/5"
                onClick={() => {
                  const text = `${place.city}, ${place.state} ${place.zip}`;
                  setQuery(text);
                  setChosen(text);
                  onPick(place.zip);
                }}
              >
                <span>
                  {place.city}, {place.state}
                </span>
                <span className="tabular-nums text-ink/60">{place.zip}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!chosen && query.trim().length >= 5 && !direct && hits.length === 0 ? (
        <p className="text-sm text-rust">That is not a stop on this map.</p>
      ) : null}
    </div>
  );
}
