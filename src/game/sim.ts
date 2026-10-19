import {
  havMiles,
  hubs,
  hubsOnRoad,
  hubsWithin,
  labelPlace,
  lookupZip,
  planRoad,
  places,
  placesByHub,
  type MapPoint,
  type RoadPlan,
} from "./geo";

export const EPOCH = Date.UTC(2026, 2, 2, 12, 0, 0);
export const SIM_PER_REAL_HOUR = 12;

export type Kind = "van" | "box16" | "box26" | "daycab" | "sleeper" | "trailer53";

export type Vehicle = {
  id: string;
  kind: Kind;
  zip: string;
  condition: number;
  mileage: number;
  fuel: number;
  driverId: string | null;
  coupledTrailerId: string | null;
  status: "idle" | "inbound" | "enroute";
  route: MapPoint[] | null;
  routeMiles: number;
  traveled: number;
  shipmentId: string | null;
  legs: Leg[];
  done?: Leg[];
  departAt: number | null;
  driveToday: number;
  breakTaken: boolean;
  restUntil: number | null;
  price: number;
};

export type Leg = {
  kind: "trailer" | "pickup" | "loaded" | "yard" | "reposition" | "inbound";
  toZip: string;
  shipmentId?: string;
  warehouseId?: string;
};

export type Driver = {
  id: string;
  name: string;
  skill: number;
  cdl: boolean;
  wage: number;
  warehouseId: string | null;
  vehicleId: string | null;
  driveToday: number;
  breakTaken: boolean;
  restUntil: number | null;
};

export type Warehouse = {
  id: string;
  zip: string;
  starter: boolean;
  payloadCap: number;
  cubeCap: number;
  price: number;
};

export type StopKind = "commercial" | "residential";

export type MarketJob = {
  id: string;
  mode: "road" | "air" | "sea";
  fromZip: string;
  toZip: string;
  miles: number;
  weight: number;
  cube: number;
  fragile: boolean;
  cargoValue: number;
  pay: number;
  lateFee: boolean;
  dueInHours: number;
  postedAt: number;
  expiresAt: number;
  pickupKind?: StopKind;
  dropKind?: StopKind;
};

export type DeliveryRecord = {
  id: string;
  shipmentId: string;
  at: number | null;
  fromZip: string;
  toZip: string;
  miles: number;
  weight: number;
  cube: number;
  fragile: boolean;
  cargoValue: number;
  pay: number;
  deposit: number;
  payout: number | null;
  lateCut: number;
  damage: number;
  late: boolean;
  lateDays: number;
  dueAt: number;
  driver: string | null;
  truck: Kind | null;
  condition: number | null;
  lateFee: boolean;
  rep: number;
  partial: boolean;
};

export type Shipment = {
  id: string;
  fromZip: string;
  toZip: string;
  weight: number;
  cube: number;
  fragile: boolean;
  cargoValue: number;
  pay: number;
  lateFee: boolean;
  dueAt: number;
  deposit: number;
  status: "booked" | "rolling" | "stored" | "done";
  warehouseId?: string;
  vehicleId?: string;
  lateNoted: boolean;
  pickupKind?: StopKind;
  dropKind?: StopKind;
};

export type Listing = {
  id: string;
  kind: Kind;
  price: number;
  condition: number;
  mileage: number;
  zip: string;
};

export type Applicant = Driver;

export type RivalLeg = {
  kind: "empty" | "loaded";
  toZip: string;
  fromZip?: string;
  fromKind?: StopKind;
  toKind?: StopKind;
  pay?: number;
  weight?: number;
  cube?: number;
};

export type RivalDriver = {
  id: string;
  name: string;
  cdl: boolean;
  wage: number;
  truckId: string | null;
  driveToday: number;
  breakTaken: boolean;
  restUntil: number | null;
};

export type RivalTruck = {
  id: string;
  kind: Kind;
  yardZip: string;
  zip: string;
  status: "idle" | "loaded" | "empty";
  driverId: string | null;
  legs: RivalLeg[];
  points?: MapPoint[];
  miles?: number;
  traveled?: number;
  fromZip?: string;
  toZip?: string;
  waitUntil?: number | null;
  dockHold?: boolean;
};

export type Rival = {
  id: string;
  name: string;
  hue: number;
  cash: number;
  earned: number;
  hqZip: string;
  yards: string[];
  trucks: RivalTruck[];
  drivers: RivalDriver[];
  payrollMark: string;
  negativeSince: number | null;
  closed: boolean;
};

export type LogLine = { id: string; at: number; text: string; tone: "info" | "good" | "bad" };

export type Company = {
  name: string;
  cash: number;
  rep: number;
  homeZip: string;
  negativeSince: number | null;
  closed: boolean;
  warehouses: Warehouse[];
  vehicles: Vehicle[];
  drivers: Driver[];
  applicants: Applicant[];
  shipments: Shipment[];
  deliveries: DeliveryRecord[];
  payrollMark: string;
};

export type World = {
  simHours: number;
  rng: number;
  diesel: number;
  jobs: MarketJob[];
  rivals: Rival[];
  ghosts: Ghost[];
  listings: Listing[];
  company: Company | null;
  log: LogLine[];
  seq: number;
  heldJobId: string | null;
  yardOffers: YardOffer[];
  rules?: string;
};

export type Ghost = { id: string; name: string; points: MapPoint[]; miles: number; traveled: number };
export type YardOffer = { id: string; zip: string; price: number; payloadCap: number; cubeCap: number };

export type Quote = {
  ok: boolean;
  reason?: string;
  deadhead: number;
  loaded: number;
  hours: number;
  fuelCost: number;
  profit: number;
  warnings: string[];
  points: MapPoint[];
  arriveAt: number;
  unloadAt: number;
  dockClosed: boolean;
  stageAt: number | null;
};

const FIRST = ["Ada", "Miles", "Ruth", "Owen", "Pearl", "Ned", "Ida", "Cal", "June", "Hank", "Lois", "Earl", "Faye", "Roy", "Nell", "Gus"];
const LAST = ["Hale", "Peck", "Voss", "Adler", "Crowe", "Nguyen", "Shah", "Brooks", "Kane", "Doyle", "Okoye", "Santos", "Berg", "Iqbal", "Marsh", "Cho"];

export const KIND_INFO: Record<Kind, { label: string; payload: number; cube: number; mpg: number; tank: number; cruise: number; cdl: boolean; lo: number; hi: number }> = {
  van: { label: "Cargo van", payload: 3500, cube: 400, mpg: 16, tank: 25, cruise: 68, cdl: false, lo: 8000, hi: 18000 },
  box16: { label: "16 ft box", payload: 6000, cube: 1000, mpg: 10, tank: 45, cruise: 62, cdl: false, lo: 14000, hi: 28000 },
  box26: { label: "26 ft box", payload: 10000, cube: 1700, mpg: 8, tank: 60, cruise: 60, cdl: false, lo: 28000, hi: 55000 },
  daycab: { label: "Day cab tractor", payload: 0, cube: 0, mpg: 6.8, tank: 150, cruise: 62, cdl: true, lo: 30000, hi: 55000 },
  sleeper: { label: "Sleeper tractor", payload: 0, cube: 0, mpg: 6.4, tank: 200, cruise: 64, cdl: true, lo: 45000, hi: 80000 },
  trailer53: { label: "53 ft dry van", payload: 44000, cube: 3800, mpg: 0, tank: 0, cruise: 0, cdl: false, lo: 4000, hi: 12000 },
};

export function gameDate(hours: number): Date {
  return new Date(EPOCH + hours * 3_600_000);
}

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
}

