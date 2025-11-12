import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const createDuelSchema = z.object({
  num_questions: z.number().int().min(5).max(30),
  categories: z.array(z.string().uuid()).max(10).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mix']).optional(),
  bet_amount: z.number().int().min(0).max(10000).optional().default(0),
  bet_type: z.enum(['none', 'fixed', 'custom']).optional().default('none')
});

const joinDuelSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4}$/, 'Invalid code format - must be 4 characters')
});

const submitAnswerSchema = z.object({
  duel_id: z.string().uuid(),
  duel_question_id: z.string().uuid(),
  selected_option_id: z.string().uuid().nullable().optional(),
  time_taken_ms: z.number().int().min(0).max(60000),
  latency_ms: z.number().int().min(0).max(5000).optional(),
  boost_used: z.string().optional(),
  is_timeout: z.boolean().optional()
});

const useBoostSchema = z.object({
  duel_id: z.string().uuid(),
  duel_question_id: z.string().uuid().optional(),
  boost_type: z.enum(['fifty_fifty', 'time_extend', 'hint', 'skip', 'translate']),
  language: z.enum(['ru', 'en']).optional() // Для translate бустера
});

// Seeded random number generator (Mulberry32)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle for better randomization
function fisherYatesShuffle<T>(array: T[], rng: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

// Bot simulation
function simulateBotAnswer(difficulty: string, questionDifficulty: string): {
  delayMs: number;
  willBeCorrect: boolean;
} {
  const accuracyMap = {
    easy: { easy: 0.95, medium: 0.85, hard: 0.65 },
    medium: { easy: 0.85, medium: 0.70, hard: 0.50 },
    hard: { easy: 0.70, medium: 0.55, hard: 0.35 },
  };
  
  const delayMap = {
    easy: [2000, 4000],
    medium: [3000, 6000],
    hard: [5000, 9000],
  };
  
  const accuracy = accuracyMap[difficulty as keyof typeof accuracyMap]?.[questionDifficulty as keyof typeof accuracyMap.easy] || 0.5;
  const [minDelay, maxDelay] = delayMap[difficulty as keyof typeof delayMap] || [3000, 6000];
  
  return {
    delayMs: Math.floor(Math.random() * (maxDelay - minDelay) + minDelay),
    willBeCorrect: Math.random() < accuracy,
  };
}

// Notification templates with emotional, engaging texts
const notificationTemplates: Record<string, (metadata: any) => { title: string; message: string; icon: string }> = {
  // Start notifications
  'start': (metadata: any) => {
    const opponentName = metadata.opponent_name; // Всегда должно быть установлено
    const templates = [
      { title: `${opponentName} принял твой вызов!`, message: 'Дуэль начинается прямо сейчас.', icon: 'flame' },
      { title: 'Матч стартовал', message: 'Кто победит, решат секунды.', icon: 'sword' },
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  },

  // Progress notifications
  'progress': (metadata: any) => {
    const opponentName = metadata.opponent_name; // Всегда должно быть установлено
    const opponentFinished = metadata.opponent_finished || false; // Игрок уже закончил игру
    const questionNumber = metadata.question_number;
    const questionText = questionNumber ? `на ${questionNumber} вопрос` : '';
    const questionTextWithNumber = questionNumber ? ` на ${questionNumber} вопрос` : '';
    
    // Если игрок уже закончил - показываем только информативные уведомления без мотивации
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
    
    // Если игрок еще играет - показываем мотивирующие уведомления
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
        { 
          title: `Серия из ${metadata.combo} правильных ответов от ${opponentName}!`, 
          message: 'Время ответить сильнее!', 
          icon: 'flame' 
        },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (metadata.error_streak && metadata.error_streak >= 2) {
      // Последовательные ошибки
      const errorMessages: Record<number, Array<{ title: string; message: string; icon: string }>> = {
        2: [
          { title: `${opponentName} ошибся 2 раза подряд`, message: 'Твой шанс вырваться вперёд!', icon: 'target' },
          { title: `${opponentName} снова ошибается`, message: 'Не упусти момент!', icon: 'zap' },
          { title: `Вторая ошибка ${opponentName}`, message: 'Удача на твоей стороне!', icon: 'x-circle' },
        ],
        3: [
          { title: `${opponentName} ошибся 3 раза подряд`, message: 'Это твой шанс!', icon: 'trophy' },
          { title: `${opponentName} теряет очки`, message: 'Продолжай в том же духе!', icon: 'target' },
          { title: `Третья ошибка ${opponentName}`, message: 'Время показать класс!', icon: 'zap' },
        ],
        4: [
          { title: `${opponentName} ошибся ${metadata.error_streak} раза подряд!`, message: 'Твой момент!', icon: 'trophy' },
          { title: `Серия ошибок ${opponentName}`, message: 'Не упусти возможность!', icon: 'target' },
          { title: `${opponentName} в сложной ситуации`, message: 'Твой шанс победить!', icon: 'zap' },
        ],
      };
      const streak = metadata.error_streak >= 4 ? 4 : (metadata.error_streak >= 3 ? 3 : 2);
      const templates = errorMessages[streak] || errorMessages[2];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (metadata.is_correct === false) {
      // Одна ошибка
      const templates = [
        { 
        title: `${opponentName} ошибся`,
        message: 'Твой шанс догнать!',
        icon: 'x-circle'
        },
        { 
          title: `Ошибка ${opponentName}`, 
          message: 'Используй этот момент!', 
          icon: 'target' 
        },
        { 
          title: `${opponentName} дал неверный ответ`, 
          message: 'Не упусти возможность!', 
          icon: 'zap' 
        },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (metadata.progress) {
      // Прогресс по процентам
      const progressMessages: Record<number, Array<{ title: string; message: string; icon: string }>> = {
        25: [
          { title: `${opponentName} прошёл четверть теста!`, message: 'Игра набирает обороты!', icon: 'rocket' },
          { title: `${opponentName} на 25% пути`, message: 'Не отставай!', icon: 'target' },
        ],
        50: [
          { title: `${opponentName} на середине пути!`, message: 'Половина позади, но всё ещё всё возможно!', icon: 'rocket' },
          { title: `${opponentName} прошёл половину теста`, message: 'Середина игры - время действовать!', icon: 'flame' },
        ],
        75: [
          { title: `${opponentName} прошёл три четверти!`, message: 'Финишная прямая началась!', icon: 'rocket' },
          { title: `${opponentName} почти у цели`, message: 'Осталось совсем немного!', icon: 'target' },
        ],
      };
      const templates = progressMessages[metadata.progress] || [
        { title: `${opponentName} прошёл ${metadata.progress}% теста!`, message: 'Игра набирает обороты!', icon: 'rocket' }
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (metadata.time_diff && metadata.time_diff > 0) {
      const templates = [
        { title: `Ты опережаешь ${opponentName} на ${metadata.time_diff} секунд!`, message: 'Продолжай в том же духе!', icon: 'turtle' },
        { title: `Ты быстрее ${opponentName} на ${metadata.time_diff} секунд`, message: 'Не сбавляй темп!', icon: 'zap' },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (metadata.is_tied) {
      const templates = [
        { title: 'Игра идёт вровень', message: 'Кто ответит первым, тот победит!', icon: 'flame' },
        { title: 'Равный счёт!', message: 'Каждый ответ имеет значение!', icon: 'target' },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else {
      // Правильный ответ (обычный)
      const questionNumberText = questionNumber ? ` на ${questionNumber} вопрос` : '';
      const templates = [
        { 
          title: `${opponentName} ответил правильно${questionNumberText}`, 
          message: questionNumber === 1 ? 'Игра набирает обороты!' : 'Продолжайте бороться!', 
        icon: 'check-circle'
        },
        { 
          title: `${opponentName} дал правильный ответ${questionNumberText}`, 
          message: questionNumber === 1 ? 'Начало положено!' : 'Не сдавайся!', 
          icon: 'target' 
        },
        { 
          title: `${opponentName} правильно ответил${questionNumberText}`, 
          message: questionNumber === 1 ? 'Игра только начинается!' : 'Всё ещё впереди!', 
          icon: 'zap' 
        },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }
  },

  // Boost notifications
  'boost': (metadata: any) => {
    const opponentName = metadata.opponent_name; // Всегда должно быть установлено
    const boostNames: Record<string, string> = {
      'fifty_fifty': '50/50',
      'time_extend': 'Дополнительное время',
      'hint': 'Подсказка',
      'skip': 'Пропуск',
      'translate': 'Перевод'
    };
    const boostIcons: Record<string, string> = {
      'fifty_fifty': 'zap',
      'time_extend': 'timer',
      'hint': 'lightbulb',
      'skip': 'skip-forward',
      'translate': 'globe'
    };
    const boostType = metadata.boost_type || 'unknown';
    const boostName = boostNames[boostType] || boostType;
    const icon = boostIcons[boostType] || 'zap';

    const boostMessages: Record<string, Array<{ title: string; message: string }>> = {
      'fifty_fifty': [
        { title: `${opponentName} использовал 50/50!`, message: 'Осторожно! Он убрал половину вариантов.' },
        { title: `${opponentName} активировал 50/50`, message: 'Будь внимательнее - вариантов стало меньше!' },
      ],
      'time_extend': [
        { title: `${opponentName} использовал дополнительное время`, message: 'У него есть больше времени на размышление!' },
        { title: `${opponentName} взял тайм-аут`, message: 'Используй свои бустеры, чтобы не отстать!' },
      ],
      'hint': [
        { title: `${opponentName} взял подсказку!`, message: 'У него есть помощь. Не отставай!' },
        { title: `${opponentName} использовал подсказку`, message: 'Используй свои бустеры тоже!' },
      ],
      'skip': [
        { title: `${opponentName} пропустил вопрос`, message: 'Не сдаётся! Продолжай бороться!' },
        { title: `${opponentName} использовал пропуск`, message: 'Он не остановился. Ты тоже не останавливайся!' },
      ],
      'translate': [
        { title: `${opponentName} перевёл вопрос`, message: 'У него есть перевод. Время действовать!' },
        { title: `${opponentName} использовал перевод`, message: 'Используй все свои возможности!' },
      ],
    };

    const templates = boostMessages[boostType] || [
      { title: `${opponentName} использовал бустер '${boostName}'!`, message: 'Используй свои бустеры!' }
    ];

    const selected = templates[Math.floor(Math.random() * templates.length)];
    return {
      ...selected,
      icon
    };
  },

  // Finish notifications
  'finish': (metadata: any) => {
    const opponentName = metadata.opponent_name; // Всегда должно быть установлено
    const correctAnswers = metadata.correct_answers || 0;
    
    if (metadata.is_winner === false) {
      const templates = [
        { 
        title: `${opponentName} закончил игру`,
        message: `С ${correctAnswers} правильными ответами! Результаты готовы.`,
        icon: 'flag'
        },
        { 
          title: `${opponentName} завершил дуэль`, 
          message: `Правильных ответов: ${correctAnswers}. Смотри результаты!`, 
          icon: 'trophy' 
        },
        { 
          title: `${opponentName} финишировал!`, 
          message: `${correctAnswers} из ${metadata.total_questions || 'всех'} вопросов правильных.`, 
          icon: 'check-circle' 
        },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (metadata.is_last_question) {
      const templates = [
        { title: 'Победа близка', message: 'Остался один вопрос!', icon: 'target' },
        { title: 'Финишная прямая', message: 'Последний вопрос решает всё!', icon: 'flag' },
        { title: 'Осталось совсем немного', message: 'Один вопрос до победы!', icon: 'trophy' },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else {
      const templates = [
        { title: 'Результаты готовы!', message: 'Проверь, кто выиграл дуэль.', icon: 'trophy' },
        { title: 'Дуэль завершена!', message: 'Узнай, кто стал победителем!', icon: 'flag' },
        { title: 'Игра окончена', message: 'Время посмотреть результаты!', icon: 'check-circle' },
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }
  },

  // Reminder notifications
  'reminder': (metadata: any) => {
    const opponentName = metadata.opponent_name; // Всегда должно быть установлено
    
    if (metadata.is_waiting) {
      return {
        title: `Дуэль с ${opponentName} ждёт твоего ответа`,
        message: 'Не забудь завершить игру!',
        icon: 'clock'
      };
    } else if (metadata.is_timeout_warning) {
      return {
        title: 'Время почти вышло',
        message: 'Завершай дуэль!',
        icon: 'bell'
      };
    } else {
      return {
        title: `${opponentName} ещё не закончил игру`,
        message: 'Напомни ему!',
        icon: 'moon'
      };
    }
  },

  // Timeout notifications
  'timeout': (metadata: any) => {
    return {
      title: 'Время истекло',
      message: 'Дуэль завершена по таймауту.',
      icon: 'clock'
    };
  },

  // Opponent ahead/behind (legacy support)
  'opponent_ahead': (metadata: any) => {
    const opponentName = metadata.opponent_name; // Всегда должно быть установлено
    return {
      title: `${opponentName} опережает тебя`,
      message: 'Ускорься, чтобы догнать!',
      icon: 'zap'
    };
  },

  'opponent_behind': (metadata: any) => {
    const opponentName = metadata.opponent_name; // Всегда должно быть установлено
    return {
      title: `Ты опережаешь ${opponentName}`,
      message: 'Продолжай в том же духе!',
      icon: 'turtle'
    };
  },
};

// Helper function to get opponent name from profile
async function getOpponentName(opponentId: string, supabase: any): Promise<string> {
  console.log('[getOpponentName] 🔍 Fetching opponent name for ID:', opponentId);
  
  if (!opponentId) {
    console.warn('[getOpponentName] ⚠️ No opponentId provided');
    return 'Игрок';
  }
  
  try {
    // Попробуем получить профиль по ID
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, first_name, username, telegram_username, telegram_id, user_id')
      .eq('id', opponentId)
      .single();

    console.log('[getOpponentName] Profile query result:', {
      opponentId,
      hasData: !!profile,
      error: error?.message,
      errorCode: error?.code,
      profile: profile ? {
        id: profile.id,
        user_id: profile.user_id,
        first_name: profile.first_name,
        username: profile.username,
        telegram_username: profile.telegram_username,
        has_telegram_id: !!profile.telegram_id
      } : null
    });

    if (profile) {
      // Приоритет: first_name > username > telegram_username > "Игрок"
      let name = profile.first_name || profile.username || profile.telegram_username;
      
      if (name && name.trim()) {
        name = name.trim();
        
        // Проверяем, что имя не является ID (8 символов hex или UUID)
        if (name.length <= 8 && /^[a-f0-9]{8}$/i.test(name)) {
          console.warn('[getOpponentName] ⚠️ Name looks like an ID:', name, '- using fallback "Игрок"');
          return 'Игрок';
        }
        
        // Проверяем, что имя не является UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)) {
          console.warn('[getOpponentName] ⚠️ Name looks like a UUID:', name, '- using fallback "Игрок"');
          return 'Игрок';
        }
        
        console.log('[getOpponentName] ✅ Found valid name:', name);
        return name;
      }
      
      // Если ничего нет, используем "Игрок" вместо ID
      console.warn('[getOpponentName] ⚠️ No name found in profile, using fallback "Игрок"');
      console.log('[getOpponentName] Profile data:', JSON.stringify(profile, null, 2));
      return 'Игрок';
    }
    
    if (error) {
      console.error('[getOpponentName] ❌ Error fetching profile:', error);
      console.error('[getOpponentName] Error details:', JSON.stringify(error, null, 2));
      
      // Если ошибка "not found", попробуем получить через user_id
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        console.log('[getOpponentName] 🔄 Profile not found by id, trying to find by user_id...');
        
        // Попробуем найти профиль через auth.users
        try {
          // Это может не сработать, но попробуем
          const { data: authUser } = await supabase.auth.admin.getUserById(opponentId);
          if (authUser?.user) {
            console.log('[getOpponentName] Found auth user:', authUser.user.id);
            // Попробуем получить имя из метаданных Telegram
            const telegramData = authUser.user.user_metadata?.telegram;
            if (telegramData?.first_name) {
              console.log('[getOpponentName] ✅ Found name from Telegram metadata:', telegramData.first_name);
              return telegramData.first_name;
            }
          }
        } catch (authError) {
          console.error('[getOpponentName] Error getting auth user:', authError);
        }
      }
    }
  } catch (error) {
    console.error('[getOpponentName] ❌ Exception:', error);
    console.error('[getOpponentName] Exception details:', JSON.stringify(error, null, 2));
  }
  
  // Последний fallback - "Игрок" вместо ID
  console.warn('[getOpponentName] ⚠️ Using final fallback "Игрок" for ID:', opponentId);
  return 'Игрок';
}

// Helper function to create notifications with templates
// Always returns Response
async function createNotification(body: any, profileId: string, supabase: any): Promise<Response> {
  const { duel_id, type, title, message, icon, metadata = {} } = body;

  console.log('[create_notification] Creating notification for duel:', duel_id, 'type:', type, 'profileId:', profileId);

  try {
    // Get opponent's profile_id
    const { data: players, error: playersError } = await supabase
      .from('duel_players')
      .select('user_id')
      .eq('duel_id', duel_id);

    if (playersError) {
      console.error('[create_notification] Error getting players:', playersError);
      return new Response(JSON.stringify({ error: playersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!players || players.length < 2) {
      console.warn('[create_notification] Not enough players:', players?.length || 0);
      return new Response(JSON.stringify({ error: 'Not enough players' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const opponentId = players.find((p: any) => p.user_id !== profileId)?.user_id;
    
    if (!opponentId) {
      console.warn('[create_notification] Opponent not found. Players:', players, 'profileId:', profileId);
      return new Response(JSON.stringify({ error: 'Opponent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[create_notification] Opponent found:', opponentId, 'All players:', JSON.stringify(players.map((p: any) => ({ user_id: p.user_id }))));

    // Get opponent name if not provided in metadata
    // ВАЖНО: Всегда получаем имя соперника перед использованием шаблона
    if (!metadata.opponent_name) {
      try {
        console.log('[create_notification] 🔍 Fetching opponent name for opponentId:', opponentId);
        metadata.opponent_name = await getOpponentName(opponentId, supabase);
        console.log('[create_notification] ✅ Opponent name retrieved:', metadata.opponent_name);
      } catch (nameError: any) {
        console.error('[create_notification] ❌ Error getting opponent name:', nameError);
        console.error('[create_notification] Error details:', JSON.stringify(nameError, null, 2));
        // Используем "Игрок" как fallback вместо ID
        metadata.opponent_name = 'Игрок';
      }
    }
    
    // Убеждаемся, что opponent_name всегда установлен и валиден
    if (!metadata.opponent_name || metadata.opponent_name.trim() === '') {
      console.warn('[create_notification] ⚠️ Opponent name is empty, using fallback "Игрок"');
      metadata.opponent_name = 'Игрок';
    }
    
    // Убеждаемся, что имя не является ID (проверяем длину и формат)
    if (metadata.opponent_name.length <= 8 && /^[a-f0-9]{8}$/i.test(metadata.opponent_name)) {
      console.warn('[create_notification] ⚠️ Opponent name looks like an ID:', metadata.opponent_name, '- using fallback "Игрок"');
      metadata.opponent_name = 'Игрок';
    }
    
    console.log('[create_notification] 📝 Final opponent_name for notification:', metadata.opponent_name);

    // Проверяем, закончил ли получатель уведомления (profileId) игру (для персонализации текстов)
    // ВАЖНО: проверяем получателя уведомления, а не оппонента!
    let recipientFinished = false;
    if (type === 'progress') {
      try {
        const { data: duel } = await supabase
          .from('duels')
          .select('num_questions')
          .eq('id', duel_id)
          .single();
        
        if (duel) {
          // Получатель уведомления - это profileId (не opponentId!)
          const { data: recipientPlayer } = await supabase
            .from('duel_players')
            .select('id')
            .eq('duel_id', duel_id)
            .eq('user_id', profileId)
            .single();
          
          if (recipientPlayer) {
            const { count: recipientAnswersCount } = await supabase
              .from('duel_answers')
              .select('*', { count: 'exact', head: true })
              .eq('player_id', recipientPlayer.id)
              .eq('duel_id', duel_id);
            
            recipientFinished = (recipientAnswersCount || 0) >= duel.num_questions;
            console.log('[create_notification] Recipient finished check:', { 
              recipientAnswersCount, 
              required: duel.num_questions, 
              recipientFinished,
              profileId,
              opponentId
            });
          }
        }
      } catch (error) {
        console.warn('[create_notification] Error checking recipient finished status:', error);
      }
    }
    
    // Добавляем флаг в metadata для использования в шаблонах
    metadata.opponent_finished = recipientFinished; // Переименовано для ясности, но оставляем старое имя для совместимости

    // Use template if title/message/icon are not provided
    let finalTitle = title;
    let finalMessage = message;
    let finalIcon = icon;

    if (!title || !message || !icon) {
      const template = notificationTemplates[type];
      if (template) {
        const templateResult = template(metadata);
        finalTitle = finalTitle || templateResult.title;
        finalMessage = finalMessage || templateResult.message;
        finalIcon = finalIcon || templateResult.icon;
      } else {
        // Fallback if template not found
        finalTitle = finalTitle || `Уведомление ${type}`;
        finalMessage = finalMessage || 'Новое уведомление';
        finalIcon = finalIcon || 'bell';
      }
    }

    console.log('[create_notification] Final notification:', { title: finalTitle, message: finalMessage, icon: finalIcon });

    // Create notification
    console.log('[create_notification] Inserting notification:', {
      user_id: opponentId,
      duel_id,
      type,
      title: finalTitle,
      message: finalMessage,
      icon: finalIcon
    });
    
    const { data: insertedNotification, error: notifError } = await supabase
      .from('duel_notifications')
      .insert({
        user_id: opponentId,
        duel_id,
        type,
        title: finalTitle,
        message: finalMessage,
        icon: finalIcon,
        metadata,
        is_read: false
      })
      .select()
      .single();

    if (notifError) {
      console.error('[create_notification] Error inserting notification:', notifError);
      console.error('[create_notification] Error details:', JSON.stringify(notifError));
      return new Response(JSON.stringify({ error: notifError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[create_notification] ✅ Notification created successfully:', { 
      id: insertedNotification?.id,
      type, 
      title: finalTitle,
      message: finalMessage,
      icon: finalIcon,
      opponentId,
      user_id: insertedNotification?.user_id,
      duel_id: insertedNotification?.duel_id,
      created_at: insertedNotification?.created_at
    });
    
    // Verify notification was actually inserted
    if (!insertedNotification) {
      console.error('[create_notification] ❌ Notification insert returned null!');
      throw new Error('Notification insert failed - no data returned');
    }
    
    // Log notification details for debugging
    console.log('[create_notification] 📤 Notification ready for Realtime delivery:', {
      notification_id: insertedNotification.id,
      user_id: insertedNotification.user_id,
      type: insertedNotification.type,
      title: insertedNotification.title
    });
    
    // ========================================
    // Отправка в Telegram через notification-sender
    // ВАЖНО: отправляем только важные уведомления (результаты),
    // чтобы не создавать спам. Старт, прогресс и т.д. — только в приложении.
    // ========================================
    
    // Типы уведомлений для Telegram (только важные)
    const TELEGRAM_NOTIFICATION_TYPES = ['finish', 'timeout'];
    
    if (TELEGRAM_NOTIFICATION_TYPES.includes(type)) {
      try {
        console.log('[create_notification] 📱 Sending important notification to Telegram:', type);
        
        // Подготавливаем переменные для шаблона
        const notificationVariables: Record<string, any> = {
          ...metadata,
          duel_id,
          opponent_name: metadata.opponent_name || 'Игрок'
        };
        
        // Определяем тип шаблона для notification-sender
        let templateType = type;
        if (type === 'finish') {
          // Определяем победителя/проигравшего для правильного шаблона
          const isWinner = metadata.is_winner || false;
          templateType = isWinner ? 'duel_win' : 'duel_lose';
        }
        
        const notificationSenderResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notification-sender`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            user_id: opponentId,
            template_type: templateType,
            variables: notificationVariables,
            title: finalTitle,
            message: finalMessage,
            icon: finalIcon,
            cta_text: 'Посмотреть результаты',
            cta_deeplink: `duel_${duel_id}`,
            force: false // Учитываем настройки пользователя
          })
        });
        
        if (notificationSenderResponse.ok) {
          const senderResult = await notificationSenderResponse.json();
          console.log('[create_notification] ✅ Telegram notification sent:', senderResult);
        } else {
          const senderError = await notificationSenderResponse.json();
          console.warn('[create_notification] ⚠️ Telegram notification failed:', senderError);
          // Не бросаем ошибку - уведомление в приложении уже создано
        }
      } catch (telegramError: any) {
        console.error('[create_notification] ❌ Telegram notification error:', telegramError);
        // Не бросаем ошибку - продолжаем работу
      }
    } else {
      console.log('[create_notification] ⏭️ Skipping Telegram notification for type:', type, '(only in-app)');
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[create_notification] Exception:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body first to get profile_id if provided
    const { action, profile_id, ...params } = await req.json();

    console.log('[Duel Manager] Action:', action, 'Profile ID from client:', profile_id);

    let profileId: string | null = profile_id || null;

    // If profile_id is not provided, try to get it from auth (fallback for email users)
    if (!profileId) {
      console.log('[Duel Manager] No profile_id provided, attempting auth lookup...');
      const authHeader = req.headers.get('Authorization')!;
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (user && !authError) {
        console.log('[Duel Manager] Authenticated user found:', user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile && !profileError) {
          profileId = profile.id;
          console.log('[Duel Manager] Profile found via auth:', profileId);
        }
      }
    } else {
      console.log('[Duel Manager] Using profile_id from client:', profileId);
    }

    if (!profileId) {
      console.error('[Duel Manager] Profile not found - neither from client nor auth');
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
          started_at: duel.started_at
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_players': {
        const { duel_id } = params;
        
        console.log('[Duel Manager] Getting players for duel:', duel_id, 'Profile:', profileId);
        
        // Загружаем игроков без join (чтобы избежать проблем с RLS)
        const { data: players, error: playersError } = await supabase
          .from('duel_players')
          .select('id, user_id, score, correct_count')
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
        
        // Загружаем профили отдельно для каждого игрока
        const userIds = players.map((p: any) => p.user_id).filter(Boolean);
        const profilesMap = new Map();
        
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, username, telegram_username, telegram_id')
            .in('id', userIds);
          
          console.log('[get_players] Profiles query result:', {
            userIds,
            profilesCount: profiles?.length || 0,
            error: profilesError?.message,
            profiles: profiles?.map((p: any) => ({
              id: p.id,
              first_name: p.first_name,
              username: p.username,
              telegram_username: p.telegram_username,
              has_telegram_id: !!p.telegram_id
            }))
          });
          
          if (!profilesError && profiles) {
            profiles.forEach((profile: any) => {
              profilesMap.set(profile.id, profile);
            });
          } else if (profilesError) {
            console.error('[get_players] Error loading profiles:', profilesError);
          }
        }
        
        // Format players with names
        const formattedPlayers = players.map((p: any) => {
          const profile = profilesMap.get(p.user_id);
          
          console.log('[get_players] Processing player:', {
            playerId: p.id,
            userId: p.user_id,
            hasProfile: !!profile,
            profile: profile ? {
              first_name: profile.first_name,
              username: profile.username,
              telegram_username: profile.telegram_username
            } : null
          });
          
          let name: string | null = null;
          
          if (profile) {
            // Приоритет: first_name > username > telegram_username
            // Проверяем все поля отдельно, чтобы не пропустить имя
            if (profile.first_name && profile.first_name.trim() && profile.first_name !== 'Игрок') {
              name = profile.first_name.trim();
            } else if (profile.username && profile.username.trim() && profile.username !== 'Игрок') {
              name = profile.username.trim();
            } else if (profile.telegram_username && profile.telegram_username.trim() && profile.telegram_username !== 'Игрок') {
              name = profile.telegram_username.trim();
            }
            
            // Если имя не найдено или пустое, используем fallback
            if (!name || name.trim() === '') {
              console.warn('[get_players] No valid name found in profile, using fallback "Игрок"', {
                profile: {
                  id: profile.id,
                  first_name: profile.first_name,
                  username: profile.username,
                  telegram_username: profile.telegram_username
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
          
          return {
            id: p.id,
            user_id: p.user_id,
            score: p.score || 0,
            correct_count: p.correct_count || 0,
            name: name
          };
        });
        
        console.log('[Duel Manager] ✅ Found players:', formattedPlayers.length, formattedPlayers.map((p: any) => ({ id: p.id, name: p.name })));
        
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

      case 'create_duel': {
        const validated = createDuelSchema.parse(params);
        const { num_questions, categories, difficulty, bet_amount = 0, bet_type = 'none' } = validated;
        
        // Check if host has enough coins for bet
        if (bet_amount > 0) {
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
          
          if ((profile.coins || 0) < bet_amount) {
            return new Response(JSON.stringify({ error: `Insufficient coins. You need ${bet_amount} coins but only have ${profile.coins || 0}` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Deduct bet from host
          await supabase
            .from('profiles')
            .update({ coins: profile.coins - bet_amount })
            .eq('id', profileId);
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
        }

        // Add host as player using correct user_id (which is profile.id)
        console.log('[Duel Manager] Creating host player for duel:', duel.id, 'profileId:', profileId);
        const { data: hostPlayer, error: playerError } = await supabase
          .from('duel_players')
          .insert({
          duel_id: duel.id,
          user_id: profileId,  // This is profile.id
          is_host: true,
          })
          .select()
          .single();

        if (playerError) {
          console.error('[Duel Manager] ❌ Error adding host player:', playerError);
          console.error('[Duel Manager] Error details:', JSON.stringify(playerError, null, 2));
          throw playerError;
        }

        console.log('[Duel Manager] ✅ Host player created:', hostPlayer?.id);

        return new Response(JSON.stringify({ duel, code }), {
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
            await supabase
              .from('profiles')
              .update({ coins: profile.coins + duel.bet_amount })
              .eq('id', profileId);
            
            // Record refund transaction
            await supabase
              .from('duel_transactions')
              .insert({
                duel_id: duel_id,
                user_id: profileId,
                amount: duel.bet_amount,
                transaction_type: 'refund'
              });
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

      case 'join_duel': {
        const validated = joinDuelSchema.parse(params);
        let { code } = validated;
        
        // Normalize code to uppercase and ensure it's exactly 4 characters
        code = code.toUpperCase().trim().slice(0, 4);
        
        // Validate length after normalization
        if (code.length !== 4) {
          return new Response(JSON.stringify({ error: 'Code must be exactly 4 characters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: duel, error: duelError } = await supabase
          .from('duels')
          .select('*')
          .eq('code', code)
          .single();

        if (duelError || !duel) {
          return new Response(JSON.stringify({ error: 'Duel not found' }), {
            status: 404,
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

        // Check if user is trying to join their own duel
        if (duel.host_user === profileId) {
          return new Response(JSON.stringify({ error: 'You cannot join your own duel. You are already the host.' }), {
            status: 400,
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
          
          if ((profile.coins || 0) < betAmount) {
            return new Response(JSON.stringify({ error: `Insufficient coins for bet. You need ${betAmount} coins but only have ${profile.coins || 0}` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Deduct bet from joining player
          await supabase
            .from('profiles')
            .update({ coins: profile.coins - betAmount })
            .eq('id', profileId);
          
          // Record bet transaction
          await supabase
            .from('duel_transactions')
            .insert({
              duel_id: duel.id,
              user_id: profileId,
              amount: -betAmount,
              transaction_type: 'bet'
            });
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
        const { data: allPlayers } = await supabase
          .from('duel_players')
          .select('id')
          .eq('duel_id', duel.id);

        console.log('[join_duel] ✅ Player count check:', allPlayers?.length);

        if (allPlayers && allPlayers.length === 2) {
          console.log('[join_duel] 🚀 AUTO-START: 2 players detected, starting duel...');
          
          try {
          // Auto-start: Load ALL questions, then randomly select
            console.log('[join_duel] Loading questions...');
            const { data: allQuestions, error: questionsError } = await supabase
            .from('questions_new')
            .select(`
              id, question_ru, question_es, question_en, image_url, difficulty,
              answer_options(id, text_ru, text_es, text_en, is_correct, position)
            `);

            if (questionsError) {
              console.error('[join_duel] ❌ Error loading questions:', questionsError);
              throw questionsError;
            }

          if (!allQuestions || allQuestions.length === 0) {
              console.error('[join_duel] ❌ No questions found in database');
            throw new Error('No questions found');
          }

            console.log(`[join_duel] ✅ Total questions loaded: ${allQuestions.length}`);

          // Smart randomization: Fisher-Yates shuffle for better distribution
          // Use seed for reproducible randomness (same seed = same questions for both players)
          const rng = mulberry32(duel.question_seed);
          const shuffled = fisherYatesShuffle(allQuestions, rng);
          const selectedQuestions = shuffled.slice(0, duel.num_questions);
          
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
                .filter((opt: any) => opt.is_correct)
                .map((opt: any) => opt.id),
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

          // Create start notification for host (first player)
          // Wrap in try-catch to prevent notification errors from breaking duel start
          try {
            const notifResult = await createNotification({
              duel_id: duel.id,
              type: 'start',
              metadata: {}
            }, profileId, supabase);
            
            if (!notifResult) {
              console.warn('[join_duel] Failed to create start notification - continuing anyway');
            } else {
              console.log('[join_duel] ✅ Start notification created successfully');
            }
          } catch (notifErr: any) {
            console.error('[join_duel] Error creating start notification:', notifErr);
            console.error('[join_duel] Notification error details:', JSON.stringify(notifErr, null, 2));
            // Continue anyway - notification failure shouldn't block duel start
          }

          console.log('[join_duel] ✅ Returning response with auto_started: true');
          return new Response(
            JSON.stringify({ duel: { ...duel, status: 'active' }, player, auto_started: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
          } catch (autoStartError: any) {
            console.error('[join_duel] ❌❌❌ CRITICAL ERROR in auto-start:', autoStartError);
            console.error('[join_duel] Error message:', autoStartError?.message);
            console.error('[join_duel] Error details:', JSON.stringify(autoStartError, null, 2));
            // Если автостарт не удался, возвращаем ошибку
            return new Response(JSON.stringify({ 
              error: 'Failed to auto-start duel: ' + (autoStartError?.message || 'Unknown error'),
              duel, 
              player,
              auto_started: false
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        console.log('[join_duel] Only 1 player, waiting for opponent');
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

        // Get questions using seed
        const rng = mulberry32(duel.question_seed);
        let query = supabase.from('questions_new').select('*');
        
        if (duel.difficulty && duel.difficulty !== 'mix') {
          query = query.eq('difficulty', duel.difficulty);
        }
        
        if (duel.categories) {
          query = query.in('topic_id', duel.categories);
        }

        const { data: allQuestions, error: questionsError } = await query;
        if (questionsError || !allQuestions || allQuestions.length === 0) {
          throw new Error('No questions available');
        }

        // Smart randomization: Fisher-Yates shuffle for better distribution
        const shuffled = fisherYatesShuffle(allQuestions, rng);
        const selectedQuestions = shuffled.slice(0, duel.num_questions);

        // Create question snapshots
        for (let i = 0; i < selectedQuestions.length; i++) {
          const q = selectedQuestions[i];
          
          const { data: options } = await supabase
            .from('answer_options')
            .select('*')
            .eq('question_id', q.id)
            .order('position');

          const snapshot = {
            question_ru: q.question_ru,
            question_es: q.question_es,
            question_en: q.question_en,
            image_url: q.image_url,
            answer_options: options || [],
            difficulty: q.difficulty,
          };

          const correctOptionIds = options?.filter(o => o.is_correct).map(o => o.id) || [];

          await supabase.from('duel_questions').insert({
            duel_id: duel.id,
            question_id: q.id,
            position: i + 1,
            question_snapshot: snapshot,
            correct_option_ids: correctOptionIds,
          });
        }

        // Update duel status
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
        } catch (notifErr: any) {
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

        // Get player
        const { data: player } = await supabase
          .from('duel_players')
          .select('*')
          .eq('duel_id', duel_id)
          .eq('user_id', profileId)
          .single();

        if (!player) throw new Error('Player not found');

        // Get question
        const { data: question } = await supabase
          .from('duel_questions')
          .select('*')
          .eq('id', duel_question_id)
          .single();

        if (!question) throw new Error('Question not found');

        // Check if already answered
        const { data: existingAnswer } = await supabase
          .from('duel_answers')
          .select('id')
          .eq('player_id', player.id)
          .eq('duel_question_id', duel_question_id)
          .single();

        if (existingAnswer) {
          return new Response(JSON.stringify({ error: 'Already answered' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const correctIds = question.correct_option_ids as string[];
        const isSkipped = !selected_option_id || is_timeout;
        const isCorrect = !isSkipped && selected_option_id ? correctIds.includes(selected_option_id) : false;

        // Calculate combo - count consecutive correct answers (NOT skipped, NOT incorrect)
        // Get all answers for this player in this duel, ordered by creation time DESC (newest first)
        const { data: allAnswers } = await supabase
          .from('duel_answers')
          .select('is_correct, is_skipped, created_at')
          .eq('player_id', player.id)
          .eq('duel_id', duel_id)
          .order('created_at', { ascending: false });

        let combo = 0;
        if (allAnswers && allAnswers.length > 0) {
          // Count consecutive correct answers from the most recent backwards
          // Stop counting when we hit an incorrect answer OR a skipped answer
          for (const answer of allAnswers) {
            // Only count if answer is correct AND not skipped
            if (answer.is_correct === true && answer.is_skipped === false) {
              combo++;
            } else {
              // Stop counting when we hit an incorrect or skipped answer
              // This breaks the combo chain
              break;
            }
          }
        }
        
        console.log('[submit_answer] Combo calculation:', {
          totalAnswers: allAnswers?.length || 0,
          comboBeforeCurrent: combo,
          isCorrect,
          isSkipped,
          selected_option_id
        });
        
        // Combo is now the number of consecutive correct answers BEFORE this one
        // We'll use this combo for calculating points for the current answer
        // After inserting, if current answer is correct, return combo + 1, else return 0

        // Adjust time for latency
        const adjustedTime = Math.max(0, time_taken_ms - (latency_ms || 0));
        const timeLimit = 60000; // 60 seconds
        const timeRemain = Math.max(0, timeLimit - adjustedTime);

        const difficulty = (question.question_snapshot as any).difficulty || 'medium';
        // Use combo BEFORE current answer for scoring
        // If current answer is correct, combo will be used, if incorrect/skipped, points = 0
        const points = isCorrect ? calculateScore(difficulty, timeRemain, timeLimit, combo) : 0;

        // ВАЖНО: Получаем данные для уведомлений ДО записи ответа
        // Получаем все предыдущие ответы (до текущего) для расчета streak
        const { data: previousAnswers } = await supabase
          .from('duel_answers')
          .select('id, is_correct')
          .eq('player_id', player.id)
          .eq('duel_id', duel_id)
          .order('created_at', { ascending: false });
        
        // Количество ответов до текущего
        const previousAnswersCount = previousAnswers?.length || 0;
        
        // Calculate error streak from PREVIOUS answers only (not including current)
        let errorStreak = 0;
        if (!isCorrect) {
          errorStreak = 1; // Current answer is error
          
          // Count consecutive errors from previous answers
          if (previousAnswers && previousAnswers.length > 0) {
            for (const answer of previousAnswers) {
              if (answer.is_correct === false) {
                errorStreak++;
              } else {
                break; // Stop at first correct answer
              }
            }
          }
        }
        
        console.log('[submit_answer] Pre-insert notification data:', {
          previousAnswersCount,
          errorStreak,
          isCorrect,
          questionPosition: question.position
        });

        // Insert answer
        await supabase.from('duel_answers').insert({
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
        });

        // Update player score
        const newScore = player.score + points;
        await supabase
          .from('duel_players')
          .update({
            score: newScore,
            correct_count: player.correct_count + (isCorrect ? 1 : 0),
          })
          .eq('id', player.id);

        // ============================================================================
        // CRITICAL: SERVER IS SOURCE OF TRUTH FOR SCORES
        // ============================================================================
        // Always return new_score from server - client MUST use this value
        // Never let client calculate scores locally
        // ============================================================================

        // Return combo AFTER processing this answer
        // CRITICAL: Combo MUST reset to 0 if current answer is incorrect or skipped
        // If current answer is correct and not skipped, combo increases by 1
        // If current answer is incorrect or skipped, combo resets to 0 (not continue from previous)
        let finalCombo = 0;
        if (isCorrect === true && isSkipped === false) {
          // Current answer is correct and not skipped - increment combo
          finalCombo = combo + 1;
        } else {
          // Current answer is incorrect OR skipped - combo resets to 0
          finalCombo = 0;
        }
        
        console.log('[submit_answer] Final combo:', {
          comboBefore: combo,
          isCorrect,
          isSkipped,
          finalCombo
        });

        // Create progress notification for opponent
        // Always notify about opponent's answer (not just at milestones)
        if (!isSkipped) {
          console.log('[submit_answer] Creating progress notification for opponent');
          
          const { data: duel } = await supabase
            .from('duels')
            .select('num_questions')
            .eq('id', duel_id)
            .single();
          
          // Total answers including current one
          const totalAnswers = previousAnswersCount + 1;
          const progress = duel ? Math.round((totalAnswers / duel.num_questions) * 100) : 0;
          
          // Get question number from position (this is the actual question number)
          const questionNumber = question.position;
          
          console.log('[submit_answer] Notification metadata:', {
            is_correct: isCorrect,
            question_number: questionNumber,
            combo: finalCombo,
            error_streak: errorStreak,
            progress,
            totalAnswers,
            previousAnswersCount
          });
          
          // Always notify about progress, but include progress percentage only at milestones
          const notifResult = await createNotification({
            duel_id,
            type: 'progress',
            metadata: {
              is_correct: isCorrect,
              question_number: questionNumber,
              combo: finalCombo >= 3 ? finalCombo : undefined, // Notify about combo only if >= 3
              error_streak: errorStreak >= 2 ? errorStreak : undefined, // Notify about error streak only if >= 2
              progress: progress >= 25 && progress % 25 === 0 ? progress : undefined, // Notify at 25%, 50%, 75%
            }
          }, profileId, supabase).catch(err => {
            console.error('[submit_answer] Error creating progress notification:', err);
            return false;
          });
          
          if (!notifResult) {
            console.warn('[submit_answer] Failed to create progress notification - opponent might not be found yet');
          } else {
            console.log('[submit_answer] ✅ Progress notification created successfully');
          }
        }

        return new Response(JSON.stringify({ 
          is_correct: isCorrect, 
          points_awarded: points,
          new_score: newScore,
          combo: finalCombo,
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
        
        let boostEffect: any = { success: true };

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
              .filter((opt: any) => !correctIds.includes(opt.id))
              .map((opt: any) => opt.id);
            
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
        }

        // Create boost notification for opponent
        const notifResult = await createNotification({
          duel_id,
          type: 'boost',
          metadata: {
            boost_type,
          }
        }, profileId, supabase).catch(err => {
          console.error('[use_boost] Error creating boost notification:', err);
          return false;
        });
        if (!notifResult) {
          console.warn('[use_boost] Failed to create boost notification');
        }

        return new Response(JSON.stringify(boostEffect), {
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
          .select('status, num_questions, started_at, expires_at')
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
          .select('id, user_id, score, correct_count')
          .eq('duel_id', duel_id);

        if (!allPlayers || allPlayers.length < 2) {
          return new Response(JSON.stringify({ error: 'Not enough players' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Small delay to ensure current player's last answer is fully committed
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check if both players finished by counting their answers
        // IMPORTANT: Count answers AFTER current player's last answer is saved
        let allPlayersFinished = true;
        const playerAnswerCounts: { [playerId: string]: number } = {};
        
        // Count answers for each player - verify ALL players have answered ALL questions
        for (const player of allPlayers) {
          const { count: playerAnswers } = await supabase
            .from('duel_answers')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', player.id)
            .eq('duel_id', duel_id);

          const answerCount = playerAnswers || 0;
          playerAnswerCounts[player.id] = answerCount;

          console.log('[finish_duel] Player answer count:', {
            playerId: player.id,
            userId: player.user_id,
            answerCount,
            required: duel.num_questions,
            hasFinished: answerCount >= duel.num_questions
          });

          // CRITICAL: ALL players must have answered ALL questions
          if (answerCount < duel.num_questions) {
            allPlayersFinished = false;
            console.log('[finish_duel] Player has not finished:', {
              playerId: player.id,
              answers: answerCount,
              required: duel.num_questions
            });
          }
        }

        console.log('[finish_duel] All players finished check:', {
          allPlayersFinished,
          playerAnswerCounts,
          requiredAnswers: duel.num_questions,
          currentPlayerId: currentPlayer.id
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
          // Calculate final scores and determine winner
          const playersWithScores = await Promise.all(allPlayers.map(async (player) => {
            const { count: playerAnswers } = await supabase
              .from('duel_answers')
              .select('*', { count: 'exact', head: true })
              .eq('player_id', player.id)
              .eq('duel_id', duel_id);

            return {
              ...player,
              answersCount: playerAnswers || 0
            };
          }));

          // Sort by score (descending)
          playersWithScores.sort((a, b) => b.score - a.score);
          const isDraw = playersWithScores[0].score === playersWithScores[1].score;
          const winnerId = isDraw ? null : playersWithScores[0].id;

          // Update duel status to finished
          await supabase
            .from('duels')
            .update({
              status: 'finished',
              finished_at: new Date().toISOString(),
            })
            .eq('id', duel_id);

          // Update stats for both players
          for (const player of playersWithScores) {
            const isWin = player.id === winnerId;
            await supabase.rpc('upsert_duel_stats', {
              p_user_id: player.user_id,
              p_is_win: isWin && !isDraw,
              p_is_draw: isDraw,
              p_score: player.score
            });
          }

          console.log('[finish_duel] Duel finished:', {
            winnerId,
            isDraw,
            reason: allPlayersFinished ? 'both_finished' : 'timeout'
          });
          
          // Process coin payout if bet was placed
          const { data: duelWithBet } = await supabase
            .from('duels')
            .select('bet_amount, bet_type')
            .eq('id', duel_id)
            .single();
          
          if (duelWithBet && duelWithBet.bet_amount > 0) {
            console.log('[finish_duel] Processing coin payout:', {
              bet_amount: duelWithBet.bet_amount,
              bet_type: duelWithBet.bet_type,
              isDraw
            });
            
            const { data: payoutResult, error: payoutError } = await supabase.rpc('process_duel_payout', {
              p_duel_id: duel_id,
              p_winner_id: isDraw ? null : playersWithScores[0].user_id,
              p_loser_id: isDraw ? null : playersWithScores[1].user_id,
              p_is_draw: isDraw
            });
            
            if (payoutError) {
              console.error('[finish_duel] Error processing payout:', payoutError);
            } else {
              console.log('[finish_duel] Payout processed:', payoutResult);
            }
          }

          // Create finish notification for opponent
          const opponentPlayer = playersWithScores.find((p: any) => p.user_id !== profile_id);
          if (opponentPlayer) {
            // Get current player name (who finished) for personalized notification to opponent
            const currentPlayerName = await getOpponentName(profile_id, supabase).catch(() => 'Игрок');
            console.log('[finish_duel] Creating finish notification with player name:', currentPlayerName);
            
            const notifResult = await createNotification({
              duel_id,
              type: 'finish',
              metadata: {
                opponent_name: currentPlayerName, // Имя игрока, который закончил (для оппонента)
                is_winner: opponentPlayer.id === winnerId,
                correct_answers: opponentPlayer.correct_count || 0,
                is_last_question: false,
              }
            }, profile_id, supabase).catch(err => {
              console.error('[finish_duel] Error creating finish notification:', err);
              return false;
            });
            if (!notifResult) {
              console.warn('[finish_duel] Failed to create finish notification');
            }
          }

          return new Response(JSON.stringify({ 
            success: true, 
            finished: true,
            reason: allPlayersFinished ? 'both_finished' : 'timeout'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Not all players finished yet - just acknowledge this player finished
          console.log('[finish_duel] Player finished, waiting for opponent');
          
          // Create finish notification for opponent (first player finished)
          const opponentPlayer = allPlayers.find((p: any) => p.user_id !== profile_id);
          const currentPlayerData = allPlayers.find((p: any) => p.user_id === profile_id);
          if (opponentPlayer && currentPlayerData) {
            // Get current player name (who finished) for personalized notification to opponent
            const currentPlayerName = await getOpponentName(profile_id, supabase).catch(() => 'Игрок');
            console.log('[finish_duel] Creating finish notification with player name:', currentPlayerName);
            
            const notifResult = await createNotification({
              duel_id,
              type: 'finish',
              metadata: {
                opponent_name: currentPlayerName, // Имя игрока, который закончил (для оппонента)
                is_winner: false,
                correct_answers: currentPlayerData.correct_count || 0,
                is_last_question: false,
              }
            }, profile_id, supabase).catch(err => {
              console.error('[finish_duel] Error creating finish notification:', err);
              return false;
            });
            if (!notifResult) {
              console.warn('[finish_duel] Failed to create finish notification');
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

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('[Duel Manager] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

