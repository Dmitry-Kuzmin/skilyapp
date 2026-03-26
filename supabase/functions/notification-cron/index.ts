// =====================================================
// Notification CRON Service
// =====================================================
// Автоматические напоминания неактивным пользователям
// Запускается каждые 6 часов по расписанию

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const USER_EVENT_DISPATCHER_URL = `${SUPABASE_URL}/functions/v1/user-event-dispatcher`;

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
        inactive_3d: 0,
        inactive_7d: 0,
        streak_reminder: 0,
        almost_ready: 0,
        license_warning_12h: 0,
        license_warning_1h: 0
      }
    };

    // 1. Напоминания неактивным пользователям (3 дня)
    await sendInactivityReminders(supabase, 3, 'inactive_3d', results);

    // 2. Напоминания неактивным пользователям (7 дней)
    await sendInactivityReminders(supabase, 7, 'inactive_7d', results);

    // 3. Напоминания о поддержании streak
    await sendStreakReminders(supabase, results);

    // 4. Мотивационные напоминания для почти готовых
    await sendAlmostReadyReminders(supabase, results);

    // 5. Предупреждения о потере баллов (12ч и 1ч)
    await sendLicensePointLossReminders(supabase, results);

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
  supabase: SupabaseClient,
  daysInactive: number,
  eventType: 'inactive_3d' | 'inactive_7d',
  results: Record<string, unknown> & { total_checked: number; sent: number; skipped: number; errors: number; breakdown: Record<string, number> }
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

        const sendResult = await dispatchEvent({
          userId: user.user_id,
          eventType,
          payload: {
            progress_percent: progressPercent,
            streak_was: user.streak_days || 0,
            days_inactive: daysInactive
          }
        });

        if (sendResult.sent > 0) {
          results.sent += sendResult.sent;
          results.breakdown[eventType] += sendResult.sent;
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

async function sendStreakReminders(supabase: SupabaseClient, results: Record<string, unknown> & { total_checked: number; sent: number; skipped: number; errors: number; breakdown: Record<string, number> }): Promise<void> {
  try {
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
        const sendResult = await dispatchEvent({
          userId: user.user_id,
          eventType: 'streak_reminder',
          payload: {
            streak_days: user.streak_days
          }
        });

        if (sendResult.sent > 0) {
          results.sent += sendResult.sent;
          results.breakdown.streak_reminder += sendResult.sent;
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

async function sendAlmostReadyReminders(supabase: SupabaseClient, results: Record<string, unknown> & { total_checked: number; sent: number; skipped: number; errors: number; breakdown: Record<string, number> }): Promise<void> {
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
        const sendResult = await dispatchEvent({
          userId: user.user_id,
          eventType: 'almost_ready',
          payload: {
            readiness_level: Math.round(user.readiness_level)
          }
        });

        if (sendResult.sent > 0) {
          results.sent += sendResult.sent;
          results.breakdown.almost_ready += sendResult.sent;
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
// Предупреждения о потере баллов (12ч и 1ч)
// =====================================================

async function sendLicensePointLossReminders(
  supabase: SupabaseClient,
  results: Record<string, any>
): Promise<void> {
  try {
    console.log('[Notification CRON] Checking users approaching license point loss...');

    // 1. Порог 12 часов (неактивность 36-37 часов)
    const threshold12h = new Date();
    threshold12h.setHours(threshold12h.getHours() - 36);

    const { data: users12h, error: error12h } = await supabase
      .from('profiles')
      .select('id, license_points, last_activity_at, license_warning_level')
      .lt('last_activity_at', threshold12h.toISOString())
      .gt('license_points', 0)
      .is('license_warning_level', null);

    if (error12h) console.error('[Notification CRON] Error fetching 12h warning users:', error12h);

    if (users12h && users12h.length > 0) {
      console.log(`[Notification CRON] Found ${users12h.length} users for 12h warning`);
      results.total_checked += users12h.length;
      for (const user of users12h) {
        const sendResult = await dispatchEvent({
          userId: user.id,
          eventType: 'license_warning_12h',
          payload: { points: user.license_points }
        });

        if (sendResult.sent > 0) {
          await supabase.from('profiles').update({ license_warning_level: '12h' }).eq('id', user.id);
          results.sent += sendResult.sent;
          results.breakdown.license_warning_12h += sendResult.sent;
        } else if (sendResult.skipped) {
          results.skipped++;
        } else {
          results.errors++;
        }
      }
    }

    // 2. Порог 1 час (неактивность 47-48 часов)
    const threshold1h = new Date();
    threshold1h.setHours(threshold1h.getHours() - 47);

    const { data: users1h, error: error1h } = await supabase
      .from('profiles')
      .select('id, license_points, last_activity_at, license_warning_level')
      .lt('last_activity_at', threshold1h.toISOString())
      .gt('license_points', 0)
      .neq('license_warning_level', '1h');

    if (error1h) console.error('[Notification CRON] Error fetching 1h warning users:', error1h);

    if (users1h && users1h.length > 0) {
      console.log(`[Notification CRON] Found ${users1h.length} users for 1h warning`);
      results.total_checked += users1h.length;
      for (const user of users1h) {
        // Проверяем, что неактивность все еще в пределах 48 часов (чтобы не спамить после потери)
        const inactivityHours = (new Date().getTime() - new Date(user.last_activity_at).getTime()) / (1000 * 60 * 60);
        if (inactivityHours >= 48) continue;

        const sendResult = await dispatchEvent({
          userId: user.id,
          eventType: 'license_warning_1h',
          payload: { points: user.license_points }
        });

        if (sendResult.sent > 0) {
          await supabase.from('profiles').update({ license_warning_level: '1h' }).eq('id', user.id);
          results.sent += sendResult.sent;
          results.breakdown.license_warning_1h += sendResult.sent;
        } else if (sendResult.skipped) {
          results.skipped++;
        } else {
          results.errors++;
        }
      }
    }

  } catch (error) {
    console.error('[Notification CRON] License warnings error:', error);
  }
}

async function dispatchEvent(params: {
  userId: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<{ sent: number; skipped?: boolean; error?: string }> {
  try {
    const response = await fetch(USER_EVENT_DISPATCHER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        user_id: params.userId,
        event_type: params.eventType,
        payload: params.payload
      }),
      signal: AbortSignal.timeout(8000),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[Notification CRON] dispatch error:', result);
      return { sent: 0, error: result?.error || 'dispatch_failed' };
    }

    const sentCount = typeof result.sent === 'number' ? result.sent : result.success ? 1 : 0;
    return {
      sent: sentCount,
      skipped: result.skipped || sentCount === 0
    };
  } catch (error) {
    console.error('[Notification CRON] dispatch exception:', error);
    return { sent: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

