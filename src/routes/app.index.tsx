import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth, planLimits, hasActiveSubscription, PLANS } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calculator, BookOpen, Sparkles, TrendingUp, Zap, ArrowRight, Crown } from "lucide-react";
import handshake from "@/assets/handshake-hero.jpg";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

function HomePage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    const refreshCounters = () => {
      void queryClient.invalidateQueries({ queryKey: ["proposals-count", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["usage-today", user.id, today] });
      void queryClient.invalidateQueries({ queryKey: ["proposals", user.id] });
    };
    const channel = supabase
      .channel(`home-counters-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_usage", filter: `firebase_uid=eq.${user.id}` }, refreshCounters)
      .on("postgres_changes", { event: "*", schema: "public", table: "proposals", filter: `firebase_uid=eq.${user.id}` }, refreshCounters)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, today, user]);

  const totalQuery = useQuery({
    queryKey: ["proposals-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("proposals")
        .select("*", { count: "exact", head: true })
        .eq("firebase_uid", user.id)
        .in("type", ["technical", "financial"]);
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
      const { data } = await supabase
        .from("proposals")
        .select("id,title,type,created_at")
        .eq("firebase_uid", user.id)
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
    enabled: !!user,
  });

  const active = hasActiveSubscription(profile);
  const plan = active ? profile!.plan : profile?.free_trial_used ? "none" : "trial";
  const limits = planLimits(plan);
  const proposalsUsed = todayQuery.data?.proposals_count ?? 0;
  const summariesUsed = todayQuery.data?.summaries_count ?? 0;
  const remainingProposals = Math.max(0, limits.proposals - proposalsUsed);
  const remainingSummaries = Math.max(0, limits.summaries - summariesUsed);

  const planName = active ? (PLANS[profile!.plan as keyof typeof PLANS]?.name ?? profile!.plan.toUpperCase()) : plan === "trial" ? "FREE TRIAL" : "NO PLAN";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <section className="glass-card relative overflow-hidden">
        <img src={handshake} alt="" width={1600} height={900} className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="relative grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {planName}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Draft. Sign. Win. Build a TOR-compliant proposal in minutes and close your next contract with confidence.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/app/technical" className="teal-gradient teal-glow inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
                New Proposal <ArrowRight className="h-4 w-4" />
              </Link>
              {!active && (
                <Link to="/app/subscribe" className="inline-flex items-center gap-2 rounded-full border border-primary/60 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10">
                  <Crown className="h-4 w-4" /> Upgrade
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total proposals" value={String(totalQuery.data ?? 0)} />
        <StatCard icon={Zap} label="Proposals left today" value={`${remainingProposals}/${limits.proposals}`} progress={limits.proposals ? proposalsUsed / limits.proposals : 0} />
        <StatCard icon={BookOpen} label="Summaries left today" value={`${remainingSummaries}/${limits.summaries}`} progress={limits.summaries ? summariesUsed / limits.summaries : 0} />
        <StatCard icon={TrendingUp} label="Plan" value={planName} />
      </div>

      {/* Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard to="/app/technical" icon={FileText} title="Technical Proposal" desc="TOR-compliant technical response with methodology, work plan and team." tint="from-primary/25" />
        <ActionCard to="/app/financial" icon={Calculator} title="Financial Proposal" desc="Priced submissions with line items, assumptions & payment schedules." tint="from-primary/20" />
        <ActionCard to="/app/learn" icon={BookOpen} title="Learn About a Bid" desc="Drop a tender and get a structured summary of what really matters." tint="from-primary/15" />
      </div>

      {/* Recent + Help */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recent documents</h3>
            <Link to="/app/history" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="mt-4 space-y-2">
            {recentQuery.data && recentQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing yet. Your first proposal takes minutes.</p>
            )}
            {recentQuery.data?.map((p) => {
              const Icon = p.type === "technical" ? FileText : p.type === "financial" ? Calculator : BookOpen;
              return (
                <Link key={p.id} to="/app/history" className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition hover:border-primary/60 hover:bg-primary/5">
                  <div className="teal-gradient grid h-9 w-9 shrink-0 place-items-center rounded-lg">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.type} · {new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold">Need help?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Chat with us on WhatsApp — bottom-right of your screen. We reply fast.
          </p>
          <a href="mailto:chishimbainnovation@gmail.com" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            chishimbainnovation@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, progress }: { icon: React.ElementType; label: string; value: string; progress?: number }) {
  const pct = Math.min(100, Math.max(0, (progress ?? 0) * 100));
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-bold">{value}</div>
        </div>
        <div className="teal-gradient grid h-10 w-10 shrink-0 place-items-center rounded-xl">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="teal-gradient h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, desc, tint }: { to: string; icon: React.ElementType; title: string; desc: string; tint: string }) {
  return (
    <Link to={to} className={`glass-card group relative overflow-hidden p-6 transition hover:teal-glow`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tint} to-transparent opacity-60`} />
      <div className="relative">
        <div className="teal-gradient grid h-12 w-12 place-items-center rounded-2xl transition group-hover:scale-110">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          Start <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
