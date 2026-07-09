import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth, planLimits, hasActiveSubscription } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { generateProposal } from "@/lib/ai.functions";
import { readMany, downloadTextAsPdf } from "@/lib/tender-utils";
import { FileText, Upload, Download } from "lucide-react";

export const Route = createFileRoute("/app/technical")({ component: TechnicalPage });

function TechnicalPage() {
  return <ProposalBuilder type="technical" />;
}

export function ProposalBuilder({ type }: { type: "technical" | "financial" }) {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [preparer, setPreparer] = useState(profile?.full_name ?? "");
  const [company, setCompany] = useState(profile?.company_name ?? "");
  const [address, setAddress] = useState(profile?.company_address ?? profile?.address ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [companyProfile, setCompanyProfile] = useState<File[]>([]);
  const [torFiles, setTorFiles] = useState<File[]>([]);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [manualPrices, setManualPrices] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ content: string; winning_tips: string; title: string } | null>(null);

  const active = hasActiveSubscription(profile);
  const plan = active ? profile!.plan : profile?.free_trial_used ? "none" : "trial";
  const limits = planLimits(plan);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (limits.proposals === 0) {
      toast.error("No proposals remaining. Upgrade your plan.");
      return;
    }

    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await supabase.from("daily_usage").select("*").eq("firebase_uid", user.id).eq("usage_date", today).maybeSingle();
      if ((usage?.proposals_count ?? 0) >= limits.proposals) {
        toast.error("Daily limit reached.");
        setBusy(false);
        return;
      }

      const docsText = await readMany([...companyProfile, ...torFiles, ...extraFiles]);
      const extras = type === "financial" ? `Manual price list:\n${manualPrices}\n${description}` : description;

      const { content, winning_tips } = await generateProposal({
        data: {
          type, model: limits.model, preparer, company, address, phone,
          docsText, extras, withTips: !!limits.tips,
        },
      });

      const title = `${type === "technical" ? "Technical" : "Financial"} Proposal — ${company || preparer}`;

      await supabase.from("proposals").insert({
        firebase_uid: user.id, type, title, content, winning_tips,
      });

      if (usage) {
        await supabase.from("daily_usage").update({ proposals_count: (usage.proposals_count ?? 0) + 1 }).eq("id", usage.id);
      } else {
        await supabase.from("daily_usage").insert({ firebase_uid: user.id, usage_date: today, proposals_count: 1 });
      }

      if (plan === "trial") {
        await supabase.from("profiles").update({ free_trial_used: true }).eq("firebase_uid", user.id);
        await refreshProfile();
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["proposals-count", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["usage-today", user.id, today] }),
        queryClient.invalidateQueries({ queryKey: ["proposals", user.id] }),
      ]);

      setResult({ content, winning_tips, title });
      toast.success("Proposal generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="teal-gradient grid h-12 w-12 place-items-center rounded-xl">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Build {type === "technical" ? "Technical" : "Financial"} Proposal</h1>
          <p className="text-sm text-muted-foreground">Fill the details and attach documents. AI does the rest.</p>
        </div>
      </div>

      <form onSubmit={submit} className="glass-card space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name of preparer" value={preparer} onChange={setPreparer} required />
          <Field label="Name of company" value={company} onChange={setCompany} required />
          <Field label="Address" value={address} onChange={setAddress} />
          <Field label="Phone" value={phone} onChange={setPhone} />
        </div>

        {type === "technical" ? (
          <>
            <FileDrop label="Attach company profile" files={companyProfile} onChange={setCompanyProfile} />
            <FileDrop label="Attach TOR & other bid documents" files={torFiles} onChange={setTorFiles} />
            <FileDrop label="Other documents (TPIN, registration, etc.)" files={extraFiles} onChange={setExtraFiles} />
          </>
        ) : (
          <>
            <FileDrop label="Attach quotation (optional)" files={torFiles} onChange={setTorFiles} />
            <div>
              <label className="mb-1 block text-sm font-medium">Or enter prices manually</label>
              <textarea value={manualPrices} onChange={(e) => setManualPrices(e.target.value)} placeholder="e.g. Consultancy - 50 hrs @ K500/hr = K25,000" rows={5} className="w-full rounded-lg border border-border bg-input p-3 text-sm outline-none focus:border-primary" />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Short description to guide the AI (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-input p-3 text-sm outline-none focus:border-primary" />
        </div>

        <button disabled={busy} className="teal-gradient teal-glow w-full rounded-full py-3 font-semibold disabled:opacity-60">
          {busy ? "Generating with AI…" : `Generate ${type === "technical" ? "Technical" : "Financial"} Proposal`}
        </button>
      </form>

      {result && (
        <div className="glass-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">{result.title}</h3>
            <button onClick={() => downloadTextAsPdf(result.title, result.content, result.winning_tips || undefined)} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Download className="h-4 w-4" /> Download PDF
            </button>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-background/50 p-4 text-sm">{result.content}</pre>
          {result.winning_tips && (
            <div>
              <h4 className="font-semibold text-primary">🏆 How to win this contract</h4>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-background/50 p-4 text-sm">{result.winning_tips}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary" />
    </label>
  );
}

export function FileDrop({ label, files, onChange }: { label: string; files: File[]; onChange: (f: File[]) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary">
        <Upload className="h-5 w-5" />
        <span>{files.length > 0 ? `${files.length} file(s) selected` : "Click or drop files here (from computer or phone)"}</span>
        <input type="file" multiple className="hidden" onChange={(e) => onChange(Array.from(e.target.files ?? []))} />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {files.map((f) => <li key={f.name}>· {f.name}</li>)}
        </ul>
      )}
    </div>
  );
}
