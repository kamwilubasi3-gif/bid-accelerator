import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const PAWAPAY_BASE = "https://api.sandbox.pawapay.io";

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const CORRESPONDENTS: Record<string, string> = {
  airtel: "AIRTEL_ZMB",
  mtn: "MTN_ZMB",
  zamtel: "ZAMTEL_ZMB",
};

export const initiateDeposit = createServerFn({ method: "POST" })
  .inputValidator((d: {
    firebase_uid: string;
    plan: "basic" | "pro" | "premium";
    provider: "airtel" | "mtn" | "zamtel";
    phone: string;
  }) => d)
  .handler(async ({ data }) => {
    const token = process.env.PAWAPAY_API_TOKEN;
    if (!token) throw new Error("Missing PAWAPAY_API_TOKEN");

    const amounts = { basic: 220, pro: 500, premium: 1500 } as const;
    const amount = amounts[data.plan];
    const depositId = crypto.randomUUID();
    // Normalize phone to international format e.g. 260XXXXXXXXX
    let msisdn = data.phone.replace(/[^0-9]/g, "");
    if (msisdn.startsWith("0")) msisdn = "260" + msisdn.slice(1);
    if (!msisdn.startsWith("260")) msisdn = "260" + msisdn;

    const body = {
      depositId,
      amount: String(amount),
      currency: "ZMW",
      correspondent: CORRESPONDENTS[data.provider],
      payer: { type: "MSISDN", address: { value: msisdn } },
      customerTimestamp: new Date().toISOString(),
      statementDescription: "TenderPro",
    };

    const res = await fetch(`${PAWAPAY_BASE}/deposits`, {
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

    await svc().from("payments").insert({
      firebase_uid: data.firebase_uid,
      deposit_id: depositId,
      plan: data.plan,
      amount,
      status: (json.status as string) ?? (res.ok ? "PENDING" : "FAILED"),
      provider: data.provider,
    });

    if (!res.ok) throw new Error(`PawaPay ${res.status}: ${text.slice(0, 200)}`);
    return { depositId, status: json.status ?? "PENDING" };
  });

export const checkDeposit = createServerFn({ method: "POST" })
  .inputValidator((d: { depositId: string; firebase_uid: string }) => d)
  .handler(async ({ data }) => {
    const token = process.env.PAWAPAY_API_TOKEN;
    const res = await fetch(`${PAWAPAY_BASE}/deposits/${data.depositId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const arr = (await res.json()) as Array<{ status?: string; depositId?: string }>;
    const record = Array.isArray(arr) ? arr[0] : (arr as { status?: string });
    const status = record?.status ?? "UNKNOWN";

    const s = svc();
    await s.from("payments").update({ status }).eq("deposit_id", data.depositId);

    if (status === "COMPLETED") {
      const { data: payment } = await s
        .from("payments")
        .select("plan")
        .eq("deposit_id", data.depositId)
        .maybeSingle();
      const plan = (payment?.plan as string) ?? "basic";
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await s
        .from("profiles")
        .update({ plan, plan_expires_at: expires.toISOString(), free_trial_used: true })
        .eq("firebase_uid", data.firebase_uid);
    }
    return { status };
  });