export function monthKey(hours: number): string {
  const d = gameDate(hours);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

export function formatWhen(hours: number): string {
  const d = gameDate(hours);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = d.getUTCHours();
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const h12 = ((hh + 11) % 12) + 1;
  const ap = hh < 12 ? "am" : "pm";
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${h12}:${mm} ${ap}`;
}

export function closureDate(since: number): Date {
  const d = gameDate(since);
  const out = new Date(d.getTime());
  out.setUTCMonth(out.getUTCMonth() + 3);
  return out;
}

function rngNext(world: World): number {
  let seed = world.rng | 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  world.rng = seed;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function ri(world: World, n: number): number {
  return Math.floor(rngNext(world) * n);
}

function pick<T>(world: World, list: T[]): T {
  return list[ri(world, list.length)];
}

function uid(world: World, prefix: string): string {
  world.seq += 1;
  return `${prefix}${world.seq}`;
}

function log(world: World, text: string, tone: LogLine["tone"] = "info") {
  world.log.unshift({ id: uid(world, "log"), at: world.simHours, text, tone });
  if (world.log.length > 80) world.log.length = 80;
}

export function wageFor(skill: number, cdl: boolean): number {
  const base = 3200 + Math.round(skill * 48);
  return cdl ? Math.round(base * 1.3) : base;
}

export function dutyHours(driveHours: number, driven = 0, broke = false): number {
  return rollDuty(driveHours, driven, broke).elapsed;
}

export function rollDuty(driveHours: number, driven = 0, broke = false): { elapsed: number; driven: number; broke: boolean } {
  let left = Math.max(0, driveHours);
  let elapsed = 0;
  let guard = 0;
  while (left > 0.001 && guard++ < 100) {
    const room = (broke ? 11 : 8) - driven;
    const end = 11 - driven;
    const slice = Math.min(left, Math.max(0, room), Math.max(0, end));
    if (slice <= 0.001) {
      if (!broke && driven >= 8 && driven < 11) {
        elapsed += 0.5;
        broke = true;
        continue;
      }
      elapsed += 10;
      driven = 0;
      broke = false;
      continue;
    }
    elapsed += slice;
    left -= slice;
    driven += slice;
    if (!broke && driven >= 8 - 1e-6 && left > 0.001) {
      elapsed += 0.5;
      broke = true;
    }
    if (driven >= 11 - 1e-6 && left > 0.001) {
      elapsed += 10;
      driven = 0;
      broke = false;
    }
  }
  return { elapsed, driven, broke };
}

function skillSpeed(skill: number): number {
  return 0.88 + (skill / 100) * 0.2;
}

export function chainPlans(zips: string[]): RoadPlan | null {
  let miles = 0;
  let highway = 0;
  let local = 0;
  const points: MapPoint[] = [];
  for (let i = 1; i < zips.length; i++) {
    if (zips[i] === zips[i - 1]) continue;
    const leg = planRoad(zips[i - 1], zips[i]);
    if (!leg) return null;
    miles += leg.miles;
    highway += leg.highwayMiles;
    local += leg.localMiles;
    if (points.length === 0) points.push(...leg.points);
    else points.push(...leg.points.slice(1));
  }
  if (miles === 0) return { miles: 0, highwayMiles: 0, localMiles: 0, points };
  return { miles, highwayMiles: highway, localMiles: local, points };
}

function driveHoursFor(miles: number, cruise: number, skill: number): number {
  const highwayShare = 0.82;
  const mph = cruise * skillSpeed(skill);
  const highwayHours = (miles * highwayShare) / mph;
  const localHours = (miles * (1 - highwayShare)) / 32;
  return highwayHours + localHours;
}

const EAST = new Set(["CT", "DC", "DE", "FL", "GA", "IN", "MA", "MD", "ME", "MI", "NC", "NH", "NJ", "NY", "OH", "PA", "RI", "SC", "VA", "VT", "WV"]);
const CENTRAL = new Set(["AL", "AR", "IA", "IL", "KS", "LA", "MN", "MO", "MS", "ND", "NE", "OK", "SD", "TX", "WI"]);
const MOUNTAIN = new Set(["CO", "ID", "MT", "NM", "UT", "WY"]);
const PACIFIC = new Set(["CA", "NV", "OR", "WA"]);

function nthSunday(year: number, month: number, n: number): number {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + (n - 1) * 7;
}

function inDst(simHours: number): boolean {
  const date = gameDate(simHours);
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 2, nthSunday(year, 2, 2), 7);
  const end = Date.UTC(year, 10, nthSunday(year, 10, 1), 6);
  const time = date.getTime();
  return time >= start && time < end;
}

function standardOffset(state: string, lon: number): number {
  if (state === "AZ") return -7;
  if (PACIFIC.has(state)) return -8;
  if (MOUNTAIN.has(state)) return -7;
  if (state === "TX" && lon < -104) return -7;
  if ((state === "KY" || state === "TN" || state === "FL" || state === "IN") && lon < -85) return -6;
  if (CENTRAL.has(state)) return -6;
  if (EAST.has(state)) return -5;
  return Math.max(-8, Math.min(-5, Math.round(lon / 15)));
}

function zoneOffset(state: string, lon: number, simHours: number): number {
  const standard = standardOffset(state, lon);
  if (state === "AZ") return standard;
  return standard + (inDst(simHours) ? 1 : 0);
}

function localHour(simHours: number, offset: number): number {
  const hour = (12 + simHours + offset) % 24;
  return hour < 0 ? hour + 24 : hour;
}

export function dockWait(simHours: number, zip: string, kind?: StopKind): number {
  const place = lookupZip(zip);
  if (!place) return 0;
  const close = kind === "commercial" ? 17 : 20;
  const hour = localHour(simHours, zoneOffset(place.state, place.lon, simHours));
  if (hour >= 8 && hour < close) return 0;
  if (hour < 8) return 8 - hour;
  return 24 - hour + 8;
}

export function hoursUntilMorning(simHours: number, zip: string): number {
  const place = lookupZip(zip);
  if (!place) return 0;
  const hour = localHour(simHours, zoneOffset(place.state, place.lon, simHours));
  if (hour < 8) return 8 - hour;
  return 24 - hour + 8;
}

export function dueAtFor(simHours: number, miles: number, toZip: string, kind?: StopKind): number {
  const drive = dutyHours(driveHoursFor(Math.max(1, miles), 60, 45));
  const extraDays = miles < 120 ? 1 : miles < 400 ? 2 : miles < 900 ? 3 : 4;
  const close = kind === "commercial" ? 17 : 20;
  const earliest = simHours + drive + dockWait(simHours + drive, toZip, kind);
  const place = lookupZip(toZip);
  const hour = localHour(earliest, place ? zoneOffset(place.state, place.lon, earliest) : -5);
  const untilClose = hour <= close ? close - hour : 24 - hour + close;
  return earliest + untilClose + extraDays * 24;
}

export function tripEta(simHours: number, miles: number, cruise: number, skill: number, driven: number, broke: boolean, zip: string, kind?: StopKind, dock = true) {
  const clock = rollDuty(driveHoursFor(Math.max(0, miles), cruise || 60, skill), driven, broke);
  const arrive = simHours + (miles <= 0.05 ? 0 : clock.elapsed);
  const wait = dock ? dockWait(arrive, zip, kind) : 0;
  return { at: arrive + wait, driven: wait > 2 ? 0 : clock.driven, broke: wait > 2 ? false : clock.broke };
}

export function dueDayLabel(simHours: number, dueAt: number, zip: string): string {
  const place = lookupZip(zip);
  const nowOff = place ? zoneOffset(place.state, place.lon, simHours) : -5;
  const dueOff = place ? zoneOffset(place.state, place.lon, dueAt) : -5;
  const diff = Math.floor((dueAt + 12 + dueOff) / 24) - Math.floor((simHours + 12 + nowOff) / 24);
  if (diff < 0) return diff === -1 ? `1 day late · ${localDay(dueAt, zip).short}` : `${-diff} days late · ${localDay(dueAt, zip).short}`;
  const when = localDay(dueAt, zip).short;
  if (diff === 0) return `Due today, ${when}`;
  if (diff === 1) return `Due tomorrow, ${when}`;
  return `Due ${when}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function localDay(simHours: number, zip: string): { key: string; label: string; short: string; clock: string } {
  const place = lookupZip(zip);
  const off = place ? zoneOffset(place.state, place.lon, simHours) : -5;
  const local = new Date(EPOCH + (simHours + off) * 3_600_000);
  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes().toString().padStart(2, "0");
  const h12 = ((hour + 11) % 12) + 1;
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    key: `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}`,
    label: `${WEEKDAYS[local.getUTCDay()]}, ${MONTHS[local.getUTCMonth()]} ${local.getUTCDate()}`,
    short: `${shortDays[local.getUTCDay()]}, ${shortMonths[local.getUTCMonth()]} ${local.getUTCDate()}`,
    clock: `${h12}:${minute} ${hour < 12 ? "am" : "pm"}`,
  };
}

export function capacityOf(vehicle: Vehicle, vehicles: Vehicle[]): { payload: number; cube: number } {
  const info = KIND_INFO[vehicle.kind];
  if (vehicle.kind === "daycab" || vehicle.kind === "sleeper") {
    const trailer = vehicles.find((item) => item.id === vehicle.coupledTrailerId);
    if (!trailer) return { payload: 0, cube: 0 };
    const spec = KIND_INFO[trailer.kind];
    return { payload: spec.payload, cube: spec.cube };
  }
  if (vehicle.kind === "trailer53") return { payload: 0, cube: 0 };
  return { payload: info.payload, cube: info.cube };
}

export function isTractor(kind: Kind): boolean {
  return kind === "daycab" || kind === "sleeper";
}

export function isCommitted(vehicle: Vehicle): boolean {
  return Boolean(vehicle.shipmentId) || vehicle.legs.some((leg) => Boolean(leg.shipmentId));
}

export function shipmentsOn(company: Company, vehicle: Vehicle): Shipment[] {
  const ids = new Set<string>();
  if (vehicle.shipmentId) ids.add(vehicle.shipmentId);
  for (const leg of vehicle.legs) if (leg.shipmentId) ids.add(leg.shipmentId);
  return company.shipments.filter((item) => ids.has(item.id) && item.status !== "done" && item.status !== "stored");
}

export function warehouseAt(company: Company, zip: string): Warehouse | undefined {
  return company.warehouses.find((yard) => yard.zip === zip);
}

export function storedUse(company: Company, warehouseId: string): { weight: number; cube: number } {
  return company.shipments.reduce(
    (sum, shipment) => {
      if (shipment.status === "stored" && shipment.warehouseId === warehouseId) {
        sum.weight += shipment.weight;
        sum.cube += shipment.cube;
      }
      return sum;
    },
    { weight: 0, cube: 0 },
  );
}

function pushCash(world: World, company: Company, amount: number, why: string, tone: LogLine["tone"] = "info") {
  company.cash = Math.round(company.cash + amount);
  if (company.cash < 0) {
    if (company.negativeSince == null) {
      company.negativeSince = world.simHours;
      const when = closureDate(company.negativeSince);
      log(world, `The bank account is negative. The company closes ${formatWhen((when.getTime() - EPOCH) / 3_600_000)} if it is still red.`, "bad");
    }
  } else {
    company.negativeSince = null;
  }
  if (why) log(world, why, tone);
  if (company.negativeSince != null) {
    const closeAt = closureDate(company.negativeSince).getTime();
    if (gameDate(world.simHours).getTime() >= closeAt) {
      company.closed = true;
      log(world, `${company.name} is closed. Three months in the red.`, "bad");
    }
  }
}

function bumpRep(company: Company, delta: number) {
  company.rep = Math.max(1, Math.min(100, Math.round(company.rep + delta)));
}

export function blankWorld(seed = 20260302): World {
  return {
    simHours: 8,
    rng: seed,
    diesel: 3.9,
    jobs: [],
    rivals: [],
    ghosts: [],
    listings: [],
    company: null,
    log: [],
    seq: 1,
    heldJobId: null,
    yardOffers: [],
  };
}

export function warmWorld(world: World): void {
  easeDeadlines(world);
  const company = world.company;
  if (company) {
    for (const vehicle of company.vehicles) {
      if (vehicle.status === "idle" && !isCommitted(vehicle) && vehicle.kind !== "trailer53" && !warehouseAt(company, vehicle.zip)) {
        headHome(world, company, vehicle);
      }
    }
    backfillDeliveries(world);
    for (const person of [...company.drivers, ...company.applicants]) {
      if (person.driveToday != null) continue;
      const truck = company.vehicles.find((vehicle) => vehicle.id === person.vehicleId);
      person.driveToday = truck?.driveToday ?? 0;
      person.breakTaken = truck?.breakTaken ?? false;
      person.restUntil = person.vehicleId ? (truck?.restUntil ?? null) : null;
    }
  }
  if (world.jobs.length < 20) refillBoard(world, 28);
  else if (world.company) refillBoard(world);
  world.jobs = world.jobs.filter((job) => job.mode === "road");
  trimListings(world);
  if (world.listings.length < 8) refillListings(world);
  ensureRivals(world);
}

function easeDeadlines(world: World) {
  if (world.rules === "day-docks") return;
  for (const job of world.jobs) {
    if (job.mode !== "road") continue;
    const due = dueAtFor(world.simHours, job.miles, job.toZip);
    const current = job.postedAt + job.dueInHours;
    if (current < due) job.dueInHours = due - job.postedAt;
  }
  const company = world.company;
  if (company) {
    for (const shipment of company.shipments) {
      if (shipment.status === "done") continue;
      const miles = planRoad(shipment.fromZip, shipment.toZip)?.miles ?? 80;
      const due = dueAtFor(world.simHours, miles, shipment.toZip);
      if (shipment.dueAt < due) shipment.dueAt = due;
    }
  }
  world.rules = "day-docks";
}

export function createWorld(seed = 20260302): World {
  const world = blankWorld(seed);
  warmWorld(world);
  return world;
}

export function foundCompany(world: World, name: string, zip: string): string | null {
  const place = lookupZip(zip);
  if (!place) return "That ZIP code is not a stop on this map.";
  if (!name.trim()) return "The company needs a name.";
  const yard: Warehouse = {
    id: uid(world, "yard"),
    zip: place.zip,
    starter: true,
    payloadCap: 16000,
    cubeCap: 2800,
    price: 0,
  };
  const company: Company = {
    name: name.trim(),
    cash: 25000,
    rep: 35,
    homeZip: place.zip,
    negativeSince: null,
    closed: false,
    warehouses: [yard],
    vehicles: [],
    drivers: [],
    applicants: [],
    shipments: [],
    deliveries: [],
    payrollMark: monthKey(world.simHours),
  };
  world.company = company;
  refillApplicants(world, yard);
  refillYards(world);
  refillBoard(world);
  log(world, `${company.name} opens in ${labelPlace(place.zip)} with $25,000 and a small warehouse. Short van loads are posting around that building.`, "good");
  return null;
}

function randomRoadPair(world: World): { from: string; to: string; plan: RoadPlan } | null {
  for (let n = 0; n < 12; n++) {
    const a = places[ri(world, places.length)];
    const b = places[ri(world, places.length)];
    if (a.zip === b.zip) continue;
    const plan = planRoad(a.zip, b.zip);
    if (!plan || plan.miles < 200 || plan.miles > 2200) continue;
    return { from: a.zip, to: b.zip, plan };
  }
  return null;
}

function makeJob(world: World, mode: MarketJob["mode"]): MarketJob | null {
  const pair = mode === "road" ? randomRoadPair(world) : randomRoadPair(world);
  if (!pair) return null;
  const miles = mode === "road" ? pair.plan.miles : mode === "air" ? Math.round(pair.plan.miles * 0.82) : Math.round(pair.plan.miles * 1.4);
  const fragile = rngNext(world) < 0.22;
  const heavy = mode === "road" && rngNext(world) < 0.28;
  const weight = mode === "road" ? (heavy ? 8000 + ri(world, 28000) : 800 + ri(world, 9000)) : 2000 + ri(world, 20000);
  const cube = mode === "road" ? Math.round(weight * (0.12 + rngNext(world) * 0.18)) : Math.round(weight * 0.2);
  const lateFee = rngNext(world) < 0.1;
  const rate = (miles < 400 ? 2.5 : 2.05) * (1 + 0.08 * Math.sin(world.simHours / 36));
  let pay = Math.round(miles * rate * (fragile ? 1.08 : 1) * (lateFee ? 1.06 : 1));
  const stops = stopMix(world, false);
  pay = Math.round(pay * stops.pay);
  const cargoValue = Math.round((6000 + rngNext(world) * 50000) * (fragile ? 1.4 : 1) * (rngNext(world) < 0.08 ? 2.2 : 1));
  const dueAt = dueAtFor(world.simHours, miles, pair.to, stops.drop);
  return {
    id: uid(world, "job"),
    mode,
    fromZip: pair.from,
    toZip: pair.to,
    miles,
    weight,
    cube,
    fragile,
    cargoValue,
    pay,
    lateFee,
    dueInHours: Math.max(24, dueAt - world.simHours),
    postedAt: world.simHours,
    expiresAt: world.simHours + (mode === "road" ? 36 + rngNext(world) * 36 : 48),
    pickupKind: stops.pickup,
    dropKind: stops.drop,
  };
}

function pickByHub(world: World, zip: string, minMiles: number, maxMiles: number) {
  const home = lookupZip(zip);
  if (!home) return null;
  const hits: number[] = [];
  for (let i = 0; i < hubs.length; i++) {
    const away = havMiles(home.lat, home.lon, hubs[i].lat, hubs[i].lon);
    if (away >= minMiles && away <= maxMiles) hits.push(i);
  }
  if (!hits.length) return null;
  const list = placesByHub[hits[ri(world, hits.length)]];
  if (!list?.length) return null;
  return list[ri(world, list.length)];
}

function makeLocalJob(world: World): MarketJob | null {
  const yards = world.company?.warehouses ?? [];
  if (!yards.length) return null;
  const yard = yards[ri(world, yards.length)];
  const outbound = rngNext(world) < 0.65;
  const near = pickByHub(world, yard.zip, 0, 45);
  const far = pickByHub(world, yard.zip, 30, 150);
  if (!near || !far || near.zip === far.zip) return null;
  const from = outbound ? near.zip : far.zip;
  const to = outbound ? far.zip : near.zip;
  const plan = planRoad(from, to);
  if (!plan || plan.miles < 18 || plan.miles > 180) return null;
  const weight = 120 + ri(world, 2300);
  const cube = Math.min(360, Math.round(weight * (0.08 + rngNext(world) * 0.08)));
  const fragile = rngNext(world) < 0.12;
  const lateFee = rngNext(world) < 0.06;
  const rate = 3.6 * (1 + 0.08 * Math.sin(world.simHours / 36));
  const stops = stopMix(world, true);
  const pay = Math.max(180, Math.round(plan.miles * rate * (fragile ? 1.08 : 1) * (lateFee ? 1.06 : 1) * stops.pay));
  const dueAt = dueAtFor(world.simHours, plan.miles, to, stops.drop);
  return {
    id: uid(world, "job"),
    mode: "road",
    fromZip: from,
    toZip: to,
    miles: plan.miles,
    weight,
    cube,
    fragile,
    cargoValue: Math.round(1200 + rngNext(world) * 7000),
    pay,
    lateFee,
    dueInHours: Math.max(24, dueAt - world.simHours),
    postedAt: world.simHours,
    expiresAt: world.simHours + 30 + rngNext(world) * 18,
    pickupKind: stops.pickup,
    dropKind: stops.drop,
  };
}

function stopMix(world: World, local: boolean): { pickup: StopKind; drop: StopKind; pay: number } {
  const roll = rngNext(world);
  if (local) {
    if (roll < 0.62) return { pickup: "residential", drop: "residential", pay: 0.84 };
    if (roll < 0.9) return { pickup: "commercial", drop: "residential", pay: 1 };
    if (roll < 0.98) return { pickup: "commercial", drop: "commercial", pay: 1.15 };
    return { pickup: "residential", drop: "commercial", pay: 1.05 };
  }
  if (roll < 0.58) return { pickup: "commercial", drop: "commercial", pay: 1.15 };
  if (roll < 0.78) return { pickup: "commercial", drop: "residential", pay: 1 };
  if (roll < 0.96) return { pickup: "residential", drop: "residential", pay: 0.84 };
  return { pickup: "residential", drop: "commercial", pay: 1.05 };
}

function refillBoard(world: World, roadTarget = 36) {
  if (world.company) {
    let local = world.jobs.filter((job) => job.mode === "road" && job.miles <= 180 && job.weight <= 2800 && job.cube <= 400).length;
    let tries = 0;
    while (local < 10 && tries++ < 80) {
      const job = makeLocalJob(world);
      if (!job) continue;
      world.jobs.push(job);
      local++;
    }
  }
  let road = world.jobs.filter((job) => job.mode === "road" && job.miles > 180).length;
  let guard = 0;
  while (road < roadTarget && guard++ < roadTarget + 20) {
    const job = makeJob(world, "road");
    if (!job) break;
    world.jobs.push(job);
    road++;
  }
}

function listingHub(world: World) {
  const yards = world.company?.warehouses ?? [];
  if (!yards.length) return hubs[ri(world, hubs.length)];
  const yard = yards[ri(world, yards.length)];
  const home = lookupZip(yard.zip);
  if (!home) return hubs[ri(world, hubs.length)];
  const pool = hubs.filter((hub) => {
    const away = havMiles(home.lat, home.lon, hub.lat, hub.lon);
    return away >= 20 && away <= 400;
  });
  return pool.length ? pool[ri(world, pool.length)] : hubs[home.hub];
}

function trimListings(world: World) {
  const company = world.company;
  if (!company?.warehouses.length) return;
  world.listings = world.listings.filter((listing) => {
    const place = lookupZip(listing.zip);
    if (!place) return false;
    return company.warehouses.some((yard) => {
      const there = lookupZip(yard.zip);
      return Boolean(there && havMiles(there.lat, there.lon, place.lat, place.lon) <= 500);
    });
  });
}

function refillListings(world: World) {
  const kinds: Kind[] = ["van", "van", "box16", "box16", "box26", "box26", "trailer53", "daycab", "sleeper"];
  while (world.listings.length < 14) {
    const kind = pick(world, kinds);
    const spec = KIND_INFO[kind];
    const hub = listingHub(world);
    const condition = 35 + ri(world, 55);
    const price = Math.round(spec.lo + (spec.hi - spec.lo) * (0.35 + (condition / 100) * 0.6) * (0.85 + rngNext(world) * 0.3));
    world.listings.push({
      id: uid(world, "lot"),
      kind,
      price,
      condition,
      mileage: kind === "trailer53" ? ri(world, 400000) : 40000 + ri(world, 280000),
      zip: hub.zip,
    });
  }
}

const CARRIER_NAMES = [
  "Northline",
  "Red Pier",
  "Harbor Range",
  "Ash Cargo",
  "Lantern Freight",
  "Sable Cartage",
  "Copper State",
  "Millwright",
  "High Bend",
  "Glass Road",
  "Little Wake",
  "Iron Orchard",
  "Pale Mile",
  "Second Lock",
  "Dry County",
  "Low Bridge",
  "Kettle Route",
  "White Oak Haul",
  "Plain State",
  "Far Yard",
  "Cold Spring Cartage",
  "Red Clay",
  "Even Mile",
];

const SIZE_BANDS = [
  { lo: 22, hi: 36, yards: 3 },
  { lo: 10, hi: 16, yards: 2 },
  { lo: 5, hi: 8, yards: 1 },
  { lo: 2, hi: 4, yards: 0 },
] as const;

function rivalsReady(world: World): boolean {
  return world.rivals.length > 0 && world.rivals.every((rival) => typeof rival.cash === "number" && Array.isArray(rival.drivers));
}

function kindForFleet(index: number, count: number): Kind {
  if (count >= 22) return index % 4 === 0 ? "box26" : "sleeper";
  if (count >= 10) return index % 2 ? "box16" : "box26";
  if (count >= 5) return index % 2 ? "van" : "box16";
  return "van";
}

function rivalSpec(kind: Kind) {
  if (kind === "sleeper" || kind === "daycab") {
    const info = KIND_INFO[kind];
    return { payload: 44000, cube: 3800, mpg: info.mpg, cruise: info.cruise, cdl: true, label: `${info.label} and trailer` };
  }
  const info = KIND_INFO[kind];
  return { payload: info.payload, cube: info.cube, mpg: info.mpg, cruise: info.cruise, cdl: info.cdl, label: info.label };
}

function makeRivalDriver(world: World, truck: RivalTruck): RivalDriver {
  const spec = rivalSpec(truck.kind);
  const skill = 30 + ri(world, 50);
  return {
    id: uid(world, "rdrv"),
    name: `${pick(world, FIRST)} ${pick(world, LAST)}`,
    cdl: spec.cdl,
    wage: wageFor(skill, spec.cdl),
    truckId: truck.id,
    driveToday: 0,
    breakTaken: false,
    restUntil: null,
  };
}

function roadGuess(a: string, b: string): number | null {
  const from = lookupZip(a);
  const to = lookupZip(b);
  if (!from || !to) return null;
  if (from.zip === to.zip) return 8;
  return havMiles(from.lat, from.lon, to.lat, to.lon) * 1.25;
}

function rivalCash(world: World, rival: Rival, amount: number, why?: string) {
  rival.cash = Math.round(rival.cash + amount);
  if (rival.cash < 0) {
    if (rival.negativeSince == null) {
      rival.negativeSince = world.simHours;
      const when = closureDate(rival.negativeSince);
      log(world, `${rival.name} is in the red. They close ${formatWhen((when.getTime() - EPOCH) / 3_600_000)} if they stay there.`, "info");
    }
  } else {
    rival.negativeSince = null;
  }
  if (why) log(world, why, "info");
}

function rollRivals(world: World): Rival[] {
  const names = [...CARRIER_NAMES];
  const taken = new Set<string>();
  for (const yard of world.company?.warehouses ?? []) taken.add(yard.zip);
  const big = [...hubs].filter((hub) => hub.weight >= 15).sort((a, b) => b.weight - a.weight);
  const hues = [210, 4, 168, 28, 45, 250, 16, 90];
  const rivals: Rival[] = [];
  for (let i = 0; i < SIZE_BANDS.length; i++) {
    const band = SIZE_BANDS[i];
    const name = names.splice(ri(world, names.length), 1)[0];
    const apart = big.find((hub) => !taken.has(hub.zip) && [...taken].every((zip) => {
      const place = lookupZip(zip);
      return !place || havMiles(place.lat, place.lon, hub.lat, hub.lon) > 280;
    }));
    const home = apart ?? big.find((hub) => !taken.has(hub.zip));
    if (!home) continue;
    taken.add(home.zip);
    const yards: string[] = [];
    const pool = hubs.filter((hub) => {
      if (hub.zip === home.zip || taken.has(hub.zip)) return false;
      const away = havMiles(home.lat, home.lon, hub.lat, hub.lon);
      return away > 80 && away < 520;
    });
    while (yards.length < band.yards && pool.length) {
      const hub = pool.splice(ri(world, pool.length), 1)[0];
      yards.push(hub.zip);
      taken.add(hub.zip);
    }
    const count = band.lo + ri(world, band.hi - band.lo + 1);
    const homes = [home.zip, ...yards];
    const trucks: RivalTruck[] = [];
    const drivers: RivalDriver[] = [];
    for (let n = 0; n < count; n++) {
      const yardZip = homes[n % homes.length];
      const truck: RivalTruck = {
        id: uid(world, "rtruck"),
        kind: kindForFleet(n, count),
        yardZip,
        zip: yardZip,
        status: "idle",
        driverId: null,
        legs: [],
      };
      const driver = makeRivalDriver(world, truck);
      truck.driverId = driver.id;
      trucks.push(truck);
      drivers.push(driver);
    }
    const wages = drivers.reduce((sum, driver) => sum + driver.wage, 0);
    rivals.push({
      id: uid(world, "rival"),
      name,
      hue: hues[i],
      cash: wages * 2 + 20000,
      earned: 0,
      hqZip: home.zip,
      yards,
      trucks,
      drivers,
      payrollMark: monthKey(world.simHours),
      negativeSince: null,
      closed: false,
    });
  }
  return rivals;
}

function upgradeRival(world: World, rival: Rival): Rival {
  if (typeof rival.cash === "number" && Array.isArray(rival.drivers)) return rival;
  const count = rival.trucks.length;
  const trucks: RivalTruck[] = [];
  const drivers: RivalDriver[] = [];
  for (let n = 0; n < count; n++) {
    const old = rival.trucks[n];
    const kind = old.kind ?? kindForFleet(n, count);
    const yardZip = old.yardZip;
    const onRoad = old.status !== "idle" && Boolean(old.toZip);
    const truck: RivalTruck = {
      id: old.id,
      kind,
      yardZip,
      zip: old.fromZip ?? yardZip,
      status: onRoad ? "loaded" : "idle",
      driverId: null,
      legs: onRoad ? [{ kind: "loaded", toZip: old.toZip ?? yardZip, fromZip: old.fromZip, pay: 0, weight: 0, cube: 0 }, { kind: "empty", toZip: yardZip }] : [],
      points: old.points,
      miles: old.miles,
      traveled: old.traveled,
      fromZip: old.fromZip,
      toZip: old.toZip,
    };
    const driver = makeRivalDriver(world, truck);
    truck.driverId = driver.id;
    trucks.push(truck);
    drivers.push(driver);
  }
  const wages = drivers.reduce((sum, driver) => sum + driver.wage, 0);
  return {
    id: rival.id,
    name: rival.name,
    hue: rival.hue,
    cash: wages * 2 + 20000,
    earned: 0,
    hqZip: rival.hqZip,
    yards: rival.yards ?? [],
    trucks,
    drivers,
    payrollMark: monthKey(world.simHours),
    negativeSince: null,
    closed: false,
  };
}

function nearPlayerYard(world: World, zip: string): boolean {
  const from = lookupZip(zip);
  if (!from || !world.company) return false;
  return world.company.warehouses.some((yard) => {
    const place = lookupZip(yard.zip);
    return Boolean(place && havMiles(place.lat, place.lon, from.lat, from.lon) < 80);
  });
}

function armRivalLeg(world: World, truck: RivalTruck, depth = 0) {
  const leg = truck.legs[0];
  if (!leg) {
    truck.status = "idle";
    truck.points = [];
    truck.miles = 0;
    truck.traveled = 0;
    truck.fromZip = undefined;
    truck.toZip = undefined;
    truck.dockHold = false;
    return;
  }
  const plan = planRoad(truck.zip, leg.toZip);
  if (!plan) {
    truck.legs.shift();
    if (truck.zip !== truck.yardZip && !truck.legs.some((item) => item.toZip === truck.yardZip)) {
      truck.legs.unshift({ kind: "empty", toZip: truck.yardZip });
    }
    if (!truck.legs.length || depth > 3) {
      truck.legs = [];
      truck.status = "idle";
      truck.points = [];
      truck.miles = 0;
      truck.traveled = 0;
      return;
    }
    armRivalLeg(world, truck, depth + 1);
    return;
  }
  truck.points = plan.points;
  truck.miles = plan.miles;
  truck.traveled = 0;
  truck.fromZip = truck.zip;
  truck.toZip = leg.toZip;
  truck.status = leg.kind === "loaded" ? "loaded" : "empty";
  truck.dockHold = false;
  if (leg.kind === "loaded") {
    const wait = dockWait(world.simHours, truck.zip, leg.fromKind);
    if (wait > 0) truck.waitUntil = world.simHours + wait;
  }
}

function rivalPayroll(world: World, rival: Rival) {
  const mark = monthKey(world.simHours);
  if (mark === rival.payrollMark) return;
  rival.payrollMark = mark;
  const total = rival.drivers.reduce((sum, driver) => sum + driver.wage, 0);
  if (total > 0) rivalCash(world, rival, -total, `${rival.name} paid ${money(total)} in wages.`);
}

function rivalClose(world: World, rival: Rival) {
  if (rival.closed || rival.negativeSince == null) return;
  if (gameDate(world.simHours).getTime() < closureDate(rival.negativeSince).getTime()) return;
  rival.closed = true;
  log(world, `${rival.name} stayed in the red for three months and closed.`, "info");
}

function rivalBook(world: World, rival: Rival, truck: RivalTruck) {
  const spec = rivalSpec(truck.kind);
  const driver = rival.drivers.find((item) => item.id === truck.driverId);
  if (!driver || (driver.restUntil != null && world.simHours < driver.restUntil)) return;
  const rep = world.company?.rep ?? 35;
  let best: { job: MarketJob; profit: number } | null = null;
  for (const job of world.jobs) {
    if (job.mode !== "road" || job.id === world.heldJobId) continue;
    if (job.weight > spec.payload || job.cube > spec.cube) continue;
    if (rep >= 40 && job.miles <= 180 && nearPlayerYard(world, job.fromZip)) continue;
    const deadhead = roadGuess(truck.zip, job.fromZip);
    const back = roadGuess(job.toZip, truck.yardZip);
    if (deadhead == null || back == null) continue;
    if (deadhead > job.miles) continue;
    const gallons = (deadhead + job.miles + back) / (spec.mpg || 7);
    const profit = job.pay - gallons * world.diesel;
    if (profit <= 0) continue;
    if (!best || profit > best.profit) best = { job, profit };
  }
  if (!best) return;
  const job = best.job;
  const toPickup = planRoad(truck.zip, job.fromZip);
  const loaded = planRoad(job.fromZip, job.toZip);
  const home = planRoad(job.toZip, truck.yardZip);
  if (!toPickup || !loaded || !home || toPickup.miles > loaded.miles) return;
  world.jobs = world.jobs.filter((item) => item.id !== job.id);
  const legs: RivalLeg[] = [];
  if (truck.zip !== job.fromZip) legs.push({ kind: "empty", toZip: job.fromZip });
  legs.push({ kind: "loaded", toZip: job.toZip, fromZip: job.fromZip, fromKind: job.pickupKind, toKind: job.dropKind, pay: job.pay, weight: job.weight, cube: job.cube });
  if (job.toZip !== truck.yardZip) legs.push({ kind: "empty", toZip: truck.yardZip });
  truck.legs = legs;
  armRivalLeg(world, truck);
  log(world, `${rival.name} booked ${labelPlace(job.fromZip)} to ${labelPlace(job.toZip)} for ${money(job.pay)}.`, "info");
}

function rivalBuy(world: World, rival: Rival) {
  const company = world.company;
  if (!company || rival.closed) return;
  const idle = rival.trucks.filter((truck) => truck.status === "idle" && truck.zip === truck.yardZip);
  const rep = company.rep;
  const uncovered = world.jobs.find((job) => {
    if (job.mode !== "road" || job.id === world.heldJobId) return false;
    if (rep >= 40 && job.miles <= 180 && nearPlayerYard(world, job.fromZip)) return false;
    const nearYard = [rival.hqZip, ...rival.yards].some((zip) => {
      const guess = roadGuess(zip, job.fromZip);
      return guess != null && guess <= job.miles;
    });
    if (!nearYard) return false;
    return idle.every((truck) => {
      const spec = rivalSpec(truck.kind);
      return job.weight > spec.payload || job.cube > spec.cube;
    });
  });
  if (!uncovered && idle.length > 0) return;
  if (!uncovered && idle.length === 0) {
    const any = world.jobs.some((job) => job.mode === "road" && job.id !== world.heldJobId && [rival.hqZip, ...rival.yards].some((zip) => {
      const guess = roadGuess(zip, job.fromZip);
      return guess != null && guess <= job.miles;
    }));
    if (!any) return;
  }
  const target = uncovered;
  const reserve = rival.drivers.reduce((sum, driver) => sum + driver.wage, 0);
  const listing = world.listings.find((item) => {
    if (item.kind !== "van" && item.kind !== "box16" && item.kind !== "box26") return false;
    if (item.price > rival.cash - reserve) return false;
    if (!target) return true;
    const spec = rivalSpec(item.kind);
    return target.weight <= spec.payload && target.cube <= spec.cube;
  });
  if (!listing) return;
  const needsCdl = rivalSpec(listing.kind).cdl;
  const applicant = company.applicants.find((driver) => !needsCdl || driver.cdl);
  if (!applicant) return;
  company.applicants = company.applicants.filter((driver) => driver.id !== applicant.id);
  world.listings = world.listings.filter((item) => item.id !== listing.id);
  const truck: RivalTruck = {
    id: uid(world, "rtruck"),
    kind: listing.kind,
    yardZip: rival.hqZip,
    zip: listing.zip,
    status: "idle",
    driverId: null,
    legs: [],
  };
  const driver: RivalDriver = {
    id: uid(world, "rdrv"),
    name: applicant.name,
    cdl: applicant.cdl,
    wage: applicant.wage,
    truckId: truck.id,
    driveToday: applicant.driveToday ?? 0,
    breakTaken: Boolean(applicant.breakTaken),
    restUntil: applicant.restUntil,
  };
  truck.driverId = driver.id;
  if (listing.zip !== rival.hqZip) {
    truck.legs = [{ kind: "empty", toZip: rival.hqZip }];
    armRivalLeg(world, truck);
  }
  rival.trucks.push(truck);
  rival.drivers.push(driver);
  rivalCash(world, rival, -listing.price, `${rival.name} bought a ${KIND_INFO[listing.kind].label.toLowerCase()} for ${money(listing.price)} and hired ${applicant.name}.`);
}

function rivalDecide(world: World, rival: Rival) {
  if (rival.closed) return;
  rivalPayroll(world, rival);
  rivalClose(world, rival);
  if (rival.closed) return;
  for (const truck of rival.trucks) {
    if (truck.status !== "idle" || truck.zip !== truck.yardZip) continue;
    rivalBook(world, rival, truck);
  }
  rivalBuy(world, rival);
}

function finishRivalLeg(world: World, rival: Rival, truck: RivalTruck) {
  const leg = truck.legs[0];
  if (!leg) return;
  truck.zip = leg.toZip;
  if (leg.kind === "loaded") {
    const wait = dockWait(world.simHours, leg.toZip, leg.toKind);
    if (wait > 0 && !truck.dockHold) {
      truck.dockHold = true;
      truck.waitUntil = world.simHours + wait;
      return;
    }
    if (leg.pay) {
      rival.earned += leg.pay;
      rivalCash(world, rival, leg.pay, `${rival.name} delivered ${labelPlace(leg.fromZip ?? truck.fromZip ?? leg.toZip)} to ${labelPlace(leg.toZip)} and was paid ${money(leg.pay)}.`);
    }
  }
  truck.legs.shift();
  truck.dockHold = false;
  truck.waitUntil = null;
  if (rival.closed) truck.legs = truck.legs.filter((item) => item.kind === "empty");
  armRivalLeg(world, truck);
}

function moveRivalTruck(world: World, rival: Rival, truck: RivalTruck, step: number) {
  if (truck.status === "idle" || !truck.legs.length) return;
  const driver = rival.drivers.find((item) => item.id === truck.driverId);
  if (!driver) return;
  if (truck.waitUntil != null && world.simHours < truck.waitUntil) return;
  if (driver.restUntil != null && world.simHours < driver.restUntil) return;
  if (truck.dockHold) {
    finishRivalLeg(world, rival, truck);
    return;
  }
  if (!driver.breakTaken && driver.driveToday >= 8) {
    driver.breakTaken = true;
    driver.restUntil = world.simHours + 0.5;
    return;
  }
  if (driver.driveToday >= 11) {
    driver.driveToday = 0;
    driver.breakTaken = false;
    driver.restUntil = world.simHours + 10;
    return;
  }
  const spec = rivalSpec(truck.kind);
  const mph = spec.cruise || 55;
  const room = (driver.breakTaken ? 11 : 8) - driver.driveToday;
  const hours = Math.min(step, Math.max(0.01, room));
  const left = Math.max(0, (truck.miles ?? 0) - (truck.traveled ?? 0));
  const stepMiles = Math.min(mph * hours, left);
  const used = mph <= 0 ? 0 : stepMiles / mph;
  truck.traveled = (truck.traveled ?? 0) + stepMiles;
  driver.driveToday += used;
  rivalCash(world, rival, -((stepMiles / (spec.mpg || 7)) * world.diesel));
  if ((truck.traveled ?? 0) >= (truck.miles ?? 0) - 0.05) finishRivalLeg(world, rival, truck);
}

function ensureRivals(world: World): void {
  if (rivalsReady(world)) return;
  world.ghosts = [];
  const prior = world.rivals.filter((rival) => Array.isArray(rival.trucks) && rival.hqZip);
  world.rivals = prior.length ? prior.map((rival) => upgradeRival(world, rival)) : rollRivals(world);
  for (const rival of world.rivals) rivalDecide(world, rival);
}

function refillApplicants(world: World, yard: Warehouse) {
  const company = world.company;
  if (!company) return;
  const have = company.applicants.filter((driver) => driver.warehouseId === yard.id).length;
  for (let i = have; i < 4; i++) {
    const cdl = rngNext(world) < 0.28;
    const skill = 15 + ri(world, 75);
    company.applicants.push({
      id: uid(world, "app"),
      name: `${pick(world, FIRST)} ${pick(world, LAST)}`,
      skill,
      cdl,
      wage: wageFor(skill, cdl),
      warehouseId: yard.id,
      vehicleId: null,
      driveToday: 0,
      breakTaken: false,
      restUntil: null,
    });
  }
}

function refillYards(world: World) {
  const company = world.company;
  if (!company) return;
  const owned = new Set(company.warehouses.map((yard) => yard.zip));
  world.yardOffers = world.yardOffers.filter((offer) => !owned.has(offer.zip));
  let guard = 0;
  while (world.yardOffers.length < 6 && guard++ < 40) {
    const hub = hubs[ri(world, hubs.length)];
    if (owned.has(hub.zip) || world.yardOffers.some((offer) => offer.zip === hub.zip)) continue;
    const price = Math.min(4_000_000, 220000 + Math.max(0, hub.weight - 1) * 9000);
    world.yardOffers.push({
      id: uid(world, "offer"),
      zip: hub.zip,
      price,
      payloadCap: 20000 + hub.weight * 2500,
      cubeCap: 4000 + hub.weight * 500,
    });
  }
}

export function driversForVehicle(company: Company, vehicle: Vehicle, simHours: number): Driver[] {
  if (vehicle.driverId) return company.drivers.filter((driver) => driver.id === vehicle.driverId);
  const yard = warehouseAt(company, vehicle.zip);
  if (!yard || vehicle.status !== "idle") return [];
  return company.drivers.filter((driver) => driver.warehouseId === yard.id && !driver.vehicleId && !onBreak(driver, simHours));
}

export function onBreak(driver: Driver, simHours: number): boolean {
  return driver.restUntil != null && simHours < driver.restUntil;
}

export function trailersFor(company: Company, tractor: Vehicle): Vehicle[] {
  if (tractor.coupledTrailerId) {
    return company.vehicles.filter((vehicle) => vehicle.id === tractor.coupledTrailerId);
  }
  return company.vehicles.filter(
    (vehicle) => vehicle.kind === "trailer53" && vehicle.status === "idle" && !vehicle.coupledTrailerId,
  );
}

export function quoteJob(
  world: World,
  job: MarketJob | Shipment,
  vehicle: Vehicle,
  driver: Driver,
  trailer?: Vehicle,
): Quote {
  const company = world.company;
  const warnings: string[] = [];
  const fail = (reason: string, extra: Partial<Quote> = {}): Quote => ({
    ok: false,
    reason,
    deadhead: 0,
    loaded: 0,
    hours: 0,
    fuelCost: 0,
    profit: 0,
    warnings,
    points: [],
    arriveAt: 0,
    unloadAt: 0,
    dockClosed: false,
    stageAt: null,
    ...extra,
  });
  if (!company) return fail("No company.");
  if (job && "mode" in job && job.mode !== "road") return fail("You cannot book air or sea freight yet.");
  const spec = KIND_INFO[vehicle.kind];
  if (spec.cdl && !driver.cdl) return fail("That tractor needs a CDL driver.");
  const fromZip = "fromZip" in job ? job.fromZip : "";
  const stops = [vehicle.zip];
  if (isTractor(vehicle.kind)) {
    if (!trailer) return fail("Pick a trailer.");
    if (trailer.zip !== vehicle.zip) stops.push(trailer.zip);
  }
  stops.push(fromZip);
  const dead = chainPlans(stops);
  const loadedPlan = planRoad(fromZip, job.toZip);
  if (!dead || !loadedPlan) return fail("No highway path between those ZIP codes.");
  const cap = isTractor(vehicle.kind)
    ? { payload: KIND_INFO[trailer!.kind].payload, cube: KIND_INFO[trailer!.kind].cube }
    : { payload: spec.payload, cube: spec.cube };
  if (job.weight > cap.payload || job.cube > cap.cube) {
    return fail("The freight does not fit this truck.", { deadhead: dead.miles, loaded: loadedPlan.miles });
  }
  const miles = dead.miles + loadedPlan.miles;
  const clock = rollDuty(driveHoursFor(miles, spec.cruise || 60, driver.skill), driver.driveToday ?? 0, Boolean(driver.breakTaken));
  const arriveAt = world.simHours + clock.elapsed;
  const wait = dockWait(arriveAt, job.toZip, "dropKind" in job ? job.dropKind : undefined);
  const unloadAt = arriveAt + wait;
  const hours = unloadAt - world.simHours;
  const mpg = spec.mpg || 7;
  const gallons = miles / mpg;
  const fuelCost = gallons * world.diesel;
  const pay = job.pay;
  const profit = pay - fuelCost;
  const deposit = Math.round(pay * 0.1);
  if (profit < 0) warnings.push(`This trip looks about ${money(profit)} after fuel. You can still take it.`);
  if (company.cash + deposit < fuelCost) warnings.push("Fuel on the road can push the bank account negative.");
  if (job.cargoValue > company.cash + pay) warnings.push("If this freight is damaged, the claim can be larger than your cash plus the payout.");
  const points = dead.points.concat(loadedPlan.points.slice(1));
  const home = warehouseAt(company, vehicle.zip);
  let stageAt: number | null = null;
  if (home) {
    const back = planRoad(fromZip, home.zip);
    if (back) {
      const stageMiles = dead.miles + back.miles;
      const stage = rollDuty(driveHoursFor(stageMiles, spec.cruise || 60, driver.skill), driver.driveToday ?? 0, Boolean(driver.breakTaken));
      stageAt = world.simHours + stage.elapsed;
    }
  }
  return { ok: true, deadhead: dead.miles, loaded: loadedPlan.miles, hours, fuelCost, profit, warnings, points, arriveAt, unloadAt, dockClosed: wait > 0.05, stageAt };
}

const STAGE_DETOUR = 75;

export type PickupChoice = {
  jobId: string;
  fromZip: string;
  toZip: string;
  weight: number;
  cube: number;
  pay: number;
  dueAt: number;
  extraMiles: number;
};

export function pickupChoices(world: World, vehicle: Vehicle, job: MarketJob, trailer?: Vehicle): PickupChoice[] {
  const company = world.company;
  if (!company || job.mode !== "road") return [];
  const home = warehouseAt(company, vehicle.zip);
  if (!home || job.miles > 400) return [];
  const onRoute = hubsOnRoad(home.zip, job.fromZip);
  if (!onRoute) return [];
  const near = hubsWithin(onRoute, 1);
  const spine = chainPlans([home.zip, job.fromZip, home.zip]);
  if (!spine) return [];
  const spec = KIND_INFO[vehicle.kind];
  const cap = isTractor(vehicle.kind)
    ? { payload: KIND_INFO[trailer?.kind ?? "trailer53"].payload, cube: KIND_INFO[trailer?.kind ?? "trailer53"].cube }
    : { payload: spec.payload, cube: spec.cube };
  const out: PickupChoice[] = [];
  for (const other of world.jobs) {
    if (other.id === job.id || other.mode !== "road") continue;
    if (other.weight > cap.payload - job.weight || other.cube > cap.cube - job.cube) continue;
    const place = lookupZip(other.fromZip);
    if (!place || !near.has(place.hub)) continue;
    const before = chainPlans([home.zip, other.fromZip, job.fromZip, home.zip]);
    const after = chainPlans([home.zip, job.fromZip, other.fromZip, home.zip]);
    const best = Math.min(before?.miles ?? Infinity, after?.miles ?? Infinity);
    if (!Number.isFinite(best)) continue;
    const extra = best - spine.miles;
    if (extra > STAGE_DETOUR) continue;
    out.push({
      jobId: other.id,
      fromZip: other.fromZip,
      toZip: other.toZip,
      weight: other.weight,
      cube: other.cube,
      pay: other.pay,
      dueAt: other.postedAt + other.dueInHours,
      extraMiles: Math.max(0, Math.round(extra)),
    });
  }
  out.sort((a, b) => a.extraMiles - b.extraMiles || b.pay - a.pay);
  return out.slice(0, 8);
}

export function insertPickup(home: string, order: { id: string; zip: string }[], add: { id: string; zip: string }): string[] {
  let bestAt = order.length;
  let best = Infinity;
  for (let i = 0; i <= order.length; i++) {
    const zips = [home];
    for (let k = 0; k <= order.length; k++) {
      if (k === i) zips.push(add.zip);
      if (k < order.length) zips.push(order[k].zip);
    }
    zips.push(home);
    const plan = chainPlans(zips);
    if (plan && plan.miles < best) {
      best = plan.miles;
      bestAt = i;
    }
  }
  const ids = order.map((item) => item.id);
  ids.splice(bestAt, 0, add.id);
  return ids;
}

export type StageStop = { jobId: string; zip: string; miles: number; arriveAt: number };

export type StagePreview = {
  ok: boolean;
  reason: string;
  stops: StageStop[];
  miles: number;
  homeAt: number;
  fuelCost: number;
  weight: number;
  cube: number;
  payload: number;
  cubeCap: number;
  yardRoomWeight: number;
  yardRoomCube: number;
  points: MapPoint[];
};

export function previewStage(world: World, vehicle: Vehicle, driver: Driver, jobIds: string[], trailer?: Vehicle): StagePreview {
  const blank = (reason: string): StagePreview => ({
    ok: false,
    reason,
    stops: [],
    miles: 0,
    homeAt: world.simHours,
    fuelCost: 0,
    weight: 0,
    cube: 0,
    payload: 0,
    cubeCap: 0,
    yardRoomWeight: 0,
    yardRoomCube: 0,
    points: [],
  });
  const company = world.company;
  if (!company) return blank("No company.");
  const home = warehouseAt(company, vehicle.zip);
  if (!home) return blank("Bring a load home from a truck parked at your warehouse.");
  const spec = KIND_INFO[vehicle.kind];
  if (isTractor(vehicle.kind) && !trailer) return blank("Pick a trailer.");
  const cap = isTractor(vehicle.kind)
    ? { payload: KIND_INFO.trailer53.payload, cube: KIND_INFO.trailer53.cube }
    : { payload: spec.payload, cube: spec.cube };
  const jobs: MarketJob[] = [];
  for (const id of jobIds) {
    const found = world.jobs.find((item) => item.id === id && item.mode === "road");
    if (!found) return blank("One of those loads is gone.");
    jobs.push(found);
  }
  const weight = jobs.reduce((sum, item) => sum + item.weight, 0);
  const cube = jobs.reduce((sum, item) => sum + item.cube, 0);
  const used = storedUse(company, home.id);
  const yardRoomWeight = Math.max(0, home.payloadCap - used.weight);
  const yardRoomCube = Math.max(0, home.cubeCap - used.cube);
  if (weight > cap.payload || cube > cap.cube) return { ...blank("The freight does not fit this truck."), weight, cube, payload: cap.payload, cubeCap: cap.cube, yardRoomWeight, yardRoomCube };
  if (weight > yardRoomWeight || cube > yardRoomCube) return { ...blank("The warehouse does not have room for all of these."), weight, cube, payload: cap.payload, cubeCap: cap.cube, yardRoomWeight, yardRoomCube };
  let cursor = vehicle.zip;
  let when = world.simHours;
  let driven = driver.driveToday ?? 0;
  let broke = Boolean(driver.breakTaken);
  let miles = 0;
  const points: MapPoint[] = [];
  const addLeg = (toZip: string) => {
    const plan = planRoad(cursor, toZip);
    if (!plan) return false;
    const leg = rollDuty(driveHoursFor(plan.miles, spec.cruise || 60, driver.skill), driven, broke);
    driven = leg.driven;
    broke = leg.broke;
    when += leg.elapsed;
    miles += plan.miles;
    if (points.length === 0) points.push(...plan.points);
    else points.push(...plan.points.slice(1));
    cursor = toZip;
    return true;
  };
  if (trailer && trailer.zip !== vehicle.zip && !addLeg(trailer.zip)) return blank("No path to the trailer.");
  const stops: StageStop[] = [];
  for (const item of jobs) {
    const before = miles;
    if (!addLeg(item.fromZip)) return blank("No path for one of the pickups.");
    stops.push({ jobId: item.id, zip: item.fromZip, miles: miles - before, arriveAt: when });
  }
  if (!addLeg(home.zip)) return blank("No path back to the warehouse.");
  const fuelCost = (miles / (spec.mpg || 7)) * world.diesel;
  return {
    ok: true,
    reason: "",
    stops,
    miles,
    homeAt: when,
    fuelCost,
    weight,
    cube,
    payload: cap.payload,
    cubeCap: cap.cube,
    yardRoomWeight,
    yardRoomCube,
    points,
  };
}

export type LoopStop = {
  shipmentId: string;
  zip: string;
  miles: number;
  rollup: number;
  arriveAt: number;
  dockClosed: boolean;
  late: boolean;
  balance: number;
};

export type LoopPreview = {
  ok: boolean;
  reason: string;
  stops: LoopStop[];
  miles: number;
  hours: number;
  fuelCost: number;
  balance: number;
  afterFuel: number;
  weight: number;
  cube: number;
  payload: number;
  cubeCap: number;
  backAt: number;
  points: MapPoint[];
};

export function previewLoop(
  world: World,
  vehicle: Vehicle,
  driver: Driver,
  shipmentIds: string[],
  departAt: number,
  trailer?: Vehicle,
): LoopPreview {
  const blank = (): LoopPreview => ({
    ok: false,
    reason: "",
    stops: [],
    miles: 0,
    hours: 0,
    fuelCost: 0,
    balance: 0,
    afterFuel: 0,
    weight: 0,
    cube: 0,
    payload: 0,
    cubeCap: 0,
    backAt: departAt,
    points: [],
  });
  const company = world.company;
  if (!company) return { ...blank(), reason: "No company." };
  const yard = warehouseAt(company, vehicle.zip);
  if (!yard) return { ...blank(), reason: "The truck is not at your warehouse." };
  const spec = KIND_INFO[vehicle.kind];
  if (spec.cdl && !driver.cdl) return { ...blank(), reason: "That tractor needs a CDL driver." };
  if (isTractor(vehicle.kind)) {
    if (!trailer) return { ...blank(), reason: "Pick a trailer." };
    if (trailer.zip !== yard.zip || trailer.kind !== "trailer53") return { ...blank(), reason: "The trailer has to be parked at this warehouse." };
  }
  const cap = isTractor(vehicle.kind)
    ? { payload: KIND_INFO.trailer53.payload, cube: KIND_INFO.trailer53.cube }
    : { payload: spec.payload, cube: spec.cube };
  if (!shipmentIds.length) return { ...blank(), reason: "Put at least one load on the truck.", payload: cap.payload, cubeCap: cap.cube };
  const list: Shipment[] = [];
  for (const id of shipmentIds) {
    const shipment = company.shipments.find((item) => item.id === id);
    if (!shipment || shipment.status !== "stored" || shipment.warehouseId !== yard.id) {
      return { ...blank(), reason: "One of those loads is not on this floor.", payload: cap.payload, cubeCap: cap.cube };
    }
    list.push(shipment);
  }
  const weight = list.reduce((sum, item) => sum + item.weight, 0);
  const cube = list.reduce((sum, item) => sum + item.cube, 0);
  if (weight > cap.payload || cube > cap.cube) {
    return { ...blank(), reason: "That is more than this truck can carry.", weight, cube, payload: cap.payload, cubeCap: cap.cube };
  }
  let cursor = yard.zip;
  let when = departAt;
  let miles = 0;
  let driven = driver.driveToday ?? 0;
  let broke = Boolean(driver.breakTaken);
  if (departAt - world.simHours > 2) {
    driven = 0;
    broke = false;
  }
  const stops: LoopStop[] = [];
  const points: MapPoint[] = [];
  for (const shipment of list) {
    const plan = planRoad(cursor, shipment.toZip);
    if (!plan) return { ...blank(), reason: "No highway path for one of the stops.", weight, cube, payload: cap.payload, cubeCap: cap.cube };
    const leg = rollDuty(driveHoursFor(plan.miles, spec.cruise || 60, driver.skill), driven, broke);
    driven = leg.driven;
    broke = leg.broke;
    const rollup = when + leg.elapsed;
    const wait = dockWait(rollup, shipment.toZip, shipment.dropKind);
    const arriveAt = rollup + wait;
    if (wait > 2) {
      driven = 0;
      broke = false;
    }
    stops.push({
      shipmentId: shipment.id,
      zip: shipment.toZip,
      miles: plan.miles,
      rollup,
      arriveAt,
      dockClosed: wait > 0.05,
      late: arriveAt > shipment.dueAt + 0.05,
      balance: Math.max(0, shipment.pay - shipment.deposit),
    });
    miles += plan.miles;
    if (points.length === 0) points.push(...plan.points);
    else points.push(...plan.points.slice(1));
    cursor = shipment.toZip;
    when = arriveAt;
  }
  const back = planRoad(cursor, yard.zip);
  if (!back) return { ...blank(), reason: "No path back to the warehouse.", weight, cube, payload: cap.payload, cubeCap: cap.cube };
  miles += back.miles;
  if (points.length === 0) points.push(...back.points);
  else points.push(...back.points.slice(1));
  const homeLeg = rollDuty(driveHoursFor(back.miles, spec.cruise || 60, driver.skill), driven, broke);
  const backAt = when + homeLeg.elapsed;
  const fuelCost = (miles / (spec.mpg || 7)) * world.diesel;
  const balance = stops.reduce((sum, stop) => sum + stop.balance, 0);
  return {
    ok: true,
    reason: "",
    stops,
    miles,
    hours: backAt - departAt,
    fuelCost,
    balance,
    afterFuel: balance - fuelCost,
    weight,
    cube,
    payload: cap.payload,
    cubeCap: cap.cube,
    backAt,
    points,
  };
}

export function dispatchLoop(
  world: World,
  warehouseId: string,
  vehicleId: string,
  driverId: string,
  shipmentIds: string[],
  trailerId?: string,
  atDawn = false,
): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const yard = company.warehouses.find((item) => item.id === warehouseId);
  const vehicle = company.vehicles.find((item) => item.id === vehicleId);
  const driver = company.drivers.find((item) => item.id === driverId);
  const trailer = trailerId ? company.vehicles.find((item) => item.id === trailerId) : undefined;
  if (!yard || !vehicle || !driver) return "Pick a warehouse, a truck, and a driver.";
  if (vehicle.kind === "trailer53") return "A trailer does not drive itself.";
  if (vehicle.status !== "idle" || vehicle.zip !== yard.zip || isCommitted(vehicle)) return "That truck is not free at this warehouse.";
  if (driver.vehicleId && driver.vehicleId !== vehicle.id) return "That driver is already on a truck.";
  if (!driver.vehicleId && driver.warehouseId !== yard.id) return "That driver is not at this warehouse.";
  if (onBreak(driver, world.simHours)) return `${driver.name} is on a 10-hour break.`;
  const departAt = atDawn ? world.simHours + hoursUntilMorning(world.simHours, yard.zip) : world.simHours + 0.05;
  const preview = previewLoop(world, vehicle, driver, shipmentIds, departAt, trailer);
  if (!preview.ok) return preview.reason || "That loop does not work.";
  driver.vehicleId = vehicle.id;
  driver.warehouseId = null;
  vehicle.driverId = driver.id;
  if (trailer) {
    vehicle.coupledTrailerId = trailer.id;
    trailer.coupledTrailerId = vehicle.id;
  }
  const legs: Leg[] = [];
  for (const id of shipmentIds) {
    const shipment = company.shipments.find((item) => item.id === id);
    if (!shipment) return "One of those loads is gone.";
    shipment.status = "booked";
    shipment.vehicleId = vehicle.id;
    shipment.warehouseId = undefined;
    legs.push({ kind: "loaded", toZip: shipment.toZip, shipmentId: id });
  }
  legs.push({ kind: "reposition", toZip: yard.zip });
  vehicle.shipmentId = shipmentIds[0] ?? null;
  vehicle.done = [];
  vehicle.legs = legs;
  vehicle.departAt = departAt;
  vehicle.status = "idle";
  armLeg(vehicle);
  const count = shipmentIds.length === 1 ? "1 delivery" : `${shipmentIds.length} deliveries`;
  log(world, `${KIND_INFO[vehicle.kind].label} loaded with ${count} out of ${labelPlace(yard.zip)}. It comes back here when the loop is done.`, "good");
  return null;
}

