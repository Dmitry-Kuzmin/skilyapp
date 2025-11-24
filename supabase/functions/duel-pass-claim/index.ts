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
      // Добавляем скин в инвентарь пользователя
      const { error: skinError } = await supabase
        .from("user_skins")
        .insert({
          user_id,
          skin_id: rewardPayload.id,
          obtained_from: "duel_pass",
          obtained_metadata: {
            season,
            level,
            is_premium,
          },
        });

      if (skinError && skinError.code !== "23505") {
        // Игнорируем ошибку дубликата (пользователь уже имеет этот скин)
        console.error("[duel-pass-claim] Error adding skin:", skinError);
      }

      // Также логируем в транзакции для истории
      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "item_received",
        amount: 0,
        metadata: {
          source: "duel_pass_reward",
          level,
          is_premium,
          reward_type: "skin",
          skin_id: rewardPayload.id,
        },
      });
    } else if (rewardPayload.type === "badge" && rewardPayload.id) {
      // Добавляем бейдж в инвентарь пользователя
      const { error: badgeError } = await supabase
        .from("user_badges")
        .insert({
          user_id,
          badge_id: rewardPayload.id,
          obtained_from: "duel_pass",
          obtained_metadata: {
            season,
            level,
            is_premium,
          },
        });

      if (badgeError && badgeError.code !== "23505") {
        console.error("[duel-pass-claim] Error adding badge:", badgeError);
      }

      // Также логируем в транзакции
      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "item_received",
        amount: 0,
        metadata: {
          source: "duel_pass_reward",
          level,
          is_premium,
          reward_type: "badge",
          badge_id: rewardPayload.id,
        },
      });
    } else if (rewardPayload.type === "sticker" && rewardPayload.id) {
      // Добавляем стикер в инвентарь (или увеличиваем количество)
      const { data: existingSticker } = await supabase
        .from("user_stickers")
        .select("quantity")
        .eq("user_id", user_id)
        .eq("sticker_id", rewardPayload.id)
        .maybeSingle();

      if (existingSticker) {
        // Увеличиваем количество
        await supabase
          .from("user_stickers")
          .update({ quantity: existingSticker.quantity + (rewardPayload.amount || 1) })
          .eq("user_id", user_id)
          .eq("sticker_id", rewardPayload.id);
      } else {
        // Создаем новую запись
        await supabase.from("user_stickers").insert({
          user_id,
          sticker_id: rewardPayload.id,
          quantity: rewardPayload.amount || 1,
          obtained_from: "duel_pass",
          obtained_metadata: {
            season,
            level,
            is_premium,
          },
        });
      }

      // Также логируем в транзакции
      await supabase.from("transactions").insert({
        user_id,
        transaction_type: "item_received",
        amount: 0,
        metadata: {
          source: "duel_pass_reward",
          level,
          is_premium,
          reward_type: "sticker",
          sticker_id: rewardPayload.id,
          quantity: rewardPayload.amount || 1,
        },
      });
    }

    // ИСПРАВЛЕНИЕ БАГА: Обрабатываем возможную ошибку дубликата при вставке (race condition)
    const { error: insertError } = await supabase.from("user_claimed_rewards").insert({
      user_id,
      season,
      level,
      is_premium,
    });

    // ИСПРАВЛЕНИЕ БАГА: Если произошла ошибка дубликата (код 23505) - возвращаем 409
    if (insertError) {
      if (insertError.code === "23505") {
        // UNIQUE constraint violation - награда уже получена (race condition)
        return new Response(
          JSON.stringify({ 
            error: "Reward already claimed",
            message: "Эта награда уже была получена" 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Другая ошибка
      console.error("[duel-pass-claim] Error inserting claimed reward:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save claimed reward", message: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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


