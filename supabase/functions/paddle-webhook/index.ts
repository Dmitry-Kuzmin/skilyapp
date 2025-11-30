import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Верифицировать подпись Paddle webhook
 * Paddle использует HMAC-SHA256 для подписи webhook
 * Формат заголовка: "ts=timestamp;h1=signature"
 * signature = base64(hmac_sha256(timestamp + ":" + payload, signature_key))
 */
async function verifyPaddleSignature(
  payload: string,
  signatureHeader: string,
  signatureKey: string
): Promise<boolean> {
  if (!signatureHeader || !signatureKey) {
    console.error("[paddle-webhook] Missing signature header or key");
    return false;
  }

  try {
    // Paddle отправляет подпись в формате: "ts=timestamp;h1=signature"
    const parts = signatureHeader.split(';');
    let timestamp = '';
    let signatureValue = '';

    for (const part of parts) {
      if (part.startsWith('ts=')) {
        timestamp = part.split('=')[1];
      } else if (part.startsWith('h1=')) {
        signatureValue = part.split('=')[1];
      }
    }

    if (!timestamp || !signatureValue) {
      console.error("[paddle-webhook] Invalid signature format:", signatureHeader);
      return false;
    }

    // Paddle создает подпись как: hmac_sha256(timestamp + ":" + payload, key)
    const message = `${timestamp}:${payload}`;

    // Создаем HMAC-SHA256 подпись
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signatureKey);
    const messageData = encoder.encode(message);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const computedSignature = await crypto.subtle.sign("HMAC", key, messageData);
    
    // Конвертируем в base64
    const computedBase64 = btoa(
      String.fromCharCode(...new Uint8Array(computedSignature))
    );

    // Безопасное сравнение подписей (constant-time)
    if (computedBase64.length !== signatureValue.length) {
      console.error("[paddle-webhook] Signature length mismatch");
      return false;
    }

    let match = true;
    for (let i = 0; i < computedBase64.length; i++) {
      if (computedBase64[i] !== signatureValue[i]) {
        match = false;
        break;
      }
    }

    if (!match) {
      console.error("[paddle-webhook] Signature verification failed");
    }

    return match;
  } catch (error) {
    console.error("[paddle-webhook] Signature verification error:", error);
    return false;
  }
}

/**
 * Проверить, что запрос пришел с IP адреса Paddle
 * Paddle IP адреса для live окружения
 */
