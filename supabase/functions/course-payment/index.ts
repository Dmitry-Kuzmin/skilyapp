// =========================================================
// course-payment — Edge Function для оплаты курса
// Actions:
//   rates          — получить живые курсы (Stars/USDT/TON/RUB)
//   stars_invoice  — создать Stars-инвойс через Telegram API
//   notify_manual  — уведомить админа о ручной оплате
// =========================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN        = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API     = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_CHAT_ID    = 488159880; // @guapo_pub

// 1 star = $0.013 по официальному курсу Telegram
const STARS_RATE = 1 / 0.013;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── Живые курсы ─────────────────────────────────────────
async function getRates(eurAmount: number) {
  const [fxRes, tonRes] = await Promise.allSettled([
    fetch('https://api.exchangerate-api.com/v4/latest/EUR').then(r => r.json()),
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=eur').then(r => r.json()),
  ]);

  const fx  = fxRes.status === 'fulfilled' ? fxRes.value : null;
  const ton = tonRes.status === 'fulfilled' ? tonRes.value : null;

  const usdRate  = fx?.rates?.USD  ?? 1.08;
  const rubRate  = fx?.rates?.RUB  ?? 100;
  const tonEur   = ton?.['the-open-network']?.eur ?? 5.0;

  return {
    stars : Math.ceil(eurAmount * usdRate * STARS_RATE),
    usdt  : +(eurAmount * usdRate * 1.02).toFixed(2),   // EUR→USDT + 2%
    ton   : +(eurAmount / tonEur * 1.02).toFixed(2),    // EUR→TON + 2%
    rub   : Math.ceil(eurAmount * rubRate * 1.05),      // ЦБ РФ + 5%
    rates : { usd: usdRate, rub: rubRate, ton_eur: tonEur },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // ── Курсы ──────────────────────────────────────────────
  if (action === 'rates') {
    const { eur_amount } = body;
    if (!eur_amount || eur_amount <= 0) return json({ error: 'eur_amount required' }, 400);
    const rates = await getRates(eur_amount);
    return json(rates);
  }

  // ── Stars invoice ──────────────────────────────────────
  if (action === 'stars_invoice') {
    const { eur_amount, tariff_id, tariff_label, stream_id, stream_label, telegram_id } = body;
    if (!eur_amount || !tariff_id || !telegram_id) return json({ error: 'Missing fields' }, 400);

    // Считаем stars по живому курсу
    const rates = await getRates(eur_amount);
    const stars = rates.stars;
    const payload = `course_${tariff_id}_${telegram_id}_${Date.now()}`;

    // Сохраняем pending
    await supabase.from('course_payments').insert({
      telegram_id,
      tariff_id,
      tariff_label,
      stream_id: stream_id || null,
      stream_label: stream_label || null,
      eur_amount,
      stars_amount: stars,
      payment_method: 'stars',
      status: 'pending',
      payload,
    });

    // Создаём ссылку на инвойс
    const res = await fetch(`${TELEGRAM_API}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Курс DGT — ${tariff_label}`,
        description: stream_label ? `${stream_label} · Теория вождения Испания` : 'Курс теории вождения DGT (Испания)',
        payload,
        currency: 'XTR',
        prices: [{ label: tariff_label, amount: stars }],
      }),
    });
    const data = await res.json();

    if (!data.ok) return json({ error: data.description }, 400);
    return json({ invoice_link: data.result, stars_amount: stars });
  }

  // ── Уведомление админа о ручной оплате ────────────────
  if (action === 'notify_manual') {
    const { telegram_id, telegram_username, tariff_label, stream_label, eur_amount, method } = body;

    const methodLabels: Record<string, string> = {
      rub   : 'Карта РФ / СБП',
      bizum : 'Bizum',
      usdt  : 'USDT (Крипто)',
      ton   : 'TON',
    };

    await supabase.from('course_payments').insert({
      telegram_id: telegram_id || 0,
      tariff_id: 'manual',
      tariff_label: tariff_label || '—',
      stream_label: stream_label || null,
      eur_amount: eur_amount || 0,
      payment_method: method,
      status: 'pending',
    }).catch(() => {});

    const text =
      `💰 <b>Запрос оплаты — ${methodLabels[method] || method}</b>\n\n` +
      `👤 ${telegram_username ? `@${telegram_username}` : `ID: ${telegram_id}`}\n` +
      `📌 Тариф: <b>${tariff_label}</b> · €${eur_amount}\n` +
      (stream_label ? `🗓 ${stream_label}\n` : '') +
      `\n<i>Ожидает подтверждения</i>`;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: 'HTML' }),
    });

    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