export function acceptJob(
  world: World,
  jobId: string,
  vehicleId: string,
  driverId: string,
  trailerId?: string,
  force = false,
  stage = false,
  pickupIds?: string[],
): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const job = world.jobs.find((item) => item.id === jobId);
  const vehicle = company.vehicles.find((item) => item.id === vehicleId);
  const driver = company.drivers.find((item) => item.id === driverId);
  const trailer = trailerId ? company.vehicles.find((item) => item.id === trailerId) : undefined;
  if (!job || !vehicle || !driver) return "Pick a load, a truck, and a driver.";
  if (onBreak(driver, world.simHours)) return `${driver.name} is on a 10-hour break.`;
  if (vehicle.status !== "idle") return "That truck is already out.";
  const quote = quoteJob(world, job, vehicle, driver, trailer);
  if (!quote.ok) return quote.reason || "That load does not work.";
  const home = stage ? warehouseAt(company, vehicle.zip) : undefined;
  if (stage && !home) return "Bring a load home from a truck parked at your warehouse.";
  const pickupOrder = stage ? (pickupIds?.includes(job.id) ? pickupIds : [job.id]) : [job.id];
  if (stage && pickupIds && !pickupIds.includes(job.id)) return "The load you opened has to stay on the pickup.";
  if (stage) {
    const preview = previewStage(world, vehicle, driver, pickupOrder, trailer);
    if (!preview.ok) return preview.reason || "That pickup run does not work.";
    const allowed = new Set(pickupChoices(world, vehicle, job, trailer).map((item) => item.jobId));
    if (pickupOrder.some((id) => id !== job.id && !allowed.has(id))) return "One of those pickups is no longer on the way.";
  }
  if (quote.warnings.length && !force && !stage) return "CONFIRM";
  const chosen = pickupOrder.map((id) => (id === job.id ? job : world.jobs.find((item) => item.id === id))).filter((item): item is MarketJob => item != null);
  if (chosen.length !== pickupOrder.length) return "One of those loads is gone.";
  const made: Shipment[] = [];
  for (const item of chosen) {
    const deposit = Math.round(item.pay * 0.1);
    const shipment: Shipment = {
      id: uid(world, "ship"),
      fromZip: item.fromZip,
      toZip: item.toZip,
      weight: item.weight,
      cube: item.cube,
      fragile: item.fragile,
      cargoValue: item.cargoValue,
      pay: item.pay,
      lateFee: item.lateFee,
      dueAt: item.postedAt + item.dueInHours,
      deposit,
      status: "booked",
      vehicleId: vehicle.id,
      lateNoted: false,
      pickupKind: item.pickupKind,
      dropKind: item.dropKind,
    };
    made.push(shipment);
    company.shipments.push(shipment);
    pushCash(companyWorld(world), company, deposit, `${labelPlace(item.fromZip)} to ${labelPlace(item.toZip)} accepted. The customer paid ${money(deposit)}.`, "good");
  }
  const taken = new Set(chosen.map((item) => item.id));
  world.jobs = world.jobs.filter((item) => !taken.has(item.id));
  world.heldJobId = null;
  driver.vehicleId = vehicle.id;
  driver.warehouseId = null;
  vehicle.driverId = driver.id;
  vehicle.shipmentId = made[0]?.id ?? null;
  const legs: Leg[] = [];
  if (trailer && trailer.zip !== vehicle.zip) {
    legs.push({ kind: "trailer", toZip: trailer.zip, shipmentId: made[0]?.id });
    vehicle.coupledTrailerId = null;
  } else if (trailer) {
    vehicle.coupledTrailerId = trailer.id;
    trailer.coupledTrailerId = vehicle.id;
  }
  const hookedAt = legs.length ? legs[legs.length - 1].toZip : vehicle.zip;
  if (home) {
    chosen.forEach((item, index) => {
      if (index === 0 && hookedAt === item.fromZip) return;
      legs.push({ kind: "pickup", toZip: item.fromZip, shipmentId: made[index].id });
    });
    legs.push({ kind: "yard", toZip: home.zip, warehouseId: home.id });
  } else {
    const only = chosen[0];
    if (hookedAt !== only.fromZip) legs.push({ kind: "pickup", toZip: only.fromZip, shipmentId: made[0].id });
    legs.push({ kind: "loaded", toZip: only.toZip, shipmentId: made[0].id });
  }
  vehicle.done = [];
  vehicle.legs = legs;
  vehicle.departAt = world.simHours + 0.05;
  vehicle.status = "idle";
  armLeg(vehicle);
  if (home) {
    log(
      world,
      made.length === 1
        ? `The truck will bring it to ${labelPlace(home.zip)} instead of the customer. The due day still runs.`
        : `The truck will pick up ${made.length} loads and bring them to ${labelPlace(home.zip)}. The due days still run.`,
      "info",
    );
  }
  return null;
}

