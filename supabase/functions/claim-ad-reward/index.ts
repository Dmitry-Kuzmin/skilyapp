import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, reward_type = 'coins', reward_amount = 50, metadata } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Вызываем функцию начисления награды (с проверкой ограничений)
    // Для slot_unlock передаем специальные лимиты (1 раз в день, кулдаун 24 часа)
    const dailyLimit = reward_type === 'slot_unlock' ? 1 : 5;
    const cooldownMinutes = reward_type === 'slot_unlock' ? 1440 : 60; // 24 часа для слота

    const { data, error } = await supabase.rpc('claim_ad_reward', {
      p_user_id: user_id,
      p_reward_type: reward_type,
      p_reward_amount: reward_amount,
      p_daily_limit: dailyLimit,
      p_cooldown_minutes: cooldownMinutes,
    });

    if (error) {
      console.error('[claim-ad-reward] Error:', error);
      throw error;
    }

    if (!data.success) {
      return new Response(
        JSON.stringify(data),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[claim-ad-reward] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

