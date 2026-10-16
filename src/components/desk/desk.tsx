import { useCallback, useEffect, useState } from "react";
import { Download, Pause, Play, Upload } from "lucide-react";
import type { MapPoint } from "@/game/geo";
import { closureDate, EPOCH, money } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice, PlaceSearch, whenLabel, useWorld } from "@/components/desk/bits";
import { Crew } from "@/components/desk/crew";
import { Fleet } from "@/components/desk/fleet";
import { Loads } from "@/components/desk/loads";
import { MapBoard } from "@/components/desk/map-board";
import { Yards } from "@/components/desk/yards";

type Tab = "board" | "fleet" | "crew" | "yards";

export function Desk() {
  const boot = useDesk((s) => s.boot);
  const tick = useDesk((s) => s.tick);
  const ready = useDesk((s) => s.ready);
  const { world, company } = useWorld();
  const [route, setRoute] = useState<MapPoint[] | null>(null);
  const onRoute = useCallback((points: MapPoint[] | null) => setRoute(points), []);

  useEffect(() => {
    boot();
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const loop = (now: number) => {
      const raw = Math.max(0, (now - last) / 1000);
      last = now;
      const state = useDesk.getState();
      if (state.ready && !state.paused) {
        if (raw > 1.25) {
          tick(raw);
          acc = 0;
        } else {
          acc += raw;
          if (acc >= 0.25) {
            tick(acc);
            acc = 0;
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [boot, tick]);

  return (
    <main className="mx-auto w-full max-w-7xl px-3 pb-24 pt-4 sm:px-5">
      {!ready ? (
        <p className="font-display text-2xl tracking-tight">Opening the desk…</p>
      ) : !company ? (
        <OpenScreen />
      ) : company.closed ? (
        <ClosedScreen />
      ) : (
        <Live route={route} onRoute={onRoute} clock={world.simHours} />
      )}
    </main>
  );
}

function OpenScreen() {
  const { world } = useWorld();
  const found = useDesk((s) => s.found);
  const [name, setName] = useState("");
  const [zip, setZip] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const roads = world.jobs.filter((job) => job.mode === "road").length;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-ink/60">Practical Miles</p>
        <h1 className="font-display text-3xl tracking-tight">Start with a warehouse and a used truck.</h1>
        <p className="max-w-prose text-ink/80">
          You open with $25,000, reputation 35, and a small building that can hold a little freight. Wealth comes from more trucks and more loads, not from one truck printing money. Planes and ships are out there. They are not yours yet.
        </p>
        <p className="text-sm tabular-nums text-ink/70">
          {whenLabel(world.simHours)} · diesel ${world.diesel.toFixed(2)}/gal · {roads === 0 ? "the board is filling in" : `${roads} road loads already posted`}
        </p>
        <form
          className="space-y-3 rounded-lg border border-ink/10 bg-sheet p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!zip) {
              setNote("Pick a real ZIP code.");
              return;
            }
            setNote(found(name, zip));
          }}
        >
          <label className="block space-y-1 text-sm font-medium">
            <span>Company name</span>
            <Input value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
          </label>
          <PlaceSearch label="Where is the warehouse?" onPick={setZip} />
          <Button type="submit" disabled={!name.trim() || !zip}>
            Open the company
          </Button>
          <Notice text={note} />
        </form>
      </div>
      <MapBoard route={null} />
    </div>
  );
}

function ClosedScreen() {
  const { company } = useWorld();
  const restart = useDesk((s) => s.restart);
  const [name, setName] = useState("");
  const [zip, setZip] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <h1 className="font-display text-3xl tracking-tight">{company.name} is closed.</h1>
        <p className="max-w-prose text-ink/80">
          Three months in the red shut the doors. The highways did not stop. Open again with a new name and a new ZIP. You get $25,000, reputation 35, and a small warehouse. The old trucks are gone.
        </p>
        <form
          className="space-y-3 rounded-lg border border-ink/10 bg-sheet p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!zip) return;
            setNote(restart(name, zip));
          }}
        >
          <label className="block space-y-1 text-sm font-medium">
            <span>New company name</span>
            <Input value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
          </label>
          <PlaceSearch label="New warehouse ZIP or city" onPick={setZip} />
          <Button type="submit" disabled={!name.trim() || !zip}>
            Open again
          </Button>
          <Notice text={note} />
        </form>
      </div>
      <MapBoard route={null} />
    </div>
  );
}

