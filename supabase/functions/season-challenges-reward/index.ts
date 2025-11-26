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

    let coinsAwarded = 0;
    if (totalCoins > 0) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, premium_until, trial_until")
        .eq("id", user_id)
        .single();

      if (profileError || !profile) {
        throw new Error("Profile not found for coin reward");
      }

      const now = new Date();
      const isPremium =
        (profile.premium_until && new Date(profile.premium_until) > now) ||
        (profile.trial_until && new Date(profile.trial_until) > now);

      const multiplier = isPremium ? 1.5 : 1;
      coinsAwarded = Math.round(totalCoins * multiplier);

      const challengesList = completed_challenges.map((c: any) => c.challenge_id);

      const { error: coinsError } = await supabase.rpc("increment_profile_value", {
        p_profile_id: profile.id,
        p_column: "coins",
        p_amount: coinsAwarded,
      });

      if (coinsError) {
        throw coinsError;
      }

      await supabase.from("transactions").insert({
        user_id: profile.id,
        transaction_type: "coins_earned_challenge",
        amount: coinsAwarded,
        metadata: {
          source: "season_challenge",
          base_amount: totalCoins,
          multiplier,
          challenges: challengesList,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_sp: totalSP,
        total_coins: coinsAwarded,
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

