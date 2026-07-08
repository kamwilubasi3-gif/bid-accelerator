import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth, PLANS, type PlanId } from "@/lib/auth-context";
import { initiateDeposit, checkDeposit } from "@/lib/pawapay.functions";
import { Check, CreditCard, Smartphone, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/subscribe")({ component: SubscribePage });

function SubscribePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [provider, setProvider] = useState<"airtel" | "mtn" | "zamtel">("airtel");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"idle" | "prompt" | "polling">("idle");

  const tryFree = async () => {
    if (!user) return;
    navigate({ to: "/app" });
  };

  const pay = async () => {
    if (!user || !selected) return;
    setBusy(true);
    setStep("prompt");
    try {
      const { depositId } = await initiateDeposit({ data: { firebase_uid: user.uid, plan: selected, provider, phone } });
      toast.success("Check your phone and enter your Mobile Money PIN");
      setStep("polling");
      let tries = 0;
      const poll = async () => {
        tries++;
        const { status } = await checkDeposit({ data: { depositId, firebase_uid: user.uid } });
        if (status === "COMPLETED") {
          await refreshProfile();
          toast.success("Subscription active! 🎉");
          navigate({ to: "/app" });
          return;
        }
        if (status === "FAILED" || status === "REJECTED" || tries > 30) {
          toast.error(`Payment ${status}. Please try again.`);
          setStep("idle");
          setBusy(false);
          return;
        }
        setTimeout(poll, 4000);
      };
      setTimeout(poll, 4000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
      setStep("idle");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Choose your plan</h1>
        <p className="mt-2 text-muted-foreground">Subscribe to unlock full AI power. Monthly billing.</p>
      </div>

      {!profile?.free_trial_used && (
        <div className="glass-card flex flex-col items-center justify-between gap-4 border-2 border-primary/40 p-6 md:flex-row">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-semibold">Try for free</h3>
              <p className="text-sm text-muted-foreground">Make 1 document (technical OR financial OR summary) — no card required.</p>
            </div>
          </div>
          <button onClick={tryFree} className="rounded-full border border-primary px-6 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
            Start free trial
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, p]) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`glass-card p-6 text-left transition ${selected === id ? "border-primary teal-glow" : "hover:border-primary/50"}`}
          >
            <div className="text-xs uppercase tracking-widest text-primary">{p.name}</div>
            <div className="mt-2 text-4xl font-bold">K{p.price}<span className="text-sm text-muted-foreground">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> {p.proposals} proposals/day</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> {p.summaries === 999 ? "Unlimited" : p.summaries} summaries/day</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> {id === "premium" ? "Premium AI + Winning tips" : id === "pro" ? "Moderate AI power" : "Minimum AI power"}</li>
            </ul>
          </button>
        ))}
      </div>

      {selected && (
        <div className="glass-card space-y-4 p-6">
          <h3 className="text-xl font-semibold">Pay for {PLANS[selected].name} — K{PLANS[selected].price}</h3>
          <div>
            <div className="mb-2 text-sm font-medium">Payment method</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {(["airtel", "mtn", "zamtel"] as const).map((p) => (
                <button key={p} onClick={() => setProvider(p)} className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold ${provider === p ? "border-primary bg-primary/10" : "border-border"}`}>
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
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0977xxxxxx" className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <button disabled={busy || !phone} onClick={pay} className="teal-gradient teal-glow w-full rounded-full py-3 font-semibold disabled:opacity-60">
            {step === "prompt" ? "Sent to your phone…" : step === "polling" ? "Waiting for confirmation…" : `Pay K${PLANS[selected].price}`}
          </button>
          {step === "polling" && (
            <p className="text-center text-xs text-muted-foreground">Enter your PIN on your phone. This page will update automatically.</p>
          )}
        </div>
      )}
    </div>
  );
}
