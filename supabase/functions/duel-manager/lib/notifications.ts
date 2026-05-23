import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../../_shared/duel-helpers.ts';

// Notification templates with emotional, engaging texts
export interface NotificationMetadata {
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

export const notificationTemplates: Record<string, (metadata: NotificationMetadata) => NotificationResult> = {
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
export async function getOpponentName(opponentId: string, supabase: SupabaseClient): Promise<string> {
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

export interface NotificationParams {
  duel_id: string;
  type: string;
  title?: string;
  message?: string;
  icon?: string;
  metadata?: NotificationMetadata;
  recipient_profile_id?: string;
}

// Helper function to create notifications with templates
// Типы уведомлений, которые НЕ создаём в БД (показываем только in-game toast).
// answer/progress спамят колокол при каждом ходе соперника — это шум.
const SUPPRESSED_TYPES = new Set(['answer', 'progress']);

export async function createNotification(body: NotificationParams, profileId: string, supabase: SupabaseClient): Promise<Response> {
  const { duel_id, type, title, message, icon, metadata = {} as NotificationMetadata } = body;

  // Skip noisy live-feedback types — они уже показываются как in-game toasts
  if (SUPPRESSED_TYPES.has(type)) {
    return new Response(JSON.stringify({ success: true, skipped: true, reason: `Type ${type} is suppressed` }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

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
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// 🆕 НОВОЕ: Отправка уведомления в Telegram при завершении дуэли
export async function sendDuelCompletionNotification({
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
