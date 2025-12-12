import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardRequest {
  user_id: string;
  reward_type: 'coins' | 'restore_streak' | 'test_attempt';
  amount?: number;
  ad_unit_id?: string;
  ad_network?: string;
}

/**
 * Edge Function для начисления наград за просмотр рекламы
 * 
 * Обеспечивает:
 * - Безопасное начисление наград
 * - Защиту от накрутки (rate limiting)
 * - Логирование транзакций
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RewardRequest = await req.json();
    const { reward_type, amount = 20, ad_unit_id, ad_network = 'adsgram' } = body;

    // Валидация
    if (!reward_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'reward_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: максимум 10 наград в час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('transaction_type', 'coins_earned_ad')
      .gte('created_at', oneHourAgo);

    if (count && count >= 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Максимум 10 просмотров рекламы в час.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Обработка разных типов наград
    switch (reward_type) {
      case 'coins':
        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Начисляем монеты
        const { error: coinsError } = await supabaseClient.rpc('increment_profile_value', {
          p_profile_id: user.id,
          p_column: 'coins',
          p_amount: amount,
        });

        if (coinsError) {
          console.error('[ad-reward] Error awarding coins:', coinsError);
          return new Response(
            JSON.stringify({ success: false, error: coinsError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Логируем транзакцию
        await supabaseClient.from('transactions').insert({
          user_id: user.id,
          transaction_type: 'coins_earned_ad',
          amount: amount,
          metadata: {
            ad_unit_id,
            ad_network,
            reward_type: 'coins',
          },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            reward: { type: 'coins', amount },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'restore_streak':
        // Логика восстановления streak будет добавлена позже
        // Пока возвращаем успех (награда уже начислена на клиенте)
        await supabaseClient.from('transactions').insert({
          user_id: user.id,
          transaction_type: 'coins_earned_ad',
          amount: 0, // Streak восстановление не дает монет
          metadata: {
            ad_unit_id,
            ad_network,
            reward_type: 'restore_streak',
          },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            reward: { type: 'restore_streak' },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown reward type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('[ad-reward] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

