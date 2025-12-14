import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RewardRequest {
  user_id: string;
  reward_type: 'coins' | 'restore_streak' | 'test_attempt' | 'slot_unlock';
  amount?: number;
  ad_unit_id?: string;
  ad_network?: string;
  metadata?: { [key: string]: any };
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    let user_id: string | null = null;
    let reward_type: RewardRequest['reward_type'] = 'coins';
    let amount = 20;
    let ad_unit_id: string | undefined;
    let ad_network = 'adsgram';
    let metadata: { [key: string]: any } | undefined;

    // Поддержка GET запросов от AdsGram (с параметром userid из Telegram)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const telegramUserId = url.searchParams.get('userid');
      reward_type = (url.searchParams.get('reward_type') as RewardRequest['reward_type']) || 'coins';
      amount = parseInt(url.searchParams.get('amount') || '20', 10);
      ad_unit_id = url.searchParams.get('ad_unit_id') || undefined;
      ad_network = url.searchParams.get('ad_network') || 'adsgram';

      if (!telegramUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userid parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Находим профиль пользователя по Telegram ID
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('telegram_id', parseInt(telegramUserId, 10))
        .single();

      if (profileError || !profile) {
        console.error('[ad-reward] Profile not found for telegram_id:', telegramUserId, profileError);
        return new Response(
          JSON.stringify({ success: false, error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      user_id = profile.id;
    } else {
      // Поддержка POST запросов (от клиентского приложения)
      const body: RewardRequest = await req.json();
      
      // Если user_id передан напрямую в body (для Telegram пользователей)
      if (body.user_id) {
        // Проверяем, что профиль существует
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('id', body.user_id)
          .single();

        if (profileError || !profile) {
          console.error('[ad-reward] Profile not found for user_id:', body.user_id, profileError);
          return new Response(
            JSON.stringify({ success: false, error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        user_id = body.user_id;
      } else {
        // Пытаемся получить пользователя через авторизацию (для веб-пользователей)
        const supabaseClientWithAuth = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: req.headers.get('Authorization')! },
            },
          }
        );

        const {
          data: { user },
        } = await supabaseClientWithAuth.auth.getUser();

        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Unauthorized. user_id is required in request body.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        user_id = user.id;
      }

      reward_type = body.reward_type || 'coins';
      amount = body.amount || 20;
      ad_unit_id = body.ad_unit_id;
      ad_network = body.ad_network || 'adsgram';
      metadata = body.metadata;
    }

    // Валидация
    if (!reward_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'reward_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: максимум 10 наград в час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
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
          p_profile_id: user_id,
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
          user_id: user_id,
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
          user_id: user_id,
          transaction_type: 'coins_earned_ad',
          amount: 0, // Streak восстановление не дает монет
          metadata: {
            ad_unit_id,
            ad_network,
            reward_type: 'restore_streak',
            ...metadata,
          },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            reward: { type: 'restore_streak' },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      case 'slot_unlock':
        // Временная разблокировка слота (на одну дуэль)
        // Здесь не начисляются монеты, только возвращается сигнал клиенту
        await supabaseClient.from('transactions').insert({
          user_id: user_id,
          transaction_type: 'coins_earned_ad',
          amount: 0,
          metadata: {
            ad_unit_id,
            ad_network,
            reward_type: 'slot_unlock',
            slot_number: metadata?.slot_number,
            ...metadata,
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            reward: { type: 'slot_unlock', slot_number: metadata?.slot_number },
            client_action: 'unlock_temp_slot', // Сигнал клиенту для временной разблокировки
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

