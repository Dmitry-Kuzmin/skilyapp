// =====================================================
// Воронка продаж курса DGT — Telegram Bot
// =====================================================
// Точки входа:
//   /start course   → полная квалификация (3 шага → тарифы → оплата)
//   /start buy_pro  → сразу тариф Pro → оплата
//   /start buy_vip  → сразу тариф VIP → оплата
//
// Callbacks обрабатываются в index.ts через handleCourseCallback()
// =====================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const ADMIN_CHAT_ID = 488159880; // @guapo_pub

// Дефолтные тарифы (если таблица course_plans недоступна)
const DEFAULT_PLANS: Record<string, CoursePlan> = {
  basic: { id: 'basic', label_ru: 'Только теория',       price_eur: 199, original_price_eur: 199, stripe_link: null },
  pro:   { id: 'pro',   label_ru: 'С сопровождением 🚀', price_eur: 259, original_price_eur: 324, stripe_link: null },
  vip:   { id: 'vip',   label_ru: 'VIP — Под ключ 👑',   price_eur: 349, original_price_eur: 437, stripe_link: null },
};

export type CoursePlan = {
  id: string;
  label_ru: string;
  price_eur: number;
  original_price_eur: number | null;
  payment_link: string | null;
};

// ─────────────────────────────────────────────────────
// Загрузка тарифов из БД (с fallback на defaults)
// ─────────────────────────────────────────────────────
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

