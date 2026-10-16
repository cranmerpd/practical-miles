import { labelPlace, planRoad } from "@/game/geo";
import { gameDate, KIND_INFO, shipmentsOn, type Company, type Vehicle, type World } from "@/game/sim";

export type TripRead = {
  vehicle: Vehicle;
  milesLeft: number;
  gallons: number;
  burn: number;
  cashForFuel: number;
  pay: number;
  deposit: number;
  balance: number;
  afterFuel: number;
  leg: string;
  heading: string;
  driverName: string | null;
  lateFee: boolean;
  dueAt: number | null;
  stopsLeft: number;
};

const LEG: Record<string, string> = {
  trailer: "Driving to the trailer",
  pickup: "Empty, going to the pickup",
  loaded: "Loaded",
  yard: "Heading to your warehouse",
  reposition: "Empty move",
  inbound: "Seller is delivering it",
};

export function milesAhead(vehicle: Vehicle): number {
  const here = Math.max(0, vehicle.routeMiles - vehicle.traveled);
  let zip = vehicle.legs[0]?.toZip ?? vehicle.zip;
  let extra = 0;
  for (const leg of vehicle.legs.slice(1)) {
    extra += planRoad(zip, leg.toZip)?.miles ?? 0;
    zip = leg.toZip;
  }
  return here + extra;
}

export function onTheRoad(vehicle: Vehicle): boolean {
  return vehicle.status === "enroute" || vehicle.status === "inbound" || vehicle.legs.length > 0;
}

export function readTrip(world: World, company: Company, vehicle: Vehicle): TripRead | null {
  if (!onTheRoad(vehicle)) return null;
  const spec = KIND_INFO[vehicle.kind];
  const milesLeft = milesAhead(vehicle);
  const inbound = vehicle.status === "inbound";
  const gallons = !inbound && spec.mpg > 0 ? milesLeft / spec.mpg : 0;
  const burn = gallons * world.diesel;
  const cashForFuel = Math.max(0, gallons - Math.max(0, vehicle.fuel)) * world.diesel;
  const carried = shipmentsOn(company, vehicle);
  const pay = carried.reduce((sum, item) => sum + item.pay, 0);
  const deposit = carried.reduce((sum, item) => sum + item.deposit, 0);
  const balance = carried.reduce((sum, item) => sum + Math.max(0, item.pay - item.deposit), 0);
  const leg = vehicle.legs[0];
  const next = vehicle.legs.find((item) => item.kind === "loaded" && item.shipmentId);
  const nextShipment = next ? carried.find((item) => item.id === next.shipmentId) : carried[0];
  return {
    vehicle,
    milesLeft,
    gallons,
    burn,
    cashForFuel,
    pay,
    deposit,
    balance,
    afterFuel: balance - burn,
    leg: inbound ? LEG.inbound : leg ? LEG[leg.kind] : "Out",
    heading: leg ? labelPlace(leg.toZip) : labelPlace(vehicle.zip),
    driverName: company.drivers.find((driver) => driver.id === vehicle.driverId)?.name ?? null,
    lateFee: Boolean(nextShipment?.lateFee),
    dueAt: nextShipment?.dueAt ?? null,
    stopsLeft: vehicle.legs.filter((item) => item.kind === "loaded").length,
  };
}

export function resale(vehicle: Vehicle): number {
  return Math.round(
    vehicle.price * 0.55 * (vehicle.condition / 100) * (vehicle.kind === "trailer53" ? 1 : Math.max(0.45, 1 - vehicle.mileage / 900000)),
  );
}

export function nextPayday(simHours: number): string {
  const date = gameDate(simHours);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return `${months[next.getUTCMonth()]} 1`;
}
