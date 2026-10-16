import network from "./network.json";

export type Hub = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  weight: number;
};

export type Place = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  hub: number;
};

export type MapPoint = { lat: number; lon: number };

type Raw = {
  hubs: [string, string, string, number, number, number][];
  edges: [number, number, number][];
  places: [string, string, string, number, number, number][];
};

const data = network as Raw;

export const hubs: Hub[] = data.hubs.map(([zip, city, state, lat, lon, weight]) => ({
  zip,
  city,
  state,
  lat,
  lon,
  weight,
}));

export const places: Place[] = data.places.map(([zip, city, state, lat, lon, hub]) => ({
  zip,
  city,
  state,
  lat,
  lon,
  hub,
}));

const byZip = new Map<string, Place>();
for (const place of places) byZip.set(place.zip, place);

export const placesByHub: Place[][] = hubs.map(() => []);
for (const place of places) placesByHub[place.hub]?.push(place);

const adj: { to: number; miles: number }[][] = hubs.map(() => []);
for (const [a, b, miles] of data.edges) {
  adj[a].push({ to: b, miles });
  adj[b].push({ to: a, miles });
}

export function lookupZip(zip: string): Place | undefined {
  return byZip.get(zip.trim().padStart(5, "0"));
}

export function hubsOnRoad(fromZip: string, toZip: string): number[] | null {
  const from = lookupZip(fromZip);
  const to = lookupZip(toZip);
  if (!from || !to) return null;
  if (from.hub === to.hub) return [from.hub];
  const highway = shortest(from.hub, to.hub);
  return highway ? highway.path : null;
}

export function hubsWithin(ids: number[], hops: number): Set<number> {
  const seen = new Set(ids);
  let edge = [...ids];
  for (let hop = 0; hop < hops; hop++) {
    const next: number[] = [];
    for (const id of edge) {
      for (const link of adj[id] ?? []) {
        if (seen.has(link.to)) continue;
        seen.add(link.to);
        next.push(link.to);
      }
    }
    edge = next;
  }
  return seen;
}

export function searchPlaces(query: string, limit = 8): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: Place[] = [];
  if (/^\d{2,5}$/.test(q)) {
    const padded = q.padStart(5, "0");
    for (const place of places) {
      if (place.zip.startsWith(q) || place.zip.startsWith(padded)) {
        out.push(place);
        if (out.length >= limit) return out;
      }
    }
    return out;
  }
  for (const place of places) {
    if (place.city.toLowerCase().startsWith(q) || `${place.city}, ${place.state}`.toLowerCase().includes(q)) {
      out.push(place);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function havMiles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 3958.8;
  const p = Math.PI / 180;
  const dLat = (bLat - aLat) * p;
  const dLon = (bLon - aLon) * p;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function localMiles(miles: number): number {
  return Math.max(2, miles * 1.35);
}

export type RoadPlan = {
  miles: number;
  highwayMiles: number;
  localMiles: number;
  points: MapPoint[];
};

export function planRoad(fromZip: string, toZip: string): RoadPlan | null {
  const from = lookupZip(fromZip);
  const to = lookupZip(toZip);
  if (!from || !to) return null;
  if (from.zip === to.zip) {
    return { miles: 8, highwayMiles: 0, localMiles: 8, points: [from, to] };
  }
  const startLocal = localMiles(havMiles(from.lat, from.lon, hubs[from.hub].lat, hubs[from.hub].lon));
  const endLocal = localMiles(havMiles(to.lat, to.lon, hubs[to.hub].lat, hubs[to.hub].lon));
  if (from.hub === to.hub) {
    const miles = Math.round(startLocal + endLocal);
    return {
      miles,
      highwayMiles: 0,
      localMiles: miles,
      points: [from, hubs[from.hub], to],
    };
  }
  const highway = shortest(from.hub, to.hub);
  if (!highway) return null;
  const points: MapPoint[] = [from];
  for (const id of highway.path) points.push(hubs[id]);
  points.push(to);
  const miles = Math.round(startLocal + highway.miles + endLocal);
  return {
    miles,
    highwayMiles: highway.miles,
    localMiles: Math.round(startLocal + endLocal),
    points,
  };
}

function shortest(start: number, goal: number): { miles: number; path: number[] } | null {
  const n = hubs.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap: number[] = [start];
  dist[start] = 0;
  const push = (node: number) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (dist[heap[p]] <= dist[heap[i]]) break;
      const tmp = heap[p];
      heap[p] = heap[i];
      heap[i] = tmp;
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length && last !== undefined) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let s = i;
        if (l < heap.length && dist[heap[l]] < dist[heap[s]]) s = l;
        if (r < heap.length && dist[heap[r]] < dist[heap[s]]) s = r;
        if (s === i) break;
        const tmp = heap[s];
        heap[s] = heap[i];
        heap[i] = tmp;
        i = s;
      }
    }
    return top;
  };
  const settled = new Uint8Array(n);
  while (heap.length) {
    const u = pop();
    if (u === undefined || settled[u]) continue;
    settled[u] = 1;
    if (u === goal) break;
    const base = dist[u];
    for (const edge of adj[u]) {
      const next = base + edge.miles;
      if (next < dist[edge.to]) {
        dist[edge.to] = next;
        prev[edge.to] = u;
        push(edge.to);
      }
    }
  }
  if (!Number.isFinite(dist[goal])) return null;
  const path: number[] = [];
  for (let u = goal; u >= 0; u = prev[u]) path.push(u);
  path.reverse();
  return { miles: dist[goal], path };
}

export const MAP = { minLon: -125, maxLon: -66.8, minLat: 24.4, maxLat: 49.4, width: 1000, height: 620 };

export function project(lat: number, lon: number): [number, number] {
  const x = ((lon - MAP.minLon) / (MAP.maxLon - MAP.minLon)) * MAP.width;
  const y = ((MAP.maxLat - lat) / (MAP.maxLat - MAP.minLat)) * MAP.height;
  return [x, y];
}

export function pointAlong(points: MapPoint[], miles: number, total: number): MapPoint {
  if (points.length === 0) return { lat: 39, lon: -98 };
  if (points.length === 1 || total <= 0 || miles <= 0) return points[0];
  const target = Math.min(1, miles / total);
  const segMiles: number[] = [];
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const d = havMiles(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    segMiles.push(d);
    sum += d;
  }
  let remain = target * sum;
  for (let i = 0; i < segMiles.length; i++) {
    if (remain <= segMiles[i] || i === segMiles.length - 1) {
      const t = segMiles[i] <= 0 ? 1 : Math.min(1, remain / segMiles[i]);
      return {
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * t,
        lon: points[i].lon + (points[i + 1].lon - points[i].lon) * t,
      };
    }
    remain -= segMiles[i];
  }
  return points[points.length - 1];
}

export const roadSegments: [number, number, number, number][] = data.edges.map(([a, b]) => {
  const [x1, y1] = project(hubs[a].lat, hubs[a].lon);
  const [x2, y2] = project(hubs[b].lat, hubs[b].lon);
  return [x1, y1, x2, y2];
});

export function labelPlace(zip: string): string {
  const place = lookupZip(zip);
  if (!place) return zip;
  return `${place.city}, ${place.state} ${place.zip}`;
}

export const labeledHubs = hubs
  .map((hub, index) => ({ ...hub, index }))
  .filter((hub) => hub.weight >= 20);

export function nearestHubByCity(name: string): Hub | undefined {
  const q = name.toLowerCase();
  return hubs.find((hub) => hub.city.toLowerCase() === q);
}