function companyWorld(world: World): World {
  return world;
}

function armLeg(vehicle: Vehicle) {
  const leg = vehicle.legs[0];
  if (!leg) {
    vehicle.route = null;
    vehicle.routeMiles = 0;
    vehicle.traveled = 0;
    return;
  }
  const plan = planRoad(vehicle.zip, leg.toZip);
  vehicle.route = plan?.points ?? null;
  vehicle.routeMiles = plan?.miles ?? 0;
  vehicle.traveled = 0;
  if (!plan || plan.miles === 0) vehicle.traveled = vehicle.routeMiles;
}

export function cancelShipment(world: World, shipmentId: string): string | null {
  const company = world.company;
  if (!company) return "No company.";
  const shipment = company.shipments.find((item) => item.id === shipmentId);
  const vehicle = company.vehicles.find((item) => item.shipmentId === shipmentId || item.legs.some((leg) => leg.shipmentId === shipmentId));
  if (!shipment || !vehicle) return "That load is not on a truck.";
  if (vehicle.legs.some((leg) => leg.shipmentId && leg.shipmentId !== shipmentId)) return "That truck is carrying more than this load.";
  if (shipment.status === "rolling" || (vehicle.departAt != null && world.simHours >= vehicle.departAt)) {
    return "The truck is already moving.";
  }
  pushCash(world, company, -shipment.deposit, `Deposit of ${money(shipment.deposit)} returned. The load is back on the board.`, "bad");
  bumpRep(company, -8);
  const miles = planRoad(shipment.fromZip, shipment.toZip)?.miles ?? 0;
  world.jobs.unshift({
    id: uid(world, "job"),
    mode: "road",
    fromZip: shipment.fromZip,
    toZip: shipment.toZip,
    miles,
    weight: shipment.weight,
    cube: shipment.cube,
    fragile: shipment.fragile,
    cargoValue: shipment.cargoValue,
    pay: shipment.pay,
    lateFee: shipment.lateFee,
    dueInHours: Math.max(1, shipment.dueAt - world.simHours),
    postedAt: world.simHours,
    expiresAt: world.simHours + 24,
  });
  releaseCrew(company, vehicle, true);
  company.shipments = company.shipments.filter((item) => item.id !== shipmentId);
  return null;
}

