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
    const { user_id, reward_type = 'coins', daily_limit, cooldown_minutes } = await req.json();

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

    // Определяем лимиты в зависимости от типа награды
    const finalDailyLimit = daily_limit ?? (reward_type === 'slot_unlock' ? 1 : 5);
    const finalCooldownMinutes = cooldown_minutes ?? (reward_type === 'slot_unlock' ? 1440 : 60);

    // Вызываем функцию проверки статуса
    const { data, error } = await supabase.rpc('check_ad_reward_status', {
      p_user_id: user_id,
      p_reward_type: reward_type,
      p_daily_limit: finalDailyLimit,
      p_cooldown_minutes: finalCooldownMinutes,
    });

    if (error) {
      console.error('[check-ad-reward-status] Error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[check-ad-reward-status] Exception:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

