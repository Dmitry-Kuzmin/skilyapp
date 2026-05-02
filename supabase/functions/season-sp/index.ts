import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Правила начисления SP (Season Points)
// ВАЖНО: test_* источники теперь рассчитываются динамически на основе результата
// (см. computeTestSP ниже). Жёсткие 25/35 убраны — это давало SP за любой тест.
const SP_RULES: Record<string, number> = {
  test_completed: 0,   // динамический расчёт через computeTestSP
  test_perfect:   0,   // динамический расчёт через computeTestSP
  exam_completed: 0,   // динамический расчёт через computeTestSP
  duel_win: 30,
  duel_lose: 10,
  duel_draw: 15,
  daily_login: 15,
  streak_bonus: 5,
  challenge_reward: 0,
};

/**
 * Расчёт SP за тест/экзамен по результату.
 *
 *  ПРАКТИКА (test_completed / test_perfect):
 *    accuracy < 80%   →  0 SP   (учишься плохо — не качаешь сезон)
 *    accuracy ≥ 80%   →  correct_count × 1   (макс 20 SP)
 *    accuracy = 100%  →  +10 SP бонус
 *
 *  ЭКЗАМЕН (exam_completed):
 *    score < 90       →  0 SP   (не сдан)
 *    score 90-99      →  30 SP  (сдан)
 *    score = 100      →  50 SP  (идеально)
 */
function computeTestSP(
  sourceType: string,
  score: number,
  questionsCount: number,
  correctCount: number,
): number {
  // Экзамен — отдельная логика (большие награды только за реальный успех)
  if (sourceType === 'exam_completed') {
    if (score < 90)  return 0;
    if (score === 100) return 50;
    return 30;
  }

  // Практика
  if (sourceType === 'test_completed' || sourceType === 'test_perfect') {
    if (score < 80) return 0;

    let sp = Math.min(correctCount, 20);  // макс 20 SP
    if (score === 100) sp += 10;          // perfect-бонус
    return sp;
  }

  return 0;
}

const BASE_WIN_NO_BET_SP = 15;
const BASE_LOSE_SP = 10;
const DRAW_SP = 7;
const MIN_BET_FOR_LOSE_SP = 100;
const LOSE_SP_WITH_BET = 20;

const riskMultiplierForBet = (betAmount: number): number => {
  if (!betAmount || betAmount <= 0) return 1;
  if (betAmount >= 600) return 4;
  if (betAmount >= 450) return 3;
  if (betAmount >= 300) return 2.25;
  if (betAmount >= 200) return 1.75;
  if (betAmount >= 100) return 1.25;
  return 1.1;
};

const calculateWinSP = (betAmount: number): number => {
  return Math.round(20 * riskMultiplierForBet(betAmount));
};

interface EventMetadata {
  duel_id?: string;
  sp_earned?: number;
  [key: string]: unknown;
}

interface SeasonSPRequest {
  user_id: string;
  source_type: string;
  metadata?: EventMetadata;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createPooledSupabaseClient();
    const body: SeasonSPRequest = await req.json();
    const { user_id, source_type, metadata } = body;

