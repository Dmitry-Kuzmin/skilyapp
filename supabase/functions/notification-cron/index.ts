// =====================================================
// Notification CRON Service
// =====================================================
// Автоматические напоминания неактивным пользователям
// Запускается каждые 6 часов по расписанию

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('[Notification CRON] Service started');

// =====================================================
// Главный обработчик
// =====================================================

serve(async (req) => {
  try {
    console.log('[Notification CRON] Running scheduled task...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Результаты отправки
    const results = {
      total_checked: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      breakdown: {
        comeback_3days: 0,
        comeback_7days: 0,
        streak_reminder: 0,
        almost_ready: 0
      }
    };

    // 1. Напоминания неактивным пользователям (3 дня)
    await sendInactivityReminders(supabase, 3, 'comeback_3days', results);

    // 2. Напоминания неактивным пользователям (7 дней)
    await sendInactivityReminders(supabase, 7, 'comeback_7days', results);

    // 3. Напоминания о поддержании streak
    await sendStreakReminders(supabase, results);

    // 4. Мотивационные напоминания для почти готовых
    await sendAlmostReadyReminders(supabase, results);

    console.log('[Notification CRON] Results:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Notification CRON] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// =====================================================
// Напоминания неактивным пользователям
// =====================================================

async function sendInactivityReminders(
  supabase: any,
  daysInactive: number,
  templateType: string,
  results: any
): Promise<void> {
  try {
    const inactiveDate = new Date();
    inactiveDate.setDate(inactiveDate.getDate() - daysInactive);

    console.log(`[Notification CRON] Checking users inactive for ${daysInactive} days...`);

    // Находим неактивных пользователей
    const { data: inactiveUsers, error } = await supabase
      .from('user_metrics')
      .select(`
        user_id,
        readiness_level,
        streak_days,
        last_test_at,
        last_login_at,
        total_tests_completed,
        profiles!inner (telegram_id, first_name)
      `)
      .lt('last_login_at', inactiveDate.toISOString())
      .gt('total_tests_completed', 0); // Только те, кто хотя бы раз занимался

    if (error) {
      console.error(`[Notification CRON] Error fetching inactive users (${daysInactive}d):`, error);
      return;
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log(`[Notification CRON] No inactive users found for ${daysInactive} days`);
      return;
    }

    console.log(`[Notification CRON] Found ${inactiveUsers.length} inactive users (${daysInactive}d)`);
    results.total_checked += inactiveUsers.length;

    // Отправляем уведомления
    for (const user of inactiveUsers) {
      try {
        const progressPercent = Math.round(user.readiness_level || 0);
        
        const sendResult = await sendNotification(supabase, {
          user_id: user.user_id,
          template_type: templateType,
          variables: {
            progress_percent: progressPercent,
            streak_was: user.streak_days || 0,
            days_inactive: daysInactive
          }
        });

        if (sendResult.success) {
          results.sent++;
          results.breakdown[templateType]++;
        } else if (sendResult.skipped) {
          results.skipped++;
        } else {
          results.errors++;
        }
      } catch (error) {
        console.error('[Notification CRON] Error sending to user:', error);
        results.errors++;
      }
    }

  } catch (error) {
    console.error('[Notification CRON] Inactivity reminders error:', error);
  }
}

// =====================================================
// Напоминания о поддержании streak
// =====================================================

async function sendStreakReminders(supabase: any, results: any): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log('[Notification CRON] Checking users with active streaks...');

    // Находим пользователей с активными сериями, которые не занимались сегодня
    const { data: streakUsers, error } = await supabase
      .from('user_metrics')
      .select(`
        user_id,
        streak_days,
        last_streak_date,
        profiles!inner (telegram_id, first_name)
      `)
      .gte('streak_days', 3) // Минимум 3 дня серии
      .eq('last_streak_date', yesterdayStr); // Последний раз занимались вчера

    if (error) {
      console.error('[Notification CRON] Error fetching streak users:', error);
      return;
    }

    if (!streakUsers || streakUsers.length === 0) {
      console.log('[Notification CRON] No users with active streaks to remind');
      return;
    }

    console.log(`[Notification CRON] Found ${streakUsers.length} users with active streaks`);
    results.total_checked += streakUsers.length;

    // Отправляем напоминания
    for (const user of streakUsers) {
      try {
        const sendResult = await sendNotification(supabase, {
          user_id: user.user_id,
          template_type: 'daily_practice',
          variables: {
            streak_days: user.streak_days
          }
        });

        if (sendResult.success) {
          results.sent++;
          results.breakdown.streak_reminder++;
        } else if (sendResult.skipped) {
          results.skipped++;
        } else {
          results.errors++;
        }
      } catch (error) {
        console.error('[Notification CRON] Error sending streak reminder:', error);
        results.errors++;
      }
    }

  } catch (error) {
    console.error('[Notification CRON] Streak reminders error:', error);
  }
}

// =====================================================
// Мотивация для почти готовых к экзамену
// =====================================================

async function sendAlmostReadyReminders(supabase: any, results: any): Promise<void> {
  try {
    console.log('[Notification CRON] Checking users almost ready for exam...');

    // Находим пользователей с высокой готовностью (70-90%), но не занимавшихся последние 2 дня
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: almostReadyUsers, error } = await supabase
      .from('user_metrics')
      .select(`
        user_id,
        readiness_level,
        last_test_at,
        profiles!inner (telegram_id, first_name)
      `)
      .gte('readiness_level', 70)
      .lt('readiness_level', 95)
      .lt('last_test_at', twoDaysAgo.toISOString());

    if (error) {
      console.error('[Notification CRON] Error fetching almost ready users:', error);
      return;
    }

    if (!almostReadyUsers || almostReadyUsers.length === 0) {
      console.log('[Notification CRON] No almost ready users to remind');
      return;
    }

    console.log(`[Notification CRON] Found ${almostReadyUsers.length} almost ready users`);
    results.total_checked += almostReadyUsers.length;

    // Отправляем мотивационные уведомления
    for (const user of almostReadyUsers) {
      try {
        const sendResult = await sendNotification(supabase, {
          user_id: user.user_id,
          template_type: 'almost_ready',
          variables: {
            readiness_level: Math.round(user.readiness_level)
          }
        });

        if (sendResult.success) {
          results.sent++;
          results.breakdown.almost_ready++;
        } else if (sendResult.skipped) {
          results.skipped++;
        } else {
          results.errors++;
        }
      } catch (error) {
        console.error('[Notification CRON] Error sending almost ready reminder:', error);
        results.errors++;
      }
    }

  } catch (error) {
    console.error('[Notification CRON] Almost ready reminders error:', error);
  }
}

// =====================================================
// Отправка уведомления через notification-sender
// =====================================================

async function sendNotification(
  supabase: any,
  params: {
    user_id: string;
    template_type: string;
    variables: Record<string, any>;
  }
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notification-sender`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        user_id: params.user_id,
        template_type: params.template_type,
        variables: params.variables,
        force: false // Учитываем тихие часы и cooldown
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Notification CRON] Send error:', error);
      return { success: false, error: error.error };
    }

    const result = await response.json();
    
    if (result.skipped) {
      return { success: false, skipped: true };
    }

    return { success: true };

  } catch (error) {
    console.error('[Notification CRON] Send notification error:', error);
    return { success: false, error: error.message };
  }
}

