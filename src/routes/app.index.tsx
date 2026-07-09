import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth, planLimits, hasActiveSubscription } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calculator, TrendingUp, Zap } from "lucide-react";

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
      const { count } = await supabase.from("proposals").select("*", { count: "exact", head: true }).eq("firebase_uid", user.id);
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

  const active = hasActiveSubscription(profile);
  const plan = active ? profile!.plan : profile?.free_trial_used ? "none" : "trial";
  const limits = planLimits(plan);
  const remaining = Math.max(0, limits.proposals - (todayQuery.data?.proposals_count ?? 0));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Welcome, {profile?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
          <p className="text-muted-foreground">Let's build a winning proposal today.</p>
        </div>
        {!active && (
          <Link to="/app/subscribe" className="teal-gradient rounded-full px-5 py-2 text-sm font-semibold">Upgrade Plan</Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={FileText} label="Total proposals" value={totalQuery.data ?? 0} />
        <StatCard icon={Zap} label="Remaining today" value={`${remaining} / ${limits.proposals}`} />
        <StatCard icon={TrendingUp} label="Current plan" value={active ? profile!.plan.toUpperCase() : "FREE"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard
          to="/app/technical"
          icon={FileText}
          title="Build Technical Proposal"
          desc="Draft a TOR-compliant technical proposal in minutes."
        />
        <ActionCard
          to="/app/financial"
          icon={Calculator}
          title="Build Financial Proposal"
          desc="Create priced financial submissions with AI."
        />
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold">Need help?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat with us on WhatsApp using the button in the bottom right corner. We reply fast.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold">{value}</div>
        </div>
        <div className="teal-gradient grid h-12 w-12 place-items-center rounded-xl">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, desc }: { to: string; icon: React.ElementType; title: string; desc: string }) {
  return (
    <Link to={to} className="glass-card group flex items-center gap-4 p-6 transition hover:teal-glow">
      <div className="teal-gradient grid h-14 w-14 place-items-center rounded-2xl">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
