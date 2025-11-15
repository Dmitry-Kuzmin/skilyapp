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

    const { user_id, source_type, metadata } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем активный сезон
    const { data: activeSeason, error: seasonError } = await supabase
      .rpc("get_active_season");

    if (seasonError || !activeSeason || activeSeason.length === 0) {
      // Нет активного сезона - ничего не делаем
      return new Response(
        JSON.stringify({ success: true, message: "No active season" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const season = activeSeason[0];
    const seasonId = season.id;
    const today = new Date().toISOString().split('T')[0];

    // Получаем активные челленджи для текущего сезона
    const { data: challenges, error: challengesError } = await supabase
      .from("season_challenges")
      .select("*")
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`);

    if (challengesError || !challenges) {
      return new Response(
        JSON.stringify({ success: true, message: "No active challenges" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updatedChallenges: any[] = [];
    const completedChallenges: any[] = [];

    // Обрабатываем каждый челлендж
    for (const challenge of challenges) {
      // Проверяем, соответствует ли source_type типу челленджа
      let shouldUpdate = false;
      let incrementValue = 0;

      switch (challenge.target_type) {
        case 'tests_completed':
          if (source_type === 'test_completed' || source_type === 'test_perfect') {
            shouldUpdate = true;
            incrementValue = 1;
          }
          break;
        case 'tests_perfect':
          if (source_type === 'test_perfect') {
            shouldUpdate = true;
            incrementValue = 1;
          }
          break;
        case 'questions_answered':
          if (source_type === 'test_completed' || source_type === 'test_perfect') {
            shouldUpdate = true;
            // Предполагаем, что в metadata есть количество вопросов
            incrementValue = metadata?.questions_count || 10;
          }
          break;
        case 'duels_played':
          if (source_type === 'duel_win' || source_type === 'duel_lose') {
            shouldUpdate = true;
            incrementValue = 1;
          }
          break;
        case 'duels_won':
          if (source_type === 'duel_win') {
            shouldUpdate = true;
            incrementValue = 1;
          }
          break;
        case 'streak_days':
          if (source_type === 'daily_login' && metadata?.streak_days) {
            shouldUpdate = true;
            incrementValue = metadata.streak_days;
          }
          break;
        case 'sp_earned':
          if (metadata?.sp_earned) {
            shouldUpdate = true;
            incrementValue = metadata.sp_earned;
          }
          break;
        case 'coins_earned':
          if (metadata?.coins_earned) {
            shouldUpdate = true;
            incrementValue = metadata.coins_earned;
          }
          break;
      }

      if (!shouldUpdate) continue;

      // Получаем или создаем прогресс пользователя по челленджу
      const { data: existingProgress } = await supabase
        .from("user_challenge_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("challenge_id", challenge.id)
        .maybeSingle();

      let currentProgress = existingProgress?.progress || 0;
      const isCompleted = existingProgress?.completed || false;

      // Если уже завершен, пропускаем
      if (isCompleted) continue;

      // Обновляем прогресс
      const newProgress = Math.min(currentProgress + incrementValue, challenge.target_value);
      const nowCompleted = newProgress >= challenge.target_value;

      if (existingProgress) {
        // Обновляем существующий прогресс
        const { error: updateError } = await supabase
          .from("user_challenge_progress")
          .update({
            progress: newProgress,
            completed: nowCompleted,
            completed_at: nowCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProgress.id);

        if (updateError) {
          console.error(`[season-challenges-track] update error for challenge ${challenge.id}`, updateError);
          continue;
        }
      } else {
        // Создаем новый прогресс
        const { error: insertError } = await supabase
          .from("user_challenge_progress")
          .insert({
            user_id,
            challenge_id: challenge.id,
            progress: newProgress,
            completed: nowCompleted,
            completed_at: nowCompleted ? new Date().toISOString() : null,
          });

        if (insertError) {
          console.error(`[season-challenges-track] insert error for challenge ${challenge.id}`, insertError);
          continue;
        }
      }

      updatedChallenges.push({
        challenge_id: challenge.id,
        title: challenge.title_ru,
        progress: newProgress,
        target: challenge.target_value,
        completed: nowCompleted,
      });

      // Если челлендж завершен, добавляем в список завершенных
      if (nowCompleted) {
        completedChallenges.push({
          challenge_id: challenge.id,
          title: challenge.title_ru,
          reward_sp: challenge.reward_sp,
          reward_coins: challenge.reward_coins,
        });
      }
    }

    // Автоматически начисляем награды за завершенные челленджи
    if (completedChallenges.length > 0) {
      try {
        await supabase.functions.invoke("season-challenges-reward", {
          body: {
            user_id,
            completed_challenges: completedChallenges,
          },
        });
      } catch (err) {
        console.error("[season-challenges-track] reward error", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated_challenges: updatedChallenges,
        completed_challenges: completedChallenges,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[season-challenges-track] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

