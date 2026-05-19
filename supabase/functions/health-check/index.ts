// ============================================================
// health-check — мониторинг продакшн БД и Edge Functions.
// ============================================================
// Запускается cron-ом (см. .github/workflows/health-check.yml) каждые 15 минут.
// При деградации шлёт алерт в Telegram админу.
//
// Проверки:
//   - DB writable: insert + delete в test_sessions
//   - Read latency: SELECT 1 из profiles
//   - RPC reachable: check_ai_usage_limit (no-op для системного uuid)
//   - Edge functions: test-manager OPTIONS должен отвечать 200
//
// Алерт уходит только при FAILED (не на каждом запуске).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const ADMIN_CHAT_ID = Deno.env.get('HEALTH_ALERT_CHAT_ID') ?? ''; // куда слать алерты

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CheckResult = {
  name: string;
  ok: boolean;
  ms: number;
  details?: string;
};

async function timeIt<T>(fn: () => Promise<T>): Promise<{ result?: T; error?: Error; ms: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { result, ms: Date.now() - start };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)), ms: Date.now() - start };
  }
}

async function sendTelegramAlert(text: string): Promise<void> {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.warn('[health-check] BOT_TOKEN or ADMIN_CHAT_ID missing — skipping alert');
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error('[health-check] Telegram alert failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[health-check] sendTelegramAlert error:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const checks: CheckResult[] = [];

  // 1. DB read latency
  {
    const { error, ms } = await timeIt(async () => {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
      if (error) throw error;
    });
    checks.push({
      name: 'db_read',
      ok: !error && ms < 2000,
      ms,
      details: error ? error.message : ms > 2000 ? `slow: ${ms}ms` : undefined,
    });
  }

  // 2. DB writable: insert+delete тестовая запись в api_rate_log (она для этого и нужна)
  {
    const { error, ms } = await timeIt(async () => {
      const { error: insErr } = await supabase
        .from('api_rate_log')
        .insert({ action: '__health_check__', ip_hash: 'health' });
      if (insErr) throw insErr;
      await supabase.from('api_rate_log').delete().eq('action', '__health_check__');
    });
    checks.push({
      name: 'db_write',
      ok: !error && ms < 3000,
      ms,
      details: error ? error.message : ms > 3000 ? `slow: ${ms}ms` : undefined,
    });
  }

  // 3. RPC reachable
  {
    const { error, ms } = await timeIt(async () => {
      // Безопасная RPC которая ничего не меняет, просто SELECT
      const { error } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
      });
      // ошибка функции это OK если она просто вернёт 0 — нам важно что RPC отвечает
      if (error && !error.message.toLowerCase().includes('not found')) throw error;
    });
    checks.push({
      name: 'rpc',
      ok: !error,
      ms,
      details: error?.message,
    });
  }

  // 4. test-manager Edge Function liveness
  {
    const { error, ms } = await timeIt(async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/test-manager`, {
        method: 'OPTIONS',
      });
      if (!res.ok && res.status !== 200) throw new Error(`status ${res.status}`);
    });
    checks.push({
      name: 'edge_test_manager',
      ok: !error && ms < 3000,
      ms,
      details: error?.message,
    });
  }

  // Сводка
  const failed = checks.filter((c) => !c.ok);
  const isHealthy = failed.length === 0;
  const totalMs = checks.reduce((a, c) => a + c.ms, 0);

  // Алертим только при FAILED
  if (!isHealthy) {
    const summary = failed.map((c) => `❌ <b>${c.name}</b> (${c.ms}ms) — ${c.details ?? 'failed'}`).join('\n');
    await sendTelegramAlert(
      `🚨 <b>Skily Health Alert</b>\n\n${summary}\n\n<i>Total ${totalMs}ms, ${failed.length}/${checks.length} failed</i>`
    );
  }

  return new Response(
    JSON.stringify({
      healthy: isHealthy,
      total_ms: totalMs,
      checks,
      checked_at: new Date().toISOString(),
    }),
    {
      status: isHealthy ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
