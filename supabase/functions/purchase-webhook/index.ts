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

      // Получаем данные покупки (включая partner_code) перед обновлением
      const { data: purchaseData } = await supabase
        .from("purchases")
        .select("id, user_id, price, currency, partner_code")
        .eq("stripe_session_id", session.id)
        .single();

      // Обновляем статус покупки
      await supabase
        .from("purchases")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent?.toString() ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      // Получаем partner_code из покупки или из metadata (fallback)
      const partnerCode = purchaseData?.partner_code || metadata.partner_code || null;

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
          
          // Проверяем текущий баланс перед начислением
          const { data: profileBefore } = await supabase
            .from("profiles")
            .select("coins")
            .eq("id", userId)
            .single();
          
          const coinsBefore = profileBefore?.coins || 0;
          console.log(`[purchase-webhook] User ${userId} coins before: ${coinsBefore}`);

          const { error: incrementError } = await supabase.rpc("increment_profile_value", {
            p_profile_id: userId,
            p_column: "coins",
            p_amount: coins,
          });

          if (incrementError) {
            console.error(`[purchase-webhook] ❌ Error incrementing coins:`, incrementError);
            throw new Error(`Failed to add coins: ${incrementError.message}`);
          }

          // Проверяем баланс после начисления
          const { data: profileAfter } = await supabase
            .from("profiles")
            .select("coins")
            .eq("id", userId)
            .single();
          
          const coinsAfter = profileAfter?.coins || 0;
          console.log(`[purchase-webhook] User ${userId} coins after: ${coinsAfter} (expected: ${coinsBefore + coins})`);

          if (coinsAfter < coinsBefore + coins) {
            console.error(`[purchase-webhook] ⚠️ Coins not added correctly! Before: ${coinsBefore}, After: ${coinsAfter}, Expected: ${coinsBefore + coins}`);
            
            // Повторная попытка через RPC (атомарно)
            const missingCoins = (coinsBefore + coins) - coinsAfter;
            const { error: retryError } = await supabase.rpc("increment_profile_value", {
              p_profile_id: userId,
              p_column: "coins",
              p_amount: missingCoins,
            });
            
            if (retryError) {
              console.error(`[purchase-webhook] ❌ Retry failed:`, retryError);
              throw new Error(`Failed to add coins: RPC failed twice`);
            }
            
            console.log(`[purchase-webhook] ✅ Fixed coins via retry: ${coinsAfter} → ${coinsAfter + missingCoins}`);
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
          
          console.log(`[purchase-webhook] ✅ Successfully added ${coins} coins to user ${userId}`);
        } else {
          console.warn(`[purchase-webhook] ⚠️ No coins amount found in metadata for coins_pack purchase`);
        }
      }

      // ============================================================
      // ПАРТНЕРСКАЯ ПРОГРАММА: Трекинг покупки и начисление комиссии
      // ============================================================
      if (partnerCode && purchaseData) {
        try {
          console.log(`[purchase-webhook] Processing partner commission for code: ${partnerCode}`);

          // 1. Трекинг конверсии покупки
          const { data: conversionResult, error: trackError } = await supabase.rpc(
            'track_partner_conversion',
            {
              p_partner_code: partnerCode,
              p_event_type: 'purchase',
              p_user_id: userId,
              p_session_id: null, // Для покупок session_id может быть null (или можно получить из localStorage если сохранили)
              p_device_id: null,
              p_fingerprint_hash: null,
            }
          );

          if (trackError) {
            console.error(`[purchase-webhook] ❌ Error tracking partner conversion:`, trackError);
            // Не прерываем процесс, но логируем ошибку
          } else if (conversionResult && conversionResult.length > 0 && conversionResult[0].success) {
            const conversionId = conversionResult[0].conversion_id;
            console.log(`[purchase-webhook] ✅ Partner conversion tracked:`, conversionResult[0]);

            // 2. Обновляем конверсию данными о покупке (purchase_id, purchase_amount, commission)
            const { data: partnerData } = await supabase
              .from('partners')
              .select('id, commission_rate, promo_code_commission')
              .eq('partner_code', partnerCode.toUpperCase())
              .eq('status', 'active')
              .single();

            if (partnerData) {
              // Используем promo_code_commission если есть, иначе commission_rate (по умолчанию 30%)
              const commissionRate = partnerData.promo_code_commission ?? partnerData.commission_rate ?? 0.30;
              const commissionAmount = purchaseData.price * commissionRate;

              console.log(`[purchase-webhook] Calculating commission:`, {
                partner_id: partnerData.id,
                purchase_amount: purchaseData.price,
                commission_rate: commissionRate,
                commission_amount: commissionAmount,
              });

              // Обновляем конверсию данными о покупке
              await supabase
                .from('partner_conversions')
                .update({
                  purchase_id: purchaseData.id,
                  purchase_amount: purchaseData.price,
                  commission_amount: commissionAmount,
                  commission_rate: commissionRate,
                })
                .eq('id', conversionId);

              // 3. Начисляем комиссию в hold
              const { error: commissionError } = await supabase.rpc('add_partner_commission_to_hold', {
                p_partner_id: partnerData.id,
                p_amount: commissionAmount,
                p_purchase_id: purchaseData.id,
              });

              if (commissionError) {
                console.error(`[purchase-webhook] ❌ Error adding commission to hold:`, commissionError);
                // Не прерываем процесс, но логируем ошибку
              } else {
                console.log(`[purchase-webhook] ✅ Commission added to hold: €${commissionAmount.toFixed(2)}`);
              }
            } else {
              console.warn(`[purchase-webhook] ⚠️ Partner not found or inactive: ${partnerCode}`);
              // Обновляем хотя бы purchase_id и purchase_amount
              await supabase
                .from('partner_conversions')
                .update({
                  purchase_id: purchaseData.id,
                  purchase_amount: purchaseData.price,
                })
                .eq('id', conversionId);
            }
          }
        } catch (partnerError) {
          console.error(`[purchase-webhook] ❌ Error processing partner commission:`, partnerError);
          // Не прерываем основной процесс обработки покупки
        }
      } else {
        console.log(`[purchase-webhook] No partner code for this purchase`);
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


