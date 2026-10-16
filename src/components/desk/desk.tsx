import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Map, Package, Pause, Play, Truck, Users, Warehouse } from "lucide-react";
import { closureDate, EPOCH, money } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice, PlaceSearch, whenLabel, useWorld } from "@/components/desk/bits";
import { MapBoard } from "@/components/desk/map-board";

const NAV = [
  { to: "/", label: "Map", icon: Map },
  { to: "/loads", label: "Loads", icon: Package },
  { to: "/fleet", label: "Fleet", icon: Truck },
  { to: "/crew", label: "Crew", icon: Users },
  { to: "/yards", label: "Yards", icon: Warehouse },
] as const;

export function DeskShell() {
  const boot = useDesk((s) => s.boot);
  const tick = useDesk((s) => s.tick);
  const ready = useDesk((s) => s.ready);
  const { company } = useWorld();

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

  if (!ready) {
    return (
      <main className="px-4 py-16">
        <p className="font-display text-4xl uppercase tracking-tight">Opening the desk</p>
      </main>
    );
  }
  if (!company) return <OpenScreen />;
  if (company.closed) return <ClosedScreen />;
  return <LiveChrome />;
}

function OpenScreen() {
  const { world } = useWorld();
  const found = useDesk((s) => s.found);
  const [name, setName] = useState("");
  const [zip, setZip] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const roads = world.jobs.filter((job) => job.mode === "road").length;

  return (
    <main className="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 py-8 lg:grid-cols-2 lg:py-14">
      <div className="space-y-6">
        <p className="text-xs font-medium uppercase tracking-widest text-ink/50">Practical Miles</p>
        <h1 className="font-display text-5xl uppercase leading-none tracking-tight sm:text-6xl">Start with a warehouse.</h1>
        <p className="max-w-prose text-ink/75">
          You open with $25,000, reputation 35, and a small building that can hold a little freight. Wealth comes from more trucks and more loads, not from one truck printing money. Planes and ships are out there. They are not yours yet.
        </p>
        <p className="text-sm tabular-nums text-ink/55">
          {whenLabel(world.simHours)} · diesel ${world.diesel.toFixed(2)}/gal · {roads === 0 ? "the board is filling in" : `${roads} road loads already posted`}
        </p>
        <form
          className="space-y-3 border border-ink/15 bg-sheet p-4"
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
            <span className="text-xs uppercase tracking-widest text-ink/55">Company name</span>
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
    </main>
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
    <main className="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 py-8 lg:grid-cols-2">
      <div className="space-y-6">
        <p className="text-xs font-medium uppercase tracking-widest text-ink/50">Company closed</p>
        <h1 className="font-display text-5xl uppercase leading-none tracking-tight">{company.name}</h1>
        <p className="max-w-prose text-ink/75">
          Three months in the red shut the doors. The highways did not stop. Open again with a new name and a new ZIP. You get $25,000, reputation 35, and a small warehouse. The old trucks are gone.
        </p>
        <form
          className="space-y-3 border border-ink/15 bg-sheet p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!zip) return;
            setNote(restart(name, zip));
          }}
        >
          <label className="block space-y-1 text-sm font-medium">
            <span className="text-xs uppercase tracking-widest text-ink/55">New company name</span>
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
    </main>
  );
}

function LiveChrome() {
  const { world, company } = useWorld();
  const paused = useDesk((s) => s.paused);
  const togglePause = useDesk((s) => s.togglePause);
  const path = useRouterState({ select: (state) => state.location.pathname });
  if (!company) return null;
  const closeHours = company.negativeSince == null ? null : (closureDate(company.negativeSince).getTime() - EPOCH) / 3_600_000;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink/15 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-widest text-ink/50">{whenLabel(world.simHours)}</p>
            <h1 className="truncate font-display text-2xl uppercase leading-none tracking-tight sm:text-3xl">{company.name}</h1>
          </div>
          <Button variant={paused ? "primary" : "quiet"} onClick={togglePause}>
            {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            {paused ? "Resume" : "Pause"}
          </Button>
        </div>
        <dl className="mx-auto grid max-w-6xl grid-cols-3 border-t border-ink/10">
          <Stat label="Cash" value={money(company.cash)} alert={company.cash < 0} />
          <Stat label="Reputation" value={String(company.rep)} />
          <Stat label="Diesel" value={`$${world.diesel.toFixed(2)}`} />
        </dl>
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 py-2 md:flex" aria-label="Company">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} active={isActive(path, item.to)} />
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-5 pb-28 md:pb-10">
        {paused ? <p className="text-sm text-ink/60">Paused. Closing the page will not move the clock, run payroll, or count the three months.</p> : null}
        {closeHours != null ? (
          <p className="text-sm text-rust">The bank account is negative. If it is still red on {whenLabel(closeHours)}, the company closes.</p>
        ) : null}
        <Outlet />
      </main>
      <nav className="nav-safe fixed inset-x-0 bottom-0 z-30 border-t border-ink/15 bg-paper md:hidden" aria-label="Company">
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(path, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium uppercase tracking-wide ${active ? "text-ink" : "text-ink/45"}`}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function isActive(path: string, to: string) {
  const clean = path.replace(/\/$/, "") || "/";
  return to === "/" ? clean === "/" : clean === to || clean.endsWith(to);
}

function NavLink({ to, label, active }: { to: (typeof NAV)[number]["to"]; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-11 items-center px-3 text-sm font-medium uppercase tracking-widest ${active ? "border-b-2 border-ink text-ink" : "text-ink/45"}`}
    >
      {label}
    </Link>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="border-ink/10 px-4 py-2 sm:border-l sm:first:border-l-0">
      <dt className="text-xs uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className={`truncate text-lg font-semibold tabular-nums ${alert ? "text-rust" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

export function Log() {
  const { world } = useWorld();
  if (!world.log.length) return null;
  return (
    <section className="border border-ink/10 bg-sheet p-4">
      <h2 className="mb-3 font-display text-2xl uppercase leading-none tracking-tight">Desk notes</h2>
      <ol className="space-y-2 text-sm">
        {world.log.slice(0, 8).map((line) => (
          <li key={line.id} className={line.tone === "bad" ? "text-rust" : line.tone === "good" ? "text-pine" : "text-ink/80"}>
            <span className="tabular-nums text-ink/40">{whenLabel(line.at)} · </span>
            {line.text}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}
