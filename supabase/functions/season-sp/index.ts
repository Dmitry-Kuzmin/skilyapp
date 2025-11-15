import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Правила начисления SP (Season Points)
const SP_RULES: Record<string, number> = {
  test_completed: 25,
  test_perfect: 35, // Тест без ошибок
  duel_win: 30,
  duel_lose: 10,
  duel_draw: 15,
  daily_login: 15,
  streak_bonus: 5, // Бонус за каждый день streak
  challenge_reward: 0, // Награда будет передана в metadata
};

const BASE_WIN_NO_BET_SP = 30;
const BASE_LOSE_SP = 5;
const DRAW_SP = 15;

const riskMultiplierForBet = (betAmount: number) => {
  if (!betAmount || betAmount <= 0) return 1;
  if (betAmount >= 600) return 4;
  if (betAmount >= 450) return 3;
  if (betAmount >= 300) return 2.25;
  if (betAmount >= 200) return 1.75;
  if (betAmount >= 100) return 1.25;
  return 1.1;
};

const calculateWinSP = (betAmount: number) => {
  return Math.round(20 * riskMultiplierForBet(betAmount));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, source_type, metadata } = await req.json();

    if (!user_id || !source_type) {
      return new Response(
        JSON.stringify({ error: "user_id and source_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let spGain = SP_RULES[source_type];
    const isDuelWin = source_type === 'duel_win';
    const isDuelLose = source_type === 'duel_lose';
    const isDuelDraw = source_type === 'duel_draw';
    
    if (isDuelWin || isDuelLose || isDuelDraw) {
      const duelId = metadata?.duel_id;
      if (!duelId) {
        console.warn("[season-sp] duel_id missing in metadata, falling back to base rewards");
      }
      
      let betAmount = 0;
      if (duelId) {
        const { data: duelData, error: duelError } = await supabase
          .from("duels")
          .select("id, bet_amount")
          .eq("id", duelId)
          .maybeSingle();
        
        if (duelData && !duelError) {
          betAmount = duelData.bet_amount || 0;
        }
      }
      const hasBet = betAmount > 0;
      
      if (isDuelDraw) {
        spGain = DRAW_SP;
      } else if (isDuelWin) {
        spGain = hasBet ? calculateWinSP(betAmount) : BASE_WIN_NO_BET_SP;
      } else {
        spGain = BASE_LOSE_SP;
      }
    }
    
    // Для challenge_reward берем SP из metadata
    if (source_type === 'challenge_reward' && metadata?.sp_earned) {
      spGain = metadata.sp_earned;
    }
    
    if (spGain === undefined || spGain <= 0) {
      return new Response(
        JSON.stringify({ error: "Unsupported source_type or invalid SP amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем активный сезон
    const { data: activeSeason, error: seasonError } = await supabase
      .rpc("get_active_season");

    if (seasonError || !activeSeason || activeSeason.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active season found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const season = activeSeason[0];
    const seasonId = season.id;

    // Получаем или создаем прогресс пользователя в сезоне
    const { data: progressData, error: progressError } = await supabase
      .rpc("get_or_create_season_progress", {
        p_user_id: user_id,
        p_season_id: seasonId,
      });

    if (progressError || !progressData || progressData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to get or create season progress" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const progress = progressData[0];
    const currentSP = progress.season_points || 0;
    const currentLevel = progress.level || 1;

    // Проверяем Premium Pass для бонуса +20% SP
    const { data: profile } = await supabase
      .from("profiles")
      .select("premium_until, trial_until")
      .eq("id", user_id)
      .single();

    const now = new Date();
    const isPremium =
      (profile?.premium_until && new Date(profile.premium_until) > now) ||
      (profile?.trial_until && new Date(profile.trial_until) > now);

    // Проверяем, есть ли Premium Pass для сезона
    const { data: seasonProgress } = await supabase
      .from("user_season_progress")
      .select("premium_pass_purchased")
      .eq("user_id", user_id)
      .eq("season_id", seasonId)
      .single();

    const hasPremiumPass = seasonProgress?.premium_pass_purchased || false;
    const spMultiplier = (isPremium || hasPremiumPass) ? 1.2 : 1.0; // +20% для Premium
    const finalSPGain = Math.round(spGain * spMultiplier);

    const newSP = currentSP + finalSPGain;

    // Получаем награды сезона для расчета уровня
    const { data: rewards, error: rewardsError } = await supabase
      .from("duel_pass_season_rewards")
      .select("level, sp_required")
      .eq("season_id", seasonId)
      .order("level", { ascending: true });

    if (rewardsError || !rewards) {
      return new Response(
        JSON.stringify({ error: "Failed to load season rewards" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Вычисляем новый уровень на основе накопленных SP
    let newLevel = 1;
    const maxLevel = rewards[rewards.length - 1]?.level ?? 30;

    for (const reward of rewards) {
      if (newSP >= reward.sp_required) {
        newLevel = Math.min(reward.level, maxLevel);
      } else {
        break;
      }
    }

    const levelUp = newLevel > currentLevel;

    // Обновляем прогресс пользователя
    const { error: updateError } = await supabase
      .from("user_season_progress")
      .update({
        season_points: newSP,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .eq("season_id", seasonId);

    if (updateError) {
      console.error("[season-sp] update error", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update season progress" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Отслеживаем прогресс по челленджам
    // Это будет обрабатываться отдельной функцией, но можно вызвать здесь
    try {
      await supabase.functions.invoke("season-challenges-track", {
        body: {
          user_id,
          source_type,
          metadata: metadata || {},
        },
      });
    } catch (err) {
      // Игнорируем ошибки отслеживания челленджей, чтобы не блокировать начисление SP
      console.warn("[season-sp] challenge tracking error", err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sp_added: finalSPGain,
        base_sp: spGain,
        multiplier: spMultiplier,
        total_sp: newSP,
        level: newLevel,
        level_up: levelUp,
        season_id: seasonId,
        season_name: season.name_ru,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[season-sp] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

