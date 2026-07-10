import { createFileRoute } from "@tanstack/react-router";

// PawaPay server-to-server callback for Deposits, Payouts and Refunds.
// Configure this URL in the PawaPay dashboard (Callbacks section):
//   https://bid-accelerator.lovable.app/api/public/pawapay-callback
//
// PawaPay POSTs a JSON body containing one of: `depositId`, `payoutId`, `refundId`
// along with the terminal `status` (COMPLETED / FAILED / REJECTED).
export const Route = createFileRoute("/api/public/pawapay-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let payload: Record<string, unknown> = {};
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const status = String(payload.status ?? "");
        const depositId = payload.depositId as string | undefined;
        const refundId = payload.refundId as string | undefined;
        const payoutId = payload.payoutId as string | undefined;

        try {
          if (depositId) {
            await supabaseAdmin
              .from("payments")
              .update({ status })
              .eq("deposit_id", depositId);

            if (status === "COMPLETED") {
              const { data: pay } = await supabaseAdmin
                .from("payments")
                .select("firebase_uid, plan")
                .eq("deposit_id", depositId)
                .maybeSingle();
              if (pay?.firebase_uid) {
                const expires = new Date();
                expires.setDate(expires.getDate() + 30);
                await supabaseAdmin
                  .from("profiles")
                  .update({
                    plan: pay.plan ?? "basic",
                    plan_expires_at: expires.toISOString(),
                    free_trial_used: true,
                  })
                  .eq("firebase_uid", pay.firebase_uid);
              }
            }
          } else if (refundId) {
            // Mark original deposit as REFUNDED and downgrade plan
            const origDepositId = payload.depositId as string | undefined;
            if (origDepositId) {
              await supabaseAdmin
                .from("payments")
                .update({ status: `REFUND_${status}` })
                .eq("deposit_id", origDepositId);
              if (status === "COMPLETED") {
                const { data: pay } = await supabaseAdmin
                  .from("payments")
                  .select("firebase_uid")
                  .eq("deposit_id", origDepositId)
                  .maybeSingle();
                if (pay?.firebase_uid) {
                  await supabaseAdmin
                    .from("profiles")
                    .update({ plan: "none", plan_expires_at: null })
                    .eq("firebase_uid", pay.firebase_uid);
                }
              }
            }
          } else if (payoutId) {
            // Optional: record payouts if implemented later
            console.log("Payout callback", payoutId, status);
          }
        } catch (err) {
          console.error("pawapay-callback error", err);
          return new Response("Error", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () => new Response("ok"),
    },
  },
});
