import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Reward {
  xp?: number;
  coins?: number;
  boost?: string | Record<string, any> | null;
  random_loot?: Record<string, any> | null;
  badge?: string | null;
}

interface DailyBonusDef {
  day_number: number;
  reward: Reward;
}

interface UserDailyBonus {
  id: string;
  user_id: string;
  current_streak: number;
  last_claimed_date: string;
  total_claims: number;
}

interface ClaimRequest {
  user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createPooledSupabaseClient();
    const body: ClaimRequest = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayDateString = todayUTC.toISOString().split('T')[0];

    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
    const yesterdayDateString = yesterdayUTC.toISOString().split('T')[0];

    console.log('[claim-daily-bonus] Processing for user:', user_id, 'today:', todayDateString);

    const { data: existingBonus, error: bonusError } = await supabase
      .from('user_daily_bonus')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle() as { data: UserDailyBonus | null, error: any };

    if (bonusError) {
      console.error('[claim-daily-bonus] Error checking existing bonus:', bonusError);
      return new Response(JSON.stringify({ error: "Failed to check existing bonus" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let normalizedLastClaimedDate: string | null = null;
    if (existingBonus?.last_claimed_date) {
      normalizedLastClaimedDate = String(existingBonus.last_claimed_date).split('T')[0];
    }

    if (existingBonus && normalizedLastClaimedDate === todayDateString) {
      const weekDay = (existingBonus.current_streak % 7) || 7;
      const { data: rewardDef } = await supabase.from('daily_bonus_def').select('reward').eq('day_number', weekDay).maybeSingle();

      return new Response(JSON.stringify({
        success: true,
        already_claimed: true,
        streak: existingBonus.current_streak,
        reward: rewardDef?.reward || null,
        message: "Daily bonus already claimed today"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let newStreak = 1;
    if (existingBonus) {
      if (normalizedLastClaimedDate === yesterdayDateString) {
        newStreak = (existingBonus.current_streak || 0) + 1;
      } else {
        newStreak = 1;
      }
    }

    const weekDay = (newStreak % 7) || 7;
    const { data: rewardDef, error: rewardError } = await supabase.from('daily_bonus_def').select('*').eq('day_number', weekDay).maybeSingle() as { data: DailyBonusDef | null, error: any };

    if (rewardError || !rewardDef) {
      return new Response(JSON.stringify({ error: "Reward not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reward = rewardDef.reward;

    if (!reward || (typeof reward !== 'object')) {
      return new Response(JSON.stringify({ error: "Invalid reward structure" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (existingBonus) {
      await supabase.from('user_daily_bonus').update({
        current_streak: newStreak,
        last_claimed_date: todayDateString,
        total_claims: (existingBonus.total_claims || 0) + 1,
      }).eq('id', existingBonus.id);
    } else {
      await supabase.from('user_daily_bonus').insert({
        user_id: user_id,
        current_streak: newStreak,
        last_claimed_date: todayDateString,
        total_claims: 1,
      });
    }

    if (reward.xp && reward.xp > 0) {
      await supabase.rpc('increment_profile_value', { p_profile_id: user_id, p_column: 'xp', p_amount: reward.xp });
    }

    if (reward.coins && reward.coins > 0) {
      await supabase.rpc('increment_profile_value', { p_profile_id: user_id, p_column: 'coins', p_amount: reward.coins });
    }

    // Async call to season-sp
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // NEW: Handle daily license points (Qualification System)
    try {
      console.log('[claim-daily-bonus] 🛡️ Triggering daily_login license event');
      await supabase.rpc('process_license_event', {
        p_user_id: user_id,
        p_event_type: 'daily_login'
      });
    } catch (licenseError) {
      console.error('[claim-daily-bonus] ⚠️ License event failed:', licenseError);
      // We don't fail the whole request if license points fail
    }

    fetch(`${supabaseUrl}/functions/v1/season-sp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
      body: JSON.stringify({ user_id, source_type: 'daily_login', metadata: { streak_days: newStreak } })
    }).catch(err => console.warn('[claim-daily-bonus] season-sp error:', err));

    return new Response(JSON.stringify({
      success: true,
      streak: newStreak,
      reward: reward,
      date: todayDateString
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error('[claim-daily-bonus] Error:', error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
