import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/desk/bits";
import { Frame } from "@/components/desk/desk";
import { Road } from "@/components/desk/road";

export const Route = createFileRoute("/_desk/road")({
  component: RoadPage,
});

function RoadPage() {
  return (
    <Frame>
      <PageTitle kicker="In transit" title="Road" note="Miles left, whether the dock is open, and whether fuel eats the pay." />
      <Road />
    </Frame>
  );
}
