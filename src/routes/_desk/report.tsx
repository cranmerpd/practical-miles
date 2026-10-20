import { createFileRoute } from "@tanstack/react-router";
import { Frame } from "@/components/desk/desk";
import { Report } from "@/components/desk/report";

export const Route = createFileRoute("/_desk/report")({
  component: ReportPage,
});

function ReportPage() {
  return (
    <Frame>
      <Report />
    </Frame>
  );
}
