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

    const { user_id, level, is_premium = false, season = 1 } = await req.json();

    if (!user_id || !level) {
      return new Response(
        JSON.stringify({ error: "user_id and level are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверяем существование профиля
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем активный сезон
    const { data: seasonData, error: seasonError } = await supabase
      .rpc("get_active_season");

    if (seasonError || !seasonData || seasonData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Active season not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activeSeason = seasonData[0];
    const seasonId = activeSeason.id;

    // Получаем прогресс пользователя в сезоне
    const { data: progressData, error: progressError } = await supabase
      .rpc("get_or_create_season_progress", {
        p_user_id: user_id,
        p_season_id: seasonId,
      });

    if (progressError || !progressData || progressData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to get season progress" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const seasonProgress = progressData[0];
    const userLevel = seasonProgress.level || 1;

    // Проверяем, разблокирован ли уровень
    if (level > userLevel) {
      return new Response(
        JSON.stringify({ 
          error: "Level not unlocked yet",
          message: `Уровень ${level} еще не разблокирован. Ваш текущий уровень: ${userLevel}` 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: alreadyClaimed } = await supabase
      .from("user_claimed_rewards")
      .select("id")
      .eq("user_id", user_id)
      .eq("season", season)
      .eq("level", level)
      .eq("is_premium", is_premium)
      .maybeSingle();

    if (alreadyClaimed) {
      return new Response(
        JSON.stringify({ 
          error: "Reward already claimed",
          message: "Эта награда уже была получена" 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем награду из сезонных наград
    const { data: reward, error: rewardError } = await supabase
      .from("duel_pass_season_rewards")
      .select(is_premium ? "premium_reward" : "free_reward")
      .eq("season_id", seasonId)
      .eq("level", level)
      .single();

    if (rewardError || !reward) {
      return new Response(
        JSON.stringify({ error: "Reward not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rewardPayload = (is_premium ? reward.premium_reward : reward.free_reward) as {
      type: string;
      amount?: number;
      id?: string;
    };

    // Обработка разных типов наград
    if (rewardPayload.type === "coins" && rewardPayload.amount) {
      // Начисляем монеты
      await supabase.rpc("increment_profile_value", {
        p_profile_id: user_id,
        p_column: "coins",
        p_amount: rewardPayload.amount,
      });

      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "coins_earned_daily",
        amount: rewardPayload.amount,
        metadata: { 
          source: "duel_pass_reward", 
          level, 
          is_premium,
          reward_type: is_premium ? "premium" : "free"
        },
      });
    } else if (rewardPayload.type === "boost" && rewardPayload.id) {
      // Добавляем буст в инвентарь
      // Сначала проверяем, есть ли уже такой буст
      const { data: existingBoost } = await supabase
        .from("boost_inventory")
        .select("quantity")
        .eq("user_id", user_id)
        .eq("boost_type", rewardPayload.id)
        .maybeSingle();

      if (existingBoost) {
        // Увеличиваем количество
        await supabase
          .from("boost_inventory")
          .update({ quantity: existingBoost.quantity + 1 })
          .eq("user_id", user_id)
          .eq("boost_type", rewardPayload.id);
      } else {
        // Создаем новую запись
        await supabase
          .from("boost_inventory")
          .insert({
            user_id,
            boost_type: rewardPayload.id,
            quantity: 1,
          });
      }
    } else if (rewardPayload.type === "skin" && rewardPayload.id) {
      // Скины сохраняем в метаданных профиля или отдельной таблице
      // Пока просто логируем - можно расширить позже
      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "item_received",
        amount: 0,
        metadata: { 
          source: "duel_pass_reward", 
          level, 
          is_premium,
          reward_type: "skin",
          skin_id: rewardPayload.id
        },
      });
    } else if (rewardPayload.type === "badge" && rewardPayload.id) {
      // Бейджи сохраняем в метаданных профиля
      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "item_received",
        amount: 0,
        metadata: { 
          source: "duel_pass_reward", 
          level, 
          is_premium,
          reward_type: "badge",
          badge_id: rewardPayload.id
        },
      });
    } else if (rewardPayload.type === "sticker" && rewardPayload.id) {
      // Стикеры сохраняем в метаданных
      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "item_received",
        amount: 0,
        metadata: { 
          source: "duel_pass_reward", 
          level, 
          is_premium,
          reward_type: "sticker",
          sticker_id: rewardPayload.id
        },
      });
    }

    await supabase.from("user_claimed_rewards").insert({
      user_id,
      season,
      level,
      is_premium,
    });

    return new Response(
      JSON.stringify({ success: true, reward: rewardPayload }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[duel-pass-claim] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


