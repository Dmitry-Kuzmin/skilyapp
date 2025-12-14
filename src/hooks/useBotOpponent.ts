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
 * Автоматически отправляет ответы за бота с реалистичной задержкой (20-60 секунд)
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
    if (!currentQuestionId) {
      console.log('[useBotOpponent] ⚠️ No currentQuestionId');
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
    
    console.log('[useBotOpponent] ✅ All conditions met, processing bot answer for question:', currentQuestionId);

    // Если этот вопрос уже обработан - пропускаем
    if (processedQuestions.current.has(currentQuestionId)) {
      return;
    }

    // Проверяем, что вопрос в допустимом диапазоне
    if (currentQuestionIndex < 0 || currentQuestionIndex >= totalQuestions) {
      return;
    }

    // Если для этого вопроса уже есть активный таймер - не создаем новый
    if (activeTimers.current.has(currentQuestionId)) {
      return;
    }

    // Имитация "мышления" бота: задержка 20-60 секунд для реалистичности
    // Это создает иллюзию, что соперник действительно думает над ответом
    const thinkingTime = Math.floor(Math.random() * 40000) + 20000; // 20-60 секунд
    const botName = botPlayerRef.current.bot_name || botPlayerRef.current.name || 'Bot';

    console.log(`[useBotOpponent] 🤖 ${botName} is thinking about question ${currentQuestionIndex + 1}/${totalQuestions}... (will answer in ${Math.round(thinkingTime / 1000)}s)`);

    const timer = setTimeout(async () => {
      // Помечаем вопрос как обработанный
      processedQuestions.current.add(currentQuestionId);
      // Удаляем таймер из активных
      activeTimers.current.delete(currentQuestionId);

      try {
        // Вызываем action bot_answer для обработки ответа бота
        const { data, error } = await supabase.functions.invoke('duel-manager', {
          body: {
            action: 'bot_answer',
            duel_id: duelId,
            duel_question_id: currentQuestionId,
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
      } catch (error) {
        console.error('[useBotOpponent] ❌ Exception submitting bot answer:', error);
      }
    }, thinkingTime);

    // Сохраняем таймер в Map, чтобы не потерять его при переходе к следующему вопросу
    activeTimers.current.set(currentQuestionId, timer);

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

