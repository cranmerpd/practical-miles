import fs from "node:fs";

const raw = JSON.parse(fs.readFileSync("/tmp/uszips.json", "utf8"));

function hav(aLat, aLon, bLat, bLon) {
  const R = 3958.8;
  const p = Math.PI / 180;
  const dLat = (bLat - aLat) * p;
  const dLon = (bLon - aLon) * p;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

const places = [];
for (const row of raw) {
  const lat = Number(row.latitude);
  const lon = Number(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  if (lat < 24.4 || lat > 49.4 || lon < -125 || lon > -66.8) continue;
  const zip = String(row.zip_code).padStart(5, "0");
  const city = String(row.city || "").trim();
  const state = String(row.state || "").trim();
  if (!city || !state) continue;
  places.push({ zip, city, state, lat, lon });
}

const cell = 0.72;
const buckets = new Map();
for (const p of places) {
  const key = `${Math.floor(p.lat / cell)}:${Math.floor(p.lon / cell)}`;
  const list = buckets.get(key);
  if (list) list.push(p);
  else buckets.set(key, [p]);
}

const hubs = [];
for (const list of buckets.values()) {
  let lat = 0;
  let lon = 0;
  for (const p of list) {
    lat += p.lat;
    lon += p.lon;
  }
  lat /= list.length;
  lon /= list.length;
  let best = list[0];
  let bestD = Infinity;
  for (const p of list) {
    const d = (p.lat - lat) ** 2 + (p.lon - lon) ** 2;
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  hubs.push({
    zip: best.zip,
    city: best.city,
    state: best.state,
    lat: best.lat,
    lon: best.lon,
    zips: list.length,
  });
}

const hubOf = new Int32Array(places.length);
for (let i = 0; i < places.length; i++) {
  const p = places[i];
  let best = 0;
  let bestD = Infinity;
  for (let h = 0; h < hubs.length; h++) {
    const d = hav(p.lat, p.lon, hubs[h].lat, hubs[h].lon);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  hubOf[i] = best;
}

const link = new Map();
function addEdge(a, b) {
  if (a === b) return;
  const i = Math.min(a, b);
  const j = Math.max(a, b);
  const key = `${i}:${j}`;
  if (link.has(key)) return;
  const miles = Math.round(hav(hubs[i].lat, hubs[i].lon, hubs[j].lat, hubs[j].lon) * 1.22);
  link.set(key, [i, j, Math.max(1, miles)]);
}

for (let i = 0; i < hubs.length; i++) {
  const near = [];
  for (let j = 0; j < hubs.length; j++) {
    if (i === j) continue;
    const d = hav(hubs[i].lat, hubs[i].lon, hubs[j].lat, hubs[j].lon);
    if (d <= 145) near.push([d, j]);
  }
  near.sort((a, b) => a[0] - b[0]);
  for (const [, j] of near.slice(0, 4)) addEdge(i, j);
}

function components() {
  const adj = Array.from({ length: hubs.length }, () => []);
  for (const [i, j] of link.values()) {
    adj[i].push(j);
    adj[j].push(i);
  }
  const seen = new Int8Array(hubs.length);
  const groups = [];
  for (let s = 0; s < hubs.length; s++) {
    if (seen[s]) continue;
    const g = [];
    const q = [s];
    seen[s] = 1;
    while (q.length) {
      const n = q.pop();
      g.push(n);
      for (const m of adj[n]) {
        if (!seen[m]) {
          seen[m] = 1;
          q.push(m);
        }
      }
    }
    groups.push(g);
  }
  return groups;
}

let guard = 0;
while (guard++ < 40) {
  const groups = components();
  if (groups.length <= 1) break;
  groups.sort((a, b) => b.length - a.length);
  const main = groups[0];
  let linked = false;
  for (let g = 1; g < groups.length; g++) {
    let best = null;
    for (const a of groups[g]) {
      for (const b of main) {
        const d = hav(hubs[a].lat, hubs[a].lon, hubs[b].lat, hubs[b].lon);
        if (!best || d < best[0]) best = [d, a, b];
      }
    }
    if (best && best[0] < 420) {
      addEdge(best[1], best[2]);
      linked = true;
    }
  }
  if (!linked) break;
}

const edges = [...link.values()];
const outPlaces = places.map((p, i) => [p.zip, p.city, p.state, Math.round(p.lat * 1000) / 1000, Math.round(p.lon * 1000) / 1000, hubOf[i]]);
const outHubs = hubs.map((h) => [h.zip, h.city, h.state, Math.round(h.lat * 1000) / 1000, Math.round(h.lon * 1000) / 1000, h.zips]);

fs.mkdirSync("/workspace/src/game", { recursive: true });
fs.writeFileSync(
  "/workspace/src/game/network.json",
  JSON.stringify({ hubs: outHubs, edges, places: outPlaces }),
);
console.log(JSON.stringify({ places: outPlaces.length, hubs: outHubs.length, edges: edges.length, components: components().length }));
