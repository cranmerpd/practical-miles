import { createFileRoute } from "@tanstack/react-router";
import { Frame } from "@/components/desk/desk";
import { Crew } from "@/components/desk/crew";

export const Route = createFileRoute("/_desk/crew")({
  component: CrewPage,
});

function CrewPage() {
  return (
    <Frame>
      <Crew />
    </Frame>
  );
}
