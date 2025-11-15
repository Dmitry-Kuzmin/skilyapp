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

    const { user_id, completed_challenges } = await req.json();

    if (!user_id || !completed_challenges || !Array.isArray(completed_challenges)) {
      return new Response(
        JSON.stringify({ error: "user_id and completed_challenges array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSP = 0;
    let totalCoins = 0;
    const rewards: any[] = [];

    // Начисляем награды за каждый завершенный челлендж
    for (const challenge of completed_challenges) {
      const spReward = challenge.reward_sp || 0;
      const coinsReward = challenge.reward_coins || 0;

      totalSP += spReward;
      totalCoins += coinsReward;

      rewards.push({
        challenge_id: challenge.challenge_id,
        title: challenge.title,
        sp: spReward,
        coins: coinsReward,
      });

      // Отмечаем, что награда получена
      await supabase
        .from("user_challenge_progress")
        .update({
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .eq("challenge_id", challenge.challenge_id);
    }

    // Начисляем SP через season-sp функцию
    if (totalSP > 0) {
      // Получаем активный сезон
      const { data: activeSeason } = await supabase.rpc("get_active_season");
      if (activeSeason && activeSeason.length > 0) {
        // Начисляем SP напрямую через обновление прогресса
        const { data: progressData } = await supabase
          .rpc("get_or_create_season_progress", {
            p_user_id: user_id,
            p_season_id: activeSeason[0].id,
          });

        if (progressData && progressData.length > 0) {
          const currentSP = progressData[0].season_points || 0;
          const newSP = currentSP + totalSP;

          await supabase
            .from("user_season_progress")
            .update({
              season_points: newSP,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user_id)
            .eq("season_id", activeSeason[0].id);
        }
      }
    }

    // Начисляем монеты через coins-earn функцию
    if (totalCoins > 0) {
      await supabase.functions.invoke("coins-earn", {
        body: {
          user_id,
          reward_type: "challenge_reward",
          metadata: {
            source: "season_challenge",
            challenges: completed_challenges.map((c: any) => c.challenge_id),
          },
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_sp: totalSP,
        total_coins: totalCoins,
        rewards,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[season-challenges-reward] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