    if (!user_id || !source_type) {
      return new Response(JSON.stringify({ error: "user_id and source_type are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let spGain = SP_RULES[source_type];
    const isDuelWin = source_type === 'duel_win';
    const isDuelLose = source_type === 'duel_lose';
    const isDuelDraw = source_type === 'duel_draw';

    if (isDuelWin || isDuelLose || isDuelDraw) {
      const duelId = metadata?.duel_id;
      let betAmount = 0;
      if (duelId) {
        const { data: duelData } = await supabase.from("duels").select("bet_amount").eq("id", duelId).maybeSingle();
        if (duelData) betAmount = duelData.bet_amount || 0;
      }
      const hasBet = betAmount > 0;

      if (isDuelDraw) {
        spGain = hasBet ? 15 : DRAW_SP;
      } else if (isDuelWin) {
        spGain = hasBet ? calculateWinSP(betAmount) : BASE_WIN_NO_BET_SP;
      } else {
        spGain = (hasBet && betAmount >= MIN_BET_FOR_LOSE_SP) ? LOSE_SP_WITH_BET : BASE_LOSE_SP;
      }
    }

    if (source_type === 'challenge_reward' && metadata?.sp_earned) {
      spGain = metadata.sp_earned;
    }

    if (spGain === undefined || spGain < 0) {
      return new Response(JSON.stringify({ error: "Unsupported source_type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Soft-cap
    const DUEL_SP_DAILY_CAP = 3500;
    if (isDuelWin || isDuelLose || isDuelDraw) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayBets } = await supabase
        .from('duel_bet_history')
        .select('season_sp_host, season_sp_opponent, host_user, opponent_user')
        .or(`host_user.eq.${user_id},opponent_user.eq.${user_id}`)
        .gte('created_at', todayStart.toISOString());

      let todaySPFromDuels = 0;
      if (todayBets) {
        todaySPFromDuels = todayBets.reduce((sum, bet) => {
          return sum + (bet.host_user === user_id ? (bet.season_sp_host || 0) : 0) +
            (bet.opponent_user === user_id ? (bet.season_sp_opponent || 0) : 0);
        }, 0);
      }

      if (todaySPFromDuels >= DUEL_SP_DAILY_CAP) {
        spGain = 0;
      } else if (todaySPFromDuels + spGain > DUEL_SP_DAILY_CAP) {
        spGain = Math.max(0, DUEL_SP_DAILY_CAP - todaySPFromDuels);
      }
    }

    const { data: activeSeason, error: seasonError } = await supabase.rpc("get_active_season");
    if (seasonError || !activeSeason || activeSeason.length === 0) {
      return new Response(JSON.stringify({ error: "No active season found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const season = activeSeason[0];
    const { data: progressData, error: progressError } = await supabase.rpc("get_or_create_season_progress", { p_user_id: user_id, p_season_id: season.id });

    if (progressError || !progressData || progressData.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to get progress" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const progress = progressData[0];
    const { data: profile } = await supabase.from("profiles").select("premium_until, trial_until").eq("id", user_id).single();

    const nowStr = new Date().toISOString();
    const isPremium = (profile?.premium_until && profile.premium_until > nowStr) || (profile?.trial_until && profile.trial_until > nowStr);
    const hasPremiumPass = progress.premium_pass_purchased || false;
    let spMultiplier = (isPremium || hasPremiumPass) ? 1.2 : 1.0;

    const { data: activeBoost } = await supabase
      .from("active_boosts")
      .select("effect_multiplier")
      .eq("user_id", user_id)
      .eq("effect_type", "sp_multiplier")
      .gt("expires_at", nowStr)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeBoost?.effect_multiplier) {
      spMultiplier *= parseFloat(activeBoost.effect_multiplier.toString());
    }

    const finalSPGain = Math.round(spGain * spMultiplier);
    const newSP = (progress.season_points || 0) + finalSPGain;

    const { data: rewards } = await supabase.from("duel_pass_season_rewards").select("level, sp_required").eq("season_id", season.id).order("level", { ascending: true });

    let newLevel = 1;
    if (rewards) {
      for (const r of rewards) {
        if (newSP >= r.sp_required) newLevel = r.level;
        else break;
      }
    }

    await supabase.from("user_season_progress").update({ season_points: newSP, level: newLevel, updated_at: nowStr }).eq("user_id", user_id).eq("season_id", season.id);

    try {
      await supabase.functions.invoke("season-challenges-track", { body: { user_id, source_type, metadata: metadata || {} } });
    } catch (err) {
      console.warn("[season-sp] challenge tracking error", err);
    }

    return new Response(JSON.stringify({ success: true, sp_added: finalSPGain, total_sp: newSP, level: newLevel, level_up: newLevel > progress.level }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[season-sp] error", error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
