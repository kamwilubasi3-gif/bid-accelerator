import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// PawaPay endpoints. Production sends real Mobile Money PIN prompts.
// Set PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io in secrets to test with
// pawapay's sandbox test MSISDNs (real phones will NOT get a PIN in sandbox).
const PAWAPAY_BASE = () => process.env.PAWAPAY_BASE_URL || "https://api.pawapay.io";

// Correct Zambia correspondent codes (as required by PawaPay)
const CORRESPONDENTS: Record<string, string> = {
  airtel: "AIRTEL_OAPI_ZMB",
  mtn: "MTN_MOMO_ZMB",
  zamtel: "ZAMTEL_ZMB",
};

const AMOUNTS = { basic: 220, pro: 500, premium: 1500 } as const;

function normalizeMsisdn(phone: string): string {
  let m = phone.replace(/[^0-9]/g, "");
  if (m.startsWith("0")) m = "260" + m.slice(1);
  if (!m.startsWith("260")) m = "260" + m;
  return m;
}

function callbackUrl(): string | undefined {
  // Points at our public webhook. See src/routes/api/public/pawapay-callback.ts
  const base = process.env.APP_PUBLIC_URL || "https://bid-accelerator.lovable.app";
  return `${base}/api/public/pawapay-callback`;
}

export const initiateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    plan: "basic" | "pro" | "premium";
    provider: "airtel" | "mtn" | "zamtel";
    phone: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const token = process.env.PAWAPAY_API_TOKEN;
    if (!token) throw new Error("Missing PAWAPAY_API_TOKEN");

    const amount = AMOUNTS[data.plan];
    const depositId = crypto.randomUUID();
    const msisdn = normalizeMsisdn(data.phone);

    const body: Record<string, unknown> = {
      depositId,
      amount: String(amount),
      currency: "ZMW",
      correspondent: CORRESPONDENTS[data.provider],
      payer: { type: "MSISDN", address: { value: msisdn } },
      customerTimestamp: new Date().toISOString(),
      statementDescription: "Tender Pro",
    };
    const cb = callbackUrl();
    if (cb) body.preAuthorisationCode = undefined; // no-op; callback is registered per-app in dashboard OR via metadata
    body.metadata = [
      { fieldName: "user_id", fieldValue: context.userId },
      { fieldName: "plan", fieldValue: data.plan },
    ];

    const res = await fetch(`${PAWAPAY_BASE()}/deposits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try { json = JSON.parse(text); } catch { /* ignore */ }

    await context.supabase.from("payments").insert({
      firebase_uid: context.userId,
      deposit_id: depositId,
      plan: data.plan,
      amount,
      status: (json.status as string) ?? (res.ok ? "PENDING" : "FAILED"),
      provider: data.provider,
    });

    if (!res.ok) {
      const msg = (json as { errorMessage?: string; message?: string }).errorMessage
        || (json as { message?: string }).message
        || text.slice(0, 300);
      throw new Error(`PawaPay ${res.status}: ${msg}`);
    }
    return { depositId, status: json.status ?? "PENDING" };
  });

export const checkDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { depositId: string }) => d)
  .handler(async ({ data, context }) => {
    const token = process.env.PAWAPAY_API_TOKEN;
    const res = await fetch(`${PAWAPAY_BASE()}/deposits/${data.depositId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const arr = (await res.json()) as Array<{ status?: string; depositId?: string }>;
    const record = Array.isArray(arr) ? arr[0] : (arr as { status?: string });
    const status = record?.status ?? "UNKNOWN";

    await context.supabase.from("payments").update({ status }).eq("deposit_id", data.depositId);

    if (status === "COMPLETED") {
      const { data: payment } = await context.supabase
        .from("payments")
        .select("plan")
        .eq("deposit_id", data.depositId)
        .maybeSingle();
      const plan = (payment?.plan as string) ?? "basic";
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await context.supabase
        .from("profiles")
        .update({ plan, plan_expires_at: expires.toISOString(), free_trial_used: true })
        .eq("firebase_uid", context.userId);
    }
    return { status };
  });

// Refund a completed deposit (full or partial)
export const refundDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { depositId: string; amount?: number }) => d)
  .handler(async ({ data, context }) => {
    const token = process.env.PAWAPAY_API_TOKEN;
    if (!token) throw new Error("Missing PAWAPAY_API_TOKEN");

    // Verify caller owns the payment
    const { data: payment } = await context.supabase
      .from("payments")
      .select("firebase_uid, amount")
      .eq("deposit_id", data.depositId)
      .maybeSingle();
    if (!payment || payment.firebase_uid !== context.userId) {
      throw new Error("Payment not found");
    }

    const refundId = crypto.randomUUID();
    const body = {
      refundId,
      depositId: data.depositId,
      amount: String(data.amount ?? payment.amount),
    };
    const res = await fetch(`${PAWAPAY_BASE()}/refunds`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(`PawaPay refund ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    return { refundId, status: json.status ?? "PENDING" };
  });
