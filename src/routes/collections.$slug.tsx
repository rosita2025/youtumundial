import { createFileRoute } from "@tanstack/react-router";
import Collection from "@/components/pages/Collection";

export const Route = createFileRoute("/collections/$slug")({
  component: Collection,
});
