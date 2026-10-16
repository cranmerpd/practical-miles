import {
  hubs,
  labelPlace,
  lookupZip,
  planRoad,
  places,
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
};

export type Warehouse = {
  id: string;
  zip: string;
  starter: boolean;
  payloadCap: number;
  cubeCap: number;
  price: number;
};

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

export type Rival = { id: string; name: string; hue: number; trucks: number };

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

export function dutyHours(driveHours: number): number {
  let left = Math.max(0, driveHours);
  let elapsed = 0;
  let driven = 0;
  let broke = false;
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
  return elapsed;
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
    rivals: [
      { id: "r1", name: "Northline", hue: 210, trucks: 40 },
      { id: "r2", name: "Red Pier", hue: 4, trucks: 22 },
      { id: "r3", name: "Harbor Range", hue: 168, trucks: 18 },
      { id: "r4", name: "Ash Cargo", hue: 28, trucks: 11 },
      { id: "r5", name: "Lantern Freight", hue: 45, trucks: 9 },
      { id: "r6", name: "Sable Cartage", hue: 250, trucks: 7 },
      { id: "r7", name: "Copper State", hue: 16, trucks: 6 },
      { id: "r8", name: "Millwright", hue: 90, trucks: 5 },
    ],
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
  if (world.jobs.length < 20) refillBoard(world, 28, 6);
  if (world.listings.length < 4) refillListings(world);
  if (world.ghosts.length < 6) refillGhosts(world);
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
    payrollMark: monthKey(world.simHours),
  };
  world.company = company;
  refillApplicants(world, yard);
  refillYards(world);
  log(world, `${company.name} opens in ${labelPlace(place.zip)} with $25,000 and a small warehouse.`, "good");
  return null;
}

function randomRoadPair(world: World): { from: string; to: string; plan: RoadPlan } | null {
  for (let n = 0; n < 12; n++) {
    const a = places[ri(world, places.length)];
    const b = places[ri(world, places.length)];
    if (a.zip === b.zip) continue;
    const plan = planRoad(a.zip, b.zip);
    if (!plan || plan.miles < 25 || plan.miles > 2200) continue;
    return { from: a.zip, to: b.zip, plan };
  }
  return null;
}

function makeJob(world: World, mode: MarketJob["mode"]): MarketJob | null {
  const pair = mode === "road" ? randomRoadPair(world) : randomRoadPair(world);
  if (!pair) return null;
  const rep = world.company?.rep ?? 35;
  const miles = mode === "road" ? pair.plan.miles : mode === "air" ? Math.round(pair.plan.miles * 0.82) : Math.round(pair.plan.miles * 1.4);
  const fragile = rngNext(world) < 0.22;
  const heavy = rngNext(world) < (rep > 60 ? 0.35 : 0.18);
  const weight = mode === "road" ? (heavy ? 8000 + ri(world, 28000) : 400 + ri(world, 7000)) : 2000 + ri(world, 20000);
  const cube = mode === "road" ? Math.round(weight * (0.12 + rngNext(world) * 0.18)) : Math.round(weight * 0.2);
  const lateFee = rngNext(world) < 0.1;
  const tight = rep < 40 && rngNext(world) < 0.45;
  const rate = (miles < 120 ? 3.35 : miles < 400 ? 2.5 : 2.05) * (1 + 0.08 * Math.sin(world.simHours / 36));
  let pay = Math.round(miles * rate * (fragile ? 1.08 : 1) * (lateFee ? 1.06 : 1) * (tight ? 0.86 : 1));
  if (mode !== "road") pay = Math.round(pay * 2.4);
  const cargoValue = Math.round((6000 + rngNext(world) * 50000) * (fragile ? 1.4 : 1) * (rngNext(world) < 0.08 ? 2.2 : 1));
  const slack = tight ? 4 + rngNext(world) * 10 : 8 + rngNext(world) * 30;
  const drive = driveHoursFor(miles, 60, 50);
  const dueIn = dutyHours(drive) + slack;
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
    dueInHours: dueIn,
    postedAt: world.simHours,
    expiresAt: world.simHours + (mode === "road" ? 18 + rngNext(world) * 30 : 36),
  };
}

function refillBoard(world: World, roadTarget = 48, otherTarget = 8) {
  let road = world.jobs.filter((job) => job.mode === "road").length;
  let other = world.jobs.filter((job) => job.mode !== "road").length;
  let guard = 0;
  while (road < roadTarget && guard++ < roadTarget + 20) {
    const job = makeJob(world, "road");
    if (!job) break;
    world.jobs.push(job);
    road++;
  }
  while (other < otherTarget && guard++ < roadTarget + otherTarget + 30) {
    const job = makeJob(world, rngNext(world) < 0.5 ? "air" : "sea");
    if (!job) break;
    world.jobs.push(job);
    other++;
  }
}

