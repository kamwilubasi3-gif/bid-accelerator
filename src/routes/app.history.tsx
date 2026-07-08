import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { downloadTextAsPdf } from "@/lib/tender-utils";
import { Download, FileText, Calculator, BookOpen } from "lucide-react";

export const Route = createFileRoute("/app/history")({ component: HistoryPage });

function HistoryPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["proposals", user?.uid],
    queryFn: async () => {
      const { data } = await supabase.from("proposals").select("*").eq("firebase_uid", user!.uid).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold">History</h1>
        <p className="text-muted-foreground">All documents you've created.</p>
      </div>
      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {q.data && q.data.length === 0 && (
        <div className="glass-card p-10 text-center text-muted-foreground">No documents yet. Start by building a proposal.</div>
      )}
      <div className="grid gap-3">
        {q.data?.map((p) => {
          const Icon = p.type === "technical" ? FileText : p.type === "financial" ? Calculator : BookOpen;
          return (
            <div key={p.id} className="glass-card flex items-center gap-4 p-4">
              <div className="teal-gradient grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.title}</div>
                <div className="text-xs text-muted-foreground">
                  {p.type} · {new Date(p.created_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => downloadTextAsPdf(p.title, p.content ?? "", p.winning_tips ?? undefined)}
                className="flex items-center gap-2 rounded-full bg-primary/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/30"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
