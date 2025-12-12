import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, season_id, payment_method = "telegram_stars" } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Проверяем существование профиля
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, subscription_type, subscription_status, premium_forever_purchased_at")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Получаем активный сезон (если season_id не указан)
    let activeSeasonId = season_id;
    if (!activeSeasonId) {
      const { data: seasonData, error: seasonError } = await supabase
        .rpc("get_active_season");

      if (seasonError || !seasonData || seasonData.length === 0) {
        return new Response(
          JSON.stringify({ error: "Active season not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      activeSeasonId = seasonData[0].id;
    }

    // 3. Проверяем Premium Forever - если есть, открываем бесплатно
    // Premium Forever активен ТОЛЬКО если:
    // 1. premium_forever_purchased_at установлен (покупка была совершена)
    // 2. И subscription_type = 'lifetime' И subscription_status = 'pro'
    const hasPremiumForever = 
      !!profile.premium_forever_purchased_at &&
      profile.subscription_type === 'lifetime' &&
      profile.subscription_status === 'pro';

    if (hasPremiumForever) {
      // Premium Forever - открываем Duel Pass бесплатно
      const { data: progressData, error: progressError } = await supabase
        .rpc("get_or_create_season_progress", {
          p_user_id: user_id,
          p_season_id: activeSeasonId,
        });

      if (progressError) {
        return new Response(
          JSON.stringify({ error: "Failed to get season progress" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Обновляем статус Premium Pass
      const { error: updateError } = await supabase
        .from("user_season_progress")
        .update({
          premium_pass_purchased: true,
          premium_pass_purchased_at: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .eq("season_id", activeSeasonId);

      if (updateError) {
        console.error("[duel-pass-purchase] Error updating premium pass:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to unlock premium pass" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Логируем транзакцию
      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "duel_pass_unlocked",
        amount: 0,
        metadata: {
          season_id: activeSeasonId,
          method: "premium_forever",
          source: "auto_unlock",
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          method: "premium_forever",
          message: "Duel Pass разблокирован благодаря Premium Forever!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Проверяем, не куплен ли уже Duel Pass для этого сезона
    const { data: existingProgress } = await supabase
      .from("user_season_progress")
      .select("premium_pass_purchased, premium_pass_purchased_at")
      .eq("user_id", user_id)
      .eq("season_id", activeSeasonId)
      .maybeSingle();

    if (existingProgress?.premium_pass_purchased) {
      return new Response(
        JSON.stringify({
          error: "Duel Pass already purchased",
          message: "Duel Pass для этого сезона уже куплен",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Цена Duel Pass: 7.99€ = 799 центов (или Telegram Stars эквивалент)
    const DUEL_PASS_PRICE_CENTS = 799;
    const DUEL_PASS_PRICE_STARS = 800; // ~1€ = 100 Stars

    // 6. Обработка платежа в зависимости от метода
    if (payment_method === "telegram_stars") {
      // Интеграция с Telegram Stars
      // В реальности здесь будет вызов Telegram Bot API для создания invoice
      // Пока что симулируем успешный платеж
      
      // TODO: Реальная интеграция с Telegram Stars
      // const invoice = await createTelegramInvoice({
      //   title: "Duel Pass Premium",
      //   description: "Premium награды для текущего сезона",
      //   payload: JSON.stringify({ type: "duel_pass", season_id: activeSeasonId }),
      //   provider_token: "...",
      //   currency: "XTR", // Telegram Stars
      //   prices: [{ label: "Duel Pass", amount: DUEL_PASS_PRICE_STARS }],
      // });

      // Для тестирования - сразу разблокируем
      console.log(`[duel-pass-purchase] Simulating Telegram Stars payment: ${DUEL_PASS_PRICE_STARS} stars`);
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported payment method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Создаем или обновляем прогресс сезона
    const { data: progressData, error: progressError } = await supabase
      .rpc("get_or_create_season_progress", {
        p_user_id: user_id,
        p_season_id: activeSeasonId,
      });

    if (progressError) {
      return new Response(
        JSON.stringify({ error: "Failed to get season progress" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Открываем Premium Pass
    const { error: updateError } = await supabase
      .from("user_season_progress")
      .update({
        premium_pass_purchased: true,
        premium_pass_purchased_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .eq("season_id", activeSeasonId);

    if (updateError) {
      console.error("[duel-pass-purchase] Error updating premium pass:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to unlock premium pass" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Логируем транзакцию
    await supabase.from("transactions").insert({
      user_id,
      transaction_type: "duel_pass_purchase",
      amount: -DUEL_PASS_PRICE_CENTS,
      metadata: {
        season_id: activeSeasonId,
        payment_method,
        price_cents: DUEL_PASS_PRICE_CENTS,
        price_stars: DUEL_PASS_PRICE_STARS,
      },
    });

    // 10. Отправляем уведомление пользователю
    try {
      await supabase.functions.invoke("notification-sender", {
        body: {
          user_id,
          type: "duel_pass_purchased",
          title: "🎉 Duel Pass Premium активирован!",
          message: "Теперь у тебя есть доступ ко всем Premium наградам!",
          metadata: {
            season_id: activeSeasonId,
          },
        },
      });
    } catch (notifError) {
      console.error("[duel-pass-purchase] Error sending notification:", notifError);
      // Не критично, продолжаем
    }

    return new Response(
      JSON.stringify({
        success: true,
        method: payment_method,
        season_id: activeSeasonId,
        message: "Duel Pass Premium успешно активирован!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[duel-pass-purchase] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


