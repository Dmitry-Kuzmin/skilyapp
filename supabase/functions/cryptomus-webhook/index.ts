import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CryptomusEvent {
  type: string;
  order_id: string;
  payment_status: string;
  payment_id?: string;
  additional_data?: string;
}

interface AdditionalData {
  user_id: string;
  db_type: string;
  db_item_id: string;
  coins?: number;
  catalog_key?: string;
}

interface Purchase {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  status: string;
  metadata?: Record<string, any>;
}

function createSignature(payload: string, secret: string): string {
  const base64Payload = btoa(unescape(encodeURIComponent(payload)));
  const dataToHash = base64Payload + secret;
  const hash = createHash("md5");
  hash.update(dataToHash);
  return hash.digest("hex");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cryptomusPaymentKey = Deno.env.get("CRYPTOMUS_PAYMENT_KEY");
    if (!cryptomusPaymentKey) {
      return new Response("Missing config", { status: 500 });
    }

    const supabase = createPooledSupabaseClient();
    const signature = req.headers.get("sign") || req.headers.get("Sign") || req.headers.get("x-signature");
    const payload = await req.text();

    if (signature) {
      const expectedSignature = createSignature(payload, cryptomusPaymentKey);
      if (signature.toLowerCase() !== expectedSignature.toLowerCase()) {
        console.error("[cryptomus-webhook] Invalid signature");
        return new Response("Invalid signature", { status: 400 });
      }
    }

    const event: CryptomusEvent = JSON.parse(payload);

    if (event.type === "payment" && event.payment_status === "paid") {
      const orderId = event.order_id;
      let additionalData: AdditionalData = { user_id: '', db_type: '', db_item_id: '' };

      try {
        additionalData = event.additional_data ? JSON.parse(event.additional_data) : additionalData;
      } catch { /* ignore */ }

      if (!orderId || !additionalData.user_id) {
        return new Response("Missing required data", { status: 400 });
      }

      const { data: purchase } = await supabase
        .from("purchases")
        .select("*")
        .eq("cryptomus_order_id", orderId)
        .maybeSingle() as { data: Purchase | null };

      if (!purchase) {
        return new Response("Purchase not found", { status: 404 });
      }

      if (purchase.status === "completed") {
        return new Response(JSON.stringify({ received: true, already_processed: true }), { headers: corsHeaders });
      }

      await supabase.from("purchases").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        cryptomus_payment_id: event.payment_id || null,
      }).eq("cryptomus_order_id", orderId);

      const userId = additionalData.user_id;
      const dbType = additionalData.db_type;
      const dbItemId = additionalData.db_item_id;

      if (dbType === "premium") {
        const { data: profile } = await supabase.from("profiles").select("premium_until").eq("id", userId).maybeSingle();
        const current = profile?.premium_until ? new Date(profile.premium_until) : new Date();
        const startDate = current > new Date() ? current : new Date();
        const newDate = new Date(startDate);

        if (dbItemId.includes("monthly")) newDate.setMonth(newDate.getMonth() + 1);
        else newDate.setFullYear(newDate.getFullYear() + 1);

        await supabase.from("profiles").update({ premium_until: newDate.toISOString(), duel_pass_premium: true }).eq("id", userId);
        await supabase.from("transactions").insert({
          user_id: userId,
          transaction_type: dbItemId.includes("monthly") ? "premium_purchase_monthly" : "premium_purchase_yearly",
          amount: 0,
          metadata: { order_id: orderId, payment_id: event.payment_id },
        });
      } else if (dbType === "duel_pass") {
        await supabase.from("profiles").update({ duel_pass_premium: true }).eq("id", userId);
        await supabase.from("transactions").insert({
          user_id: userId,
          transaction_type: "duel_pass_purchase",
          amount: 0,
          metadata: { order_id: orderId },
        });
      } else if (dbType === "coins_pack") {
        const coins = additionalData.coins || purchase.metadata?.coins || 0;
        if (coins > 0) {
          await supabase.rpc("increment_profile_value", { p_profile_id: userId, p_column: "coins", p_amount: coins });
          await supabase.from("transactions").insert({
            user_id: userId,
            transaction_type: "coins_purchase_cryptomus",
            amount: coins,
            metadata: { order_id: orderId, coins, catalog_key: additionalData.catalog_key },
          });
        }
      }

      console.log("[cryptomus-webhook] Processed:", orderId);
    }

    return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[cryptomus-webhook] Error:", error);
    return new Response("Webhook failed", { status: 500 });
  }
});
