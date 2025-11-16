import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecret || !webhookSecret) {
    console.error("[purchase-webhook] Missing Stripe configuration");
    return new Response("Missing config", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature!, webhookSecret);
  } catch (err) {
    console.error("[purchase-webhook] Signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { data: logEntry } = await supabase
    .from("stripe_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event,
      processed: false,
    })
    .select()
    .single();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const userId = metadata.user_id;
      const dbType = metadata.db_type;
      const dbItemId = metadata.db_item_id;

      if (!userId || !dbType || !dbItemId) {
        throw new Error("Missing metadata in session");
      }

      await supabase
        .from("purchases")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent?.toString() ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

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
          metadata: { session_id: session.id },
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
          metadata: { session_id: session.id },
        });
      } else if (dbType === "coins_pack") {
        // Получаем количество монет из metadata (может быть строкой или числом)
        const coins = typeof metadata.coins === 'string' 
          ? parseInt(metadata.coins, 10) 
          : Number(metadata.coins ?? 0);
        
        if (coins > 0) {
          console.log(`[purchase-webhook] Adding ${coins} coins to user ${userId}`);
          
          await supabase.rpc("increment_profile_value", {
            p_profile_id: userId,
            p_column: "coins",
            p_amount: coins,
          });

          await supabase.from("transactions").insert({
            user_id: userId,
            transaction_type: "coins_purchase_stripe",
            amount: coins,
            metadata: { 
              session_id: session.id, 
              coins,
              catalog_key: metadata.catalog_key || null
            },
          });
          
          console.log(`[purchase-webhook] ✅ Successfully added ${coins} coins to user ${userId}`);
        } else {
          console.warn(`[purchase-webhook] ⚠️ No coins amount found in metadata for coins_pack purchase`);
        }
      }
    }

    await supabase
      .from("stripe_events")
      .update({ processed: true })
      .eq("id", logEntry?.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[purchase-webhook] processing error", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
});