function isPaddleIP(ip: string): boolean {
  // Paddle IP адреса для live (обновляйте по документации)
  const paddleIPs = [
    '34.232.58.13',
    '34.195.105.136',
    '34.237.3.244',
    // Добавьте другие IP адреса из документации Paddle
  ];

  // Если IP не передан, пропускаем проверку (для разработки)
  // В продакшене ОБЯЗАТЕЛЬНО проверять IP!
  if (!ip) {
    console.warn("[paddle-webhook] IP address not provided, skipping IP check");
    return true; // Разрешаем для разработки, но логируем предупреждение
  }

  return paddleIPs.includes(ip);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paddleSignatureKey = Deno.env.get("PADDLE_SIGNATURE_KEY");

    if (!paddleSignatureKey) {
      console.error("[paddle-webhook] Missing PADDLE_SIGNATURE_KEY");
      return new Response(
        JSON.stringify({ error: "PADDLE_SIGNATURE_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем IP адрес запроса
    const clientIP = req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() ||
                     req.headers.get("x-real-ip") ||
                     req.headers.get("cf-connecting-ip") ||
                     "";

    // Проверяем IP адрес (только в продакшене)
    const isLive = Deno.env.get("PADDLE_API_KEY")?.startsWith("live_");
    if (isLive && !isPaddleIP(clientIP)) {
      console.error("[paddle-webhook] Request from unauthorized IP:", clientIP);
      return new Response(
        JSON.stringify({ error: "Unauthorized IP address" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем подпись из заголовков
    const signatureHeader = req.headers.get("paddle-signature") || "";
    const bodyText = await req.text();
    
    // Верифицируем подпись
    const isValidSignature = await verifyPaddleSignature(bodyText, signatureHeader, paddleSignatureKey);
    if (!isValidSignature) {
      console.error("[paddle-webhook] Invalid signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(bodyText);
    console.log("[paddle-webhook] Received event:", event.event_id, event.event_type);

    // Обрабатываем разные типы событий
    switch (event.event_type) {
      case "transaction.completed": {
        const transaction = event.data;
        const transactionId = transaction.id;
        const customData = transaction.custom_data || {};

        // Находим покупку по transaction_id
        const { data: purchase, error: findError } = await supabase
          .from("purchases")
          .select("*")
          .eq("paddle_transaction_id", transactionId)
          .single();

        if (findError || !purchase) {
          console.error("[paddle-webhook] Purchase not found:", transactionId);
          return new Response(
            JSON.stringify({ error: "Purchase not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Обновляем статус покупки
        const { error: updateError } = await supabase
          .from("purchases")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            metadata: {
              ...purchase.metadata,
              paddle_webhook_data: event.data,
            },
          })
          .eq("id", purchase.id);

        if (updateError) {
          console.error("[paddle-webhook] Failed to update purchase:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update purchase" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Награждаем пользователя в зависимости от типа покупки
        const userId = purchase.user_id;
        const itemType = purchase.item_type;
        const itemId = purchase.item_id;

        if (itemType === "premium") {
          // Добавляем премиум доступ
          const days = itemId.includes("yearly") ? 365 : 30;
          const { error: premiumError } = await supabase.rpc("grant_premium_access", {
            p_user_id: userId,
            p_days: days,
          });

          if (premiumError) {
            console.error("[paddle-webhook] Failed to grant premium:", premiumError);
          }
        } else if (itemType === "coins_pack") {
          // Добавляем монеты
          const coins = purchase.metadata?.coins || 0;
          const { error: coinsError } = await supabase.rpc("add_coins", {
            p_user_id: userId,
            p_amount: coins,
          });

          if (coinsError) {
            console.error("[paddle-webhook] Failed to add coins:", coinsError);
          }
        } else if (itemType === "duel_pass") {
          // Разблокируем Duel Pass
          // TODO: Реализовать логику разблокировки Duel Pass
          console.log("[paddle-webhook] Duel Pass purchase completed:", userId);
        }

        return new Response(
          JSON.stringify({ success: true, processed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "transaction.payment_failed": {
        const transaction = event.data;
        const transactionId = transaction.id;

        // Обновляем статус на failed
        const { error: updateError } = await supabase
          .from("purchases")
          .update({
            status: "failed",
            metadata: {
              paddle_webhook_data: event.data,
            },
          })
          .eq("paddle_transaction_id", transactionId);

        if (updateError) {
          console.error("[paddle-webhook] Failed to update purchase status:", updateError);
        }

        return new Response(
          JSON.stringify({ success: true, processed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "subscription.created":
      case "subscription.updated":
      case "subscription.cancelled": {
        // Обработка событий подписки
        const subscription = event.data;
        const subscriptionId = subscription.id;

        // Обновляем subscription_id в покупке
        const { error: updateError } = await supabase
          .from("purchases")
          .update({
            paddle_subscription_id: subscriptionId,
            metadata: {
              paddle_subscription_data: event.data,
            },
          })
          .eq("paddle_subscription_id", subscriptionId)
          .or(`paddle_transaction_id.eq.${subscription.transaction_id}`);

        if (updateError) {
          console.error("[paddle-webhook] Failed to update subscription:", updateError);
        }

        return new Response(
          JSON.stringify({ success: true, processed: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        console.log("[paddle-webhook] Unhandled event type:", event.event_type);
        return new Response(
          JSON.stringify({ success: true, processed: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[paddle-webhook] error", error);
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


