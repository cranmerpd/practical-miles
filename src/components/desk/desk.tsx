import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { CircleDollarSign, ClipboardList, Map, Package, Pause, Play, Route, Truck, Users, Warehouse } from "lucide-react";
import { closureDate, EPOCH, localDay, money } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice, PlaceSearch, whenLabel, useWorld } from "@/components/desk/bits";
import { MapBoard } from "@/components/desk/map-board";

const NAV = [
  { to: "/", label: "Map", icon: Map },
  { to: "/loads", label: "Loads", icon: Package },
  { to: "/road", label: "Road", icon: Route },
  { to: "/fleet", label: "Fleet", icon: Truck },
  { to: "/crew", label: "Staff", icon: Users },
  { to: "/yards", label: "Yards", icon: Warehouse },
  { to: "/finance", label: "Finance", icon: CircleDollarSign },
  { to: "/report", label: "Report", icon: ClipboardList },
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-12">
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-pine">A freight company, on your desk</p>
      <h1 className="mt-2 font-display text-6xl uppercase leading-[0.85] tracking-tight sm:text-8xl">Practical Miles</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink/80">
        Buy a used truck, hire a driver, and move real ZIP-to-ZIP freight. The highways are the US map. The clock runs while this page is open.
      </p>
      <p className="mt-3 text-sm tabular-nums text-ink/50">
        {whenLabel(world.simHours)} · diesel ${world.diesel.toFixed(2)}/gal · {roads === 0 ? "the board is filling in" : `${roads} road loads posted`}
      </p>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <dl className="grid grid-cols-3 border border-ink/15">
            <OpenFact label="Cash" value="$25,000" />
            <OpenFact label="Reputation" value="35" />
            <OpenFact label="Yard" value="1 small" />
          </dl>
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
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-pine">Open a company</p>
            <label className="block space-y-1 text-sm font-medium">
              <span className="text-xs uppercase tracking-widest text-ink/55">Company name</span>
              <Input value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
            </label>
            <PlaceSearch label="Where is the warehouse?" onPick={setZip} />
            <Button type="submit" disabled={!name.trim() || !zip}>
              Open the company
            </Button>
            <p className="text-sm text-ink/50">A real US city or ZIP. The first building opens there. Planes and ships are on the board. They are not yours yet.</p>
            <Notice text={note} />
          </form>
          <ul className="grid gap-px bg-ink/15 sm:grid-cols-2">
            <OpenStep title="Loads" text="Book a short run, or bring freight home and deliver it later." />
            <OpenStep title="Yards" text="Put more than one load on a truck and send the loop out." />
            <OpenStep title="Road" text="Miles left, the dock, and whether fuel eats the pay." />
            <OpenStep title="Staff" text="Hours left on the clock. A 10-hour break happens at the warehouse." />
          </ul>
          <p className="text-sm text-ink/45">Early build. The company stays in this browser. A different phone or a private window starts a new one.</p>
        </div>
        <MapBoard route={null} />
      </div>
    </main>
  );
}

function OpenFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-ink/15 px-3 py-3 sm:border-l sm:first:border-l-0">
      <dt className="text-[10px] uppercase tracking-[0.18em] text-ink/45">{label}</dt>
      <dd className="mt-1 font-display text-2xl leading-none tabular-nums sm:text-3xl">{value}</dd>
    </div>
  );
}

function OpenStep({ title, text }: { title: string; text: string }) {
  return (
    <li className="bg-paper px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-pine">{title}</p>
      <p className="mt-1 text-sm text-ink/70">{text}</p>
    </li>
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
  const speed = useDesk((s) => s.speed);
  const setSpeed = useDesk((s) => s.setSpeed);
  const togglePause = useDesk((s) => s.togglePause);
  const abandon = useDesk((s) => s.abandon);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [sure, setSure] = useState(false);
  if (!company) return null;
  const closeHours = company.negativeSince == null ? null : (closureDate(company.negativeSince).getTime() - EPOCH) / 3_600_000;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink/15 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.22em] text-pine">{localDay(world.simHours, company.homeZip).label}</p>
            <h1 className="truncate font-display text-2xl uppercase leading-none tracking-tight sm:text-3xl">{company.name}</h1>
            <p className="mt-1 text-sm tabular-nums text-ink/70">{localDay(world.simHours, company.homeZip).clock} local</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex" role="group" aria-label="Speed">
              {([1, 2, 4] as const).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  aria-pressed={speed === rate}
                  className={`min-h-11 min-w-11 border px-2 text-sm tabular-nums ${rate === 1 ? "" : "-ml-px"} ${speed === rate ? "relative z-10 border-ink bg-ink text-paper" : "border-ink/20 text-ink"}`}
                  onClick={() => setSpeed(rate)}
                >
                  {rate}×
                </button>
              ))}
            </div>
            <Button
              variant={paused ? "primary" : "quiet"}
              onClick={() => {
                setSure(false);
                togglePause();
              }}
            >
              {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              {paused ? "Resume" : "Pause"}
            </Button>
          </div>
        </div>
        <dl className="mx-auto grid max-w-6xl grid-cols-3 border-t border-ink/10">
          <Stat label="Cash" value={money(company.cash)} alert={company.cash < 0} />
          <Stat label="Reputation" value={String(company.rep)} />
          <Stat label="Diesel" value={`$${world.diesel.toFixed(2)}`} />
        </dl>
        <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 py-2 md:flex" aria-label="Company">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} active={isActive(path, item.to)} />
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-5 pb-28 md:pb-10">
        {paused ? (
          <div className="space-y-3 border border-ink/15 bg-sheet p-4">
            <p className="text-sm text-ink/60">Paused. Closing the page will not move the clock, run payroll, or count the three months.</p>
            {sure ? (
              <div className="space-y-3">
                <p className="text-sm">Are you sure? {company.name} is gone. Trucks, drivers, and cash go with it. You start over with a new name.</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => abandon()}>Yes, start over</Button>
                  <Button variant="quiet" onClick={() => setSure(false)}>
                    No
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="quiet" onClick={() => setSure(true)}>
                Start over
              </Button>
            )}
          </div>
        ) : null}
        {closeHours != null ? (
          <p className="text-sm text-rust">The bank account is negative. If it is still red on {whenLabel(closeHours)}, the company closes.</p>
        ) : null}
        <Outlet />
      </main>
      <nav className="nav-safe fixed inset-x-0 bottom-0 z-30 border-t border-ink/15 bg-paper md:hidden" aria-label="Company">
        <div className="nav-scroll flex overflow-x-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(path, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-h-14 min-w-[4.6rem] shrink-0 flex-col items-center justify-center gap-0.5 border-t-2 px-1 text-[10px] font-medium uppercase tracking-wide ${active ? "border-pine text-ink" : "border-transparent text-ink/40"}`}
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
      className={`inline-flex min-h-11 items-center border-b-2 px-3 text-xs font-medium uppercase tracking-[0.18em] ${active ? "border-pine text-ink" : "border-transparent text-ink/40 hover:text-ink/70"}`}
    >
      {label}
    </Link>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="border-ink/10 px-4 py-2 sm:border-l sm:first:border-l-0">
      <dt className="text-xs uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className={`truncate font-display text-2xl leading-none tabular-nums ${alert ? "text-rust" : "text-ink"}`}>{value}</dd>
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
