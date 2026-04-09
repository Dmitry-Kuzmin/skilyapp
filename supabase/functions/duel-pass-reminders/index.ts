// =====================================================
// Duel Pass & Daily Quest Reminders
// =====================================================
// Умные напоминания:
// 1. Ежедневные квесты (не выполнены → напомнить)
// 2. Сезон заканчивается (3д, 1д, последний час)
// 3. Близко к следующему уровню
// 4. Потеря баллов водительских (срочные)
// 5. Персональные мотивирующие сообщения
//
// Запускается каждые 3 часа через GitHub Actions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFICATION_SENDER_URL = `${SUPABASE_URL}/functions/v1/notification-sender`;

console.log('[DuelPass Reminders] Service started');

// =====================================================
// Определение языка пользователя
// =====================================================

type Lang = 'ru' | 'en' | 'es';

function getUserLang(profile: any): Lang {
  // 1. Telegram language_code (приоритет для уведомлений бота — это язык Telegram пользователя)
  const code = profile?.language_code?.toLowerCase()?.split('-')[0];
  if (code) {
    if (['ru', 'uk', 'be', 'kk'].includes(code)) return 'ru';
    if (['es', 'ca', 'gl'].includes(code)) return 'es';
    if (['en', 'de', 'fr', 'it', 'pt', 'nl'].includes(code)) return 'en';
  }
  // 2. Явный выбор в настройках (fallback)
  const settingsLang = profile?.settings?.language;
  if (settingsLang && ['ru', 'en', 'es'].includes(settingsLang)) return settingsLang as Lang;
  return 'ru';
}

// =====================================================
// Мотивирующие сообщения — мультиязычные
// =====================================================

type Msg = { title: string; message: string };
type LangMsg = Record<Lang, Msg[]>;

const DAILY_QUEST_MESSAGES: LangMsg = {
  ru: [
    { title: 'Квесты ждут тебя', message: 'Сегодняшние задания дают до +260 SP. Не упусти — завтра будут другие.' },
    { title: 'SP на столе', message: 'Ежедневные квесты сбрасываются через несколько часов. Забери свои очки!' },
    { title: 'Не теряй темп', message: 'Каждый пропущенный день — это потерянные SP. Зайди и выполни квесты.' },
    { title: 'Быстрый буст', message: 'Дуэль + тест = почти 200 SP за 5 минут. Квесты уже ждут.' },
  ],
  en: [
    { title: 'Quests are waiting', message: 'Today\'s quests give up to +260 SP. Don\'t miss them — tomorrow they\'ll be different.' },
    { title: 'Free SP on the table', message: 'Daily quests reset in a few hours. Grab your points!' },
    { title: 'Keep the momentum', message: 'Every missed day is lost SP. Complete your quests today.' },
    { title: 'Quick boost', message: 'Duel + test = almost 200 SP in 5 minutes. Quests are waiting.' },
  ],
  es: [
    { title: 'Las misiones te esperan', message: 'Las misiones de hoy dan hasta +260 SP. No te las pierdas — mañana serán otras.' },
    { title: 'SP gratis en la mesa', message: 'Las misiones diarias se reinician en unas horas. ¡Recoge tus puntos!' },
    { title: 'No pierdas el ritmo', message: 'Cada día perdido son SP perdidos. Completa tus misiones hoy.' },
    { title: 'Impulso rápido', message: 'Duelo + test = casi 200 SP en 5 minutos. Las misiones esperan.' },
  ],
};

