import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tender Pro — AI Technical & Financial Bid Proposals" },
      { name: "description", content: "Win more contracts. Draft winning technical and financial bid proposals with AI in minutes." },
      { property: "og:title", content: "Tender Pro — AI Technical & Financial Bid Proposals" },
      { property: "og:description", content: "Win more contracts. Draft winning technical and financial bid proposals with AI in minutes." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/auth", search: { mode: "login" } });
  },
  component: () => null,
});
