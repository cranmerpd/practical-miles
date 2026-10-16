import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/desk/bits";
import { Frame } from "@/components/desk/desk";
import { Yards } from "@/components/desk/yards";

export const Route = createFileRoute("/_desk/yards")({
  component: YardsPage,
});

function YardsPage() {
  return (
    <Frame>
      <PageTitle kicker="Dispatch" title="Warehouse" />
      <Yards />
    </Frame>
  );
}
