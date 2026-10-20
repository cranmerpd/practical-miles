import { createFileRoute } from "@tanstack/react-router";
import { Frame } from "@/components/desk/desk";
import { Fleet } from "@/components/desk/fleet";

export const Route = createFileRoute("/_desk/fleet")({
  component: FleetPage,
});

function FleetPage() {
  return (
    <Frame>
      <Fleet />
    </Frame>
  );
}
