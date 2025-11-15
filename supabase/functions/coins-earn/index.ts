import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_REWARDS: Record<string, number> = {
  daily_login: 5,
  complete_test: 10,
  win_duel: 30,
  lose_duel: 5,
  streak_3_days: 25,
  streak_7_days: 100,
  monthly_premium_bonus: 500,
  challenge_reward: 0, // Награда будет передана в metadata
};

const TYPE_TO_TRANSACTION: Record<string, string> = {
  daily_login: "coins_earned_daily",
  complete_test: "coins_earned_test",
  win_duel: "coins_earned_duel",
  lose_duel: "coins_earned_duel",
  streak_3_days: "coins_earned_daily",
  streak_7_days: "coins_earned_daily",
  monthly_premium_bonus: "coins_earned_premium_bonus",
  challenge_reward: "coins_earned_challenge",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, reward_type, metadata } = await req.json();

    if (!user_id || !reward_type) {
      return new Response(
        JSON.stringify({ error: "user_id and reward_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let baseAmount = BASE_REWARDS[reward_type];
    
    // Для challenge_reward берем сумму из metadata
    if (reward_type === 'challenge_reward' && metadata?.total_coins) {
      baseAmount = metadata.total_coins;
    }
    
    if (baseAmount === undefined) {
      return new Response(
        JSON.stringify({ error: "Unsupported reward_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, coins, premium_until, trial_until")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const isPremium =
      (profile.premium_until && new Date(profile.premium_until) > now) ||
      (profile.trial_until && new Date(profile.trial_until) > now);

    const multiplier = isPremium ? 1.5 : 1;
    const rewardAmount = Math.round(baseAmount * multiplier);

    const { error: incrementError } = await supabase.rpc("increment_profile_value", {
      p_profile_id: profile.id,
      p_column: "coins",
      p_amount: rewardAmount,
    });

    if (incrementError) {
      console.error("[coins-earn] increment error", incrementError);
      return new Response(
        JSON.stringify({ error: "Failed to update balance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("transactions").insert({
      user_id: profile.id,
      transaction_type: TYPE_TO_TRANSACTION[reward_type] ?? "coins_earned_daily",
      amount: rewardAmount,
      metadata: {
        reward_type,
        base_amount: baseAmount,
        multiplier,
        ...(metadata || {}),
      },
    });

    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", profile.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        reward_amount: rewardAmount,
        new_balance: updatedProfile?.coins ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[coins-earn] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


