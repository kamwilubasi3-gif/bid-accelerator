import { createFileRoute } from "@tanstack/react-router";
import { ProposalBuilder } from "./app.technical";

export const Route = createFileRoute("/app/financial")({
  component: () => <ProposalBuilder type="financial" />,
});
