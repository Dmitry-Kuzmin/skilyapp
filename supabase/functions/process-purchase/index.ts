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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecret) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    const { session_id, user_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-purchase] Processing session: ${session_id}`);

    // Получаем сессию из Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: `Payment status is ${session.payment_status}, not paid` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata = session.metadata || {};
    const userId = user_id || metadata.user_id;
    const dbType = metadata.db_type;
    const dbItemId = metadata.db_item_id;

    if (!userId || !dbType || !dbItemId) {
      return new Response(
        JSON.stringify({ error: "Missing metadata in session", metadata }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-purchase] Processing for user: ${userId}, type: ${dbType}, item: ${dbItemId}`);

    // Проверяем, не обработана ли уже покупка
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("status")
      .eq("stripe_session_id", session_id)
      .single();

    if (existingPurchase?.status === "completed") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Purchase already processed",
          already_processed: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Обновляем статус покупки
    await supabase
      .from("purchases")
      .update({
        status: "completed",
        stripe_payment_intent_id: session.payment_intent?.toString() ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", session.id);

    // Обрабатываем в зависимости от типа
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

      return new Response(
        JSON.stringify({ success: true, message: "Premium subscription activated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      return new Response(
        JSON.stringify({ success: true, message: "Duel Pass activated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (dbType === "coins_pack") {
      const coins = typeof metadata.coins === 'string' 
        ? parseInt(metadata.coins, 10) 
        : Number(metadata.coins ?? 0);
      
      if (coins > 0) {
        console.log(`[process-purchase] Adding ${coins} coins to user ${userId}`);
        
        const { error: incrementError } = await supabase.rpc("increment_profile_value", {
          p_profile_id: userId,
          p_column: "coins",
          p_amount: coins,
        });

        if (incrementError) {
          console.error(`[process-purchase] Error incrementing coins:`, incrementError);
          return new Response(
            JSON.stringify({ error: "Failed to add coins", details: incrementError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

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
        
        console.log(`[process-purchase] ✅ Successfully added ${coins} coins to user ${userId}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Added ${coins} coins`,
            coins_added: coins
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "No coins amount found in metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: `Unknown db_type: ${dbType}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[process-purchase] error", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

