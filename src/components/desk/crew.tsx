import { useState } from "react";
import { labelPlace } from "@/game/geo";
import { gameDate, money, type Driver } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Notice, Panel, useWorld } from "@/components/desk/bits";

function prorate(wage: number, simHours: number): number {
  const date = gameDate(simHours);
  const dim = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const left = dim - date.getUTCDate() + 1;
  return Math.round((wage * left) / dim);
}

export function Crew() {
  const { world, company } = useWorld();
  if (!company) return null;
  return (
    <div className="space-y-4">
      <Panel title="On the payroll">
        <p className="mb-3 text-sm text-ink/70">Full wages leave the bank on the 1st. A driver stays with the truck until it parks at a warehouse you own. Then they can be put on another truck there.</p>
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
          <Panel key={yard.id} title={`Hiring in ${labelPlace(yard.zip)}`}>
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
      })}
    </div>
  );
}

function Roster({ driver, simHours }: { driver: Driver; simHours: number }) {
  const { company } = useWorld();
  const fireDriver = useDesk((s) => s.fireDriver);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;
  const truck = company.vehicles.find((vehicle) => vehicle.id === driver.vehicleId);
  const yard = company.warehouses.find((item) => item.id === driver.warehouseId);
  return (
    <li className="space-y-2 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
      <p className="font-medium">
        {driver.name}
        {driver.cdl ? " · CDL" : ""}
      </p>
      <p className="text-sm text-ink/70">
        Skill {driver.skill} · {money(driver.wage)} a month · {truck ? "out with a truck" : yard ? `at ${labelPlace(yard.zip)}` : "between yards"}
      </p>
      {driver.vehicleId ? (
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

function Applicant({ driver, simHours }: { driver: Driver; simHours: number }) {
  const hireDriver = useDesk((s) => s.hireDriver);
  const [note, setNote] = useState<string | null>(null);
  return (
    <li className="space-y-2 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
      <p className="font-medium">
        {driver.name}
        {driver.cdl ? " · CDL" : " · no CDL"}
      </p>
      <p className="text-sm text-ink/70">
        Skill {driver.skill}. Better skill means faster trips, less damage, and fewer delays. It does not change fuel. Wage {money(driver.wage)} a month. Hiring costs about {money(prorate(driver.wage, simHours))} for the rest of this month.
      </p>
      <Button onClick={() => setNote(hireDriver(driver.id))}>Hire</Button>
      <Notice text={note} />
    </li>
  );
}
