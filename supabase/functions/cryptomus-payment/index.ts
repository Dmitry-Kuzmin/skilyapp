import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";

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

/**
 * Создать подпись для Cryptomus API
 * Формат: MD5(base64(payload) + secret)
 */
function createSignature(payload: string, secret: string): string {
  // 1. Кодируем payload в base64
  const base64Payload = btoa(unescape(encodeURIComponent(payload)));
  
  // 2. Объединяем base64 payload с секретом
  const dataToHash = base64Payload + secret;
  
  // 3. Вычисляем MD5 хэш
  // Используем Node.js crypto для MD5 (доступен через std/node)
  const hash = createHash("md5");
  hash.update(dataToHash);
  return hash.digest("hex");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cryptomusMerchantId = Deno.env.get("CRYPTOMUS_MERCHANT_ID");
    const cryptomusPaymentKey = Deno.env.get("CRYPTOMUS_PAYMENT_KEY");
    const successUrl = Deno.env.get("CRYPTOMUS_SUCCESS_URL");
    const cancelUrl = Deno.env.get("CRYPTOMUS_CANCEL_URL");

    if (!cryptomusMerchantId || !cryptomusPaymentKey) {
      console.error("[cryptomus-payment] Missing Cryptomus configuration");
      return new Response(
        JSON.stringify({ 
          error: "Cryptomus not configured. Please add CRYPTOMUS_MERCHANT_ID and CRYPTOMUS_PAYMENT_KEY in Supabase Dashboard → Edge Functions → Settings → Secrets" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!successUrl || !cancelUrl) {
      console.error("[cryptomus-payment] Missing URL configuration");
      return new Response(
        JSON.stringify({ 
          error: "CRYPTOMUS_SUCCESS_URL and CRYPTOMUS_CANCEL_URL must be configured" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Парсим тело запроса
    let requestBody;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ error: "Request body is empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("[cryptomus-payment] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body", 
          details: parseError instanceof Error ? parseError.message : String(parseError) 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, catalog_key } = requestBody;

    if (!user_id || !catalog_key) {
      return new Response(
        JSON.stringify({ error: "user_id and catalog_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[cryptomus-payment] Processing purchase:", { user_id, catalog_key });

    const entry = CATALOG[catalog_key];
    if (!entry) {
      return new Response(
        JSON.stringify({ error: `Invalid catalog key: ${catalog_key}`, available_keys: Object.keys(CATALOG) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Конвертируем цену в USD (Cryptomus работает с USD)
    // Используем примерный курс: 1 EUR = 1.08 USD
    const amountUsd = (entry.amountCents / 100) * 1.08;
    const amountFormatted = amountUsd.toFixed(2);

    // Создаем уникальный order_id
    const orderId = `order_${user_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Подготавливаем payload для Cryptomus
    const payload = {
      amount: amountFormatted,
      currency: "USD",
      order_id: orderId,
      url_return: successUrl,
      url_callback: `${supabaseUrl}/functions/v1/cryptomus-webhook`,
      is_payment_multiple: false,
      lifetime: 7200, // 2 часа на оплату
      to_currency: "USDT", // Автоконвертация в USDT (стейблкоин)
      subtract: 0,
      accuracy_payment_percent: 0,
      additional_data: JSON.stringify({
        user_id,
        catalog_key,
        db_type: entry.dbType,
        db_item_id: entry.dbItemId,
        ...(entry.metadata || {}),
      }),
      currencies: [
        { currency: "USDT", network: "TRC20" },
        { currency: "BTC" },
        { currency: "ETH" },
        { currency: "TRX" }
      ], // Поддерживаемые криптовалюты
      address: null,
      is_refresh: false,
    };

    // Создаем подпись
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, cryptomusPaymentKey);

    // Отправляем запрос в Cryptomus API
    const cryptomusResponse = await fetch("https://api.cryptomus.com/v1/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "merchant": cryptomusMerchantId,
        "sign": signature,
      },
      body: payloadString,
    });

    if (!cryptomusResponse.ok) {
      const errorText = await cryptomusResponse.text();
      console.error("[cryptomus-payment] Cryptomus API error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create Cryptomus payment",
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cryptomusData = await cryptomusResponse.json();

    if (!cryptomusData.result || !cryptomusData.result.url) {
      console.error("[cryptomus-payment] Invalid Cryptomus response:", cryptomusData);
      return new Response(
        JSON.stringify({ 
          error: "Invalid response from Cryptomus",
          details: cryptomusData 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Сохраняем покупку в БД
    await supabase.from("purchases").insert({
      user_id,
      item_type: entry.dbType,
      item_id: entry.dbItemId,
      price: entry.amountCents / 100,
      currency: entry.currency.toUpperCase(),
      cryptomus_order_id: orderId,
      cryptomus_payment_id: cryptomusData.result.uuid || null,
      status: "pending",
      metadata: {
        ...entry.metadata,
        cryptomus_data: cryptomusData.result,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: cryptomusData.result.url,
        orderId: orderId,
        paymentId: cryptomusData.result.uuid,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[cryptomus-payment] error", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});




