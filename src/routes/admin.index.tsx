import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Ban, Unlock, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminUsers });

function AdminUsers() {
  const qc = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; firebase_uid: string; email: string; full_name: string | null; phone: string | null; plan: string; plan_expires_at: string | null; blocked: boolean | null; created_at: string }>;
    },
  });

  const toggleBlock = async (uid: string, current: boolean | null) => {
    const { error } = await supabase.from("profiles").update({ blocked: !current } as never).eq("firebase_uid", uid);
    if (error) toast.error(error.message);
    else { toast.success(!current ? "User blocked" : "User unblocked"); void qc.invalidateQueries({ queryKey: ["admin-users"] }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-black">Users</h2>
        <div className="text-sm text-muted-foreground">{usersQuery.data?.length ?? 0} total</div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-background/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.data?.map((u) => (
              <tr key={u.id} className="border-t border-border/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-accent"><UserIcon className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.full_name ?? "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold uppercase">{u.plan}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">
                  {u.blocked ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">BLOCKED</span> : <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">ACTIVE</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleBlock(u.firebase_uid, u.blocked)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${u.blocked ? "border-primary text-primary" : "border-destructive text-destructive"}`}>
                    {u.blocked ? <><Unlock className="h-3.5 w-3.5" /> Unblock</> : <><Ban className="h-3.5 w-3.5" /> Block</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
