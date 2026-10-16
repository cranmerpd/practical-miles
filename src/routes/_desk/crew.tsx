import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/desk/bits";
import { Frame } from "@/components/desk/desk";
import { Crew } from "@/components/desk/crew";

export const Route = createFileRoute("/_desk/crew")({
  component: CrewPage,
});

function CrewPage() {
  return (
    <Frame>
      <PageTitle kicker="People" title="Staff" note="Hours left on the clock. A driver at a warehouse can take a 10-hour break. Hiring is separate from the roster." />
      <Crew />
    </Frame>
  );
}
