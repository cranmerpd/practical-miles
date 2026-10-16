import { useState } from "react";
import { labelPlace } from "@/game/geo";
import { gameDate, isCommitted, KIND_INFO, money, type Company, type Driver, type Vehicle } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { hoursLeft, Notice, Panel, useWorld } from "@/components/desk/bits";
import { nextPayday, onTheRoad } from "@/components/desk/trip";

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
  const [hiring, setHiring] = useState(false);
  if (!company) return null;
  const wages = company.drivers.reduce((sum, driver) => sum + driver.wage, 0);
  const sitting = company.drivers.filter((driver) => !driver.vehicleId);
  const out = company.drivers.length - sitting.length;
  const resting = company.drivers.filter((driver) => driver.restUntil != null && world.simHours < driver.restUntil).length;

  return (
    <div className="space-y-4">
      <Panel title="The roster">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="On payroll" value={String(company.drivers.length)} />
          <Stat label="Out" value={String(out)} />
          <Stat label="At a yard" value={String(sitting.length)} />
          <Stat label="On a break" value={String(resting)} />
        </dl>
        <p className="mt-3 text-sm text-ink/70">
          {company.drivers.length === 0
            ? "Nobody is hired. Wages do not start until you hire."
            : `${money(wages)} leaves the bank on ${nextPayday(world.simHours)}. Hours stay with the driver. A 10-hour break at the warehouse clears the day, and they cannot be assigned until it ends.`}
        </p>
        <p className="mt-2 text-sm text-ink/60">They stay with the truck until it parks at a warehouse you own. Skill makes trips faster and damage less likely. It does not change fuel.</p>
        <div className="mt-3">
          <Button variant={hiring ? "quiet" : "primary"} onClick={() => setHiring((value) => !value)}>
            {hiring ? "Hide hiring" : "Hire drivers"}
          </Button>
        </div>
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
      {hiring || company.drivers.length === 0
        ? company.warehouses.map((yard) => {
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
          })
        : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function availability(driver: Driver, simHours: number): string {
  const driven = driver.driveToday ?? 0;
  const left = Math.max(0, 11 - driven);
  const resting = driver.restUntil != null && simHours < driver.restUntil ? driver.restUntil - simHours : 0;
  if (resting > 0.05 && driven < 0.05) return `On a 10-hour break. About ${hoursLeft(resting)} left. Cannot be assigned until it ends. Then 11 driving hours are open.`;
  if (resting > 0.05) return `On a break for about ${hoursLeft(resting)}. ${left.toFixed(1)} driving hours left after it.`;
  if (!driver.breakTaken && driven >= 8) return `Needs the 30-minute break now. ${left.toFixed(1)} driving hours left after it.`;
  if (!driver.breakTaken) return `${left.toFixed(1)} driving hours left before the 10-hour break. Driven ${driven.toFixed(1)}. The 30-minute break is still owed after 8 hours.`;
  return `${left.toFixed(1)} driving hours left before the 10-hour break. Driven ${driven.toFixed(1)}. The 30-minute break is done.`;
}

function Roster({ driver, simHours }: { driver: Driver; simHours: number }) {
  const { company } = useWorld();
  const fireDriver = useDesk((s) => s.fireDriver);
  const sendBreak = useDesk((s) => s.sendBreak);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;
  const truck = company.vehicles.find((vehicle) => vehicle.id === driver.vehicleId);
  const yard = company.warehouses.find((item) => item.id === driver.warehouseId);
  const ready = trucksTheyCanTake(company, driver);
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
      <p className="text-sm text-ink/70">{availability(driver, simHours)}</p>
      {!driver.vehicleId && driver.warehouseId && !(driver.restUntil != null && simHours < driver.restUntil) ? (
        <Button variant="quiet" onClick={() => setNote(sendBreak(driver.id))}>
          10-hour break
        </Button>
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
