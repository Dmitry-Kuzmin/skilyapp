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

  // Обработка ответа бота на текущий вопрос
  useEffect(() => {
    // Проверяем условия для работы
    if (!duelId) {
      console.log('[useBotOpponent] ⚠️ No duelId');
      return;
    }
    if (!botPlayerRef.current) {
      console.log('[useBotOpponent] ⚠️ No bot player found');
      return;
    }
    if (!profileId) {
      console.log('[useBotOpponent] ⚠️ No profileId');
      return;
    }

    // Получаем сложность бота для расчёта времени ответа
    const botDifficulty = (botPlayerRef.current as any).bot_difficulty || 'medium';

    // КРИТИЧНО: Бот должен отвечать строго по порядку (position 1, 2, 3, 4, 5...)
    // Не используем currentQuestionId игрока - бот отвечает независимо от игрока
    const processBotAnswers = async () => {
      try {
        // Загружаем все вопросы дуэли, отсортированные по position
        const questionsResult = await supabase
          .from('duel_questions')
          .select('id, position')
          .eq('duel_id', duelId)
          .order('position', { ascending: true });

        const allQuestions: { id: string; position: number }[] = questionsResult.data || [];

        if (allQuestions.length === 0) {
          return;
        }

        // Загружаем все ответы бота
        const { data: botAnswers } = await supabase
          .from('duel_answers')
          .select('duel_question_id')
          .eq('duel_id', duelId)
          .eq('player_id', botPlayerRef.current.id);

        const answeredQuestionIds = new Set((botAnswers || []).map((a: any) => a.duel_question_id));

        // КРИТИЧНО: Находим СЛЕДУЮЩИЙ вопрос по порядку (минимальный position среди неотвеченных)
        // Это гарантирует, что бот отвечает строго по порядку: 1, 2, 3, 4, 5...
        let nextQuestion: { id: string; position: number } | null = null;

        for (const question of allQuestions) {
          if (!answeredQuestionIds.has(question.id) &&
            !processedQuestions.current.has(question.id) &&
            !activeTimers.current.has(question.id)) {
            // Нашли первый неотвеченный вопрос по порядку
            nextQuestion = { id: question.id, position: question.position };
            break; // Важно: останавливаемся на первом найденном
          }
        }

        if (!nextQuestion) {
          // Все вопросы отвечены
          return;
        }

        const questionToAnswer = nextQuestion.id;
        const questionIndexToAnswer = nextQuestion.position - 1; // position начинается с 1

        if (questionIndexToAnswer >= 0 && questionIndexToAnswer < totalQuestions) {
          console.log('[useBotOpponent] ✅ Next question in order:', questionToAnswer, `position ${nextQuestion.position} (${questionIndexToAnswer + 1}/${totalQuestions})`);
          startBotAnswerTimer(questionToAnswer, questionIndexToAnswer);
        }
      } catch (error) {
        console.error('[useBotOpponent] ❌ Error processing bot answers:', error);
      }
    };

    // 🎯 УМНАЯ СИСТЕМА ТАЙМИНГОВ БОТА
    // Реалистичные задержки 3-12 секунд, зависящие от сложности бота
    const calculateBotThinkingTime = (): number => {
      // Базовые диапазоны в миллисекундах (min, max)
      const thinkingRanges: Record<string, { min: number; max: number }> = {
        easy: { min: 5000, max: 12000 },      // 5-12 сек - думает дольше
        medium: { min: 4000, max: 10000 },    // 4-10 сек - стандартно  
        hard: { min: 3000, max: 8000 },       // 3-8 сек - быстрее
        insane: { min: 2000, max: 6000 },     // 2-6 сек - очень быстро
      };

      const range = thinkingRanges[botDifficulty] || thinkingRanges.medium;

      // Добавляем небольшую случайную вариацию (+/- 20%) для естественности
      const baseTime = Math.floor(Math.random() * (range.max - range.min) + range.min);
      const variation = baseTime * (Math.random() * 0.4 - 0.2); // ±20%

      return Math.max(2000, Math.min(15000, Math.round(baseTime + variation))); // Ограничиваем 2-15 сек
    };

    // Функция для запуска таймера ответа бота
    const startBotAnswerTimer = (questionToAnswer: string, questionIndexToAnswer: number) => {
      // 🎯 Умное время "мышления" бота: 2-15 секунд (реалистично как живой игрок)
      const thinkingTime = calculateBotThinkingTime();
      const botName = botPlayerRef.current.bot_name || botPlayerRef.current.name || 'Bot';

      console.log(`[useBotOpponent] 🤖 ${botName} (${botDifficulty}) is thinking about question ${questionIndexToAnswer + 1}/${totalQuestions}... (will answer in ${(thinkingTime / 1000).toFixed(1)}s)`);

      const timer = setTimeout(async () => {
        // Помечаем вопрос как обработанный
        processedQuestions.current.add(questionToAnswer);
        // Удаляем таймер из активных
        activeTimers.current.delete(questionToAnswer);

        try {
          // Вызываем action bot_answer для обработки ответа бота
          const { data, error } = await supabase.functions.invoke('duel-manager', {
            body: {
              action: 'bot_answer',
              duel_id: duelId,
              duel_question_id: questionToAnswer,
            },
          });

          if (error) {
            console.error('[useBotOpponent] ❌ Error submitting bot answer:', error);
            // Если ошибка "уже ответил" - это нормально, просто помечаем как обработанный
            if (error.message?.includes('already answered') || error.message?.includes('Bot already answered')) {
              console.log('[useBotOpponent] ℹ️ Bot already answered this question (race condition)');
            }
            return;
          }

          console.log('[useBotOpponent] ✅ Bot answered successfully:', {
            is_correct: data?.is_correct,
            points_awarded: data?.points_awarded,
            new_score: data?.new_score
          });

          // 🚀 Сразу запускаем следующий вопрос (минимальная задержка 500мс для естественности)
          // Это гарантирует, что бот продолжит отвечать без зависаний
          setTimeout(() => {
            processBotAnswers();
          }, 500);
        } catch (error) {
          console.error('[useBotOpponent] ❌ Exception submitting bot answer:', error);
          // При ошибке всё равно пытаемся продолжить (fallback)
          setTimeout(() => {
            processBotAnswers();
          }, 2000);
        }
      }, thinkingTime);

      // Сохраняем таймер в Map, чтобы не потерять его при переходе к следующему вопросу
      activeTimers.current.set(questionToAnswer, timer);
    };

    // Запускаем обработку ответов бота
    processBotAnswers();

    // Cleanup только при размонтировании компонента или смене дуэли
    // НЕ очищаем таймер при смене вопроса!
  }, [duelId, currentQuestionId, currentQuestionIndex, totalQuestions, profileId]);

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

