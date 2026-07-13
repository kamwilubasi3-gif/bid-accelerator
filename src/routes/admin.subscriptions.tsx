import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/subscriptions")({ component: AdminSubs });

function AdminSubs() {
  const paymentsQuery = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black">Subscriptions & Payments</h2>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-background/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {paymentsQuery.data?.map((p) => (
              <tr key={p.id} className="border-t border-border/60">
                <td className="px-4 py-3">{new Date(p.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.firebase_uid.slice(0, 8)}…</td>
                <td className="px-4 py-3 font-semibold uppercase">{p.plan}</td>
                <td className="px-4 py-3">K{p.amount}</td>
                <td className="px-4 py-3 uppercase">{p.provider ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "COMPLETED" ? "bg-primary/10 text-primary" : p.status === "FAILED" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>{p.status}</span>
                </td>
              </tr>
            ))}
            {paymentsQuery.data && paymentsQuery.data.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No payments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
