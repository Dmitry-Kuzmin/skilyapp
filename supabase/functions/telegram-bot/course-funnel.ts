// =====================================================
// Воронка продаж курса DGT — Telegram Bot
// =====================================================
// Точки входа:
//   /start course   → полная квалификация (3 шага → тарифы → выбор даты → оплата)
//   /start buy_pro  → сразу тариф Pro → выбор даты → оплата
//   /start buy_vip  → сразу тариф VIP → выбор даты → оплата
//
// Callbacks:  course_s1_* | course_s2_* | course_buy_* |
//             course_stream_* | course_pay_* | course_doubt_* | course_show_basic
// =====================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const ADMIN_CHAT_ID = 488159880; // @guapo_pub
const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
export type CoursePlan = {
  id: string;
  label_ru: string;
  price_eur: number;
  original_price_eur: number | null;
  payment_link: string | null;
  format?: string;        // 'group' | 'mini_group' | 'individual'
  promo_label?: string;   // 'Акция старта -20%'
  promo_until?: string;   // ISO timestamp
  features?: string[];
};

export type CourseAddon = {
  addon_key: string;
  label: string;
  description: string | null;
  price_group: number;
  price_individual: number;
};

export type CourseStream = {
  id: string;
  number: number;
  start_date: string;       // ISO date: '2026-04-07'
  spots_total: number;
  spots_enrolled: number;
  status: string;           // 'open' | 'closed' | 'finished'
};

// Дефолты (fallback если БД недоступна)
const DEFAULT_PLANS: Record<string, CoursePlan> = {
  basic: { id: 'basic', label_ru: 'Только теория',       price_eur: 199, original_price_eur: 199, payment_link: null },
  pro:   { id: 'pro',   label_ru: 'С сопровождением 🚀', price_eur: 259, original_price_eur: 324, payment_link: null },
  vip:   { id: 'vip',   label_ru: 'VIP — Под ключ 👑',   price_eur: 349, original_price_eur: 437, payment_link: null },
};

const DEFAULT_STREAMS: CourseStream[] = [
  { id: 'fallback-1', number: 51, start_date: '2026-04-07', spots_total: 8, spots_enrolled: 4, status: 'open' },
  { id: 'fallback-2', number: 52, start_date: '2026-05-05', spots_total: 8, spots_enrolled: 0, status: 'open' },
];

// ─────────────────────────────────────────────────────
// Загрузка данных из БД
// ─────────────────────────────────────────────────────
export async function getCourseAddons(supabase: SupabaseClient): Promise<CourseAddon[]> {
  try {
    const { data, error } = await supabase
      .from('course_addons')
      .select('addon_key, label, description, price_group, price_individual')
      .eq('is_active', true)
      .order('sort_order');
    if (error || !data) return [];
    return data as CourseAddon[];
  } catch {
    return [];
  }
}

export async function getCoursePlans(supabase: SupabaseClient): Promise<Record<string, CoursePlan>> {
  try {
    const { data, error } = await supabase.from('course_plans').select('*').eq('active', true);
    if (error || !data || data.length === 0) return DEFAULT_PLANS;
    return data.reduce((acc: Record<string, CoursePlan>, p: CoursePlan) => {
      acc[p.id] = p;
      return acc;
    }, {});
  } catch {
    return DEFAULT_PLANS;
  }
}

export async function getOpenStreams(supabase: SupabaseClient, limit = 3): Promise<CourseStream[]> {
  try {
    const { data, error } = await supabase
      .from('course_streams')
      .select('id, number, start_date, spots_total, spots_enrolled, status')
      .eq('status', 'open')
      .order('start_date', { ascending: true })
      .limit(limit);
    if (error || !data || data.length === 0) return DEFAULT_STREAMS.slice(0, limit);
    return data as CourseStream[];
  } catch {
    return DEFAULT_STREAMS.slice(0, limit);
  }
}

// Следующий открытый поток (для кнопки главного меню)
export async function getNextStream(supabase: SupabaseClient): Promise<CourseStream | null> {
  const streams = await getOpenStreams(supabase, 1);
  return streams[0] || null;
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function formatStreamDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(d);
}

function streamLabel(s: CourseStream): string {
  const spotsLeft = s.spots_total - s.spots_enrolled;
  const spotsText = spotsLeft > 0 ? `${spotsLeft} из ${s.spots_total} мест` : '⚠️ Мест нет';
  return `Поток ${s.number} — ${formatStreamDate(s.start_date)} · ${spotsText}`;
}

