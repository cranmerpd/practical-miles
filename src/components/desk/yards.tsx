import { useState } from "react";
import { labelPlace } from "@/game/geo";
import { money } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Dispatch } from "@/components/desk/dispatch";
import { Notice, Panel, cubes, pounds, useWorld } from "@/components/desk/bits";

export function Yards() {
  const { world, company } = useWorld();
  const buyWarehouse = useDesk((s) => s.buyWarehouse);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;

  return (
    <div className="space-y-4">
      <Dispatch />
      <Panel title="Buildings for sale" kicker="Expand">
        {world.yardOffers.length === 0 ? (
          <p className="text-sm text-ink/70">Offers show up once the company is open. Rural buildings start lower. Big cities cost more.</p>
        ) : (
          <ul className="space-y-4">
            {world.yardOffers.map((offer) => (
              <li key={offer.id} className="space-y-2 border-b border-ink/10 pb-4 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{labelPlace(offer.zip)}</p>
                  <p className="tabular-nums font-semibold">{money(offer.price)}</p>
                </div>
                <p className="text-sm text-ink/70">
                  Holds {pounds(offer.payloadCap)} and {cubes(offer.cubeCap)}. Hiring opens here when you buy it.
                </p>
                <Button disabled={company.cash < offer.price} onClick={() => setNote(buyWarehouse(offer.id))}>
                  Buy warehouse
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Notice text={note} />
      </Panel>
    </div>
  );
}
