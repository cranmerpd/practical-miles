import { useState } from "react";
import { labelPlace } from "@/game/geo";
import { gameDate, isCommitted, KIND_INFO, money, type Company, type Driver, type Vehicle } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { hoursLeft, Notice, Panel, Track, useWorld } from "@/components/desk/bits";
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
          {company.drivers.length === 0 ? "Nobody is hired." : `${money(wages)} on ${nextPayday(world.simHours)}.`}
        </p>
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
                      <Applicant key={driver.id} driver={driver} simHours={world.simHours} />
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
      <dd className="mt-1 font-display text-3xl leading-none tabular-nums">{value}</dd>
    </div>
  );
}

function availability(driver: Driver, simHours: number): { text: string; driven: number } {
  const driven = driver.driveToday ?? 0;
  const left = Math.max(0, 11 - driven);
  const resting = driver.restUntil != null && simHours < driver.restUntil ? driver.restUntil - simHours : 0;
  if (resting > 0.05 && driven < 0.05) return { text: `Break · ${hoursLeft(resting)} left`, driven: 0 };
  if (resting > 0.05) return { text: `Break · ${hoursLeft(resting)} left · ${left.toFixed(1)}h after`, driven };
  if (!driver.breakTaken && driven >= 8) return { text: `30-minute break due · ${left.toFixed(1)}h after`, driven };
  if (!driver.breakTaken) return { text: `${left.toFixed(1)}h left · 30-minute break still owed`, driven };
  return { text: `${left.toFixed(1)}h left · 30-minute break done`, driven };
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
  const clock = availability(driver, simHours);
  return (
    <li className="space-y-2 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {driver.name}
          {driver.cdl ? " · CDL" : ""}
        </p>
        <p className="text-sm tabular-nums text-ink/60">{money(driver.wage)}/mo · skill {driver.skill}</p>
      </div>
      <Track label="Driving today" value={clock.driven} max={11} display={`${clock.driven.toFixed(1)} / 11 h`} tone={clock.driven >= 8 ? "rust" : "ink"} />
      <p className="text-sm text-ink/70">
        {clock.text}
        {truck ? ` · ${KIND_INFO[truck.kind].label}` : yard ? ` · ${labelPlace(yard.zip)}` : ""}
        {ready.length && !driver.vehicleId ? ` · ${ready.map((vehicle) => KIND_INFO[vehicle.kind].label).join(", ")}` : ""}
      </p>
      {!driver.vehicleId && driver.warehouseId && !(driver.restUntil != null && simHours < driver.restUntil) ? (
        <Button variant="quiet" onClick={() => setNote(sendBreak(driver.id))}>
          10-hour break
        </Button>
      ) : null}
      {driver.vehicleId || (truck && onTheRoad(truck)) ? null : (
        <Button variant="quiet" onClick={() => setNote(fireDriver(driver.id))}>
          Let go · rest of month {money(prorate(driver.wage, simHours))}
        </Button>
      )}
      <Notice text={note} />
    </li>
  );
}

function Applicant({ driver, simHours }: { driver: Driver; simHours: number }) {
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
        Skill {driver.skill}
        {driver.cdl ? " · CDL" : " · no CDL"}
        {" · "}
        {money(driver.wage)}/mo · hire {money(hireNow)}
      </p>
      <Button onClick={() => setNote(hireDriver(driver.id))}>Hire</Button>
      <Notice text={note} />
    </li>
  );
}