async function send(chatId: number, text: string, replyMarkup?: unknown): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function edit(chatId: number, messageId: number, text: string, replyMarkup?: unknown): Promise<void> {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function upsertLead(
  supabase: SupabaseClient,
  telegramId: number,
  fields: {
    telegram_user?: string;
    first_name?: string;
    status?: string;
    plan_id?: string;
    stream_id?: string;
    qualification?: Record<string, string>;
    payment_method?: string;
    notes?: string;
  }
) {
  try {
    const { data: existing } = await supabase
      .from('course_leads')
      .select('id, qualification')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const updatedQual = fields.qualification
        ? { ...(existing.qualification || {}), ...fields.qualification }
        : undefined;
      await supabase.from('course_leads').update({
        ...fields,
        ...(updatedQual ? { qualification: updatedQual } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('course_leads').insert({ telegram_id: telegramId, ...fields });
    }
  } catch (e) {
    console.error('[CourseFunnel] upsertLead error:', e);
  }
}

async function notifyAdmin(text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

// Fire-and-forget: не блокирует воронку, не ломает при ошибке
function logBotEvent(
  supabase: SupabaseClient,
  telegramId: number,
  username: string | undefined,
  event: string,
  data?: Record<string, unknown>
): void {
  // 1. Supabase bot_events (для просмотра в дашборде)
  supabase.from('bot_events').insert({
    telegram_id: telegramId,
    username: username ?? null,
    event,
    data: data ?? null,
  }).then().catch(() => {});

  // 2. PostHog HTTP API (retention, funnels, cohorts)
  const posthogKey = Deno.env.get('POSTHOG_KEY');
  if (posthogKey) {
    fetch('https://eu.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event: `bot_${event}`,
        distinct_id: `tg_${telegramId}`,
        properties: {
          $lib: 'telegram-bot',
          telegram_id: telegramId,
          username: username ?? null,
          ...data,
        },
      }),
    }).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────
// Блок тарифов (используется в нескольких местах)
// ─────────────────────────────────────────────────────
function buildTariffsBlock(plans: Record<string, CoursePlan>, nextStream: CourseStream | null): { text: string; keyboard: unknown } {
  const pro   = plans.pro   || DEFAULT_PLANS.pro;
  const vip   = plans.vip   || DEFAULT_PLANS.vip;
  const basic = plans.basic || DEFAULT_PLANS.basic;

  const spotsLeft = nextStream ? nextStream.spots_total - nextStream.spots_enrolled : 4;
  const streamInfo = nextStream
    ? `🗓 Ближайший старт: <b>${formatStreamDate(nextStream.start_date)}</b>`
    : '';

  const discount = (p: CoursePlan) =>
    p.original_price_eur && p.original_price_eur > p.price_eur
      ? ` (<s>€${p.original_price_eur}</s> → <b>€${p.price_eur}</b>, экономия €${p.original_price_eur - p.price_eur})`
      : ` <b>€${p.price_eur}</b>`;

  const text =
    `⚠️ <b>Осталось ${spotsLeft} места из ${nextStream?.spots_total ?? 8}.</b>\n` +
    (streamInfo ? streamInfo + '\n' : '') + '\n' +

    `👑 <b>VIP — Под ключ</b>${discount(vip)}\n` +
    `Записываем в DGT за тебя + мини-курс испанского\n\n` +

    `🚀 <b>С сопровождением</b> — Хит потока${discount(pro)}\n` +
    `Курс + помощь с документами + испанский\n\n` +

    `💡 <i>Для сравнения: автошкола — €300–500 только за теорию.</i>\n` +
    `<i>Курс стоит меньше, чем штраф за езду без испанских прав.</i>\n\n` +
    `Готовься с нами — сдай с первого раза и сэкономь на автошколах, пошлинах и штрафах!`;

  return {
    text,
    keyboard: {
      inline_keyboard: [
        [{ text: `👑 VIP — €${vip.price_eur}`,                    callback_data: 'course_buy_vip' }],
        [{ text: `🚀 С сопровождением — €${pro.price_eur}`,       callback_data: 'course_buy_pro' }],
        [{ text: `📘 Показать базовый тариф (€${basic.price_eur})`, callback_data: 'course_show_basic' }],
      ],
    },
  };
}

// ─────────────────────────────────────────────────────
// Выбор даты потока (после выбора тарифа)
// ─────────────────────────────────────────────────────
async function buildStreamSelector(
  planId: string,
  supabase: SupabaseClient,
  firstName: string
): Promise<{ text: string; keyboard: unknown }> {
  const streams = await getOpenStreams(supabase, 3);

  const text =
    `📅 <b>Выбери дату старта, ${firstName}!</b>\n\n` +
    `Все потоки — одинаковая программа и преподаватель.\n` +
    `Разница только в дате первого занятия.\n\n` +
    streams.map((s) => {
      const left = s.spots_total - s.spots_enrolled;
      const bar = left > 0 ? `${'🟢'.repeat(Math.min(left, 5))}${'⚪'.repeat(Math.max(0, s.spots_total - left > 5 ? 0 : s.spots_total - left))}` : '';
      return `<b>Поток ${s.number}</b> — ${formatStreamDate(s.start_date)}\n${bar} ${left > 0 ? `${left} мест` : '<i>мест нет</i>'}`;
    }).join('\n\n');

  const keyboard = {
    inline_keyboard: [
      ...streams.map((s) => {
        const left = s.spots_total - s.spots_enrolled;
        const label = left > 0
          ? `Поток ${s.number} — ${formatStreamDate(s.start_date)} (${left} мест)`
          : `Поток ${s.number} — мест нет (лист ожидания)`;
        return [{ text: label, callback_data: `course_stream_${planId}_${s.id}` }];
      }),
      [{ text: '« Назад к тарифам', callback_data: 'course_back_tariffs' }],
    ],
  };

  return { text, keyboard };
}

// ─────────────────────────────────────────────────────
// Экран оплаты
// ─────────────────────────────────────────────────────
async function sendPaymentStep(
  chatId: number,
  messageId: number | null,
  firstName: string,
  plan: CoursePlan,
  stream: CourseStream,
  telegramId?: number,
  telegramUsername?: string
): Promise<void> {
  const text =
    `🎉 <b>Отличный выбор, ${firstName}!</b>\n\n` +
    `📌 Тариф: <b>${plan.label_ru}</b>\n` +
    `💶 К оплате: <b>€${plan.price_eur}</b>\n` +
    `🗓 Поток ${stream.number} — ${formatStreamDate(stream.start_date)}\n` +
    `🔒 Место забронировано на 24 часа\n\n` +
    `Выбери способ оплаты:`;

  // Строим URL виджета оплаты
  const streamLabel = `Поток ${stream.number} — ${formatStreamDate(stream.start_date)}`;
  const paymentUrl = new URL(`${MINI_APP_URL}/course-payment`);
  paymentUrl.searchParams.set('amount', String(plan.price_eur));
  paymentUrl.searchParams.set('tariff', plan.id);
  paymentUrl.searchParams.set('label', plan.label_ru);
  paymentUrl.searchParams.set('stream', stream.id);
  paymentUrl.searchParams.set('slabel', streamLabel);
  if (telegramId) paymentUrl.searchParams.set('uid', String(telegramId));
  if (telegramUsername) paymentUrl.searchParams.set('uname', telegramUsername);

  const keyboard = {
    inline_keyboard: [
      [{ text: '💳 Выбрать способ оплаты', web_app: { url: paymentUrl.toString() } }],
      [{ text: '« Назад к тарифам', callback_data: `course_buy_${plan.id}` }],
    ],
  };

  if (messageId) {
    await edit(chatId, messageId, text, keyboard);
  } else {
    await send(chatId, text, keyboard);
  }
}

// ─────────────────────────────────────────────────────
// Публичное: получить ярлык кнопки главного меню
// Вызывается из commands.ts при /start
// ─────────────────────────────────────────────────────
export async function getMenuCourseLabel(supabase: SupabaseClient): Promise<string> {
  try {
    const stream = await getNextStream(supabase);
    if (!stream) return '▶️ Курс теории DGT';
    const left = stream.spots_total - stream.spots_enrolled;
    return `▶️ Поток ${stream.number} · ${formatStreamDate(stream.start_date)} · ${left} мест`;
  } catch {
    return '▶️ Курс теории DGT';
  }
}

// ─────────────────────────────────────────────────────
// STEP 1: /start course — приветствие + вопрос о статусе
// ─────────────────────────────────────────────────────
export async function handleCourseStart(
  chatId: number,
  firstName: string,
  telegramId: number,
  telegramUser: string | undefined,
  supabase: SupabaseClient,
  messageId?: number
): Promise<void> {
  await upsertLead(supabase, telegramId, {
    first_name: firstName,
    telegram_user: telegramUser,
    status: 'new',
  });
  logBotEvent(supabase, telegramId, telegramUser, 'funnel_start', { via: messageId ? 'inline' : 'command' });

  const text =
    `🚗 <b>Привет, ${firstName}!</b>\n\n` +
    `Ты на правильном пути. Каждый месяц сотни русскоязычных в Испании пытаются сдать теорию DGT — и <b>каждый второй проваливается</b>.\n\n` +
    `Не потому что глупые. А потому что система DGT заточена под ошибки.\n\n` +
    `Но сперва уточни одну вещь.\n\n` +
    `👇 <b>У тебя есть легальный статус в Испании?</b>`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ Да — ВНЖ / резидент',  callback_data: 'course_s1_vnj' }],
      [{ text: '🎓 Студенческая виза',     callback_data: 'course_s1_visa' }],
      [{ text: '❓ Пока нет / не уверен',  callback_data: 'course_s1_unsure' }],
      [{ text: '← Главное меню',           callback_data: 'main_menu' }],
    ],
  };

  if (messageId) {
    await edit(chatId, messageId, text, keyboard);
  } else {
    await send(chatId, text, keyboard);
  }
}

// ─────────────────────────────────────────────────────
// Запись на индивидуальный формат (start=buy_mini / start=buy_individual)
// Запускает AI-чат, который подбирает удобное время
// ─────────────────────────────────────────────────────
export async function handleIndividualBookingStart(
  chatId: number,
  firstName: string,
  telegramId: number,
  telegramUser: string | undefined,
  planId: 'mini_group' | 'individual',
  supabase: SupabaseClient
): Promise<void> {
  const planLabels = {
    mini_group: 'Мини-группа (2–3 чел.) — €499',
    individual: 'Индивидуально — €799',
  };
  const planLabel = planLabels[planId];

  // Сохраняем лид
  await upsertLead(supabase, telegramId, {
    first_name: firstName,
    telegram_user: telegramUser,
    status: 'plan_selected',
    plan_id: planId,
  });

  // Включаем режим AI-поддержки для подбора времени
  const { data: profileData } = await supabase
    .from('profiles')
    .select('settings')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  const cur = (typeof profileData?.settings === 'object' && profileData?.settings) as Record<string, unknown> ?? {};
  await supabase.from('profiles').update({
    settings: { ...cur, course_support_mode: true },
  }).eq('telegram_id', telegramId);

  const name = firstName || 'друг';
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      parse_mode: 'HTML',
      text:
        `🎓 <b>${name}, отличный выбор!</b>\n\n` +
        `Ты выбрал формат: <b>${planLabel}</b>\n\n` +
        `Я помогу подобрать удобное время и дни занятий — это займёт буквально 2 минуты.\n\n` +
        `📅 <b>В какие дни недели тебе обычно удобно?</b>`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📅 Будни (пн–пт)', callback_data: 'ind_sched_weekdays' },
            { text: '🏖 Выходные (сб–вс)', callback_data: 'ind_sched_weekend' },
          ],
          [{ text: '📆 Любые дни', callback_data: 'ind_sched_any' }],
        ],
      },
    }),
  });
}

