import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CatalogEntry = {
  name: string;
  amountCents: number;
  currency: string;
  dbType: "premium" | "duel_pass" | "coins_pack";
  dbItemId: string;
  description: string;
  metadata?: Record<string, unknown>;
};

const CATALOG: Record<string, CatalogEntry> = {
  premium_monthly: {
    name: "Premium Subscription (Monthly)",
    amountCents: 999,
    currency: "eur",
    dbType: "premium",
    dbItemId: "premium_monthly",
    description: "Monthly Premium access",
  },
  premium_yearly: {
    name: "Premium Subscription (Yearly)",
    amountCents: 5999,
    currency: "eur",
    dbType: "premium",
    dbItemId: "premium_yearly",
    description: "Yearly Premium access",
  },
  duel_pass_season: {
    name: "Duel Pass (Season)",
    amountCents: 499,
    currency: "eur",
    dbType: "duel_pass",
    dbItemId: "duel_pass_season",
    description: "Unlock premium Duel Pass rewards",
  },
  coins_pack_100: {
    name: "100 монет",
    amountCents: 299,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "pack_100",
    description: "100 монет",
    metadata: { coins: 100 },
  },
  coins_pack_500: {
    name: "500 монет + 50 бонус",
    amountCents: 999,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "pack_500",
    description: "550 монет (500 + 50 бонус)",
    metadata: { coins: 550 },
  },
  coins_pack_1200: {
    name: "1200 монет + 200 бонус",
    amountCents: 1999,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "pack_1200",
    description: "1400 монет (1200 + 200 бонус)",
    metadata: { coins: 1400 },
  },
  coins_pack_3000: {
    name: "3000 монет + 500 бонус",
    amountCents: 3999,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "pack_3000",
    description: "3500 монет (3000 + 500 бонус)",
    metadata: { coins: 3500 },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Debug: проверим доступность секретов
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
    const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL");
    
    // Проверим все возможные варианты имен
    const allEnvKeys = Object.keys(Deno.env.toObject());
    const stripeKeys = allEnvKeys.filter(k => k.toLowerCase().includes('stripe'));
    
    console.log("[purchase-create] Environment check:", {
      hasStripeSecret: !!stripeSecret,
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl,
      successUrlLength: successUrl?.length || 0,
      cancelUrlLength: cancelUrl?.length || 0,
      stripeSecretPrefix: stripeSecret?.substring(0, 10) || "NOT_FOUND",
      allStripeKeys: stripeKeys,
      totalEnvKeys: allEnvKeys.length,
    });

    if (!stripeSecret) {
      console.error("[purchase-create] Missing STRIPE_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!successUrl) {
      console.error("[purchase-create] Missing STRIPE_SUCCESS_URL");
      return new Response(
        JSON.stringify({ error: "STRIPE_SUCCESS_URL not configured. Please add it in Supabase Dashboard → Edge Functions → Settings → Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!cancelUrl) {
      console.error("[purchase-create] Missing STRIPE_CANCEL_URL");
      return new Response(
        JSON.stringify({ error: "STRIPE_CANCEL_URL not configured. Please add it in Supabase Dashboard → Edge Functions → Settings → Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Проверим формат ключа перед созданием Stripe клиента
    if (!stripeSecret.startsWith("sk_test_") && !stripeSecret.startsWith("sk_live_")) {
      console.error("[purchase-create] Invalid Stripe key format:", stripeSecret.substring(0, 20) + "...");
      return new Response(
        JSON.stringify({ error: "Invalid Stripe key format. Key must start with sk_test_ or sk_live_" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    const { user_id, catalog_key } = await req.json();

    if (!user_id || !catalog_key) {
      return new Response(
        JSON.stringify({ error: "user_id and catalog_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const entry = CATALOG[catalog_key];
    if (!entry) {
      return new Response(
        JSON.stringify({ error: "Invalid catalog key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceData: Record<string, unknown> = {
      currency: entry.currency,
      product_data: { name: entry.name, description: entry.description },
      unit_amount: entry.amountCents,
    };

    if (entry.dbType === "premium") {
      priceData.recurring = {
        interval: entry.dbItemId.includes("monthly") ? "month" : "year",
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: entry.dbType === "premium" ? "subscription" : "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user_id,
      metadata: {
        user_id,
        catalog_key,
        db_type: entry.dbType,
        db_item_id: entry.dbItemId,
        // Для coins_pack добавляем количество монет в metadata
        ...(entry.dbType === "coins_pack" && entry.metadata?.coins 
          ? { coins: entry.metadata.coins.toString() } 
          : {}),
        ...(entry.metadata || {}),
      },
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
    });

    await supabase.from("purchases").insert({
      user_id,
      item_type: entry.dbType,
      item_id: entry.dbItemId,
      price: entry.amountCents / 100,
      currency: entry.currency.toUpperCase(),
      stripe_session_id: session.id,
      status: "pending",
      metadata: entry.metadata || {},
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: session.url,
        sessionId: session.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[purchase-create] error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


