import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth, planLimits, hasActiveSubscription } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { summarizeBid } from "@/lib/ai.functions";
import { readMany, downloadTextAsPdf, downloadTextAsWord } from "@/lib/tender-utils";
import { FileDrop } from "./app.technical";
import { BookOpen, Download, Lock, FileType, Eye } from "lucide-react";
import { DocumentPreview } from "@/components/DocumentPreview";

export const Route = createFileRoute("/app/learn")({ component: LearnPage });

function LearnPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [preview, setPreview] = useState(false);

  const active = hasActiveSubscription(profile);
  const plan = active ? profile!.plan : profile?.free_trial_used ? "none" : "trial";
  const limits = planLimits(plan);
  const locked = !summary && limits.summaries === 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || files.length === 0) return;
    if (limits.summaries === 0) return toast.error("No summaries remaining. Upgrade your plan.");
    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await supabase.from("daily_usage").select("*").eq("firebase_uid", user.id).eq("usage_date", today).maybeSingle();
      if ((usage?.summaries_count ?? 0) >= limits.summaries) {
        toast.error("Daily limit reached.");
        setBusy(false);
        return;
      }
      const docsText = await readMany(files);
      const { summary: s } = await summarizeBid({ data: { model: limits.model, docsText } });
      setSummary(s);
      await supabase.from("proposals").insert({
        firebase_uid: user.id, type: "summary",
        title: `Bid Summary — ${files[0]?.name ?? "documents"}`,
        content: s,
      });
      if (usage) {
        await supabase.from("daily_usage").update({ summaries_count: (usage.summaries_count ?? 0) + 1 }).eq("id", usage.id);
      } else {
        await supabase.from("daily_usage").insert({ firebase_uid: user.id, usage_date: today, summaries_count: 1 });
      }
      if (plan === "trial") {
        await supabase.from("profiles").update({ free_trial_used: true }).eq("firebase_uid", user.id);
        await refreshProfile();
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["usage-today", user.id, today] }),
        queryClient.invalidateQueries({ queryKey: ["proposals", user.id] }),
      ]);
      setSummary(s);
      setPreview(true);
      toast.success("Summary ready");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="teal-gradient grid h-12 w-12 place-items-center rounded-xl">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Learn About Bid</h1>
          <p className="text-sm text-muted-foreground">Upload tender documents and get a fast, structured summary.</p>
        </div>
      </div>

      {locked && (
        <div className="glass-card space-y-3 p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Subscribe to summarize more bids</h2>
          <p className="text-muted-foreground">You've used your free trial. Choose a plan to continue.</p>
          <Link to="/app/subscribe" className="teal-gradient teal-glow inline-block rounded-full px-6 py-2.5 text-sm font-semibold">See plans</Link>
        </div>
      )}

      {!locked && (
      <form onSubmit={submit} className="glass-card space-y-4 p-6">
        <FileDrop label="Attach bid / tender documents" files={files} onChange={setFiles} />
        <button disabled={busy || files.length === 0} className="teal-gradient teal-glow w-full rounded-full py-3 font-semibold disabled:opacity-60">
          {busy ? "Analyzing…" : "Summarize"}
        </button>
      </form>
      )}

      {summary && (
        <div className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold">Summary</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setPreview(true)} className="flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/25">
                <Eye className="h-4 w-4" /> Preview
              </button>
              <button onClick={() => downloadTextAsPdf("Bid Summary", summary)} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Download className="h-4 w-4" /> PDF
              </button>
              <button onClick={() => downloadTextAsWord("Bid Summary", summary)} className="flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
                <FileType className="h-4 w-4" /> Word
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Your summary is ready. Preview it or download as PDF / Word.</p>
          {(plan === "trial" || plan === "none") && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
              This was your free trial. <Link to="/app/subscribe" className="font-semibold underline">Subscribe</Link> to keep summarizing bids.
            </div>
          )}
        </div>
      )}

      {summary && (
        <DocumentPreview open={preview} onClose={() => setPreview(false)} title="Bid Summary" content={summary} />
      )}
    </div>
  );
}
