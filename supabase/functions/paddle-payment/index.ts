import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Маппинг catalog_key -> Paddle Price ID
// Замените на реальные Price IDs после создания продуктов в Paddle
const PADDLE_PRICE_IDS: Record<string, string> = {
  premium_monthly: 'pri_xxxxxxxxxxxxx', // Заменить на реальный Price ID
  premium_yearly: 'pri_xxxxxxxxxxxxx', // Заменить на реальный Price ID
  duel_pass_season: 'pri_xxxxxxxxxxxxx', // Заменить на реальный Price ID
  coins_pack_100: 'pri_xxxxxxxxxxxxx', // Заменить на реальный Price ID
  coins_pack_500: 'pri_xxxxxxxxxxxxx', // Заменить на реальный Price ID
  coins_pack_1200: 'pri_xxxxxxxxxxxxx', // Заменить на реальный Price ID
  coins_pack_3000: 'pri_xxxxxxxxxxxxx', // Заменить на реальный Price ID
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
    const paddleApiKey = Deno.env.get("PADDLE_API_KEY");
    const paddleVendorId = Deno.env.get("PADDLE_VENDOR_ID");
    const successUrl = Deno.env.get("PADDLE_SUCCESS_URL") || `${supabaseUrl.replace('/functions/v1', '')}/purchase/success`;
    const cancelUrl = Deno.env.get("PADDLE_CANCEL_URL") || `${supabaseUrl.replace('/functions/v1', '')}/purchase/cancel`;

    if (!paddleApiKey || !paddleVendorId) {
      console.error("[paddle-payment] Missing Paddle configuration");
      return new Response(
        JSON.stringify({ 
          error: "Paddle not configured. Please add PADDLE_API_KEY and PADDLE_VENDOR_ID in Supabase Dashboard → Edge Functions → Settings → Secrets" 
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
      console.error("[paddle-payment] JSON parse error:", parseError);
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

    console.log("[paddle-payment] Processing purchase:", { user_id, catalog_key });

    const entry = CATALOG[catalog_key];
    if (!entry) {
      return new Response(
        JSON.stringify({ error: `Invalid catalog key: ${catalog_key}`, available_keys: Object.keys(CATALOG) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Paddle использует цены в минимальных единицах валюты (центы для EUR)
    const amount = entry.amountCents;
    const currency = entry.currency.toUpperCase();

    // Создаем уникальный custom_data для отслеживания
    const customData = {
      user_id,
      catalog_key,
      db_type: entry.dbType,
      db_item_id: entry.dbItemId,
      ...(entry.metadata || {}),
    };

    // Для подписок используем Paddle Subscriptions API
    // Для разовых платежей используем Transactions API
    if (entry.dbType === "premium") {
      // Подписка через Paddle Subscriptions
      // Нужно создать product и price в Paddle заранее
      // Здесь используем Transactions API для упрощения
      // В продакшене лучше использовать Subscriptions API
      
      const transactionPayload = {
        items: [
          {
            price_id: `price_${catalog_key}`, // Нужно создать в Paddle заранее
            quantity: 1,
          }
        ],
        customer_id: user_id.toString(),
        custom_data: customData,
        return_url: `${successUrl}?transaction_id={transaction_id}`,
      };

      // Используем Transactions API для создания транзакции
      // ⚠️ ВАЖНО: Используется api.paddle.com (live), не sandbox-api.paddle.com
      const transactionResponse = await fetch("https://api.paddle.com/transactions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${paddleApiKey}`,
          "Content-Type": "application/json",
          "Paddle-Version": "1",
        },
        body: JSON.stringify({
          items: [
            {
              price_id: PADDLE_PRICE_IDS[catalog_key] || `price_${catalog_key}`,
              quantity: 1,
            }
          ],
          customer_id: user_id.toString(),
          custom_data: customData,
          return_url: `${successUrl}?transaction_id={transaction_id}`,
        }),
      });

      if (!transactionResponse.ok) {
        const errorText = await transactionResponse.text();
        console.error("[paddle-payment] Paddle API error:", errorText);
        return new Response(
          JSON.stringify({ 
            error: "Failed to create Paddle transaction",
            details: errorText 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const transactionData = await transactionResponse.json();

      // Сохраняем покупку в БД
      await supabase.from("purchases").insert({
        user_id,
        item_type: entry.dbType,
        item_id: entry.dbItemId,
        price: entry.amountCents / 100,
        currency: currency,
        paddle_transaction_id: transactionData.data?.id || null,
        paddle_subscription_id: transactionData.data?.subscription_id || null,
        status: "pending",
        metadata: {
          ...entry.metadata,
          paddle_data: transactionData.data,
        },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          checkout_url: transactionData.data?.checkout?.url,
          transaction_id: transactionData.data?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Разовый платеж через Transactions API
      // ⚠️ ВАЖНО: Используется api.paddle.com (live), не sandbox-api.paddle.com
      const transactionResponse = await fetch("https://api.paddle.com/transactions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${paddleApiKey}`,
          "Content-Type": "application/json",
          "Paddle-Version": "1",
        },
        body: JSON.stringify({
          items: [
            {
              price_id: PADDLE_PRICE_IDS[catalog_key] || `price_${catalog_key}`,
              quantity: 1,
            }
          ],
          customer_id: user_id.toString(),
          custom_data: customData,
          return_url: `${successUrl}?transaction_id={transaction_id}`,
        }),
      });

      if (!transactionResponse.ok) {
        const errorText = await transactionResponse.text();
        console.error("[paddle-payment] Paddle API error:", errorText);
        return new Response(
          JSON.stringify({ 
            error: "Failed to create Paddle transaction",
            details: errorText 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const transactionData = await transactionResponse.json();

      // Сохраняем покупку в БД
      await supabase.from("purchases").insert({
        user_id,
        item_type: entry.dbType,
        item_id: entry.dbItemId,
        price: entry.amountCents / 100,
        currency: currency,
        paddle_transaction_id: transactionData.data?.id || null,
        status: "pending",
        metadata: {
          ...entry.metadata,
          paddle_data: transactionData.data,
        },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          checkout_url: transactionData.data?.checkout?.url,
          transaction_id: transactionData.data?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[paddle-payment] error", error);
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

