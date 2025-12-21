import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BotOpponentProps {
  duelId: string | null;
  currentQuestionId: string | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  players: any[];
  profileId: string | null;
}

/**
 * Вспомогательная функция для расчета времени "раздумий" бота
 * Генерирует задержку от 2 до 15 секунд в зависимости от сложности
 */
const calculateBotThinkingTime = (difficulty: string = 'medium'): number => {
  let min = 4000;
  let max = 10000;

  switch (difficulty) {
    case 'easy':
      min = 6000;
      max = 15000;
      break;
    case 'medium':
      min = 4000;
      max = 10000;
      break;
    case 'hard':
      min = 3000;
      max = 8000;
      break;
    case 'insane':
      min = 2000;
      max = 5000;
      break;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Хук для имитации ответов бота-соперника
 * Автоматически отправляет ответы за бота с реалистичной задержкой (2-15 секунд)
 * Время ответа зависит от сложности бота: easy=5-12с, medium=4-10с, hard=3-8с, insane=2-6с
 */
export function useBotOpponent({
  duelId,
  currentQuestionId,
  currentQuestionIndex,
  totalQuestions,
  players,
  profileId
}: BotOpponentProps) {
  const processedQuestions = useRef<Set<string>>(new Set());
  const activeTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const botPlayerRef = useRef<any>(null);

  // Находим бота среди игроков
  useEffect(() => {
    if (!players || players.length === 0) {
      console.log('[useBotOpponent] ⚠️ No players provided');
      botPlayerRef.current = null;
      return;
    }

    console.log('[useBotOpponent] 🔍 Looking for bot in players:', players.map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      is_bot: p.is_bot,
      bot_name: p.bot_name,
      name: p.name
    })));

    const botPlayer = players.find((p: any) => p.is_bot === true);
    if (botPlayer) {
      console.log('[useBotOpponent] ✅ Bot found:', {
        id: botPlayer.id,
        bot_name: botPlayer.bot_name,
        name: botPlayer.name,
        score: botPlayer.score
      });
    } else {
      console.log('[useBotOpponent] ⚠️ Bot not found in players');
    }
    botPlayerRef.current = botPlayer || null;
  }, [players]);

  // Основной эффект для управления ответами бота
  useEffect(() => {
    // Проверяем условия для работы
    if (!duelId || !botPlayerRef.current || !profileId) {
      return;
    }

    console.log('[useBotOpponent] 🚀 Hook active for duel:', duelId);

    // Функция для запуска таймера ответа бота
    const startBotAnswerTimer = (questionToAnswer: string, questionIndexToAnswer: number) => {
      // 🎯 Умное время "мышления" бота
      const difficulty = botPlayerRef.current?.bot_difficulty || 'medium';
      const thinkingTime = calculateBotThinkingTime(difficulty);
      const botName = botPlayerRef.current.bot_name || botPlayerRef.current.name || 'Bot';

      console.log(`[useBotOpponent] 🤖 ${botName} thinking about Q${questionIndexToAnswer + 1}/${totalQuestions}... (${(thinkingTime / 1000).toFixed(1)}s)`);

      const timer = setTimeout(async () => {
        // Помечаем вопрос как обрабатываемый (чтобы не запустить второй таймер)
        processedQuestions.current.add(questionToAnswer);
        activeTimers.current.delete(questionToAnswer);

        try {
          const { data, error } = await supabase.functions.invoke('duel-manager', {
            body: {
              action: 'bot_answer',
              duel_id: duelId,
              duel_question_id: questionToAnswer,
            },
          });

          if (error) {
            console.error('[useBotOpponent] ❌ Error submitting bot answer:', error);
            // Если ошибка, удаляем из обработанных, чтобы попробовать снова
            processedQuestions.current.delete(questionToAnswer);
            return;
          }

          console.log(`[useBotOpponent] ✅ Bot answered Q${questionIndexToAnswer + 1}:`, {
            is_correct: data?.is_correct,
            score: data?.new_score
          });

          // Сразу пробуем запустить следующий вопрос
          processBotAnswers();
        } catch (error) {
          console.error('[useBotOpponent] ❌ Exception in bot answer:', error);
          processedQuestions.current.delete(questionToAnswer);
        }
      }, thinkingTime);

      activeTimers.current.set(questionToAnswer, timer);
    };

    // Главная функция поиска следующего вопроса для бота
    const processBotAnswers = async () => {
      // Если уже есть активные таймеры - ждём их завершения
      if (activeTimers.current.size > 0) return;

      try {
        // 1. Получаем все вопросы дуэли
        const { data: qData } = await supabase
          .from('duel_questions')
          .select('id, position')
          .eq('duel_id', duelId)
          .order('position', { ascending: true });

        if (!qData || qData.length === 0) return;

        // 2. Получаем уже отправленные ответы бота
        const { data: aData } = await supabase
          .from('duel_answers')
          .select('duel_question_id')
          .eq('duel_id', duelId)
          .eq('player_id', botPlayerRef.current.id);

        const answeredIds = new Set((aData || []).map(a => a.duel_question_id));

        // 3. Находим первый неотвеченный вопрос по порядку
        const nextQ = qData.find(q =>
          !answeredIds.has(q.id) &&
          !processedQuestions.current.has(q.id) &&
          !activeTimers.current.has(q.id)
        );

        if (nextQ) {
          startBotAnswerTimer(nextQ.id, nextQ.position - 1);
        } else {
          console.log('[useBotOpponent] 🏁 Bot has no more questions to answer');
        }
      } catch (err) {
        console.error('[useBotOpponent] ❌ Error in processBotAnswers:', err);
      }
    };

    // Запускаем первую проверку
    processBotAnswers();

    // 🔄 КРИТИЧНО: Добавляем интервальную проверку раз в 3 секунды
    // Это страховка на случай, если какой-то таймер "отвалился" или не запустился
    const interval = setInterval(processBotAnswers, 3000);

    return () => {
      console.log('[useBotOpponent] 🛑 Cleaning up hook');
      clearInterval(interval);
      activeTimers.current.forEach(clearTimeout);
      activeTimers.current.clear();
    };
  }, [duelId, botPlayerRef.current?.id, profileId, totalQuestions]);

  // Сброс обработанных вопросов и очистка таймеров при смене дуэли
  useEffect(() => {
    if (!duelId) {
      // Очищаем все таймеры при смене дуэли
      activeTimers.current.forEach((timer) => clearTimeout(timer));
      activeTimers.current.clear();
      processedQuestions.current.clear();
    }

    // Cleanup при размонтировании компонента
    return () => {
      activeTimers.current.forEach((timer) => clearTimeout(timer));
      activeTimers.current.clear();
    };
  }, [duelId]);

  // 🔥 НОВАЯ ЛОГИКА: Использование бустов ботом
  const boostCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoostCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!duelId || !botPlayerRef.current || !currentQuestionId) {
      return;
    }

    const botDifficulty = (botPlayerRef.current as any).bot_difficulty || 'medium';

    // Определяем вероятность использования буста в зависимости от сложности
    // Easy: 0% (не используют бусты)
    // Medium: 20% каждые 12 секунд
    // Hard/Insane: 40% каждые 12 секунд
    let attackChance = 0;
    if (botDifficulty === 'medium') {
      attackChance = 0.20; // 20%
    } else if (botDifficulty === 'hard' || botDifficulty === 'insane') {
      attackChance = 0.40; // 40%
    }

    // Easy боты не используют бусты
    if (attackChance === 0) {
      return;
    }

    // Таймер проверки "Бот хочет использовать буст?"
    const checkBoost = async () => {
      // Проверяем не слишком ли часто (минимум 8 секунд между проверками)
      const now = Date.now();
      if (now - lastBoostCheckRef.current < 8000) {
        return;
      }
      lastBoostCheckRef.current = now;

      // Случайная проверка на использование буста
      if (Math.random() < attackChance) {
        try {
          console.log(`[useBotOpponent] 🤖 Bot is using a boost! (difficulty: ${botDifficulty})`);

          // Вызываем Edge Function для использования буста ботом
          const { data, error } = await supabase.functions.invoke('duel-manager', {
            body: {
              action: 'bot_use_boost',
              duel_id: duelId,
              duel_question_id: currentQuestionId,
            },
          });

          if (error) {
            console.error('[useBotOpponent] ❌ Error bot using boost:', error);
            return;
          }

          console.log('[useBotOpponent] ✅ Bot used boost successfully:', {
            boost_type: data?.boost_type,
            effect: data?.effect
          });
        } catch (error) {
          console.error('[useBotOpponent] ❌ Exception bot using boost:', error);
        }
      }
    };

    // Проверяем каждые 12 секунд
    boostCheckIntervalRef.current = setInterval(checkBoost, 12000);

    // Первая проверка через 5 секунд после загрузки вопроса
    const initialTimer = setTimeout(checkBoost, 5000);

    return () => {
      if (boostCheckIntervalRef.current) {
        clearInterval(boostCheckIntervalRef.current);
        boostCheckIntervalRef.current = null;
      }
      clearTimeout(initialTimer);
    };
  }, [duelId, currentQuestionId, botPlayerRef.current]);

  return {
    isBotOpponent: !!botPlayerRef.current,
    botPlayer: botPlayerRef.current,
  };
}