function releaseCrew(company: Company, vehicle: Vehicle, toPool: boolean) {
  const yard = warehouseAt(company, vehicle.zip);
  if (vehicle.driverId) {
    const driver = company.drivers.find((item) => item.id === vehicle.driverId);
    if (driver) {
      if (toPool && yard) {
        driver.vehicleId = null;
        driver.warehouseId = yard.id;
        vehicle.driverId = null;
      }
    }
  }
  if (toPool && vehicle.coupledTrailerId) {
    const trailer = company.vehicles.find((item) => item.id === vehicle.coupledTrailerId);
    if (trailer) {
      trailer.coupledTrailerId = null;
      trailer.zip = vehicle.zip;
      trailer.status = "idle";
    }
    vehicle.coupledTrailerId = null;
  }
  vehicle.shipmentId = null;
  vehicle.legs = [];
  vehicle.route = null;
  vehicle.status = "idle";
  vehicle.departAt = null;
  vehicle.traveled = 0;
  vehicle.routeMiles = 0;
}

export function hire(world: World, applicantId: string): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const index = company.applicants.findIndex((driver) => driver.id === applicantId);
  if (index < 0) return "That driver is gone.";
  const driver = company.applicants[index];
  const date = gameDate(world.simHours);
  const dim = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const left = dim - date.getUTCDate() + 1;
  const prorate = Math.round((driver.wage * left) / dim);
  company.applicants.splice(index, 1);
  company.drivers.push(driver);
  pushCash(world, company, -prorate, `${driver.name} hired. Prorated pay of ${money(prorate)} left the bank.`, "info");
  return null;
}

