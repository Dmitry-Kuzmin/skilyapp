import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimRequest {
  user_id: string;
  reward_type?: string;
  reward_amount?: number;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ClaimRequest = await req.json();
    const { user_id, reward_type = 'coins', reward_amount = 25 } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createPooledSupabaseClient();

    const dailyLimit = reward_type === 'slot_unlock' ? 1 : 5;
    const cooldownMinutes = reward_type === 'slot_unlock' ? 1440 : 60;

    const { data, error } = await supabase.rpc('claim_ad_reward', {
      p_user_id: user_id,
      p_reward_type: reward_type,
      p_reward_amount: reward_amount,
      p_daily_limit: dailyLimit,
      p_cooldown_minutes: cooldownMinutes,
    });

    if (error) throw error;

    if (!data.success) {
      return new Response(JSON.stringify(data), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[claim-ad-reward] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