// ─────────────────────────────────────────────────────
// Прямая покупка (start=buy_pro / start=buy_vip)
// ─────────────────────────────────────────────────────
export async function handleCourseBuyDirect(
  chatId: number,
  firstName: string,
  telegramId: number,
  telegramUser: string | undefined,
  planId: 'basic' | 'pro' | 'vip',
  supabase: SupabaseClient
): Promise<void> {
  const [plans, streams] = await Promise.all([getCoursePlans(supabase), getOpenStreams(supabase, 3)]);
  const plan = plans[planId] || DEFAULT_PLANS[planId];

  await upsertLead(supabase, telegramId, {
    first_name: firstName,
    telegram_user: telegramUser,
    status: 'plan_selected',
    plan_id: planId,
  });

  // Если только 1 поток — сразу к оплате, иначе выбор даты
  if (streams.length === 1) {
    await sendPaymentStep(chatId, null, firstName, plan, streams[0], telegramId, telegramUser);
  } else {
    const { text, keyboard } = await buildStreamSelector(planId, supabase, firstName);
    await send(chatId, text, keyboard);
  }
}

// ─────────────────────────────────────────────────────
// Главный обработчик course_ callbacks
// ─────────────────────────────────────────────────────
export async function handleCourseCallback(
  data: string,
  chatId: number,
  messageId: number,
  telegramId: number,
  firstName: string,
  telegramUser: string | undefined,
  supabase: SupabaseClient
): Promise<void> {

  // ── Шаг 1: статус ──────────────────────────────────
  if (data === 'course_s1_vnj' || data === 'course_s1_visa') {
    const choice = data === 'course_s1_vnj' ? 'vnj' : 'visa';
    await upsertLead(supabase, telegramId, {
      status: 'qualified',
      qualification: { status_answer: choice },
    });
    logBotEvent(supabase, telegramId, telegramUser, 'step1_status', { choice });
    await edit(chatId, messageId,
      `✅ <b>Отлично!</b> Скажи честно — ты уже пробовал сдавать теорию DGT?`,
      { inline_keyboard: [
        [{ text: '🔴 Нет, начинаю с нуля',         callback_data: 'course_s2_new' }],
        [{ text: '🟡 Пробовал — не получилось',     callback_data: 'course_s2_failed' }],
        [{ text: '🔵 Хочу сдать как можно быстрее', callback_data: 'course_s2_fast' }],
        [{ text: '« Назад',                         callback_data: 'course_back_s1' }],
      ]}
    );
    return;
  }

  if (data === 'course_s1_unsure') {
    await upsertLead(supabase, telegramId, { status: 'qualified', qualification: { status_answer: 'unsure' } });
    logBotEvent(supabase, telegramId, telegramUser, 'step1_status', { choice: 'unsure' });
    await edit(chatId, messageId,
      `<b>Ничего страшного.</b>\n\n` +
      `Для сдачи теории DGT нужны: ВНЖ (NIE), студенческая виза или вид на жительство.\n\n` +
      `Каждый третий наш студент <b>начинает готовиться ДО оформления документов</b> — это разумно, процесс занимает время.\n\n` +
      `Скажи честно — ты уже пробовал сдавать теорию DGT?`,
      { inline_keyboard: [
        [{ text: '🔴 Нет, начинаю с нуля',         callback_data: 'course_s2_new' }],
        [{ text: '🟡 Пробовал — не получилось',     callback_data: 'course_s2_failed' }],
        [{ text: '🔵 Хочу сдать как можно быстрее', callback_data: 'course_s2_fast' }],
        [{ text: '« Назад',                         callback_data: 'course_back_s1' }],
      ]}
    );
    return;
  }

  // ── Возврат на шаг 1 ──────────────────────────────
  if (data === 'course_back_s1') {
    const text =
      `🚗 <b>Привет, ${firstName}!</b>\n\n` +
      `👇 <b>У тебя есть легальный статус в Испании?</b>`;
    await edit(chatId, messageId, text, {
      inline_keyboard: [
        [{ text: '✅ Да — ВНЖ / резидент',  callback_data: 'course_s1_vnj' }],
        [{ text: '🎓 Студенческая виза',     callback_data: 'course_s1_visa' }],
        [{ text: '❓ Пока нет / не уверен',  callback_data: 'course_s1_unsure' }],
        [{ text: '← Главное меню',           callback_data: 'main_menu' }],
      ],
    });
    return;
  }

  // ── Шаг 2: попытки → персональный текст + тарифы ──
  if (data === 'course_s2_new' || data === 'course_s2_failed' || data === 'course_s2_fast') {
    const attempt = data.replace('course_s2_', '');
    await upsertLead(supabase, telegramId, { qualification: { attempt_answer: attempt } });
    logBotEvent(supabase, telegramId, telegramUser, 'step2_attempt', { choice: attempt });

    const [plans, streams] = await Promise.all([getCoursePlans(supabase), getOpenStreams(supabase, 1)]);
    const { text: tariffsText, keyboard } = buildTariffsBlock(plans, streams[0] || null);

    let intro = '';
    if (data === 'course_s2_new') {
      intro = `📊 <b>${firstName}, немного статистики...</b>\n\nТе, кто готовятся самостоятельно, сдают в среднем за <b>2.7 попытки</b>.\nКаждая пересдача — €90 + потерянное время.\n\nНаши студенты: <b>9 из 10 сдают с первого раза.</b>\n\n`;
    } else if (data === 'course_s2_failed') {
      intro = `<b>Слушай, это не твоя вина.</b>\n\nDGT специально составляет вопросы-ловушки. Без системы — почти невозможно.\n\n<b>94% тех, кто провалился сам — сдали с нами.</b>\n\n`;
    } else {
      intro = `⚡ <b>Понял, без лишних слов.</b>\n\n6–8 недель. 2 эфира в неделю.\nБюрократию берём на себя. Ты только учишься и сдаёшь.\n\n`;
    }
    await edit(chatId, messageId, intro + tariffsText, keyboard);
    return;
  }

  // ── Показать базовый тариф ─────────────────────────
  if (data === 'course_show_basic') {
    const plans = await getCoursePlans(supabase);
    const basic = plans.basic || DEFAULT_PLANS.basic;
    const pro   = plans.pro   || DEFAULT_PLANS.pro;
    await edit(chatId, messageId,
      `📘 <b>Тариф «Только теория»</b> — <b>€${basic.price_eur}</b>\n\n` +
      `✅ 8 живых эфиров (записи навсегда)\n` +
      `✅ Платформа Skilyapp на 3 месяца\n` +
      `✅ 16 000+ вопросов с разбором\n` +
      `❌ Помощь с документами\n` +
      `❌ Мини-курс испанского\n\n` +
      `💡 <i>Разница с «С сопровождением» — всего €${pro.price_eur - basic.price_eur}. 87% студентов выбирают Pro.</i>`,
      { inline_keyboard: [
        [{ text: `📘 Выбрать базовый — €${basic.price_eur}`, callback_data: 'course_buy_basic' }],
        [{ text: `🚀 С сопровождением — €${pro.price_eur} (рекомендую)`, callback_data: 'course_buy_pro' }],
        [{ text: '« Назад к тарифам', callback_data: 'course_back_tariffs' }],
      ]}
    );
    return;
  }

  // ── Возврат к тарифам ──────────────────────────────
  if (data === 'course_back_tariffs') {
    const [plans, streams] = await Promise.all([getCoursePlans(supabase), getOpenStreams(supabase, 1)]);
    const { text, keyboard } = buildTariffsBlock(plans, streams[0] || null);
    await edit(chatId, messageId, text, keyboard);
    return;
  }

  // ── Выбор тарифа → выбор даты потока ──────────────
  if (data === 'course_buy_pro' || data === 'course_buy_vip' || data === 'course_buy_basic') {
    const planId = data.replace('course_buy_', '') as 'pro' | 'vip' | 'basic';
    await upsertLead(supabase, telegramId, { status: 'plan_selected', plan_id: planId });
    logBotEvent(supabase, telegramId, telegramUser, 'plan_selected', { plan: planId });

    const streams = await getOpenStreams(supabase, 3);
    if (streams.length === 1) {
      // Один поток — сразу к оплате
      const plans = await getCoursePlans(supabase);
      const plan = plans[planId] || DEFAULT_PLANS[planId];
      await upsertLead(supabase, telegramId, { stream_id: streams[0].id });
      await sendPaymentStep(chatId, messageId, firstName, plan, streams[0]);
    } else {
      // Несколько потоков — показываем выбор даты
      const { text, keyboard } = await buildStreamSelector(planId, supabase, firstName);
      await edit(chatId, messageId, text, keyboard);
    }
    return;
  }

  // ── Выбор конкретного потока → оплата ──────────────
  // callback_data: course_stream_{planId}_{streamId}
  if (data.startsWith('course_stream_')) {
    const parts = data.split('_'); // ['course', 'stream', planId, streamId]
    // planId и streamId могут содержать uuid с дефисами, поэтому берём по-другому
    const withoutPrefix = data.replace('course_stream_', ''); // "pro_uuid-here"
    const firstUnder = withoutPrefix.indexOf('_');
    const planId = withoutPrefix.substring(0, firstUnder);
    const streamId = withoutPrefix.substring(firstUnder + 1);

    const [plans, streams] = await Promise.all([
      getCoursePlans(supabase),
      getOpenStreams(supabase, 3),
    ]);
    const plan = plans[planId] || DEFAULT_PLANS[planId as keyof typeof DEFAULT_PLANS];
    const stream = streams.find((s) => s.id === streamId) || streams[0];

    if (!stream) {
      await edit(chatId, messageId, '⚠️ Поток не найден. Попробуй позже.', undefined);
      return;
    }

    await upsertLead(supabase, telegramId, { stream_id: streamId });
    logBotEvent(supabase, telegramId, telegramUser, 'stream_selected', { plan: planId, stream: stream.number });
    await sendPaymentStep(chatId, messageId, firstName, plan, stream);
    return;
  }

  // ── Оплата: карта ──────────────────────────────────
  if (data.startsWith('course_pay_card_')) {
    const planId = data.replace('course_pay_card_', '');
    const plans = await getCoursePlans(supabase);
    const plan = plans[planId] || DEFAULT_PLANS[planId as keyof typeof DEFAULT_PLANS];
    await upsertLead(supabase, telegramId, { payment_method: 'card' });
    logBotEvent(supabase, telegramId, telegramUser, 'payment_method_selected', { plan: planId, method: 'card', amount: plan?.price_eur });

    if (plan?.payment_link) {
      await edit(chatId, messageId,
        `💳 <b>Оплата картой (Paddle)</b>\n\nНажми кнопку — откроется безопасная страница оплаты.\n\nПосле оплаты ты сразу получишь доступ. 🎉`,
        { inline_keyboard: [
          [{ text: `💳 Перейти к оплате €${plan.price_eur}`, url: plan.payment_link }],
          [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
        ]}
      );
    } else {
      await edit(chatId, messageId,
        `💳 <b>Оплата картой</b>\n\nНапиши нам — пришлём ссылку на оплату:\n\n👉 <a href="https://t.me/SkilySupport">@SkilySupport</a>\n\nУкажи тариф: <b>${plan?.label_ru || planId}</b>`,
        { inline_keyboard: [
          [{ text: '💬 Написать в поддержку', url: 'https://t.me/SkilySupport' }],
          [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
        ]}
      );
      await notifyAdmin(
        `💳 <b>Запрос оплаты картой</b>\n` +
        `👤 ${firstName}${telegramUser ? ` @${telegramUser}` : ''}\n` +
        `📋 Тариф: ${plan?.label_ru || planId} · €${plan?.price_eur || '?'}\n` +
        `<i>Paddle link не настроен — нужно написать вручную</i>`
      );
    }
    return;
  }

  // ── Оплата: карта РФ / СБП ────────────────────────
  if (data.startsWith('course_pay_rub_')) {
    const planId = data.replace('course_pay_rub_', '');
    const plans = await getCoursePlans(supabase);
    const plan = plans[planId] || DEFAULT_PLANS[planId as keyof typeof DEFAULT_PLANS];
    await upsertLead(supabase, telegramId, { payment_method: 'rub' });
    logBotEvent(supabase, telegramId, telegramUser, 'payment_method_selected', { plan: planId, method: 'rub', amount: plan?.price_eur });

    await edit(chatId, messageId,
      `🇷🇺 <b>Оплата картой РФ / СБП</b>\n\nНапиши нашему менеджеру — пришлёт реквизиты в течение нескольких минут:\n\n👉 <a href="https://t.me/SkilySupport">@SkilySupport</a>\n\nУкажи тариф: <b>${plan?.label_ru || planId}</b>`,
      { inline_keyboard: [
        [{ text: '🇷🇺 Написать менеджеру', url: 'https://t.me/SkilySupport' }],
        [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
      ]}
    );
    await notifyAdmin(
      `🇷🇺 <b>Запрос оплаты РФ/СБП</b>\n` +
      `👤 ${firstName}${telegramUser ? ` @${telegramUser}` : ''}\n` +
      `📋 ${plan?.label_ru || planId} · €${plan?.price_eur || '?'}\n` +
      `✍️ ${telegramUser ? `t.me/${telegramUser}` : `tg_id: ${telegramId}`}`
    );
    return;
  }

  // ── Оплата: крипто ────────────────────────────────
  if (data.startsWith('course_pay_crypto_')) {
    const planId = data.replace('course_pay_crypto_', '');
    const plans = await getCoursePlans(supabase);
    const plan = plans[planId] || DEFAULT_PLANS[planId as keyof typeof DEFAULT_PLANS];
    await upsertLead(supabase, telegramId, { payment_method: 'crypto' });
    logBotEvent(supabase, telegramId, telegramUser, 'payment_method_selected', { plan: planId, method: 'crypto', amount: plan?.price_eur });

    await edit(chatId, messageId,
      `💎 <b>Оплата криптовалютой (USDT / TON)</b>\n\nНапиши нам — пришлём адрес кошелька:\n\n👉 <a href="https://t.me/SkilySupport">@SkilySupport</a>\n\nУкажи тариф: <b>${plan?.label_ru || planId}</b>`,
      { inline_keyboard: [
        [{ text: '💎 Написать для крипто-оплаты', url: 'https://t.me/SkilySupport' }],
        [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
      ]}
    );
    await notifyAdmin(
      `💎 <b>Крипто-оплата</b>\n` +
      `👤 ${firstName}${telegramUser ? ` @${telegramUser}` : ''}\n` +
      `📋 ${plan?.label_ru || planId} · €${plan?.price_eur || '?'}\n` +
      `✍️ ${telegramUser ? `t.me/${telegramUser}` : `tg_id: ${telegramId}`}`
    );
    return;
  }

  // ── Помощь с оплатой ──────────────────────────────
  if (data.startsWith('course_pay_help_')) {
    const planId = data.replace('course_pay_help_', '');
    await edit(chatId, messageId,
      `❓ <b>Помогу разобраться!</b>\n\nЧто именно не получается?`,
      { inline_keyboard: [
        [{ text: '💳 Карта не проходит',   callback_data: `course_pay_card_fail_${planId}` }],
        [{ text: '💸 Кажется дорого',       callback_data: `course_doubt_expensive_${planId}` }],
        [{ text: '🤔 Ещё думаю',            callback_data: `course_doubt_think_${planId}` }],
        [{ text: '« Назад',                 callback_data: `course_buy_${planId}` }],
      ]}
    );
    return;
  }

  // ── Карта не проходит ─────────────────────────────
  if (data.startsWith('course_pay_card_fail_')) {
    const planId = data.replace('course_pay_card_fail_', '');
    await edit(chatId, messageId,
      `💳 <b>Карта не проходит?</b>\n\nПопробуй другой способ:\n• Карта РФ / СБП\n• Крипто (USDT / TON)\n\nИли просто напиши: <a href="https://t.me/SkilySupport">@SkilySupport</a>`,
      { inline_keyboard: [
        [{ text: '🇷🇺 Карта РФ / СБП',      callback_data: `course_pay_rub_${planId}` }],
        [{ text: '💎 Крипто',                callback_data: `course_pay_crypto_${planId}` }],
        [{ text: '💬 Написать в поддержку', url: 'https://t.me/SkilySupport' }],
      ]}
    );
    return;
  }

  // ── Дорого ────────────────────────────────────────
  if (data.startsWith('course_doubt_expensive_')) {
    const planId = data.replace('course_doubt_expensive_', '');
    const plans = await getCoursePlans(supabase);
    const plan = plans[planId] || DEFAULT_PLANS[planId as keyof typeof DEFAULT_PLANS];
    const price = plan?.price_eur || 259;
    await edit(chatId, messageId,
      `💡 <b>Давай посчитаем.</b>\n\n` +
      `🏫 Автошкола в Испании:\n   €300–500 только за теорию\n   + €90 за каждую пересдачу\n\n` +
      `🎯 Skilyapp — €${price}, и ты сдаёшь <b>с первого раза.</b>\n\n` +
      `Это не расход — это инвестиция. 🚗\n\n` +
      `<i>Кстати: штраф за езду без испанских прав — от €200 до €500. Курс уже окупается.</i>`,
      { inline_keyboard: [
        [{ text: `✅ Убедил — записаться за €${price}`, callback_data: `course_buy_${planId}` }],
        [{ text: '🤔 Всё равно нужно подумать',         callback_data: `course_doubt_think_${planId}` }],
      ]}
    );
    return;
  }

  // ── Нужно подумать ────────────────────────────────
  if (data.startsWith('course_doubt_think_')) {
    const planId = data.replace('course_doubt_think_', '');
    await upsertLead(supabase, telegramId, { status: 'thinking', notes: 'Сказал "нужно подумать"' });
    await edit(chatId, messageId,
      `👍 <b>Понял, никакого давления.</b>\n\nНапиши <b>«Курс»</b> когда будешь готов — продолжим с того же места.\n\nА пока — попробуй бесплатный демо-тест на платформе 👇`,
      { inline_keyboard: [
        [{ text: '🚀 Попробовать бесплатно', url: 'https://skilyapp.com' }],
        [{ text: `↩️ Вернуться к тарифу`,   callback_data: `course_buy_${planId}` }],
      ]}
    );
    await notifyAdmin(
      `🤔 <b>Лид думает</b>\n` +
      `👤 ${firstName}${telegramUser ? ` @${telegramUser}` : ''} · тариф: ${planId}\n` +
      `<i>Дожим через 24ч</i>`
    );
    return;
  }
}