export function sendOnBreak(world: World, driverId: string): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const driver = company.drivers.find((item) => item.id === driverId);
  if (!driver) return "No such driver.";
  if (driver.vehicleId) return "They are still on a truck.";
  if (!driver.warehouseId) return "They are not at a warehouse.";
  if (onBreak(driver, world.simHours)) return "Already on a break.";
  driver.driveToday = 0;
  driver.breakTaken = false;
  driver.restUntil = world.simHours + 10;
  log(world, `${driver.name} is on a 10-hour break at the warehouse. Off the board until it ends.`, "info");
  return null;
}

export function fire(world: World, driverId: string): string | null {
  const company = world.company;
  if (!company) return "No company.";
  const driver = company.drivers.find((item) => item.id === driverId);
  if (!driver) return "No such driver.";
  if (driver.vehicleId) return "That driver is out with a truck. Wait until they park at one of your warehouses.";
  const date = gameDate(world.simHours);
  const dim = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const left = dim - date.getUTCDate() + 1;
  const severance = Math.round((driver.wage * left) / dim);
  company.drivers = company.drivers.filter((item) => item.id !== driverId);
  pushCash(world, company, -severance, `${driver.name} is off the roster. Severance ${money(severance)}.`, "bad");
  return null;
}

export function buyListing(world: World, listingId: string, warehouseId: string): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const listing = world.listings.find((item) => item.id === listingId);
  const yard = company.warehouses.find((item) => item.id === warehouseId);
  if (!listing || !yard) return "Pick a truck and a warehouse.";
  const plan = planRoad(listing.zip, yard.zip);
  if (!plan) return "No path to that warehouse.";
  const fee = Math.round(plan.miles * 2);
  const total = listing.price + fee;
  if (company.cash < total) return `You need ${money(total)} including delivery.`;
  const spec = KIND_INFO[listing.kind];
  const vehicle: Vehicle = {
    id: uid(world, "veh"),
    kind: listing.kind,
    zip: listing.zip,
    condition: listing.condition,
    mileage: listing.mileage,
    fuel: spec.tank,
    driverId: null,
    coupledTrailerId: null,
    status: "inbound",
    route: plan.points,
    routeMiles: plan.miles,
    traveled: 0,
    shipmentId: null,
    legs: [{ kind: "inbound", toZip: yard.zip }],
    departAt: world.simHours,
    driveToday: 0,
    breakTaken: false,
    restUntil: null,
    price: listing.price,
  };
  company.vehicles.push(vehicle);
  world.listings = world.listings.filter((item) => item.id !== listingId);
  pushCash(world, company, -total, `${spec.label} bought. Delivery to ${labelPlace(yard.zip)} is ${money(fee)}.`, "info");
  return null;
}

export function sellVehicle(world: World, vehicleId: string): string | null {
  const company = world.company;
  if (!company) return "No company.";
  const vehicle = company.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) return "No such vehicle.";
  if (vehicle.status !== "idle" || vehicle.driverId) return "It has to be parked, with the driver off it, at a warehouse you own.";
  if (company.vehicles.some((other) => other.id !== vehicleId && other.coupledTrailerId === vehicleId && other.status !== "idle")) {
    return "A truck is still using it.";
  }
  if (!warehouseAt(company, vehicle.zip)) return "Sell it from one of your warehouses.";
  const offer = Math.round(vehicle.price * 0.55 * (vehicle.condition / 100) * (vehicle.kind === "trailer53" ? 1 : Math.max(0.45, 1 - vehicle.mileage / 900000)));
  company.vehicles = company.vehicles.filter((item) => item.id !== vehicleId);
  for (const other of company.vehicles) {
    if (other.coupledTrailerId === vehicleId) other.coupledTrailerId = null;
  }
  pushCash(world, company, offer, `${KIND_INFO[vehicle.kind].label} sold for ${money(offer)}.`, "info");
  return null;
}

export function repairVehicle(world: World, vehicleId: string): string | null {
  const company = world.company;
  if (!company) return "No company.";
  const vehicle = company.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle || vehicle.status !== "idle" || !warehouseAt(company, vehicle.zip)) return "Repairs happen when the truck is idle at your warehouse.";
  if (vehicle.condition >= 99) return "Nothing to fix.";
  const cost = Math.round(((100 - vehicle.condition) / 100) * 0.1 * vehicle.price);
  vehicle.condition = 100;
  pushCash(world, company, -cost, `Repairs cost ${money(cost)}. Mileage stays ${Math.round(vehicle.mileage).toLocaleString("en-US")}.`, "info");
  return null;
}