function Live({ route, onRoute, clock }: { route: MapPoint[] | null; onRoute: (points: MapPoint[] | null) => void; clock: number }) {
  const { world, company } = useWorld();
  const paused = useDesk((s) => s.paused);
  const togglePause = useDesk((s) => s.togglePause);
  const exportSave = useDesk((s) => s.exportSave);
  const importSave = useDesk((s) => s.importSave);
  const [tab, setTab] = useState<Tab>("board");
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;
  const closeHours = company.negativeSince == null ? null : (closureDate(company.negativeSince).getTime() - EPOCH) / 3_600_000;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-ink/10 bg-sheet p-4">
        <div className="min-w-0">
          <p className="text-sm text-ink/60">Practical Miles</p>
          <h1 className="truncate font-display text-2xl tracking-tight">{company.name}</h1>
          <p className="text-sm tabular-nums text-ink/70">{whenLabel(clock)}</p>
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <div>
            <dt className="text-ink/60">Cash</dt>
            <dd className={`tabular-nums text-lg font-semibold ${company.cash < 0 ? "text-rust" : "text-pine"}`}>{money(company.cash)}</dd>
          </div>
          <div>
            <dt className="text-ink/60">Reputation</dt>
            <dd className="tabular-nums text-lg font-semibold">{company.rep}</dd>
          </div>
          <div>
            <dt className="text-ink/60">Diesel</dt>
            <dd className="tabular-nums text-lg font-semibold">${world.diesel.toFixed(2)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant={paused ? "pine" : "quiet"} onClick={togglePause}>
            {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              const blob = new Blob([exportSave()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "practical-miles.json";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="size-4" aria-hidden />
            Export
          </Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-ink/15 bg-ink/5 px-4 text-sm font-semibold hover:bg-ink/10">
            <Upload className="size-4" aria-hidden />
            Import
            <input
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setNote(importSave(String(reader.result ?? "")));
                reader.readAsText(file);
              }}
            />
          </label>
        </div>
      </header>
      {paused ? <p className="text-sm text-ink/70">Paused. Closing the page will not move the clock, run payroll, or count the three months.</p> : null}
      {closeHours != null ? (
        <p className="text-sm text-rust">The bank account is negative. If it is still red on {whenLabel(closeHours)}, the company closes.</p>
      ) : null}
      <Notice text={note} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="lg:sticky lg:top-4">
          <MapBoard route={route} />
        </div>
        <div className="min-w-0 space-y-4 lg:max-h-screen lg:overflow-y-auto lg:pr-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Desk">
            {(
              [
                ["board", "Board"],
                ["fleet", "Fleet"],
                ["crew", "Crew"],
                ["yards", "Yards"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`min-h-11 rounded-md text-sm font-semibold ${tab === id ? "bg-ink text-paper" : "border border-ink/15 bg-sheet text-ink"}`}
                onClick={() => {
                  setTab(id);
                  if (id !== "board") onRoute(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "board" ? <Loads onRoute={onRoute} /> : null}
          {tab === "fleet" ? <Fleet /> : null}
          {tab === "crew" ? <Crew /> : null}
          {tab === "yards" ? <Yards /> : null}
          <Log />
        </div>
      </div>
    </div>
  );
}

function Log() {
  const { world } = useWorld();
  if (!world.log.length) return null;
  return (
    <section className="rounded-lg border border-ink/10 bg-sheet p-4">
      <h2 className="mb-2 font-display text-lg tracking-tight">Desk notes</h2>
      <ol className="space-y-2 text-sm">
        {world.log.slice(0, 8).map((line) => (
          <li key={line.id} className={line.tone === "bad" ? "text-rust" : line.tone === "good" ? "text-pine" : "text-ink/80"}>
            <span className="tabular-nums text-ink/50">{whenLabel(line.at)} · </span>
            {line.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
