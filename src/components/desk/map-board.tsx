import { useEffect, useRef, useState } from "react";
import { hubs, labelPlace, lookupZip, MAP, pointAlong, project, roadSegments, type MapPoint } from "@/game/geo";
import { KIND_INFO, money, type Vehicle } from "@/game/sim";
import { useWorld } from "@/components/desk/bits";
import { readTrip } from "@/components/desk/trip";

const HIGHWAY = roadSegments
  .map(([x1, y1, x2, y2]) => `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`)
  .join("");

const CITY_WANT: { city: string; state: string; name: string }[] = [
  { city: "Los Angeles", state: "CA", name: "Los Angeles" },
  { city: "Houston", state: "TX", name: "Houston" },
  { city: "Dallas", state: "TX", name: "Dallas" },
  { city: "Phoenix", state: "AZ", name: "Phoenix" },
  { city: "East Elmhurst", state: "NY", name: "New York" },
  { city: "Beltsville", state: "MD", name: "Washington" },
  { city: "Bala Cynwyd", state: "PA", name: "Philadelphia" },
  { city: "Braintree", state: "MA", name: "Boston" },
  { city: "Arlington Heights", state: "IL", name: "Chicago" },
  { city: "Marietta", state: "GA", name: "Atlanta" },
  { city: "Minneapolis", state: "MN", name: "Minneapolis" },
  { city: "Denver", state: "CO", name: "Denver" },
  { city: "Portland", state: "OR", name: "Portland" },
  { city: "Salt Lake City", state: "UT", name: "Salt Lake" },
  { city: "Kansas City", state: "MO", name: "Kansas City" },
  { city: "Cincinnati", state: "OH", name: "Cincinnati" },
  { city: "Indianapolis", state: "IN", name: "Indianapolis" },
  { city: "Charlotte", state: "NC", name: "Charlotte" },
  { city: "Memphis", state: "TN", name: "Memphis" },
  { city: "Miami", state: "FL", name: "Miami" },
  { city: "Tampa", state: "FL", name: "Tampa" },
  { city: "Poulsbo", state: "WA", name: "Seattle" },
  { city: "Rochester", state: "MI", name: "Detroit" },
  { city: "Pittsburgh", state: "PA", name: "Pittsburgh" },
  { city: "Richmond", state: "VA", name: "Richmond" },
  { city: "New Orleans", state: "LA", name: "New Orleans" },
  { city: "Boise", state: "ID", name: "Boise" },
];

const CITIES = CITY_WANT.flatMap((item) => {
  const hub = hubs.find((candidate) => candidate.city === item.city && candidate.state === item.state);
  if (!hub) return [];
  const [x, y] = project(hub.lat, hub.lon);
  return [{ name: item.name, x, y }];
});