// Загрузка одного конфиг-значения
async function getCourseConfig(supabase: SupabaseClient, key: string, fallback: string): Promise<string> {
  try {
    const { data } = await supabase.from('course_config').select('value').eq('key', key).maybeSingle();
    return data?.value || fallback;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
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

// Сохранить/обновить лид
async function upsertLead(
  supabase: SupabaseClient,
  telegramId: number,
  fields: {
    telegram_user?: string;
    first_name?: string;
    status?: string;
    plan_id?: string;
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
      await supabase.from('course_leads').insert({
        telegram_id: telegramId,
        ...fields,
      });
    }
  } catch (e) {
    console.error('[CourseFunnel] upsertLead error:', e);
  }
}

// Уведомление администратора
async function notifyAdmin(text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────
// Блок тарифов (используется в нескольких местах)
// ─────────────────────────────────────────────────────
function buildTariffsBlock(plans: Record<string, CoursePlan>, streamDate: string, spotsLeft: string): { text: string; keyboard: unknown } {
  const pro = plans.pro || DEFAULT_PLANS.pro;
  const vip = plans.vip || DEFAULT_PLANS.vip;
  const basic = plans.basic || DEFAULT_PLANS.basic;

  const discount = (p: CoursePlan) =>
    p.original_price_eur && p.original_price_eur > p.price_eur
      ? ` (<s>€${p.original_price_eur}</s> → <b>€${p.price_eur}</b>, экономия €${p.original_price_eur - p.price_eur})`
      : ` <b>€${p.price_eur}</b>`;

  const text =
    `⚠️ <b>В этом потоке осталось ${spotsLeft} места из 8.</b>\n` +
    `🗓 Старт: <b>${streamDate}</b>\n\n` +

    `👑 <b>VIP — Под ключ</b>${discount(vip)}\n` +
    `Записываем в DGT за тебя + мини-курс испанского для водителей\n\n` +

    `🚀 <b>С сопровождением</b> — Хит потока${discount(pro)}\n` +
    `Курс + помощь с документами + испанский\n\n` +

    `💡 <i>Для сравнения: автошкола в Испании — €300–500 только за теорию.</i>\n` +
    `<i>Курс стоит меньше, чем штраф за езду без испанского водительского удостоверения.</i>\n\n` +

    `Готовься с нами — сдай с первого раза и сэкономь на автошколах, пошлинах и штрафах!`;

  const keyboard = {
    inline_keyboard: [
      [{ text: `👑 VIP — €${vip.price_eur}`, callback_data: 'course_buy_vip' }],
      [{ text: `🚀 С сопровождением — €${pro.price_eur}`, callback_data: 'course_buy_pro' }],
      [{ text: `📘 Показать базовый тариф (€${basic.price_eur})`, callback_data: 'course_show_basic' }],
    ],
  };

  return { text, keyboard };
}

// ─────────────────────────────────────────────────────
// STEP 1: Приветствие + вопрос о статусе
// Вызывается из handleStart при start=course
// ─────────────────────────────────────────────────────
export async function handleCourseStart(
  chatId: number,
  firstName: string,
  telegramId: number,
  telegramUser: string | undefined,
  supabase: SupabaseClient
): Promise<void> {
  await upsertLead(supabase, telegramId, {
    first_name: firstName,
    telegram_user: telegramUser,
    status: 'new',
  });

  const text =
    `🚗 <b>Привет, ${firstName}!</b>\n\n` +
    `Ты на правильном пути. Каждый месяц сотни русскоязычных в Испании пытаются сдать теорию DGT — и <b>каждый второй проваливается</b>.\n\n` +
    `Не потому что глупые. А потому что система DGT заточена под ошибки.\n\n` +
    `Но сперва мне нужно уточнить одну вещь.\n\n` +
    `👇 <b>У тебя есть легальный статус в Испании?</b>`;

  await send(chatId, text, {
    inline_keyboard: [
      [{ text: '✅ Да — ВНЖ / резидент',       callback_data: 'course_s1_vnj' }],
      [{ text: '🎓 Студенческая виза',          callback_data: 'course_s1_visa' }],
      [{ text: '❓ Пока нет / не уверен',       callback_data: 'course_s1_unsure' }],
    ],
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
  planId: 'pro' | 'vip',
  supabase: SupabaseClient
): Promise<void> {
  const plans = await getCoursePlans(supabase);
  const streamDate = await getCourseConfig(supabase, 'next_stream_date', '7 апреля 2026');
  const plan = plans[planId] || DEFAULT_PLANS[planId];

  await upsertLead(supabase, telegramId, {
    first_name: firstName,
    telegram_user: telegramUser,
    status: 'plan_selected',
    plan_id: planId,
  });

  await sendPaymentStep(chatId, firstName, plan, streamDate);
}

// ─────────────────────────────────────────────────────
// Экран оплаты (общий)
// ─────────────────────────────────────────────────────
async function sendPaymentStep(
  chatId: number,
  firstName: string,
  plan: CoursePlan,
  streamDate: string
): Promise<void> {
  const text =
    `🎉 <b>Отличный выбор, ${firstName}!</b>\n\n` +
    `📌 Тариф: <b>${plan.label_ru}</b>\n` +
    `💶 К оплате: <b>€${plan.price_eur}</b>\n` +
    `🗓 Старт: <b>${streamDate}</b>\n` +
    `🔒 Место забронировано на 24 часа\n\n` +
    `Выбери способ оплаты:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💳 Карта (Visa / Mastercard)',    callback_data: `course_pay_card_${plan.id}` }],
      [{ text: '🇷🇺 Карта РФ / СБП',              callback_data: `course_pay_rub_${plan.id}` }],
      [{ text: '💎 Крипто (USDT / TON)',           callback_data: `course_pay_crypto_${plan.id}` }],
      [{ text: '❓ Помогите с оплатой',            callback_data: `course_pay_help_${plan.id}` }],
    ],
  };

  await send(chatId, text, keyboard);
}

// ─────────────────────────────────────────────────────
// Главный обработчик всех course_ callbacks
// Вызывается из handleCallbackQuery в index.ts
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
    await upsertLead(supabase, telegramId, {
      status: 'qualified',
      qualification: { status_answer: data === 'course_s1_vnj' ? 'vnj' : 'visa' },
    });
    await edit(chatId, messageId,
      `✅ <b>Отлично!</b> Скажи честно — ты уже пробовал сдавать теорию DGT?`,
      {
        inline_keyboard: [
          [{ text: '🔴 Нет, начинаю с нуля',              callback_data: 'course_s2_new' }],
          [{ text: '🟡 Пробовал — не получилось',          callback_data: 'course_s2_failed' }],
          [{ text: '🔵 Хочу сдать как можно быстрее',      callback_data: 'course_s2_fast' }],
        ],
      }
    );
    return;
  }

  if (data === 'course_s1_unsure') {
    await upsertLead(supabase, telegramId, { status: 'qualified', qualification: { status_answer: 'unsure' } });
    await edit(chatId, messageId,
      `<b>Ничего страшного.</b>\n\n` +
      `Для сдачи теории DGT нужны: ВНЖ (NIE), студенческая виза или вид на жительство.\n\n` +
      `Каждый третий наш студент <b>начинает готовиться ДО оформления документов</b> — это разумно, ведь процесс занимает время.\n\n` +
      `Скажи честно — ты уже пробовал сдавать теорию DGT?`,
      {
        inline_keyboard: [
          [{ text: '🔴 Нет, начинаю с нуля',         callback_data: 'course_s2_new' }],
          [{ text: '🟡 Пробовал — не получилось',     callback_data: 'course_s2_failed' }],
          [{ text: '🔵 Хочу сдать как можно быстрее', callback_data: 'course_s2_fast' }],
        ],
      }
    );
    return;
  }

  // ── Шаг 2: попытки → персональный сценарий + тарифы ─
  if (data === 'course_s2_new' || data === 'course_s2_failed' || data === 'course_s2_fast') {
    await upsertLead(supabase, telegramId, { qualification: { attempt_answer: data.replace('course_s2_', '') } });

    const plans = await getCoursePlans(supabase);
    const streamDate = await getCourseConfig(supabase, 'next_stream_date', '7 апреля 2026');
    const spotsLeft = await getCourseConfig(supabase, 'spots_remaining', '4');
    const { text: tariffsText, keyboard } = buildTariffsBlock(plans, streamDate, spotsLeft);

    let intro = '';
    if (data === 'course_s2_new') {
      intro =
        `📊 <b>${firstName}, немного статистики...</b>\n\n` +
        `Те, кто готовятся самостоятельно, сдают в среднем за <b>2.7 попытки</b>.\n` +
        `Каждая пересдача — €90 + потерянное время.\n\n` +
        `Наши студенты: <b>9 из 10 сдают с первого раза.</b>\n\n`;
    } else if (data === 'course_s2_failed') {
      intro =
        `<b>Слушай, это не твоя вина.</b>\n\n` +
        `DGT специально составляет вопросы-ловушки. Без правильной системы — почти невозможно.\n\n` +
        `<b>94% тех, кто провалился самостоятельно — сдали с нами.</b>\n\n`;
    } else {
      intro =
        `⚡ <b>Понял, без лишних слов.</b>\n\n` +
        `6–8 недель. 2 эфира в неделю.\n` +
        `Бюрократию берём на себя. Ты только учишься и сдаёшь.\n\n`;
    }

    await edit(chatId, messageId, intro + tariffsText, keyboard);
    return;
  }

  // ── Показать базовый тариф ────────────────────────
  if (data === 'course_show_basic') {
    const plans = await getCoursePlans(supabase);
    const basic = plans.basic || DEFAULT_PLANS.basic;
    const pro = plans.pro || DEFAULT_PLANS.pro;
    const proExtra = pro.price_eur - basic.price_eur;

    await edit(chatId, messageId,
      `📘 <b>Тариф «Только теория»</b> — <b>€${basic.price_eur}</b>\n\n` +
      `Что включено:\n` +
      `✅ 8 живых эфиров (записи навсегда)\n` +
      `✅ Платформа Skilyapp на 3 месяца\n` +
      `✅ 16 000+ вопросов с разбором\n` +
      `✅ Эмуляция реального экзамена\n` +
      `❌ Помощь с документами\n` +
      `❌ Мини-курс испанского\n\n` +
      `💡 <i>Разница с «С сопровождением» — всего €${proExtra}. 87% студентов выбирают Pro.</i>`,
      {
        inline_keyboard: [
          [{ text: `📘 Выбрать базовый — €${basic.price_eur}`, callback_data: 'course_buy_basic' }],
          [{ text: `🚀 С сопровождением — €${pro.price_eur} (рекомендую)`, callback_data: 'course_buy_pro' }],
          [{ text: '« Назад к тарифам', callback_data: 'course_back_tariffs' }],
        ],
      }
    );
    return;
  }

  // ── Возврат к тарифам ─────────────────────────────
  if (data === 'course_back_tariffs') {
    const plans = await getCoursePlans(supabase);
    const streamDate = await getCourseConfig(supabase, 'next_stream_date', '7 апреля 2026');
    const spotsLeft = await getCourseConfig(supabase, 'spots_remaining', '4');
    const { text, keyboard } = buildTariffsBlock(plans, streamDate, spotsLeft);
    await edit(chatId, messageId, text, keyboard);
    return;
  }

  // ── Выбор тарифа → экран оплаты ──────────────────
  if (data === 'course_buy_pro' || data === 'course_buy_vip' || data === 'course_buy_basic') {
    const planId = data.replace('course_buy_', '') as 'pro' | 'vip' | 'basic';
    const plans = await getCoursePlans(supabase);
    const streamDate = await getCourseConfig(supabase, 'next_stream_date', '7 апреля 2026');
    const plan = plans[planId] || DEFAULT_PLANS[planId];

    await upsertLead(supabase, telegramId, { status: 'plan_selected', plan_id: planId });

    const text =
      `🎉 <b>Отличный выбор, ${firstName}!</b>\n\n` +
      `📌 Тариф: <b>${plan.label_ru}</b>\n` +
      `💶 К оплате: <b>€${plan.price_eur}</b>\n` +
      `🗓 Старт: <b>${streamDate}</b>\n` +
      `🔒 Место забронировано на 24 часа\n\n` +
      `Выбери способ оплаты:`;

    await edit(chatId, messageId, text, {
      inline_keyboard: [
        [{ text: '💳 Карта (Visa / Mastercard)',  callback_data: `course_pay_card_${planId}` }],
        [{ text: '🇷🇺 Карта РФ / СБП',            callback_data: `course_pay_rub_${planId}` }],
        [{ text: '💎 Крипто (USDT / TON)',         callback_data: `course_pay_crypto_${planId}` }],
        [{ text: '❓ Помогите с оплатой',          callback_data: `course_pay_help_${planId}` }],
      ],
    });
    return;
  }

  // ── Оплата: карта ─────────────────────────────────
  if (data.startsWith('course_pay_card_')) {
    const planId = data.replace('course_pay_card_', '');
    const plans = await getCoursePlans(supabase);
    const plan = plans[planId] || DEFAULT_PLANS[planId as keyof typeof DEFAULT_PLANS];

    await upsertLead(supabase, telegramId, { payment_method: 'card' });

    if (plan?.stripe_link) {
      await edit(chatId, messageId,
        `💳 <b>Оплата картой</b>\n\nНажми кнопку ниже — откроется безопасная страница оплаты Stripe.\n\n` +
        `После оплаты ты сразу получишь доступ к платформе. 🎉`,
        {
          inline_keyboard: [
            [{ text: `💳 Перейти к оплате €${plan.price_eur}`, url: plan.stripe_link }],
            [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
          ],
        }
      );
    } else {
      // Stripe link ещё не настроен — пишем через менеджера
      await edit(chatId, messageId,
        `💳 <b>Оплата картой</b>\n\n` +
        `Напиши нам — пришлём ссылку на оплату прямо сейчас:\n\n` +
        `👉 <a href="https://t.me/SkilySupport">@SkilySupport</a>\n\n` +
        `Укажи тариф: <b>${plan?.label_ru || planId}</b>`,
        {
          inline_keyboard: [
            [{ text: '💬 Написать в поддержку', url: 'https://t.me/SkilySupport' }],
            [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
          ],
        }
      );
      await notifyAdmin(
        `💳 <b>Запрос оплаты картой</b>\n` +
        `👤 ${firstName}${telegramUser ? ` @${telegramUser}` : ''}\n` +
        `📋 Тариф: ${plan?.label_ru || planId}\n` +
        `💶 Сумма: €${plan?.price_eur || '?'}\n\n` +
        `<i>Stripe link не настроен — нужно написать вручную</i>`
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

    await edit(chatId, messageId,
      `🇷🇺 <b>Оплата картой РФ / СБП</b>\n\n` +
      `Напиши нашему менеджеру — он пришлёт реквизиты в течение нескольких минут:\n\n` +
      `👉 <a href="https://t.me/SkilySupport">@SkilySupport</a>\n\n` +
      `Укажи тариф: <b>${plan?.label_ru || planId}</b>`,
      {
        inline_keyboard: [
          [{ text: '🇷🇺 Написать менеджеру', url: 'https://t.me/SkilySupport' }],
          [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
        ],
      }
    );

    await notifyAdmin(
      `🇷🇺 <b>Запрос оплаты РФ/СБП</b>\n` +
      `👤 ${firstName}${telegramUser ? ` @${telegramUser}` : ''}\n` +
      `📋 Тариф: ${plan?.label_ru || planId}\n` +
      `💶 Сумма: €${plan?.price_eur || '?'}\n\n` +
      `✍️ Нужно написать вручную: ${telegramUser ? `t.me/${telegramUser}` : `telegram_id: ${telegramId}`}`
    );
    return;
  }

  // ── Оплата: крипто ────────────────────────────────
  if (data.startsWith('course_pay_crypto_')) {
    const planId = data.replace('course_pay_crypto_', '');
    const plans = await getCoursePlans(supabase);
    const plan = plans[planId] || DEFAULT_PLANS[planId as keyof typeof DEFAULT_PLANS];

    await upsertLead(supabase, telegramId, { payment_method: 'crypto' });

    await edit(chatId, messageId,
      `💎 <b>Оплата криптовалютой (USDT / TON)</b>\n\n` +
      `Напиши нам — пришлём адрес кошелька и сумму:\n\n` +
      `👉 <a href="https://t.me/SkilySupport">@SkilySupport</a>\n\n` +
      `Укажи тариф: <b>${plan?.label_ru || planId}</b>`,
      {
        inline_keyboard: [
          [{ text: '💎 Написать для крипто-оплаты', url: 'https://t.me/SkilySupport' }],
          [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
        ],
      }
    );

    await notifyAdmin(
      `💎 <b>Запрос крипто-оплаты</b>\n` +
      `👤 ${firstName}${telegramUser ? ` @${telegramUser}` : ''}\n` +
      `📋 Тариф: ${plan?.label_ru || planId}\n` +
      `💶 Сумма: €${plan?.price_eur || '?'}\n\n` +
      `✍️ Нужно написать: ${telegramUser ? `t.me/${telegramUser}` : `telegram_id: ${telegramId}`}`
    );
    return;
  }

  // ── Помощь с оплатой ─────────────────────────────
  if (data.startsWith('course_pay_help_')) {
    const planId = data.replace('course_pay_help_', '');
    await edit(chatId, messageId,
      `❓ <b>Помогу разобраться!</b>\n\nЧто именно не получается?`,
      {
        inline_keyboard: [
          [{ text: '💳 Карта не проходит',       callback_data: `course_pay_card_fail_${planId}` }],
          [{ text: '💸 Кажется дорого',           callback_data: `course_doubt_expensive_${planId}` }],
          [{ text: '🤔 Ещё думаю',                callback_data: `course_doubt_think_${planId}` }],
          [{ text: '« Назад', callback_data: `course_buy_${planId}` }],
        ],
      }
    );
    return;
  }

  // ── Карта не проходит ─────────────────────────────
  if (data.startsWith('course_pay_card_fail_')) {
    const planId = data.replace('course_pay_card_fail_', '');
    await edit(chatId, messageId,
      `💳 <b>Карта не проходит?</b>\n\n` +
      `Попробуй другой способ:\n` +
      `• Карта РФ / СБП — напишем реквизиты\n` +
      `• Крипто (USDT / TON) — пришлём кошелёк\n\n` +
      `Или просто напиши нам — разберёмся: <a href="https://t.me/SkilySupport">@SkilySupport</a>`,
      {
        inline_keyboard: [
          [{ text: '🇷🇺 Карта РФ / СБП',       callback_data: `course_pay_rub_${planId}` }],
          [{ text: '💎 Крипто',                  callback_data: `course_pay_crypto_${planId}` }],
          [{ text: '💬 Написать в поддержку',   url: 'https://t.me/SkilySupport' }],
        ],
      }
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
      `💡 <b>Понимаю. Давай посчитаем.</b>\n\n` +
      `🏫 Автошкола в Испании:\n` +
      `   €300–500 только за теорию\n` +
      `   + €90 за каждую пересдачу\n` +
      `   + потеря времени\n\n` +
      `🎯 Skilyapp — €${price}, и ты сдаёшь <b>с первого раза.</b>\n\n` +
      `Это не расход — это инвестиция в права, которые уже завтра дадут тебе свободу передвижения по всей Европе. 🚗\n\n` +
      `<i>Кстати: штраф за езду без испанских прав — от €200 до €500. Курс уже окупается.</i>`,
      {
        inline_keyboard: [
          [{ text: `✅ Убедил — выбрать тариф €${price}`, callback_data: `course_buy_${planId}` }],
          [{ text: '🤔 Всё равно нужно подумать',          callback_data: `course_doubt_think_${planId}` }],
        ],
      }
    );
    return;
  }

  // ── Нужно подумать ────────────────────────────────
  if (data.startsWith('course_doubt_think_')) {
    const planId = data.replace('course_doubt_think_', '');
    await upsertLead(supabase, telegramId, { status: 'thinking', notes: 'Сказал "нужно подумать"' });

    await edit(chatId, messageId,
      `👍 <b>Понял, никакого давления.</b>\n\n` +
      `Твоё место пока держу. Напиши <b>«Курс»</b> когда будешь готов — продолжим с того же места.\n\n` +
      `А пока — попробуй бесплатный демо-тест на платформе. Почувствуй как это работает 👇`,
      {
        inline_keyboard: [
          [{ text: '🚀 Попробовать бесплатно', url: 'https://skilyapp.com' }],
          [{ text: `↩️ Вернуться к тарифу`, callback_data: `course_buy_${planId}` }],
        ],
      }
    );

    await notifyAdmin(
      `🤔 <b>Лид думает</b>\n` +
      `👤 ${firstName}${telegramUser ? ` @${telegramUser}` : ''}\n` +
      `📋 Тариф: ${planId}\n\n` +
      `<i>Автодожим отправится через 24ч</i>`
    );
    return;
  }
}
