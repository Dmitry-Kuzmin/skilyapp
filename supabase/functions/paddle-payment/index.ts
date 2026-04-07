import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

interface CatalogEntry {
  name: string;
  amountCents: number;
  currency: string;
  dbType: "premium" | "duel_pass" | "coins_pack";
  dbItemId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// Zod schema для валидации входных данных
const PaymentRequestSchema = z.object({
  user_id: z.string().uuid("user_id must be a valid UUID"),
  catalog_key: z.enum([
    'premium_monthly', 'premium_quarterly', 'premium_biannual', 'premium_yearly', 'premium_lifetime', 'duel_pass_season',
    'coins_pack_100', 'coins_pack_500', 'coins_pack_1200', 'coins_pack_3000'
  ], { errorMap: () => ({ message: "Invalid catalog_key" }) }),
  partner_code: z.string().optional(),
  promo_code: z.string().optional(),
});

interface PaddleTransactionData {
  id: string;
  subscription_id?: string;
  checkout?: {
    url: string;
  };
}

const PADDLE_PRICE_IDS: Record<string, string> = {
  premium_monthly: 'pri_01kha32dnw7e9k41g217wfpyx4',
  premium_quarterly: 'pri_01kha34fejn9e8kh8cx3hamxsv',
  premium_biannual: 'pri_01kha35t5rajard43tkv7p193h',
  premium_yearly: 'pri_01kc92macq42tk8e8pbp46qp2y',
  premium_lifetime: 'pri_01kha3v1a8j4e6k8hamxsvpt19', // New Price ID for Lifetime
  duel_pass_season: 'pri_01kc92sf64bd1dps62zhaeb1r5',
  coins_pack_100: 'pri_01kc92twnhc57syz7j0rs9z7vx',
  coins_pack_500: 'pri_01kha3n97f0kk5rkxezvxpdfqs',
  coins_pack_1200: 'pri_01kha3pdmed2v1nyw2jj7572hk',
  coins_pack_3000: 'pri_01kha3qmrt07s5b8p390t6n1sn',
};

const CATALOG: Record<string, CatalogEntry> = {
  premium_monthly: { name: "Premium Monthly", amountCents: 999, currency: "eur", dbType: "premium", dbItemId: "premium_monthly", description: "Monthly Premium access" },
  premium_quarterly: { name: "Premium Quarterly", amountCents: 2499, currency: "eur", dbType: "premium", dbItemId: "premium_quarterly", description: "3 Months Premium access" },
  premium_biannual: { name: "Premium Biannual", amountCents: 3999, currency: "eur", dbType: "premium", dbItemId: "premium_biannual", description: "6 Months Premium access" },
  premium_yearly: { name: "Premium Yearly", amountCents: 5999, currency: "eur", dbType: "premium", dbItemId: "premium_yearly", description: "Yearly Premium access" },
  premium_lifetime: { name: "Premium Lifetime", amountCents: 9999, currency: "eur", dbType: "premium", dbItemId: "premium_lifetime", description: "Lifetime Premium access" },
  duel_pass_season: { name: "Duel Pass", amountCents: 499, currency: "eur", dbType: "duel_pass", dbItemId: "duel_pass_season", description: "Premium Duel Pass" },
  coins_pack_100: { name: "100 монет", amountCents: 299, currency: "eur", dbType: "coins_pack", dbItemId: "pack_100", description: "100 монет", metadata: { coins: 100 } },
  coins_pack_500: { name: "500 монет", amountCents: 999, currency: "eur", dbType: "coins_pack", dbItemId: "pack_500", description: "550 монет", metadata: { coins: 550 } },
  coins_pack_1200: { name: "1200 монет", amountCents: 1999, currency: "eur", dbType: "coins_pack", dbItemId: "pack_1200", description: "1400 монет", metadata: { coins: 1400 } },
  coins_pack_3000: { name: "3000 монет", amountCents: 3999, currency: "eur", dbType: "coins_pack", dbItemId: "pack_3000", description: "3500 монет", metadata: { coins: 3500 } },
};

// Cache price_id → product_id to avoid repeated API calls
const productIdCache = new Map<string, string>();

async function getProductIdForPrice(priceId: string, apiKey: string): Promise<string> {
  if (productIdCache.has(priceId)) return productIdCache.get(priceId)!;
  const res = await fetch(`https://api.paddle.com/prices/${priceId}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  const { data } = await res.json();
  const productId = data?.product_id ?? "";
  if (productId) productIdCache.set(priceId, productId);
  return productId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const paddleApiKey = Deno.env.get("PADDLE_API_KEY");
    const successUrl = Deno.env.get("PADDLE_SUCCESS_URL") || "https://skilyapp.com/purchase/success";

    if (!paddleApiKey) {
      return new Response(JSON.stringify({ error: "Paddle not configured" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createPooledSupabaseClient();
    const rawBody = await req.json();

    // 🛡️ SECURITY: Zod валидация
    const validation = PaymentRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      console.error('[paddle-payment] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid request", details: validation.error.issues }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { user_id, catalog_key, partner_code, promo_code } = validation.data;

    // 🛡️ SECURITY: Rate Limiting (5 пороговой платежей в минуту)
    const rateLimitCheck = await checkRateLimit({
      identifier: user_id,
      limit: 5,
      windowMs: 60000, // 1 минута
    });

    if (!rateLimitCheck.allowed) {
      console.warn(`[paddle-payment] Rate limit exceeded for user: ${user_id}`);
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          message: "Слишком много попыток оплаты. Пожалуйста, подождите.",
          resetAt: new Date(rateLimitCheck.resetAt).toISOString(),
        }),
        { status: 429, headers: { ...corsHeaders, 'Retry-After': '60' } }
      );
    }

    const entry = CATALOG[catalog_key];
    if (!entry) {
      return new Response(JSON.stringify({ error: "Invalid catalog_key" }), { status: 400, headers: corsHeaders });
    }

    // Validate promo code and get discount if provided
    let discountPct = 0;
    let resolvedPromoCode: string | null = null;
    if (promo_code) {
      const { data: promoData } = await supabase
        .from("partners")
        .select("promo_code, promo_code_discount, status, registration_status")
        .eq("promo_code", promo_code.toUpperCase().trim())
        .eq("status", "active")
        .eq("registration_status", "approved")
        .single();
      if (promoData) {
        discountPct = promoData.promo_code_discount ?? 0;
        resolvedPromoCode = promoData.promo_code;
      }
    }

    // Apply discount: reduce amountCents by discount_pct
    const originalAmount = entry.amountCents;
    const discountedAmount = discountPct > 0
      ? Math.round(originalAmount * (1 - discountPct / 100))
      : originalAmount;

    const customData = {
      user_id, catalog_key,
      db_type: entry.dbType, db_item_id: entry.dbItemId,
      ...(partner_code ? { partner_code } : {}),
      ...(resolvedPromoCode ? { promo_code: resolvedPromoCode, discount_pct: discountPct } : {}),
      ...entry.metadata,
    };

    // Build transaction body — use custom unit_price if discount applied
    const transactionItems = discountPct > 0
      ? [{
          price: {
            product_id: await getProductIdForPrice(PADDLE_PRICE_IDS[catalog_key], paddleApiKey),
            unit_price: { amount: String(discountedAmount), currency_code: entry.currency.toUpperCase() },
            description: `${entry.name} (${discountPct}% partner discount)`,
            tax_mode: "account_setting",
          },
          quantity: 1,
        }]
      : [{ price_id: PADDLE_PRICE_IDS[catalog_key], quantity: 1 }];

    const transactionResponse = await fetch("https://api.paddle.com/transactions?include=checkout", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: transactionItems,
        custom_data: customData,
      }),
    });

    if (!transactionResponse.ok) {
      const errorText = await transactionResponse.text();
      console.error("[paddle-payment] API error:", errorText);
      return new Response(JSON.stringify({ error: "Paddle API failed", details: errorText }), { status: 500, headers: corsHeaders });
    }

    const { data: transactionData } = await transactionResponse.json() as { data: PaddleTransactionData };

    if (!transactionData?.id) {
      return new Response(JSON.stringify({ error: "No transaction ID" }), { status: 500, headers: corsHeaders });
    }

    await supabase.from("purchases").insert({
      user_id,
      item_type: entry.dbType,
      item_id: entry.dbItemId,
      price: discountedAmount / 100,
      currency: entry.currency.toUpperCase(),
      paddle_transaction_id: transactionData.id,
      paddle_subscription_id: transactionData.subscription_id || null,
      status: "pending",
      metadata: {
        ...entry.metadata,
        paddle_data: transactionData,
        original_price: originalAmount / 100,
        ...(resolvedPromoCode ? { promo_code: resolvedPromoCode, discount_pct: discountPct } : {}),
      },
    });

    // Используем официальный checkout URL из ответа Paddle API
    const checkoutUrl = transactionData.checkout?.url
      ?? `https://buy.paddle.com/checkout/${transactionData.id}`;
    console.log(`[paddle-payment] Transaction created: ${transactionData.id}, checkout_url: ${checkoutUrl}`);

    return new Response(JSON.stringify({
      success: true,
      transaction_id: transactionData.id,
      checkout_url: checkoutUrl,
    }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[paddle-payment] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