function line(points: MapPoint[]): string {
  if (points.length < 2) return "";
  return points
    .map((point, index) => {
      const [x, y] = project(point.lat, point.lon);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
}

function spot(vehicle: Vehicle): MapPoint | null {
  if (vehicle.route && vehicle.route.length > 0 && vehicle.routeMiles > 0 && (vehicle.status !== "idle" || vehicle.traveled > 0)) {
    return pointAlong(vehicle.route, Math.min(vehicle.traveled, vehicle.routeMiles), vehicle.routeMiles);
  }
  return lookupZip(vehicle.zip) ?? null;
}

const MAP_BOX = { x: -28, y: -18, w: 1056, h: 656 };

type Frame = { x: number; y: number; w: number; h: number };

function clampFrame(frame: Frame): Frame {
  const w = Math.min(MAP_BOX.w, Math.max(MAP_BOX.w / 14, frame.w));
  const h = w * (MAP_BOX.h / MAP_BOX.w);
  const x = Math.min(MAP_BOX.x + MAP_BOX.w - w * 0.25, Math.max(MAP_BOX.x - w * 0.75, frame.x));
  const y = Math.min(MAP_BOX.y + MAP_BOX.h - h * 0.25, Math.max(MAP_BOX.y - h * 0.75, frame.y));
  return { x, y, w, h };
}

export function MapBoard({ route, fit = false, compact = false }: { route: MapPoint[] | null; fit?: boolean; compact?: boolean }) {
  const { world, company } = useWorld();
  const preview = route && route.length > 1 ? line(route) : "";
  const [hover, setHover] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [frame, setFrame] = useState<Frame>(MAP_BOX);
  const hot = pin ?? hover;
  const trucks = (company?.vehicles ?? []).filter(
    (vehicle) => vehicle.kind !== "trailer53" || !company?.vehicles.some((other) => other.coupledTrailerId === vehicle.id),
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const drag = useRef<{ id: number; x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; frame: Frame } | null>(null);
  const skipClick = useRef(false);
  const unit = frame.w / MAP_BOX.w;
  const px = (size: number) => size * unit;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const current = frameRef.current;
      const pxn = (event.clientX - rect.left) / rect.width;
      const pyn = (event.clientY - rect.top) / rect.height;
      const factor = event.deltaY < 0 ? 0.82 : 1.22;
      const w = current.w * factor;
      const next = clampFrame({
        x: current.x + pxn * current.w - pxn * w,
        y: current.y + pyn * current.h - pyn * (w * (MAP_BOX.h / MAP_BOX.w)),
        w,
        h: w,
      });
      setFrame(next);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  function zoomBy(factor: number) {
    setFrame((current) => {
      const w = current.w * factor;
      const h = w * (MAP_BOX.h / MAP_BOX.w);
      return clampFrame({ x: current.x + current.w / 2 - w / 2, y: current.y + current.h / 2 - h / 2, w, h });
    });
  }

  function pointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, vx: frameRef.current.x, vy: frameRef.current.y, moved: false };
    pinch.current = null;
  }

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const point = pointers.current.get(event.pointerId);
    if (point) {
      point.x = event.clientX;
      point.y = event.clientY;
    }
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (!pinch.current) pinch.current = { dist, frame: frameRef.current };
      const factor = pinch.current.dist / Math.max(8, dist);
      const base = pinch.current.frame;
      const w = base.w * factor;
      setFrame(clampFrame({ x: base.x + base.w / 2 - w / 2, y: base.y + base.h / 2 - (w * (MAP_BOX.h / MAP_BOX.w)) / 2, w, h: w }));
      skipClick.current = true;
      return;
    }
    const held = drag.current;
    if (!held || held.id !== event.pointerId) return;
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    if (Math.hypot(dx, dy) < 5) return;
    held.moved = true;
    skipClick.current = true;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = frameRef.current;
    setFrame(clampFrame({ ...current, x: held.vx - dx * (current.w / rect.width), y: held.vy - dy * (current.h / rect.height) }));
  }

  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const held = drag.current;
    if (held?.id === event.pointerId) drag.current = null;
    if (held && !held.moved && (event.target === event.currentTarget || (event.target as SVGElement).dataset.map === "ground")) setPin(null);
    requestAnimationFrame(() => {
      skipClick.current = false;
    });
  }

  function pick(id: string) {
    return (event: React.MouseEvent) => {
      event.stopPropagation();
      if (skipClick.current) return;
      setPin((value) => (value === id ? null : id));
    };
  }

  return (
    <figure className={`relative ${fit ? "grid h-auto overflow-hidden rounded-lg border border-ink/10 bg-sheet lg:h-full lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto]" : "overflow-hidden rounded-lg border border-ink/10 bg-sheet"}`}>
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button type="button" className="min-h-9 min-w-9 border border-ink/20 bg-paper/90 text-sm" onClick={() => zoomBy(0.75)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="min-h-9 min-w-9 border border-ink/20 bg-paper/90 text-sm" onClick={() => zoomBy(1.33)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="min-h-9 border border-ink/20 bg-paper/90 px-2 text-xs uppercase tracking-wide" onClick={() => setFrame(MAP_BOX)}>
          Fit
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
        role="img"
        aria-label="Highway map of the lower 48. Drag to move. Scroll or pinch to zoom. Tap a truck, a city, or a warehouse."
        className={`cursor-grab touch-none active:cursor-grabbing ${fit ? "h-auto max-h-[46dvh] w-full lg:h-full lg:max-h-full lg:min-h-0" : compact ? "h-52 w-full" : "h-auto w-full"}`}
        style={fit || compact ? { touchAction: "none" } : { aspectRatio: `${MAP.width} / ${MAP.height}`, touchAction: "none" }}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      >
        <rect data-map="ground" x={MAP_BOX.x} y={MAP_BOX.y} width={MAP_BOX.w} height={MAP_BOX.h} className="fill-sheet" />
        <path d={HIGHWAY} className="fill-none stroke-ink/25" strokeWidth={1.15} vectorEffect="non-scaling-stroke" />
        {CITIES.map((city) => {
          const on = hot === `city:${city.name}`;
          return (
            <g
              key={city.name}
              className="cursor-pointer"
              onPointerEnter={() => setHover(`city:${city.name}`)}
              onPointerLeave={() => setHover((value) => (value === `city:${city.name}` ? null : value))}
              onClick={pick(`city:${city.name}`)}
            >
              <circle cx={city.x} cy={city.y} r={px(on ? 4 : 1.8)} className={on ? "fill-ink" : "fill-ink/40"} />
              <text x={city.x} y={city.y - px(6)} textAnchor="middle" className={`font-sans ${on ? "fill-ink" : "fill-ink/55"}`} fontSize={px(on ? 14 : 11)}>
                {city.name}
              </text>
            </g>
          );
        })}
        {world.rivals.flatMap((rival) => {
          const sites = [
            ...(rival.hqZip ? [{ zip: rival.hqZip, hq: true }] : []),
            ...(rival.yards ?? []).map((zip) => ({ zip, hq: false })),
          ];
          return sites.flatMap((site) => {
            const place = lookupZip(site.zip);
            if (!place) return [];
            const [x, y] = project(place.lat, place.lon);
            const id = `rival-yard:${rival.id}:${site.zip}`;
            const on = hot === id;
            const color = `hsl(${rival.hue} 72% 64%)`;
            const size = px(site.hq ? (on ? 7 : 5) : on ? 5 : 3.5);
            return [
              <g
                key={id}
                className="cursor-pointer"
                onPointerEnter={() => setHover(id)}
                onPointerLeave={() => setHover((value) => (value === id ? null : value))}
                onClick={pick(id)}
              >
                <rect x={x - size} y={y - size} width={size * 2} height={size * 2} fill="none" stroke={color} strokeWidth={site.hq ? 2.2 : 1.5} vectorEffect="non-scaling-stroke" />
              </g>,
            ];
          });
        })}
        {world.rivals.flatMap((rival) =>
          (Array.isArray(rival.trucks) ? rival.trucks : []).flatMap((truck) => {
            if (truck.status === "idle" || !truck.points?.length || !truck.miles) return [];
            const at = pointAlong(truck.points, Math.min(truck.traveled ?? 0, truck.miles), truck.miles);
            const [x, y] = project(at.lat, at.lon);
            const id = `rival-truck:${truck.id}`;
            const on = hot === id;
            const color = `hsl(${rival.hue} 72% 64%)`;
            const path = on ? line(truck.points) : "";
            return [
              <g
                key={truck.id}
                className="cursor-pointer"
                onPointerEnter={() => setHover(id)}
                onPointerLeave={() => setHover((value) => (value === id ? null : value))}
                onClick={pick(id)}
              >
                {path ? <path d={path} fill="none" stroke={color} strokeWidth={2.2} vectorEffect="non-scaling-stroke" /> : null}
                <circle cx={x} cy={y} r={px(12)} fill="transparent" />
                <circle cx={x} cy={y} r={px(on ? 6 : 3.6)} fill={color} />
              </g>,
            ];
          }),
        )}
        {(company?.warehouses ?? []).map((yard) => {
          const place = lookupZip(yard.zip);
          if (!place) return null;
          const [x, y] = project(place.lat, place.lon);
          const id = `yard:${yard.id}`;
          const on = hot === id;
          return (
            <g
              key={yard.id}
              className="cursor-pointer"
              onPointerEnter={() => setHover(id)}
              onPointerLeave={() => setHover((value) => (value === id ? null : value))}
              onClick={pick(id)}
            >
              <rect x={x - px(on ? 6 : 4)} y={y - px(on ? 6 : 4)} width={px(on ? 12 : 8)} height={px(on ? 12 : 8)} className={on ? "fill-pine" : "fill-pine/80"} />
              <text x={x + px(10)} y={y + px(3)} className={`font-sans ${on ? "fill-pine" : "fill-pine/80"}`} fontSize={px(on ? 13 : 11)}>
                {place.city}
              </text>
            </g>
          );
        })}
        {trucks.map((vehicle, index) => {
          const at = spot(vehicle);
          if (!at) return null;
          const [x, y] = project(at.lat, at.lon);
          const id = `truck:${vehicle.id}`;
          const on = hot === id;
          const path = vehicle.route && vehicle.route.length > 1 && vehicle.status !== "idle" ? line(vehicle.route) : "";
          const dx = (index % 4) * px(5);
          return (
            <g
              key={vehicle.id}
              className="cursor-pointer"
              onPointerEnter={() => setHover(id)}
              onPointerLeave={() => setHover((value) => (value === id ? null : value))}
              onClick={pick(id)}
            >
              {path ? <path d={path} className={on ? "fill-none stroke-rust" : "fill-none stroke-rust/45"} strokeWidth={on ? 3 : 1.6} vectorEffect="non-scaling-stroke" /> : null}
              <circle cx={x + dx} cy={y} r={px(14)} className="fill-transparent" />
              <circle cx={x + dx} cy={y} r={px(on ? 7 : 4.5)} className={vehicle.status === "idle" ? "fill-rust/80" : "fill-rust"} />
            </g>
          );
        })}
        {preview ? <path d={preview} className="pointer-events-none fill-none stroke-ink" strokeWidth={2.4} vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <MapNote hot={hot} />
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/10 px-3 py-2 text-sm text-ink/70">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-rust" /> Your trucks
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 bg-pine" /> Your warehouses
        </span>
        {world.rivals.map((rival) => (
          <span key={rival.id} className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: `hsl(${rival.hue} 72% 64%)` }} />
            {rival.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function DeliveryMap({
  homeZip,
  pins,
  route,
}: {
  homeZip: string;
  pins: { id: string; zip: string; title: string; detail: string; stop?: number }[];
  route?: MapPoint[];
}) {
  const [hot, setHot] = useState<string | null>(null);
  const groups = new Map<string, { id: string; zip: string; title: string; detail: string; stop?: number }[]>();
  for (const pin of pins) {
    const list = groups.get(pin.zip) ?? [];
    list.push(pin);
    groups.set(pin.zip, list);
  }
  const active = hot ? groups.get(hot) : undefined;
  const home = lookupZip(homeZip);
  const homePoint = home ? project(home.lat, home.lon) : null;
  const places = [home, ...pins.map((pin) => lookupZip(pin.zip))].filter((place): place is NonNullable<typeof home> => Boolean(place));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const place of places) {
    const [x, y] = project(place.lat, place.lon);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) {
    minX = -28;
    minY = -18;
    maxX = 1028;
    maxY = 638;
  }
  const pad = 48;
  const width = Math.max(120, maxX - minX + pad * 2);
  const height = Math.max(80, maxY - minY + pad * 2);
  const drawn = route && route.length > 1 ? line(route) : "";

  return (
    <figure className="overflow-hidden rounded-lg border border-ink/10 bg-sheet">
      <svg
        viewBox={`${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`}
        role="img"
        aria-label="Delivery locations for freight on this warehouse floor."
        className="h-72 w-full touch-manipulation"
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={() => setHot(null)}
      >
        <rect x={minX - pad} y={minY - pad} width={width} height={height} className="fill-sheet" />
        <path d={HIGHWAY} className="fill-none stroke-ink/25" strokeWidth={1.15} />
        {drawn ? <path d={drawn} className="fill-none stroke-pine" strokeWidth={2.4} /> : null}
        {homePoint ? <rect x={homePoint[0] - 5} y={homePoint[1] - 5} width={10} height={10} className="fill-pine" /> : null}
        {[...groups.entries()].map(([zip, list]) => {
          const place = lookupZip(zip);
          if (!place) return null;
          const [x, y] = project(place.lat, place.lon);
          const on = hot === zip;
          const stop = list.find((pin) => pin.stop)?.stop;
          return (
            <g
              key={zip}
              className="cursor-pointer"
              onPointerEnter={() => setHot(zip)}
              onPointerLeave={() => setHot((value) => (value === zip ? null : value))}
              onPointerDown={(event) => {
                event.stopPropagation();
                setHot(zip);
              }}
            >
              <circle cx={x} cy={y} r={16} className="fill-transparent" />
              <circle cx={x} cy={y} r={on ? 9 : 6} className={stop ? "fill-ink" : "fill-rust"} />
              {stop ? (
                <text x={x} y={y + 4} textAnchor="middle" className="fill-paper" fontSize={11}>
                  {stop}
                </text>
              ) : list.length > 1 ? (
                <text x={x + 10} y={y + 4} className="fill-ink" fontSize={12}>
                  {list.length}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="border-t border-ink/10 px-3 py-2 text-sm text-ink/70">
        {active
          ? active.map((pin) => `${pin.stop ? `${pin.stop}. ` : ""}${pin.title}. ${pin.detail}`).join("  ·  ")
          : "The map is zoomed to this warehouse and these deliveries. Numbers are the order on the truck. Rust dots are still on the floor."}
      </figcaption>
    </figure>
  );
}

function MapNote({ hot }: { hot: string | null }) {
  const { world, company } = useWorld();
  if (!hot) return <p className="border-t border-ink/10 px-3 py-2 text-sm text-ink/55">Point at a truck, a city, or a warehouse. On a phone, tap it.</p>;
  if (hot.startsWith("truck:") && company) {
    const vehicle = company.vehicles.find((item) => item.id === hot.slice(6));
    if (!vehicle) return null;
    const trip = readTrip(world, company, vehicle);
    const spec = KIND_INFO[vehicle.kind];
    return (
      <p className="border-t border-ink/10 px-3 py-2 text-sm">
        <span className="font-medium">{spec.label}</span>
        {trip ? (
          <>
            {" "}
            · {trip.leg}, toward {trip.heading}. {Math.round(trip.milesLeft).toLocaleString("en-US")} miles left.
            {trip.driverName ? ` ${trip.driverName}.` : ""}
            {trip.pay > 0 ? ` Still owed ${money(trip.balance)}. Fuel still to burn ${money(trip.burn)}.` : vehicle.status === "inbound" ? " You are not paying fuel." : " No one is paying for this move."}
          </>
        ) : (
          <> · parked in {lookupZip(vehicle.zip)?.city ?? vehicle.zip}.</>
        )}
      </p>
    );
  }
  if (hot.startsWith("yard:") && company) {
    const yard = company.warehouses.find((item) => item.id === hot.slice(5));
    const place = yard ? lookupZip(yard.zip) : null;
    if (!yard || !place) return null;
    const parked = company.vehicles.filter((vehicle) => vehicle.zip === yard.zip && vehicle.status === "idle").length;
    return (
      <p className="border-t border-ink/10 px-3 py-2 text-sm">
        <span className="font-medium">Your warehouse · {place.city}</span> · {parked} parked here.
      </p>
    );
  }
  if (hot.startsWith("city:")) {
    return <p className="border-t border-ink/10 px-3 py-2 text-sm font-medium">{hot.slice(5)}</p>;
  }
  if (hot.startsWith("rival-truck:")) {
    const id = hot.slice("rival-truck:".length);
    for (const rival of world.rivals) {
      const truck = Array.isArray(rival.trucks) ? rival.trucks.find((item) => item.id === id) : undefined;
      if (!truck) continue;
      const left = Math.max(0, Math.round((truck.miles ?? 0) - (truck.traveled ?? 0)));
      const leg = truck.legs?.[0];
      const driver = rival.drivers?.find((item) => item.id === truck.driverId);
      const where = `${truck.fromZip ? labelPlace(truck.fromZip) : "here"} to ${truck.toZip ? labelPlace(truck.toZip) : "there"}`;
      const body = leg?.kind === "empty"
        ? `empty, ${where}. ${left.toLocaleString("en-US")} miles left.`
        : `${(leg?.weight ?? 0).toLocaleString("en-US")} lb, ${where}. ${left.toLocaleString("en-US")} miles left${leg?.pay ? `, pays ${money(leg.pay)}` : ""}.`;
      return (
        <p className="border-t border-ink/10 px-3 py-2 text-sm">
          <span className="font-medium">{rival.name}</span>
          {driver ? ` · ${driver.name}` : ""} · {body}
        </p>
      );
    }
  }
  if (hot.startsWith("rival-yard:")) {
    const rest = hot.slice("rival-yard:".length);
    const split = rest.indexOf(":");
    const id = rest.slice(0, split);
    const zip = rest.slice(split + 1);
    const rival = world.rivals.find((item) => item.id === id);
    if (!rival) return null;
    const kind = rival.hqZip === zip ? "headquarters" : "warehouse";
    return (
      <p className="border-t border-ink/10 px-3 py-2 text-sm">
        <span className="font-medium">{rival.name}</span> {kind} · {labelPlace(zip)}.
      </p>
    );
  }
  return null;
}
