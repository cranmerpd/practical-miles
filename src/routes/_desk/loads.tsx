import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { MapPoint } from "@/game/geo";
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
      {route ? <MapBoard route={route} /> : null}
      <Loads onRoute={onRoute} />
    </Frame>
  );
}
