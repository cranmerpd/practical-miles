import { useState } from "react";
import { labelPlace } from "@/game/geo";
import { money, yardPrice } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Dispatch } from "@/components/desk/dispatch";
import { Notice, Panel, PlaceSearch, cubes, pounds, useWorld } from "@/components/desk/bits";

export function Yards() {
  const { company } = useWorld();
  const buildWarehouse = useDesk((s) => s.buildWarehouse);
  const [zip, setZip] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;
  const quote = zip ? yardPrice(zip) : null;
  const owned = quote ? company.warehouses.some((yard) => yard.zip === quote.zip) : false;

  return (
    <div className="space-y-4">
      <Dispatch />
      <Panel title="Build a warehouse" kicker="Expand">
        <p className="text-sm text-ink/70">Any ZIP on the map. A busier hub costs more and holds more freight. Hiring opens there when the building is yours.</p>
        <div className="mt-3">
          <PlaceSearch label="Where" onPick={setZip} />
        </div>
        {quote ? (
          <div className="mt-3 space-y-2">
            <p className="font-medium">{labelPlace(quote.zip)}</p>
            <p className="text-sm text-ink/70">
              {money(quote.price)} · holds {pounds(quote.payloadCap)} and {cubes(quote.cubeCap)}.
            </p>
            <Button disabled={owned || company.cash < quote.price} onClick={() => setNote(buildWarehouse(quote.zip))}>
              {owned ? "You already have this ZIP" : "Build warehouse"}
            </Button>
          </div>
        ) : null}
        <Notice text={note} />
      </Panel>
    </div>
  );
}