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
      <PageTitle kicker="People" title="Crew" />
      <Crew />
    </Frame>
  );
}
