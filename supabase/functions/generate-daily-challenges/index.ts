import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Шаблоны ежедневных челленджей
const DAILY_CHALLENGE_TEMPLATES = [
  {
    title_ru: "3 идеальных теста",
    description_ru: "Пройди 3 теста без ошибок за день",
    target_type: "tests_perfect",
    target_value: 3,
    reward_sp: 25,
    reward_coins: 10,
  },
  {
    title_ru: "100 SP за день",
    description_ru: "Набери 100 Season Points за день",
    target_type: "sp_earned",
    target_value: 100,
    reward_sp: 15,
    reward_coins: 5,
  },
  {
    title_ru: "5 тестов за день",
    description_ru: "Пройди 5 тестов за день",
    target_type: "tests_completed",
    target_value: 5,
    reward_sp: 20,
    reward_coins: 8,
  },
  {
    title_ru: "50 вопросов за день",
    description_ru: "Ответь на 50 вопросов за день",
    target_type: "questions_answered",
    target_value: 50,
    reward_sp: 18,
    reward_coins: 7,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем активный сезон
    const { data: activeSeason, error: seasonError } = await supabase
      .rpc("get_active_season");

    if (seasonError || !activeSeason || activeSeason.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active season" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const season = activeSeason[0];
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Проверяем, есть ли уже ежедневные челленджи на сегодня
    const { data: existingChallenges } = await supabase
      .from("season_challenges")
      .select("id")
      .eq("season_id", season.id)
      .eq("challenge_type", "daily")
      .eq("start_date", today)
      .eq("is_active", true);

    if (existingChallenges && existingChallenges.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Daily challenges already exist for today",
          count: existingChallenges.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Деактивируем старые ежедневные челленджи
    await supabase
      .from("season_challenges")
      .update({ is_active: false })
      .eq("season_id", season.id)
      .eq("challenge_type", "daily")
      .lt("end_date", today);

    // Создаем новые ежедневные челленджи (выбираем случайные 2 из шаблонов)
    const selectedTemplates = DAILY_CHALLENGE_TEMPLATES
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    const newChallenges = selectedTemplates.map((template) => ({
      season_id: season.id,
      challenge_type: "daily" as const,
      title_ru: template.title_ru,
      description_ru: template.description_ru,
      target_type: template.target_type,
      target_value: template.target_value,
      reward_sp: template.reward_sp,
      reward_coins: template.reward_coins,
      start_date: today,
      end_date: tomorrow,
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from("season_challenges")
      .insert(newChallenges);

    if (insertError) {
      console.error("[generate-daily-challenges] insert error", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create daily challenges" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        challenges_created: newChallenges.length,
        challenges: newChallenges.map((c) => c.title_ru),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-daily-challenges] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

