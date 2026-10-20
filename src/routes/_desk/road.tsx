import { createFileRoute } from "@tanstack/react-router";
import { Frame } from "@/components/desk/desk";
import { Road } from "@/components/desk/road";

export const Route = createFileRoute("/_desk/road")({
  component: RoadPage,
});

function RoadPage() {
  return (
    <Frame>
      <Road />
    </Frame>
  );
}
