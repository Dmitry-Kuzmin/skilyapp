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
    const seasonNumber = activeSeason.season_number || season; // Используем season_number из активного сезона

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
      if (!rewardPayload) {
        return null;
      }

      // КРИТИЧНО: Сначала вставляем запись о получении (Optimistic Locking)
      // Это предотвращает race condition - если два запроса придут одновременно,
      // только один сможет вставить запись (благодаря UNIQUE constraint)
      const { error: insertError } = await supabase.from("user_claimed_rewards").insert({
        user_id,
        season: seasonNumber, // Используем номер сезона из activeSeason
        level,
        is_premium: isPremiumReward,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          // UNIQUE constraint violation - награда уже получена
          if (conflictBehavior === "error") {
            return { status: "already_claimed", isPremium: isPremiumReward };
          }
          return null;
        }
        console.error("[duel-pass-claim] Error inserting claimed reward:", insertError);
        throw insertError;
      }

      // Теперь выдаем награду (запись уже заблокирована)
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
            metadata: {
              source: "duel_pass_reward",
              level,
              is_premium: isPremiumReward,
              reward_type: isPremiumReward ? "premium" : "free",
            },
          });
        } else if (rewardPayload.type === "boost" && rewardPayload.id) {
          const { data: existingBoost } = await supabase
            .from("boost_inventory")
            .select("quantity")
            .eq("user_id", user_id)
            .eq("boost_type", rewardPayload.id)
            .maybeSingle();

          if (existingBoost) {
            await supabase
              .from("boost_inventory")
              .update({ quantity: existingBoost.quantity + 1 })
              .eq("user_id", user_id)
              .eq("boost_type", rewardPayload.id);
          } else {
            await supabase.from("boost_inventory").insert({
              user_id,
              boost_type: rewardPayload.id,
              quantity: 1,
            });
          }
        } else if (rewardPayload.type === "skin" && rewardPayload.id) {
          const { error: skinError } = await supabase.from("user_skins").insert({
            user_id,
            skin_id: rewardPayload.id,
            obtained_from: "duel_pass",
            obtained_metadata: {
              season,
              level,
              is_premium: isPremiumReward,
            },
          });

          if (skinError && skinError.code !== "23505") {
            console.error("[duel-pass-claim] Error adding skin:", skinError);
          }

          await supabase.from("transactions").insert({
            user_id,
            transaction_type: "item_received",
            amount: 0,
            metadata: {
              source: "duel_pass_reward",
              level,
              is_premium: isPremiumReward,
              reward_type: "skin",
              skin_id: rewardPayload.id,
            },
          });
        } else if (rewardPayload.type === "badge" && rewardPayload.id) {
          const { error: badgeError } = await supabase.from("user_badges").insert({
            user_id,
            badge_id: rewardPayload.id,
            obtained_from: "duel_pass",
            obtained_metadata: {
              season,
              level,
              is_premium: isPremiumReward,
            },
          });

          if (badgeError && badgeError.code !== "23505") {
            console.error("[duel-pass-claim] Error adding badge:", badgeError);
          }

          await supabase.from("transactions").insert({
            user_id,
            transaction_type: "item_received",
            amount: 0,
            metadata: {
              source: "duel_pass_reward",
              level,
              is_premium: isPremiumReward,
              reward_type: "badge",
              badge_id: rewardPayload.id,
            },
          });
        } else if (rewardPayload.type === "sticker" && rewardPayload.id) {
          const { data: existingSticker } = await supabase
            .from("user_stickers")
            .select("quantity")
            .eq("user_id", user_id)
            .eq("sticker_id", rewardPayload.id)
            .maybeSingle();

          if (existingSticker) {
            await supabase
              .from("user_stickers")
              .update({ quantity: existingSticker.quantity + (rewardPayload.amount || 1) })
              .eq("user_id", user_id)
              .eq("sticker_id", rewardPayload.id);
          } else {
            await supabase.from("user_stickers").insert({
              user_id,
              sticker_id: rewardPayload.id,
              quantity: rewardPayload.amount || 1,
              obtained_from: "duel_pass",
              obtained_metadata: {
                season,
                level,
                is_premium: isPremiumReward,
              },
            });
          }

          await supabase.from("transactions").insert({
            user_id,
            transaction_type: "item_received",
            amount: 0,
            metadata: {
              source: "duel_pass_reward",
              level,
              is_premium: isPremiumReward,
              reward_type: "sticker",
              sticker_id: rewardPayload.id,
              quantity: rewardPayload.amount || 1,
            },
          });
        }

        return {
          status: "granted",
          reward: rewardPayload,
          isPremium: isPremiumReward,
        };
      } catch (error) {
        // Rollback: Если выдача награды упала, удаляем запись о получении
        console.error("[duel-pass-claim] Error granting reward, rolling back claim:", error);
        await supabase.from("user_claimed_rewards")
          .delete()
          .eq("user_id", user_id)
          .eq("season", seasonNumber) // Используем номер сезона из activeSeason
          .eq("level", level)
          .eq("is_premium", isPremiumReward);
        throw error;
      }
    };

    const { data: rewardRow, error: rewardError } = await supabase
      .from("duel_pass_season_rewards")
      .select("free_reward, premium_reward")
      .eq("season_id", seasonId)
      .eq("level", level)
      .single();

    if (rewardError || !rewardRow) {
      return new Response(
        JSON.stringify({ error: "Reward not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const grantedRewards: RewardPayload[] = [];
    const claimedEntries: { reward: RewardPayload; is_premium: boolean }[] = [];

    if (is_premium) {
      if (!rewardRow.premium_reward) {
        return new Response(
          JSON.stringify({ error: "Premium reward not available" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (rewardRow.free_reward) {
        try {
          const freeResult = await processReward(rewardRow.free_reward as RewardPayload, false, "ignore");
          if (freeResult && freeResult.status === "granted") {
            grantedRewards.push(freeResult.reward);
            claimedEntries.push({ reward: freeResult.reward, is_premium: false });
          }
        } catch (error) {
          console.error("[duel-pass-claim] Error processing free reward:", error);
          // Продолжаем, так как это free reward с ignore поведением
        }
      }

      let premiumResult;
      try {
        premiumResult = await processReward(rewardRow.premium_reward as RewardPayload, true, "error");
      } catch (error) {
        console.error("[duel-pass-claim] Error processing premium reward:", error);
        throw error; // Пробрасываем ошибку дальше
      }

      if (!premiumResult) {
        return new Response(
          JSON.stringify({ error: "Reward not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (premiumResult.status === "already_claimed") {
        return new Response(
          JSON.stringify({
            error: "Reward already claimed",
            message: "Эта награда уже была получена",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      grantedRewards.push(premiumResult.reward);
      claimedEntries.push({ reward: premiumResult.reward, is_premium: true });
    } else {
      if (!rewardRow.free_reward) {
        return new Response(
          JSON.stringify({ error: "Free reward not available" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let freeResult;
      try {
        freeResult = await processReward(rewardRow.free_reward as RewardPayload, false, "error");
      } catch (error) {
        console.error("[duel-pass-claim] Error processing free reward:", error);
        throw error; // Пробрасываем ошибку дальше
      }

      if (!freeResult) {
        return new Response(
          JSON.stringify({ error: "Reward not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (freeResult.status === "already_claimed") {
        return new Response(
          JSON.stringify({
            error: "Reward already claimed",
            message: "Эта награда уже была получена",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      grantedRewards.push(freeResult.reward);
      claimedEntries.push({ reward: freeResult.reward, is_premium: false });
    }

    return new Response(
      JSON.stringify({
        success: true,
        reward: grantedRewards[grantedRewards.length - 1],
        claimedRewards: claimedEntries,
      }),
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


