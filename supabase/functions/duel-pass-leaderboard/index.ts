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
  profile?: {
    first_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
    avatar_url?: string | null;
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

    let limit = 50;
    let season = 1;
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.limit) {
          limit = Math.min(Math.max(parseInt(body.limit, 10) || 50, 10), 100);
        }
        if (body?.season) {
          season = parseInt(body.season, 10) || 1;
        }
      } catch (e) {
        console.warn("[duel-pass-leaderboard] Failed to parse body, using defaults");
      }
    }

    console.log("[duel-pass-leaderboard] Loading profiles with limit:", limit);

    // Получаем профили с уровнем и XP Duel Pass, сортируем по уровню и XP
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        username,
        photo_url,
        avatar_url,
        duel_pass_level,
        duel_pass_xp
      `)
      .not("duel_pass_level", "is", null)
      .order("duel_pass_level", { ascending: false })
      .order("duel_pass_xp", { ascending: false })
      .limit(limit);

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

      return {
        user_id: profile.id,
        duel_pass_level: profile.duel_pass_level || 1,
        duel_pass_xp: profile.duel_pass_xp || 0,
        profile: {
          first_name: profile.first_name,
          username: profile.username,
          photo_url: profile.photo_url,
          avatar_url: profile.avatar_url,
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
    return new Response(
      JSON.stringify({ leaderboard }),
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

