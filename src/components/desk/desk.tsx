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
  const [easy, setEasy] = useState(false);
  const roads = world.jobs.filter((job) => job.mode === "road").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 lg:py-16">
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-pine">Practical Miles</p>
      <h1 className="mt-3 max-w-4xl font-display text-6xl uppercase leading-[0.85] tracking-tight sm:text-8xl">The miles are the business.</h1>
      <p className="mt-5 max-w-xl text-xl text-ink/80">
        One warehouse. A used truck. A driver who can only stay out so long. Freight on the real map of the United States, and a clock that does not wait.
      </p>
      <p className="mt-4 text-sm tabular-nums text-ink/45">
        {roads === 0 ? "Loads are posting now." : `${roads} loads are already on the board.`} Diesel is ${world.diesel.toFixed(2)} a gallon. {whenLabel(world.simHours)}.
      </p>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <form
          className="space-y-3 border border-ink/15 bg-sheet p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!zip) {
              setNote("Pick a real ZIP code.");
              return;
            }
            setNote(found(name, zip, easy));
          }}
        >
          <p className="font-display text-3xl uppercase leading-none tracking-tight">Put your name on the door.</p>
          <p className="text-sm text-ink/60">{easy ? "$100,000." : "$25,000."} Reputation 35. A small building in whatever city you choose.</p>
          <label className="block space-y-1 text-sm font-medium">
            <span className="text-xs uppercase tracking-widest text-ink/55">Company name</span>
            <Input value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
          </label>
          <PlaceSearch label="Where is the warehouse?" onPick={setZip} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={easy} onChange={(event) => setEasy(event.target.checked)} />
            Easy. Start with $100,000.
          </label>
          <Button type="submit" disabled={!name.trim() || !zip}>
            Open the company
          </Button>
          <Notice text={note} />
        </form>
        <MapBoard route={null} />
      </div>
      <ul className="mt-10 grid gap-px bg-ink/15 sm:grid-cols-3">
        <OpenPromise title="Real roads" text="Every city is a real ZIP. The miles are the miles." />
        <OpenPromise title="Thin margins" text="A good rate can still lose money once the fuel is burned." />
        <OpenPromise title="A full truck" text="One van can carry more than one load. Then it has to come home." />
      </ul>
      <p className="mt-4 text-sm text-ink/35">Nothing to install. It opens in this browser.</p>
    </main>
  );
}

function OpenPromise({ title, text }: { title: string; text: string }) {
  return (
    <li className="bg-paper px-4 py-4">
      <p className="font-display text-2xl uppercase leading-none tracking-tight">{title}</p>
      <p className="mt-2 text-sm text-ink/60">{text}</p>
    </li>
  );
}

function ClosedScreen() {
  const { company } = useWorld();
  const restart = useDesk((s) => s.restart);
  const [name, setName] = useState("");
  const [zip, setZip] = useState<string | null>(null);
  const [easy, setEasy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;
  return (
    <main className="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 py-8 lg:grid-cols-2">
      <div className="space-y-6">
        <p className="text-xs font-medium uppercase tracking-widest text-ink/50">Company closed</p>
        <h1 className="font-display text-5xl uppercase leading-none tracking-tight">{company.name}</h1>
        <p className="max-w-prose text-ink/75">
          Three months in the red shut the doors. The highways did not stop. Open again with a new name and a new ZIP. You get {easy ? "$100,000" : "$25,000"}, reputation 35, and a small warehouse. The old trucks are gone.
        </p>
        <form
          className="space-y-3 border border-ink/15 bg-sheet p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!zip) return;
            setNote(restart(name, zip, easy));
          }}
        >
          <label className="block space-y-1 text-sm font-medium">
            <span className="text-xs uppercase tracking-widest text-ink/55">New company name</span>
            <Input value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} />
          </label>
          <PlaceSearch label="New warehouse ZIP or city" onPick={setZip} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={easy} onChange={(event) => setEasy(event.target.checked)} />
            Easy. Start with $100,000.
          </label>
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
  const dismissNotice = useDesk((s) => s.dismissNotice);
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
              {([1, 2, 4, 8] as const).map((rate) => (
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
        {(world.notices ?? []).slice(0, 2).map((item) => (
          <div key={item.id} className="mx-auto flex max-w-6xl items-start justify-between gap-3 border-t border-ink/10 px-4 py-2">
            <p className={`text-sm ${item.tone === "bad" ? "text-rust" : item.tone === "good" ? "text-pine" : "text-ink/80"}`}>{item.text}</p>
            <button type="button" className="shrink-0 text-xs uppercase tracking-widest text-ink/45" onClick={() => dismissNotice(item.id)}>
              Dismiss
            </button>
          </div>
        ))}
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
                <p className="text-sm">Are you sure? {company.name} is deleted. The clock, the rivals, the loads, and the diesel price all start over. You pick a new name.</p>
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
      <h2 className="mb-2 text-xs uppercase tracking-widest text-ink/45">Recent</h2>
      <ol className="space-y-1.5 text-sm">
        {world.log.slice(0, 5).map((line) => (
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