const SEASON_ENDING_MESSAGES: Record<string, LangMsg> = {
  '3d': {
    ru: [
      { title: 'Сезон скоро закончится', message: 'Финальный спринт! Каждый SP на счету. Уровень {level} — успеешь прокачать?' },
      { title: 'Осталось меньше недели', message: 'Награды сезона "{season_name}" скоро станут недоступны. Уровень: {level}.' },
    ],
    en: [
      { title: 'Season ending soon', message: 'Final sprint! Every SP counts. Level {level} — can you level up in time?' },
      { title: 'Less than a week left', message: 'Season "{season_name}" rewards expire soon. Your level: {level}.' },
    ],
    es: [
      { title: 'La temporada termina pronto', message: '¡Sprint final! Cada SP cuenta. Nivel {level} — ¿llegarás a subir?' },
      { title: 'Queda menos de una semana', message: 'Las recompensas de "{season_name}" expiran pronto. Tu nivel: {level}.' },
    ],
  },
  '1d': {
    ru: [
      { title: 'Последний день сезона!', message: 'Через 24 часа сезон закроется. Уровень {level}. Успей забрать награды!' },
      { title: 'Финиш через сутки', message: 'Сезон "{season_name}" заканчивается завтра. Не останавливайся на уровне {level}!' },
    ],
    en: [
      { title: 'Last day of the season!', message: 'Season closes in 24 hours. Level {level}. Grab your rewards!' },
      { title: 'Finish line tomorrow', message: 'Season "{season_name}" ends tomorrow. Don\'t stop at level {level}!' },
    ],
    es: [
      { title: '¡Último día de la temporada!', message: 'La temporada cierra en 24 horas. Nivel {level}. ¡Reclama tus premios!' },
      { title: 'La meta es mañana', message: '"{season_name}" termina mañana. ¡No te quedes en el nivel {level}!' },
    ],
  },
  'last_hours': {
    ru: [
      { title: 'Последний шанс!', message: 'Осталось всего несколько часов! Уровень {level}. Каждая дуэль — шанс на награду.' },
      { title: 'Сезон закрывается!', message: '"{season_name}" закрывается сегодня. Уровень {level} — забери награды!' },
    ],
    en: [
      { title: 'Last chance!', message: 'Only hours left! Level {level}. Every duel is a chance for rewards.' },
      { title: 'Season closing!', message: '"{season_name}" closes today. Level {level} — claim your rewards!' },
    ],
    es: [
      { title: '¡Última oportunidad!', message: '¡Quedan pocas horas! Nivel {level}. Cada duelo es una oportunidad.' },
      { title: '¡La temporada cierra!', message: '"{season_name}" cierra hoy. Nivel {level} — ¡reclama tus premios!' },
    ],
  },
};

const LEVEL_CLOSE_MESSAGES: LangMsg = {
  ru: [
    { title: 'Почти новый уровень!', message: 'До уровня {next_level} осталось {sp_remaining} SP. Одна дуэль — и ты там!' },
    { title: 'Рывок к уровню {next_level}', message: 'Ещё {sp_remaining} SP. Это один-два квеста. Давай!' },
  ],
  en: [
    { title: 'Almost next level!', message: 'Only {sp_remaining} SP to level {next_level}. One duel and you\'re there!' },
    { title: 'Push to level {next_level}', message: 'Just {sp_remaining} SP more. One or two quests. Let\'s go!' },
  ],
  es: [
    { title: '¡Casi al siguiente nivel!', message: 'Solo {sp_remaining} SP para el nivel {next_level}. ¡Un duelo y llegas!' },
    { title: 'Impulso al nivel {next_level}', message: 'Faltan {sp_remaining} SP. Uno o dos quests. ¡Vamos!' },
  ],
};

const LICENSE_URGENT_MESSAGES: LangMsg = {
  ru: [
    { title: 'Баллы под угрозой!', message: 'Без активности ты потеряешь водительский балл. Реши один тест — это 2 минуты.' },
    { title: 'Сохрани свои баллы', message: 'Осталось мало времени до списания балла. Быстрый тест — и баллы в безопасности.' },
  ],
  en: [
    { title: 'Points at risk!', message: 'Without activity you\'ll lose a license point. Take one test — just 2 minutes.' },
    { title: 'Save your points', message: 'Running out of time before point deduction. Quick test — and your points are safe.' },
  ],
  es: [
    { title: '¡Puntos en peligro!', message: 'Sin actividad perderás un punto del carnet. Haz un test — solo 2 minutos.' },
    { title: 'Salva tus puntos', message: 'Queda poco tiempo antes de la deducción. Un test rápido y tus puntos estarán a salvo.' },
  ],
};

