import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RewardType = 'coins' | 'restore_streak' | 'test_attempt' | 'slot_unlock';

interface RewardRequest {
  user_id: string;
  reward_type: RewardType;
  amount?: number;
  ad_unit_id?: string;
  ad_network?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createPooledSupabaseClient();

    let user_id: string | null = null;
    let reward_type: RewardType = 'coins';
    let amount = 20;
    let ad_unit_id: string | undefined;
    let ad_network = 'adsgram';
    let metadata: Record<string, any> | undefined;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const telegramUserId = url.searchParams.get('userid');
      reward_type = (url.searchParams.get('reward_type') as RewardType) || 'coins';
      amount = parseInt(url.searchParams.get('amount') || '20', 10);
      ad_unit_id = url.searchParams.get('ad_unit_id') || undefined;
      ad_network = url.searchParams.get('ad_network') || 'adsgram';

      if (!telegramUserId) {
        return new Response(JSON.stringify({ success: false, error: 'userid parameter is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('telegram_id', parseInt(telegramUserId, 10))
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      user_id = profile.id;
    } else {
      const body: RewardRequest = await req.json();

      if (body.user_id) {
        const { data: profile } = await supabaseClient.from('profiles').select('id').eq('id', body.user_id).maybeSingle();
        if (!profile) {
          return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        user_id = body.user_id;
      }

      reward_type = body.reward_type || 'coins';
      amount = body.amount || 20;
      ad_unit_id = body.ad_unit_id;
      ad_network = body.ad_network || 'adsgram';
      metadata = body.metadata;
    }

    if (!user_id) {
      return new Response(JSON.stringify({ success: false, error: 'User ID not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate limiting
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('transaction_type', 'coins_earned_ad')
      .gte('created_at', oneHourAgo);

    if (count && count >= 10) {
      return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Максимум 10 просмотров рекламы в час.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    switch (reward_type) {
      case 'coins':
        if (amount <= 0) return new Response(JSON.stringify({ success: false, error: 'Invalid amount' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const { error: coinsError } = await supabaseClient.rpc('increment_profile_value', { p_profile_id: user_id, p_column: 'coins', p_amount: amount });

        if (coinsError) throw coinsError;

        await supabaseClient.from('transactions').insert({
          user_id,
          transaction_type: 'coins_earned_ad',
          amount,
          metadata: { ad_unit_id, ad_network, reward_type: 'coins' },
        });

        return new Response(JSON.stringify({ success: true, reward: { type: 'coins', amount } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      case 'restore_streak':
        await supabaseClient.from('transactions').insert({
          user_id,
          transaction_type: 'coins_earned_ad',
          amount: 0,
          metadata: { ad_unit_id, ad_network, reward_type: 'restore_streak', ...metadata },
        });

        return new Response(JSON.stringify({ success: true, reward: { type: 'restore_streak' } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      case 'slot_unlock':
        await supabaseClient.from('transactions').insert({
          user_id,
          transaction_type: 'coins_earned_ad',
          amount: 0,
          metadata: { ad_unit_id, ad_network, reward_type: 'slot_unlock', slot_number: metadata?.slot_number, ...metadata },
        });

        return new Response(JSON.stringify({ success: true, reward: { type: 'slot_unlock', slot_number: metadata?.slot_number }, client_action: 'unlock_temp_slot' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      default:
        return new Response(JSON.stringify({ success: false, error: 'Unknown reward type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error: unknown) {
    console.error('[ad-reward] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
