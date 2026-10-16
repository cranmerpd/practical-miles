import { useState } from "react";
import { hubs, lookupZip, MAP, pointAlong, project, roadSegments, type MapPoint } from "@/game/geo";
import { KIND_INFO, money, parkedMarks, type Vehicle } from "@/game/sim";
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

const PARKED = parkedMarks().flatMap((mark) => {
  const place = lookupZip(mark.zip);
  if (!place) return [];
  const [x, y] = project(place.lat, place.lon);
  return [{ ...mark, x, y }];
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

export function MapBoard({ route }: { route: MapPoint[] | null }) {
  const { world, company } = useWorld();
  const preview = route && route.length > 1 ? line(route) : "";
  const [hover, setHover] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const hot = pin ?? hover;
  const trucks = (company?.vehicles ?? []).filter(
    (vehicle) => vehicle.kind !== "trailer53" || !company?.vehicles.some((other) => other.coupledTrailerId === vehicle.id),
  );

  return (
    <figure className="overflow-hidden rounded-lg border border-ink/10 bg-sheet">
      <svg
        viewBox="-28 -18 1056 656"
        role="img"
        aria-label="Highway map of the lower 48. Tap a truck, a city, or a warehouse."
        className="h-auto w-full touch-manipulation"
        style={{ aspectRatio: `${MAP.width} / ${MAP.height}` }}
        onPointerDown={() => setPin(null)}
      >
        <rect x={-28} y={-18} width={1056} height={656} className="fill-sheet" />
        <path d={HIGHWAY} className="fill-none stroke-ink/25" strokeWidth={1.15} />
        {CITIES.map((city) => {
          const on = hot === `city:${city.name}`;
          return (
            <g
              key={city.name}
              className="cursor-pointer"
              onPointerEnter={() => setHover(`city:${city.name}`)}
              onPointerLeave={() => setHover((value) => (value === `city:${city.name}` ? null : value))}
              onPointerDown={(event) => {
                event.stopPropagation();
                setPin((value) => (value === `city:${city.name}` ? null : `city:${city.name}`));
              }}
            >
              <circle cx={city.x} cy={city.y} r={on ? 4 : 1.8} className={on ? "fill-ink" : "fill-ink/40"} />
              <text x={city.x} y={city.y - 6} textAnchor="middle" className={`font-sans ${on ? "fill-ink" : "fill-ink/55"}`} fontSize={on ? 14 : 11}>
                {city.name}
              </text>
            </g>
          );
        })}
        {PARKED.map((mark, index) => {
          const id = `park:${mark.kind}:${mark.name}:${index}`;
          const on = hot === id;
          return (
            <g
              key={id}
              className="cursor-pointer"
              transform={`translate(${mark.x + (mark.kind === "ship" ? 8 : -8)} ${mark.y + 8})`}
              onPointerEnter={() => setHover(id)}
              onPointerLeave={() => setHover((value) => (value === id ? null : value))}
              onPointerDown={(event) => {
                event.stopPropagation();
                setPin((value) => (value === id ? null : id));
              }}
            >
              {mark.kind === "plane" ? (
                <polygon points="0,-5 4.5,4 -4.5,4" className={on ? "fill-ink" : "fill-ink/70"} transform={on ? "scale(1.35)" : undefined} />
              ) : (
                <rect x={-6} y={-3} width={12} height={6} rx={2} className={on ? "fill-pine" : "fill-pine/80"} transform={on ? "scale(1.25)" : undefined} />
              )}
            </g>
          );
        })}
        {world.ghosts.map((ghost) => {
          const at = pointAlong(ghost.points, Math.min(ghost.traveled, ghost.miles), ghost.miles);
          const [x, y] = project(at.lat, at.lon);
          const id = `ghost:${ghost.id}`;
          const on = hot === id;
          return (
            <g
              key={ghost.id}
              className="cursor-pointer"
              onPointerEnter={() => setHover(id)}
              onPointerLeave={() => setHover((value) => (value === id ? null : value))}
              onPointerDown={(event) => {
                event.stopPropagation();
                setPin((value) => (value === id ? null : id));
              }}
            >
              <circle cx={x} cy={y} r={on ? 6 : 3.2} className={on ? "fill-ink/70" : "fill-ink/35"} />
            </g>
          );
        })}
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
              onPointerDown={(event) => {
                event.stopPropagation();
                setPin((value) => (value === id ? null : id));
              }}
            >
              <rect x={x - (on ? 6 : 4)} y={y - (on ? 6 : 4)} width={on ? 12 : 8} height={on ? 12 : 8} className={on ? "fill-pine" : "fill-pine/80"} />
              <text x={x + 10} y={y + 3} className={`font-sans ${on ? "fill-pine" : "fill-pine/80"}`} fontSize={on ? 13 : 11}>
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
          const dx = (index % 4) * 5;
          return (
            <g
              key={vehicle.id}
              className="cursor-pointer"
              onPointerEnter={() => setHover(id)}
              onPointerLeave={() => setHover((value) => (value === id ? null : value))}
              onPointerDown={(event) => {
                event.stopPropagation();
                setPin((value) => (value === id ? null : id));
              }}
            >
              {path ? <path d={path} className={on ? "fill-none stroke-rust" : "fill-none stroke-rust/45"} strokeWidth={on ? 3 : 1.6} /> : null}
              <circle cx={x + dx} cy={y} r={12} className="fill-transparent" />
              <circle cx={x + dx} cy={y} r={on ? 8 : 5} className={vehicle.status === "idle" ? "fill-rust/80" : "fill-rust"} />
            </g>
          );
        })}
        {preview ? <path d={preview} className="pointer-events-none fill-none stroke-ink" strokeWidth={2.4} /> : null}
      </svg>
      <MapNote hot={hot} />
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/10 px-3 py-2 text-sm text-ink/70">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-rust" /> Your truck
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-ink/35" /> Other carrier
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 bg-pine" /> Your warehouse
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="fill-ink/70">
            <polygon points="5,0 10,10 0,10" />
          </svg>
          Parked plane
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-3.5 rounded-sm bg-pine/80" /> Parked ship
        </span>
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
  if (hot.startsWith("ghost:")) {
    const ghost = world.ghosts.find((item) => item.id === hot.slice(6));
    return <p className="border-t border-ink/10 px-3 py-2 text-sm">{ghost ? `${ghost.name} · another carrier` : "Another carrier"}</p>;
  }
  if (hot.startsWith("park:")) {
    const [, kind, name] = hot.split(":");
    return (
      <p className="border-t border-ink/10 px-3 py-2 text-sm">
        {name} {kind === "plane" ? "plane" : "ship"}, parked. Not yours.
      </p>
    );
  }
  return null;
}
