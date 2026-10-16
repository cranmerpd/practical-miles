import { useState } from "react";
import { labelPlace } from "@/game/geo";
import { gameDate, isCommitted, KIND_INFO, money, type Company, type Driver, type Vehicle } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Notice, Panel, useWorld } from "@/components/desk/bits";
import { nextPayday, onTheRoad, readTrip } from "@/components/desk/trip";

function prorate(wage: number, simHours: number): number {
  const date = gameDate(simHours);
  const dim = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const left = dim - date.getUTCDate() + 1;
  return Math.round((wage * left) / dim);
}

function trucksTheyCanTake(company: Company, driver: Driver): Vehicle[] {
  const yard = company.warehouses.find((item) => item.id === driver.warehouseId);
  if (!yard) return [];
  return company.vehicles.filter((vehicle) => {
    if (vehicle.zip !== yard.zip || vehicle.kind === "trailer53") return false;
    if (vehicle.driverId || vehicle.status !== "idle" || isCommitted(vehicle)) return false;
    return !KIND_INFO[vehicle.kind].cdl || driver.cdl;
  });
}

export function Crew() {
  const { world, company } = useWorld();
  if (!company) return null;
  const wages = company.drivers.reduce((sum, driver) => sum + driver.wage, 0);
  const sitting = company.drivers.filter((driver) => !driver.vehicleId);
  const out = company.drivers.length - sitting.length;

  return (
    <div className="space-y-4">
      <Panel title="Payroll">
        <p className="text-sm text-ink/70">
          {company.drivers.length === 0
            ? "Nobody is hired. Wages do not start until you hire."
            : `${money(wages)} leaves the bank on ${nextPayday(world.simHours)}. ${out} ${out === 1 ? "is" : "are"} out with a truck. ${sitting.length} ${sitting.length === 1 ? "is" : "are"} sitting, and still get paid.`}
        </p>
        <p className="mt-2 text-sm text-ink/60">A driver stays with the truck until it parks at a warehouse you own. Then they can be put on another truck there. Skill makes trips faster and damage less likely. It does not change fuel.</p>
      </Panel>
      <Panel title="On the payroll">
        {company.drivers.length === 0 ? (
          <p className="text-sm text-ink/70">Nobody is hired yet.</p>
        ) : (
          <ul className="space-y-3">
            {company.drivers.map((driver) => (
              <Roster key={driver.id} driver={driver} simHours={world.simHours} />
            ))}
          </ul>
        )}
      </Panel>
      {company.warehouses.map((yard) => {
        const applicants = company.applicants.filter((driver) => driver.warehouseId === yard.id);
        return (
          <Panel key={yard.id} title={`Hiring in ${labelPlace(yard.zip)}`} extra={<span className="text-sm text-ink/60">{applicants.length} waiting</span>}>
            {applicants.length === 0 ? (
              <p className="text-sm text-ink/70">No one is waiting here right now. More names show up through the day.</p>
            ) : (
              <ul className="space-y-3">
                {applicants.map((driver) => (
                  <Applicant key={driver.id} driver={driver} simHours={world.simHours} wages={wages} />
                ))}
              </ul>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function Roster({ driver, simHours }: { driver: Driver; simHours: number }) {
  const { world, company } = useWorld();
  const fireDriver = useDesk((s) => s.fireDriver);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;
  const truck = company.vehicles.find((vehicle) => vehicle.id === driver.vehicleId);
  const yard = company.warehouses.find((item) => item.id === driver.warehouseId);
  const trip = truck ? readTrip(world, company, truck) : null;
  const ready = trucksTheyCanTake(company, driver);
  const resting = truck?.restUntil != null && simHours < truck.restUntil;
  return (
    <li className="space-y-2 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
      <p className="font-medium">
        {driver.name}
        {driver.cdl ? " · CDL" : " · no CDL"}
      </p>
      <p className="text-sm text-ink/70">
        Skill {driver.skill} · {money(driver.wage)} a month
        {truck ? ` · with the ${KIND_INFO[truck.kind].label}` : yard ? ` · at ${labelPlace(yard.zip)}` : " · between yards"}
      </p>
      {trip ? (
        <p className="text-sm text-ink/70">
          {trip.leg}, toward {trip.heading}. {Math.round(trip.milesLeft).toLocaleString("en-US")} miles left.
          {resting ? " Resting." : truck ? ` Driven ${truck.driveToday.toFixed(1)} hours today.` : ""}
          {trip.pay > 0 ? ` Still owed ${money(trip.balance)}. Fuel still to burn ${money(trip.burn)}.` : trip.vehicle.status === "inbound" ? "" : " No customer is paying for this move."}
        </p>
      ) : null}
      {!driver.vehicleId ? (
        <p className="text-sm text-ink/70">
          {ready.length
            ? `Can take ${ready.map((vehicle) => `the ${KIND_INFO[vehicle.kind].label}`).join(", ")} parked here.`
            : "No free truck here that they can drive. A trailer does not count, and a tractor needs a CDL."}
        </p>
      ) : null}
      {driver.vehicleId || (truck && onTheRoad(truck)) ? (
        <p className="text-sm text-ink/60">You can let them go once the truck is parked at your warehouse and they are off it.</p>
      ) : (
        <Button variant="quiet" onClick={() => setNote(fireDriver(driver.id))}>
          Let go · rest of month {money(prorate(driver.wage, simHours))}
        </Button>
      )}
      <Notice text={note} />
    </li>
  );
}

function Applicant({ driver, simHours, wages }: { driver: Driver; simHours: number; wages: number }) {
  const hireDriver = useDesk((s) => s.hireDriver);
  const [note, setNote] = useState<string | null>(null);
  const hireNow = prorate(driver.wage, simHours);
  return (
    <li className="space-y-2 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
      <p className="font-medium">
        {driver.name}
        {driver.cdl ? " · CDL" : " · no CDL"}
      </p>
      <p className="text-sm text-ink/70">
        Skill {driver.skill}. {driver.cdl ? "Can drive a tractor, a box, or a van." : "Can drive a van or a box. Cannot drive a tractor."} Wage {money(driver.wage)} a month. Hiring costs {money(hireNow)} for the rest of this month.
        {wages > 0 ? ` Payroll is already ${money(wages)} a month.` : ""}
      </p>
      <Button onClick={() => setNote(hireDriver(driver.id))}>Hire</Button>
      <Notice text={note} />
    </li>
  );
}
