import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/desk/bits";
import { Frame } from "@/components/desk/desk";
import { Report } from "@/components/desk/report";

export const Route = createFileRoute("/_desk/report")({
  component: ReportPage,
});

function ReportPage() {
  return (
    <Frame>
      <PageTitle kicker="History" title="Report" note="One card for each delivery, grouped by the day the customer paid." />
      <Report />
    </Frame>
  );
}