export function yardPrice(zip: string): { zip: string; price: number; payloadCap: number; cubeCap: number } | null {
  const place = lookupZip(zip);
  if (!place) return null;
  const weight = hubs[place.hub]?.weight ?? 1;
  return {
    zip: place.zip,
    price: Math.min(4_000_000, 160000 + weight * 12000),
    payloadCap: 14000 + weight * 2800,
    cubeCap: 2400 + weight * 450,
  };
}

export function buildYard(world: World, zip: string): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const quote = yardPrice(zip);
  if (!quote) return "That ZIP code is not on this map.";
  if (company.warehouses.some((yard) => yard.zip === quote.zip)) return "You already have a warehouse in that ZIP.";
  if (company.cash < quote.price) return `You need ${money(quote.price)}.`;
  const yard: Warehouse = {
    id: uid(world, "yard"),
    zip: quote.zip,
    starter: false,
    payloadCap: quote.payloadCap,
    cubeCap: quote.cubeCap,
    price: quote.price,
  };
  company.warehouses.push(yard);
  refillApplicants(world, yard);
  pushCash(world, company, -quote.price, `Warehouse built in ${labelPlace(quote.zip)} for ${money(quote.price)}.`, "good");
  return null;
}

export function buyYard(world: World, offerId: string): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const offer = world.yardOffers.find((item) => item.id === offerId);
  if (!offer) return "That warehouse is gone.";
  if (company.cash < offer.price) return `You need ${money(offer.price)}.`;
  const yard: Warehouse = {
    id: uid(world, "yard"),
    zip: offer.zip,
    starter: false,
    payloadCap: offer.payloadCap,
    cubeCap: offer.cubeCap,
    price: offer.price,
  };
  company.warehouses.push(yard);
  world.yardOffers = world.yardOffers.filter((item) => item.id !== offerId);
  refillApplicants(world, yard);
  pushCash(world, company, -offer.price, `Warehouse bought in ${labelPlace(offer.zip)}.`, "good");
  return null;
}

export function sellYard(world: World, warehouseId: string): string | null {
  const company = world.company;
  if (!company) return "No company.";
  const yard = company.warehouses.find((item) => item.id === warehouseId);
  if (!yard) return "No such warehouse.";
  if (yard.starter) return "The original warehouse stays with the company.";
  if (storedUse(company, yard.id).weight > 0) return "Freight is still sitting there.";
  if (company.vehicles.some((vehicle) => vehicle.zip === yard.zip && vehicle.status !== "enroute")) return "Move the parked equipment out first.";
  const offer = Math.round(yard.price * 0.7);
  company.warehouses = company.warehouses.filter((item) => item.id !== warehouseId);
  company.applicants = company.applicants.filter((driver) => driver.warehouseId !== warehouseId);
  pushCash(world, company, offer, `Warehouse sold for ${money(offer)}.`, "info");
  return null;
}

export function reposition(world: World, vehicleId: string, toZip: string, driverId?: string): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const vehicle = company.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle || vehicle.status !== "idle" || isCommitted(vehicle)) return "That truck is not free.";
  if (vehicle.kind === "trailer53") return "A trailer does not drive itself.";
  const place = lookupZip(toZip);
  if (!place) return "Unknown ZIP code.";
  let driver = vehicle.driverId ? company.drivers.find((item) => item.id === vehicle.driverId) : undefined;
  if (!driver && driverId) driver = company.drivers.find((item) => item.id === driverId);
  if (!driver) return "Pick a driver.";
  if (onBreak(driver, world.simHours)) return `${driver.name} is on a 10-hour break.`;
  if (KIND_INFO[vehicle.kind].cdl && !driver.cdl) return "That tractor needs a CDL driver.";
  driver.vehicleId = vehicle.id;
  driver.warehouseId = null;
  vehicle.driverId = driver.id;
  vehicle.legs = [{ kind: "reposition", toZip: place.zip }];
  vehicle.departAt = world.simHours + 0.02;
  armLeg(vehicle);
  log(world, `${KIND_INFO[vehicle.kind].label} sent empty toward ${labelPlace(place.zip)}.`, "info");
  return null;
}

export function divertToYard(world: World, shipmentId: string, warehouseId: string): string | null {
  const company = world.company;
  if (!company) return "No company.";
  const shipment = company.shipments.find((item) => item.id === shipmentId);
  const vehicle = company.vehicles.find((item) => item.shipmentId === shipmentId || item.legs.some((leg) => leg.shipmentId === shipmentId));
  const yard = company.warehouses.find((item) => item.id === warehouseId);
  if (!shipment || !vehicle || !yard) return "Cannot divert that load.";
  if (vehicle.legs.some((item) => item.kind === "loaded" && item.shipmentId && item.shipmentId !== shipmentId)) {
    return "This truck is on a delivery loop. Bring the whole loop back instead of diverting one stop.";
  }
  if (shipment.status === "stored") return "It is already in a warehouse.";
  const leg = vehicle.legs[0];
  if (!leg || (leg.kind !== "loaded" && leg.kind !== "pickup")) return "The truck is not on that load yet.";
  const yardLeg: Leg = { kind: "yard", toZip: yard.zip, shipmentId, warehouseId };
  const customerLeg: Leg = { kind: "loaded", toZip: shipment.toZip, shipmentId };
  if (leg.kind === "loaded") {
    vehicle.legs = [yardLeg, customerLeg];
    armLeg(vehicle);
    vehicle.departAt = world.simHours;
    vehicle.status = "enroute";
  } else {
    vehicle.legs = [leg, yardLeg, customerLeg];
  }
  log(world, `Diversion set for ${labelPlace(yard.zip)}. If the building is full on arrival, the truck continues to the customer.`, "info");
  return null;
}

export function resumeStored(world: World, shipmentId: string, vehicleId: string, driverId: string, trailerId?: string): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const shipment = company.shipments.find((item) => item.id === shipmentId && item.status === "stored");
  const vehicle = company.vehicles.find((item) => item.id === vehicleId);
  const driver = company.drivers.find((item) => item.id === driverId);
  const trailer = trailerId ? company.vehicles.find((item) => item.id === trailerId) : undefined;
  const yard = company.warehouses.find((item) => item.id === shipment?.warehouseId);
  if (!shipment || !vehicle || !driver || !yard) return "Pick the stored freight, a truck, and a driver.";
  if (onBreak(driver, world.simHours)) return `${driver.name} is on a 10-hour break.`;
  if (vehicle.zip !== yard.zip || vehicle.status !== "idle") return "The truck has to be idle at that warehouse.";
  const fake: MarketJob = {
    id: shipment.id,
    mode: "road",
    fromZip: yard.zip,
    toZip: shipment.toZip,
    miles: 0,
    weight: shipment.weight,
    cube: shipment.cube,
    fragile: shipment.fragile,
    cargoValue: shipment.cargoValue,
    pay: Math.round(shipment.pay * 0.9),
    lateFee: shipment.lateFee,
    dueInHours: Math.max(1, shipment.dueAt - world.simHours),
    postedAt: 0,
    expiresAt: 0,
  };
  const quote = quoteJob(world, { ...fake, fromZip: yard.zip }, vehicle, driver, trailer);
  if (!quote.ok) return quote.reason || "That truck cannot take it.";
  shipment.status = "booked";
  shipment.warehouseId = undefined;
  shipment.vehicleId = vehicle.id;
  driver.vehicleId = vehicle.id;
  driver.warehouseId = null;
  vehicle.driverId = driver.id;
  vehicle.shipmentId = shipment.id;
  if (trailer) {
    vehicle.coupledTrailerId = trailer.id;
    trailer.coupledTrailerId = vehicle.id;
  }
  vehicle.legs = [{ kind: "loaded", toZip: shipment.toZip, shipmentId: shipment.id }];
  vehicle.departAt = world.simHours + 0.05;
  armLeg(vehicle);
  log(world, `Stored freight is rolling toward ${labelPlace(shipment.toZip)}.`, "info");
  return null;
}

function finishDelivery(world: World, company: Company, shipment: Shipment, vehicle: Vehicle) {
  const lateHours = world.simHours - shipment.dueAt;
  let payout = shipment.pay - shipment.deposit;
  let lateCut = 0;
  let lateDays = 0;
  const late = lateHours > 0.05;
  let rep = 2;
  if (late) {
    if (!shipment.lateNoted) {
      bumpRep(company, -6);
      shipment.lateNoted = true;
    }
    rep = -6;
    log(world, `Late into ${labelPlace(shipment.toZip)}. Reputation drops once.`, "bad");
    if (shipment.lateFee) {
      lateDays = Math.max(1, Math.ceil(lateHours / 24));
      lateCut = Math.min(payout, shipment.pay * 0.2 * lateDays);
      payout -= lateCut;
      log(world, `Late fee ${money(lateCut)} on a marked load (${lateDays} day${lateDays === 1 ? "" : "s"}).`, "bad");
    }
  } else {
    bumpRep(company, 2);
  }
  const driver = company.drivers.find((item) => item.id === vehicle.driverId);
  const skill = driver?.skill ?? 40;
  const fragile = shipment.fragile;
  let chance = 0.012 * (1 - skill / 140) * (1.45 - vehicle.condition / 110);
  if (fragile) chance *= 4;
  chance = Math.max(0.002, Math.min(0.4, chance));
  const roll = hash(`${shipment.id}:dmg`);
  let damage = 0;
  if (roll < chance) {
    damage = Math.round(shipment.cargoValue * (fragile ? 0.8 : 0.5));
    rep += fragile ? -20 : -12;
    bumpRep(company, fragile ? -20 : -12);
    pushCash(world, company, -damage, `Damage claim ${money(damage)} on ${fragile ? "fragile " : ""}freight worth ${money(shipment.cargoValue)}.`, "bad");
  }
  if (payout > 0) pushCash(world, company, payout, `Delivery paid ${money(payout)}.`, "good");
  else log(world, "Delivery finished with nothing left of the balance.", "bad");
  const miles = vehicle.routeMiles > 1 ? vehicle.routeMiles : (planRoad(shipment.fromZip, shipment.toZip)?.miles ?? 0);
  noteDelivery(world, company, {
    id: uid(world, "drop"),
    shipmentId: shipment.id,
    at: world.simHours,
    fromZip: shipment.fromZip,
    toZip: shipment.toZip,
    miles,
    weight: shipment.weight,
    cube: shipment.cube,
    fragile: shipment.fragile,
    cargoValue: shipment.cargoValue,
    pay: shipment.pay,
    deposit: shipment.deposit,
    payout,
    lateCut,
    damage,
    late,
    lateDays,
    dueAt: shipment.dueAt,
    driver: driver?.name ?? null,
    truck: vehicle.kind,
    condition: vehicle.condition,
    lateFee: shipment.lateFee,
    rep,
    partial: false,
  });
  shipment.status = "done";
  shipment.vehicleId = undefined;
  if (vehicle.shipmentId === shipment.id) {
    const next = vehicle.legs.find((leg) => leg.shipmentId);
    vehicle.shipmentId = next?.shipmentId ?? null;
  }
  const done = company.shipments.filter((item) => item.status === "done");
  if (done.length > 8) {
    const drop = new Set(done.slice(0, done.length - 8).map((item) => item.id));
    company.shipments = company.shipments.filter((item) => !drop.has(item.id));
  }
}

function noteDelivery(world: World, company: Company, record: DeliveryRecord) {
  if (!company.deliveries) company.deliveries = [];
  if (company.deliveries.some((item) => item.shipmentId === record.shipmentId)) return;
  company.deliveries.push(record);
  if (company.deliveries.length > 500) company.deliveries.splice(0, company.deliveries.length - 500);
}

function backfillDeliveries(world: World) {
  const company = world.company;
  if (!company) return;
  if (!company.deliveries) company.deliveries = [];
  const missing = company.shipments.filter(
    (shipment) => shipment.status === "done" && !company.deliveries.some((item) => item.shipmentId === shipment.id),
  );
  const paid = world.log.filter((line) => line.text.startsWith("Delivery paid "));
  const fees = world.log.filter((line) => line.text.startsWith("Late fee "));
  const claims = world.log.filter((line) => line.text.startsWith("Damage claim "));
  const recover = missing.length === 1 && paid.length === 1 ? paid[0] : null;
  for (const shipment of missing) {
    const miles = planRoad(shipment.fromZip, shipment.toZip)?.miles ?? 0;
    if (recover && shipment.id === missing[0].id) {
      const at = recover.at;
      const lateHours = at - shipment.dueAt;
      const late = lateHours > 0.05 || shipment.lateNoted;
      const lateCut = fees.length === 1 ? (dollars(fees[0].text) ?? 0) : 0;
      const damage = claims.length === 1 ? (dollars(claims[0].text) ?? 0) : 0;
      const lateDays = late && shipment.lateFee ? Math.max(1, Math.ceil(Math.max(0, lateHours) / 24)) : 0;
      noteDelivery(world, company, {
        id: uid(world, "drop"),
        shipmentId: shipment.id,
        at,
        fromZip: shipment.fromZip,
        toZip: shipment.toZip,
        miles,
        weight: shipment.weight,
        cube: shipment.cube,
        fragile: shipment.fragile,
        cargoValue: shipment.cargoValue,
        pay: shipment.pay,
        deposit: shipment.deposit,
        payout: dollars(recover.text),
        lateCut,
        damage,
        late,
        lateDays,
        dueAt: shipment.dueAt,
        driver: null,
        truck: null,
        condition: null,
        lateFee: shipment.lateFee,
        rep: (late ? -6 : 2) + (damage > 0 ? (shipment.fragile ? -20 : -12) : 0),
        partial: false,
      });
      continue;
    }
    noteDelivery(world, company, {
      id: uid(world, "drop"),
      shipmentId: shipment.id,
      at: null,
      fromZip: shipment.fromZip,
      toZip: shipment.toZip,
      miles,
      weight: shipment.weight,
      cube: shipment.cube,
      fragile: shipment.fragile,
      cargoValue: shipment.cargoValue,
      pay: shipment.pay,
      deposit: shipment.deposit,
      payout: null,
      lateCut: 0,
      damage: 0,
      late: shipment.lateNoted,
      lateDays: 0,
      dueAt: shipment.dueAt,
      driver: null,
      truck: null,
      condition: null,
      lateFee: shipment.lateFee,
      rep: 0,
      partial: true,
    });
  }
}

