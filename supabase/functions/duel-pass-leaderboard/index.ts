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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let limit = 50;
    let season = 1;
    
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.limit) {
        limit = Math.min(Math.max(parseInt(body.limit, 10) || 50, 10), 100);
      }
      if (body?.season) {
        season = parseInt(body.season, 10) || 1;
      }
    }

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
      return new Response(
        JSON.stringify({ error: "Failed to load leaderboard" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ leaderboard: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = profiles.map((p) => p.id);

    // Загружаем активные скины пользователей
    const { data: activeSkins } = await supabase
      .from("user_skins")
      .select(`
        user_id,
        skin_id,
        skin_definitions:skin_definitions!inner(id, name_ru, rarity, metadata)
      `)
      .eq("is_active", true)
      .in("user_id", userIds);

    // Загружаем отображаемые бейджи (до 3 на пользователя)
    const { data: displayedBadges } = await supabase
      .from("user_badges")
      .select(`
        user_id,
        badge_id,
        display_order,
        badge_definitions:badge_definitions!inner(id, name_ru, rarity, metadata)
      `)
      .eq("is_displayed", true)
      .in("user_id", userIds)
      .order("display_order", { ascending: true })
      .limit(3 * userIds.length); // Максимум 3 бейджа на пользователя

    // Загружаем количество полученных наград
    const { data: claimedRewards } = await supabase
      .from("user_claimed_rewards")
      .select("user_id")
      .eq("season", season)
      .in("user_id", userIds);

    // Создаем мапы для быстрого доступа
    const skinMap = new Map<string, any>();
    activeSkins?.forEach((skin) => {
      skinMap.set(skin.user_id, skin);
    });

    const badgesMap = new Map<string, any[]>();
    displayedBadges?.forEach((badge) => {
      if (!badgesMap.has(badge.user_id)) {
        badgesMap.set(badge.user_id, []);
      }
      badgesMap.get(badge.user_id)!.push(badge);
    });

    const rewardsCountMap = new Map<string, number>();
    claimedRewards?.forEach((reward) => {
      rewardsCountMap.set(
        reward.user_id,
        (rewardsCountMap.get(reward.user_id) || 0) + 1
      );
    });

    // Формируем рейтинг
    const leaderboard: LeaderboardEntry[] = profiles.map((profile) => ({
      user_id: profile.id,
      duel_pass_level: profile.duel_pass_level || 1,
      duel_pass_xp: profile.duel_pass_xp || 0,
      profile: {
        first_name: profile.first_name,
        username: profile.username,
        photo_url: profile.photo_url,
        avatar_url: profile.avatar_url,
      },
      active_skin: skinMap.get(profile.id) || null,
      displayed_badges: badgesMap.get(profile.id) || [],
      claimed_rewards_count: rewardsCountMap.get(profile.id) || 0,
    }));

    // Дополнительная сортировка: сначала по уровню, потом по XP
    leaderboard.sort((a, b) => {
      if (b.duel_pass_level !== a.duel_pass_level) {
        return b.duel_pass_level - a.duel_pass_level;
      }
      return b.duel_pass_xp - a.duel_pass_xp;
    });

    return new Response(
      JSON.stringify({ leaderboard }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[duel-pass-leaderboard] unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