function refillListings(world: World) {
  const kinds: Kind[] = ["van", "van", "box16", "box16", "box26", "trailer53", "daycab", "sleeper"];
  while (world.listings.length < 7) {
    const kind = pick(world, kinds);
    const spec = KIND_INFO[kind];
    const hub = hubs[ri(world, hubs.length)];
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

function refillGhosts(world: World) {
  while (world.ghosts.length < 10) {
    const rival = pick(world, world.rivals);
    const a = hubs[ri(world, hubs.length)];
    const b = hubs[ri(world, hubs.length)];
    const plan = planRoad(a.zip, b.zip);
    if (!plan || plan.miles < 80) continue;
    world.ghosts.push({
      id: uid(world, "ghost"),
      name: rival.name,
      points: plan.points,
      miles: plan.miles,
      traveled: rngNext(world) * plan.miles,
    });
  }
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

export function driversForVehicle(company: Company, vehicle: Vehicle): Driver[] {
  if (vehicle.driverId) return company.drivers.filter((driver) => driver.id === vehicle.driverId);
  const yard = warehouseAt(company, vehicle.zip);
  if (!yard || vehicle.status !== "idle") return [];
  return company.drivers.filter((driver) => driver.warehouseId === yard.id && !driver.vehicleId);
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
  if (!company) return { ok: false, reason: "No company.", deadhead: 0, loaded: 0, hours: 0, fuelCost: 0, profit: 0, warnings, points: [] };
  if (job && "mode" in job && job.mode !== "road") {
    return { ok: false, reason: "You cannot book air or sea freight yet.", deadhead: 0, loaded: 0, hours: 0, fuelCost: 0, profit: 0, warnings, points: [] };
  }
  const spec = KIND_INFO[vehicle.kind];
  if (spec.cdl && !driver.cdl) {
    return { ok: false, reason: "That tractor needs a CDL driver.", deadhead: 0, loaded: 0, hours: 0, fuelCost: 0, profit: 0, warnings, points: [] };
  }
  const fromZip = "fromZip" in job ? job.fromZip : "";
  const stops = [vehicle.zip];
  if (isTractor(vehicle.kind)) {
    if (!trailer) return { ok: false, reason: "Pick a trailer.", deadhead: 0, loaded: 0, hours: 0, fuelCost: 0, profit: 0, warnings, points: [] };
    if (trailer.zip !== vehicle.zip) stops.push(trailer.zip);
  }
  stops.push(fromZip);
  const dead = chainPlans(stops);
  const loadedPlan = planRoad(fromZip, job.toZip);
  if (!dead || !loadedPlan) {
    return { ok: false, reason: "No highway path between those ZIP codes.", deadhead: 0, loaded: 0, hours: 0, fuelCost: 0, profit: 0, warnings, points: [] };
  }
  const cap = isTractor(vehicle.kind)
    ? { payload: KIND_INFO[trailer!.kind].payload, cube: KIND_INFO[trailer!.kind].cube }
    : { payload: spec.payload, cube: spec.cube };
  if (job.weight > cap.payload || job.cube > cap.cube) {
    return { ok: false, reason: "The freight does not fit this truck.", deadhead: dead.miles, loaded: loadedPlan.miles, hours: 0, fuelCost: 0, profit: 0, warnings, points: [] };
  }
  const miles = dead.miles + loadedPlan.miles;
  const drive = driveHoursFor(miles, spec.cruise || 60, driver.skill);
  const hours = dutyHours(drive);
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
  return { ok: true, deadhead: dead.miles, loaded: loadedPlan.miles, hours, fuelCost, profit, warnings, points };
}

export function acceptJob(world: World, jobId: string, vehicleId: string, driverId: string, trailerId?: string, force = false): string | null {
  const company = world.company;
  if (!company || company.closed) return "The company is closed.";
  const job = world.jobs.find((item) => item.id === jobId);
  const vehicle = company.vehicles.find((item) => item.id === vehicleId);
  const driver = company.drivers.find((item) => item.id === driverId);
  const trailer = trailerId ? company.vehicles.find((item) => item.id === trailerId) : undefined;
  if (!job || !vehicle || !driver) return "Pick a load, a truck, and a driver.";
  if (vehicle.status !== "idle") return "That truck is already out.";
  const quote = quoteJob(world, job, vehicle, driver, trailer);
  if (!quote.ok) return quote.reason || "That load does not work.";
  if (quote.warnings.length && !force) return "CONFIRM";
  const deposit = Math.round(job.pay * 0.1);
  const shipment: Shipment = {
    id: uid(world, "ship"),
    fromZip: job.fromZip,
    toZip: job.toZip,
    weight: job.weight,
    cube: job.cube,
    fragile: job.fragile,
    cargoValue: job.cargoValue,
    pay: job.pay,
    lateFee: job.lateFee,
    dueAt: world.simHours + job.dueInHours,
    deposit,
    status: "booked",
    vehicleId: vehicle.id,
    lateNoted: false,
  };
  company.shipments.push(shipment);
  world.jobs = world.jobs.filter((item) => item.id !== jobId);
  world.heldJobId = null;
  driver.vehicleId = vehicle.id;
  driver.warehouseId = null;
  vehicle.driverId = driver.id;
  vehicle.shipmentId = shipment.id;
  const legs: Leg[] = [];
  if (trailer && trailer.zip !== vehicle.zip) {
    legs.push({ kind: "trailer", toZip: trailer.zip, shipmentId: shipment.id });
    vehicle.coupledTrailerId = null;
  } else if (trailer) {
    vehicle.coupledTrailerId = trailer.id;
    trailer.coupledTrailerId = vehicle.id;
  }
  const hookedAt = legs.length ? legs[legs.length - 1].toZip : vehicle.zip;
  if (hookedAt !== job.fromZip) {
    legs.push({ kind: "pickup", toZip: job.fromZip, shipmentId: shipment.id });
  }
  legs.push({ kind: "loaded", toZip: job.toZip, shipmentId: shipment.id });
  vehicle.legs = legs;
  vehicle.departAt = world.simHours + 0.05;
  vehicle.status = "idle";
  armLeg(vehicle);
  pushCash(companyWorld(world), company, deposit, `${labelPlace(job.fromZip)} to ${labelPlace(job.toZip)} accepted. The customer paid ${money(deposit)}.`, "good");
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
  const vehicle = company.vehicles.find((item) => item.shipmentId === shipmentId);
  if (!shipment || !vehicle) return "That load is not on a truck.";
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
  if (!vehicle || vehicle.status !== "idle" || vehicle.shipmentId) return "That truck is not free.";
  if (vehicle.kind === "trailer53") return "A trailer does not drive itself.";
  const place = lookupZip(toZip);
  if (!place) return "Unknown ZIP code.";
  let driver = vehicle.driverId ? company.drivers.find((item) => item.id === vehicle.driverId) : undefined;
  if (!driver && driverId) driver = company.drivers.find((item) => item.id === driverId);
  if (!driver) return "Pick a driver.";
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
  const vehicle = company.vehicles.find((item) => item.shipmentId === shipmentId);
  const yard = company.warehouses.find((item) => item.id === warehouseId);
  if (!shipment || !vehicle || !yard) return "Cannot divert that load.";
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
  if (lateHours > 0.05) {
    if (!shipment.lateNoted) {
      bumpRep(company, -6);
      shipment.lateNoted = true;
    }
    log(world, `Late into ${labelPlace(shipment.toZip)}. Reputation drops once.`, "bad");
    if (shipment.lateFee) {
      const days = Math.max(1, Math.ceil(lateHours / 24));
      const cut = Math.min(payout, shipment.pay * 0.2 * days);
      payout -= cut;
      log(world, `Late fee ${money(cut)} on a marked load (${days} day${days === 1 ? "" : "s"}).`, "bad");
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
  if (roll < chance) {
    const bill = Math.round(shipment.cargoValue * (fragile ? 0.8 : 0.5));
    bumpRep(company, fragile ? -20 : -12);
    pushCash(world, company, -bill, `Damage claim ${money(bill)} on ${fragile ? "fragile " : ""}freight worth ${money(shipment.cargoValue)}.`, "bad");
  }
  if (payout > 0) pushCash(world, company, payout, `Delivery paid ${money(payout)}.`, "good");
  else log(world, "Delivery finished with nothing left of the balance.", "bad");
  shipment.status = "done";
  vehicle.shipmentId = null;
  vehicle.legs = [];
  const yard = warehouseAt(company, vehicle.zip);
  if (yard) releaseCrew(company, vehicle, true);
  else vehicle.status = "idle";
  const done = company.shipments.filter((item) => item.status === "done");
  if (done.length > 8) {
    const drop = new Set(done.slice(0, done.length - 8).map((item) => item.id));
    company.shipments = company.shipments.filter((item) => !drop.has(item.id));
  }
}

function arrive(world: World, company: Company, vehicle: Vehicle) {
  const leg = vehicle.legs.shift();
  if (!leg) {
    vehicle.status = "idle";
    return;
  }
  vehicle.zip = leg.toZip;
  vehicle.mileage += vehicle.routeMiles;
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
  if (leg.kind === "yard" && leg.warehouseId && leg.shipmentId) {
    const yard = company.warehouses.find((item) => item.id === leg.warehouseId);
    const shipment = company.shipments.find((item) => item.id === leg.shipmentId);
    const used = yard ? storedUse(company, yard.id) : { weight: 0, cube: 0 };
    if (yard && shipment && used.weight + shipment.weight <= yard.payloadCap && used.cube + shipment.cube <= yard.cubeCap) {
      shipment.status = "stored";
      shipment.warehouseId = yard.id;
      shipment.vehicleId = undefined;
      vehicle.shipmentId = null;
      vehicle.legs = [];
      vehicle.status = "idle";
      releaseCrew(company, vehicle, true);
      log(world, `Freight stored at ${labelPlace(yard.zip)}. The balance still waits on the customer, and the due time keeps running.`, "info");
      return;
    }
    log(world, `Warehouse at ${labelPlace(leg.toZip)} was full. The truck continues to the customer.`, "bad");
  }
  if (leg.kind === "loaded" && leg.shipmentId) {
    const shipment = company.shipments.find((item) => item.id === leg.shipmentId);
    if (shipment) {
      shipment.status = "done";
      finishDelivery(world, company, shipment, vehicle);
      return;
    }
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
    const shipment = vehicle.shipmentId ? company.shipments.find((item) => item.id === vehicle.shipmentId) : undefined;
    if (shipment && shipment.status === "booked") shipment.status = "rolling";
  }
  if (vehicle.status !== "enroute" && vehicle.status !== "inbound") return;
  if (vehicle.restUntil != null && world.simHours < vehicle.restUntil) return;
  const spec = KIND_INFO[vehicle.kind];
  const driver = vehicle.driverId ? company.drivers.find((item) => item.id === vehicle.driverId) : undefined;
  const mph = vehicle.status === "inbound" ? 50 : (spec.cruise || 55) * skillSpeed(driver?.skill ?? 50);
  let hours = dt;
  if (vehicle.status !== "inbound") {
    if (!vehicle.breakTaken && vehicle.driveToday >= 8) {
      vehicle.restUntil = world.simHours + 0.5;
      vehicle.breakTaken = true;
      return;
    }
    if (vehicle.driveToday >= 11) {
      vehicle.driveToday = 0;
      vehicle.breakTaken = false;
      vehicle.restUntil = world.simHours + 10;
      return;
    }
    const room = (vehicle.breakTaken ? 11 : 8) - vehicle.driveToday;
    hours = Math.min(dt, Math.max(0.01, room));
  }
  const miles = mph * hours;
  const step = Math.min(miles, Math.max(0, vehicle.routeMiles - vehicle.traveled));
  const usedHours = mph <= 0 ? 0 : step / mph;
  vehicle.traveled += step;
  if (vehicle.status !== "inbound") {
    vehicle.driveToday += usedHours;
    const gallons = step / (spec.mpg || 7);
    vehicle.fuel -= gallons;
    if (spec.tank > 0 && vehicle.fuel < spec.tank * 0.2) {
      const buy = spec.tank - Math.max(0, vehicle.fuel);
      vehicle.fuel = spec.tank;
      pushCash(world, company, -buy * world.diesel, `Fuel stop ${money(buy * world.diesel)} for the ${spec.label}.`, "info");
    }
  }
  if (vehicle.traveled >= vehicle.routeMiles - 0.05) arrive(world, company, vehicle);
}

function rivalAct(world: World) {
  if (!world.jobs.length) return;
  const rep = world.company?.rep ?? 35;
  const appetite = rep < 40 ? 0.55 : rep > 70 ? 0.2 : 0.35;
  for (const rival of world.rivals) {
    if (rngNext(world) > appetite) continue;
    const roads = world.jobs.filter((job) => job.mode === "road" && job.id !== world.heldJobId);
    if (!roads.length) return;
    roads.sort((a, b) => b.pay / b.miles - a.pay / a.miles);
    const job = roads[ri(world, Math.min(4, roads.length))];
    world.jobs = world.jobs.filter((item) => item.id !== job.id);
    log(world, `${rival.name} took ${labelPlace(job.fromZip)} to ${labelPlace(job.toZip)}.`, "info");
  }
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
    for (const ghost of world.ghosts) {
      ghost.traveled += 55 * step;
      if (ghost.traveled >= ghost.miles) {
        ghost.traveled = ghost.miles;
      }
    }
    world.ghosts = world.ghosts.filter((ghost) => ghost.traveled < ghost.miles - 0.1);
    if (Math.floor(world.simHours) !== hourBefore) {
      expireJobs(world);
      rivalAct(world);
      refillBoard(world);
      refillListings(world);
      refillGhosts(world);
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
