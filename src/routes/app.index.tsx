import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth, planLimits, hasActiveSubscription, PLANS } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calculator, BookOpen, ArrowUpRight, Download, SlidersHorizontal } from "lucide-react";
import handshake from "@/assets/handshake-hero.jpg";

export const Route = createFileRoute("/app/")({ component: HomePage });

function HomePage() {
  const { user, profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["proposals-count", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["usage-today", user.id, today] });
      void queryClient.invalidateQueries({ queryKey: ["proposals", user.id] });
    };
    const ch = supabase.channel(`home-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_usage", filter: `firebase_uid=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "proposals", filter: `firebase_uid=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [queryClient, today, user]);

  const totalQuery = useQuery({
    queryKey: ["proposals-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from("proposals").select("*", { count: "exact", head: true }).eq("firebase_uid", user.id).in("type", ["technical","financial"]);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const todayQuery = useQuery({
    queryKey: ["usage-today", user?.id, today],
    queryFn: async () => {
      if (!user) return { proposals_count: 0, summaries_count: 0 };
      const { data } = await supabase.from("daily_usage").select("*").eq("firebase_uid", user.id).eq("usage_date", today).maybeSingle();
      return data ?? { proposals_count: 0, summaries_count: 0 };
    },
    enabled: !!user,
  });

  const recentQuery = useQuery({
    queryKey: ["proposals", user?.id, "recent"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("proposals").select("id,title,type,created_at").eq("firebase_uid", user.id).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const active = hasActiveSubscription(profile, isAdmin);
  const plan = isAdmin ? "admin" : active ? profile!.plan : profile?.free_trial_used ? "none" : "trial";
  const limits = planLimits(plan, isAdmin);
  const proposalsUsed = todayQuery.data?.proposals_count ?? 0;
  const summariesUsed = todayQuery.data?.summaries_count ?? 0;
  const remainingProposals = Math.max(0, limits.proposals - proposalsUsed);
  const remainingSummaries = Math.max(0, limits.summaries - summariesUsed);
  const planName = isAdmin ? "ADMIN" : active ? (PLANS[profile!.plan as keyof typeof PLANS]?.name ?? profile!.plan.toUpperCase()) : plan === "trial" ? "FREE TRIAL" : "NO PLAN";

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:p-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Tender Pro<br />Proposal Overview
            </h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">// {profile?.company_name ?? "YOUR COMPANY"} · {new Date().toLocaleDateString("en", { month: "long", year: "numeric" }).toUpperCase()}</p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <MetricLarge label="Total Proposals" value={String(totalQuery.data ?? 0)} unit="docs" delta="+18.4% vs last week" />
              <MetricLarge label="Today's Left" value={String(remainingProposals)} unit={`/${limits.proposals}`} delta="Proposals" />
              <MetricLarge label="Summaries" value={String(remainingSummaries)} unit={`/${limits.summaries}`} delta="+5.2%" />
            </div>
          </div>
          <div className="relative -mx-6 -my-6 md:-my-8 md:-mr-8">
            <img src={handshake} alt="" className="h-full min-h-56 w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
          <button className="rounded-full bg-foreground px-4 py-1.5 text-background">Overview</button>
          <button className="rounded-full px-4 py-1.5 text-muted-foreground">Recent</button>
          <button className="rounded-full px-4 py-1.5 text-muted-foreground">Insights</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card"><SlidersHorizontal className="h-4 w-4" /></button>
          <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card"><Download className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Actions grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard to="/app/technical" icon={FileText} title="Technical Proposal" desc="TOR-compliant methodology, work plan, team." />
        <ActionCard to="/app/financial" icon={Calculator} title="Financial Proposal" desc="Priced line items and payment schedules." />
        <ActionCard to="/app/learn" icon={BookOpen} title="Learn About a Bid" desc="Structured summary of any tender." />
      </div>

      {/* Bottom row: Recent + Plan */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent Documents</h3>
            <Link to="/app/history" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentQuery.data && recentQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing yet. Your first proposal takes minutes.</p>
            )}
            {recentQuery.data?.map((p) => {
              const Icon = p.type === "technical" ? FileText : p.type === "financial" ? Calculator : BookOpen;
              return (
                <Link key={p.id} to="/app/history" className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-3 transition hover:border-primary/60">
                  <div className="teal-gradient grid h-9 w-9 shrink-0 place-items-center rounded-lg"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.type} · {new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold">Plan</h3>
          <div className="mt-2 text-2xl font-black">{planName}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin ? "Unlimited access as administrator." : active ? "Your subscription is active." : "Upgrade to unlock daily proposals."}
          </p>
          {!isAdmin && (
            <Link to="/app/subscribe" className="teal-gradient teal-glow mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold">
              {active ? "Manage" : "Upgrade"} <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricLarge({ label, value, unit, delta }: { label: string; value: string; unit: string; delta: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-black md:text-4xl">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-1 text-[11px] text-primary">{delta}</div>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, desc }: { to: string; icon: React.ElementType; title: string; desc: string }) {
  return (
    <Link to={to} className="group rounded-2xl border border-border bg-card p-5 transition hover:teal-glow hover:border-primary/60">
      <div className="flex items-start justify-between">
        <div className="teal-gradient grid h-10 w-10 place-items-center rounded-xl"><Icon className="h-5 w-5" /></div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
