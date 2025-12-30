import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaderboardEntry {
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
  } | null;
}

interface DuelHistoryRow {
  bet_id: string;
  result: string;
  payout_host: number;
  payout_opponent: number;
  season_sp_host: number;
  season_sp_opponent: number;
  insurance_refund_host: number;
  insurance_refund_opponent: number;
  duel_bets: {
    host_user: string;
    opponent_user: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createPooledSupabaseClient();

    let limit = 20;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.limit) {
          limit = Math.min(Math.max(parseInt(body.limit, 10) || 20, 5), 50);
        }
      } catch { /* empty */ }
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
      .limit(1000) as { data: DuelHistoryRow[] | null, error: unknown };

    if (historyError) {
      console.error("[duel-leaderboard] Error loading history:", historyError);
      return new Response(JSON.stringify({ error: "Failed to load leaderboard" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const statsMap = new Map<string, LeaderboardEntry>();

    const ensureEntry = (userId: string): LeaderboardEntry => {
      let entry = statsMap.get(userId);
      if (!entry) {
        entry = { userId, total_profit: 0, total_sp: 0, insurance_refunds: 0, wins: 0, losses: 0, draws: 0, duels: 0 };
        statsMap.set(userId, entry);
      }
      return entry;
    };

    history?.forEach((row) => {
      const hostId = row.duel_bets?.host_user;
      const opponentId = row.duel_bets?.opponent_user;
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

      const result = row.result;
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
      return new Response(JSON.stringify({ leaderboard: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profiles } = await supabase.from("profiles").select("id, first_name, username, avatar_url").in("id", userIds);

    // Using a more specific type instead of any
    type ProfileData = NonNullable<LeaderboardEntry['profile']> & { id: string };
    const profileMap = new Map<string, ProfileData>();
    profiles?.forEach((p) => profileMap.set(p.id, p));

    const leaderboard = Array.from(statsMap.values())
      .map((entry) => ({
        ...entry,
        profile: profileMap.get(entry.userId) || null,
      }))
      .sort((a, b) => b.total_profit - a.total_profit || b.total_sp - a.total_sp)
      .slice(0, limit);

    return new Response(JSON.stringify({ leaderboard }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("[duel-leaderboard] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
