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
      min = 5000;
      max = 12000;
      break;
    case 'medium':
      min = 3000;
      max = 8000;
      break;
    case 'hard':
      min = 2000;
      max = 6000;
      break;
    case 'insane':
      min = 1000;
      max = 4000;
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
              profile_id: profileId, // 🔥 CRITICAL: Needed for Telegram Mini App auth
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

        const answeredIds = new Set(((aData as any[]) || []).map(a => a.duel_question_id));

        // 3. Находим первый неотвеченный вопрос по порядку
        const nextQ = (qData as any[]).find(q =>
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

  // 🔥 CRITICAL FIX: Сброс ВСЕГО состояния при СМЕНЕ дуэли
  // Ранее состояние сбрасывалось только при !duelId, но если duelId менялся с одного на другой,
  // старые данные (processedQuestions, activeTimers) сохранялись → бот "помнил" предыдущую игру
  const previousDuelIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Если duelId изменился (не только стал null) — сбрасываем ВСЕ состояние
    if (previousDuelIdRef.current !== duelId) {
      console.log('[useBotOpponent] 🔄 DuelId changed, resetting ALL state', {
        from: previousDuelIdRef.current,
        to: duelId
      });

      // Очищаем все таймеры
      activeTimers.current.forEach((timer) => clearTimeout(timer));
      activeTimers.current.clear();

      // Очищаем обработанные вопросы
      processedQuestions.current.clear();

      // Сбрасываем время последней проверки бустов
      lastBoostCheckRef.current = 0;

      // Сохраняем новый duelId для следующего сравнения
      previousDuelIdRef.current = duelId;
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
    // Medium: 15% каждые 25 секунд (реже чем раньше)
    // Hard/Insane: 25% каждые 25 секунд
    const attackChances = {
      easy: 0.15,   // 15% (было 0)
      medium: 0.35, // 35% (было 25%)
      hard: 0.50,   // 50% (было 40%)
      insane: 0.60, // 60%
    };
    const diff = (botDifficulty as string) || 'medium';
    let attackChance = attackChances[diff as keyof typeof attackChances] || 0.35;

    // Easy боты не используют бусты
    if (attackChance === 0) {
      return;
    }

    // 🔥 CRITICAL FIX: Лимит 1 атака за вопрос
    let attackUsedForQuestion = false;

    // Таймер проверки "Бот хочет использовать буст?"
    const checkBoost = async () => {
      // 🔥 CRITICAL FIX: Если уже использовал атаку на этом вопросе — не атакуем
      if (attackUsedForQuestion) {
        return;
      }

      // Проверяем не слишком ли часто (минимум 8 секунд между проверками — было 12)
      const now = Date.now();
      if (now - lastBoostCheckRef.current < 8000) {
        return;
      }
      lastBoostCheckRef.current = now;

      // Случайная проверка на использование буста
      if (Math.random() < attackChance) {
        try {
          console.log(`[useBotOpponent] 🤖 Bot is using a boost! (difficulty: ${botDifficulty})`);

          // 🔥 Помечаем что атака использована на этом вопросе
          attackUsedForQuestion = true;

          // Вызываем Edge Function для использования буста ботом
          const { data, error } = await supabase.functions.invoke('duel-manager', {
            body: {
              action: 'bot_use_boost',
              duel_id: duelId,
              duel_question_id: currentQuestionId,
              profile_id: profileId, // 🔥 CRITICAL: Needed for Telegram Mini App auth
            },
          });

          if (error) {
            console.error('[useBotOpponent] ❌ Error bot using boost:', error);
            // При ошибке разрешаем повторную попытку
            attackUsedForQuestion = false;
            return;
          }

          console.log('[useBotOpponent] ✅ Bot used boost successfully:', {
            boost_type: data?.boost_type,
            effect: data?.effect
          });
        } catch (error) {
          console.error('[useBotOpponent] ❌ Exception bot using boost:', error);
          attackUsedForQuestion = false;
        }
      }
    };

    const boostIntervals = {
      easy: 15000,   // 15 seconds
      medium: 10000, // 10 seconds (было 12)
      hard: 8000,    // 8 seconds
      insane: 6000,  // 6 seconds
    };
    const boostInterval = boostIntervals[diff as keyof typeof boostIntervals] || 10000;

    // 🔥 КРИТИЧНО: Проверяем каждые X секунд
    boostCheckIntervalRef.current = setInterval(checkBoost, boostInterval);

    const initialDelay = {
      easy: 8000,   // 8 seconds
      medium: 4000, // 4 seconds
      hard: 2000,   // 2 seconds
      insane: 1500, // 1.5 seconds
    };
    const initialTimerDelay = initialDelay[diff as keyof typeof initialDelay] || 4000;

    // 🔥 КРИТИЧНО: Первая проверка через X секунд после загрузки вопроса
    const initialTimer = setTimeout(checkBoost, initialTimerDelay);

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

