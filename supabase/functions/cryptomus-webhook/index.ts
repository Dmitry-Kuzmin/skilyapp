import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Создать подпись для проверки webhook
 */
async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, payloadData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cryptomusPaymentKey = Deno.env.get("CRYPTOMUS_PAYMENT_KEY");

    if (!cryptomusPaymentKey) {
      console.error("[cryptomus-webhook] Missing CRYPTOMUS_PAYMENT_KEY");
      return new Response("Missing config", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем подпись из заголовков
    const signature = req.headers.get("sign");
    const payload = await req.text();

    if (!signature) {
      console.error("[cryptomus-webhook] Missing signature");
      return new Response("Missing signature", { status: 400 });
    }

    // Проверяем подпись
    const expectedSignature = await createSignature(payload, cryptomusPaymentKey);
    
    if (signature.toLowerCase() !== expectedSignature.toLowerCase()) {
      console.error("[cryptomus-webhook] Invalid signature");
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(payload);

    console.log("[cryptomus-webhook] Received event:", event.type, event.order_id);

    // Обрабатываем только успешные платежи
    if (event.type === "payment" && event.payment_status === "paid") {
      const orderId = event.order_id;
      let additionalData = {};
      
      try {
        additionalData = event.additional_data ? JSON.parse(event.additional_data) : {};
      } catch (e) {
        console.error("[cryptomus-webhook] Error parsing additional_data:", e);
      }

      if (!orderId || !additionalData.user_id) {
        console.error("[cryptomus-webhook] Missing order_id or user_id");
        return new Response("Missing required data", { status: 400 });
      }

      const userId = additionalData.user_id;
      const dbType = additionalData.db_type;
      const dbItemId = additionalData.db_item_id;

      // Находим покупку по order_id
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .select("*")
        .eq("cryptomus_order_id", orderId)
        .single();

      if (purchaseError || !purchase) {
        console.error("[cryptomus-webhook] Purchase not found:", orderId, purchaseError);
        return new Response("Purchase not found", { status: 404 });
      }

      // Проверяем, не обработана ли уже покупка
      if (purchase.status === "completed") {
        console.log("[cryptomus-webhook] Purchase already processed:", orderId);
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Обновляем статус покупки
      await supabase
        .from("purchases")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          cryptomus_payment_id: event.payment_id || null,
        })
        .eq("cryptomus_order_id", orderId);

      // Обрабатываем в зависимости от типа покупки
      if (dbType === "premium") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, premium_until")
          .eq("id", userId)
          .single();

        const current = profile?.premium_until ? new Date(profile.premium_until) : new Date();
        const startDate = current > new Date() ? current : new Date();
        const newDate = new Date(startDate);
        
        if (dbItemId.includes("monthly")) {
          newDate.setMonth(newDate.getMonth() + 1);
        } else {
          newDate.setFullYear(newDate.getFullYear() + 1);
        }

        await supabase
          .from("profiles")
          .update({ premium_until: newDate.toISOString(), duel_pass_premium: true })
          .eq("id", userId);

        await supabase.from("transactions").insert({
          user_id: userId,
          transaction_type: dbItemId.includes("monthly")
            ? "premium_purchase_monthly"
            : "premium_purchase_yearly",
          amount: 0,
          metadata: { order_id: orderId, payment_id: event.payment_id },
        });
      } else if (dbType === "duel_pass") {
        await supabase
          .from("profiles")
          .update({ duel_pass_premium: true })
          .eq("id", userId);

        await supabase.from("transactions").insert({
          user_id: userId,
          transaction_type: "duel_pass_purchase",
          amount: 0,
          metadata: { order_id: orderId, payment_id: event.payment_id },
        });
      } else if (dbType === "coins_pack") {
        const coins = additionalData.coins || purchase.metadata?.coins || 0;
        
        if (coins > 0) {
          const { error: incrementError } = await supabase.rpc("increment_profile_value", {
            p_profile_id: userId,
            p_column: "coins",
            p_amount: coins,
          });

          if (incrementError) {
            console.error("[cryptomus-webhook] Error incrementing coins:", incrementError);
            throw new Error(`Failed to add coins: ${incrementError.message}`);
          }

          await supabase.from("transactions").insert({
            user_id: userId,
            transaction_type: "coins_purchase_cryptomus",
            amount: coins,
            metadata: { 
              order_id: orderId, 
              payment_id: event.payment_id,
              coins,
              catalog_key: additionalData.catalog_key || null
            },
          });
        }
      }

      console.log("[cryptomus-webhook] ✅ Successfully processed payment:", orderId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[cryptomus-webhook] processing error", error);
    return new Response("Webhook handler failed", { status: 500 });
  }
});


