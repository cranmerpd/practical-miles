import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/desk/bits";
import { Frame } from "@/components/desk/desk";
import { Fleet } from "@/components/desk/fleet";

export const Route = createFileRoute("/_desk/fleet")({
  component: FleetPage,
});

function FleetPage() {
  return (
    <Frame>
      <PageTitle kicker="Equipment" title="Fleet" note="Condition, the trip each truck is on, and what it would sell for. Buying is a separate lot." />
      <Fleet />
    </Frame>
  );
}
