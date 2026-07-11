import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth, PLANS, type PlanId } from "@/lib/auth-context";
import { initiateDeposit, checkDeposit } from "@/lib/pawapay.functions";
import { supabase } from "@/integrations/supabase/client";
import { Check, CreditCard, Smartphone, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/subscribe")({ component: SubscribePage });

function SubscribePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PlanId | null>("pro");
  const [provider, setProvider] = useState<"airtel" | "mtn" | "zamtel">("airtel");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"idle" | "prompt" | "polling" | "success">("idle");
  const activeDepositRef = useRef<string | null>(null);

  const tryFree = async () => {
    if (!user) return;
    navigate({ to: "/app" });
  };

  // Realtime: the moment the webhook flips profile.plan_expires_at we succeed.
  useEffect(() => {
    if (!user || step !== "polling") return;
    const ch = supabase
      .channel(`sub-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `firebase_uid=eq.${user.id}` }, async (payload) => {
        const next = payload.new as { plan?: string; plan_expires_at?: string | null };
        if (next.plan && next.plan !== "none" && next.plan_expires_at && new Date(next.plan_expires_at) > new Date()) {
          await refreshProfile();
          setStep("success");
          toast.success("Subscription active! 🎉");
          setTimeout(() => navigate({ to: "/app" }), 1200);
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, step, refreshProfile, navigate]);

  const pay = async () => {
    if (!user || !selected || busy) return; // guard double-clicks
    setBusy(true);
    setStep("prompt");
    try {
      const { depositId } = await initiateDeposit({ data: { plan: selected, provider, phone } });
      activeDepositRef.current = depositId;
      toast.success("Check your phone — enter your Mobile Money PIN once");
      setStep("polling");

      // Backup poll every 3s in case the webhook is delayed. Auto-stops on success/failure.
      let tries = 0;
      const poll = async () => {
        if (activeDepositRef.current !== depositId) return; // superseded/cancelled
        tries++;
        try {
          const { status } = await checkDeposit({ data: { depositId } });
          if (status === "COMPLETED") {
            await refreshProfile();
            setStep("success");
            toast.success("Payment confirmed 🎉");
            activeDepositRef.current = null;
            setTimeout(() => navigate({ to: "/app" }), 1200);
            return;
          }
          if (status === "FAILED" || status === "REJECTED") {
            toast.error(`Payment ${status}. Please try again.`);
            activeDepositRef.current = null;
            setStep("idle");
            setBusy(false);
            return;
          }
        } catch {
          /* transient — keep polling */
        }
        if (tries > 40) {
          toast.error("Timed out waiting for payment. If you already paid, refresh in a minute.");
          activeDepositRef.current = null;
          setStep("idle");
          setBusy(false);
          return;
        }
        setTimeout(poll, 3000);
      };
      setTimeout(poll, 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
      setStep("idle");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-1">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold">Subscriptions</h1>
        <p className="mt-2 text-muted-foreground">Unlock winning proposals. Monthly billing in ZMW.</p>
      </div>

      {!profile?.free_trial_used && (
        <div className="glass-card flex flex-col items-center justify-between gap-4 border-2 border-primary/40 p-6 md:flex-row">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold">Try for free</h3>
              <p className="text-sm text-muted-foreground">Make 1 document — no card required.</p>
            </div>
          </div>
          <button onClick={tryFree} className="rounded-full border border-primary px-6 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
            Start free trial
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, p]) => {
          const highlight = id === "pro";
          const isSelected = selected === id;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`glass-card p-6 text-left transition ${
                isSelected ? "border-primary teal-glow" : "hover:border-primary/50"
              } ${highlight ? "md:scale-[1.03]" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-primary">{p.name}</div>
                {highlight && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">MOST POPULAR</span>}
              </div>
              <div className="mt-2 text-4xl font-bold">
                K{p.price}<span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="min-w-0">{f}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="glass-card space-y-4 p-6">
          <h3 className="text-xl font-semibold">Pay for {PLANS[selected].name} — K{PLANS[selected].price}</h3>
          <div>
            <div className="mb-2 text-sm font-medium">Payment method</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {(["airtel", "mtn", "zamtel"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold ${
                    provider === p ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <Smartphone className="h-4 w-4" /> {p.toUpperCase()}
                </button>
              ))}
              <div className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm text-muted-foreground opacity-60">
                <CreditCard className="h-4 w-4" /> Card (down)
              </div>
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Mobile Money phone number</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0977xxxxxx"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <button
            disabled={busy || !phone || step === "success"}
            onClick={pay}
            className="teal-gradient teal-glow w-full rounded-full py-3 font-semibold disabled:opacity-60"
          >
            {step === "success"
              ? "Payment confirmed ✓"
              : step === "prompt"
              ? "Sent to your phone…"
              : step === "polling"
              ? "Waiting for confirmation…"
              : `Pay K${PLANS[selected].price}`}
          </button>
          {step === "polling" && (
            <p className="text-center text-xs text-muted-foreground">
              Enter your PIN on your phone. This page will update the instant PawaPay confirms — you won't be prompted again.
            </p>
          )}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Questions? Email us at <a className="text-primary underline" href="mailto:chishimbainnovation@gmail.com">chishimbainnovation@gmail.com</a>
      </p>
    </div>
  );
}

