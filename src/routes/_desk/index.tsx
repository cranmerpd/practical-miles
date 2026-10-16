import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "@/components/desk/overview";

export const Route = createFileRoute("/_desk/")({
  component: Overview,
});
