import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/desk/bits";
import { Frame } from "@/components/desk/desk";
import { Finance } from "@/components/desk/finance";

export const Route = createFileRoute("/_desk/finance")({
  component: FinancePage,
});

function FinancePage() {
  return (
    <Frame>
      <PageTitle kicker="Money" title="Finance" />
      <Finance />
    </Frame>
  );
}
