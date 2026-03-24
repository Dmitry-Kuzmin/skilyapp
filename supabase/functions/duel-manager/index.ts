import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, getClientIP } from '../_shared/rate-limit.ts';
import { createPooledSupabaseClient } from '../_shared/supabase-client.ts';
import {
  mulberry32,
  fisherYatesShuffle,
  getDeterministicBotName,
  generateBotProfile,
  generateDuelCode,
  createDuelSchema,
  joinDuelSchema,
  findMatchSchema,
  submitAnswerSchema,
  getResultsSchema,
  useBoostSchema
} from '../_shared/duel-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schemas imported from duel-helpers.ts

// ... (helpers) ...

// Helper to fetch random questions efficiently (avoiding SELECT * on large table and RPC issues)
async function fetchRandomQuestions(
  supabase: SupabaseClient,
  count: number,
  country: string,
  seed: number,
  categories: string[] | null | undefined,
  difficulty: string | null | undefined,
  licenseCategory: string = 'A_B'
) {
  const t1 = Date.now();
  let query = supabase.from('questions_new').select('id');

  // Map country: 'russia'/'ru' -> 'ru', 'spain'/'es' -> 'es', others -> 'es'
  let countryCode = 'es';
  let internalLicenseCategory = licenseCategory;

  const c = country ? country.toLowerCase().trim() : 'spain';

  if (c === 'russia' || c === 'ru') {
    countryCode = 'ru';
  } else if (c === 'ru_cd') {
    countryCode = 'ru';
    internalLicenseCategory = 'C_D';
  } else if (c === 'spain' || c === 'es') {
    countryCode = 'es';
  } else {
    countryCode = c;
  }

  query = query.eq('country', countryCode);

  // License Category Filtering (Russia only)
  if (countryCode === 'ru') {
    if (internalLicenseCategory === 'C_D') {
      query = query.contains('metadata', { ticket_category: 'C_D' });
    } else {
      // A_B (Default): metadata does NOT contain ticket_category: C_D
      query = query.not('metadata', 'cs', '{"ticket_category": "C_D"}');
    }
  }

  if (difficulty && difficulty !== 'mix') {
    query = query.eq('difficulty', difficulty);
  }

  const { data: ids, error: idsError } = await query;

  if (idsError) {
    console.error('[fetchRandomQuestions] Error fetching IDs:', idsError);
    throw idsError;
  }

  if (!ids || ids.length === 0) return [];

  console.log(`[fetchRandomQuestions] Found ${ids.length} potential questions for country = ${countryCode}, diff = ${difficulty}, cat = ${licenseCategory} `);
  const t2 = Date.now();
  console.log(`[fetchRandomQuestions] ⏱️ ID fetch took ${t2 - t1} ms`);

  // Shuffle IDs
  const rng = mulberry32(seed);
  const shuffledIds = fisherYatesShuffle(ids.map((x: any) => x.id), rng);
  const selectedIds = shuffledIds.slice(0, count);

  console.log(`[fetchRandomQuestions] Selected ${selectedIds.length} IDs`);
  const t3 = Date.now();
  console.log(`[fetchRandomQuestions] ⏱️ Shuffle took ${t3 - t2} ms`);

  // Fetch details with options
  const { data: questions, error: detailsError } = await supabase
    .from('questions_new')
    .select(`
      id, question_ru, question_es, question_en, image_url, difficulty,
      answer_options(id, text_ru, text_es, text_en, is_correct, position)
    `)
    .in('id', selectedIds);

  const t4 = Date.now();
  console.log(`[fetchRandomQuestions] ⏱️ Details fetch took ${t4 - t3} ms`);
  console.log(`[fetchRandomQuestions] ⏱️ Total fetch time ${t4 - t1} ms`);

  if (detailsError) {
    console.error('[fetchRandomQuestions] Error fetching details:', detailsError);
    throw detailsError;
  }

  // Restore order from selectedIds (important for seed consistency)
  const questionsMap = new Map((questions || []).map((q: any) => [q.id, q]));
  return selectedIds.map(id => questionsMap.get(id)).filter(q => !!q);
}

const BASE_INSURANCE_RATE = 0.15;
const MIN_INSURANCE_RATE = 0.05;
const MAX_INSURANCE_RATE = 0.35;
const BASE_COVERAGE_RATE = 0.6;
const MIN_COVERAGE_RATE = 0.6;
const MAX_COVERAGE_RATE = 0.9;

const clampNumber = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getInsuranceConfig = (
  betAmount: number,
  options?: {
    enabled?: boolean;
    rate?: number;
    coverageRate?: number;
  }
) => {
  const enabled = !!options?.enabled && betAmount > 0;
  const rate = enabled
    ? clampNumber(options?.rate ?? BASE_INSURANCE_RATE, MIN_INSURANCE_RATE, MAX_INSURANCE_RATE)
    : 0;
  const coverageRate = enabled
    ? clampNumber(options?.coverageRate ?? BASE_COVERAGE_RATE, MIN_COVERAGE_RATE, MAX_COVERAGE_RATE)
    : 0;
  const premium = enabled ? Math.ceil(betAmount * rate) : 0;
  return { enabled, rate, coverageRate, premium };
};

const BASE_WIN_SP_NO_BET = 30;
const BASE_LOSE_SP = 5;
const DRAW_SP = 15;

const duelRiskMultiplier = (betAmount: number) => {
  if (!betAmount || betAmount <= 0) return 1;
  if (betAmount >= 600) return 4;
  if (betAmount >= 450) return 3;
  if (betAmount >= 300) return 2.25;
  if (betAmount >= 200) return 1.75;
  if (betAmount >= 100) return 1.25;
  return 1.1;
};

/**
 * Mapping between frontend country names and database codes
 */
function mapCountry(country?: string): string {
  if (country === 'russia') return 'ru';
  if (country === 'spain') return 'es';
  return country || 'es';
}

const calculateSeasonReward = (
  betAmount: number,
  outcome: 'win' | 'lose' | 'draw'
) => {
  if (outcome === 'draw') return DRAW_SP;
  if (outcome === 'lose') return BASE_LOSE_SP;
  if (betAmount > 0) {
    return Math.round(20 * duelRiskMultiplier(betAmount));
  }
  return BASE_WIN_SP_NO_BET;
};

const BASE_WIN_COINS_NO_BET = 20;
const BASE_DRAW_COINS_NO_BET = 10;

// ВАЖНО: Мы больше не начисляем монеты в Edge Function.
// Теперь это делает Postgres Trigger "on_duel_finished_payout" в базе данных.
// Это гарантирует 100% надежность (атомарность) начисления при обновлении статуса дуэли.
async function settleBetPayout({
  supabaseClient,
  duelId,
  betAmount,
  hostUserId,
  players,
  winnerUserId,
  isDraw,
}: {
  supabaseClient: ReturnType<typeof createClient>;
  duelId: string;
  betAmount: number;
  hostUserId: string;
  players: Array<{ user_id: string; id: string }>;
  winnerUserId: string | null;
  isDraw: boolean;
}) {
  const supabase = supabaseClient;
  console.log(`[settleBetPayout] ℹ️ Payout calculation skipped in Edge Function.Trigger will handle it.Duel: ${duelId} `);

  // Мы возвращаем 0/null для всех выплат, так как они произойдут в базе асинхронно
  // Фронтенд увидит актуальный баланс при следующем обновлении дашборда
  return;
}

// Generate readable 4-character code
function generateDuelCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 🆕 НОВОЕ: Отправка уведомления в Telegram при завершении дуэли
async function sendDuelCompletionNotification({
  supabaseClient,
  recipientTelegramId,
  opponentName,
  isWinner,
  isDraw,
  myScore,
  opponentScore,
  coinsWon,
  duelCode,
}: {
  supabaseClient: ReturnType<typeof createClient>;
  recipientTelegramId: number | string;
  opponentName: string;
  isWinner: boolean;
  isDraw: boolean;
  myScore: number;
  opponentScore: number;
  coinsWon: number;
  duelCode: string;
}) {
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[sendDuelCompletionNotification] No TELEGRAM_BOT_TOKEN, skipping');
    return;
  }

  let emoji = '🏁';
  let title = 'Дуэль завершена!';
  let resultText = '';

  if (isDraw) {
    emoji = '🤝';
    title = 'Ничья!';
    resultText = `Вы с ${opponentName} сыграли вничью.\nСчёт: ${myScore} — ${opponentScore} `;
  } else if (isWinner) {
    emoji = '🏆';
    title = 'Ты победил!';
    resultText = `Ты победил ${opponentName} !\nСчёт: ${myScore} — ${opponentScore} `;
    if (coinsWon > 0) {
      resultText += `\n💰 +${coinsWon} монет`;
    }
  } else {
    emoji = '😔';
    title = 'Поражение';
    resultText = `${opponentName} оказался сильнее.\nСчёт: ${myScore} — ${opponentScore} `;
  }

  const message = `${emoji} <b>${title} </b>\n\n${resultText}\n\n🆔 Код битвы: <code>${duelCode}</code > `;

  const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com';

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: recipientTelegramId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '📊 Посмотреть детали', web_app: { url: `${MINI_APP_URL}/games/duel` } }
          ]]
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[sendDuelCompletionNotification] Telegram API error:', error);
    } else {
      console.log('[sendDuelCompletionNotification] ✅ Notification sent to', recipientTelegramId);
    }
  } catch (err) {
    console.error('[sendDuelCompletionNotification] Failed to send:', err);
  }
}

// Calculate scoring
function calculateScore(
  difficulty: string,
  timeRemainMs: number,
  timeTotalMs: number,
  combo: number
): number {
  const basePoints = { easy: 100, medium: 200, hard: 350 };
  const base = basePoints[difficulty as keyof typeof basePoints] || 200;

  const timeBonus = Math.round((timeRemainMs / timeTotalMs) * base * 0.4);
  const comboMult = Math.min(1 + (combo * 0.05), 1.20);

  return Math.round((base + timeBonus) * comboMult);
}

// Bot name pool - реалистичные никнеймы для ботов
const BOT_NAMES = [
  // Русские имена
  'Александр', 'Мария', 'Дмитрий', 'Анна', 'Иван', 'Елена', 'Сергей', 'Ольга',
  'Андрей', 'Наталья', 'Максим', 'Татьяна', 'Алексей', 'Юлия', 'Павел', 'Ирина',
  'Николай', 'Светлана', 'Владимир', 'Екатерина', 'Артем', 'Марина', 'Роман', 'Анастасия',
  'Денис', 'Виктория', 'Антон', 'Кристина', 'Игорь', 'Дарья', 'Михаил', 'Полина',
  'Евгений', 'Валерия', 'Алекс', 'София', 'Кирилл', 'Алиса', 'Станислав', 'Вероника',
  'Артур', 'Арина', 'Даниил', 'Елизавета', 'Георгий', 'Милана', 'Тимур', 'Амелия',
  'Марк', 'Василиса', 'Лев', 'Ангелина', 'Федор', 'Диана', 'Григорий', 'Карина',

  // Испанские имена
  'Carlos', 'María', 'José', 'Ana', 'Luis', 'Carmen', 'Juan', 'Laura',
  'Miguel', 'Isabel', 'Francisco', 'Patricia', 'Antonio', 'Sofía', 'Manuel', 'Lucía',
  'Pedro', 'Elena', 'Javier', 'Marta', 'Diego', 'Paula', 'Ángel', 'Claudia',
  'Fernando', 'Cristina', 'Roberto', 'Andrea', 'Ricardo', 'Natalia', 'Alejandro', 'Sara',
  'Daniel', 'Beatriz', 'Sergio', 'Raquel', 'Pablo', 'Mónica', 'Álvaro', 'Eva',
  'Adrián', 'Lorena', 'Rubén', 'Silvia', 'Óscar', 'Rocío', 'Víctor', 'Nerea',
  'Iván', 'Celia', 'Jorge', 'Inés', 'Raúl', 'Marina', 'Gonzalo', 'Carla',

  // Английские имена
  'James', 'Emma', 'Michael', 'Olivia', 'William', 'Sophia', 'David', 'Isabella',
  'Richard', 'Charlotte', 'Joseph', 'Amelia', 'Thomas', 'Mia', 'Charles', 'Harper',
  'Christopher', 'Evelyn', 'Daniel', 'Abigail', 'Matthew', 'Emily', 'Anthony', 'Elizabeth',
  'Mark', 'Sofia', 'Donald', 'Avery', 'Steven', 'Ella', 'Paul', 'Madison',
  'Andrew', 'Scarlett', 'Joshua', 'Victoria', 'Kenneth', 'Aria', 'Kevin', 'Grace',
  'Brian', 'Chloe', 'George', 'Camila', 'Timothy', 'Penelope', 'Ronald', 'Riley',
  'Jason', 'Layla', 'Edward', 'Lillian', 'Jeffrey', 'Nora', 'Ryan', 'Zoey',
  'Jacob', 'Mila', 'Gary', 'Aubrey', 'Nicholas', 'Hannah', 'Eric', 'Addison',
  'Jonathan', 'Eleanor', 'Stephen', 'Natalie', 'Larry', 'Luna', 'Justin', 'Savannah',
  'Scott', 'Leah', 'Brandon', 'Zoe', 'Benjamin', 'Stella', 'Samuel', 'Hazel',
  'Frank', 'Ellie', 'Gregory', 'Paisley', 'Raymond', 'Audrey', 'Alexander', 'Skylar',
  'Patrick', 'Violet', 'Jack', 'Claire', 'Dennis', 'Bella', 'Jerry', 'Aurora'
];

// Bot avatar pool (используем доступные аватары)
const BOT_AVATARS = [
  'default', 'cyberpunk', 'hacker', 'ninja', 'warrior', 'ghost', 'neon'
];

// Helper to get deterministic bot name based on ID
function getDeterministicBotName(id: string): string {
  if (!id) return BOT_NAMES[0];
  const botNameIndex = parseInt(id.replace(/-/g, '').slice(0, 8), 16) % BOT_NAMES.length;
  return BOT_NAMES[botNameIndex];
}

// Generate bot profile based on player level and win streak (anti-farming protection)
function generateBotProfile(playerLevel: number, winStreak: number = 0, botId?: string): {
  name: string;
  avatar: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
} {
  // 🛡️ АДАПТИВНАЯ СЛОЖНОСТЬ (Anti-Farming Protection)
  let difficulty: 'easy' | 'medium' | 'hard' | 'insane' = 'medium';

  if (winStreak >= 5) {
    difficulty = 'insane';
  } else if (winStreak >= 3) {
    difficulty = 'hard';
  } else if (winStreak <= 2) {
    if (playerLevel >= 8) {
      difficulty = 'hard';
    } else if (playerLevel >= 4) {
      difficulty = 'medium';
    } else {
      difficulty = 'easy';
    }
  }

  // Детерминированное имя на основе ID (если есть) или случайное
  const name = botId ? getDeterministicBotName(botId) : BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const avatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];

  console.log(`[generateBotProfile] 🛡️ Win streak: ${winStreak}, Bot difficulty: ${difficulty}, Player level: ${playerLevel}, Name: ${name}`);

  return { name, avatar, difficulty };
}

// Bot simulation with adaptive accuracy based on bot difficulty (anti-farming protection)
function simulateBotAnswer(botDifficulty: 'easy' | 'medium' | 'hard' | 'insane', questionDifficulty: string): {
  delayMs: number;
  willBeCorrect: boolean;
} {
  // 🛡️ АДАПТИВНАЯ ТОЧНОСТЬ БОТА
  // Easy: 60-70% (дает кайфануть новичкам)
  // Medium: 70-80% (стандартная сложность)
  // Hard: 85-90% (начинает давить на фармеров)
  // Insane: 95-99% (бот-убийца, почти непобедим)

  const baseAccuracies = {
    easy: 0.65,      // 65% базовая точность
    medium: 0.75,    // 75% базовая точность
    hard: 0.875,     // 87.5% базовая точность
    insane: 0.97,    // 97% базовая точность (почти непобедим)
  };

  const baseAccuracy = baseAccuracies[botDifficulty] || 0.75;

  // Модификаторы на основе сложности вопроса
  const difficultyModifiers = {
    easy: 0.15,   // +15% для легких вопросов
    medium: 0,    // Без изменений для средних
    hard: -0.10,  // -10% для сложных вопросов (но не ниже минимума)
  };

  const modifier = difficultyModifiers[questionDifficulty as keyof typeof difficultyModifiers] || 0;
  const accuracy = Math.min(0.99, Math.max(0.50, baseAccuracy + modifier));

  // 🎯 УМНЫЕ ТАЙМИНГИ ОТВЕТОВ БОТА
  // Реалистичные времена как у живого игрока (ускорены для лучшего UX)
  const delayRanges = {
    easy: { min: 8000, max: 25000 },       // 8-25 секунд (думает дольше)
    medium: { min: 6000, max: 18000 },     // 6-18 секунд (стандартно)
    hard: { min: 4000, max: 12000 },       // 4-12 секунд (быстрее)
    insane: { min: 3000, max: 8000 },      // 3-8 секунд (очень быстро, как про)
  };

  const range = delayRanges[botDifficulty] || delayRanges.medium;
  const delayMs = Math.floor(Math.random() * (range.max - range.min) + range.min);

  console.log(`[simulateBotAnswer] 🤖 Bot difficulty: ${botDifficulty}, Question: ${questionDifficulty}, Accuracy: ${(accuracy * 100).toFixed(1)}%, Delay: ${Math.round(delayMs / 1000)}s`);

  return {
    delayMs,
    willBeCorrect: Math.random() < accuracy,
  };
}

// Notification templates with emotional, engaging texts
interface NotificationMetadata {
  opponent_name: string;
  opponent_finished?: boolean;
  question_number?: number;
  combo?: number;
  is_correct?: boolean;
  progress?: number;
  error_streak?: number;
  time_diff?: number;
  is_tied?: boolean;
  total_questions?: number;
  is_winner?: boolean;
  is_last_question?: boolean;
  is_waiting?: boolean;
  is_timeout_warning?: boolean;
  boost_type?: string;
  correct_answers?: number;
  num_questions?: number;
}

interface NotificationResult {
  title: string;
  message: string;
  icon: string;
}

