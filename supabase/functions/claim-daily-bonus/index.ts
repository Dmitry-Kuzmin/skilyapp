import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // КРИТИЧНО: Используем серверное UTC время (не клиентское)
    const now = new Date();
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    const todayDateString = todayUTC.toISOString().split('T')[0]; // YYYY-MM-DD в UTC
    
    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
    const yesterdayDateString = yesterdayUTC.toISOString().split('T')[0];

    console.log('[claim-daily-bonus] Server UTC time:', {
      now: now.toISOString(),
      todayUTC: todayDateString,
      yesterdayUTC: yesterdayDateString,
      user_id
    });

    // ИДЕМПОТЕНТНОСТЬ: Проверяем, не был ли уже получен бонус сегодня (UTC)
    const { data: existingBonus, error: bonusError } = await supabase
      .from('user_daily_bonus')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (bonusError && bonusError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[claim-daily-bonus] Error checking existing bonus:', bonusError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing bonus", details: bonusError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Нормализуем last_claimed_date для сравнения (может быть Date объектом или строкой)
    let normalizedLastClaimedDate: string | null = null;
    if (existingBonus?.last_claimed_date) {
      if (typeof existingBonus.last_claimed_date === 'string') {
        normalizedLastClaimedDate = existingBonus.last_claimed_date.split('T')[0]; // YYYY-MM-DD
      } else if (existingBonus.last_claimed_date instanceof Date) {
        normalizedLastClaimedDate = existingBonus.last_claimed_date.toISOString().split('T')[0];
      } else {
        // Если это объект с методами, пытаемся преобразовать
        normalizedLastClaimedDate = String(existingBonus.last_claimed_date).split('T')[0];
      }
    }

    console.log('[claim-daily-bonus] Date comparison:', {
      todayDateString,
      yesterdayDateString,
      last_claimed_date_raw: existingBonus?.last_claimed_date,
      normalizedLastClaimedDate,
      current_streak: existingBonus?.current_streak
    });

    // Если бонус уже получен сегодня (UTC) - возвращаем существующий результат
    if (existingBonus && normalizedLastClaimedDate === todayDateString) {
      console.log('[claim-daily-bonus] Already claimed today (UTC):', todayDateString);
      
      // Получаем награду для текущего streak
      const weekDay = (existingBonus.current_streak % 7) || 7;
      const { data: rewardDef } = await supabase
        .from('daily_bonus_def')
        .select('*')
        .eq('day_number', weekDay)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          already_claimed: true,
          streak: existingBonus.current_streak,
          reward: rewardDef?.reward || null,
          message: "Daily bonus already claimed today"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Вычисляем новый streak на сервере
    let newStreak = 1;
    if (existingBonus) {
      if (normalizedLastClaimedDate === yesterdayDateString) {
        // Продолжаем streak
        newStreak = (existingBonus.current_streak || 0) + 1;
        console.log('[claim-daily-bonus] Continuing streak:', {
          previous_streak: existingBonus.current_streak,
          new_streak: newStreak
        });
      } else {
        // Streak прерван - начинаем заново
        newStreak = 1;
        console.log('[claim-daily-bonus] Streak broken, starting new:', {
          last_claimed: normalizedLastClaimedDate,
          yesterday: yesterdayDateString,
          previous_streak: existingBonus.current_streak
        });
      }
    } else {
      console.log('[claim-daily-bonus] No existing bonus, starting new streak');
    }

    // Циклический расчет: день недели (1-7)
    const weekDay = (newStreak % 7) || 7;

    console.log('[claim-daily-bonus] Week day calculation:', {
      newStreak,
      weekDay,
      calculation: `(${newStreak} % 7) || 7 = ${newStreak % 7} || 7 = ${weekDay}`
    });

    // Получаем награду по дню недели
    const { data: rewardDef, error: rewardError } = await supabase
      .from('daily_bonus_def')
      .select('*')
      .eq('day_number', weekDay)
      .single();

    if (rewardError || !rewardDef) {
      console.error('[claim-daily-bonus] Reward not found:', rewardError);
      return new Response(
        JSON.stringify({ error: "Reward not found for day", day: weekDay }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Валидация структуры reward
    const reward = rewardDef.reward as { xp?: number; coins?: number; boost?: any; random_loot?: any; badge?: any };
    
    if (!reward || (typeof reward !== 'object')) {
      console.error('[claim-daily-bonus] Invalid reward structure:', reward);
      return new Response(
        JSON.stringify({ error: "Invalid reward structure" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Обновляем или создаём user_daily_bonus
    if (existingBonus) {
      const { error: updateError } = await supabase
        .from('user_daily_bonus')
        .update({
          current_streak: newStreak,
          last_claimed_date: todayDateString, // UTC дата
          total_claims: (existingBonus.total_claims || 0) + 1,
        })
        .eq('id', existingBonus.id);

      if (updateError) {
        console.error('[claim-daily-bonus] Error updating daily_bonus:', updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update daily bonus", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from('user_daily_bonus')
        .insert({
          user_id: user_id,
          current_streak: newStreak,
          last_claimed_date: todayDateString, // UTC дата
          total_claims: 1,
        });

      if (insertError) {
        console.error('[claim-daily-bonus] Error inserting daily_bonus:', insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create daily bonus", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // АТОМАРНЫЕ ОПЕРАЦИИ: Начисляем награды через атомарные UPDATE
    if (reward.xp && reward.xp > 0) {
      // Атомарное обновление XP через RPC функцию
      const { error: xpError } = await supabase.rpc('increment_profile_value', {
        p_profile_id: user_id,
        p_column: 'xp',
        p_amount: reward.xp
      });

      if (xpError) {
        console.error('[claim-daily-bonus] Error incrementing XP:', xpError);
        // Повторная попытка (максимум 1 раз)
        const { error: retryXpError } = await supabase.rpc('increment_profile_value', {
          p_profile_id: user_id,
          p_column: 'xp',
          p_amount: reward.xp
        });
        
        if (retryXpError) {
          console.error('[claim-daily-bonus] Retry XP failed:', retryXpError);
          // Не прерываем выполнение - пользователь получит награду при следующем вызове (идемпотентность)
        }
      }
    }

    if (reward.coins && reward.coins > 0) {
      // Атомарное обновление Coins через RPC функцию
      const { error: coinsError } = await supabase.rpc('increment_profile_value', {
        p_profile_id: user_id,
        p_column: 'coins',
        p_amount: reward.coins
      });

      if (coinsError) {
        console.error('[claim-daily-bonus] Error incrementing coins:', coinsError);
        // Повторная попытка (максимум 1 раз)
        const { error: retryCoinsError } = await supabase.rpc('increment_profile_value', {
          p_profile_id: user_id,
          p_column: 'coins',
          p_amount: reward.coins
        });
        
        if (retryCoinsError) {
          console.error('[claim-daily-bonus] Retry coins failed:', retryCoinsError);
          // Не прерываем выполнение - пользователь получит награду при следующем вызове (идемпотентность)
        }
      }
    }

    // Вызываем season-sp для начисления SP (асинхронно, не блокируем ответ)
    // Используем прямой HTTP fetch для надежности (внутри Edge Function)
    // Используем уже объявленную переменную supabaseUrl
    fetch(`${supabaseUrl}/functions/v1/season-sp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        user_id: user_id,
        source_type: 'daily_login',
        metadata: { streak_days: newStreak }
      })
    }).catch(err => {
      console.warn('[claim-daily-bonus] season-sp error (non-blocking):', err);
    });

    console.log('[claim-daily-bonus] Claim successful:', {
      user_id,
      streak: newStreak,
      reward: reward,
      date: todayDateString
    });

    return new Response(
      JSON.stringify({
        success: true,
        streak: newStreak,
        reward: reward,
        date: todayDateString
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[claim-daily-bonus] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
