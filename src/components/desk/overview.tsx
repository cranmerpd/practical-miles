import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { MapBoard } from "@/components/desk/map-board";
import { Frame, Log } from "@/components/desk/desk";
import { Notice, useWorld } from "@/components/desk/bits";
import { useDesk } from "@/game/store";
import { money } from "@/game/sim";
import { nextPayday, readTrip } from "@/components/desk/trip";
import { Button } from "@/components/ui/button";

export function Overview() {
  const { world, company } = useWorld();
  const exportSave = useDesk((s) => s.exportSave);
  const importSave = useDesk((s) => s.importSave);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;
  const moving = company.vehicles.filter((vehicle) => vehicle.status !== "idle").length;
  const active = company.shipments.filter((shipment) => shipment.status === "rolling" || shipment.status === "booked").length;
  const stored = company.shipments.filter((shipment) => shipment.status === "stored").length;
  const road = world.jobs.filter((job) => job.mode === "road").length;
  const freeDrivers = company.drivers.filter((driver) => !driver.vehicleId && !(driver.restUntil != null && world.simHours < driver.restUntil)).length;
  const movingTrips = company.vehicles
    .map((vehicle) => readTrip(world, company, vehicle))
    .filter((trip) => trip != null);

  return (
    <Frame>
      <div className="grid gap-3 lg:h-[calc(100dvh-7.5rem)] lg:grid-cols-[minmax(0,1fr)_22rem]">
        <MapBoard route={null} fit />
        <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
          <dl className="grid grid-cols-2 border border-ink/10">
            <Count label="Cash" value={money(company.cash)} hint={company.cash < 0 ? "In the red" : "In the bank"} />
            <Count label="Trucks out" value={`${moving}/${company.vehicles.length || 0}`} hint={moving === 0 ? "All parked" : "On a trip"} />
            <Count label="Drivers free" value={String(freeDrivers)} hint={`${company.drivers.length} on the roster`} />
            <Count label="Payroll" value={nextPayday(world.simHours)} hint={company.drivers.length ? money(company.drivers.reduce((sum, driver) => sum + driver.wage, 0)) : "No wages yet"} />
            <Count label="Stored" value={String(stored)} hint="On a warehouse floor" />
            <Count label="Booked" value={String(active)} hint="Not yet delivered" />
            <Count label="Board" value={String(road)} hint="Open road freight" />
            <Count label="Reputation" value={String(company.rep)} hint="1 to 100" />
          </dl>
          <section className="border border-ink/10">
            <h2 className="border-b border-ink/10 px-3 py-2 text-xs uppercase tracking-widest text-ink/45">Moving now</h2>
            {movingTrips.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink/60">Nothing is on the road.</p>
            ) : (
              <ul>
                {movingTrips.map((trip) => {
                  const done = trip.vehicle.routeMiles > 0 ? Math.min(100, (trip.vehicle.traveled / trip.vehicle.routeMiles) * 100) : 0;
                  return (
                    <li key={trip.vehicle.id} className="border-t border-ink/10 px-3 py-2 first:border-0">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {trip.driverName ?? "No driver"}
                          <span className="text-ink/50"> · {trip.heading}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-ink/70">{Math.max(1, Math.round(trip.milesLeft)).toLocaleString("en-US")} mi</span>
                      </div>
                      <div className="mt-1.5 h-2 bg-ink/10">
                        <div className="h-2 bg-pine" style={{ width: `${done}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <Log />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="quiet"
              onClick={() => {
                const blob = new Blob([exportSave()], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "practical-miles.json";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="size-4" aria-hidden />
              Export
            </Button>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-ink/20 px-4 text-sm font-semibold uppercase tracking-wide hover:bg-ink/10">
              <Upload className="size-4" aria-hidden />
              Import
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setNote(importSave(String(reader.result ?? "")));
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
          <Notice text={note} />
        </div>
      </div>
    </Frame>
  );
}

function Count({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="border-ink/10 p-3 odd:border-r">
      <dt className="text-[10px] uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className="font-display text-2xl leading-none tabular-nums">{value}</dd>
      <p className="mt-1 text-xs text-ink/55">{hint}</p>
    </div>
  );
}
