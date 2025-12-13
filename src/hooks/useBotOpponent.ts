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
      botPlayerRef.current = null;
      return;
    }

    const botPlayer = players.find((p: any) => p.is_bot === true);
    botPlayerRef.current = botPlayer || null;
  }, [players]);

  // Обработка ответа бота на текущий вопрос
  useEffect(() => {
    // Проверяем условия для работы
    if (!duelId || !currentQuestionId || !botPlayerRef.current || !profileId) {
      return;
    }

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

  return {
    isBotOpponent: !!botPlayerRef.current,
    botPlayer: botPlayerRef.current,
  };
}

