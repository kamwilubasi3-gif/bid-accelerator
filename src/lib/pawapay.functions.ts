import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const pawapayBase = "https://api.sandbox.pawapay.io";
    const correspondents: Record<string, string> = {
      airtel: "AIRTEL_ZMB",
      mtn: "MTN_ZMB",
      zamtel: "ZAMTEL_ZMB",
    };

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
      correspondent: correspondents[data.provider],
      payer: { type: "MSISDN", address: { value: msisdn } },
      customerTimestamp: new Date().toISOString(),
      statementDescription: "TenderPro",
    };

    const res = await fetch(`${pawapayBase}/deposits`, {
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

    await s.from("payments").insert({
      firebase_uid: context.userId,
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { depositId: string }) => d)
  .handler(async ({ data, context }) => {
    const token = process.env.PAWAPAY_API_TOKEN;
    const pawapayBase = "https://api.sandbox.pawapay.io";
    const res = await fetch(`${pawapayBase}/deposits/${data.depositId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const arr = (await res.json()) as Array<{ status?: string; depositId?: string }>;
    const record = Array.isArray(arr) ? arr[0] : (arr as { status?: string });
    const status = record?.status ?? "UNKNOWN";

    const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
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
        .eq("firebase_uid", context.userId);
    }
    return { status };
  });