const notificationTemplates: Record<string, (metadata: NotificationMetadata) => NotificationResult> = {
  // Start notifications
  'start': (metadata: NotificationMetadata) => {
    const opponentName = metadata.opponent_name;
    const templates = [
      { title: `${opponentName} принял твой вызов!`, message: 'Дуэль начинается прямо сейчас.', icon: 'flame' },
      { title: 'Матч стартовал', message: 'Кто победит, решат секунды.', icon: 'sword' },
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  },

  // Progress notifications
  'progress': (metadata: NotificationMetadata) => {
    const opponentName = metadata.opponent_name;
    const opponentFinished = metadata.opponent_finished || false;
    const questionNumber = metadata.question_number;
    const questionTextWithNumber = questionNumber ? ` на ${questionNumber} вопрос` : '';

    if (opponentFinished) {
      if (metadata.combo && metadata.combo >= 3) {
        const templates = [
          { title: `${opponentName} ответил правильно ${metadata.combo} раза подряд`, message: '', icon: 'lightbulb' },
          { title: `${opponentName} набрал серию из ${metadata.combo} правильных ответов`, message: '', icon: 'lightbulb' },
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      } else if (metadata.is_correct === false) {
        const templates = [
          { title: `${opponentName} ошибся${questionTextWithNumber}`, message: '', icon: 'x-circle' },
          { title: `${opponentName} только что совершил ошибку${questionTextWithNumber}`, message: '', icon: 'x-circle' },
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      } else if (metadata.progress) {
        return {
          title: `${opponentName} прошёл ${metadata.progress}% теста`,
          message: '',
          icon: 'rocket'
        };
      } else {
        const templates = [
          { title: `${opponentName} ответил правильно${questionTextWithNumber}`, message: '', icon: 'check-circle' },
          { title: `${opponentName} дал правильный ответ${questionTextWithNumber}`, message: '', icon: 'check-circle' },
        ];
        return templates[Math.floor(Math.random() * templates.length)];
      }
    }

    if (metadata.combo && metadata.combo >= 3) {
      const templates = [
        {
          title: `${opponentName} ответил правильно ${metadata.combo} раза подряд!`,
          message: 'Отличная серия! Продолжайте бороться!',
          icon: 'lightbulb'
        },
        {
          title: `${opponentName} набирает обороты!`,
          message: `Уже ${metadata.combo} правильных ответа подряд. Не отставай!`,
          icon: 'zap'
        },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (metadata.error_streak && metadata.error_streak >= 2) {
      const streak = metadata.error_streak >= 4 ? 4 : (metadata.error_streak >= 3 ? 3 : 2);
      const errorMessages: Record<number, NotificationResult[]> = {
        2: [
          { title: `${opponentName} ошибся 2 раза подряд`, message: 'Твой шанс вырваться вперёд!', icon: 'target' },
        ],
        3: [
          { title: `${opponentName} ошибся 3 раза подряд`, message: 'Это твой шанс!', icon: 'trophy' },
        ],
        4: [
          { title: `${opponentName} ошибся ${metadata.error_streak} раза подряд!`, message: 'Твой момент!', icon: 'trophy' },
        ],
      };
      const templates = errorMessages[streak] || errorMessages[2];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (metadata.is_correct === false) {
      return {
        title: `${opponentName} ошибся`,
        message: 'Твой шанс догнать!',
        icon: 'x-circle'
      };
    } else if (metadata.progress) {
      return { title: `${opponentName} прошёл ${metadata.progress}% теста!`, message: 'Игра набирает обороты!', icon: 'rocket' };
    } else {
      const questionNumberText = questionNumber ? ` на ${questionNumber} вопрос` : '';
      return {
        title: `${opponentName} ответил правильно${questionNumberText}`,
        message: questionNumber === 1 ? 'Игра набирает обороты!' : 'Продолжайте бороться!',
        icon: 'check-circle'
      };
    }
  },

  'answer': (metadata: NotificationMetadata) => {
    const opponentName = metadata.opponent_name || 'Соперник';
    const combo = metadata.combo || 0;
    if (combo >= 3) {
      return {
        title: `${opponentName} ответил правильно ${combo} раза подряд!`,
        message: 'Отличная серия!',
        icon: 'lightbulb'
      };
    }
    return {
      title: `${opponentName} ответил правильно`,
      message: 'Продолжайте бороться!',
      icon: 'check-circle'
    };
  },

  'boost': (metadata: NotificationMetadata) => {
    const opponentName = metadata.opponent_name;
    const boostNames: Record<string, string> = {
      'fifty_fifty': '50/50',
      'time_extend': 'Дополнительное время',
      'hint': 'Подсказка',
      'skip': 'Пропуск',
      'translate': 'Перевод'
    };
    const boostType = metadata.boost_type || 'unknown';
    const boostName = boostNames[boostType] || boostType;
    return {
      title: `${opponentName} использовал бустер '${boostName}'!`,
      message: 'Используй свои бустеры!',
      icon: 'zap'
    };
  },

  'finish': (metadata: NotificationMetadata) => {
    const opponentName = metadata.opponent_name;
    const correctAnswers = metadata.correct_answers || 0;
    if (metadata.is_winner === false) {
      return {
        title: `${opponentName} закончил игру`,
        message: `С ${correctAnswers} правильными ответами! Результаты готовы.`,
        icon: 'flag'
      };
    } else {
      return {
        title: 'Результаты готовы!',
        message: 'Проверь, кто выиграл дуэль.',
        icon: 'trophy'
      };
    }
  },

  'reminder': (metadata: NotificationMetadata) => {
    const opponentName = metadata.opponent_name;
    if (metadata.is_waiting) {
      return {
        title: `Дуэль с ${opponentName} ждёт твоего ответа`,
        message: 'Не забудь завершить игру!',
        icon: 'clock'
      };
    }
    return {
      title: `${opponentName} ещё не закончил игру`,
      message: 'Напомни ему!',
      icon: 'moon'
    };
  },

  'timeout': () => ({
    title: 'Время истекло',
    message: 'Дуэль завершена по таймауту.',
    icon: 'clock'
  }),

  'opponent_ahead': (metadata: NotificationMetadata) => ({
    title: `${metadata.opponent_name} опережает тебя`,
    message: 'Ускорься, чтобы догнать!',
    icon: 'zap'
  }),

  'opponent_behind': (metadata: NotificationMetadata) => ({
    title: `Ты опережаешь ${metadata.opponent_name}`,
    message: 'Продолжай в том же духе!',
    icon: 'turtle'
  }),
};

// Helper function to get opponent name from profile
async function getOpponentName(opponentId: string, supabase: SupabaseClient): Promise<string> {
  if (!opponentId) return 'Игрок';

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, username')
      .eq('id', opponentId)
      .maybeSingle();

    if (profile) {
      let name = profile.first_name || profile.username;
      if (name && name.trim()) {
        name = name.trim();
        // Check if name is not a hex ID or UUID
        if (!(/^[a-f0-9]{8}$/i.test(name) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name))) {
          return name;
        }
      }
    }
  } catch (error) {
    console.error('[getOpponentName] Error:', error);
  }
  return 'Игрок';
}

interface NotificationParams {
  duel_id: string;
  type: string;
  title?: string;
  message?: string;
  icon?: string;
  metadata?: NotificationMetadata;
  recipient_profile_id?: string;
}

// Helper function to create notifications with templates
async function createNotification(body: NotificationParams, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id, type, title, message, icon, metadata = {} as NotificationMetadata } = body;

  try {
    const { data: players, error: playersError } = await supabase
      .from('duel_players')
      .select('id, user_id, is_bot, bot_name, name')
      .eq('duel_id', duel_id);

    // For help_requested, it's normal if there's only 1 player (the host) because 
    // the requester hasn't joined the duel table yet due to lack of coins.
    const isHelp = type === 'help_requested';
    if (playersError || !players || (players.length < (isHelp ? 1 : 2))) {
      return new Response(JSON.stringify({ error: playersError?.message || 'Players not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let recipientPlayer: typeof players[0] | undefined;

    if (type === 'help_requested') {
      // Для запроса помощи — отправляем хосту (единственному игроку в дуэли).
      // Гость ещё НЕ вступил, поэтому в duel_players только хост.
      recipientPlayer = players.find(p => p.user_id && p.user_id !== profileId) || players[0];
    } else {
      recipientPlayer = players.find(p => p.user_id === body.recipient_profile_id);
      if (!recipientPlayer) {
        recipientPlayer = players.find(p => p.user_id && p.user_id !== profileId);
      }
    }

    if (!recipientPlayer) {
      console.error('[create_notification] Recipient not found. Players:', players, 'profileId:', profileId, 'type:', type);
      return new Response(JSON.stringify({ error: 'Recipient not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const opponentId = recipientPlayer.user_id;

    if (!metadata.opponent_name && profileId) {
      metadata.opponent_name = await getOpponentName(profileId, supabase);
    }

    if (!metadata.opponent_name) metadata.opponent_name = 'Игрок';

    let finalTitle = title;
    let finalMessage = message;
    let finalIcon = icon;

    if (!title || !message || !icon) {
      const template = notificationTemplates[type];
      if (template) {
        const res = template(metadata);
        finalTitle = finalTitle || res.title;
        finalMessage = finalMessage || res.message;
        finalIcon = finalIcon || res.icon;
      }
    }

    if (!opponentId) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Recipient is bot' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: notifError } = await supabase
      .from('duel_notifications')
      .insert({
        user_id: opponentId,
        duel_id,
        type,
        title: finalTitle || `Уведомление ${type}`,
        message: finalMessage || 'Новое уведомление',
        icon: finalIcon || 'bell',
        metadata,
        is_read: false
      });

    if (notifError) throw notifError;

    // Telegram delivery for finish/timeout/help
    if (['finish', 'timeout', 'help_requested'].includes(type) && opponentId) {
      try {
        const templateType = type === 'finish' ? (metadata.is_winner ? 'duel_win' : 'duel_lose') : type;
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notification-sender`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            user_id: opponentId,
            template_type: templateType,
            variables: { ...metadata, duel_id, opponent_name: metadata.opponent_name },
            cta_text: type === 'help_requested' ? 'Помочь монетами' : 'Посмотреть результаты',
            cta_deeplink: `duel_${duel_id}`
          })
        });
      } catch (err) {
        console.error('[DuelManager] Telegram notification error:', err);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    console.error('[create_notification] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 🛑 RATE LIMITING - защита от DDoS
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit({
    identifier: clientIP,
    limit: 100, // 100 запросов
    windowMs: 60000, // в минуту
  });

  if (!rateLimit.allowed) {
    console.warn('[duel-manager] Rate limit exceeded:', {
      ip: clientIP,
      remaining: rateLimit.remaining,
      resetAt: new Date(rateLimit.resetAt).toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    // 🔗 CONNECTION POOLING: Используем pooled клиент (порт 6543)
    // Это критично для масштабирования: Free план выдержит 1000+ пользователей вместо 60
    const supabase = createPooledSupabaseClient();

    // 0. Логируем начало обработки
    console.log('[Duel Manager] 📥 New request received');

    // 1. Проверяем наличие тела запроса, чтобы избежать SyntaxError
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Duel Manager] ⚠️ Invalid content-type:', contentType);
      return new Response(JSON.stringify({ error: 'Body must be JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      const text = await req.text();
      if (!text) {
        console.warn('[Duel Manager] ⚠️ Empty body');
        return new Response(JSON.stringify({ error: 'Empty request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = JSON.parse(text);
    } catch (e) {
      console.error('[Duel Manager] ❌ JSON Parse Error:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, profile_id, ...params } = body;
    console.log('[Duel Manager] 🎯 Action:', action, 'Profile ID from client:', profile_id);

    let profileId: string | null = null;

    // 1. VALIDATE client-provided profile_id (если передан клиентом, проверяем его существование)
    if (profile_id) {
      const { data: clientProfile, error: clientProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', profile_id)
        .maybeSingle();

      if (clientProfile && !clientProfileError) {
        profileId = clientProfile.id;
        console.log('[Duel Manager] ✅ Using validated profile_id from client:', profileId);
      } else {
        console.warn('[Duel Manager] ⚠️ Client provided invalid profile_id:', profile_id, 'Error:', clientProfileError);
      }
    }

    // 2. FALLBACK: Auth lookup (для Telegram и Email пользователей)
    if (!profileId) {
      console.log('[Duel Manager] No valid profile_id from client, attempting auth lookup...');
      const authHeader = req.headers.get('Authorization');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const userToken = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);

        if (user && !authError) {
          console.log('[Duel Manager] 🔐 Authenticated user found:', user.id);

          const { data: authProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (authProfile) {
            profileId = authProfile.id;
            console.log('[Duel Manager] ✅ Profile found via user_id:', profileId);
          } else {
            const telegramId = user.user_metadata?.telegram_id || user.user_metadata?.sub;
            if (telegramId) {
              const { data: tgProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('telegram_id', parseInt(telegramId))
                .maybeSingle();
              if (tgProfile) {
                profileId = tgProfile.id;
                console.log('[Duel Manager] ✅ Profile found via telegram_id:', profileId);
              }
            }
          }
        } else {
          console.error('[Duel Manager] ❌ Auth error:', authError?.message || 'unknown');
        }
      } else {
        console.warn('[Duel Manager] ⚠️ No valid Authorization header for auth lookup');
      }
    }

    if (!profileId) {
      console.error('[Duel Manager] ❌ Profile not found after all attempts');
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Duel Manager] 🔍 Before switch:', {
      action,
      actionType: typeof action,
      actionValue: JSON.stringify(action),
      hasFindMatch: action === 'find_match',
      hasSurrender: action === 'surrender',
      switchCases: ['create_notification', 'check_status', 'find_match', 'submit_answer', 'use_boost', 'bot_use_boost', 'finish_duel', 'cancel_duel', 'bot_answer', 'surrender', 'handle_disconnect', 'auto_finish']
    });

    // 🛡️ SECURITY: Селективный Rate Limiting для тяжелых операций
    // create_duel, join_duel - строгие лимиты (10 req/min)
    // submit_answer, use_boost - мягкие (не блокируем активную игру)
    const heavyActions = ['create_duel', 'join_duel', 'find_match'];
    if (heavyActions.includes(action) && profileId) {
      const actionRateLimit = await checkRateLimit({
        identifier: `${profileId}:${action}`,
        limit: 10, // 10 попыток создания/присоединения в минуту
        windowMs: 60000,
      });

      if (!actionRateLimit.allowed) {
        console.warn(`[duel-manager] Action rate limit exceeded:`, {
          action,
          profileId,
          remaining: actionRateLimit.remaining,
          resetAt: new Date(actionRateLimit.resetAt).toISOString(),
        });

        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Слишком много попыток. Пожалуйста, подождите немного.',
            action,
            resetAt: new Date(actionRateLimit.resetAt).toISOString(),
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((actionRateLimit.resetAt - Date.now()) / 1000)),
            },
          }
        );
      }
    }

    switch (action) {
      case 'create_notification':
        return await createNotification(params, profileId, supabase);
      case 'check_status': {
        const { duel_id } = params;

        console.log('[Duel Manager] Checking status for duel:', duel_id, 'Profile:', profileId);

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('id, status, started_at, host_user')
          .eq('id', duel_id)
          .maybeSingle();

        if (duelError) {
          console.error('[Duel Manager] Error checking duel:', duelError);
          throw duelError;
        }

        if (!duel) {
          console.warn('[Duel Manager] Duel not found');
          return new Response(JSON.stringify({ error: 'Duel not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[Duel Manager] Duel status:', duel.status);

        return new Response(JSON.stringify({
          status: duel.status,
          started_at: duel.started_at,
          host_user: duel.host_user,
          num_questions: duel.num_questions
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_players': {
        const { duel_id } = params;

        console.log('[Duel Manager] Getting players for duel:', duel_id, 'Profile:', profileId);

        // Загружаем игроков без join (чтобы избежать проблем с RLS)
        // Включаем информацию о ботах (is_bot, bot_difficulty, bot_name, name)
        const { data: players, error: playersError } = await supabase
          .from('duel_players')
          .select('id, user_id, score, correct_count, is_bot, bot_difficulty, bot_name, name')
          .eq('duel_id', duel_id);

        if (playersError) {
          console.error('[Duel Manager] Error getting players:', playersError);
          return new Response(JSON.stringify({ error: playersError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!players || players.length === 0) {
          console.warn('[Duel Manager] No players found for duel:', duel_id);
          return new Response(JSON.stringify({ players: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 🆕 НОВОЕ: Загружаем количество ответов для каждого игрока
        const { data: answersData, error: answersError } = await supabase
          .from('duel_answers')
          .select('player_id')
          .eq('duel_id', duel_id);

        const answersCountMap = new Map();
        if (!answersError && answersData) {
          answersData.forEach((ans: { player_id: string }) => {
            const count = answersCountMap.get(ans.player_id) || 0;
            answersCountMap.set(ans.player_id, count + 1);
          });
        }

        // Загружаем инфо о дуэли для num_questions
        const { data: duelInfo } = await supabase
          .from('duels')
          .select('num_questions')
          .eq('id', duel_id)
          .single();

        const totalQuestions = duelInfo?.num_questions || 10;

        // ОПТИМИЗАЦИЯ: Загружаем профили одним batch запросом вместо множества отдельных
        const userIds = players.map((p: { user_id: string }) => p.user_id).filter(Boolean);
        const profilesMap = new Map();

        if (userIds.length > 0) {
          console.log('[get_players] Loading profiles in batch for userIds:', userIds);

          // Используем .in() для batch загрузки - в 10 раз быстрее
          // Если RLS блокирует .in(), fallback на отдельные запросы
          try {
            const { data: profiles, error } = await supabase
              .from('profiles')
              .select('id, first_name, username, photo_url, telegram_id')
              .in('id', userIds);

            if (error) {
              // Если batch запрос не работает (RLS), fallback на отдельные запросы
              console.warn('[get_players] Batch query failed, falling back to individual queries:', error.message);

              const profilePromises = userIds.map(async (userId) => {
                const { data: profile, error: singleError } = await supabase
                  .from('profiles')
                  .select('id, first_name, username, photo_url, telegram_id')
                  .eq('id', userId)
                  .single();

                if (singleError) {
                  console.error(`[get_players] ❌ Error loading profile for ${userId}:`, {
                    error: singleError.message,
                    code: singleError.code,
                  });
                  return null;
                }

                return { userId, profile };
              });

              const profileResults = await Promise.all(profilePromises);
              profileResults.forEach((result) => {
                if (result && result.profile) {
                  profilesMap.set(result.userId, result.profile);
                }
              });
            } else {
              // Batch запрос успешен - создаем Map
              (profiles || []).forEach((profile: { id: string; first_name?: string | null; username?: string | null; photo_url?: string | null; telegram_id?: number | null }) => {
                profilesMap.set(profile.id, profile);
              });
            }
          } catch (err) {
            console.error('[get_players] Unexpected error loading profiles:', err);
          }

          console.log('[get_players] Profiles query result:', {
            userIds,
            profilesCount: profilesMap.size,
            profiles: Array.from(profilesMap.entries()).map(([id, p]: [string, any]) => ({
              id,
              first_name: p.first_name,
              username: p.username,
              has_telegram_id: !!p.telegram_id
            }))
          });
        }

        // Format players with names
        const formattedPlayers = players.map((p: { id: string; user_id: string; is_bot: boolean; bot_name?: string | null; score: number; is_active: boolean }) => {
          // Если это бот - используем имя из БД или генерируем
          if (p.is_bot) {
            // ВАЖНО: Используем bot_name из БД, если он есть (это имя, которое было сохранено при создании бота)
            // Если bot_name нет, используем name из БД
            // Только если оба отсутствуют, генерируем имя на основе ID
            let botName = p.bot_name || p.name;

            if (!botName) {
              // Fallback: детерминированное имя на основе ID бота
              botName = getDeterministicBotName(p.id);
              console.log('[get_players] ⚠️ Bot name not found in DB, generating from ID:', botName);
            } else {
              console.log('[get_players] ✅ Using bot name from DB:', botName);
            }

            console.log('[get_players] Processing bot player:', {
              playerId: p.id,
              botName,
              bot_name_from_db: p.bot_name,
              name_from_db: p.name,
              bot_difficulty: p.bot_difficulty
            });

            const answeredCount = answersCountMap.get(p.id) || 0;
            return {
              id: p.id,
              user_id: p.user_id,
              score: p.score || 0,
              correct_count: p.correct_count || 0,
              answered_count: answeredCount,
              is_finished: answeredCount >= totalQuestions,
              name: botName,
              bot_name: botName, // Дублируем для совместимости
              is_bot: true,
              bot_difficulty: p.bot_difficulty,
            };
          }

          const profile = profilesMap.get(p.user_id);

          console.log('[get_players] Processing player:', {
            playerId: p.id,
            userId: p.user_id,
            hasProfile: !!profile,
            profile: profile ? {
              first_name: profile.first_name,
              username: profile.username
            } : null
          });

          let name: string | null = null;

          if (profile) {
            // Приоритет: first_name > username
            // Проверяем все поля отдельно, чтобы не пропустить имя
            if (profile.first_name && profile.first_name.trim() && profile.first_name !== 'Игрок') {
              name = profile.first_name.trim();
            } else if (profile.username && profile.username.trim() && profile.username !== 'Игрок') {
              name = profile.username.trim();
            }

            // Если имя не найдено или пустое, используем fallback
            if (!name || name.trim() === '') {
              console.warn('[get_players] No valid name found in profile, using fallback "Игрок"', {
                profile: {
                  id: profile.id,
                  first_name: profile.first_name,
                  username: profile.username
                }
              });
              name = 'Игрок';
            } else {
              // Проверяем, что имя не является ID (8 символов hex или UUID)
              if (name.length <= 8 && /^[a-f0-9]{8}$/i.test(name)) {
                console.warn('[get_players] Name looks like an ID, using fallback:', name);
                name = 'Игрок';
              } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)) {
                console.warn('[get_players] Name looks like a UUID, using fallback:', name);
                name = 'Игрок';
              }
            }
          } else {
            console.warn('[get_players] No profile found for user_id:', p.user_id, 'Available profiles:', Array.from(profilesMap.keys()));
            name = 'Игрок';
          }

          // Убеждаемся, что name всегда установлен
          if (!name) {
            name = 'Игрок';
          }

          console.log('[get_players] Final name for player:', {
            playerId: p.id,
            userId: p.user_id,
            name
          });

          const answeredCount = answersCountMap.get(p.id) || 0;
          return {
            id: p.id,
            user_id: p.user_id,
            score: p.score || 0,
            correct_count: p.correct_count || 0,
            answered_count: answeredCount,
            is_finished: answeredCount >= totalQuestions,
            name: name,
            photo_url: profile?.photo_url || null,
            is_bot: false
          };
        });

        console.log('[Duel Manager] ✅ Found players:', formattedPlayers.length);
        console.log('[Duel Manager] Players with names:', formattedPlayers.map((p: { user_id: string; name: string }) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.name,
          score: p.score
        })));

        // КРИТИЧНО: Проверяем что все игроки имеют имена
        const playersWithoutNames = formattedPlayers.filter((p: { name: string }) => !p.name || p.name === 'Игрок');
        if (playersWithoutNames.length > 0) {
          console.warn('[Duel Manager] ⚠️ Some players have no valid name:', playersWithoutNames.map((p: { user_id: string; name: string }) => ({
            id: p.id,
            user_id: p.user_id
          })));
        }

        return new Response(JSON.stringify({ players: formattedPlayers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_questions': {
        const { duel_id } = params;

        console.log('[Duel Manager] Getting questions for duel:', duel_id);

        const { data: questions, error: questionsError } = await supabase
          .from('duel_questions')
          .select('*')
          .eq('duel_id', duel_id)
          .order('position');

        if (questionsError) {
          console.error('[Duel Manager] Error getting questions:', questionsError);
          throw questionsError;
        }

        console.log('[Duel Manager] Found', questions?.length || 0, 'questions');

        return new Response(JSON.stringify({ questions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_results': {
        const validated = getResultsSchema.parse(params);
        const { duel_id } = validated;
        // 🆕 FIX: Используем profile_id из params или fallback на profileId из JWT
        const profile_id = validated.profile_id || profileId;

        if (!profile_id) {
          console.error('[get_results] No profile_id provided and no JWT profile');
          return new Response(JSON.stringify({ error: 'profile_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[get_results] Fetching results for duel:', duel_id, 'profile_id:', profile_id);

        // Fetch duel, players, and answers in a single batch-like query if possible, or parallelize
        const [duelResult, playersResult, answersResult] = await Promise.all([
          supabase.from('duels').select('*').eq('id', duel_id).single(),
          supabase.from('duel_players').select('*, profiles(id, username, first_name, photo_url)').eq('duel_id', duel_id),
          supabase.from('duel_answers').select('*, duel_questions(*)').eq('duel_id', duel_id)
        ]);

        if (duelResult.error || !duelResult.data) {
          console.error('[get_results] Duel not found:', duelResult.error);
          return new Response(JSON.stringify({ error: 'Duel not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const duel = duelResult.data;
        const players = playersResult.data || [];
        const allAnswers = answersResult.data || [];

        if (players.length < 2) {
          console.warn('[get_results] Not enough players yet:', players.length);
          return new Response(JSON.stringify({ error: 'DUEL_NOT_READY', message: 'Not enough players' }), {
            status: 202, // Accepted but not finished
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const myPlayer = players.find((p: { user_id: string }) => p.user_id === profile_id);
        const opponentPlayer = players.find((p: { user_id: string }) => p.user_id !== profile_id);

        if (!myPlayer || !opponentPlayer) {
          console.error('[get_results] Player not found in duel participants');
          return new Response(JSON.stringify({ error: 'Player not authorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const myAnswers = allAnswers.filter((a: { player_id: string }) => a.player_id === myPlayer.id);
        const opponentAnswers = allAnswers.filter((a: { player_id: string }) => a.player_id === opponentPlayer.id);

        // Ensure both players have finished (if status is not finished yet)
        if (duel.status !== 'finished' && duel.status !== 'technical_draw' && duel.status !== 'cancelled') {
          // КРИТИЧНО: Используем Set для подсчета уникальных ответов, чтобы избежать ложных срабатываний при дубликатах
          const myUniqueAnswers = new Set(myAnswers.map((a: { duel_question_id: string }) => a.duel_question_id));
          const opponentUniqueAnswers = new Set(opponentAnswers.map((a: { duel_question_id: string }) => a.duel_question_id));

          const myFinished = myUniqueAnswers.size >= duel.num_questions;
          const opponentFinished = opponentUniqueAnswers.size >= duel.num_questions || opponentPlayer.is_bot;

          // If current player finished but duel is still active, maybe wait or return partial
          if (!myFinished || !opponentFinished) {
            console.log('[get_results] Duel still active, players not finished:', { myFinished, opponentFinished });

            // If it's a bot match and I'm finished, why is it NOT finished?
            // This might happen if finish_duel was not called yet.
            return new Response(JSON.stringify({
              error: 'DUEL_NOT_READY',
              message: 'Players still answering',
              duel,
              players,
              myAnswers,
              opponentAnswers
            }), {
              status: 202,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        return new Response(JSON.stringify({
          duel,
          players,
          myAnswers,
          opponentAnswers
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_duel': {
        const validated = createDuelSchema.parse(params);
        const {
          num_questions,
          categories,
          difficulty,
          bet_amount = 0,
          bet_type = 'none',
          insurance_enabled,
          insurance_rate,
          insurance_coverage_rate,
          security_context,
          license_category // New param
        } = validated;

        const hostInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
          enabled: insurance_enabled,
          rate: insurance_rate,
          coverageRate: insurance_coverage_rate
        }) : { enabled: false, rate: 0, coverageRate: 0, premium: 0 };

        // Map Category to special Country Code for C/D
        let duelCountry = 'spain';
        // Retrieve profile first to check preferred_country
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('coins, preferred_country')
          .eq('id', profileId)
          .single();

        if (profileError || !profile) {
          return new Response(JSON.stringify({ error: 'Profile not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        duelCountry = profile.preferred_country || 'spain';
        if ((duelCountry === 'russia' || duelCountry === 'ru') && license_category === 'C_D') {
          duelCountry = 'ru_cd';
        }

        if (bet_amount > 0) {
          const requiredCoins = bet_amount + (hostInsurance.premium || 0);

          if ((profile.coins || 0) < requiredCoins) {
            return new Response(JSON.stringify({ error: `Insufficient coins. You need ${requiredCoins} coins but only have ${profile.coins || 0}` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Deduct bet and insurance premium from host
          await supabase.rpc('increment_profile_value', {
            p_profile_id: profileId,
            p_column: 'coins',
            p_amount: -requiredCoins
          });
        }

        // Generate unique code
        let code = generateDuelCode();
        let attempts = 0;
        while (attempts < 10) {
          const { data: existing } = await supabase
            .from('duels')
            .select('id')
            .eq('code', code)
            .single();

          if (!existing) break;
          code = generateDuelCode();
          attempts++;
        }

        // Generate more random seed using timestamp + random
        const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);

        // 🆕 TTL для асинхронных дуэлей: 24 часа
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .insert({
            code,
            host_user: profileId,
            num_questions,
            categories,
            difficulty,
            question_seed: questionSeed,
            bet_amount,
            bet_type,
            expires_at: expiresAt, // 24 часа до истечения
            country: duelCountry,
          })
          .select()
          .single();

        if (duelError) throw duelError;

        // Record bet transaction if bet_amount > 0
        if (bet_amount > 0) {
          await supabase
            .from('duel_transactions')
            .insert({
              duel_id: duel.id,
              user_id: profileId,
              amount: -bet_amount,
              transaction_type: 'bet'
            });

          if (hostInsurance.premium > 0) {
            await supabase
              .from('duel_transactions')
              .insert({
                duel_id: duel.id,
                user_id: profileId,
                amount: -hostInsurance.premium,
                transaction_type: 'insurance_premium'
              });
          }

          await supabase
            .from('duel_bets')
            .upsert({
              duel_id: duel.id,
              host_user: profileId,
              bet_amount,
              currency: 'coins',
              host_confirmed: true,
              opponent_confirmed: false,
              status: 'pending',
              host_insurance_enabled: hostInsurance.enabled,
              host_insurance_rate: hostInsurance.rate,
              host_insurance_premium: hostInsurance.premium,
              host_coverage_rate: hostInsurance.coverageRate,
              ip_hash_host: security_context?.ip_hash || null
            }, { onConflict: 'duel_id' });
        }

        // ✅ Хост уже добавлен через триггер auto_add_host_to_duel_players
        // (см. миграцию 20260207_auto_add_host_to_duel_players.sql)
        console.log('[create_duel] ✅ Host automatically added by trigger');

        return new Response(JSON.stringify({ duel, code }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'find_match': {
        // Логируем входящие параметры для диагностики
        console.log('[find_match] 📥 Received params:', JSON.stringify(params, null, 2));
        console.log('[find_match] 📥 Params types:', {
          num_questions: typeof params.num_questions,
          bet_amount: typeof params.bet_amount,
          difficulty: typeof params.difficulty,
          bet_type: typeof params.bet_type,
          insurance_enabled: typeof params.insurance_enabled,
          has_categories: 'categories' in params,
        });

        // Валидация с детальной обработкой ошибок
        let validated;
        try {
          validated = findMatchSchema.parse(params);
          console.log('[find_match] ✅ Validation passed:', {
            num_questions: validated.num_questions,
            bet_amount: validated.bet_amount,
            difficulty: validated.difficulty,
            bet_type: validated.bet_type,
            license_category: validated.license_category
          });

          // Map Category to special Country Code for C/D (Same logic)
          // We need profile's preferred country. Is it available? 
          // Not yet fetched. We fetch it below.

        } catch (validationError: unknown) {
          console.error('[find_match] ❌ Validation error:', {
            error: validationError.message,
            issues: validationError.issues,
            receivedParams: params,
            receivedParamsTypes: {
              num_questions: typeof params.num_questions,
              bet_amount: typeof params.bet_amount,
              difficulty: typeof params.difficulty,
              bet_type: typeof params.bet_type,
            }
          });
          return new Response(JSON.stringify({
            error: 'Validation failed',
            message: validationError.message,
            details: validationError.issues,
            received: params
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const {
          num_questions,
          categories,
          difficulty,
          bet_amount = 0,
          bet_type = 'none',
          insurance_enabled,
          insurance_rate,
          insurance_coverage_rate,
          security_context
        } = validated;

        console.log('[find_match] Starting matchmaking for profile:', profileId);

        // Получаем уровень игрока для определения сложности бота
        const { data: playerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('duel_pass_level, coins, preferred_country')
          .eq('id', profileId)
          .single();

        if (profileError || !playerProfile) {
          return new Response(JSON.stringify({ error: 'Profile not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const playerLevel = playerProfile.duel_pass_level || 1;
        let playerCountry = playerProfile.preferred_country || 'spain';
        if ((playerCountry === 'russia' || playerCountry === 'ru') && validated.license_category === 'C_D') {
          playerCountry = 'ru_cd';
        }

        // Проверяем монеты для ставки
        if (bet_amount > 0) {
          const hostInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
            enabled: insurance_enabled,
            rate: insurance_rate,
            coverageRate: insurance_coverage_rate
          }) : { enabled: false, rate: 0, coverage_rate: 0, premium: 0 };

          const requiredCoins = bet_amount + (hostInsurance.premium || 0);

          if ((playerProfile.coins || 0) < requiredCoins) {
            return new Response(JSON.stringify({ error: `Insufficient coins. You need ${requiredCoins} coins but only have ${playerProfile.coins || 0}` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Шаг 1: Добавляем игрока в очередь поиска
        // Подготавливаем данные для вставки (categories может быть null)
        const queueData: Record<string, any> = {
          profile_id: profileId,
          num_questions,
          difficulty: difficulty || 'mix',
          bet_amount: bet_amount || 0,
          bet_type: bet_type || 'none',
          expires_at: new Date(Date.now() + 30000).toISOString(), // 30 секунд
          matched: false,
          preferred_country: playerCountry
        };

        // Добавляем categories только если они есть
        if (categories && Array.isArray(categories) && categories.length > 0) {
          queueData.categories = categories;
        }

        console.log('[find_match] 📝 Inserting into queue:', {
          ...queueData,
          profile_id: `${queueData.profile_id.substring(0, 8)}...`
        });

        const { data: queueEntry, error: queueInsertError } = await supabase
          .from('duel_matchmaking_queue')
          .insert(queueData)
          .select()
          .single();

        if (queueInsertError) {
          console.error('[find_match] ❌ Error adding to queue:', {
            error: queueInsertError,
            message: queueInsertError.message,
            code: queueInsertError.code,
            details: queueInsertError.details,
            hint: queueInsertError.hint,
            data: {
              profile_id: profileId,
              num_questions,
              difficulty,
              categories,
              bet_amount,
              bet_type,
            }
          });
          return new Response(JSON.stringify({
            error: 'Failed to join matchmaking queue',
            details: queueInsertError.message,
            code: queueInsertError.code
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[find_match] ✅ Added to queue:', queueEntry.id);

        // Шаг 2: Ищем реального соперника в очереди (5-10 секунд)
        const searchStartTime = Date.now();
        const searchTimeout = 8000; // 8 секунд поиска
        let matchedOpponent = null;

        while (Date.now() - searchStartTime < searchTimeout) {
          // Ищем подходящего соперника в очереди с FOR UPDATE SKIP LOCKED для защиты от race condition
          // Используем RPC для выполнения SQL с FOR UPDATE SKIP LOCKED
          const { data: queueEntries, error: queueError } = await supabase.rpc('find_matchmaking_opponent', {
            p_profile_id: profileId,
            p_bet_amount: bet_amount,
            p_difficulty: difficulty || 'mix',
            p_country: playerCountry
          });

          if (!queueError && queueEntries && queueEntries.length > 0) {
            matchedOpponent = queueEntries[0];
            console.log('[find_match] ✅ Found real opponent:', matchedOpponent.profile_id);
            break;
          }

          // Ждем 1 секунду перед следующей попыткой
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Шаг 2: Если нашли реального соперника - создаем дуэль
        if (matchedOpponent) {
          // Соперник уже помечен как matched в RPC функции find_matchmaking_opponent
          // Удаляем обе записи из очереди
          await supabase
            .from('duel_matchmaking_queue')
            .delete()
            .in('id', [queueEntry.id, matchedOpponent.id]);

          // Проверяем баланс соперника прямо сейчас (на случай если он все потратил пока ждал)
          const { data: opponentProfile } = await supabase
            .from('profiles')
            .select('coins')
            .eq('id', matchedOpponent.profile_id)
            .single();

          if (bet_amount > 0 && (opponentProfile?.coins || 0) < bet_amount) {
            console.warn(`[find_match] ⚠️ Opponent ${matchedOpponent.profile_id} no longer has enough coins. Match cancelled.`);
            // Не создаем дуэль, возвращаем ошибку - игрок попробует еще раз
            return new Response(JSON.stringify({ error: 'Opponent no longer has enough coins' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Создаем дуэль (используем логику из create_duel)
          const joinerInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
            enabled: insurance_enabled,
            rate: insurance_rate,
            coverageRate: insurance_coverage_rate
          }) : { enabled: false, rate: 0, coverage_rate: 0, premium: 0 };

          if (bet_amount > 0) {
            // Deduct from JOINER (current user)
            await supabase.rpc('increment_profile_value', {
              p_profile_id: profileId,
              p_column: 'coins',
              p_amount: -(bet_amount + (joinerInsurance.premium || 0))
            });

            // Deduct from HOST (matched opponent)
            // Note: Host has no insurance here as it's not and option in matchmaking queue yet
            await supabase.rpc('increment_profile_value', {
              p_profile_id: matchedOpponent.profile_id,
              p_column: 'coins',
              p_amount: -bet_amount
            });
          }

          let code = generateDuelCode();
          let attempts = 0;
          while (attempts < 10) {
            const { data: existing } = await supabase
              .from('duels')
              .select('id')
              .eq('code', code)
              .single();

            if (!existing) break;
            code = generateDuelCode();
            attempts++;
          }

          const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);

          const { data: duel, error: duelError } = await supabase
            .from('duels')
            .insert({
              code,
              host_user: matchedOpponent.profile_id, // Person who was waiting is the host
              num_questions,
              categories,
              difficulty,
              question_seed: questionSeed,
              bet_amount,
              bet_type,
              country: playerCountry,
            })
            .select()
            .single();

          if (duelError) throw duelError;

          // Record transactions for both players
          if (bet_amount > 0) {
            // Transaction for Joiner
            await supabase.from('duel_transactions').insert({
              duel_id: duel.id,
              user_id: profileId,
              amount: -bet_amount,
              transaction_type: 'bet'
            });

            if (joinerInsurance.premium > 0) {
              await supabase.from('duel_transactions').insert({
                duel_id: duel.id,
                user_id: profileId,
                amount: -joinerInsurance.premium,
                transaction_type: 'insurance_premium'
              });
            }

            // Transaction for Host
            await supabase.from('duel_transactions').insert({
              duel_id: duel.id,
              user_id: matchedOpponent.profile_id,
              amount: -bet_amount,
              transaction_type: 'bet'
            });
          }

          // ✅ Хост (matchedOpponent) уже добавлен через триггер auto_add_host_to_duel_players
          // Нам нужно добавить только присоединившегося игрока (profileId)
          await supabase
            .from('duel_players')
            .insert({
              duel_id: duel.id,
              user_id: profileId,
              is_host: false,
            });

          // Удаляем обе записи из очереди (соперник уже помечен как matched в RPC функции)
          await supabase
            .from('duel_matchmaking_queue')
            .delete()
            .in('id', [queueEntry.id, matchedOpponent.id]);

          // Автозапуск дуэли (логика из join_duel)
          try {
            console.log('[find_match] 🚀 AUTO-START: 2 players detected, starting duel...');

            // Auto-start: Load questions using efficient fetch
            console.log('[find_match] Loading questions for 2 real players...');
            // Need to fetch slightly more to allow for better shuffle? No, fetchRandomQuestions handles shuffle
            const selectedQuestions = await fetchRandomQuestions(
              supabase,
              num_questions,
              playerCountry,
              categories,
              difficulty,
              questionSeed
            );

            if (!selectedQuestions || selectedQuestions.length === 0) {
              console.error('[find_match] ❌ No questions found with filters');
              throw new Error('No questions found with filters');
            }

            console.log(`[find_match] ✅ Selected ${selectedQuestions.length} questions using seed ${questionSeed}`);

            // Insert duel questions
            const duelQuestions = selectedQuestions.map((q: { id: string; question_ru: string; question_es: string; question_en: string; image_url: string | null; difficulty?: string; answer_options: Array<{ id: string; text_ru: string; text_es: string; text_en: string; is_correct: boolean; position: number }> }, idx: number) => ({
              duel_id: duel.id,
              question_id: q.id,
              position: idx + 1,
              question_snapshot: {
                question_ru: q.question_ru,
                question_es: q.question_es,
                question_en: q.question_en,
                image_url: q.image_url,
                difficulty: q.difficulty,
                answer_options: q.answer_options.map((opt: { id: string; text_ru: string; text_es: string; text_en: string; is_correct: boolean; position: number }) => ({
                  id: opt.id,
                  text_ru: opt.text_ru,
                  text_es: opt.text_es,
                  text_en: opt.text_en,
                  is_correct: opt.is_correct,
                  position: opt.position,
                })),
              },
              correct_option_ids: q.answer_options
                .filter((opt: { is_correct: boolean }) => opt.is_correct)
                .map((opt: { id: string }) => opt.id),
            }));

            const { error: insertError } = await supabase
              .from('duel_questions')
              .insert(duelQuestions);

            if (insertError) {
              console.error('[find_match] ❌ Error inserting questions:', insertError);
              throw insertError;
            }

            // Update duel status to active
            await supabase
              .from('duels')
              .update({
                status: 'active',
                started_at: new Date().toISOString(),
              })
              .eq('id', duel.id);

            console.log('[find_match] ✅ Duel auto-started successfully');
          } catch (autoStartError) {
            console.error('[find_match] ❌ Error during auto-start:', autoStartError);
            // Не прерываем выполнение, дуэль создана, но не запущена
          }

          return new Response(JSON.stringify({
            duel,
            code,
            opponent_type: 'real',
            auto_started: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Шаг 3: Если не нашли реального соперника - создаем бота
        console.log('[find_match] ⚠️ No real opponent found, creating bot...');

        // 🛡️ Получаем win_streak игрока для адаптивной сложности бота (Anti-Farming Protection)
        const { data: playerProfileForBot, error: profileErrorForBot } = await supabase
          .from('profiles')
          .select('win_streak')
          .eq('id', profileId)
          .single();

        const winStreak = playerProfileForBot?.win_streak || 0;
        console.log(`[find_match] 🛡️ Player win streak: ${winStreak} (anti-farming protection)`);

        // СНАЧАЛА генерируем ID для бота, чтобы имя было детерминированным
        const botPlayerId = crypto.randomUUID();

        // Генерируем профиль бота
        const botProfile = generateBotProfile(playerLevel, winStreak, botPlayerId);
        console.log('[find_match] Generated bot profile:', botProfile);

        // Создаем дуэль с ботом
        const hostInsurance = bet_amount > 0 ? getInsuranceConfig(bet_amount, {
          enabled: insurance_enabled,
          rate: insurance_rate,
          coverageRate: insurance_coverage_rate
        }) : { enabled: false, rate: 0, coverageRate: 0, premium: 0 };

        if (bet_amount > 0) {
          await supabase.rpc('increment_profile_value', {
            p_profile_id: profileId,
            p_column: 'coins',
            p_amount: -(bet_amount + (hostInsurance.premium || 0))
          });
        }

        let code = generateDuelCode();
        let attempts = 0;
        while (attempts < 10) {
          const { data: existing } = await supabase
            .from('duels')
            .select('id')
            .eq('code', code)
            .single();

          if (!existing) break;
          code = generateDuelCode();
          attempts++;
        }

        const questionSeed = Math.floor(Date.now() * 1000 + Math.random() * 1000000);

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .insert({
            code,
            host_user: profileId,
            num_questions,
            categories,
            difficulty,
            question_seed: questionSeed,
            bet_amount,
            bet_type,
            country: playerCountry,
          })
          .select()
          .single();

        if (duelError) throw duelError;

        // Record bet transaction for human player in BOT duel
        if (bet_amount > 0) {
          await supabase.from('duel_transactions').insert({
            duel_id: duel.id,
            user_id: profileId,
            amount: -bet_amount,
            transaction_type: 'bet'
          });

          if (hostInsurance.premium > 0) {
            await supabase.from('duel_transactions').insert({
              duel_id: duel.id,
              user_id: profileId,
              amount: -hostInsurance.premium,
              transaction_type: 'insurance_premium'
            });
          }
        }

        // ✅ Хост уже добавлен через триггер auto_add_host_to_duel_players
        // (см. миграцию 20260207_auto_add_host_to_duel_players.sql)
        console.log('[find_match] Host already added by trigger, proceeding to add bot...');


        const { data: botPlayer, error: botError } = await supabase
          .from('duel_players')
          .insert({
            id: botPlayerId, // Используем заранее сгенерированный ID
            duel_id: duel.id,
            user_id: null, // Бот не имеет user_id
            is_host: false,
            is_bot: true,
            bot_difficulty: botProfile.difficulty,
            bot_name: botProfile.name, // Сохраняем имя бота в БД
            name: botProfile.name, // Также сохраняем в поле name для совместимости
          })
          .select()
          .single();

        if (botError) {
          console.error('[find_match] ❌ Error creating bot player:', botError);
          throw botError;
        }

        console.log('[find_match] ✅ Bot player created:', botPlayer.id);

        // Удаляем свою заявку из очереди (бот создан, реального соперника не нашли)
        await supabase
          .from('duel_matchmaking_queue')
          .delete()
          .eq('id', queueEntry.id);

        // Автозапуск дуэли с ботом (аналогично реальному сопернику)
        let autoStarted = false;
        try {
          console.log('[find_match] 🚀 AUTO-START with bot: starting duel...');

          // Auto-start with bot: Load questions
          console.log('[find_match] Loading questions for bot duel...');
          const tBotStart = Date.now();
          const selectedQuestions = await fetchRandomQuestions(
            supabase,
            num_questions,
            playerCountry,
            categories,
            difficulty,
            questionSeed
          );
          console.log(`[find_match] ⏱️ Bot questions loaded in ${Date.now() - tBotStart}ms`);

          if (!selectedQuestions || selectedQuestions.length === 0) {
            console.error('[find_match] ❌ No questions found via fetch');
            throw new Error('No questions found');
          }

          console.log(`[find_match] ✅ Bot duel: Selected ${selectedQuestions.length} random questions using seed ${questionSeed}`);

          // Insert duel questions
          const duelQuestions = selectedQuestions.map((q: any, idx: number) => ({
            duel_id: duel.id,
            question_id: q.id,
            position: idx + 1,
            question_snapshot: {
              question_ru: q.question_ru,
              question_es: q.question_es,
              question_en: q.question_en,
              image_url: q.image_url,
              difficulty: q.difficulty,
              answer_options: (q.answer_options || []).map((opt: any) => ({
                id: opt.id,
                text_ru: opt.text_ru,
                text_es: opt.text_es,
                text_en: opt.text_en,
                is_correct: opt.is_correct,
                position: opt.position,
              })),
            },
            correct_option_ids: (q.answer_options || [])
              .filter((opt: any) => opt.is_correct)
              .map((opt: any) => opt.id),
          }));

          const { error: insertError } = await supabase
            .from('duel_questions')
            .insert(duelQuestions);

          if (insertError) {
            console.error('[find_match] ❌ Error inserting questions:', insertError);
            throw insertError;
          }

          // Update duel status to active
          await supabase
            .from('duels')
            .update({
              status: 'active',
              started_at: new Date().toISOString(),
            })
            .eq('id', duel.id);

          // Create start notification for BOT duel
          try {
            await createNotification({
              duel_id: duel.id,
              recipient_profile_id: profileId, // Уведомляем человека
              type: 'start',
              metadata: {
                opponent_name: botProfile.name
              }
            }, profileId, supabase);
          } catch (notifErr) {
            console.error('[find_match] Error creating bot start notification:', notifErr);
          }

          console.log('[find_match] ✅ Duel with bot auto-started successfully');
          autoStarted = true;
        } catch (autoStartError) {
          console.error('[find_match] ❌ Error during auto-start with bot:', autoStartError);
          // Не прерываем выполнение, дуэль создана, но не запущена
        }

        return new Response(JSON.stringify({
          duel: { ...duel, status: autoStarted ? 'active' : 'waiting' },
          code,
          opponent_type: 'bot',
          bot_name: botProfile.name,
          bot_avatar: botProfile.avatar,
          auto_started: autoStarted
        }), ...{
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'cancel_duel': {
        const { duel_id } = params;

        if (!duel_id) {
          return new Response(JSON.stringify({ error: 'duel_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get duel details
        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('*')
          .eq('id', duel_id)
          .single();

        if (duelError || !duel) {
          return new Response(JSON.stringify({ error: 'Duel not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if user is the host
        if (duel.host_user !== profileId) {
          return new Response(JSON.stringify({ error: 'Only the host can cancel the duel' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if duel is still waiting (not started)
        if (duel.status !== 'waiting') {
          return new Response(JSON.stringify({ error: 'Cannot cancel duel that has already started or finished' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if opponent already joined
        const { data: players, error: playersError } = await supabase
          .from('duel_players')
          .select('id, user_id')
          .eq('duel_id', duel_id);

        if (playersError) {
          return new Response(JSON.stringify({ error: 'Failed to check players' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (players && players.length > 1) {
          return new Response(JSON.stringify({ error: 'Cannot cancel duel after opponent joined' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Refund bet to host
        if (duel.bet_amount > 0) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('coins')
            .eq('id', profileId)
            .single();

          if (!profileError && profile) {
            await supabase.rpc('increment_profile_value', {
              p_profile_id: profileId,
              p_column: 'coins',
              p_amount: duel.bet_amount
            });

            // Record refund transaction
            await supabase
              .from('duel_transactions')
              .insert({
                duel_id: duel_id,
                user_id: profileId,
                amount: duel.bet_amount,
                transaction_type: 'refund'
              });

            const { data: betRow } = await supabase
              .from('duel_bets')
              .select('host_insurance_premium')
              .eq('duel_id', duel_id)
              .maybeSingle();

            if (betRow?.host_insurance_premium) {
              await supabase.rpc('increment_profile_value', {
                p_profile_id: profileId,
                p_column: 'coins',
                p_amount: betRow.host_insurance_premium
              });
              await supabase
                .from('duel_transactions')
                .insert({
                  duel_id: duel_id,
                  user_id: profileId,
                  amount: betRow.host_insurance_premium,
                  transaction_type: 'insurance_refund'
                });
            }

            await supabase
              .from('duel_bets')
              .update({ status: 'cancelled' })
              .eq('duel_id', duel_id);
          }
        }

        // Update duel status to cancelled
        await supabase
          .from('duels')
          .update({ status: 'cancelled' })
          .eq('id', duel_id);

        return new Response(JSON.stringify({
          success: true,
          refunded: duel.bet_amount
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_duel_now': {
        const { duel_id } = params;
        if (!duel_id) {
          console.warn('[start_duel_now] ⚠️ Missing duel_id');
          return new Response(JSON.stringify({ error: 'Missing duel_id' }), { status: 400, headers: corsHeaders });
        }

        console.log('[start_duel_now] 🚀 Manual start for duel:', duel_id, 'by:', profileId);

        // 1. Get duel info
        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('*')
          .eq('id', duel_id)
          .single();

        if (duelError || !duel) {
          console.warn('[start_duel_now] ⚠️ Duel not found');
          return new Response(JSON.stringify({ error: 'Duel not found' }), { status: 404, headers: corsHeaders });
        }

        if (duel.status !== 'waiting') {
          console.warn('[start_duel_now] ⚠️ Duel not in waiting status:', duel.status);
          return new Response(JSON.stringify({ error: 'Duel already started' }), { status: 400, headers: corsHeaders });
        }

        // 2. Generate questions
        console.log('[start_duel_now] Loading questions via efficient fetch...');

        const selectedQuestions = await fetchRandomQuestions(
          supabase,
          duel.num_questions || 10,
          duel.country || 'spain',
          duel.categories,
          duel.difficulty,
          duel.question_seed
        );

        if (!selectedQuestions || selectedQuestions.length === 0) {
          console.error('[start_duel_now] ❌ No questions found');
          return new Response(JSON.stringify({ error: 'Failed to find questions' }), { status: 500, headers: corsHeaders });
        }

        const duelQuestions = selectedQuestions.map((q, idx) => ({
          duel_id: duel.id,
          question_id: q.id,
          position: idx + 1,
          question_snapshot: {
            question_ru: q.question_ru,
            question_es: q.question_es,
            question_en: q.question_en,
            image_url: q.image_url,
            answer_options: q.answer_options || [],
            difficulty: q.difficulty,
          },
          correct_option_ids: (q.answer_options || [])
            .filter((opt: { is_correct: boolean }) => opt.is_correct)
            .map((opt: { id: string }) => opt.id),
        }));

        // 🔍 DEBUG: Log correct_option_ids
        console.log('[start_duel_now] 🔍 DEBUG: Sample duelQuestion:', {
          question_id: duelQuestions[0]?.question_id,
          answer_options_count: duelQuestions[0]?.question_snapshot?.answer_options?.length,
          correct_option_ids: duelQuestions[0]?.correct_option_ids
        });

        const { error: insertError } = await supabase.from('duel_questions').insert(duelQuestions);
        if (insertError) {
          console.error('[start_duel_now] ❌ Error inserting questions:', insertError);
          return new Response(JSON.stringify({ error: 'Failed to save questions' }), { status: 500, headers: corsHeaders });
        }

        // 3. Update status & RESET SCORES (Critical for starting with 0)
        console.log('[start_duel_now] Resetting player scores to 0...');
        await supabase.from('duel_players').update({ score: 0, correct_count: 0, is_finished: false }).eq('duel_id', duel.id);
        await supabase.from('duels').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', duel.id);

        console.log('[start_duel_now] ✅ Duel started manually!');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join_duel': {
        const validated = joinDuelSchema.parse(params);
        let { code, insurance_enabled, insurance_rate, insurance_coverage_rate, security_context } = validated;

        // Normalize code to uppercase and ensure it's exactly 4 characters
        code = code.toUpperCase().trim().slice(0, 4);

        // Validate length after normalization
        if (code.length !== 4) {
          return new Response(JSON.stringify({ error: 'Code must be exactly 4 characters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('*')
          .eq('code', code)
          .maybeSingle();

        if (duelError) {
          console.error('[join_duel] ❌ Error finding duel:', duelError);
          throw duelError;
        }

        // 🛡️ AUTO-CREATE FALLBACK: If duel not found, create it on the fly!
        // This handles cases where the bot generates a code but doesn't store it yet.
        if (!duel) {
          console.log('[join_duel] ⚠️ Duel not found, auto-creating with code:', code);
          const { data: newDuel, error: createError } = await supabase
            .from('duels')
            .insert({
              code,
              host_user: profileId,
              status: 'waiting',
              num_questions: 10,
              difficulty: 'mix',
              question_seed: Math.floor(Math.random() * 1000000),
              bet_amount: 0,
              bet_type: 'none'
            })
            .select()
            .single();

          if (createError) {
            console.error('[join_duel] ❌ Error auto-creating duel:', createError);
            throw createError;
          }

          duel = newDuel;

          // КРИТИЧНО: Добавляем хоста в duel_players, иначе дуэль будет пустой
          const { error: hostPlayerError } = await supabase
            .from('duel_players')
            .insert({
              duel_id: duel.id,
              user_id: profileId,
              is_host: true
            });

          if (hostPlayerError) {
            console.error('[join_duel] ❌ Error adding host player during auto-create:', hostPlayerError);
          }

          console.log('[join_duel] ✅ Auto-created duel and added host:', duel.id);

          // Возвращаем успех сразу, так как мы уже добавили игрока
          return new Response(JSON.stringify({
            duel,
            player: { user_id: profileId, is_host: true },
            auto_started: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if duel is still waiting
        if (duel.status !== 'waiting') {
          return new Response(JSON.stringify({ error: 'Duel already started or finished' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 🛡️ FIX: If user is trying to join their own duel or is already in it
        if (duel.host_user === profileId) {
          console.log('[join_duel] 🔄 User is host, redirecting to lobby');
          const { data: hostPlayer } = await supabase
            .from('duel_players')
            .select('*')
            .eq('duel_id', duel.id)
            .eq('user_id', profileId)
            .maybeSingle();

          return new Response(JSON.stringify({
            duel,
            player: hostPlayer || { user_id: profileId, is_host: true },
            auto_started: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if user is already in this duel
        const { data: existingPlayer } = await supabase
          .from('duel_players')
          .select('*')
          .eq('duel_id', duel.id)
          .eq('user_id', profileId)
          .single();

        if (existingPlayer) {
          return new Response(JSON.stringify({ error: 'You are already in this duel' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if joining player has enough coins for bet
        const betAmount = duel.bet_amount || 0;
        if (betAmount > 0) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('coins')
            .eq('id', profileId)
            .single();

          if (profileError || !profile) {
            return new Response(JSON.stringify({ error: 'Profile not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const opponentInsurance = getInsuranceConfig(betAmount, {
            enabled: insurance_enabled,
            rate: insurance_rate,
            coverageRate: insurance_coverage_rate
          });
          const requiredCoins = betAmount + (opponentInsurance.premium || 0);

          if ((profile.coins || 0) < requiredCoins) {
            return new Response(JSON.stringify({ error: `Insufficient coins for bet. You need ${requiredCoins} coins but only have ${profile.coins || 0}` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Deduct bet and premium
          await supabase.rpc('increment_profile_value', {
            p_profile_id: profileId,
            p_column: 'coins',
            p_amount: -requiredCoins
          });

          await supabase
            .from('duel_transactions')
            .insert({
              duel_id: duel.id,
              user_id: profileId,
              amount: -betAmount,
              transaction_type: 'bet'
            });

          if (opponentInsurance.premium > 0) {
            await supabase
              .from('duel_transactions')
              .insert({
                duel_id: duel.id,
                user_id: profileId,
                amount: -opponentInsurance.premium,
                transaction_type: 'insurance_premium'
              });
          }

          const { data: existingBet } = await supabase
            .from('duel_bets')
            .select('*')
            .eq('duel_id', duel.id)
            .maybeSingle();

          if (existingBet) {
            await supabase
              .from('duel_bets')
              .update({
                opponent_user: profileId,
                opponent_confirmed: true,
                status: 'confirmed',
                opponent_insurance_enabled: opponentInsurance.enabled,
                opponent_insurance_rate: opponentInsurance.rate,
                opponent_insurance_premium: opponentInsurance.premium,
                opponent_coverage_rate: opponentInsurance.coverageRate,
                ip_hash_opponent: security_context?.ip_hash || null
              })
              .eq('duel_id', duel.id);
          } else {
            await supabase
              .from('duel_bets')
              .insert({
                duel_id: duel.id,
                host_user: duel.host_user,
                opponent_user: profileId,
                bet_amount: betAmount,
                currency: 'coins',
                host_confirmed: true,
                opponent_confirmed: true,
                status: 'confirmed',
                opponent_insurance_enabled: opponentInsurance.enabled,
                opponent_insurance_rate: opponentInsurance.rate,
                opponent_insurance_premium: opponentInsurance.premium,
                opponent_coverage_rate: opponentInsurance.coverageRate,
                ip_hash_opponent: security_context?.ip_hash || null
              });
          }
        }

        console.log('[Duel Manager] Adding player to duel. DuelId:', duel.id, 'ProfileId:', profileId);

        // Add player to duel using correct user_id (which is profile.id)
        const { data: player, error: playerError } = await supabase
          .from('duel_players')
          .insert({
            duel_id: duel.id,
            user_id: profileId,  // This is profile.id
            is_host: false,
          })
          .select()
          .single();

        if (playerError) {
          console.error('[Duel Manager] ❌ Error adding player:', playerError);
          console.error('[Duel Manager] Error details:', JSON.stringify(playerError, null, 2));
          throw playerError;
        }

        console.log('[Duel Manager] ✅ Player created:', player?.id);

        // Check if we now have 2 players - auto-start duel
        const { data: allPlayers, error: playersCheckError } = await supabase
          .from('duel_players')
          .select('id, user_id, is_bot')
          .eq('duel_id', duel.id);

        if (playersCheckError) {
          console.error('[join_duel] ❌ Error checking players:', playersCheckError);
        }

        console.log('[join_duel] ✅ Player count check:', {
          count: allPlayers?.length,
          players: allPlayers?.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot })),
          duel_id: duel.id
        });

        // КРИТИЧНО: Проверяем, что есть ровно 2 игрока (не ботов) для автозапуска
        const realPlayers = allPlayers?.filter(p => !p.is_bot) || [];
        const totalPlayers = allPlayers?.length || 0;

        if (realPlayers.length === 2 && totalPlayers >= 2) {
          console.log('[join_duel] 🚀 AUTO-START: 2 real players detected, starting duel...');

          try {
            // Auto-start: Load questions
            console.log('[join_duel] Loading questions via efficient fetch...');
            const selectedQuestions = await fetchRandomQuestions(
              supabase,
              duel.num_questions,
              duel.country || 'spain',
              duel.categories,
              duel.difficulty,
              duel.question_seed
            );

            if (!selectedQuestions || selectedQuestions.length === 0) {
              console.error('[join_duel] ❌ No questions found via fetch');
              throw new Error('No questions found');
            }

            console.log(`[join_duel] ✅ Selected ${selectedQuestions.length} random questions using seed ${duel.question_seed}`);

            // Insert duel questions with randomly selected set
            const duelQuestions = selectedQuestions.map((q, idx) => {
              const snapshot = {
                question_ru: q.question_ru,
                question_es: q.question_es,
                question_en: q.question_en,
                image_url: q.image_url,
                answer_options: q.answer_options || [],
                difficulty: q.difficulty,
              };

              return {
                duel_id: duel.id,
                question_id: q.id,
                position: idx + 1,
                question_snapshot: snapshot,
                correct_option_ids: (q.answer_options || [])
                  .filter((opt: { is_correct: boolean }) => opt.is_correct)
                  .map((opt: { id: string }) => opt.id),
              };
            });

            console.log('[join_duel] Inserting duel questions...', duelQuestions.length);
            const { error: insertError } = await supabase.from('duel_questions').insert(duelQuestions);

            if (insertError) {
              console.error('[join_duel] ❌ Error inserting duel questions:', insertError);
              throw insertError;
            }

            console.log('[join_duel] ✅ Duel questions inserted successfully');

            // Update duel status
            console.log('[join_duel] Updating duel status to active...');
            const { error: updateError } = await supabase
              .from('duels')
              .update({ status: 'active', started_at: new Date().toISOString() })
              .eq('id', duel.id);

            if (updateError) {
              console.error('[join_duel] ❌ Error updating duel status:', updateError);
              throw updateError;
            }

            console.log('[join_duel] ✅✅✅ Duel status updated to ACTIVE successfully!');

            // Create start notification
            // ВАЖНО: Передаем имя соперника в metadata для консистентности уведомления
            try {
              // Для поиска соперника (реального игрока)
              const realOpponent = realPlayers.find(p => p.user_id !== profileId);
              let opponentDisplayName = 'Игрок';

              if (realOpponent) {
                const { data: oppProfile } = await supabase
                  .from('profiles')
                  .select('first_name, username')
                  .eq('id', realOpponent.user_id)
                  .single();
                opponentDisplayName = oppProfile?.first_name || oppProfile?.username || 'Игрок';
              }

              await createNotification({
                duel_id: duel.id,
                type: 'start',
                metadata: {
                  opponent_name: opponentDisplayName
                }
              }, profileId, supabase);

              console.log('[join_duel] ✅ Start notification created successfully');
            } catch (notifErr: unknown) {
              console.error('[join_duel] Error creating start notification:', notifErr);
            }

            console.log('[join_duel] ✅ Returning response with auto_started: true');
            return new Response(
              JSON.stringify({ duel: { ...duel, status: 'active' }, player, auto_started: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch (autoStartError: unknown) {
            console.error('[join_duel] ❌❌❌ CRITICAL ERROR in auto-start:', autoStartError);

            console.warn('[join_duel] ⚠️ Auto-start failed, but player was added. Duel remains in "waiting" status.');
            return new Response(JSON.stringify({
              duel,
              player,
              auto_started: false,
              warning: 'Failed to auto-start duel: ' + (autoStartError instanceof Error ? autoStartError.message : 'Unknown error')
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }


        console.log('[join_duel] ⏳ Only 1 real player, waiting for opponent', {
          realPlayersCount: realPlayers.length,
          totalPlayersCount: totalPlayers,
          players: allPlayers?.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot }))
        });
        return new Response(JSON.stringify({ duel, player, auto_started: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_duel': {
        const { duel_id } = params;

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('*, duel_players(*)')
          .eq('id', duel_id)
          .single();

        if (duelError || !duel) throw new Error('Duel not found');

        if (duel.host_user !== profileId) {
          return new Response(JSON.stringify({ error: 'Only host can start' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get questions using seed and efficient fetch
        const selectedQuestions = await fetchRandomQuestions(
          supabase,
          duel.num_questions,
          duel.country || 'spain',
          duel.categories,
          duel.difficulty,
          duel.question_seed
        );

        if (!selectedQuestions || selectedQuestions.length === 0) {
          throw new Error('No questions available');
        }

        // Create question snapshots
        const duelQuestions = selectedQuestions.map((q: any, idx: number) => ({
          duel_id: duel.id,
          question_id: q.id,
          position: idx + 1,
          question_snapshot: {
            question_ru: q.question_ru,
            question_es: q.question_es,
            question_en: q.question_en,
            image_url: q.image_url,
            answer_options: q.answer_options || [],
            difficulty: q.difficulty,
          },
          correct_option_ids: (q.answer_options || [])
            .filter((opt: any) => opt.is_correct)
            .map((opt: any) => opt.id),
        }));

        await supabase.from('duel_questions').insert(duelQuestions);

        // Update duel status & RESET SCORES
        console.log('[start_duel] Resetting player scores matching duel_id:', duel.id);
        await supabase.from('duel_players').update({ score: 0, correct_count: 0, is_finished: false }).eq('duel_id', duel.id);

        await supabase
          .from('duels')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', duel.id);

        // Create start notification for opponent (second player)
        // Wrap in try-catch to prevent notification errors from breaking duel start
        try {
          const notifResult = await createNotification({
            duel_id: duel.id,
            type: 'start',
            metadata: {}
          }, profileId, supabase);

          if (!notifResult) {
            console.warn('[start_duel] Failed to create start notification - continuing anyway');
          } else {
            console.log('[start_duel] ✅ Start notification created successfully');
          }
        } catch (notifErr: unknown) {
          console.error('[start_duel] Error creating start notification:', notifErr);
          console.error('[start_duel] Notification error details:', JSON.stringify(notifErr, null, 2));
          // Continue anyway - notification failure shouldn't block duel start
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'submit_answer': {
        const validated = submitAnswerSchema.parse(params);
        const { duel_id, duel_question_id, selected_option_id, time_taken_ms, latency_ms, boost_used, is_timeout } = validated;

        // ОПТИМИЗАЦИЯ: Загружаем игрока и вопрос параллельно
        const [playerRes, questionRes] = await Promise.all([
          supabase
            .from('duel_players')
            .select('*')
            .eq('duel_id', duel_id)
            .eq('user_id', profileId)
            .single(),
          supabase
            .from('duel_questions')
            .select('*')
            .eq('id', duel_question_id)
            .single()
        ]);

        const player = playerRes.data;
        const question = questionRes.data;

        if (!player) throw new Error('Player not found');
        if (!question) throw new Error('Question not found');

        // ОПТИМИЗАЦИЯ: Проверяем существующий ответ и получаем историю ДЛЯ ОБОИХ (combo и streak) ОДНИМ ЗАПРОСОМ
        // fetch answers for combo AND check idempotency
        const { data: allAnswers, error: answersError } = await supabase
          .from('duel_answers')
          .select('id, is_correct, is_skipped, duel_question_id, points_awarded, selected_option_id')
          .eq('player_id', player.id)
          .eq('duel_id', duel_id)
          .order('created_at', { ascending: false });

        if (answersError) throw answersError;

        // Проверка на идемпотентность (уже отвечено)
        // КРИТИЧНО: mark_question_started создаёт placeholder-строку с selected_option_id=NULL, is_skipped=false.
        // Такие строки НЕ считаются реальным ответом — игнорируем их в idempotency-проверке.
        // Реальный ответ: selected_option_id != NULL (выбрал вариант) ИЛИ is_skipped = true (таймаут/пропуск).
        const existingAnswer = allAnswers?.find(a =>
          a.duel_question_id === duel_question_id &&
          (a.selected_option_id !== null || a.is_skipped === true)
        );

        if (existingAnswer) {
          console.log('[submit_answer] 🔄 Question already answered, returning current state (idempotency)');

          // Рассчитываем комбо на момент ТОГО ответа (или текущее)
          let currentCombo = 0;
          for (const ans of allAnswers) {
            if (ans.is_correct && !ans.is_skipped) {
              currentCombo++;
            } else {
              break;
            }
          }

          return new Response(JSON.stringify({
            success: true,
            is_correct: existingAnswer.is_correct, // 🔥 CRITICAL: Return actual answer result
            new_score: player.score,
            combo: currentCombo,
            points_awarded: existingAnswer.points_awarded,
            is_already_answered: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 🔥 FIX v2: Используем correct_option_ids из duel_questions, а НЕ из answer_options!
        // Причина: selected_option_id клиент берёт из question_snapshot (снимок на момент создания дуэли).
        // Если вопросы были переимпортированы, ID в answer_options уже другие и НИКОГДА не совпадут.
        // correct_option_ids записывается из ТОГО ЖЕ снимка → гарантированное совпадение.
        // correct_option_ids — JSONB column, Supabase возвращает как parsed JSON (массив строк)
        const rawCorrectIds = question.correct_option_ids;
        // Гарантируем что это массив строк (JSONB может вернуть разные типы)
        const correctOptionIds: string[] = Array.isArray(rawCorrectIds)
          ? rawCorrectIds.map(String)
          : typeof rawCorrectIds === 'string'
            ? [rawCorrectIds]
            : [];

        const isSkipped = !selected_option_id || is_timeout;
        const selectedStr = selected_option_id ? String(selected_option_id) : '';
        const isCorrect = !isSkipped && selectedStr
          ? correctOptionIds.includes(selectedStr)
          : false;

        console.log('[submit_answer] 🔍 Answer check:', {
          selected: selected_option_id,
          selectedType: typeof selected_option_id,
          rawCorrectIds: rawCorrectIds,
          rawType: typeof rawCorrectIds,
          isArray: Array.isArray(rawCorrectIds),
          correctOptionIds,
          isCorrect,
          question_id: question.question_id,
          duel_question_id,
        });

        // Calculate combo BEFORE this answer (consecutive correct answers from history)
        let combo = 0;
        if (allAnswers && allAnswers.length > 0) {
          for (const answer of allAnswers) {
            if (answer.is_correct === true && answer.is_skipped === false) {
              combo++;
            } else {
              break;
            }
          }
        }

        // Calculate error streak BEFORE this answer
        let previousErrorStreak = 0;
        if (allAnswers && allAnswers.length > 0) {
          for (const answer of allAnswers) {
            if (answer.is_correct === false) {
              previousErrorStreak++;
            } else {
              break;
            }
          }
        }

        console.log('[submit_answer] Stats:', {
          comboBefore: combo,
          previousErrorStreak,
          isCorrect,
          isSkipped
        });

        const adjustedTime = Math.max(0, time_taken_ms - (latency_ms || 0));
        const timeLimit = 60000;
        const timeRemain = Math.max(0, timeLimit - adjustedTime);

        const difficulty = (question.question_snapshot as any).difficulty || 'medium';
        const points = isCorrect ? calculateScore(difficulty, timeRemain, timeLimit, combo) : 0;

        // ОПТИМИЗАЦИЯ: Выполняем запись ответа и обновление игрока параллельно
        const newScore = player.score + points;
        const newCorrectCount = player.correct_count + (isCorrect ? 1 : 0);

        const [insertRes, updateRes] = await Promise.all([
          // UPSERT: mark_question_started создаёт placeholder-строку заранее.
          // Если строка уже есть (placeholder) — обновляем её с реальным ответом.
          // Если строки нет (mark_question_started не вызывался) — вставляем новую.
          supabase.from('duel_answers').upsert({
            duel_id,
            player_id: player.id,
            duel_question_id,
            selected_option_id: selected_option_id || null,
            is_correct: isCorrect,
            is_skipped: isSkipped,
            time_taken_ms: adjustedTime,
            points_awarded: points,
            combo_at_time: combo,
            boost_used: boost_used || null,
          }, { onConflict: 'player_id,duel_question_id' }),
          supabase
            .from('duel_players')
            .update({
              score: newScore,
              correct_count: newCorrectCount,
            })
            .eq('id', player.id)
        ]);

        if (insertRes.error) throw insertRes.error;
        if (updateRes.error) throw updateRes.error;

        const finalCombo = isCorrect && !isSkipped ? combo + 1 : 0;
        const currentErrorStreak = isCorrect ? 0 : previousErrorStreak + 1;

        // Create notification without blocking result if possible, but for stability we await
        // However, we can optimize createNotification internal logic later
        if (!isSkipped) {
          // Fetch num_questions only if needed for notification
          const { data: duel } = await supabase
            .from('duels')
            .select('num_questions')
            .eq('id', duel_id)
            .single();

          const totalAnswers = (allAnswers?.length || 0) + 1;
          const numQuestions = duel?.num_questions || 10;
          const progress = duel ? Math.round((totalAnswers / numQuestions) * 100) : 0;

          // ОПТИМИЗАЦИЯ: Сразу считаем, закончил ли оппонент
          // ВНИМАНИЕ: Оппонент - это НЕ тот, кто сейчас отвечает.
          // Но в createNotification мы передадим данные СЕНДЕРА (нас).

          try {
            await createNotification({
              duel_id,
              type: isCorrect ? 'answer' : 'progress',
              metadata: {
                is_correct: isCorrect,
                question_number: question.position,
                combo: finalCombo >= 3 ? finalCombo : undefined,
                error_streak: currentErrorStreak >= 2 ? currentErrorStreak : undefined,
                progress: progress >= 25 && progress % 25 === 0 ? progress : undefined,
                opponent_name: player.name || undefined, // Передаем наше имя (сендера)
                num_questions: numQuestions
              }
            }, profileId, supabase);
          } catch (err) {
            console.error('[submit_answer] Notification failed:', err);
          }
        }


        // Bot check
        const { data: botPlayer } = await supabase
          .from('duel_players')
          .select('id, is_bot')
          .eq('duel_id', duel_id)
          .eq('is_bot', true)
          .maybeSingle();

        return new Response(JSON.stringify({
          success: true,
          is_correct: isCorrect, // 🔥 CRITICAL: Client needs this to show correct/wrong effects!
          new_score: newScore,
          combo: finalCombo,
          points_awarded: points,
          has_bot: !!botPlayer
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'bot_answer': {
        // Обработка ответа бота на вопрос
        const { duel_id, duel_question_id } = params;

        // Находим бота в дуэли
        const { data: botPlayer } = await supabase
          .from('duel_players')
          .select('id, bot_difficulty, score, correct_count, bot_name, name')
          .eq('duel_id', duel_id)
          .eq('is_bot', true)
          .single();

        if (!botPlayer) {
          return new Response(JSON.stringify({ error: 'Bot not found in this duel' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Проверяем, не ответил ли бот уже
        const { data: existingAnswer } = await supabase
          .from('duel_answers')
          .select('id')
          .eq('player_id', botPlayer.id)
          .eq('duel_question_id', duel_question_id)
          .single();

        if (existingAnswer) {
          return new Response(JSON.stringify({ error: 'Bot already answered' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Получаем вопрос
        const { data: question } = await supabase
          .from('duel_questions')
          .select('*')
          .eq('id', duel_question_id)
          .single();

        if (!question) {
          return new Response(JSON.stringify({ error: 'Question not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // КРИТИЧНО: Проверяем, что бот отвечает строго по порядку
        // Бот может ответить только на следующий вопрос по position
        const { data: botAnswers } = await supabase
          .from('duel_answers')
          .select('duel_question_id')
          .eq('duel_id', duel_id)
          .eq('player_id', botPlayer.id);

        const answeredQuestionIds = new Set((botAnswers || []).map((a: { duel_question_id: string }) => a.duel_question_id));

        // Получаем все вопросы дуэли, отсортированные по position
        const { data: allQuestions } = await supabase
          .from('duel_questions')
          .select('id, position')
          .eq('duel_id', duel_id)
          .order('position', { ascending: true });

        if (allQuestions && allQuestions.length > 0) {
          // Находим следующий вопрос по порядку (минимальный position среди неотвеченных)
          let nextQuestionPosition: number | null = null;
          for (const q of allQuestions) {
            if (!answeredQuestionIds.has(q.id)) {
              nextQuestionPosition = q.position;
              break;
            }
          }

          // Если пытаемся ответить не на следующий вопрос - отклоняем
          if (nextQuestionPosition !== null && question.position !== nextQuestionPosition) {
            console.warn(`[bot_answer] ⚠️ Bot tried to answer question ${question.position}, but next question is ${nextQuestionPosition}`);
            return new Response(JSON.stringify({
              error: `Bot must answer questions in order. Expected position ${nextQuestionPosition}, got ${question.position}`
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        const questionDifficulty = (question.question_snapshot as any).difficulty || 'medium';
        const botDifficulty = botPlayer.bot_difficulty || 'medium';

        // Симулируем ответ бота
        const botSimulation = simulateBotAnswer(botDifficulty, questionDifficulty);

        // 🔥 FIX: Get correct answer from answer_options directly (same as player)
        const allOptions = (question.question_snapshot as any).answer_options || [];

        if (allOptions.length === 0) {
          return new Response(JSON.stringify({ error: 'Question has no answer options' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Find correct option
        const correctOption = allOptions.find((opt: any) => opt.is_correct);
        const wrongOptions = allOptions.filter((opt: any) => !opt.is_correct);

        let selectedOptionId: string | null = null;
        if (botSimulation.willBeCorrect && correctOption) {
          // Bot answers correctly
          selectedOptionId = correctOption.id;
        } else {
          // Bot answers incorrectly - choose random wrong option
          if (wrongOptions.length > 0) {
            selectedOptionId = wrongOptions[Math.floor(Math.random() * wrongOptions.length)].id;
          } else {
            // Fallback: if no wrong options, choose any option
            selectedOptionId = allOptions[Math.floor(Math.random() * allOptions.length)].id;
          }
        }

        // КРИТИЧНО: Бот НИКОГДА не пропускает вопросы
        if (!selectedOptionId) {
          console.error('[bot_answer] ❌ CRITICAL: No option selected, selecting random option as fallback');
          selectedOptionId = allOptions[Math.floor(Math.random() * allOptions.length)].id;
        }

        const isCorrect = selectedOptionId === correctOption?.id;
        const isSkipped = false; // Бот никогда не пропускает вопросы

        console.log('[bot_answer] 🤖 Bot answer:', {
          selected: selectedOptionId,
          correct: correctOption?.id,
          isCorrect,
          willBeCorrect: botSimulation.willBeCorrect
        });

        // Вычисляем очки (бот не получает комбо бонусы для упрощения)
        const timeLimit = 60000;

        // Естественное время ответа бота зависит от сложности вопроса и бота
        // Легкие вопросы - быстрее, сложные - медленнее
        // Сильные боты отвечают быстрее на легкие вопросы
        const difficultyTimeModifiers = {
          easy: { min: 8000, max: 20000 },    // 8-20 секунд для легких
          medium: { min: 15000, max: 35000 },  // 15-35 секунд для средних
          hard: { min: 25000, max: 50000 },   // 25-50 секунд для сложных
        };

        const timeRange = difficultyTimeModifiers[questionDifficulty as keyof typeof difficultyTimeModifiers] || difficultyTimeModifiers.medium;

        // Сильные боты отвечают быстрее
        const botSpeedModifier = {
          easy: 1.0,    // Без изменений
          medium: 0.9,  // На 10% быстрее
          hard: 0.8,    // На 20% быстрее
          insane: 0.7, // На 30% быстрее
        }[botDifficulty] || 1.0;

        const adjustedMin = Math.floor(timeRange.min * botSpeedModifier);
        const adjustedMax = Math.floor(timeRange.max * botSpeedModifier);
        const timeRemain = Math.floor(Math.random() * (adjustedMax - adjustedMin) + adjustedMin);

        // Ограничиваем время ответа разумными пределами (не меньше 5 секунд, не больше 55 секунд)
        const clampedTimeRemain = Math.max(5000, Math.min(55000, timeRemain));

        const points = isCorrect ? calculateScore(questionDifficulty, clampedTimeRemain, timeLimit, 0) : 0;

        console.log(`[bot_answer] ⏱️ Bot answer timing:`, {
          botDifficulty,
          questionDifficulty,
          timeRemain: clampedTimeRemain,
          timeTaken: timeLimit - clampedTimeRemain,
          isCorrect,
          points
        });

        // Сохраняем ответ бота
        await supabase.from('duel_answers').insert({
          duel_id,
          player_id: botPlayer.id,
          duel_question_id,
          selected_option_id: selectedOptionId,
          is_correct: isCorrect,
          is_skipped: isSkipped,
          time_taken_ms: timeLimit - timeRemain,
          points_awarded: points,
          combo_at_time: 0,
          boost_used: null,
        });

        // Обновляем счет бота
        const newBotScore = botPlayer.score + points;
        await supabase
          .from('duel_players')
          .update({
            score: newBotScore,
            correct_count: botPlayer.correct_count + (isCorrect ? 1 : 0),
          })
          .eq('id', botPlayer.id);

        // Создаем уведомление для игрока о прогрессе бота (как в реальных дуэлях)
        // Всегда уведомляем о каждом ответе бота
        console.log('[bot_answer] Creating progress notification for human player');

        const { data: duel } = await supabase
          .from('duels')
          .select('num_questions')
          .eq('id', duel_id)
          .single();

        // Total answers including current one
        const { count: botAnswersCount } = await supabase
          .from('duel_answers')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', botPlayer.id)
          .eq('duel_id', duel_id);

        const totalAnswers = (botAnswersCount || 0);
        const progress = duel ? Math.round((totalAnswers / duel.num_questions) * 100) : 0;

        // Находим реального игрока (не бота) - ищем игрока с user_id (не null)
        const { data: humanPlayer } = await supabase
          .from('duel_players')
          .select('user_id')
          .eq('duel_id', duel_id)
          .not('user_id', 'is', null)
          .eq('is_bot', false)
          .single();

        // Сохраняем humanPlayer для использования ниже
        const savedHumanPlayer = humanPlayer;

        if (savedHumanPlayer?.user_id) {
          const botName = botPlayer.bot_name || 'Бот';

          console.log('[bot_answer] Notification metadata:', {
            is_correct: isCorrect,
            question_number: question.position,
            progress,
            totalAnswers,
            bot_name: botName
          });

          // Уведомляем о каждом ответе бота
          // Используем тип 'answer' для правильных ответов, 'progress' для неправильных
          try {
            await createNotification({
              duel_id,
              recipient_profile_id: humanPlayer.user_id, // Явно указываем получателя
              type: isCorrect ? 'answer' : 'progress',
              metadata: {
                is_correct: isCorrect,
                question_number: question.position,
                progress: progress >= 25 && progress % 25 === 0 ? progress : undefined, // Процент только на milestones (25%, 50%, 75%)
                opponent_name: botName, // Имя бота для правильного отображения в уведомлении
              }
            }, profileId, supabase);
            console.log('[bot_answer] ✅ Progress notification created successfully');
          } catch (err) {
            console.error('[bot_answer] Error creating progress notification:', err);
          }
        } else {
          console.warn('[bot_answer] ⚠️ Human player not found in duel');
        }

        // КРИТИЧНО: Проверяем, закончил ли бот все вопросы
        // Если да - автоматически завершаем дуэль
        const { count: botTotalAnswersCount } = await supabase
          .from('duel_answers')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', botPlayer.id)
          .eq('duel_id', duel_id);

        const { data: duelData } = await supabase
          .from('duels')
          .select('num_questions, status')
          .eq('id', duel_id)
          .single();

        const botFinishedAllQuestions = duelData && (botTotalAnswersCount || 0) >= duelData.num_questions;

        if (botFinishedAllQuestions && duelData?.status !== 'finished') {
          console.log('[bot_answer] 🤖 Bot finished all questions, checking if human player also finished...');

          // Получаем ID реального игрока
          let humanPlayerId: string | null = null;
          if (savedHumanPlayer?.user_id) {
            const { data: humanPlayerData } = await supabase
              .from('duel_players')
              .select('id')
              .eq('duel_id', duel_id)
              .eq('user_id', savedHumanPlayer.user_id)
              .eq('is_bot', false)
              .single();
            humanPlayerId = humanPlayerData?.id || null;
          }

          if (humanPlayerId) {
            // Проверяем, закончил ли реальный игрок все вопросы
            const { count: humanAnswersCount } = await supabase
              .from('duel_answers')
              .select('*', { count: 'exact', head: true })
              .eq('player_id', humanPlayerId)
              .eq('duel_id', duel_id);

            const humanFinishedAllQuestions = duelData && (humanAnswersCount || 0) >= duelData.num_questions;

            if (humanFinishedAllQuestions) {
              console.log('[bot_answer] ✅ Both players finished, finishing duel automatically');

              // Оба игрока закончили - завершаем дуэль
              // Используем внутреннюю логику finish_duel
              const { data: allPlayers } = await supabase
                .from('duel_players')
                .select('id, user_id, score, correct_count')
                .eq('duel_id', duel_id);

              // Обновляем статус дуэли
              await supabase
                .from('duels')
                .update({
                  status: 'finished',
                  finished_at: new Date().toISOString()
                })
                .eq('id', duel_id);

              // Вызываем settleBetPayout если есть ставки
              if (duelData && allPlayers && allPlayers.length >= 2) {
                const botPlayerData = allPlayers.find((p: { id: string }) => p.id === botPlayer.id);
                const humanPlayerData = allPlayers.find((p: { user_id: string }) => p.user_id === savedHumanPlayer.user_id);

                if (botPlayerData && humanPlayerData) {
                  const botScore = botPlayerData.score || 0;
                  const humanScore = humanPlayerData.score || 0;
                  const isDraw = botScore === humanScore;
                  const winnerUserId = isDraw ? null : (botScore > humanScore ? null : savedHumanPlayer.user_id); // Боты не получают награды

                  // Получаем bet_amount из дуэли
                  const { data: duelWithBet } = await supabase
                    .from('duels')
                    .select('bet_amount, host_user')
                    .eq('id', duel_id)
                    .single();

                  if (duelWithBet?.bet_amount > 0) {
                    try {
                      await settleBetPayout({
                        supabaseClient: supabase,
                        duelId: duel_id,
                        betAmount: duelWithBet.bet_amount,
                        hostUserId: duelWithBet.host_user,
                        players: allPlayers.map((p: { id: string; user_id: string; is_bot: boolean; name: string; score: number; is_active: boolean }) => ({
                          id: p.id,
                          user_id: p.user_id,
                          score: p.score || 0,
                          correct_count: p.correct_count || 0
                        })),
                        winnerUserId,
                        isDraw,
                      });
                      console.log('[bot_answer] ✅ Bet settled after bot finished');
                    } catch (betError) {
                      console.error('[bot_answer] ❌ Error settling bet:', betError);
                    }
                  }
                }
              }

              console.log('[bot_answer] ✅ Duel finished automatically after bot completed all questions');
            } else {
              console.log('[bot_answer] ⏳ Bot finished, but human player has not finished yet. Waiting...');
            }
          }
        }

        return new Response(JSON.stringify({
          is_correct: isCorrect,
          points_awarded: points,
          new_score: newBotScore,
          combo: 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'use_boost': {
        const validated = useBoostSchema.parse(params);
        const { duel_id, duel_question_id, boost_type } = validated;

        // Get player
        const { data: player } = await supabase
          .from('duel_players')
          .select('*')
          .eq('duel_id', duel_id)
          .eq('user_id', profileId)
          .single();

        if (!player) throw new Error('Player not found');

        // Check if user has the boost
        const { data: hasBoost } = await supabase.rpc('has_boost', {
          p_user_id: profileId,
          p_boost_type: boost_type
        });

        if (!hasBoost) {
          return new Response(JSON.stringify({ error: 'Boost not available' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Deduct boost from inventory
        await supabase.rpc('modify_boost_inventory', {
          p_user_id: profileId,
          p_boost_type: boost_type,
          p_change: -1
        });

        // Record boost usage
        await supabase.from('duel_boosts_used').insert({
          duel_id,
          player_id: player.id,
          boost_type,
          duel_question_id: duel_question_id || null,
        });

        // ============================================================================
        // CRITICAL: SERVER-SIDE BOOST LOGIC
        // ============================================================================
        // All boost effects MUST be calculated on server and returned to client
        // Client only displays the effects, never calculates them locally
        // ============================================================================

        let boostEffect: { success: boolean; eliminated_options?: string[]; time_added_ms?: number; message?: string } = { success: true };

        if (boost_type === 'fifty_fifty' && duel_question_id) {
          // Get question to find incorrect options
          const { data: question } = await supabase
            .from('duel_questions')
            .select('correct_option_ids, question_snapshot')
            .eq('id', duel_question_id)
            .single();

          if (question) {
            const snapshot = question.question_snapshot as any;
            const allOptions = snapshot.answer_options || [];
            const correctIds = question.correct_option_ids as string[];

            // Find incorrect options
            const incorrectOptions = allOptions
              .filter((opt: { id: string; is_correct: boolean }) => !correctIds.includes(opt.id))
              .map((opt: { id: string }) => opt.id);

            // Hide exactly 2 incorrect options (or all if less than 2)
            const toHide = incorrectOptions.slice(0, Math.min(2, incorrectOptions.length));

            boostEffect.hidden_options = toHide;
            console.log('[use_boost] 50/50 hiding options:', toHide);
          }
        } else if (boost_type === 'time_extend') {
          // Server confirms time extension of +30 seconds
          boostEffect.time_added_ms = 30000;
          console.log('[use_boost] Time extended by 30s');
        } else if (boost_type === 'hint' && duel_question_id) {
          // Get question explanation
          const { data: question } = await supabase
            .from('duel_questions')
            .select('question_snapshot')
            .eq('id', duel_question_id)
            .single();

          if (question) {
            const snapshot = question.question_snapshot as any;
            // Return explanation in Russian (can be localized based on user preference)
            const hint = snapshot.explanation_ru || snapshot.explanation_es || snapshot.explanation_en || 'Подсказка недоступна';
            boostEffect.hint = hint;
            console.log('[use_boost] Hint provided');
          }
        } else if (boost_type === 'skip') {
          // Skip is handled client-side, just confirm
          boostEffect.skip_confirmed = true;
          console.log('[use_boost] Skip confirmed');
        } else if (boost_type === 'translate') {
          // Translate boost: translations are already in question_snapshot
          // Client handles the display based on selected language
          // Server just confirms the boost was used
          const { language } = validated;
          boostEffect.translate_applied = true;
          boostEffect.language = language; // Return selected language for confirmation
          console.log('[use_boost] Translate applied for language:', language);
        } else if (boost_type === 'rewind') {
          // ADAS: Rewind - отмена ошибки в тестах
          boostEffect.rewind_confirmed = true;
          console.log('[use_boost] Rewind confirmed');
        }
        // 🆕 Обработка Root Mode exploits
        else if (boost_type === 'screen_injector') {
          boostEffect = {
            success: true,
            popup_count: 3,
            duration_ms: 45000, // Увеличено до 45 секунд для надежной доставки в Telegram Mini App
          };
          console.log('[use_boost] Data Leak activated');
        } else if (boost_type === 'input_lag') {
          boostEffect = {
            success: true,
            delay_ms: 1500,
            duration_ms: 5000,
          };
          console.log('[use_boost] Input Lag activated');
        } else if (boost_type === 'gps_spoofing') {
          boostEffect = {
            success: true,
            shuffle_duration_ms: 1000,
          };
          console.log('[use_boost] GPS Spoofing activated');
        } else if (boost_type === 'police_backdoor') {
          boostEffect = {
            success: true,
            block_duration_ms: 8000,
            captcha_required: true,
          };
          console.log('[use_boost] Police Backdoor activated');
        } else if (boost_type === 'firewall') {
          boostEffect = {
            success: true,
            active: true,
            duration_ms: 30000, // Firewall активен до конца вопроса или 30 секунд
          };
          console.log('[use_boost] Firewall activated');
        } else if (boost_type === 'cryptolocker') {
          boostEffect = {
            success: true,
            encrypted: true,
            duration_ms: 30000, // 30 секунд шифрования
          };
          console.log('[use_boost] Cryptolocker activated');
        }

        // 🆕 Получаем информацию о бусте из БД для определения target_type
        const { data: boostDef, error: boostDefError } = await supabase
          .from('boost_definitions')
          .select('target_type, category, mode')
          .eq('type', boost_type)
          .single();

        // КРИТИЧНО: Логируем результат запроса boost_definitions
        console.log('[use_boost] 🔍🔍🔍 Checking boost_definitions:', {
          boost_type,
          boostDefFound: !!boostDef,
          boostDefError: boostDefError ? {
            message: boostDefError.message,
            code: boostDefError.code,
            details: boostDefError.details
          } : null,
          boostDef: boostDef ? {
            target_type: boostDef.target_type,
            category: boostDef.category,
            mode: boostDef.mode
          } : null,
          willCreateExploit: boostDef && (boostDef.target_type === 'opponent' || boostDef.target_type === 'both')
        });

        // 🆕 Если буст влияет на противника - сохраняем в БД и отправляем broadcast
        if (boostDef && (boostDef.target_type === 'opponent' || boostDef.target_type === 'both')) {
          // КРИТИЧНО: Логируем перед запросом игроков
          console.log('[use_boost] 🔍🔍🔍 About to query players for exploit:', {
            duel_id,
            boost_type,
            boostDefTargetType: boostDef.target_type,
            currentPlayerId: player.id,
            currentPlayerUserId: profileId
          });

          // Получаем всех игроков дуэли (КРИТИЧНО: включаем is_bot для правильной фильтрации)
          const { data: players, error: playersError } = await supabase
            .from('duel_players')
            .select('id, user_id, is_bot')
            .eq('duel_id', duel_id);

          // КРИТИЧНО: Логируем результат запроса игроков
          console.log('[use_boost] 🔍🔍🔍 Players query result:', {
            playersCount: players?.length || 0,
            players: players?.map(p => ({
              id: p.id,
              user_id: p.user_id,
              is_bot: p.is_bot
            })) || [],
            playersError: playersError ? {
              message: playersError.message,
              code: playersError.code,
              details: playersError.details
            } : null,
            duel_id,
            currentPlayerId: player.id,
            currentPlayerUserId: profileId
          });

          // КРИТИЧНО: Проверяем количество игроков ПЕРЕД поиском opponent
          if (!players || players.length === 0) {
            console.error('[use_boost] ❌❌❌ NO PLAYERS FOUND IN DUEL ❌❌❌:', {
              duel_id,
              playersQueryResult: players,
              playersError: playersError ? {
                message: playersError.message,
                code: playersError.code
              } : null,
              currentPlayerId: player.id,
              currentPlayerUserId: profileId
            });
            // Не создаем exploit, если игроков нет
            return new Response(JSON.stringify({
              error: 'No players found in duel',
              details: 'Cannot create exploit - no players in duel',
              boostEffect: boostEffect // Возвращаем эффект для клиента
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (players.length >= 2) {
            // КРИТИЧНО: Находим соперника правильно - это игрок, который НЕ является текущим и НЕ является ботом
            // ВАЖНО: Если есть бот, выбираем реального игрока; если ботов нет, выбираем любого другого игрока
            const opponent = players.find(p => p.id !== player.id && !p.is_bot);

            // КРИТИЧНО: Детальное логирование для диагностики проблемы с ID
            console.log('[use_boost] 🔍🔍🔍 Finding opponent for exploit (DETAILED):', {
              totalPlayers: players.length,
              currentPlayerId: player.id,
              currentPlayerUserId: profileId,
              allPlayers: players.map(p => ({
                id: p.id,
                user_id: p.user_id,
                is_bot: p.is_bot,
                isCurrentPlayer: p.id === player.id,
                willBeOpponent: p.id !== player.id && !p.is_bot
              })),
              opponentFound: !!opponent,
              opponentId: opponent?.id,
              opponentUserId: opponent?.user_id,
              opponentIsBot: opponent?.is_bot,
              // КРИТИЧНО: Проверяем, что opponent действительно отличается от player
              opponentEqualsPlayer: opponent?.id === player.id,
              // КРИТИЧНО: Проверяем, что opponent не является текущим игроком по user_id
              opponentUserIdEqualsCurrentUserId: opponent?.user_id === profileId,
              note: 'Opponent must be different from current player and not a bot'
            });

            // КРИТИЧНО: Дополнительная проверка - убеждаемся, что opponent не является текущим игроком
            if (opponent && opponent.id === player.id) {
              console.error('[use_boost] ❌❌❌ CRITICAL ERROR: Opponent equals current player!', {
                opponentId: opponent.id,
                playerId: player.id,
                players: players.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot }))
              });
              return new Response(JSON.stringify({
                error: 'Invalid opponent - opponent equals current player',
                details: 'Opponent ID matches current player ID'
              }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            // КРИТИЧНО: Проверяем, что opponent не является текущим игроком по user_id
            if (opponent && opponent.user_id === profileId) {
              console.error('[use_boost] ❌❌❌ CRITICAL ERROR: Opponent user_id equals current user_id!', {
                opponentUserId: opponent.user_id,
                currentUserId: profileId,
                opponentId: opponent.id,
                playerId: player.id,
                players: players.map(p => ({ id: p.id, user_id: p.user_id, is_bot: p.is_bot }))
              });
              return new Response(JSON.stringify({
                error: 'Invalid opponent - opponent user_id matches current user_id',
                details: 'Opponent user_id matches current user_id'
              }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            if (opponent) {
              // Вычисляем время истечения эффекта
              const durationMs = boostEffect.duration_ms || 10000;
              const now = Date.now();
              const expiresAt = new Date(now + durationMs).toISOString();
              const activatedAt = new Date(now).toISOString();

              // КРИТИЧНО: Вычисляем время в секундах для удобства
              const durationSeconds = Math.round(durationMs / 1000);
              const expiresAtTimestamp = now + durationMs;

              // КРИТИЧНО: Логируем время создания для диагностики
              console.log('[use_boost] ⏰⏰⏰ Creating exploit with timing:', {
                boost_type,
                durationMs,
                durationSeconds: `${durationSeconds}s`,
                serverTime: new Date(now).toISOString(),
                serverTimestamp: now,
                activatedAt,
                expiresAt,
                expiresAtTimestamp,
                timeUntilExpiry: `${durationMs}ms (${durationSeconds}s)`,
                attackerPlayerId: player.id,
                targetPlayerId: opponent.id,
                note: 'Exploit will expire in ' + durationSeconds + ' seconds from now'
              });

              // Сохраняем exploit в БД для State Recovery
              // КРИТИЧНО: Проверяем, что attacker и target разные перед созданием exploitData
              if (player.id === opponent.id) {
                console.error('[use_boost] ❌❌❌ CRITICAL ERROR: Cannot create exploit - attacker equals target!', {
                  attackerPlayerId: player.id,
                  targetPlayerId: opponent.id,
                  playerUserId: profileId,
                  opponentUserId: opponent.user_id
                });
                return new Response(JSON.stringify({
                  error: 'Cannot create exploit - attacker equals target',
                  details: 'Attacker player ID matches target player ID'
                }), {
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }

              const exploitData = {
                duel_id,
                target_player_id: opponent.id,
                exploit_type: boost_type,
                attacker_player_id: player.id,
                effect_data: boostEffect,
                expires_at: expiresAt,
                activated_at: activatedAt,
                is_active: true,
              };

              // КРИТИЧНО: Детальное логирование перед вставкой с проверкой всех ID
              console.log('[use_boost] 💾💾💾 Inserting exploit to DB (VERIFIED):', {
                exploitData,
                targetPlayerId: opponent.id,
                attackerPlayerId: player.id,
                exploitType: boost_type,
                // КРИТИЧНО: Проверяем, что attacker и target разные
                attackerEqualsTarget: player.id === opponent.id,
                attackerUserId: profileId,
                targetUserId: opponent.user_id,
                attackerUserIdEqualsTargetUserId: profileId === opponent.user_id,
                timing: {
                  activatedAt,
                  expiresAt,
                  durationMs
                },
                note: 'This exploit will be received by the target player via postgres_changes'
              });

              // КРИТИЧНО: Детальное логирование перед вставкой exploit
              console.log('[use_boost] 🔍🔍🔍 About to insert exploit:', {
                exploitData,
                exploitDataStringified: JSON.stringify(exploitData),
                targetPlayerId: opponent.id,
                attackerPlayerId: player.id,
                boostType: boost_type,
                duel_id,
                timestamp: new Date().toISOString(),
              });

              const { data: insertedExploit, error: exploitError } = await supabase
                .from('duel_active_exploits')
                .insert(exploitData)
                .select()
                .single();

              if (exploitError) {
                console.error('[use_boost] ❌❌❌ CRITICAL ERROR saving exploit to DB:', {
                  error: exploitError,
                  errorMessage: exploitError.message,
                  errorCode: exploitError.code,
                  errorDetails: exploitError.details,
                  errorHint: exploitError.hint,
                  exploitData,
                  exploitDataStringified: JSON.stringify(exploitData),
                  targetPlayerId: opponent.id,
                  attackerPlayerId: player.id,
                  boostType: boost_type,
                  duel_id,
                  timestamp: new Date().toISOString(),
                });

                // Пробрасываем ошибку, чтобы клиент мог её обработать
                return new Response(JSON.stringify({
                  error: 'Failed to save exploit',
                  details: exploitError.message,
                  code: exploitError.code
                }), {
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              } else {
                // КРИТИЧНО: Проверяем, что exploit действительно сохранен и доступен для запроса
                console.log('[use_boost] ✅✅✅ Exploit saved to DB for State Recovery:', {
                  exploitId: insertedExploit?.id,
                  targetPlayerId: opponent.id,
                  attackerPlayerId: player.id,
                  exploitType: boost_type,
                  expiresAt,
                  activatedAt,
                  duel_id,
                  timestamp: new Date().toISOString(),
                  insertedExploit: insertedExploit,
                });

                // КРИТИЧНО: Проверяем, что exploit можно найти через запрос (как это делает клиент)
                // ВАЖНО: Клиент использует запрос `attacker_player_id != myPlayerId`, где myPlayerId - это ID принимающего игрока
                // Поэтому мы проверяем, что exploit можно найти с фильтром `attacker_player_id != opponent.id`
                const { data: verifyExploit, error: verifyError } = await supabase
                  .from('duel_active_exploits')
                  .select('*')
                  .eq('duel_id', duel_id)
                  .neq('attacker_player_id', opponent.id) // Запрос как у клиента: attacker != target (target = myPlayerId)
                  .eq('is_active', true)
                  .gt('expires_at', new Date().toISOString())
                  .order('activated_at', { ascending: false })
                  .limit(1);

                // КРИТИЧНО: Также проверяем прямой запрос по target_player_id (fallback для клиента)
                const { data: verifyExploitByTarget, error: verifyErrorByTarget } = await supabase
                  .from('duel_active_exploits')
                  .select('*')
                  .eq('duel_id', duel_id)
                  .eq('target_player_id', opponent.id) // Прямой запрос по target_player_id
                  .eq('is_active', true)
                  .gt('expires_at', new Date().toISOString())
                  .order('activated_at', { ascending: false })
                  .limit(1);

                console.log('[use_boost] 🔍🔍🔍 Verification query result (should find the exploit):', {
                  found: !!verifyExploit && verifyExploit.length > 0,
                  verifyExploitCount: verifyExploit?.length || 0,
                  verifyExploit: verifyExploit?.[0] ? {
                    id: verifyExploit[0].id,
                    target_player_id: verifyExploit[0].target_player_id,
                    attacker_player_id: verifyExploit[0].attacker_player_id,
                    exploit_type: verifyExploit[0].exploit_type,
                    is_active: verifyExploit[0].is_active,
                    expires_at: verifyExploit[0].expires_at,
                    activated_at: verifyExploit[0].activated_at,
                    // КРИТИЧНО: Проверяем, что ID правильные
                    targetPlayerIdMatches: verifyExploit[0].target_player_id === opponent.id,
                    attackerPlayerIdMatches: verifyExploit[0].attacker_player_id === player.id,
                    attackerNotEqualsTarget: verifyExploit[0].attacker_player_id !== verifyExploit[0].target_player_id,
                  } : null,
                  verifyError: verifyError ? {
                    message: verifyError.message,
                    code: verifyError.code,
                    details: verifyError.details,
                  } : null,
                  // КРИТИЧНО: Проверяем прямой запрос по target_player_id
                  foundByTarget: !!verifyExploitByTarget && verifyExploitByTarget.length > 0,
                  verifyExploitByTarget: verifyExploitByTarget?.[0] ? {
                    id: verifyExploitByTarget[0].id,
                    target_player_id: verifyExploitByTarget[0].target_player_id,
                    attacker_player_id: verifyExploitByTarget[0].attacker_player_id,
                  } : null,
                  verifyErrorByTarget: verifyErrorByTarget ? {
                    message: verifyErrorByTarget.message,
                    code: verifyErrorByTarget.code,
                  } : null,
                  queryParams: {
                    duel_id,
                    attackerPlayerIdFilter: `attacker_player_id != '${opponent.id}'`,
                    targetPlayerIdFilter: `target_player_id = '${opponent.id}'`,
                    expectedTargetPlayerId: opponent.id,
                    expectedAttackerPlayerId: player.id,
                    // КРИТИЧНО: Проверяем, что attacker не равен target
                    attackerNotEqualsTarget: player.id !== opponent.id,
                  },
                  note: 'This query simulates what the receiving client will do to find exploits targeting them'
                });

                // КРИТИЧНО: Если exploit не найден через основной запрос, но найден через прямой запрос по target_player_id
                // это означает, что логика фильтрации на клиенте может быть неправильной
                if ((!verifyExploit || verifyExploit.length === 0) && verifyExploitByTarget && verifyExploitByTarget.length > 0) {
                  console.warn('[use_boost] ⚠️⚠️⚠️ WARNING: Exploit found by target_player_id but not by attacker filter!', {
                    exploitFoundByTarget: verifyExploitByTarget[0],
                    note: 'This may indicate that the client-side filter logic needs adjustment'
                  });
                }
              }

              // 🆕 Broadcast через postgres_changes
              // Клиент подписан на изменения duel_active_exploits через useDuelRealtime
              // При вставке новой записи клиент получит событие через postgres_changes
              // Это надежнее чем broadcast, так как работает даже при разрыве соединения
              console.log('[use_boost] ✅ Exploit saved, client will receive via postgres_changes');
            } else {
              // КРИТИЧНО: Детальное логирование, если opponent не найден
              console.error('[use_boost] ❌❌❌ OPPONENT NOT FOUND FOR EXPLOIT ❌❌❌:', {
                players: players.map(p => ({
                  id: p.id,
                  user_id: p.user_id,
                  is_bot: p.is_bot,
                  isCurrentPlayer: p.id === player.id,
                  willBeOpponent: p.id !== player.id && !p.is_bot
                })),
                currentPlayerId: player.id,
                currentPlayerUserId: profileId,
                duel_id,
                boost_type,
                note: 'Exploit will NOT be created because opponent is not found. This may indicate that the duel has only one player or the second player has not joined yet.'
              });

              // КРИТИЧНО: Exploit НЕ создается, если opponent не найден
              // Это правильное поведение - нельзя создать атаку без цели
              return new Response(JSON.stringify({
                error: 'Opponent not found',
                details: 'Cannot create exploit - opponent player not found in duel',
                boostEffect: boostEffect // Возвращаем эффект для клиента, но не сохраняем в БД
              }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } else {
            // КРИТИЧНО: Детальное логирование, если игроков недостаточно
            console.warn('[use_boost] ⚠️⚠️⚠️ NOT ENOUGH PLAYERS FOR EXPLOIT ⚠️⚠️⚠️:', {
              playersCount: players?.length || 0,
              players: players?.map(p => ({
                id: p.id,
                user_id: p.user_id,
                is_bot: p.is_bot
              })) || [],
              currentPlayerId: player.id,
              currentPlayerUserId: profileId,
              duel_id,
              note: 'Exploit requires at least 2 players in the duel'
            });

            // КРИТИЧНО: Если игроков меньше 2, это может быть проблема с запросом или дуэль еще не началась
            // Проверяем, может быть второй игрок еще не присоединился
            const { data: allPlayersCheck } = await supabase
              .from('duel_players')
              .select('id, user_id, is_bot, created_at')
              .eq('duel_id', duel_id)
              .order('created_at', { ascending: true });

            console.warn('[use_boost] 🔍🔍🔍 Double-checking players in DB:', {
              allPlayersCount: allPlayersCheck?.length || 0,
              allPlayers: allPlayersCheck?.map(p => ({
                id: p.id,
                user_id: p.user_id,
                is_bot: p.is_bot,
                created_at: p.created_at
              })) || [],
              note: 'This is a direct query to verify player count'
            });
          }
        } else {
          // КРИТИЧНО: Логируем, почему exploit НЕ создается
          console.warn('[use_boost] ⚠️⚠️⚠️ EXPLOIT NOT CREATED - boostDef check failed ⚠️⚠️⚠️:', {
            boost_type,
            boostDefFound: !!boostDef,
            boostDefTargetType: boostDef?.target_type,
            boostDefError: boostDefError ? {
              message: boostDefError.message,
              code: boostDefError.code,
              details: boostDefError.details
            } : null,
            reason: !boostDef
              ? 'boostDef not found in DB'
              : boostDef.target_type !== 'opponent' && boostDef.target_type !== 'both'
                ? `target_type is "${boostDef.target_type}", expected "opponent" or "both"`
                : 'unknown reason'
          });
        }

        // Create boost notification for opponent
        try {
          await createNotification({
            duel_id,
            type: 'boost',
            metadata: {
              boost_type,
            }
          }, profileId, supabase);
        } catch (err) {
          console.error('[use_boost] Error creating boost notification:', err);
        }

        return new Response(JSON.stringify(boostEffect), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'bot_use_boost': {
        // Логика использования бустов ботом
        const { duel_id, duel_question_id } = params;

        // Находим бота в дуэли
        const { data: botPlayer } = await supabase
          .from('duel_players')
          .select('id, bot_difficulty, bot_name, name')
          .eq('duel_id', duel_id)
          .eq('is_bot', true)
          .single();

        if (!botPlayer) {
          return new Response(JSON.stringify({ error: 'Bot not found in this duel' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const botDifficulty = botPlayer.bot_difficulty || 'medium';

        // Определяем доступные АТАКИ для бота (только opponent-targeting, без self-бустов)
        // Self-бусты (fifty_fifty, hint) убраны — они не создают exploit и игрок ничего не видит
        const availableBoosts: { type: string; weight: number }[] = [];

        if (botDifficulty === 'easy') {
          // Easy: лёгкие атаки — погодные
          availableBoosts.push(
            { type: 'fog_screen', weight: 25 },
            { type: 'rain_storm', weight: 25 },
            { type: 'sun_glare', weight: 20 },
            { type: 'bug_splat', weight: 15 },
            { type: 'ice_screen', weight: 15 },
          );
        } else if (botDifficulty === 'medium') {
          // Medium: все погодные + базовые хакерские
          availableBoosts.push(
            { type: 'fog_screen', weight: 15 },
            { type: 'rain_storm', weight: 15 },
            { type: 'sun_glare', weight: 15 },
            { type: 'bug_splat', weight: 12 },
            { type: 'ice_screen', weight: 12 },
            { type: 'screen_injector', weight: 15 },
            { type: 'input_lag', weight: 10 },
            { type: 'police_backdoor', weight: 6 },
          );
        } else {
          // Hard/Insane: все атаки, акцент на тяжёлые
          availableBoosts.push(
            { type: 'screen_injector', weight: 15 },
            { type: 'police_backdoor', weight: 12 },
            { type: 'ice_screen', weight: 12 },
            { type: 'input_lag', weight: 10 },
            { type: 'fog_screen', weight: 10 },
            { type: 'rain_storm', weight: 10 },
            { type: 'sun_glare', weight: 10 },
            { type: 'bug_splat', weight: 10 },
            { type: 'gps_spoofing', weight: 6 },
            { type: 'cryptolocker', weight: 5 },
          );
        }

        // Выбираем случайный буст на основе весов
        // Пытаемся избежать повторения последнего использованного буста для разнообразия
        const { data: lastBoostNotif } = await supabase
          .from('duel_notifications')
          .select('metadata')
          .eq('duel_id', duel_id)
          .eq('type', 'boost')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastBoostType = (lastBoostNotif?.metadata as any)?.boost_type;

        // Если буст уже использовался недавно, уменьшаем его вес или убираем
        const filteredBoosts = lastBoostType
          ? availableBoosts.filter(b => b.type !== lastBoostType || availableBoosts.length === 1)
          : availableBoosts;

        const totalWeight = filteredBoosts.reduce((sum, boost) => sum + boost.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedBoost = filteredBoosts[0];

        for (const boost of filteredBoosts) {
          random -= boost.weight;
          if (random <= 0) {
            selectedBoost = boost;
            break;
          }
        }

        const boostType = selectedBoost.type;

        // Обработка эффектов бустов — только атаки (opponent-targeting)
        // Маппинг типа атаки → эффект с duration_ms (критично для создания exploit)
        const attackEffects: Record<string, any> = {
          screen_injector: { success: true, boost_type: 'screen_injector', popup_count: 3, duration_ms: 45000 },
          input_lag: { success: true, boost_type: 'input_lag', delay_ms: 1500, duration_ms: 5000 },
          gps_spoofing: { success: true, boost_type: 'gps_spoofing', shuffle_duration_ms: 1000, duration_ms: 10000 },
          police_backdoor: { success: true, boost_type: 'police_backdoor', block_duration_ms: 20000, captcha_required: true, duration_ms: 20000 },
          cryptolocker: { success: true, boost_type: 'cryptolocker', encrypted: true, duration_ms: 30000 },
          // Новые погодные/дорожные атаки
          ice_screen: { success: true, boost_type: 'ice_screen', grid_cells: 9, duration_ms: 30000 },
          sun_glare: { success: true, boost_type: 'sun_glare', visor_required: true, duration_ms: 20000 },
          rain_storm: { success: true, boost_type: 'rain_storm', swipes_required: 10, duration_ms: 15000 },
          bug_splat: { success: true, boost_type: 'bug_splat', hold_duration_ms: 2000, duration_ms: 25000 },
          fog_screen: { success: true, boost_type: 'fog_screen', clear_threshold: 85, duration_ms: 20000 },
        };

        let boostEffect: any = attackEffects[boostType] || { success: true, boost_type: boostType, duration_ms: 15000 };

        // Fallback для self-бустов (не должны попадать сюда, но на всякий случай)
        if (boostType === 'fifty_fifty' && duel_question_id) {
          const { data: question } = await supabase
            .from('duel_questions')
            .select('correct_option_ids, question_snapshot')
            .eq('id', duel_question_id)
            .single();

          if (question) {
            const snapshot = question.question_snapshot as any;
            const allOptions = snapshot.answer_options || [];
            const correctIds = question.correct_option_ids as string[];
            const incorrectOptions = allOptions
              .filter((opt: { id: string; is_correct: boolean }) => !correctIds.includes(opt.id))
              .map((opt: { id: string }) => opt.id);
            const toHide = incorrectOptions.slice(0, Math.min(2, incorrectOptions.length));
            boostEffect.hidden_options = toHide;
          }
        } else if (boostType === 'hint' && duel_question_id) {
          const { data: question } = await supabase
            .from('duel_questions')
            .select('question_snapshot')
            .eq('id', duel_question_id)
            .single();

          if (question) {
            const snapshot = question.question_snapshot as any;
            const hint = snapshot.explanation_ru || snapshot.explanation_es || snapshot.explanation_en || 'Подсказка недоступна';
            boostEffect.hint = hint;
          }
        } else if (boostType === 'cryptolocker') {
          // already handled in attackEffects
          void 0;
          };
        }

        // Получаем информацию о бусте из БД
        const { data: boostDef } = await supabase
          .from('boost_definitions')
          .select('target_type, category, mode')
          .eq('type', boostType)
          .single();

        // Если буст влияет на противника - сохраняем в БД для broadcast через postgres_changes
        if (boostDef && (boostDef.target_type === 'opponent' || boostDef.target_type === 'both')) {
          const { data: players } = await supabase
            .from('duel_players')
            .select('id, user_id, is_bot')
            .eq('duel_id', duel_id);

          if (players && players.length >= 2) {
            const opponent = players.find(p => p.user_id !== null && p.is_bot === false);

            if (opponent) {
              const durationMs = boostEffect.duration_ms || 10000;
              const expiresAt = new Date(Date.now() + durationMs).toISOString();

              const { error: exploitError } = await supabase
                .from('duel_active_exploits')
                .insert({
                  duel_id,
                  target_player_id: opponent.id,
                  exploit_type: boostType,
                  attacker_player_id: botPlayer.id,
                  effect_data: boostEffect,
                  expires_at: expiresAt,
                  is_active: true,
                });

              if (exploitError) {
                console.error('[bot_use_boost] Error saving exploit to DB:', exploitError);
              } else {
                console.log('[bot_use_boost] ✅ Bot exploit saved to DB, client will receive via postgres_changes');
              }
            }
          }
        }

        // Создаем уведомление для игрока о том, что бот использовал буст
        const { data: humanPlayer } = await supabase
          .from('duel_players')
          .select('user_id')
          .eq('duel_id', duel_id)
          .not('user_id', 'is', null)
          .eq('is_bot', false)
          .single();

        if (humanPlayer?.user_id) {
          const botName = botPlayer.bot_name || botPlayer.name || 'Бот';

          try {
            await createNotification({
              duel_id,
              type: 'boost',
              title: `⚠️ ${botName} атакует!`,
              message: boostType === 'screen_injector' ? 'Data Leak активирован! 🛢️' :
                boostType === 'input_lag' ? 'Input Lag активирован! 🕸️' :
                  boostType === 'gps_spoofing' ? 'GPS Spoofing активирован! 📡' :
                    boostType === 'police_backdoor' ? 'Полицейский рейд! 🚔' :
                      boostType === 'cryptolocker' ? 'Cryptolocker активирован! 🔒' :
                        boostType === 'ice_screen' ? 'Заморозка стекла! ❄️' :
                          boostType === 'sun_glare' ? 'Ослепляющее солнце! ☀️' :
                            boostType === 'rain_storm' ? 'Ливень! 🌧️' :
                              boostType === 'bug_splat' ? 'Мошкара на стекле! 🪰' :
                                boostType === 'fog_screen' ? 'Туман! 🌫️' :
                                  `${boostType} активирован!`,
              icon: '⚡',
              metadata: {
                boost_type: boostType,
                opponent_name: botName,
                is_bot: true,
              }
            }, humanPlayer.user_id, supabase);
          } catch (err) {
            console.error('[bot_use_boost] Error creating boost notification:', err);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          boost_type: boostType,
          effect: boostEffect,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'finish_duel': {
        // Get profile_id from params or use the one from request body
        const { duel_id } = params;
        const profile_id = params.profile_id || profileId;

        // Get duel info
        const { data: duel } = await supabase
          .from('duels')
          .select('status, num_questions, started_at, expires_at, host_user, bet_amount')
          .eq('id', duel_id)
          .single();

        if (!duel) {
          return new Response(JSON.stringify({ error: 'Duel not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if already finished
        if (duel.status === 'finished') {
          return new Response(JSON.stringify({ message: 'Already finished', finished: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get current player
        const { data: currentPlayer } = await supabase
          .from('duel_players')
          .select('id, user_id')
          .eq('duel_id', duel_id)
          .eq('user_id', profile_id)
          .single();

        if (!currentPlayer) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Count how many questions this player has answered
        const { count: answeredCount } = await supabase
          .from('duel_answers')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', currentPlayer.id)
          .eq('duel_id', duel_id);

        console.log('[finish_duel] Player finished:', {
          playerId: currentPlayer.id,
          answeredCount,
          totalQuestions: duel.num_questions
        });

        // Check if all players have finished
        const { data: allPlayers } = await supabase
          .from('duel_players')
          .select('id, user_id, score, correct_count, is_bot, profiles(id, username, first_name, photo_url)')
          .eq('duel_id', duel_id);

        // 🆕 ASYNC DUEL: Если только 1 игрок (хост) сыграл
        if (!allPlayers || allPlayers.length < 2) {
          console.log('[finish_duel] 🎯 Async mode: Only host finished, waiting for opponent');

          // Проверяем, что текущий игрок реально ответил на все вопросы
          if ((answeredCount || 0) < duel.num_questions) {
            console.log('[finish_duel] Player has not answered all questions yet:', {
              answered: answeredCount,
              required: duel.num_questions
            });
            return new Response(JSON.stringify({
              success: true,
              finished: false,
              message: 'Not all questions answered yet'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Переводим дуэль в статус "ожидает соперника"
          await supabase
            .from('duels')
            .update({
              status: 'waiting_for_opponent',
              // Сохраняем время когда хост закончил
            })
            .eq('id', duel_id);

          console.log('[finish_duel] ✅ Duel status updated to waiting_for_opponent');

          return new Response(JSON.stringify({
            success: true,
            finished: false,
            waiting_for_opponent: true,
            message: 'Your score is saved! Waiting for opponent to play.',
            your_score: currentPlayer?.score || allPlayers?.find((p: { user_id: string }) => p.user_id === profile_id)?.score || 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 🆕 РЕАЛИСТИЧНАЯ ЛОГИКА ДЛЯ ИГР С БОТОМ
        // Бот отвечает параллельно с игроком через useBotOpponent на клиенте
        // Если бот ещё не закончил - показываем экран ожидания
        const opponentPlayer = allPlayers.find((p: { id: string }) => p.id !== currentPlayer.id);
        const isOpponentBot = opponentPlayer?.is_bot === true;

        if (isOpponentBot) {
          console.log('[finish_duel] 🤖 Opponent is BOT - checking bot progress');

          // Считаем ответы текущего игрока
          const myAnswerCount = answeredCount || 0;

          // Считаем ответы бота
          const { count: botAnswerCount } = await supabase
            .from('duel_answers')
            .select('*', { count: 'exact', head: true })
            .eq('duel_id', duel_id)
            .eq('player_id', opponentPlayer.id);

          const botAnswers = botAnswerCount || 0;
          const requiredQuestions = duel.num_questions;

          console.log('[finish_duel] Bot game status:', {
            myAnswerCount,
            botAnswers,
            requiredQuestions,
            iHaveFinished: myAnswerCount >= requiredQuestions,
            botHasFinished: botAnswers >= requiredQuestions
          });

          // Если я ответил на все вопросы
          if (myAnswerCount >= requiredQuestions) {
            // Проверяем закончил ли бот
            if (botAnswers < requiredQuestions) {
              // Бот ещё не закончил - показываем экран ожидания
              console.log('[finish_duel] ⏳ BOT GAME: I finished, bot has', botAnswers, 'of', requiredQuestions, 'answers. Waiting...');

              return new Response(JSON.stringify({
                success: true,
                finished: false,
                reason: 'waiting_for_bot',
                message: 'Ждём ответов бота...',
                bot_progress: {
                  answered: botAnswers,
                  total: requiredQuestions,
                  remaining: requiredQuestions - botAnswers
                }
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            // Собираем данные для результатов
            const { data: allAnswers } = await supabase
              .from('duel_answers')
              .select('*, duel_questions(*)')
              .eq('duel_id', duel_id);

            const myAnswers = allAnswers?.filter((a: { player_id: string }) => a.player_id === currentPlayer.id) || [];
            const opponentAnswers = allAnswers?.filter((a: { player_id: string }) => a.player_id === opponentPlayer.id) || [];

            // Получаем обновлённые данные игроков
            const { data: updatedPlayers } = await supabase
              .from('duel_players')
              .select('id, user_id, score, correct_count, is_bot, bot_name, name, profiles(id, username, first_name, photo_url)')
              .eq('duel_id', duel_id);

            // 🏆 РАСЧЕТ ПОБЕДИТЕЛЯ ДЛЯ БОТА
            const player1 = updatedPlayers?.find((p: any) => p.user_id === profile_id); // Реальный игрок
            const player2 = updatedPlayers?.find((p: any) => p.id !== player1?.id); // Бот

            const score1 = player1?.score || 0;
            const score2 = player2?.score || 0;
            const isDraw = score1 === score2;

            // ИСПРАВЛЕНИЕ: winner_id должен быть user_id победителя.
            // Если победил бот — у него нет user_id, поэтому winner_id = null (ничья для триггера не выходит).
            // Используем player_id бота как маркер: нет user_id → null, но is_draw = false.
            // Триггер уже умеет пропускать ботов, поэтому нам важен только реальный игрок.
            const humanWon = !isDraw && score1 > score2;
            const winnerId = isDraw ? null : (humanWon ? player1.user_id : null);

            console.log('[finish_duel] 🤖 Bot Game Results:', { score1, score2, isDraw, humanWon, winnerId });

            // Обновляем статус дуэли на finished с результатами
            const { error: botFinishError } = await supabase
              .from('duels')
              .update({
                status: 'finished',
                finished_at: new Date().toISOString(),
                winner_id: winnerId,
                is_draw: isDraw
              })
              .eq('id', duel_id)
              .eq('status', 'active');

            if (botFinishError) {
              console.error('[finish_duel] ❌ Error finishing bot duel:', botFinishError);
            }

            // 🎁 ЯВНОЕ НАЧИСЛЕНИЕ XP для реального игрока (страховка от сбоя триггера)
            // Триггер handle_duel_payout_atomic должен сработать автоматически,
            // но для бот-игр добавляем явный вызов для надёжности
            if (player1?.user_id) {
              let xpToAward = 0;
              if (isDraw) {
                xpToAward = 15; // Ничья
              } else if (humanWon) {
                xpToAward = 50; // Победа над ботом
              } else {
                xpToAward = 5; // Поражение — за участие
              }

              console.log(`[finish_duel] 🎁 Bot game: awarding ${xpToAward} XP to player ${player1.user_id} (humanWon: ${humanWon}, isDraw: ${isDraw})`);

              // Начисляем XP через дельту (триггер обработает основную логику)
              // Этот блок служит fallback — если триггер уже сработал, это будет дублем.
              // Поэтому используем idempotent-флаг через duel_transactions
              const { data: existingXpTx } = await supabase
                .from('duel_transactions')
                .select('id')
                .eq('duel_id', duel_id)
                .eq('user_id', player1.user_id)
                .in('transaction_type', ['win_payout', 'base_payout', 'refund', 'insurance_payout'])
                .limit(1);

              if (!existingXpTx || existingXpTx.length === 0) {
                // Триггер ещё не отработал — начисляем XP вручную через increment_profile_value
                console.log('[finish_duel] 🔄 Trigger not fired yet, manually awarding XP...');
                const { error: xpError } = await supabase.rpc('increment_profile_value', {
                  p_profile_id: player1.user_id,
                  p_column: 'xp',
                  p_amount: xpToAward
                });
                if (xpError) {
                  console.error('[finish_duel] ❌ Failed to award XP manually:', xpError);
                } else {
                  console.log(`[finish_duel] ✅ Manually awarded ${xpToAward} XP to ${player1.user_id}`);
                }
              } else {
                console.log('[finish_duel] ✅ Trigger already fired, skipping manual XP award');
              }
            }

            console.log('[finish_duel] ✅ BOT GAME COMPLETED');

            return new Response(JSON.stringify({
              success: true,
              finished: true,
              reason: 'bot_game_both_finished',
              duel_data: duel,
              players_data: updatedPlayers || allPlayers,
              my_answers: myAnswers,
              opponent_answers: opponentAnswers
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }


        // CRITICAL FIX: Увеличена задержка с 200ms до 500ms для надёжности
        // Это гарантирует, что последний ответ точно записан в БД перед подсчётом
        console.log('[finish_duel] Waiting 500ms for DB commit...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // CRITICAL FIX: Check duel status FIRST before counting answers
        // This prevents race condition where both players try to finish simultaneously
        const { data: currentDuelStatus } = await supabase
          .from('duels')
          .select('status')
          .eq('id', duel_id)
          .single();

        // If duel already finished by opponent - return immediately
        if (currentDuelStatus?.status === 'finished') {
          console.log('[finish_duel] ✅ Duel already finished by opponent - returning finished: true');
          return new Response(JSON.stringify({
            success: true,
            finished: true,
            reason: 'already_finished_by_opponent'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if both players finished by counting their answers
        // IMPORTANT: Count answers AFTER current player's last answer is saved
        // Single check (removed double-check to reduce latency)
        let allPlayersFinished = false;
        let playerAnswerCounts: { [playerId: string]: number } = {};

        const checkPlayersFinished = async (): Promise<boolean> => {
          let allFinished = true;
          const counts: { [playerId: string]: number } = {};

          for (const player of allPlayers) {
            const { count: playerAnswers } = await supabase
              .from('duel_answers')
              .select('*', { count: 'exact', head: true })
              .eq('player_id', player.id)
              .eq('duel_id', duel_id);

            const answerCount = playerAnswers || 0;
            counts[player.id] = answerCount;

            console.log('[finish_duel] Player answer count:', {
              playerId: player.id,
              userId: player.user_id,
              answerCount,
              required: duel.num_questions,
              hasFinished: answerCount >= duel.num_questions
            });

            if (!player.is_bot && answerCount < duel.num_questions) {
              allFinished = false;
            }
          }

          playerAnswerCounts = counts;
          return allFinished;
        };

        // Single check - removed double-check for faster response
        allPlayersFinished = await checkPlayersFinished();

        console.log('[finish_duel] All players finished check:', {
          allPlayersFinished,
          playerAnswerCounts,
          requiredAnswers: duel.num_questions,
          currentPlayerId: currentPlayer.id,
          currentPlayerAnswers: playerAnswerCounts[currentPlayer.id] || 0
        });

        // Check timeout (10 minutes after start or 15 minutes total)
        const now = new Date();
        const startedAt = duel.started_at ? new Date(duel.started_at) : null;
        const expiresAt = duel.expires_at ? new Date(duel.expires_at) : null;
        const timeoutMs = 10 * 60 * 1000; // 10 minutes
        const isTimeout = startedAt && (now.getTime() - startedAt.getTime() > timeoutMs) ||
          (expiresAt && now > expiresAt);

        console.log('[finish_duel] Status check:', {
          allPlayersFinished,
          isTimeout,
          startedAt: startedAt?.toISOString(),
          expiresAt: expiresAt?.toISOString()
        });

        // Only finish duel if both players finished OR timeout occurred
        if (allPlayersFinished || isTimeout) {
          // OPTIMIZED: Reuse already counted answers instead of querying DB again
          // This saves ~100-200ms by avoiding duplicate queries
          const playersWithScores = allPlayers.map((player) => ({
            ...player,
            answersCount: playerAnswerCounts[player.id] || 0
          }));

          // Sort by score (descending)
          playersWithScores.sort((a, b) => b.score - a.score);
          const isDraw = playersWithScores[0].score === playersWithScores[1].score;
          const winnerId = isDraw ? null : playersWithScores[0].id;

          // Build match_summary for compact storage
          // This allows us to safely delete detailed duel_answers data later
          const player1 = playersWithScores[0];
          const player2 = playersWithScores[1];
          const player1Accuracy = duel.num_questions > 0
            ? Math.round((player1.correct_count / duel.num_questions) * 100 * 100) / 100
            : 0;
          const player2Accuracy = duel.num_questions > 0
            ? Math.round((player2.correct_count / duel.num_questions) * 100 * 100) / 100
            : 0;

          // Get used boosts for both players (if any)
          const { data: player1Boosts } = await supabase
            .from('duel_answers')
            .select('boost_used')
            .eq('player_id', player1.id)
            .eq('duel_id', duel_id)
            .not('boost_used', 'is', null);

          const { data: player2Boosts } = await supabase
            .from('duel_answers')
            .select('boost_used')
            .eq('player_id', player2.id)
            .eq('duel_id', duel_id)
            .not('boost_used', 'is', null);

          const usedBoosts1 = player1Boosts?.map((b: { boost_used: string }) => b.boost_used).filter(Boolean) || [];
          const usedBoosts2 = player2Boosts?.map((b: { boost_used: string }) => b.boost_used).filter(Boolean) || [];

          const matchSummary = {
            player_1_id: player1.user_id,
            player_1_score: player1.score,
            player_1_correct: player1.correct_count || 0,
            player_1_accuracy: player1Accuracy,
            player_1_boosts: [...new Set(usedBoosts1)], // Remove duplicates
            player_2_id: player2.user_id,
            player_2_score: player2.score,
            player_2_correct: player2.correct_count || 0,
            player_2_accuracy: player2Accuracy,
            player_2_boosts: [...new Set(usedBoosts2)], // Remove duplicates
            total_questions: duel.num_questions,
            winner_id: isDraw ? null : player1.user_id,
            is_draw: isDraw,
            finish_reason: allPlayersFinished ? 'both_finished' : 'timeout',
            finished_at: new Date().toISOString()
          };

          // CRITICAL FIX: Atomic update using WHERE clause to prevent race condition
          // Only one player can successfully update status from 'active' to 'finished'
          // If update returns no rows, another player already finished the duel
          const { data: updateResult, error: updateError } = await supabase
            .from('duels')
            .update({
              status: 'finished',
              winner_id: isDraw ? null : player1.user_id,
              is_draw: isDraw,
              finished_at: new Date().toISOString(),
              match_summary: matchSummary as any, // Save compact match summary
            })
            .eq('id', duel_id)
            .eq('status', 'active') // CRITICAL: Only update if status is still 'active'
            .select('id, status');

          // If no rows updated - another player already finished the duel
          if (!updateResult || updateResult.length === 0) {
            console.log('[finish_duel] ⚠️ Race condition detected - duel already finished by opponent');
            console.log('[finish_duel] This is expected when both players finish simultaneously');

            // Track race condition metric for monitoring
            console.log('[finish_duel] METRIC: duel_race_condition_detected', { duel_id });

            return new Response(JSON.stringify({
              success: true,
              finished: true,
              reason: 'already_finished_by_opponent_race'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (updateError) {
            console.error('[finish_duel] Error updating duel status:', updateError);
            throw updateError;
          }

          console.log('[finish_duel] ✅ Successfully updated duel status to finished (atomic)');

          // Update stats for both players (except bots)
          for (const player of playersWithScores) {
            // 🔥 CRITICAL FIX: Skip bots - they don't have user_id and cause constraint violation
            if (!player.user_id) {
              console.log('[finish_duel] ⏭️ Skipping stats update for bot player:', player.id);
              continue;
            }

            const isWin = player.id === winnerId;
            await supabase.rpc('upsert_duel_stats', {
              p_user_id: player.user_id,
              p_is_win: isWin && !isDraw,
              p_is_draw: isDraw,
              p_score: player.score
            });
          }

          // 🛡️ ANTI-FARMING PROTECTION: Update win_streak based on duel outcome
          // Проверяем, есть ли бот в дуэли
          const { data: botPlayer } = await supabase
            .from('duel_players')
            .select('id, is_bot')
            .eq('duel_id', duel_id)
            .eq('is_bot', true)
            .single();

          const hasBot = !!botPlayer;

          if (hasBot) {
            // Если в дуэли есть бот - обновляем win_streak для реальных игроков
            for (const player of playersWithScores) {
              if (player.user_id) { // Только для реальных игроков (не ботов)
                const isWin = player.id === winnerId && !isDraw;

                if (isWin) {
                  // Победа над ботом - увеличиваем win_streak
                  await supabase.rpc('increment_profile_value', {
                    p_profile_id: player.user_id,
                    p_column: 'win_streak',
                    p_amount: 1
                  });
                  console.log(`[finish_duel] 🛡️ Win streak incremented for player ${player.user_id} (won against bot)`);
                } else {
                  // Поражение или ничья - сбрасываем win_streak
                  await supabase
                    .from('profiles')
                    .update({ win_streak: 0 })
                    .eq('id', player.user_id);
                  console.log(`[finish_duel] 🛡️ Win streak reset for player ${player.user_id} (lost/draw against bot)`);
                }
              }
            }
          } else {
            // Если это дуэль с реальным игроком - не трогаем win_streak
            console.log('[finish_duel] Real player duel - win_streak not affected');
          }

          console.log('[finish_duel] Duel finished:', {
            winnerId,
            isDraw,
            reason: allPlayersFinished ? 'both_finished' : 'timeout'
          });

          await settleBetPayout({
            supabaseClient: supabase,
            duelId: duel_id,
            betAmount: duel.bet_amount || 0,
            hostUserId: duel.host_user,
            players: playersWithScores,
            winnerUserId: isDraw ? null : playersWithScores[0].user_id,
            isDraw,
          });

          // 🆕 НОВОЕ: Отправляем Telegram уведомления обоим игрокам
          // Получаем код дуэли для уведомления
          const { data: duelData } = await supabase
            .from('duels')
            .select('code')
            .eq('id', duel_id)
            .single();
          const duelCode = duelData?.code || 'XXXX';

          // Отправляем уведомления каждому игроку
          for (const player of playersWithScores) {
            if (!player.user_id || player.is_bot) continue; // Пропускаем ботов

            // Получаем telegram_id игрока
            const { data: playerProfile } = await supabase
              .from('profiles')
              .select('telegram_id, first_name')
              .eq('id', player.user_id)
              .single();

            if (!playerProfile?.telegram_id) {
              console.log(`[finish_duel] Player ${player.user_id} has no telegram_id, skipping notification`);
              continue;
            }

            // Находим оппонента
            const opponent = playersWithScores.find((p: { user_id: string }) => p.user_id !== player.user_id);
            const opponentName = opponent?.is_bot ? 'Бот' : (opponent?.profiles?.first_name || 'Соперник');

            // Определяем результат для этого игрока
            const isPlayerWinner = player.id === winnerId;
            const myScore = player.score || 0;
            const opponentScore = opponent?.score || 0;

            // Отправляем уведомление
            await sendDuelCompletionNotification({
              supabaseClient: supabase,
              recipientTelegramId: playerProfile.telegram_id,
              opponentName,
              isWinner: isPlayerWinner,
              isDraw,
              myScore,
              opponentScore,
              coinsWon: isPlayerWinner && duel.bet_amount > 0 ? duel.bet_amount * 2 : 0,
              duelCode,
            });
          }

          // Create finish notification for opponent
          const opponentPlayer = playersWithScores.find((p: { user_id: string }) => p.user_id !== profile_id);
          if (opponentPlayer) {
            let currentPlayerName = 'Игрок';
            try {
              currentPlayerName = await getOpponentName(profile_id, supabase);
            } catch {
              // Fallback
            }
            console.log('[finish_duel] Creating finish notification with player name:', currentPlayerName);

            try {
              await createNotification({
                duel_id,
                type: 'finish',
                metadata: {
                  opponent_name: currentPlayerName,
                  is_winner: opponentPlayer.id === winnerId,
                  correct_answers: opponentPlayer.correct_count || 0,
                  is_last_question: false,
                }
              }, profile_id, supabase);
            } catch (err) {
              console.error('[finish_duel] Error creating finish notification:', err);
            }
          }

          // 🆕 OPTIMIZATION: Return full results data for immediate snapshot creation
          const { data: allAnswers } = await supabase
            .from('duel_answers')
            .select('*, duel_questions(*)')
            .eq('duel_id', duel_id);

          const myAnswers = allAnswers?.filter((a: { player_id: string }) => a.player_id === currentPlayer.id) || [];
          const opponentAnswers = allAnswers?.filter((a: { player_id: string }) => a.player_id === opponentPlayer?.id) || [];

          return new Response(JSON.stringify({
            success: true,
            finished: true,
            reason: allPlayersFinished ? 'both_finished' : 'timeout',
            duel_data: duel,
            players_data: allPlayers,
            my_answers: myAnswers,
            opponent_answers: opponentAnswers
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Not all players finished yet - just acknowledge this player finished
          console.log('[finish_duel] Player finished, waiting for opponent');

          // Create finish notification for opponent (first player finished)
          const opponentPlayer = allPlayers.find((p: { user_id: string }) => p.user_id !== profile_id);
          const currentPlayerData = allPlayers.find((p: { user_id: string }) => p.user_id === profile_id);
          if (opponentPlayer && currentPlayerData) {
            // Get current player name (who finished) for personalized notification to opponent
            let currentPlayerName = 'Игрок';
            try {
              currentPlayerName = await getOpponentName(profile_id, supabase);
            } catch {
              // Fallback
            }
            console.log('[finish_duel] Creating finish notification with player name:', currentPlayerName);

            try {
              await createNotification({
                duel_id,
                type: 'finish',
                metadata: {
                  opponent_name: currentPlayerName,
                  is_winner: false,
                  correct_answers: currentPlayerData.correct_count || 0,
                  is_last_question: false,
                }
              }, profile_id, supabase);
            } catch (err) {
              console.error('[finish_duel] Error creating finish notification:', err);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            finished: false,
            message: 'Waiting for opponent to finish'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // 🆕 NEW ACTION: Быстрый endpoint для polling статуса дуэли
      // Используется в Telegram Mini App где прямые запросы к БД возвращают 406
      case 'get_duel_status': {
        const { duel_id } = params;

        if (!duel_id) {
          return new Response(JSON.stringify({ error: 'duel_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('id, status')
          .eq('id', duel_id)
          .single();

        if (duelError || !duel) {
          return new Response(JSON.stringify({ error: 'Duel not found', details: duelError?.message }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          status: duel.status,
          duel_id: duel.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'heartbeat': {
        const { duel_id } = params;
        const userProfileId = params.profile_id || profileId;

        if (!duel_id || !userProfileId) {
          return new Response(JSON.stringify({ error: 'duel_id and profile_id are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Обновляем heartbeat для текущего игрока
        const { data: player, error: playerError } = await supabase
          .from('duel_players')
          .select('id')
          .eq('duel_id', duel_id)
          .eq('user_id', userProfileId)
          .single();

        if (playerError || !player) {
          console.error('[heartbeat] Player not found:', playerError);
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Обновляем heartbeat и статус онлайн
        await supabase
          .from('duel_players')
          .update({
            last_heartbeat_at: new Date().toISOString(),
            is_connected: true,
            activity_status: 'online'
          })
          .eq('id', player.id);

        // Проверяем активность соперника
        const { data: opponent, error: opponentError } = await supabase
          .from('duel_players')
          .select('id, last_heartbeat_at, is_connected, activity_status, user_id')
          .eq('duel_id', duel_id)
          .neq('user_id', userProfileId)
          .single();

        let opponentStatus = null;
        if (opponent && !opponentError) {
          const lastHeartbeat = opponent.last_heartbeat_at
            ? new Date(opponent.last_heartbeat_at).getTime()
            : 0;
          const now = Date.now();
          const timeSinceHeartbeat = now - lastHeartbeat;

          // Если соперник не отправлял heartbeat > 10 секунд - помечаем как офлайн
          if (timeSinceHeartbeat > 10000 && opponent.is_connected) {
            await supabase
              .from('duel_players')
              .update({
                is_connected: false,
                activity_status: 'offline'
              })
              .eq('id', opponent.id);

            opponentStatus = 'offline';
          } else {
            opponentStatus = opponent.activity_status || 'online';
          }
        }

        return new Response(JSON.stringify({
          success: true,
          opponent_status: opponentStatus
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_activity_status': {
        const { duel_id, status } = params;
        const userProfileId = params.profile_id || profileId;

        if (!duel_id || !userProfileId || !status) {
          return new Response(JSON.stringify({ error: 'duel_id, profile_id and status are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const validStatuses = ['thinking', 'answering', 'online', 'reconnecting'];
        if (!validStatuses.includes(status)) {
          return new Response(JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: player, error: playerError } = await supabase
          .from('duel_players')
          .select('id')
          .eq('duel_id', duel_id)
          .eq('user_id', userProfileId)
          .single();

        if (playerError || !player) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabase
          .from('duel_players')
          .update({
            activity_status: status,
            last_heartbeat_at: new Date().toISOString(),
            is_connected: status !== 'offline'
          })
          .eq('id', player.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'handle_disconnect': {
        const { duel_id } = params;
        const userProfileId = params.profile_id || profileId;

        if (!duel_id || !userProfileId) {
          return new Response(JSON.stringify({ error: 'duel_id and profile_id are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: player, error: playerError } = await supabase
          .from('duel_players')
          .select('id, disconnect_count')
          .eq('duel_id', duel_id)
          .eq('user_id', userProfileId)
          .single();

        if (playerError || !player) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Обновляем статус отключения
        await supabase
          .from('duel_players')
          .update({
            is_connected: false,
            activity_status: 'offline',
            disconnect_count: (player.disconnect_count || 0) + 1,
            last_disconnect_at: new Date().toISOString()
          })
          .eq('id', player.id);

        // Логируем инцидент
        await supabase
          .from('duel_incidents')
          .insert({
            duel_id,
            player_id: player.id,
            incident_type: 'disconnect',
            metadata: {
              disconnect_count: (player.disconnect_count || 0) + 1,
              timestamp: new Date().toISOString()
            }
          });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'auto_finish_on_opponent_disconnect': {
        const { duel_id } = params;
        const userProfileId = params.profile_id || profileId;

        if (!duel_id || !userProfileId) {
          return new Response(JSON.stringify({ error: 'duel_id and profile_id are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Получаем информацию о дуэли
        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('status, bet_amount, host_user, num_questions')
          .eq('id', duel_id)
          .single();

        if (duelError || !duel || duel.status !== 'active') {
          return new Response(JSON.stringify({ error: 'Duel not found or not active' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Получаем игроков
        const { data: players, error: playersError } = await supabase
          .from('duel_players')
          .select('id, user_id, is_connected, activity_status, last_heartbeat_at, score')
          .eq('duel_id', duel_id);

        if (playersError || !players || players.length < 2) {
          return new Response(JSON.stringify({ error: 'Not enough players' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const myPlayer = players.find((p: { user_id: string }) => p.user_id === userProfileId);
        const opponent = players.find((p: { user_id: string }) => p.user_id !== userProfileId);

        if (!myPlayer || !opponent) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Проверяем статус соперника
        const lastHeartbeat = opponent.last_heartbeat_at
          ? new Date(opponent.last_heartbeat_at).getTime()
          : 0;
        const now = Date.now();
        const timeSinceHeartbeat = now - lastHeartbeat;
        const isOpponentOffline = !opponent.is_connected || opponent.activity_status === 'offline' || timeSinceHeartbeat > 15000;

        // Проверяем есть ли у соперника ответы
        const { count: opponentAnswersCount } = await supabase
          .from('duel_answers')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', opponent.id)
          .eq('duel_id', duel_id);

        const hasOpponentAnswered = (opponentAnswersCount || 0) > 0;

        // Если соперник офлайн > 15 секунд и дуэль началась (есть ответы), завершаем дуэль
        if (isOpponentOffline && hasOpponentAnswered) {
          console.log('[auto_finish_on_opponent_disconnect] Opponent disconnected, finishing duel automatically');

          // Завершаем дуэль - вызываем finish_duel action
          // Используем внутренний вызов через обработку того же action
          // Но сначала нужно убедиться что текущий игрок закончил все вопросы
          const { count: myAnswersCount } = await supabase
            .from('duel_answers')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', myPlayer.id)
            .eq('duel_id', duel_id);

          // Если текущий игрок не закончил все вопросы, завершаем дуэль принудительно
          // с текущими результатами
          if ((myAnswersCount || 0) < duel.num_questions) {
            // Помечаем что текущий игрок закончил (для корректного завершения)
            // Но на самом деле мы просто завершаем дуэль с текущими результатами
            console.log('[auto_finish_on_opponent_disconnect] Current player has not finished all questions, finishing with current results');
          }

          // Вызываем finish_duel через рекурсивный вызов action
          // Но проще всего - просто завершить дуэль напрямую через логику finish_duel
          // Для этого создадим упрощенную версию завершения

          // Обновляем статус дуэли на finished
          await supabase
            .from('duels')
            .update({
              status: 'finished',
              finished_at: new Date().toISOString()
            })
            .eq('id', duel_id);

          // Вызываем settleBetPayout если есть ставки
          if (duel.bet_amount > 0) {
            try {
              // Получаем финальные счета игроков
              const { data: finalPlayers } = await supabase
                .from('duel_players')
                .select('id, user_id, score, correct_count')
                .eq('duel_id', duel_id);

              if (finalPlayers && finalPlayers.length >= 2) {
                const myFinalPlayer = finalPlayers.find((p: { user_id: string }) => p.user_id === userProfileId);
                const opponentFinalPlayer = finalPlayers.find((p: { user_id: string }) => p.user_id !== userProfileId);

                if (myFinalPlayer && opponentFinalPlayer) {
                  const myFinalScore = myFinalPlayer.score || 0;
                  const opponentFinalScore = opponentFinalPlayer.score || 0;

                  // Определяем победителя (текущий игрок выиграл, т.к. соперник отключился)
                  const winnerUserId = userProfileId;
                  const isDraw = myFinalScore === opponentFinalScore;

                  // Вызываем settleBetPayout
                  await settleBetPayout({
                    supabaseClient: supabase,
                    duelId: duel_id,
                    betAmount: duel.bet_amount,
                    hostUserId: duel.host_user,
                    players: finalPlayers.map((p: { id: string; user_id: string; score: number; is_bot: boolean }) => ({
                      id: p.id,
                      user_id: p.user_id,
                      score: p.score || 0,
                      correct_count: p.correct_count || 0
                    })),
                    winnerUserId: isDraw ? null : winnerUserId,
                    isDraw,
                  });

                  console.log('[auto_finish_on_opponent_disconnect] Bet settled, winner:', winnerUserId);
                }
              }
            } catch (betError) {
              console.error('[auto_finish_on_opponent_disconnect] Error settling bets:', betError);
            }
          }

          // Обновляем статистику игроков
          try {
            const { data: finalPlayers } = await supabase
              .from('duel_players')
              .select('id, user_id, score')
              .eq('duel_id', duel_id);

            if (finalPlayers && finalPlayers.length >= 2) {
              const myFinalPlayer = finalPlayers.find((p: { user_id: string }) => p.user_id === userProfileId);
              const opponentFinalPlayer = finalPlayers.find((p: { user_id: string }) => p.user_id !== userProfileId);

              if (myFinalPlayer && opponentFinalPlayer) {
                const myFinalScore = myFinalPlayer.score || 0;
                const opponentFinalScore = opponentFinalPlayer.score || 0;
                const isWin = myFinalScore > opponentFinalScore;
                const isDraw = myFinalScore === opponentFinalScore;

                // Обновляем статистику для текущего игрока (победа)
                await supabase.rpc('upsert_duel_stats', {
                  p_user_id: userProfileId,
                  p_is_win: isWin && !isDraw,
                  p_is_draw: isDraw,
                  p_score: myFinalScore
                });

                // Обновляем статистику для соперника (поражение)
                await supabase.rpc('upsert_duel_stats', {
                  p_user_id: opponent.user_id,
                  p_is_win: false,
                  p_is_draw: isDraw,
                  p_score: opponentFinalScore
                });
              }
            }
          } catch (statsError) {
            console.error('[auto_finish_on_opponent_disconnect] Error updating stats:', statsError);
          }

          return new Response(JSON.stringify({
            success: true,
            finished: true,
            reason: 'opponent_disconnected'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Если соперник офлайн но дуэль не началась (нет ответов), возвращаем ставки
        if (isOpponentOffline && !hasOpponentAnswered) {
          console.log('[auto_finish_on_opponent_disconnect] Opponent disconnected before duel started, cancelling');

          // Обновляем статус дуэли на cancelled
          await supabase
            .from('duels')
            .update({
              status: 'cancelled',
              finished_at: new Date().toISOString()
            })
            .eq('id', duel_id);

          // Возвращаем ставки если были
          if (duel.bet_amount > 0) {
            const { data: betRow } = await supabase
              .from('duel_bets')
              .select('host_insurance_premium, opponent_insurance_premium')
              .eq('duel_id', duel_id)
              .maybeSingle();

            // Возврат ставки текущему игроку
            await supabase.rpc('increment_profile_value', {
              p_profile_id: userProfileId,
              p_column: 'coins',
              p_amount: duel.bet_amount
            });

            await supabase.from('duel_transactions').insert({
              duel_id,
              user_id: userProfileId,
              amount: duel.bet_amount,
              transaction_type: 'refund'
            });

            // Возврат страховки если была
            const isHost = userProfileId === duel.host_user;
            const insurancePremium = isHost
              ? betRow?.host_insurance_premium
              : betRow?.opponent_insurance_premium;

            if (insurancePremium && insurancePremium > 0) {
              await supabase.rpc('increment_profile_value', {
                p_profile_id: userProfileId,
                p_column: 'coins',
                p_amount: insurancePremium
              });

              await supabase.from('duel_transactions').insert({
                duel_id,
                user_id: userProfileId,
                amount: insurancePremium,
                transaction_type: 'insurance_refund'
              });
            }
          }

          return new Response(JSON.stringify({
            success: true,
            cancelled: true,
            reason: 'opponent_disconnected_before_start',
            bets_refunded: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Соперник онлайн или не прошло достаточно времени
        return new Response(JSON.stringify({
          success: true,
          opponent_online: true,
          time_since_heartbeat: timeSinceHeartbeat
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'surrender': {
        const { duel_id } = params;
        // profile_id уже извлечен из body в начале функции, используем его напрямую
        const userProfileId = profileId;

        console.log('[surrender] Starting surrender action:', {
          duel_id,
          userProfileId,
          profileId,
          paramsKeys: Object.keys(params)
        });

        if (!duel_id || !userProfileId) {
          console.error('[surrender] Missing required parameters:', {
            hasDuelId: !!duel_id,
            hasUserProfileId: !!userProfileId,
            duel_id,
            userProfileId
          });
          return new Response(JSON.stringify({
            error: 'duel_id and profile_id are required',
            details: `duel_id: ${duel_id ? 'provided' : 'missing'}, profile_id: ${userProfileId ? 'provided' : 'missing'}`
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Получаем информацию о дуэли
        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('status, bet_amount, host_user, num_questions')
          .eq('id', duel_id)
          .single();

        if (duelError || !duel) {
          console.error('[surrender] Duel not found:', {
            duel_id,
            error: duelError?.message,
            code: duelError?.code
          });
          return new Response(JSON.stringify({
            error: 'Duel not found',
            details: duelError?.message || 'Duel does not exist'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[surrender] Duel found:', {
          duel_id,
          status: duel.status,
          bet_amount: duel.bet_amount
        });

        if (duel.status !== 'active' && duel.status !== 'waiting' && duel.status !== 'waiting_opponent') {
          console.warn('[surrender] Duel status not eligible for surrender:', {
            duel_id,
            current_status: duel.status
          });
          return new Response(JSON.stringify({
            error: 'Duel is not ready for surrender',
            details: `Current status: ${duel.status}. Surrender is only allowed for active or waiting duels.`
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Получаем игроков
        const { data: players, error: playersError } = await supabase
          .from('duel_players')
          .select('id, user_id, score, correct_count')
          .eq('duel_id', duel_id);

        if (playersError) {
          console.error('[surrender] Error fetching players:', {
            duel_id,
            error: playersError.message,
            code: playersError.code
          });
          return new Response(JSON.stringify({
            error: 'Failed to fetch players',
            details: playersError.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!players || players.length < 2) {
          console.warn('[surrender] ⚠️ Not enough players (force cancelling):', {
            duel_id,
            playersCount: players?.length || 0,
            players: players?.map((p: { id: string; user_id: string }) => ({ id: p.id, user_id: p.user_id }))
          });

          // Если игроков меньше 2, но пользователь хочет сдаться - просто отменяем/удаляем дуэль
          // или помечаем как cancelled, чтобы не блокировать интерфейс
          const { error: cancelError } = await supabase
            .from('duels')
            .update({ status: 'cancelled', finished_at: new Date().toISOString() })
            .eq('id', duel_id);

          if (cancelError) {
            console.error('[surrender] Failed to auto-cancel stuck duel:', cancelError);
            // Fallback to error if update fails
            return new Response(JSON.stringify({
              error: 'Not enough players and failed to cancel',
              details: `Found ${players?.length || 0} players, expected at least 2`
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Duel cancelled due to insufficient players',
            surrendered: true // Client expects this flag
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[surrender] Players found:', {
          playersCount: players.length,
          playerUserIds: players.map((p: { user_id: string }) => p.user_id),
          surrenderingUserId: userProfileId
        });

        const surrenderingPlayer = players.find((p: { user_id: string }) => p.user_id === userProfileId);
        const opponentPlayer = players.find((p: { user_id: string }) => p.user_id !== userProfileId);

        if (!surrenderingPlayer) {
          console.error('[surrender] Surrendering player not found:', {
            duel_id,
            userProfileId,
            availableUserIds: players.map((p: { user_id: string }) => p.user_id)
          });
          return new Response(JSON.stringify({
            error: 'Player not found',
            details: `User ${userProfileId} is not a participant in this duel`
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!opponentPlayer) {
          console.error('[surrender] Opponent player not found:', {
            duel_id,
            surrenderingPlayerId: surrenderingPlayer.id,
            availableUserIds: players.map((p: { user_id: string }) => p.user_id)
          });
          return new Response(JSON.stringify({
            error: 'Opponent not found',
            details: 'Could not find opponent player'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[surrender] Players identified:', {
          surrenderingPlayerId: surrenderingPlayer.id,
          opponentPlayerId: opponentPlayer.id
        });

        // Помечаем игрока как сдавшегося
        console.log('[surrender] Updating player status:', {
          playerId: surrenderingPlayer.id,
          userId: userProfileId
        });

        const { error: updateError } = await supabase
          .from('duel_players')
          .update({
            is_connected: false,
            activity_status: 'offline',
            surrendered: true
          })
          .eq('id', surrenderingPlayer.id);

        if (updateError) {
          console.error('[surrender] Error updating player (with surrendered):', {
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint
          });

          // Пробуем обновить без поля surrendered (на случай если миграция не применена)
          console.log('[surrender] Attempting fallback update without surrendered field');
          const { error: fallbackError } = await supabase
            .from('duel_players')
            .update({
              is_connected: false,
              activity_status: 'offline'
            })
            .eq('id', surrenderingPlayer.id);

          if (fallbackError) {
            console.error('[surrender] Fallback update also failed:', {
              error: fallbackError.message,
              code: fallbackError.code,
              details: fallbackError.details
            });
            return new Response(JSON.stringify({
              error: 'Failed to update player status',
              details: updateError.message || 'Could not update player status. Please check if migration is applied.'
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            console.log('[surrender] ✅ Fallback update succeeded (surrendered field may not exist)');
          }
        } else {
          console.log('[surrender] ✅ Player status updated successfully');
        }

        // Завершаем дуэль - оппонент побеждает
        const opponentScore = opponentPlayer.score || 0;
        const surrenderingScore = surrenderingPlayer.score || 0;
        // При сдаче это всегда победа оппонента, даже если очки равны (например 0-0)
        // Это предотвращает возврат ставки (draw refund)
        const isDraw = false;
        const winnerUserId = opponentPlayer ? opponentPlayer.user_id : null;

        console.log('[surrender] Calculating results:', {
          opponentScore,
          surrenderingScore,
          isDraw,
          winnerUserId
        });

        // Обновляем статус дуэли
        const { error: duelUpdateError } = await supabase
          .from('duels')
          .update({
            status: 'finished',
            finished_at: new Date().toISOString(),
            winner_id: winnerUserId,
            is_draw: isDraw
          })
          .eq('id', duel_id);

        if (duelUpdateError) {
          console.error('[surrender] Error updating duel status:', {
            error: duelUpdateError.message,
            code: duelUpdateError.code
          });
          // Не прерываем выполнение, так как игрок уже помечен как сдавшийся
        } else {
          console.log('[surrender] ✅ Duel status updated to finished');
        }

        // Обновляем статистику
        const { error: opponentStatsError } = await supabase.rpc('upsert_duel_stats', {
          p_user_id: opponentPlayer.user_id,
          p_is_win: !isDraw,
          p_is_draw: isDraw,
          p_score: opponentScore
        });

        if (opponentStatsError) {
          console.error('[surrender] Error updating opponent stats:', opponentStatsError);
        }

        const { error: surrenderingStatsError } = await supabase.rpc('upsert_duel_stats', {
          p_user_id: surrenderingPlayer.user_id,
          p_is_win: false,
          p_is_draw: isDraw,
          p_score: surrenderingScore
        });

        if (surrenderingStatsError) {
          console.error('[surrender] Error updating surrendering player stats:', surrenderingStatsError);
        }

        // Обрабатываем ставки
        if (duel.bet_amount > 0) {
          await settleBetPayout({
            supabaseClient: supabase,
            duelId: duel_id,
            betAmount: duel.bet_amount,
            hostUserId: duel.host_user,
            players: players.map((p: { id: string; user_id: string; score: number; is_bot: boolean }) => ({
              id: p.id,
              user_id: p.user_id,
              score: p.score || 0,
              correct_count: p.correct_count || 0
            })),
            winnerUserId,
            isDraw,
          });
        }

        // Создаем уведомление для оппонента
        let surrenderingPlayerName = 'Игрок';
        try {
          surrenderingPlayerName = await getOpponentName(userProfileId, supabase);
        } catch {
          // Ignore error, keep default
        }
        try {
          await createNotification({
            duel_id,
            type: 'opponent_left',
            metadata: {
              opponent_name: surrenderingPlayerName,
              reason: 'surrender'
            }
          }, opponentPlayer.user_id, supabase);
        } catch (err) {
          console.error('[surrender] Error creating notification:', err);
        }

        // Логируем инцидент
        const { error: incidentError } = await supabase
          .from('duel_incidents')
          .insert({
            duel_id,
            player_id: surrenderingPlayer.id,
            incident_type: 'surrender',
            metadata: {
              timestamp: new Date().toISOString(),
              surrendering_score: surrenderingScore,
              opponent_score: opponentScore
            }
          });

        if (incidentError) {
          console.error('[surrender] Error logging incident:', incidentError);
          // Не прерываем выполнение, так как это только логирование
        }

        console.log('[surrender] ✅ Duel surrendered successfully:', {
          duel_id,
          surrenderingPlayer: userProfileId,
          opponentPlayer: opponentPlayer.user_id,
          winner: winnerUserId
        });

        return new Response(JSON.stringify({
          success: true,
          surrendered: true,
          message: 'Duel surrendered, opponent wins'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'mark_technical_draw': {
        const { duel_id } = params;

        if (!duel_id) {
          return new Response(JSON.stringify({ error: 'duel_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Проверяем что дуэль активна
        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('status, bet_amount, host_user')
          .eq('id', duel_id)
          .single();

        if (duelError || !duel) {
          return new Response(JSON.stringify({ error: 'Duel not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (duel.status !== 'active') {
          return new Response(JSON.stringify({ error: 'Duel is not active' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Получаем игроков
        const { data: players, error: playersError } = await supabase
          .from('duel_players')
          .select('user_id')
          .eq('duel_id', duel_id);

        if (playersError || !players || players.length < 2) {
          return new Response(JSON.stringify({ error: 'Not enough players' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Возвращаем ставки всем игрокам
        if (duel.bet_amount > 0) {
          const { data: betRow } = await supabase
            .from('duel_bets')
            .select('host_insurance_premium, opponent_insurance_premium')
            .eq('duel_id', duel_id)
            .maybeSingle();

          for (const player of players) {
            // Возврат ставки
            await supabase.rpc('increment_profile_value', {
              p_profile_id: player.user_id,
              p_column: 'coins',
              p_amount: duel.bet_amount
            });

            await supabase.from('duel_transactions').insert({
              duel_id,
              user_id: player.user_id,
              amount: duel.bet_amount,
              transaction_type: 'refund'
            });

            // Возврат страховки если была
            const isHost = player.user_id === duel.host_user;
            const insurancePremium = isHost
              ? betRow?.host_insurance_premium
              : betRow?.opponent_insurance_premium;

            if (insurancePremium && insurancePremium > 0) {
              await supabase.rpc('increment_profile_value', {
                p_profile_id: player.user_id,
                p_column: 'coins',
                p_amount: insurancePremium
              });

              await supabase.from('duel_transactions').insert({
                duel_id,
                user_id: player.user_id,
                amount: insurancePremium,
                transaction_type: 'insurance_refund'
              });
            }
          }
        }

        // Обновляем статус дуэли
        await supabase
          .from('duels')
          .update({
            status: 'technical_draw',
            finished_at: new Date().toISOString()
          })
          .eq('id', duel_id);

        // Логируем инцидент
        await supabase
          .from('duel_incidents')
          .insert({
            duel_id,
            incident_type: 'technical_error',
            metadata: {
              reason: 'server_error',
              timestamp: new Date().toISOString()
            }
          });

        return new Response(JSON.stringify({
          success: true,
          message: 'Technical draw marked, bets refunded'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('[Duel Manager] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