function dollars(text: string): number | null {
  const match = text.match(/\$([0-9,]+)/);
  if (!match) return null;
  return Number(match[1].replaceAll(",", ""));
}

function arrive(world: World, company: Company, vehicle: Vehicle) {
  const leg = vehicle.legs.shift();
  if (!leg) {
    vehicle.status = "idle";
    return;
  }
  vehicle.zip = leg.toZip;
  vehicle.mileage += vehicle.routeMiles;
  vehicle.done = [...(vehicle.done ?? []), { kind: leg.kind, toZip: leg.toZip, shipmentId: leg.shipmentId, warehouseId: leg.warehouseId }];
  if (vehicle.kind !== "trailer53") vehicle.condition = Math.max(8, vehicle.condition - vehicle.routeMiles / 450);
  const trailer = vehicle.coupledTrailerId ? company.vehicles.find((item) => item.id === vehicle.coupledTrailerId) : undefined;
  if (trailer) {
    trailer.zip = vehicle.zip;
    trailer.mileage += vehicle.routeMiles;
  }
  if (leg.kind === "trailer") {
    const found = company.vehicles.find((item) => item.kind === "trailer53" && item.zip === leg.toZip && item.status === "idle" && !item.coupledTrailerId);
    if (found) {
      vehicle.coupledTrailerId = found.id;
      found.coupledTrailerId = vehicle.id;
    }
  }
  if (leg.kind === "inbound") {
    vehicle.status = "idle";
    vehicle.fuel = KIND_INFO[vehicle.kind].tank;
    vehicle.legs = [];
    log(world, `${KIND_INFO[vehicle.kind].label} arrived at ${labelPlace(leg.toZip)}.`, "good");
    return;
  }
  if (leg.kind === "yard" && leg.warehouseId) {
    const yard = company.warehouses.find((item) => item.id === leg.warehouseId);
    const aboard = company.shipments.filter((item) => item.vehicleId === vehicle.id && item.status !== "done" && item.status !== "stored");
    const left: Shipment[] = [];
    let used = yard ? storedUse(company, yard.id) : { weight: 0, cube: 0 };
    let stored = 0;
    for (const shipment of aboard) {
      if (yard && used.weight + shipment.weight <= yard.payloadCap && used.cube + shipment.cube <= yard.cubeCap) {
        shipment.status = "stored";
        shipment.warehouseId = yard.id;
        shipment.vehicleId = undefined;
        used = { weight: used.weight + shipment.weight, cube: used.cube + shipment.cube };
        stored += 1;
      } else left.push(shipment);
    }
    if (stored > 0 && left.length === 0) {
      vehicle.shipmentId = null;
      vehicle.legs = [];
      vehicle.status = "idle";
      releaseCrew(company, vehicle, true);
      log(
        world,
        stored === 1
          ? `Freight stored at ${labelPlace(yard?.zip ?? leg.toZip)}. The balance still waits on the customer, and the due time keeps running.`
          : `${stored} loads stored at ${labelPlace(yard?.zip ?? leg.toZip)}. The balances still wait, and the due days keep running.`,
        "info",
      );
      return;
    }
    if (left.length) {
      vehicle.legs = left.map((shipment) => ({ kind: "loaded" as const, toZip: shipment.toZip, shipmentId: shipment.id }));
      vehicle.shipmentId = left[0].id;
      log(world, `Warehouse at ${labelPlace(leg.toZip)} was full. The truck continues to the customer.`, "bad");
      armLeg(vehicle);
      if (vehicle.routeMiles <= 0) arrive(world, company, vehicle);
      return;
    }
  }
  if (leg.kind === "loaded" && leg.shipmentId) {
    const shipment = company.shipments.find((item) => item.id === leg.shipmentId);
    if (shipment && shipment.status !== "done") finishDelivery(world, company, shipment, vehicle);
    if (!vehicle.legs.length) {
      vehicle.shipmentId = null;
      vehicle.departAt = null;
      headHome(world, company, vehicle);
      return;
    }
    armLeg(vehicle);
    if (vehicle.routeMiles <= 0) arrive(world, company, vehicle);
    return;
  }
  if (leg.kind === "reposition") {
    vehicle.status = "idle";
    vehicle.legs = [];
    if (warehouseAt(company, vehicle.zip)) releaseCrew(company, vehicle, true);
    log(world, `Empty move ended in ${labelPlace(vehicle.zip)}.`, "info");
    return;
  }
  if (leg.kind === "pickup") {
    const shipment = leg.shipmentId ? company.shipments.find((item) => item.id === leg.shipmentId) : undefined;
    if (shipment) shipment.status = "rolling";
  }
  if (vehicle.legs.length === 0) {
    vehicle.status = "idle";
    return;
  }
  armLeg(vehicle);
  if (vehicle.routeMiles <= 0) arrive(world, company, vehicle);
}

function moveVehicle(world: World, company: Company, vehicle: Vehicle, dt: number) {
  if (vehicle.status === "idle" && vehicle.legs.length && vehicle.departAt != null && world.simHours >= vehicle.departAt) {
    vehicle.status = "enroute";
    for (const shipment of company.shipments) {
      const onIt = shipment.id === vehicle.shipmentId || vehicle.legs.some((leg) => leg.shipmentId === shipment.id);
      if (onIt && shipment.status === "booked") shipment.status = "rolling";
    }
  }
  if (vehicle.status !== "enroute" && vehicle.status !== "inbound") return;
  if (vehicle.restUntil != null && world.simHours < vehicle.restUntil) return;
  const spec = KIND_INFO[vehicle.kind];
  const driver = vehicle.driverId ? company.drivers.find((item) => item.id === vehicle.driverId) : undefined;
  const mph = vehicle.status === "inbound" ? 50 : (spec.cruise || 55) * skillSpeed(driver?.skill ?? 50);
  let hours = dt;
  let driveToday = driver?.driveToday ?? vehicle.driveToday;
  let breakTaken = driver?.breakTaken ?? vehicle.breakTaken;
  if (vehicle.status !== "inbound") {
    if (!breakTaken && driveToday >= 8) {
      writeDuty(driver, vehicle, driveToday, true, world.simHours + 0.5);
      return;
    }
    if (driveToday >= 11) {
      writeDuty(driver, vehicle, 0, false, world.simHours + 10);
      return;
    }
    const room = (breakTaken ? 11 : 8) - driveToday;
    hours = Math.min(dt, Math.max(0.01, room));
  }
  const miles = mph * hours;
  const step = Math.min(miles, Math.max(0, vehicle.routeMiles - vehicle.traveled));
  const usedHours = mph <= 0 ? 0 : step / mph;
  vehicle.traveled += step;
  if (vehicle.status !== "inbound") {
    driveToday += usedHours;
    writeDuty(driver, vehicle, driveToday, breakTaken, driver?.restUntil ?? vehicle.restUntil);
    const gallons = step / (spec.mpg || 7);
    vehicle.fuel -= gallons;
    if (spec.tank > 0 && vehicle.fuel < spec.tank * 0.2) {
      const buy = spec.tank - Math.max(0, vehicle.fuel);
      vehicle.fuel = spec.tank;
      pushCash(world, company, -buy * world.diesel, `Fuel stop ${money(buy * world.diesel)} for the ${spec.label}.`, "info");
    }
  }
  if (vehicle.traveled >= vehicle.routeMiles - 0.05) {
    const leg = vehicle.legs[0];
    if ((leg?.kind === "loaded" || leg?.kind === "pickup") && vehicle.status !== "inbound") {
      const shipment = leg.shipmentId ? company.shipments.find((item) => item.id === leg.shipmentId) : undefined;
      const kind = leg.kind === "pickup" ? shipment?.pickupKind : shipment?.dropKind;
      const wait = dockWait(world.simHours, leg.toZip, kind);
      if (wait > 0.05) {
        const close = kind === "commercial" ? "5pm" : "8pm";
        const what = kind === "commercial" ? "commercial stop" : kind === "residential" ? "house stop" : "stop";
        if (vehicle.restUntil == null || vehicle.restUntil <= world.simHours) {
          log(world, `The ${what} in ${labelPlace(leg.toZip)} is closed. It is open 8am to ${close} local.`, "info");
        }
        vehicle.restUntil = world.simHours + wait;
        if (wait > 2) writeDuty(driver, vehicle, 0, false, vehicle.restUntil);
        else writeDuty(driver, vehicle, driver?.driveToday ?? vehicle.driveToday, driver?.breakTaken ?? vehicle.breakTaken, vehicle.restUntil);
        return;
      }
    }
    arrive(world, company, vehicle);
  }
}

function rivalAct(world: World) {
  if (!rivalsReady(world)) return;
  for (const rival of world.rivals) rivalDecide(world, rival);
}

function headHome(world: World, company: Company, vehicle: Vehicle) {
  vehicle.status = "idle";
  if (vehicle.kind === "trailer53" || warehouseAt(company, vehicle.zip)) {
    if (warehouseAt(company, vehicle.zip)) releaseCrew(company, vehicle, true);
    return;
  }
  const home = company.warehouses.find((yard) => yard.zip === company.homeZip) ?? company.warehouses[0];
  const driver = vehicle.driverId ? company.drivers.find((item) => item.id === vehicle.driverId) : undefined;
  if (!home || home.zip === vehicle.zip || !driver) return;
  vehicle.legs = [{ kind: "reposition", toZip: home.zip }];
  vehicle.departAt = world.simHours + 0.02;
  vehicle.shipmentId = null;
  armLeg(vehicle);
  log(world, `${KIND_INFO[vehicle.kind].label} is empty and driving back to ${labelPlace(home.zip)}. You pay the fuel.`, "info");
}

function writeDuty(driver: Driver | undefined, vehicle: Vehicle, driveToday: number, breakTaken: boolean, restUntil: number | null) {
  vehicle.driveToday = driveToday;
  vehicle.breakTaken = breakTaken;
  vehicle.restUntil = restUntil;
  if (!driver) return;
  driver.driveToday = driveToday;
  driver.breakTaken = breakTaken;
  driver.restUntil = restUntil;
}

function payroll(world: World, company: Company) {
  const mark = monthKey(world.simHours);
  if (mark === company.payrollMark) return;
  company.payrollMark = mark;
  const total = company.drivers.reduce((sum, driver) => sum + driver.wage, 0);
  if (total > 0) pushCash(world, company, -total, `Monthly wages ${money(total)} left the bank.`, total > company.cash ? "bad" : "info");
}

function expireJobs(world: World) {
  const before = world.jobs.length;
  world.jobs = world.jobs.filter((job) => job.expiresAt > world.simHours || job.id === world.heldJobId);
  if (world.jobs.length < before) refillBoard(world);
}

export function advance(world: World, dtHours: number) {
  const company = world.company;
  let left = dtHours;
  while (left > 0.00001) {
    const step = Math.min(0.25, left);
    const hourBefore = Math.floor(world.simHours);
    world.simHours += step;
    left -= step;
    world.diesel = 3.7 + 0.35 * Math.sin(world.simHours / 48) + 0.15 * Math.sin(world.simHours / 9);
    if (company && !company.closed) {
      for (const vehicle of company.vehicles) {
        if (vehicle.legs.length || vehicle.status === "enroute" || vehicle.status === "inbound") {
          moveVehicle(world, company, vehicle, step);
        }
      }
      payroll(world, company);
      if (company.negativeSince != null && gameDate(world.simHours).getTime() >= closureDate(company.negativeSince).getTime()) {
        company.closed = true;
        log(world, `${company.name} stayed negative for three months and is closed.`, "bad");
      }
    }
    for (const rival of world.rivals) {
      if (!Array.isArray(rival.trucks) || !Array.isArray(rival.drivers)) continue;
      for (const truck of rival.trucks) moveRivalTruck(world, rival, truck, step);
      if (!rival.closed) rivalClose(world, rival);
    }
    if (Math.floor(world.simHours) !== hourBefore) {
      expireJobs(world);
      rivalAct(world);
      refillBoard(world);
      refillListings(world);
      if (company) {
        for (const yard of company.warehouses) refillApplicants(world, yard);
        refillYards(world);
      }
    }
  }
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export function parkedMarks(): { zip: string; kind: "plane" | "ship"; name: string }[] {
  const want: { where: [string, string][]; kind: "plane" | "ship"; name: string }[] = [
    { where: [["Atlanta", "GA"], ["Marietta", "GA"]], kind: "plane", name: "Northline" },
    { where: [["Chicago", "IL"], ["Arlington Heights", "IL"]], kind: "plane", name: "Red Pier" },
    { where: [["Dallas", "TX"]], kind: "plane", name: "Harbor Range" },
    { where: [["Los Angeles", "CA"]], kind: "plane", name: "Northline" },
    { where: [["Seattle", "WA"], ["Poulsbo", "WA"]], kind: "ship", name: "Harbor Range" },
    { where: [["Houston", "TX"]], kind: "ship", name: "Red Pier" },
    { where: [["Savannah", "GA"], ["Pooler", "GA"]], kind: "ship", name: "Northline" },
    { where: [["Newark", "NJ"], ["New Providence", "NJ"]], kind: "ship", name: "Red Pier" },
  ];
  const marks = [];
  for (const item of want) {
    for (const [city, state] of item.where) {
      const hub = hubs.find((candidate) => candidate.city === city && candidate.state === state);
      if (hub) {
        marks.push({ zip: hub.zip, kind: item.kind, name: item.name });
        break;
      }
    }
  }
  return marks;
}
