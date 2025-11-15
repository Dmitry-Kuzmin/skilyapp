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

    // Начисляем SP через season-sp функцию для правильного расчета уровня
    if (totalSP > 0) {
      await supabase.functions.invoke("season-sp", {
        body: {
          user_id,
          source_type: "challenge_reward",
          metadata: {
            sp_earned: totalSP,
            challenges: completed_challenges.map((c: any) => c.challenge_id),
          },
        },
      });
    }

    // Начисляем монеты через coins-earn функцию
    if (totalCoins > 0) {
      await supabase.functions.invoke("coins-earn", {
        body: {
          user_id,
          reward_type: "challenge_reward",
          metadata: {
            source: "season_challenge",
            total_coins: totalCoins,
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

