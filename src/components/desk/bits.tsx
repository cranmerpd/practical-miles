import { useState, type ReactNode } from "react";
import { useDesk } from "@/game/store";
import { lookupZip, searchPlaces } from "@/game/geo";
import { formatWhen, gameDate } from "@/game/sim";
import { Input } from "@/components/ui/input";

export function useWorld() {
  const frame = useDesk((s) => s.frame);
  const world = useDesk((s) => s.world);
  return { frame, world, company: world.company };
}

export function Panel({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-sheet p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl uppercase leading-none tracking-tight">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function PageTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-widest text-ink/50">{kicker}</p>
      <h2 className="font-display text-3xl uppercase leading-none tracking-tight sm:text-4xl">{title}</h2>
    </header>
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
  return `${formatWhen(hours)}, ${gameDate(hours).getUTCFullYear()}`;
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
