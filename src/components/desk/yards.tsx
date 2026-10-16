import { useState } from "react";
import { labelPlace } from "@/game/geo";
import { money, storedUse } from "@/game/sim";
import { useDesk } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Notice, Panel, cubes, pounds, useWorld } from "@/components/desk/bits";

export function Yards() {
  const { world, company } = useWorld();
  const buyWarehouse = useDesk((s) => s.buyWarehouse);
  const sellWarehouse = useDesk((s) => s.sellWarehouse);
  const [note, setNote] = useState<string | null>(null);
  if (!company) return null;

  return (
    <div className="space-y-4">
      <Panel title="Your warehouses">
        <p className="mb-3 text-sm text-ink/70">
          A warehouse holds trucks even when the freight space is full. Space is not reserved. If a truck arrives and the building is full, it keeps going to the customer. The balance is paid only when the customer gets the freight.
        </p>
        <ul className="space-y-4">
          {company.warehouses.map((yard) => {
            const used = storedUse(company, yard.id);
            const sitting = company.shipments.filter((shipment) => shipment.status === "stored" && shipment.warehouseId === yard.id);
            const parked = company.vehicles.filter((vehicle) => vehicle.zip === yard.zip && vehicle.status !== "enroute");
            return (
              <li key={yard.id} className="space-y-2 border-b border-ink/10 pb-4 last:border-0">
                <p className="font-medium">
                  {labelPlace(yard.zip)}
                  {yard.starter ? " · the original building" : ""}
                </p>
                <p className="text-sm text-ink/70">
                  Freight {pounds(used.weight)} of {pounds(yard.payloadCap)} · {cubes(used.cube)} of {cubes(yard.cubeCap)}
                </p>
                <p className="text-sm text-ink/70">{parked.length} parked here.</p>
                {sitting.length > 0 ? (
                  <ul className="text-sm">
                    {sitting.map((shipment) => (
                      <li key={shipment.id}>
                        {labelPlace(shipment.toZip)} still owed a delivery · {pounds(shipment.weight)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink/60">No freight stored. Send a rolling truck here from the board if you want to hold a load.</p>
                )}
                {!yard.starter ? (
                  <Button variant="quiet" onClick={() => setNote(sellWarehouse(yard.id))}>
                    Sell for about {money(Math.round(yard.price * 0.7))}
                  </Button>
                ) : (
                  <p className="text-sm text-ink/60">This first warehouse stays with the company.</p>
                )}
              </li>
            );
          })}
        </ul>
        <Notice text={note} />
      </Panel>
      <Panel title="Buildings for sale">
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
      </Panel>
    </div>
  );
}
