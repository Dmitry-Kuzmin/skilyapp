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
  coins_pack_starter: {
    name: "Coins Pack Starter",
    amountCents: 199,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "starter",
    description: "200 coins",
    metadata: { coins: 200 },
  },
  coins_pack_popular: {
    name: "Coins Pack Popular",
    amountCents: 499,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "popular",
    description: "600 coins",
    metadata: { coins: 600 },
  },
  coins_pack_mega: {
    name: "Coins Pack Mega",
    amountCents: 999,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "mega",
    description: "1500 coins",
    metadata: { coins: 1500 },
  },
  coins_pack_pro: {
    name: "Coins Pack Pro",
    amountCents: 1999,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "pro",
    description: "3500 coins",
    metadata: { coins: 3500 },
  },
  coins_pack_whale: {
    name: "Coins Pack Whale",
    amountCents: 3999,
    currency: "eur",
    dbType: "coins_pack",
    dbItemId: "whale",
    description: "8000 coins",
    metadata: { coins: 8000 },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
    const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL");

    if (!stripeSecret || !successUrl || !cancelUrl) {
      throw new Error("Stripe configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
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
      JSON.stringify({ success: true, url: session.url }),
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