// Локализованные тексты кнопок
const CTA_TEXTS: Record<string, Record<Lang, string>> = {
  daily_quest: { ru: 'Выполнить квесты', en: 'Complete quests', es: 'Completar misiones' },
  season_soon: { ru: 'К сезону', en: 'To season', es: 'Ir a la temporada' },
  season_urgent: { ru: 'Играть сейчас!', en: 'Play now!', es: '¡Jugar ahora!' },
  level_up: { ru: 'Добить уровень', en: 'Level up', es: 'Subir de nivel' },
  take_test: { ru: 'Пройти тест', en: 'Take a test', es: 'Hacer un test' },
};

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

  // Запускаем обработку в фоне, сразу возвращаем 200
  // GitHub Actions не таймаутит, Supabase продолжает выполнение через waitUntil
  const runBackground = async () => {
    try {
    console.log('[DuelPass Reminders] Running...');

    const supabase = createPooledSupabaseClient(SUPABASE_SERVICE_ROLE_KEY!);
    const now = new Date();
    const currentHour = now.getUTCHours();

    const results = {
      daily_quests: 0,
      season_ending: 0,
      level_close: 0,
      license_urgent: 0,
      errors: 0,
      skipped: 0,
    };

    // 1. Получаем активный сезон
    const { data: seasons, error: seasonError } = await supabase
      .from('duel_pass_seasons')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (seasonError) {
      console.error('[DuelPass Reminders] Error fetching season:', seasonError);
      return jsonResponse({ error: seasonError.message }, 500);
    }

    const activeSeason = seasons?.[0];

    if (!activeSeason) {
      console.log('[DuelPass Reminders] No active season found');
      return jsonResponse({ success: true, message: 'No active season', results });
    }

    // Рассчитываем дни до конца сезона
    const endDate = new Date(activeSeason.end_date);
    const daysRemainingCalc = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    console.log('[DuelPass Reminders] Active season:', {
      id: activeSeason.id,
      name: activeSeason.name_ru,
      days_remaining: daysRemainingCalc,
      end_date: activeSeason.end_date,
    });

    // 2. Получаем прогресс сезона (только id/points/level — без join)
    const { data: progressRows, error: progressError } = await supabase
      .from('user_season_progress')
      .select('user_id, season_points, level')
      .eq('season_id', activeSeason.id)
      .limit(500);

    if (progressError) {
      console.error('[DuelPass Reminders] Error fetching progress:', progressError);
      return jsonResponse({ error: progressError.message }, 500);
    }

    if (!progressRows || progressRows.length === 0) {
      return jsonResponse({ success: true, message: 'No users', results });
    }

    // 2b. Профили отдельно (без join) — только активные за 30 дней с telegram_id
    // Используем last_daily_point_at как основной показатель активности (last_activity_at может быть устаревшим)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const userIds = progressRows.map((p: any) => p.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, telegram_id, first_name, language_code, settings, last_activity_at, last_daily_point_at, license_points')
      .in('id', userIds.slice(0, 300))
      .not('telegram_id', 'is', null)
      .or(`last_daily_point_at.gte.${thirtyDaysAgo},last_activity_at.gte.${thirtyDaysAgo}`);

    if (!profiles || profiles.length === 0) {
      return jsonResponse({ success: true, message: 'No active telegram users', results });
    }

    const profileMap = new Map((profiles as any[]).map((p: any) => [p.id, p]));
    const usersWithProgress = progressRows
      .filter((p: any) => profileMap.has(p.user_id))
      .map((p: any) => ({ ...p, profile: profileMap.get(p.user_id) }));

    console.log(`[DuelPass Reminders] Processing ${usersWithProgress.length} users`);

    // 3. Получаем награды сезона
    const { data: seasonRewards } = await supabase
      .from('duel_pass_season_rewards')
      .select('level, sp_required')
      .eq('season_id', activeSeason.id)
      .order('level', { ascending: true });

    const daysRemaining = daysRemainingCalc;
    const deadline = Date.now() + 400_000; // 400s — в запасе до Supabase лимита

    // 4. Обрабатываем батчами по 10 параллельно
    const BATCH_SIZE = 10;
    for (let i = 0; i < usersWithProgress.length; i += BATCH_SIZE) {
      if (Date.now() > deadline) {
        console.warn(`[DuelPass Reminders] Deadline at user ${i}, stopping`);
        break;
      }
      const batch = usersWithProgress.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (userProgress: any) => {
        const profile = userProgress.profile;
        if (!profile?.telegram_id) return;

      const userId = userProgress.user_id;
      const currentLevel = userProgress.level ?? 0;
      const currentSP = userProgress.season_points ?? 0;
      const lang = getUserLang(profile);

      try {
        // === A. Ежедневные квесты (отправляем в 10:00-13:00 и 18:00-21:00 UTC) ===
        const isDailyQuestTime = (currentHour >= 10 && currentHour <= 13) || (currentHour >= 18 && currentHour <= 21);
        if (isDailyQuestTime) {
          const sent = await sendDailyQuestReminder(userId, currentLevel, lang, results);
          if (sent) results.daily_quests++;
        }

        // === B. Сезон заканчивается ===
        // <= 10 дней: предупреждение (cooldown 24ч), <= 3 дней: чаще, <= 1: срочно
        const seasonName = lang === 'es' ? (activeSeason.name_es || activeSeason.name_ru)
          : lang === 'en' ? (activeSeason.name_en || activeSeason.name_ru)
          : activeSeason.name_ru;

        if (daysRemaining <= 10 && daysRemaining > 3) {
          const sent = await sendSeasonEndingReminder(userId, '3d', currentLevel, seasonName, lang, results);
          if (sent) results.season_ending++;
        } else if (daysRemaining <= 3 && daysRemaining > 1) {
          const sent = await sendSeasonEndingReminder(userId, '1d', currentLevel, seasonName, lang, results);
          if (sent) results.season_ending++;
        } else if (daysRemaining <= 1) {
          const sent = await sendSeasonEndingReminder(userId, 'last_hours', currentLevel, seasonName, lang, results);
          if (sent) results.season_ending++;
        }

        // === C. Близко к следующему уровню ===
        if (seasonRewards && seasonRewards.length > 0) {
          const nextReward = seasonRewards.find((r: any) => r.level === currentLevel + 1);
          if (nextReward) {
            const spRemaining = nextReward.sp_required - currentSP;
            if (spRemaining > 0 && spRemaining <= 50) {
              const sent = await sendLevelCloseReminder(userId, currentLevel + 1, spRemaining, lang, results);
              if (sent) results.level_close++;
            }
          }
        }

        // === D. Срочные предупреждения о баллах ===
        // Используем last_daily_point_at если last_activity_at устарел
        const lastActivityDate = profile.last_daily_point_at
          ? new Date(profile.last_daily_point_at + 'T12:00:00Z')
          : profile.last_activity_at ? new Date(profile.last_activity_at) : null;
        if (profile.license_points > 0 && lastActivityDate) {
          const hoursInactive = (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60);

          if (hoursInactive >= 30 && hoursInactive < 48 && profile.license_warning_level !== '1h') {
            const sent = await sendLicenseUrgentReminder(userId, profile.license_points, lang, results);
            if (sent) results.license_urgent++;
          }
        }

      } catch (error) {
          console.error(`[DuelPass Reminders] Error for user ${userId}:`, error);
          results.errors++;
        }
      }));
    }

    console.log('[DuelPass Reminders] Results:', results);
    } catch (error: any) {
      console.error('[DuelPass Reminders] Fatal error:', error);
    }
  };

  // Запускаем в фоне — ответ уходит немедленно
  if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
    (globalThis as any).EdgeRuntime.waitUntil(runBackground());
  } else {
    runBackground();
  }

  return new Response(
    JSON.stringify({ ok: true, status: 'processing_started', ts: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});

// =====================================================
// Отправка уведомлений
// =====================================================

async function sendDailyQuestReminder(
  userId: string,
  level: number,
  lang: Lang,
  results: Record<string, number>
): Promise<boolean> {
  const msg = pickRandom(DAILY_QUEST_MESSAGES[lang]);
  return await sendNotification({
    userId,
    templateType: 'duel_pass_daily_quest',
    title: `🎯 ${msg.title}`,
    message: msg.message,
    icon: '🎯',
    ctaText: CTA_TEXTS.daily_quest[lang],
    ctaDeeplink: 'dashboard', // → startapp=dashboard → /dashboard (Duel Pass виден)
  });
}

async function sendSeasonEndingReminder(
  userId: string,
  urgency: '3d' | '1d' | 'last_hours',
  level: number,
  seasonName: string,
  lang: Lang,
  results: Record<string, number>
): Promise<boolean> {
  const messages = SEASON_ENDING_MESSAGES[urgency][lang];
  const msg = pickRandom(messages);

  const title = substituteVars(msg.title, { level, season_name: seasonName });
  const message = substituteVars(msg.message, { level, season_name: seasonName });

  const icons: Record<string, string> = { '3d': '⏰', '1d': '🔥', 'last_hours': '⚡' };
  const ctaText = urgency === 'last_hours' ? CTA_TEXTS.season_urgent[lang] : CTA_TEXTS.season_soon[lang];

  return await sendNotification({
    userId,
    templateType: `duel_pass_season_${urgency}`,
    title: `${icons[urgency]} ${title}`,
    message,
    icon: icons[urgency],
    ctaText,
    ctaDeeplink: 'dashboard',
  });
}

async function sendLevelCloseReminder(
  userId: string,
  nextLevel: number,
  spRemaining: number,
  lang: Lang,
  results: Record<string, number>
): Promise<boolean> {
  const msg = pickRandom(LEVEL_CLOSE_MESSAGES[lang]);
  const title = substituteVars(msg.title, { next_level: nextLevel, sp_remaining: spRemaining });
  const message = substituteVars(msg.message, { next_level: nextLevel, sp_remaining: spRemaining });

  return await sendNotification({
    userId,
    templateType: 'duel_pass_level_close',
    title: `🏆 ${title}`,
    message,
    icon: '🏆',
    ctaText: CTA_TEXTS.level_up[lang],
    ctaDeeplink: 'dashboard',
  });
}

async function sendLicenseUrgentReminder(
  userId: string,
  points: number,
  lang: Lang,
  results: Record<string, number>
): Promise<boolean> {
  const msg = pickRandom(LICENSE_URGENT_MESSAGES[lang]);

  return await sendNotification({
    userId,
    templateType: 'license_urgent_duelpass',
    title: `🚨 ${msg.title}`,
    message: msg.message,
    icon: '🚨',
    ctaText: CTA_TEXTS.take_test[lang],
    ctaDeeplink: 'tests', // → startapp=tests → /tests (быстрый доступ к тестам)
    force: true,
  });
}

// =====================================================
// Утилиты
// =====================================================

async function sendNotification(params: {
  userId: string;
  templateType: string;
  title: string;
  message: string;
  icon: string;
  ctaText: string;
  ctaDeeplink: string;
  force?: boolean;
}): Promise<boolean> {
  try {
    const response = await fetch(NOTIFICATION_SENDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        user_id: params.userId,
        template_type: params.templateType,
        title: params.title,
        message: params.message,
        icon: params.icon,
        cta_text: params.ctaText,
        cta_deeplink: params.ctaDeeplink,
        force: params.force || false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[DuelPass Reminders] Send failed for ${params.userId}:`, err);
      return false;
    }

    const result = await response.json();

    if (result.skipped) {
      return false;
    }

    return result.success || result.telegram_sent || false;
  } catch (error) {
    console.error(`[DuelPass Reminders] Send exception for ${params.userId}:`, error);
    return false;
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function substituteVars(template: string, vars: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
