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
    const { data: seasonData, error: seasonError } = await supabase.rpc("get_active_season");

    if (seasonError || !seasonData || seasonData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Active season not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activeSeason = seasonData[0];
    const seasonId = activeSeason.id;
    const seasonNumber = activeSeason.season_number || season;

    // Получаем прогресс пользователя
    const { data: progressData, error: progressError } = await supabase.rpc("get_or_create_season_progress", {
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

    if (level > userLevel) {
      return new Response(
        JSON.stringify({
          error: "Level not unlocked yet",
          message: `Уровень ${level} еще не разблокирован. Ваш текущий уровень: ${userLevel}`
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    type RewardPayload = {
      type: string;
      amount?: number;
      id?: string;
    };

    type ProcessResult =
      | { status: "granted"; reward: RewardPayload; isPremium: boolean }
      | { status: "already_claimed"; isPremium: boolean };

    const processReward = async (
      rewardPayload: RewardPayload | null,
      isPremiumReward: boolean,
      conflictBehavior: "error" | "ignore" = "error"
    ): Promise<ProcessResult | null> => {
      if (!rewardPayload) return null;

      const { error: insertError } = await supabase.from("user_claimed_rewards").insert({
        user_id,
        season: seasonNumber,
        level,
        is_premium: isPremiumReward,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          return conflictBehavior === "error" ? { status: "already_claimed", isPremium: isPremiumReward } : null;
        }
        throw insertError;
      }

      try {
        if (rewardPayload.type === "coins" && rewardPayload.amount) {
          await supabase.rpc("increment_profile_value", {
            p_profile_id: user_id,
            p_column: "coins",
            p_amount: rewardPayload.amount,
          });

          await supabase.from("transactions").insert({
            user_id,
            transaction_type: "coins_earned_daily",
            amount: rewardPayload.amount,
            metadata: { source: "duel_pass_reward", level, is_premium: isPremiumReward },
          });
        } else if (rewardPayload.type === "boost" && rewardPayload.id) {
          const { data: exist } = await supabase.from("boost_inventory").select("quantity").eq("user_id", user_id).eq("boost_type", rewardPayload.id).maybeSingle();
          if (exist) {
            await supabase.from("boost_inventory").update({ quantity: exist.quantity + 1 }).eq("user_id", user_id).eq("boost_type", rewardPayload.id);
          } else {
            await supabase.from("boost_inventory").insert({ user_id, boost_type: rewardPayload.id, quantity: 1 });
          }
        } else if (rewardPayload.type === "skin" && rewardPayload.id) {
          const { error: sError } = await supabase.from("user_skins").insert({
            user_id,
            skin_id: rewardPayload.id,
            obtained_from: "duel_pass",
            obtained_metadata: { season: seasonNumber, level, is_premium: isPremiumReward }
          });
          if (sError && sError.code !== "23505") {
            if (sError.code === "23503") throw new Error(`Skin definition missing: ${rewardPayload.id}`);
            console.error("Skin add error:", sError);
          }
          await supabase.from("transactions").insert({
            user_id, transaction_type: "coins_earned_daily", amount: 0,
            metadata: { source: "duel_pass_reward", level, is_premium: isPremiumReward, reward_type: "skin", skin_id: rewardPayload.id }
          });
        } else if (rewardPayload.type === "badge" && rewardPayload.id) {
          const { error: bError } = await supabase.from("user_badges").insert({
            user_id,
            badge_id: rewardPayload.id,
            obtained_from: "duel_pass",
            obtained_metadata: { season: seasonNumber, level, is_premium: isPremiumReward }
          });
          if (bError && bError.code !== "23505") {
            if (bError.code === "23503") throw new Error(`Badge definition missing: ${rewardPayload.id}`);
            console.error("Badge add error:", bError);
          }
          await supabase.from("transactions").insert({
            user_id, transaction_type: "coins_earned_daily", amount: 0,
            metadata: { source: "duel_pass_reward", level, is_premium: isPremiumReward, reward_type: "badge", badge_id: rewardPayload.id }
          });
        } else if (rewardPayload.type === "sticker" && rewardPayload.id) {
          const { data: sExist } = await supabase.from("user_stickers").select("quantity").eq("user_id", user_id).eq("sticker_id", rewardPayload.id).maybeSingle();
          if (sExist) {
            await supabase.from("user_stickers").update({ quantity: sExist.quantity + (rewardPayload.amount || 1) }).eq("user_id", user_id).eq("sticker_id", rewardPayload.id);
          } else {
            await supabase.from("user_stickers").insert({ user_id, sticker_id: rewardPayload.id, quantity: rewardPayload.amount || 1, obtained_from: "duel_pass", obtained_metadata: { season: seasonNumber, level, is_premium: isPremiumReward } });
          }
          await supabase.from("transactions").insert({
            user_id, transaction_type: "coins_earned_daily", amount: 0,
            metadata: { source: "duel_pass_reward", level, is_premium: isPremiumReward, reward_type: "sticker", sticker_id: rewardPayload.id }
          });
        }

        return { status: "granted", reward: rewardPayload, isPremium: isPremiumReward };
      } catch (err) {
        console.error("[duel-pass-claim] Rollback due to error:", err);
        await supabase.from("user_claimed_rewards").delete().eq("user_id", user_id).eq("season", seasonNumber).eq("level", level).eq("is_premium", isPremiumReward);
        throw err;
      }
    };

    const { data: rewardRow, error: rewardError } = await supabase
      .from("duel_pass_season_rewards")
      .select("free_reward, premium_reward")
      .eq("season_id", seasonId)
      .eq("level", level)
      .single();

    if (rewardError || !rewardRow) {
      return new Response(JSON.stringify({ error: "Reward not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const grantedRewards: RewardPayload[] = [];
    const claimedEntries: { reward: RewardPayload; is_premium: boolean }[] = [];

    if (is_premium) {
      if (!rewardRow.premium_reward) {
        return new Response(JSON.stringify({ error: "Premium reward not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (rewardRow.free_reward) {
        try {
          const res = await processReward(rewardRow.free_reward as RewardPayload, false, "ignore");
          if (res?.status === "granted") {
            grantedRewards.push(res.reward);
            claimedEntries.push({ reward: res.reward, is_premium: false });
          }
        } catch (e) {
          console.error("Free reward fail:", e);
        }
      }

      const pRes = await processReward(rewardRow.premium_reward as RewardPayload, true, "error");
      if (!pRes) return new Response(JSON.stringify({ error: "Premium reward fail" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (pRes.status === "already_claimed") {
        return new Response(JSON.stringify({ error: "Already claimed", message: "Уже получено" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      grantedRewards.push(pRes.reward);
      claimedEntries.push({ reward: pRes.reward, is_premium: true });
    } else {
      if (!rewardRow.free_reward) return new Response(JSON.stringify({ error: "Free reward not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const fRes = await processReward(rewardRow.free_reward as RewardPayload, false, "error");
      if (!fRes) return new Response(JSON.stringify({ error: "Free reward fail" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (fRes.status === "already_claimed") {
        return new Response(JSON.stringify({ error: "Already claimed", message: "Уже получено" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      grantedRewards.push(fRes.reward);
      claimedEntries.push({ reward: fRes.reward, is_premium: false });
    }

    return new Response(JSON.stringify({ success: true, reward: grantedRewards[grantedRewards.length - 1], claimedRewards: claimedEntries }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("[duel-pass-claim] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal error", message: error.message, details: error.details }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
