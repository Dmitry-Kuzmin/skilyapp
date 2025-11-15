import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LeaderboardEntry = {
  userId: string;
  total_profit: number;
  total_sp: number;
  insurance_refunds: number;
  wins: number;
  losses: number;
  draws: number;
  duels: number;
  profile?: {
    first_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let limit = 20;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.limit) {
        limit = Math.min(Math.max(parseInt(body.limit, 10) || 20, 5), 50);
      }
    }

    const { data: history, error: historyError } = await supabase
      .from("duel_bet_history")
      .select(`
        bet_id,
        result,
        payout_host,
        payout_opponent,
        season_sp_host,
        season_sp_opponent,
        insurance_refund_host,
        insurance_refund_opponent,
        duel_bets!inner(host_user, opponent_user)
      `)
      .order("processed_at", { ascending: false })
      .limit(1000);

    if (historyError) {
      console.error("[duel-leaderboard] Error loading history:", historyError);
      return new Response(
        JSON.stringify({ error: "Failed to load leaderboard" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statsMap = new Map<string, LeaderboardEntry>();

    const ensureEntry = (userId: string) => {
      if (!statsMap.has(userId)) {
        statsMap.set(userId, {
          userId,
          total_profit: 0,
          total_sp: 0,
          insurance_refunds: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          duels: 0,
        });
      }
      return statsMap.get(userId)!;
    };

    history?.forEach((row: any) => {
      const hostId = row?.duel_bets?.host_user;
      const opponentId = row?.duel_bets?.opponent_user;
      if (!hostId || !opponentId) return;

      const hostEntry = ensureEntry(hostId);
      const opponentEntry = ensureEntry(opponentId);

      hostEntry.total_profit += row.payout_host || 0;
      hostEntry.total_sp += row.season_sp_host || 0;
      hostEntry.insurance_refunds += row.insurance_refund_host || 0;
      hostEntry.duels += 1;

      opponentEntry.total_profit += row.payout_opponent || 0;
      opponentEntry.total_sp += row.season_sp_opponent || 0;
      opponentEntry.insurance_refunds += row.insurance_refund_opponent || 0;
      opponentEntry.duels += 1;

      const result = row.result as string;
      if (result === "host_win") {
        hostEntry.wins += 1;
        opponentEntry.losses += 1;
      } else if (result === "opponent_win") {
        opponentEntry.wins += 1;
        hostEntry.losses += 1;
      } else {
        hostEntry.draws += 1;
        opponentEntry.draws += 1;
      }
    });

    const userIds = Array.from(statsMap.keys());
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ leaderboard: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, username, avatar_url")
      .in("id", userIds);

    const profileMap = new Map<string, any>();
    profiles?.forEach((profile) => profileMap.set(profile.id, profile));

    const leaderboard = Array.from(statsMap.values())
      .map((entry) => ({
        ...entry,
        profile: profileMap.get(entry.userId) || null,
      }))
      .sort((a, b) => {
        if (b.total_profit === a.total_profit) {
          return b.total_sp - a.total_sp;
        }
        return b.total_profit - a.total_profit;
      })
      .slice(0, limit);

    return new Response(
      JSON.stringify({ leaderboard }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[duel-leaderboard] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

