import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { MapPoint } from "@/game/geo";
import { PageTitle } from "@/components/desk/bits";
import { Frame } from "@/components/desk/desk";
import { Loads } from "@/components/desk/loads";
import { MapBoard } from "@/components/desk/map-board";

export const Route = createFileRoute("/_desk/loads")({
  component: LoadsPage,
});

function LoadsPage() {
  const [route, setRoute] = useState<MapPoint[] | null>(null);
  const onRoute = useCallback((points: MapPoint[] | null) => setRoute(points), []);
  return (
    <Frame>
      <PageTitle kicker="Dispatch" title="Loads" />
      {route ? <MapBoard route={route} /> : null}
      <Loads onRoute={onRoute} />
    </Frame>
  );
}
