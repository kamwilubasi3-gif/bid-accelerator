import { createFileRoute, Link } from "@tanstack/react-router";
import { FileSignature, LogIn } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tender Pro — AI Technical & Financial Bid Proposals" },
      { name: "description", content: "Win more contracts. Draft winning technical and financial bid proposals with AI in minutes." },
      { property: "og:title", content: "Tender Pro" },
      { property: "og:description", content: "AI-powered bid & tender proposal builder for Zambia." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--teal-glow)_0%,transparent_50%)] opacity-20" />
        <div className="absolute -left-32 top-40 h-96 w-96 rounded-full bg-teal/20 blur-3xl" style={{ background: "oklch(0.78 0.14 200 / 0.25)" }} />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl" style={{ background: "oklch(0.65 0.13 220 / 0.25)" }} />
      </div>

      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="teal-gradient grid h-9 w-9 place-items-center rounded-lg">TP</span>
          Tender Pro
        </div>
        <Link
          to="/auth"
          search={{ mode: "login" }}
          className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm hover:bg-card"
        >
          <LogIn className="h-4 w-4" /> Login
        </Link>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-10 px-6 pt-16 pb-24 text-center">
        <span className="rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground">
          AI-powered bid proposals
        </span>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
          Win more <span className="teal-gradient bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-teal)", WebkitBackgroundClip: "text", color: "transparent" }}>tenders</span>.
          <br />Draft in minutes.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Build professional technical and financial proposals, summarize complex tender documents, and get insider tips on how to win — powered by AI.
        </p>
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="teal-gradient teal-glow flex items-center gap-3 rounded-full px-10 py-4 text-lg font-semibold transition-transform hover:scale-105"
        >
          <FileSignature className="h-5 w-5" />
          Get Started
        </Link>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { t: "Technical Proposals", d: "AI drafts full TOR-compliant technical proposals." },
            { t: "Financial Proposals", d: "Priced quotations & compliant financial submissions." },
            { t: "Learn About Bid", d: "Instant summaries of tender documents." },
          ].map((f) => (
            <div key={f.t} className="glass-card p-6 text-left">
              <h3 className="text-lg font-semibold text-primary">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
