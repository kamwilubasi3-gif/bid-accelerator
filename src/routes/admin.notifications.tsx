import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Send, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({ component: AdminNotif });

function AdminNotif() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const listQuery = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications" as never).select("*").order("created_at", { ascending: false }).limit(50);
      return (data ?? []) as Array<{ id: string; title: string; body: string; target_user_id: string | null; created_at: string }>;
    },
  });

  const send = async () => {
    if (!user || !title.trim() || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("notifications" as never).insert({ title, body, created_by: user.id, target_user_id: null } as never);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Broadcast sent"); setTitle(""); setBody(""); void qc.invalidateQueries({ queryKey: ["admin-notifications"] }); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("notifications" as never).delete().eq("id", id);
    if (error) toast.error(error.message); else void qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Broadcast Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Messages appear in real time as a toast for every signed-in user.</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body…" rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <button disabled={busy || !title.trim() || !body.trim()} onClick={send} className="teal-gradient teal-glow inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
          <Send className="h-4 w-4" /> Send broadcast
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Sent</h3>
        {listQuery.data?.map((n) => (
          <div key={n.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{n.title}</span>
                <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
            </div>
            <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {listQuery.data && listQuery.data.length === 0 && <p className="text-sm text-muted-foreground">No broadcasts yet.</p>}
      </div>
    </div>
  );
}
