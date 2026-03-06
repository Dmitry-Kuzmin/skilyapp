import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

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
});

interface CryptomusResponse {
  result: {
    url: string;
    uuid: string;
  };
}

const CATALOG: Record<string, CatalogEntry> = {
  premium_monthly: { name: "Premium Monthly", amountCents: 999, currency: "eur", dbType: "premium", dbItemId: "premium_monthly", description: "Monthly Premium" },
  premium_quarterly: { name: "Premium Quarterly", amountCents: 2499, currency: "eur", dbType: "premium", dbItemId: "premium_quarterly", description: "3 Months Premium access" },
  premium_biannual: { name: "Premium Biannual", amountCents: 3999, currency: "eur", dbType: "premium", dbItemId: "premium_biannual", description: "6 Months Premium access" },
  premium_yearly: { name: "Premium Yearly", amountCents: 5999, currency: "eur", dbType: "premium", dbItemId: "premium_yearly", description: "Yearly Premium" },
  premium_lifetime: { name: "Premium Lifetime", amountCents: 9999, currency: "eur", dbType: "premium", dbItemId: "premium_lifetime", description: "Lifetime Premium" },
  duel_pass_season: { name: "Duel Pass", amountCents: 499, currency: "eur", dbType: "duel_pass", dbItemId: "duel_pass_season", description: "Premium Duel Pass" },
  coins_pack_100: { name: "100 монет", amountCents: 299, currency: "eur", dbType: "coins_pack", dbItemId: "pack_100", description: "100 монет", metadata: { coins: 100 } },
  coins_pack_500: { name: "500 монет", amountCents: 999, currency: "eur", dbType: "coins_pack", dbItemId: "pack_500", description: "550 монет", metadata: { coins: 550 } },
  coins_pack_1200: { name: "1200 монет", amountCents: 1999, currency: "eur", dbType: "coins_pack", dbItemId: "pack_1200", description: "1400 монет", metadata: { coins: 1400 } },
  coins_pack_3000: { name: "3000 монет", amountCents: 3999, currency: "eur", dbType: "coins_pack", dbItemId: "pack_3000", description: "3500 монет", metadata: { coins: 3500 } },
};

function createSignature(payload: string, secret: string): string {
  // В Deno btoa работает с бинарными строками, поэтому unescape/encodeURIComponent не нужны 
  // если payload — это просто JSON. Но для надежности используем стандартный подход.
  const base64Payload = btoa(payload);
  const dataToHash = base64Payload + secret;
  const hash = createHash("md5");
  hash.update(dataToHash);
  return hash.digest("hex");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cryptomusMerchantId = Deno.env.get("CRYPTOMUS_MERCHANT_ID");
    const cryptomusPaymentKey = Deno.env.get("CRYPTOMUS_PAYMENT_KEY");
    const successUrl = Deno.env.get("CRYPTOMUS_SUCCESS_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    if (!cryptomusMerchantId || !cryptomusPaymentKey || !successUrl) {
      return new Response(JSON.stringify({ error: "Cryptomus not configured" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createPooledSupabaseClient();
    const rawBody = await req.json();

    // 🛡️ SECURITY: Zod валидация
    const validation = PaymentRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      console.error('[cryptomus-payment] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid request", details: validation.error.issues }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { user_id, catalog_key } = validation.data;

    // 🛡️ SECURITY: Rate Limiting (5 попыток в минуту)
    const rateLimitCheck = await checkRateLimit({
      identifier: user_id,
      limit: 5,
      windowMs: 60000,
    });

    if (!rateLimitCheck.allowed) {
      console.warn(`[cryptomus-payment] Rate limit exceeded for user: ${user_id}`);
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

    const amountUsd = ((entry.amountCents / 100) * 1.08).toFixed(2);
    const orderId = `order_${user_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payload = {
      amount: amountUsd,
      currency: "USD",
      order_id: orderId,
      url_return: successUrl,
      url_callback: `${supabaseUrl}/functions/v1/cryptomus-webhook`,
      is_payment_multiple: false,
      lifetime: 7200,
      to_currency: "USDT",
      additional_data: JSON.stringify({
        user_id,
        catalog_key,
        db_type: entry.dbType,
        db_item_id: entry.dbItemId,
        ...entry.metadata,
      }),
    };

    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, cryptomusPaymentKey);

    const cryptomusResponse = await fetch("https://api.cryptomus.com/v1/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "merchant": cryptomusMerchantId, "sign": signature },
      body: payloadString,
    });

    if (!cryptomusResponse.ok) {
      const errorText = await cryptomusResponse.text();
      console.error("[cryptomus-payment] API error:", errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return new Response(JSON.stringify({ error: errorJson.message || "Cryptomus API failed", details: errorJson }), { status: 500, headers: corsHeaders });
      } catch {
        return new Response(JSON.stringify({ error: "Cryptomus API failed", details: errorText }), { status: 500, headers: corsHeaders });
      }
    }

    const cryptomusData: CryptomusResponse = await cryptomusResponse.json();

    if (!cryptomusData.result?.url) {
      return new Response(JSON.stringify({ error: "Invalid Cryptomus response" }), { status: 500, headers: corsHeaders });
    }

    await supabase.from("purchases").insert({
      user_id,
      item_type: entry.dbType,
      item_id: entry.dbItemId,
      price: entry.amountCents / 100,
      currency: entry.currency.toUpperCase(),
      cryptomus_order_id: orderId,
      cryptomus_payment_id: cryptomusData.result.uuid || null,
      status: "pending",
      metadata: { ...entry.metadata, cryptomus_data: cryptomusData.result },
    });

    return new Response(JSON.stringify({ success: true, url: cryptomusData.result.url, orderId }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[cryptomus-payment] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
