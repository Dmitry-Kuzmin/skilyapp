import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaderboardEntry {
  user_id: string;
  duel_pass_level: number;
  duel_pass_xp: number;
  position: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { season_id } = await req.json();

    if (!season_id) {
      return new Response(
        JSON.stringify({ error: "season_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[season-end-rewards] Processing rewards for season ${season_id}`);

    // Получаем топ-10 игроков по Duel Pass уровню и XP
    const { data: topPlayers, error: playersError } = await supabase
      .from("profiles")
      .select("id, duel_pass_level, duel_pass_xp, first_name, username")
      .not("duel_pass_level", "is", null)
      .order("duel_pass_level", { ascending: false })
      .order("duel_pass_xp", { ascending: false })
      .limit(10);

    if (playersError) {
      console.error("[season-end-rewards] Error fetching top players:", playersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch top players", details: playersError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!topPlayers || topPlayers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No players found for leaderboard" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[season-end-rewards] Found ${topPlayers.length} top players`);

    const results: Array<{
      user_id: string;
      position: number;
      success: boolean;
      rewards_count?: number;
      error?: string;
    }> = [];

    // Начисляем призы каждому игроку
    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      const position = i + 1;

      try {
        console.log(`[season-end-rewards] Processing position ${position} for user ${player.id}`);

        // Вызываем функцию начисления призов
        const { data: claimResult, error: claimError } = await supabase.rpc(
          "claim_leaderboard_rewards",
          {
            p_user_id: player.id,
            p_season_id: season_id,
            p_position: position,
          }
        );

        if (claimError) {
          console.error(`[season-end-rewards] Error claiming rewards for user ${player.id}:`, claimError);
          results.push({
            user_id: player.id,
            position,
            success: false,
            error: claimError.message,
          });
          continue;
        }

        // Начисляем косметические предметы
        const rewards = claimResult?.rewards || [];
        let rewardsProcessed = 0;

        for (const reward of rewards) {
          const rewardData = reward.data;
          const rewardType = reward.type;

          try {
            if (rewardType === "skin" && rewardData.id) {
              // Добавляем скин в инвентарь
              const { error: skinError } = await supabase
                .from("user_skins")
                .insert({
                  user_id: player.id,
                  skin_id: rewardData.id,
                  is_active: rewardData.auto_activate || false,
                  obtained_from: "leaderboard_reward",
                  obtained_metadata: {
                    season_id,
                    position,
                    is_exclusive: true,
                  },
                })
                .select()
                .single();

              if (skinError && skinError.code !== "23505") {
                // 23505 = unique violation (скин уже есть)
                console.warn(`[season-end-rewards] Error adding skin ${rewardData.id}:`, skinError);
              } else {
                rewardsProcessed++;
              }
            } else if (rewardType === "badge" && rewardData.id) {
              // Добавляем бейдж в инвентарь
              const { error: badgeError } = await supabase
                .from("user_badges")
                .insert({
                  user_id: player.id,
                  badge_id: rewardData.id,
                  is_displayed: rewardData.auto_display || false,
                  display_order: position <= 3 ? 0 : 1,
                  obtained_from: "leaderboard_reward",
                  obtained_metadata: {
                    season_id,
                    position,
                  },
                })
                .select()
                .single();

              if (badgeError && badgeError.code !== "23505") {
                console.warn(`[season-end-rewards] Error adding badge ${rewardData.id}:`, badgeError);
              } else {
                rewardsProcessed++;
              }
            } else if (rewardType === "frame" && rewardData.id) {
              // Рамка - это тоже скин, добавляем как скин
              const { error: frameError } = await supabase
                .from("user_skins")
                .insert({
                  user_id: player.id,
                  skin_id: rewardData.id,
                  is_active: rewardData.auto_activate || false,
                  obtained_from: "leaderboard_reward",
                  obtained_metadata: {
                    season_id,
                    position,
                    type: "frame",
                  },
                })
                .select()
                .single();

              if (frameError && frameError.code !== "23505") {
                console.warn(`[season-end-rewards] Error adding frame ${rewardData.id}:`, frameError);
              } else {
                rewardsProcessed++;
              }
            } else if (rewardType === "title" && rewardData.id) {
              // Титул - это бейдж с типом title
              const { error: titleError } = await supabase
                .from("user_badges")
                .insert({
                  user_id: player.id,
                  badge_id: rewardData.id,
                  is_displayed: true,
                  display_order: 0,
                  obtained_from: "leaderboard_reward",
                  obtained_metadata: {
                    season_id,
                    position,
                    type: "title",
                  },
                })
                .select()
                .single();

              if (titleError && titleError.code !== "23505") {
                console.warn(`[season-end-rewards] Error adding title ${rewardData.id}:`, titleError);
              } else {
                rewardsProcessed++;
              }
            } else if (rewardType === "coins" && rewardData.amount) {
              // Начисляем монеты через coins-earn функцию
              const { error: coinsError } = await supabase.functions.invoke("coins-earn", {
                body: {
                  user_id: player.id,
                  reward_type: "leaderboard_reward",
                  metadata: {
                    season_id,
                    position,
                    amount: rewardData.amount,
                  },
                },
              });

              if (coinsError) {
                console.warn(`[season-end-rewards] Error adding coins:`, coinsError);
              } else {
                rewardsProcessed++;
              }
            } else if (rewardType === "aura") {
              // Аура - это метаданные, сохраняем в user_leaderboard_rewards
              // Аура будет применяться визуально на основе метаданных
              rewardsProcessed++;
            }
          } catch (itemError) {
            console.error(`[season-end-rewards] Error processing reward item:`, itemError);
          }
        }

        // Создаём уведомление для пользователя
        try {
          await supabase.from("notifications").insert({
            user_id: player.id,
            type: "leaderboard_reward",
            title: position <= 3 
              ? `🏆 Поздравляем! Вы заняли ${position} место!`
              : `⭐ Поздравляем! Вы вошли в топ-10!`,
            message: position <= 3
              ? `Вы получили эксклюзивные призы за ${position} место в сезоне!`
              : `Вы получили призы за попадание в топ-10 сезона!`,
            metadata: {
              season_id,
              position,
              rewards_count: rewardsProcessed,
            },
          });
        } catch (notifError) {
          console.warn(`[season-end-rewards] Error creating notification:`, notifError);
        }

        results.push({
          user_id: player.id,
          position,
          success: true,
          rewards_count: rewardsProcessed,
        });

        console.log(`[season-end-rewards] ✅ Successfully processed position ${position} for user ${player.id}`);
      } catch (userError) {
        console.error(`[season-end-rewards] Error processing user ${player.id}:`, userError);
        results.push({
          user_id: player.id,
          position,
          success: false,
          error: userError instanceof Error ? userError.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        season_id,
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[season-end-rewards] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

