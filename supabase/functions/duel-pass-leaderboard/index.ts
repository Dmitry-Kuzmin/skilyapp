import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeaderboardEntry {
  user_id: string;
  duel_pass_level: number;
  duel_pass_xp: number;
  rank?: string; // 'rookie', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'
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
      metadata?: any;
    };
  } | null;
  displayed_badges?: Array<{
    badge_id: string;
    display_order: number;
    badge_definitions?: {
      name_ru: string;
      rarity: string;
      metadata?: any;
    };
  }>;
  claimed_rewards_count?: number;
}

// Функция для обогащения пользователей косметикой
async function enrichUsersWithCosmetics(
  supabase: any,
  userIds: string[],
  season: number
): Promise<any[]> {
  if (userIds.length === 0) return [];

  // Загружаем ранги
  let userRanksMap = new Map<string, string>();
  try {
    const { data: activeSeason } = await supabase
      .from("duel_pass_seasons")
      .select("id")
      .eq("is_active", true)
      .order("season_number", { ascending: false })
      .limit(1)
      .single();

    if (activeSeason) {
      const { data: ranksData } = await supabase
        .from("user_ranks")
        .select("user_id, rank")
        .eq("season_id", activeSeason.id)
        .in("user_id", userIds);

      if (ranksData) {
        ranksData.forEach((r: any) => {
          userRanksMap.set(r.user_id, r.rank);
        });
      }
    }
  } catch (e) {
    console.error("[enrichUsersWithCosmetics] Exception loading ranks:", e);
  }

  // Загружаем скины
  let activeSkins: any[] = [];
  try {
    const { data: skinsData } = await supabase
      .from("user_skins")
      .select("user_id, skin_id")
      .eq("is_active", true)
      .in("user_id", userIds);

    if (skinsData && skinsData.length > 0) {
      const skinIds = [...new Set(skinsData.map((s: any) => s.skin_id))];
      const { data: skinDefs } = await supabase
        .from("skin_definitions")
        .select("id, name_ru, rarity, metadata")
        .in("id", skinIds);

      const defsMap = new Map(skinDefs?.map((d: any) => [d.id, d]) || []);
      activeSkins = skinsData
        .map((skin: any) => ({
          user_id: skin.user_id,
          skin_id: skin.skin_id,
          skin_definitions: defsMap.get(skin.skin_id) || null,
        }))
        .filter((s: any) => s.skin_definitions);
    }
  } catch (e) {
    console.error("[enrichUsersWithCosmetics] Exception loading skins:", e);
  }

  // Загружаем бейджи
  let displayedBadges: any[] = [];
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
      displayedBadges = badgesData
        .map((badge: any) => ({
          user_id: badge.user_id,
          badge_id: badge.badge_id,
          display_order: badge.display_order,
          badge_definitions: defsMap.get(badge.badge_id) || null,
        }))
        .filter((b: any) => b.badge_definitions);
    }
  } catch (e) {
    console.error("[enrichUsersWithCosmetics] Exception loading badges:", e);
  }

  // Загружаем награды
  let claimedRewards: any[] = [];
  try {
    const { data: rewardsData } = await supabase
      .from("user_claimed_rewards")
      .select("user_id")
      .eq("season", season)
      .in("user_id", userIds);

    claimedRewards = rewardsData || [];
  } catch (e) {
    console.error("[enrichUsersWithCosmetics] Exception loading rewards:", e);
  }

  // Создаем мапы
  const skinMap = new Map<string, any>();
  activeSkins.forEach((skin) => {
    if (skin.skin_definitions) {
      skinMap.set(skin.user_id, skin);
    }
  });

  const badgesMap = new Map<string, any[]>();
  displayedBadges.forEach((badge) => {
    if (badge.badge_definitions) {
      if (!badgesMap.has(badge.user_id)) {
        badgesMap.set(badge.user_id, []);
      }
      const userBadges = badgesMap.get(badge.user_id)!;
      if (userBadges.length < 3) {
        userBadges.push(badge);
      }
    }
  });

  const rewardsCountMap = new Map<string, number>();
  claimedRewards.forEach((reward: any) => {
    rewardsCountMap.set(
      reward.user_id,
      (rewardsCountMap.get(reward.user_id) || 0) + 1
    );
  });

  // Формируем результат
  return userIds.map((userId) => {
    const level = 1; // Будет перезаписано данными из neighbors
    let userRank = userRanksMap.get(userId);
    if (!userRank) {
      if (level >= 26) userRank = "diamond";
      else if (level >= 21) userRank = "platinum";
      else if (level >= 16) userRank = "gold";
      else if (level >= 11) userRank = "silver";
      else if (level >= 6) userRank = "bronze";
      else userRank = "rookie";
    }

    return {
      user_id: userId,
      rank: userRank,
      active_skin: skinMap.get(userId) || null,
      displayed_badges: badgesMap.get(userId) || [],
      claimed_rewards_count: rewardsCountMap.get(userId) || 0,
    };
  });
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
    let limit = 10; // По умолчанию топ-10
    let season = 1;
    let type = "top"; // 'top' или 'user_position'
    let filterType = "global"; // 'global', 'friends', 'country'
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
        if (body?.season) {
          season = parseInt(body.season, 10) || 1;
        }
        if (body?.type) {
          type = body.type; // 'top' или 'user_position'
        }
        if (body?.filter_type) {
          filterType = body.filter_type; // 'global', 'friends', 'country'
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

    // Если запрос на позицию пользователя
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

      // Загружаем косметику для соседей
      const neighbors = positionData?.neighbors || [];
      const neighborUserIds = neighbors.map((n: any) => n.user_id);

      if (neighborUserIds.length > 0) {
        // Загружаем косметику для соседей (скины, бейджи)
        const enrichedNeighbors = await enrichUsersWithCosmetics(
          supabase,
          neighborUserIds,
          season
        );

        // Объединяем данные
        const enrichedMap = new Map(enrichedNeighbors.map((e: any) => [e.user_id, e]));
        const finalNeighbors = neighbors.map((n: any) => ({
          ...n,
          ...enrichedMap.get(n.user_id),
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

    // Запрос топ-10/15 с фильтрами
    console.log("[duel-pass-leaderboard] Loading top profiles with limit:", limit, "filter:", filterType);

    // Определяем фильтр пользователей
    let filteredUserIds: string[] | null = null;

    if (filterType === "friends" && userId) {
      // Получаем список друзей из ВСЕХ источников:
      // 1. Реферальная система (referrals)
      // 2. Дуэли (duel_players)
      const friendIds = new Set<string>();

      // 1. Друзья из реферальной системы
      const { data: referralsData } = await supabase
        .from("referrals")
        .select("referrer_id, referred_id")
        .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);

      if (referralsData && referralsData.length > 0) {
        referralsData.forEach((f: any) => {
          if (f.referrer_id === userId) friendIds.add(f.referred_id);
          if (f.referred_id === userId) friendIds.add(f.referrer_id);
        });
      }

      // 2. Друзья из дуэлей (те, с кем играл в завершённых дуэлях)
      // Сначала получаем все дуэли пользователя
      const { data: userDuelsData } = await supabase
        .from("duel_players")
        .select("duel_id")
        .eq("user_id", userId)
        .eq("is_bot", false)
        .not("duel_id", "is", null);

      if (userDuelsData && userDuelsData.length > 0) {
        const duelIds = userDuelsData.map((d: any) => d.duel_id);

        // Проверяем, что дуэли завершены
        const { data: finishedDuels } = await supabase
          .from("duels")
          .select("id")
          .in("id", duelIds)
          .eq("status", "finished");

        if (finishedDuels && finishedDuels.length > 0) {
          const finishedDuelIds = finishedDuels.map((d: any) => d.id);

          // Получаем всех участников этих завершённых дуэлей (кроме ботов и самого пользователя)
          const { data: duelFriendsData } = await supabase
            .from("duel_players")
            .select("user_id")
            .in("duel_id", finishedDuelIds)
            .eq("is_bot", false)
            .not("user_id", "is", null)
            .neq("user_id", userId);

          if (duelFriendsData && duelFriendsData.length > 0) {
            duelFriendsData.forEach((f: any) => {
              if (f.user_id) friendIds.add(f.user_id);
            });
          }
        }
      }

      // 3. Друзья из Telegram групп/чатов
      // Находим пользователей, которые состоят в тех же группах
      // Используем RPC функцию для получения друзей из чатов
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
        // Продолжаем работу, даже если не удалось получить друзей из чатов
      }

      if (friendIds.size > 0) {
        filteredUserIds = Array.from(friendIds);
        filteredUserIds.push(userId); // Добавляем самого пользователя
      } else {
        // Нет друзей - возвращаем пустой результат
        return new Response(
          JSON.stringify({ 
            leaderboard: [],
            pagination: { page, page_size: pageSize, total: 0, total_pages: 0 }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (filterType === "country" && filterValue) {
      // Фильтр по стране (language_code)
      const { data: countryProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("language_code", filterValue)
        .not("duel_pass_level", "is", null);

      if (countryProfiles && countryProfiles.length > 0) {
        filteredUserIds = countryProfiles.map((p: any) => p.id);
      } else {
        return new Response(
          JSON.stringify({ 
            leaderboard: [],
            pagination: { page, page_size: pageSize, total: 0, total_pages: 0 }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Получаем профили с уровнем и XP Duel Pass, сортируем по уровню и XP
    let profilesQuery = supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        username,
        photo_url,
        duel_pass_level,
        duel_pass_xp
      `, { count: "exact" })
      .not("duel_pass_level", "is", null);

    // Применяем фильтр по пользователям, если есть
    if (filteredUserIds) {
      profilesQuery = profilesQuery.in("id", filteredUserIds);
    }

    // Сортировка и пагинация
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: profiles, error: profilesError, count } = await profilesQuery
      .order("duel_pass_level", { ascending: false })
      .order("duel_pass_xp", { ascending: false })
      .range(from, to);

    if (profilesError) {
      console.error("[duel-pass-leaderboard] Error loading profiles:", profilesError);
      console.error("[duel-pass-leaderboard] Error details:", JSON.stringify(profilesError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: "Failed to load leaderboard",
          details: profilesError.message || String(profilesError)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log("[duel-pass-leaderboard] No profiles found");
      return new Response(
        JSON.stringify({ leaderboard: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[duel-pass-leaderboard] Found", profiles.length, "profiles");
    const userIds = profiles.map((p) => p.id);
    
    if (userIds.length === 0) {
      console.log("[duel-pass-leaderboard] No user IDs to process");
      return new Response(
        JSON.stringify({ leaderboard: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Загружаем ранги пользователей для текущего сезона
    let userRanksMap = new Map<string, string>();
    try {
      const { data: activeSeason } = await supabase
        .from("duel_pass_seasons")
        .select("id")
        .eq("is_active", true)
        .order("season_number", { ascending: false })
        .limit(1)
        .single();

      if (activeSeason) {
        const { data: ranksData } = await supabase
          .from("user_ranks")
          .select("user_id, rank")
          .eq("season_id", activeSeason.id)
          .in("user_id", userIds);

        if (ranksData) {
          ranksData.forEach((r: any) => {
            userRanksMap.set(r.user_id, r.rank);
          });
        }
      }
    } catch (e) {
      console.error("[duel-pass-leaderboard] Exception loading ranks:", e);
    }

    // Загружаем активные скины пользователей (упрощенный запрос без JOIN)
    let activeSkins: any[] = [];
    try {
      const { data: skinsData, error: skinsError } = await supabase
        .from("user_skins")
        .select("user_id, skin_id, is_active")
        .eq("is_active", true)
        .in("user_id", userIds);

      if (skinsError) {
        console.error("[duel-pass-leaderboard] Error loading skins:", skinsError);
      } else if (skinsData && skinsData.length > 0) {
        // Загружаем определения скинов отдельно
        const skinIds = [...new Set(skinsData.map(s => s.skin_id))];
        const { data: skinDefs } = await supabase
          .from("skin_definitions")
          .select("id, name_ru, rarity, metadata")
          .in("id", skinIds);

        // Объединяем данные
        const defsMap = new Map(skinDefs?.map(d => [d.id, d]) || []);
        activeSkins = skinsData
          .map(skin => ({
            user_id: skin.user_id,
            skin_id: skin.skin_id,
            skin_definitions: defsMap.get(skin.skin_id) || null
          }))
          .filter(s => s.skin_definitions); // Только скины с определениями
      }
    } catch (e) {
      console.error("[duel-pass-leaderboard] Exception loading skins:", e);
    }

    // Загружаем отображаемые бейджи (упрощенный запрос)
    let displayedBadges: any[] = [];
    try {
      const { data: badgesData, error: badgesError } = await supabase
        .from("user_badges")
        .select("user_id, badge_id, display_order")
        .eq("is_displayed", true)
        .in("user_id", userIds)
        .order("display_order", { ascending: true })
        .limit(3 * userIds.length);

      if (badgesError) {
        console.error("[duel-pass-leaderboard] Error loading badges:", badgesError);
      } else if (badgesData && badgesData.length > 0) {
        // Загружаем определения бейджей отдельно
        const badgeIds = [...new Set(badgesData.map(b => b.badge_id))];
        const { data: badgeDefs } = await supabase
          .from("badge_definitions")
          .select("id, name_ru, rarity, metadata")
          .in("id", badgeIds);

        // Объединяем данные
        const defsMap = new Map(badgeDefs?.map(d => [d.id, d]) || []);
        displayedBadges = badgesData
          .map(badge => ({
            user_id: badge.user_id,
            badge_id: badge.badge_id,
            display_order: badge.display_order,
            badge_definitions: defsMap.get(badge.badge_id) || null
          }))
          .filter(b => b.badge_definitions); // Только бейджи с определениями
      }
    } catch (e) {
      console.error("[duel-pass-leaderboard] Exception loading badges:", e);
    }

    // Загружаем количество полученных наград
    let claimedRewards: any[] = [];
    try {
      const { data: rewardsData, error: rewardsError } = await supabase
        .from("user_claimed_rewards")
        .select("user_id")
        .eq("season", season)
        .in("user_id", userIds);

      if (rewardsError) {
        console.error("[duel-pass-leaderboard] Error loading claimed rewards:", rewardsError);
      } else {
        claimedRewards = rewardsData || [];
      }
    } catch (e) {
      console.error("[duel-pass-leaderboard] Exception loading claimed rewards:", e);
    }

    // Создаем мапы для быстрого доступа
    const skinMap = new Map<string, any>();
    activeSkins?.forEach((skin) => {
      // Фильтруем только скины с определениями
      if (skin.skin_definitions) {
        skinMap.set(skin.user_id, skin);
      }
    });

    const badgesMap = new Map<string, any[]>();
    displayedBadges?.forEach((badge) => {
      // Фильтруем только бейджи с определениями
      if (badge.badge_definitions) {
        if (!badgesMap.has(badge.user_id)) {
          badgesMap.set(badge.user_id, []);
        }
        // Ограничиваем до 3 бейджей на пользователя
        const userBadges = badgesMap.get(badge.user_id)!;
        if (userBadges.length < 3) {
          userBadges.push(badge);
        }
      }
    });

    const rewardsCountMap = new Map<string, number>();
    claimedRewards?.forEach((reward) => {
      rewardsCountMap.set(
        reward.user_id,
        (rewardsCountMap.get(reward.user_id) || 0) + 1
      );
    });

    // Формируем рейтинг
    console.log("[duel-pass-leaderboard] Building leaderboard entries");
    const leaderboard: LeaderboardEntry[] = profiles.map((profile) => {
      const skin = skinMap.get(profile.id);
      const badges = badgesMap.get(profile.id) || [];
      const rewardsCount = rewardsCountMap.get(profile.id) || 0;
      
      // Получаем ранг из таблицы или рассчитываем на основе уровня
      let userRank = userRanksMap.get(profile.id);
      if (!userRank) {
        // Рассчитываем ранг на основе уровня
        const level = profile.duel_pass_level || 1;
        if (level >= 26) userRank = "diamond";
        else if (level >= 21) userRank = "platinum";
        else if (level >= 16) userRank = "gold";
        else if (level >= 11) userRank = "silver";
        else if (level >= 6) userRank = "bronze";
        else userRank = "rookie";
      }

      return {
        user_id: profile.id,
        duel_pass_level: profile.duel_pass_level || 1,
        duel_pass_xp: profile.duel_pass_xp || 0,
        rank: userRank,
        profile: {
          first_name: profile.first_name,
          username: profile.username,
          photo_url: profile.photo_url,
        },
        active_skin: skin || null,
        displayed_badges: badges,
        claimed_rewards_count: rewardsCount,
      };
    });

    // Дополнительная сортировка: сначала по уровню, потом по XP
    leaderboard.sort((a, b) => {
      if (b.duel_pass_level !== a.duel_pass_level) {
        return b.duel_pass_level - a.duel_pass_level;
      }
      return b.duel_pass_xp - a.duel_pass_xp;
    });

    console.log("[duel-pass-leaderboard] Returning", leaderboard.length, "entries");
    
    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    
    return new Response(
      JSON.stringify({ 
        leaderboard,
        pagination: {
          page,
          page_size: pageSize,
          total: count || 0,
          total_pages: totalPages,
        },
        filter_type: filterType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[duel-pass-leaderboard] unexpected error", error);
    console.error("[duel-pass-leaderboard] error details:", JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

