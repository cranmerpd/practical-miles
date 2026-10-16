import { hubs, lookupZip, MAP, pointAlong, project, roadSegments, type MapPoint } from "@/game/geo";
import { KIND_INFO, parkedMarks, type Vehicle } from "@/game/sim";
import { useWorld } from "@/components/desk/bits";

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

  return (
    <figure className="overflow-hidden rounded-lg border border-ink/10 bg-sheet">
      <svg
        viewBox="-28 -18 1056 656"
        role="img"
        aria-label="Highway map of the lower 48. Your trucks, other carriers, and parked planes and ships."
        className="h-auto w-full"
        style={{ aspectRatio: `${MAP.width} / ${MAP.height}` }}
      >
        <rect x={-28} y={-18} width={1056} height={656} className="fill-sheet" />
        <path d={HIGHWAY} className="fill-none stroke-ink/25" strokeWidth={1.3} />
        {CITIES.map((city) => (
          <g key={city.name}>
            <circle cx={city.x} cy={city.y} r={1.6} className="fill-ink/40" />
            <text x={city.x} y={city.y - 6} textAnchor="middle" className="fill-ink/55 font-sans" fontSize={11}>
              {city.name}
            </text>
          </g>
        ))}
        {PARKED.map((mark, index) => (
          <g key={`${mark.kind}-${mark.name}-${index}`} transform={`translate(${mark.x + (mark.kind === "ship" ? 8 : -8)} ${mark.y + 8})`}>
            <title>
              {mark.name} {mark.kind === "plane" ? "plane" : "ship"}, parked
            </title>
            {mark.kind === "plane" ? (
              <polygon points="0,-5 4.5,4 -4.5,4" className="fill-ink/70" />
            ) : (
              <rect x={-6} y={-3} width={12} height={6} rx={2} className="fill-pine/80" />
            )}
          </g>
        ))}
        {world.ghosts.map((ghost) => {
          const at = pointAlong(ghost.points, Math.min(ghost.traveled, ghost.miles), ghost.miles);
          const [x, y] = project(at.lat, at.lon);
          return (
            <circle key={ghost.id} cx={x} cy={y} r={3.2} className="fill-ink/35">
              <title>{ghost.name}</title>
            </circle>
          );
        })}
        {(company?.warehouses ?? []).map((yard) => {
          const place = lookupZip(yard.zip);
          if (!place) return null;
          const [x, y] = project(place.lat, place.lon);
          return (
            <g key={yard.id}>
              <rect x={x - 4} y={y - 4} width={8} height={8} className="fill-pine" />
              <text x={x + 8} y={y + 3} className="fill-pine font-sans" fontSize={11}>
                {place.city}
              </text>
            </g>
          );
        })}
        {(company?.vehicles ?? [])
          .filter((vehicle) => vehicle.kind !== "trailer53" || !(company?.vehicles.some((other) => other.coupledTrailerId === vehicle.id)))
          .map((vehicle, index) => {
            const at = spot(vehicle);
            if (!at) return null;
            const [x, y] = project(at.lat, at.lon);
            const path = vehicle.route && vehicle.route.length > 1 && vehicle.status !== "idle" ? line(vehicle.route) : "";
            const dx = (index % 4) * 5;
            return (
              <g key={vehicle.id}>
                {path ? <path d={path} className="fill-none stroke-rust/50" strokeWidth={1.8} /> : null}
                <circle cx={x + dx} cy={y} r={5} className={vehicle.status === "idle" ? "fill-rust/80" : "fill-rust"}>
                  <title>
                    {KIND_INFO[vehicle.kind].label}
                    {vehicle.status === "idle" ? ", parked" : ", moving"}
                  </title>
                </circle>
              </g>
            );
          })}
        {preview ? <path d={preview} className="fill-none stroke-rust" strokeWidth={2.6} /> : null}
      </svg>
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
