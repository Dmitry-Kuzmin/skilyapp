import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeaderboardEntry {
  user_id: string;
  duel_pass_level: number;
  duel_pass_xp: number;
  season_points: number; // SP (Season Points) — основной показатель рейтинга
  rank?: string;
  profile?: {
    first_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
  };
  active_skin?: {
    skin_id: string;
    skin_definitions?: {
      name_ru: string;
      rarity: string;
      metadata?: Record<string, unknown>;
    };
  } | null;
  displayed_badges?: Array<{
    badge_id: string;
    display_order: number;
    badge_definitions?: {
      name_ru: string;
      rarity: string;
      metadata?: Record<string, unknown>;
    };
  }>;
  claimed_rewards_count?: number;
}

// Загружаем ранги, скины и бейджи для набора user_id
async function enrichUsersWithCosmetics(
  supabase: SupabaseClient,
  userIds: string[],
  seasonId: number,
  levelsMap: Map<string, number>
): Promise<Map<string, Partial<LeaderboardEntry>>> {
  const result = new Map<string, Partial<LeaderboardEntry>>();
  if (userIds.length === 0) return result;

  // Загружаем ранги
  const userRanksMap = new Map<string, string>();
  try {
    const { data: ranksData } = await supabase
      .from("user_ranks")
      .select("user_id, rank")
      .eq("season_id", seasonId)
      .in("user_id", userIds);

    if (ranksData) {
      ranksData.forEach((r: { user_id: string; rank: string }) => {
        userRanksMap.set(r.user_id, r.rank);
      });
    }
  } catch (e) {
    console.error("[enrichUsersWithCosmetics] Exception loading ranks:", e);
  }

  // Загружаем скины
  const skinMap = new Map<string, unknown>();
  try {
    const { data: skinsData } = await supabase
      .from("user_skins")
      .select("user_id, skin_id")
      .eq("is_active", true)
      .in("user_id", userIds);

    if (skinsData && skinsData.length > 0) {
      const skinIds = [...new Set(skinsData.map((s: { skin_id: string }) => s.skin_id))];
      const { data: skinDefs } = await supabase
        .from("skin_definitions")
        .select("id, name_ru, rarity, metadata")
        .in("id", skinIds);

      const defsMap = new Map(skinDefs?.map((d: { id: string }) => [d.id, d]) || []);
      skinsData.forEach((skin: { user_id: string; skin_id: string }) => {
        const def = defsMap.get(skin.skin_id);
        if (def) {
          skinMap.set(skin.user_id, { skin_id: skin.skin_id, skin_definitions: def });
        }
      });
    }
  } catch (e) {
    console.error("[enrichUsersWithCosmetics] Exception loading skins:", e);
  }

  // Загружаем бейджи
  const badgesMap = new Map<string, unknown[]>();
  try {
    const { data: badgesData } = await supabase
      .from("user_badges")
      .select("user_id, badge_id, display_order")
      .eq("is_displayed", true)
      .in("user_id", userIds)
      .order("display_order", { ascending: true })
      .limit(3 * userIds.length);

    if (badgesData && badgesData.length > 0) {
      const badgeIds = [...new Set(badgesData.map((b: any) => b.badge_id))];
      const { data: badgeDefs } = await supabase
        .from("badge_definitions")
        .select("id, name_ru, rarity, metadata")
        .in("id", badgeIds);

      const defsMap = new Map(badgeDefs?.map((d: any) => [d.id, d]) || []);
      badgesData.forEach((badge: any) => {
        const def = defsMap.get(badge.badge_id);
        if (def) {
          if (!badgesMap.has(badge.user_id)) badgesMap.set(badge.user_id, []);
          const arr = badgesMap.get(badge.user_id)!;
          if (arr.length < 3) {
            arr.push({ badge_id: badge.badge_id, display_order: badge.display_order, badge_definitions: def });
          }
        }
      });
    }
  } catch (e) {
    console.error("[enrichUsersWithCosmetics] Exception loading badges:", e);
  }

  // Загружаем claimed rewards
  const rewardsCountMap = new Map<string, number>();
  try {
    const { data: rewardsData } = await supabase
      .from("user_claimed_rewards")
      .select("user_id")
      .eq("season", seasonId)
      .in("user_id", userIds);

    (rewardsData || []).forEach((r: any) => {
      rewardsCountMap.set(r.user_id, (rewardsCountMap.get(r.user_id) || 0) + 1);
    });
  } catch (e) {
    console.error("[enrichUsersWithCosmetics] Exception loading rewards:", e);
  }

  // Собираем результат
  userIds.forEach((userId) => {
    const level = levelsMap.get(userId) ?? 1;
    let rank = userRanksMap.get(userId);
    if (!rank) {
      if (level >= 26) rank = "diamond";
      else if (level >= 21) rank = "platinum";
      else if (level >= 16) rank = "gold";
      else if (level >= 11) rank = "silver";
      else if (level >= 6) rank = "bronze";
      else rank = "rookie";
    }

    result.set(userId, {
      rank,
      active_skin: (skinMap.get(userId) as any) || null,
      displayed_badges: (badgesMap.get(userId) as any[]) || [],
      claimed_rewards_count: rewardsCountMap.get(userId) || 0,
    });
  });

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[duel-pass-leaderboard] Request received:", req.method);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[duel-pass-leaderboard] Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Параметры запроса
    let limit = 10;
    let type = "top";
    let filterType = "global";
    let filterValue: string | null = null;
    let userId: string | null = null;
    let neighborsCount = 5;
    let page = 1;
    let pageSize = 10;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.limit) {
          limit = Math.min(Math.max(parseInt(body.limit, 10) || 10, 10), 100);
        }
        if (body?.type) {
          type = body.type;
        }
        if (body?.filter_type) {
          filterType = body.filter_type;
        }
        if (body?.filter_value) {
          filterValue = body.filter_value;
        }
        if (body?.user_id) {
          userId = body.user_id;
        }
        if (body?.neighbors_count) {
          neighborsCount = Math.min(Math.max(parseInt(body.neighbors_count, 10) || 5, 1), 20);
        }
        if (body?.page) {
          page = Math.max(parseInt(body.page, 10) || 1, 1);
        }
        if (body?.page_size) {
          pageSize = Math.min(Math.max(parseInt(body.page_size, 10) || 10, 5), 50);
        }
      } catch (e) {
        console.warn("[duel-pass-leaderboard] Failed to parse body, using defaults");
      }
    }

    // Получаем активный сезон — единственный источник истины
    const { data: activeSeason } = await supabase
      .from("duel_pass_seasons")
      .select("id")
      .eq("is_active", true)
      .order("season_number", { ascending: false })
      .limit(1)
      .single();

    const seasonId = activeSeason?.id as number | undefined;

    // Если нет активного сезона — пустой ответ
    if (!seasonId) {
      console.warn("[duel-pass-leaderboard] No active season found");
      return new Response(
        JSON.stringify({ leaderboard: [], pagination: { page, page_size: pageSize, total: 0, total_pages: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── user_position ──────────────────────────────────────────────────────────
    if (type === "user_position") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "user_id is required for user_position type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[duel-pass-leaderboard] Getting user position for:", userId);

      const { data: positionData, error: positionError } = await supabase.rpc(
        "get_user_leaderboard_position",
        {
          p_user_id: userId,
          p_neighbors_count: neighborsCount,
          p_filter_type: filterType,
          p_filter_value: filterValue,
        }
      );

      if (positionError) {
        console.error("[duel-pass-leaderboard] Error getting user position:", positionError);
        return new Response(
          JSON.stringify({
            error: "Failed to get user position",
            details: positionError.message || String(positionError)
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const neighbors = positionData?.neighbors || [];
      const neighborUserIds = neighbors.map((n: { user_id: string }) => n.user_id);

      if (neighborUserIds.length > 0) {
        const levelsMap = new Map<string, number>(
          neighbors.map((n: { user_id: string; duel_pass_level: number }) => [n.user_id, n.duel_pass_level])
        );
        const cosmeticsMap = await enrichUsersWithCosmetics(supabase, neighborUserIds, seasonId, levelsMap);

        const finalNeighbors = neighbors.map((n: any) => ({
          ...n,
          ...(cosmeticsMap.get(n.user_id) || {}),
        }));

        return new Response(
          JSON.stringify({
            type: "user_position",
            position: positionData.position,
            total_players: positionData.total_players,
            user_data: positionData.user_data,
            neighbors: finalNeighbors,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          type: "user_position",
          position: positionData.position,
          total_players: positionData.total_players,
          user_data: positionData.user_data,
          neighbors: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── top leaderboard ────────────────────────────────────────────────────────
    // Определяем фильтр пользователей (friends / country)
    let filteredUserIds: string[] | null = null;

    if (filterType === "friends" && userId) {
      const friendIds = new Set<string>();

      // 1. Друзья из реферальной системы
      const { data: referralsData } = await supabase
        .from("referrals")
        .select("referrer_id, referred_id")
        .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);

      if (referralsData) {
        referralsData.forEach((f: { referrer_id: string; referred_id: string }) => {
          if (f.referrer_id === userId) friendIds.add(f.referred_id);
          if (f.referred_id === userId) friendIds.add(f.referrer_id);
        });
      }

      // 2. Друзья из завершённых дуэлей
      const { data: userDuelsData } = await supabase
        .from("duel_players")
        .select("duel_id")
        .eq("user_id", userId)
        .eq("is_bot", false)
        .not("duel_id", "is", null);

      if (userDuelsData && userDuelsData.length > 0) {
        const duelIds = userDuelsData.map((d: { duel_id: string }) => d.duel_id);
        const { data: finishedDuels } = await supabase
          .from("duels")
          .select("id")
          .in("id", duelIds)
          .eq("status", "finished");

        if (finishedDuels && finishedDuels.length > 0) {
          const finishedDuelIds = finishedDuels.map((d: any) => d.id);
          const { data: duelFriendsData } = await supabase
            .from("duel_players")
            .select("user_id")
            .in("duel_id", finishedDuelIds)
            .eq("is_bot", false)
            .not("user_id", "is", null)
            .neq("user_id", userId);

          if (duelFriendsData) {
            duelFriendsData.forEach((f: any) => {
              if (f.user_id) friendIds.add(f.user_id);
            });
          }
        }
      }

      // 3. Друзья из Telegram чатов
      try {
        const { data: chatFriendsIds, error: chatFriendsError } = await supabase.rpc(
          "get_chat_friends",
          { p_user_id: userId }
        );
        if (!chatFriendsError && chatFriendsIds && Array.isArray(chatFriendsIds)) {
          chatFriendsIds.forEach((friendId: string) => {
            if (friendId) friendIds.add(friendId);
          });
        }
      } catch (error) {
        console.error("[duel-pass-leaderboard] Error getting chat friends:", error);
      }

      if (friendIds.size > 0) {
        filteredUserIds = Array.from(friendIds);
        filteredUserIds.push(userId);
      } else {
        return new Response(
          JSON.stringify({ leaderboard: [], pagination: { page, page_size: pageSize, total: 0, total_pages: 0 } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (filterType === "country" && filterValue) {
      const { data: countryProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("language_code", filterValue);

      if (countryProfiles && countryProfiles.length > 0) {
        filteredUserIds = countryProfiles.map((p: any) => p.id);
      } else {
        return new Response(
          JSON.stringify({ leaderboard: [], pagination: { page, page_size: pageSize, total: 0, total_pages: 0 } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── ОСНОВНОЙ ЗАПРОС: user_season_progress текущего сезона ─────────────────
    // Это единственный корректный источник для рейтинга — только те, кто
    // реально участвует в текущем сезоне (season_points > 0).
    console.log("[duel-pass-leaderboard] Loading season progress for season:", seasonId);

    let progressQuery = supabase
      .from("user_season_progress")
      .select("user_id, season_points, level", { count: "exact" })
      .eq("season_id", seasonId)
      .gt("season_points", 0) // только те, у кого есть реальные SP
      .order("season_points", { ascending: false })
      .order("level", { ascending: false });

    if (filteredUserIds) {
      progressQuery = progressQuery.in("user_id", filteredUserIds);
    }

    const { data: allProgress, count, error: progressError } = await progressQuery;

    if (progressError) {
      console.error("[duel-pass-leaderboard] Error loading season progress:", progressError);
      return new Response(
        JSON.stringify({
          error: "Failed to load leaderboard",
          details: progressError.message || String(progressError)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!allProgress || allProgress.length === 0) {
      console.log("[duel-pass-leaderboard] No season progress found for season", seasonId);
      return new Response(
        JSON.stringify({ leaderboard: [], pagination: { page, page_size: pageSize, total: 0, total_pages: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Пагинация
    const from = (page - 1) * pageSize;
    const paginatedProgress = allProgress.slice(from, from + pageSize);
    const pageUserIds = paginatedProgress.map((p: any) => p.user_id);

    console.log("[duel-pass-leaderboard] Total players:", count, "| Page:", page, "| Showing:", paginatedProgress.length);

    // Загружаем профили только для текущей страницы
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, username, photo_url, duel_pass_level, duel_pass_xp")
      .in("id", pageUserIds);

    const profilesMap = new Map<string, any>(
      (profilesData || []).map((p: any) => [p.id, p])
    );

    // Карта season level для enrichment
    const levelsMap = new Map<string, number>(
      paginatedProgress.map((p: any) => [p.user_id, p.level ?? 1])
    );

    // Загружаем косметику
    const cosmeticsMap = await enrichUsersWithCosmetics(supabase, pageUserIds, seasonId, levelsMap);

    // Формируем рейтинг
    const leaderboard: LeaderboardEntry[] = paginatedProgress.map((sp: any) => {
      const profile = profilesMap.get(sp.user_id) || {};
      const cosmetics = cosmeticsMap.get(sp.user_id) || {};

      return {
        user_id: sp.user_id,
        duel_pass_level: sp.level ?? profile.duel_pass_level ?? 1,
        duel_pass_xp: profile.duel_pass_xp || 0,
        season_points: sp.season_points || 0,
        profile: {
          first_name: profile.first_name || null,
          username: profile.username || null,
          photo_url: profile.photo_url || null,
        },
        ...cosmetics,
      };
    });

    console.log("[duel-pass-leaderboard] Returning", leaderboard.length, "entries");

    const totalCount = count ?? 0;
    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

    return new Response(
      JSON.stringify({
        leaderboard,
        pagination: {
          page,
          page_size: pageSize,
          total: totalCount,
          total_pages: totalPages,
        },
        filter_type: filterType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[duel-pass-leaderboard] unexpected error", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
