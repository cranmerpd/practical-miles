import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { MapBoard } from "@/components/desk/map-board";
import { Frame, Log } from "@/components/desk/desk";
import { Notice, PageTitle, useWorld } from "@/components/desk/bits";
import { useDesk } from "@/game/store";
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

  return (
    <Frame>
      <PageTitle kicker="Operations" title="Map" note="Where the trucks are. The counts under the map are the company. The notes are what just happened." />
      <MapBoard route={null} />
      <dl className="grid grid-cols-2 border border-ink/10 sm:grid-cols-4">
        <Count label="Trucks" value={String(company.vehicles.length)} hint={moving === 0 ? "All parked" : `${moving} moving`} />
        <Count label="Drivers" value={String(company.drivers.length)} hint={company.drivers.length === 0 ? "None hired" : "On the roster"} />
        <Count label="Yards" value={String(company.warehouses.length)} hint={stored === 0 ? "No freight stored" : `${stored} stored`} />
        <Count label="Loads" value={String(active)} hint={`${road} on the board`} />
      </dl>
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
    </Frame>
  );
}

function Count({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="border-ink/10 p-4 sm:border-l sm:first:border-l-0">
      <dt className="text-xs uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className="font-display text-5xl leading-none tabular-nums">{value}</dd>
      <p className="mt-2 text-sm text-ink/55">{hint}</p>
    </div>
  );
}
