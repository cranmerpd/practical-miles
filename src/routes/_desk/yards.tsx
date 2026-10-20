import { createFileRoute } from "@tanstack/react-router";
import { Frame } from "@/components/desk/desk";
import { Yards } from "@/components/desk/yards";

export const Route = createFileRoute("/_desk/yards")({
  component: YardsPage,
});

function YardsPage() {
  return (
    <Frame>
      <Yards />
    </Frame>
  );
}
