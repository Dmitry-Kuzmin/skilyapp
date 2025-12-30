// =====================================================
// Metrics Exporter
// =====================================================
// Экспортирует метрики производительности БД и Edge Functions
// через Supabase Metrics API для мониторинга

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface MetricsRequest {
  metric_type?: 'database' | 'functions' | 'auth' | 'storage' | 'all';
  time_range?: '1h' | '24h' | '7d' | '30d';
  function_name?: string; // Для метрик конкретной функции
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: MetricsRequest = req.method === 'POST' ? await req.json() : {};
    const {
      metric_type = 'all',
      time_range = '24h',
      function_name,
    } = body;

    const metrics: Record<string, unknown> = {};

    // 1. Метрики БД (через прямые запросы к pg_stat)
    if (metric_type === 'database' || metric_type === 'all') {
      const dbMetrics = await getDatabaseMetrics(supabase);
      metrics.database = dbMetrics;
    }

    // 2. Метрики Edge Functions (через logs и статистику)
    if (metric_type === 'functions' || metric_type === 'all') {
      const functionsMetrics = await getFunctionsMetrics(supabase, function_name);
      metrics.functions = functionsMetrics;
    }

    // 3. Метрики Auth (через auth.users статистику)
    if (metric_type === 'auth' || metric_type === 'all') {
      const authMetrics = await getAuthMetrics(supabase, time_range);
      metrics.auth = authMetrics;
    }

    // 4. Общие метрики производительности
    if (metric_type === 'all') {
      const performanceMetrics = await getPerformanceMetrics(supabase);
      metrics.performance = performanceMetrics;
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        time_range,
        metrics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[MetricsExporter] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Получение метрик БД (упрощённая версия через стандартные запросы)
async function getDatabaseMetrics(supabase: SupabaseClient) {
  try {
    // Подсчитываем количество записей в основных таблицах
    const [profiles, questions, topics, duels, transactions] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('questions_new').select('*', { count: 'exact', head: true }),
      supabase.from('topics').select('*', { count: 'exact', head: true }),
      supabase.from('duels').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
    ]);

    return {
      table_counts: {
        profiles: profiles.count || 0,
        questions: questions.count || 0,
        topics: topics.count || 0,
        duels: duels.count || 0,
        transactions: transactions.count || 0,
      },
      note: 'Для детальных метрик БД используйте Supabase Dashboard Metrics API',
    };
  } catch (error) {
    console.error('[MetricsExporter] Database metrics error:', error);
    return { error: 'Failed to fetch database metrics' };
  }
}

// Получение метрик Edge Functions
async function getFunctionsMetrics(supabase: SupabaseClient, functionName?: string) {
  try {
    // Получаем список всех функций
    const functions = [
      'ai-chat',
      'duel-manager',
      'telegram-auth',
      'notification-sender',
      'user-event-dispatcher',
      'purchase-create',
      'process-purchase',
      'claim-daily-bonus',
      'sync-google-sheets',
    ];

    const functionsToCheck = functionName ? [functionName] : functions;

    const metrics = await Promise.all(
      functionsToCheck.map(async (fn) => {
        // Подсчитываем вызовы за последние 24 часа через logs (если доступны)
        // В реальности это нужно делать через Supabase Logs API или хранить в БД
        return {
          name: fn,
          calls_24h: 0, // TODO: Реализовать через logs API
          avg_duration_ms: 0,
          error_rate: 0,
          last_called: null,
        };
      })
    );

    return {
      functions: metrics,
      total_functions: functions.length,
    };
  } catch (error) {
    console.error('[MetricsExporter] Functions metrics error:', error);
    return { error: 'Failed to fetch functions metrics' };
  }
}

// Получение метрик Auth
async function getAuthMetrics(supabase: SupabaseClient, timeRange: string) {
  try {
    const timeAgo = getTimeAgo(timeRange);

    // Новые пользователи за период
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', timeAgo);

    // Активные пользователи (заходили за период)
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', timeAgo);

    // Пользователи с Passkey
    const { count: passkeyUsers } = await supabase
      .from('passkey_credentials')
      .select('*', { count: 'exact', head: true });

    return {
      new_users: newUsers || 0,
      active_users: activeUsers || 0,
      passkey_users: passkeyUsers || 0,
      time_range: timeRange,
    };
  } catch (error) {
    console.error('[MetricsExporter] Auth metrics error:', error);
    return { error: 'Failed to fetch auth metrics' };
  }
}

// Получение метрик производительности
async function getPerformanceMetrics(supabase: SupabaseClient) {
  try {
    // Получаем статистику по недавним транзакциям и активностям
    const { count: recentTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { count: recentDuels } = await supabase
      .from('duels')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return {
      activity_24h: {
        transactions: recentTransactions || 0,
        duels: recentDuels || 0,
      },
      note: 'Для детальных метрик производительности используйте Supabase Dashboard',
    };
  } catch (error) {
    console.error('[MetricsExporter] Performance metrics error:', error);
    return { error: 'Failed to fetch performance metrics' };
  }
}

// Вспомогательная функция для получения времени назад
function getTimeAgo(timeRange: string): string {
  const now = new Date();
  let hoursAgo = 24;

  switch (timeRange) {
    case '1h':
      hoursAgo = 1;
      break;
    case '24h':
      hoursAgo = 24;
      break;
    case '7d':
      hoursAgo = 24 * 7;
      break;
    case '30d':
      hoursAgo = 24 * 30;
      break;
  }

  const timeAgo = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
  return timeAgo.toISOString();
}

