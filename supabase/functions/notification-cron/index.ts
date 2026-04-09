// =====================================================
// Notification CRON Service
// =====================================================
// Автоматические напоминания неактивным пользователям
// Запускается каждые 6 часов по расписанию

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

console.log('[Notification CRON] Module loaded (v3) - awaiting requests');

// Оболочка с таймаутом
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: number;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${message} (${ms}ms)`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// =====================================================
// Главный обработчик
// =====================================================

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createPooledSupabaseClient(SUPABASE_SERVICE_ROLE_KEY);

  const results = {
    total_checked: 0, sent: 0, skipped: 0, errors: 0,
    breakdown: { inactive_3d: 0, inactive_7d: 0, streak_reminder: 0, almost_ready: 0, license_warning_12h: 0, license_warning_1h: 0 }
  };

  const runTasks = async () => {
    console.log('[Notification CRON] Starting background tasks...');
    try {
      await sendInactivityReminders(supabase, 3, 'inactive_3d', results);
      await sendInactivityReminders(supabase, 7, 'inactive_7d', results);
      await sendStreakReminders(supabase, results);
      await sendAlmostReadyReminders(supabase, results);
      await sendLicensePointLossReminders(supabase, results);
      console.log('[Notification CRON] Done:', results);
    } catch (e) {
      console.error('[Notification CRON] Background error:', e);
    }
  };

  // Запускаем в фоне — GitHub Actions получает 200 немедленно и не таймаутит
  if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
    (globalThis as any).EdgeRuntime.waitUntil(runTasks());
  } else {
    runTasks(); // fallback для локального запуска
  }

  return new Response(
    JSON.stringify({ ok: true, status: 'processing_started', ts: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
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

    console.log(`[Notification CRON] Fetching user_metrics for ${daysInactive} days...`);

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
      console.error(`[Notification CRON] DB Error (${daysInactive}d):`, error);
      return;
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log(`[Notification CRON] No users found for ${daysInactive} days`);
      return;
    }

    console.log(`[Notification CRON] Found ${inactiveUsers.length} users (${daysInactive}d). Sending...`);
    results.total_checked += inactiveUsers.length;

    const chunkSize = 10;
    for (let i = 0; i < inactiveUsers.length; i += chunkSize) {
      const chunk = inactiveUsers.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (user) => {
        try {
          const progressPercent = Math.round(user.readiness_level || 0);

          const sendResult = await dispatchEvent(supabase, {
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
          results.errors++;
        }
      }));
    }
    console.log(`[Notification CRON] Finished sending ${eventType}`);
  } catch (error) {
    console.error('[Notification CRON] Inactivity reminders runtime error:', error);
  }
}

// =====================================================
// Напоминания о поддержании streak
// =====================================================

async function sendStreakReminders(
  supabase: SupabaseClient, 
  results: Record<string, unknown> & { total_checked: number; sent: number; skipped: number; errors: number; breakdown: Record<string, number> }
): Promise<void> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log('[Notification CRON] Fetching users with active streaks...');

    const { data: streakUsers, error } = await supabase
      .from('user_metrics')
      .select(`
        user_id,
        streak_days,
        last_streak_date,
        profiles!inner (telegram_id, first_name)
      `)
      .gte('streak_days', 3)
      .eq('last_streak_date', yesterdayStr);

    if (error) {
      console.error('[Notification CRON] DB Error streak:', error);
      return;
    }

    if (!streakUsers || streakUsers.length === 0) {
      console.log('[Notification CRON] No active streaks found');
      return;
    }

    console.log(`[Notification CRON] Found ${streakUsers.length} streaks. Sending...`);
    results.total_checked += streakUsers.length;

    const chunkSize = 10;
    for (let i = 0; i < streakUsers.length; i += chunkSize) {
      const chunk = streakUsers.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (user) => {
        try {
          const sendResult = await dispatchEvent(supabase, {
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
          results.errors++;
        }
      }));
    }
    console.log(`[Notification CRON] Finished streak reminders`);
  } catch (error) {
    console.error('[Notification CRON] Streak runtime error:', error);
  }
}

// =====================================================
// Мотивация для почти готовых к экзамену
// =====================================================

async function sendAlmostReadyReminders(
  supabase: SupabaseClient, 
  results: Record<string, unknown> & { total_checked: number; sent: number; skipped: number; errors: number; breakdown: Record<string, number> }
): Promise<void> {
  try {
    console.log('[Notification CRON] Fetching almost ready users...');

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
      console.error('[Notification CRON] DB Error almost ready:', error);
      return;
    }

    if (!almostReadyUsers || almostReadyUsers.length === 0) {
      console.log('[Notification CRON] No almost ready users found');
      return;
    }

    console.log(`[Notification CRON] Found ${almostReadyUsers.length} almost ready. Sending...`);
    results.total_checked += almostReadyUsers.length;

    const chunkSize = 10;
    for (let i = 0; i < almostReadyUsers.length; i += chunkSize) {
      const chunk = almostReadyUsers.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (user) => {
        try {
          const sendResult = await dispatchEvent(supabase, {
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
          results.errors++;
        }
      }));
    }
    console.log(`[Notification CRON] Finished almost ready reminders`);
  } catch (error) {
    console.error('[Notification CRON] Almost ready runtime error:', error);
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
    console.log('[Notification CRON] Fetching license loss users...');

    const threshold12h = new Date();
    threshold12h.setHours(threshold12h.getHours() - 36);
    const threshold12hDate = threshold12h.toISOString().split('T')[0];

    // Используем last_daily_point_at как основной индикатор активности
    const { data: users12h, error: error12h } = await supabase
      .from('profiles')
      .select('id, license_points, last_activity_at, last_daily_point_at, license_warning_level')
      .or(`last_daily_point_at.lt.${threshold12hDate},and(last_daily_point_at.is.null,last_activity_at.lt.${threshold12h.toISOString()})`)
      .gt('license_points', 0)
      .is('license_warning_level', null);

    if (error12h) console.error('[Notification CRON] DB Error 12h warning:', error12h);

    if (users12h && users12h.length > 0) {
      console.log(`[Notification CRON] Found ${users12h.length} for 12h warning.`);
      results.total_checked += users12h.length;
      
      const chunkSize = 10;
      for (let i = 0; i < users12h.length; i += chunkSize) {
        const chunk = users12h.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (user) => {
          try {
            const sendResult = await dispatchEvent(supabase, {
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
          } catch (err) {
            results.errors++;
          }
        }));
      }
    }

    const threshold1h = new Date();
    threshold1h.setHours(threshold1h.getHours() - 47);

    const { data: users1h, error: error1h } = await supabase
      .from('profiles')
      .select('id, license_points, last_activity_at, license_warning_level')
      .lt('last_activity_at', threshold1h.toISOString())
      .gt('license_points', 0)
      .neq('license_warning_level', '1h');

    if (error1h) console.error('[Notification CRON] DB Error 1h warning:', error1h);

    if (users1h && users1h.length > 0) {
      console.log(`[Notification CRON] Found ${users1h.length} for 1h warning.`);
      results.total_checked += users1h.length;
      
      const chunkSize = 10;
      for (let i = 0; i < users1h.length; i += chunkSize) {
        const chunk = users1h.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (user) => {
          try {
            const inactivityHours = (new Date().getTime() - new Date(user.last_activity_at).getTime()) / (1000 * 60 * 60);
            if (inactivityHours >= 48) return;

            const sendResult = await dispatchEvent(supabase, {
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
          } catch (err) {
            results.errors++;
          }
        }));
      }
    }
    console.log(`[Notification CRON] Finished license warning`);
  } catch (error) {
    console.error('[Notification CRON] License warnings runtime error:', error);
  }
}

async function dispatchEvent(
  supabase: SupabaseClient,
  params: {
    userId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }
): Promise<{ sent: number; skipped?: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke('user-event-dispatcher', {
      body: {
        user_id: params.userId,
        event_type: params.eventType,
        payload: params.payload
      }
    });

    if (error) {
      console.error('[Notification CRON] dispatch invoke error:', error);
      return { sent: 0, error: error.message || 'dispatch_failed' };
    }

    const sentCount = typeof result?.sent === 'number' ? result.sent : result?.success ? 1 : 0;
    return {
      sent: sentCount,
      skipped: result?.skipped || sentCount === 0
    };
  } catch (error) {
    console.error('[Notification CRON] dispatch exception:', error);
    return { sent: 0, error: error instanceof Error ? error.message : String(error) };
  }
}
