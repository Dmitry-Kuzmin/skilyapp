import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => { if (isDev) console.log(...args); };

interface MarkQuestionStartedResult {
  remainingMs: number;
  elapsedMs: number;
  questionStartedAt: number; // unix ms
  serverNow: number;         // unix ms
  timeLimitMs: number;
}

/**
 * Хук для получения авторитетного серверного времени начала вопроса.
 * Фиксирует question_started_at в БД при первом входе на вопрос.
 * При перезагрузке страницы возвращает уже зафиксированное время (idempotent).
 */
export function useServerTimer() {
  const lastRequestKey = useRef<string | null>(null);
  const lastResult = useRef<MarkQuestionStartedResult | null>(null);

  /**
   * Зафиксировать начало вопроса на сервере и получить оставшееся время.
   * @returns remainingMs — оставшееся время в мс (уже с учётом прошедшего)
   */
  const markQuestionStarted = useCallback(async (
    duelId: string,
    playerId: string | null | undefined,
    questionId: string | null | undefined,
  ): Promise<MarkQuestionStartedResult | null> => {
    if (!duelId || !playerId || !questionId) return null;

    // Кешируем ответ для одного и того же вопроса,
    // чтобы не делать два запроса при StrictMode / двойном рендере
    const requestKey = `${duelId}:${playerId}:${questionId}`;
    if (lastRequestKey.current === requestKey && lastResult.current) {
      // Пересчитываем remainingMs относительно ТЕКУЩЕГО момента
      const now = Date.now();
      const elapsed = now - lastResult.current.questionStartedAt;
      const remaining = Math.max(0, lastResult.current.timeLimitMs - elapsed);
      return { ...lastResult.current, remainingMs: remaining, elapsedMs: elapsed };
    }

    try {
      // @ts-expect-error — RPC не добавлен в типы supabase-js автоматически
      const { data, error } = await supabase.rpc('mark_question_started', {
        p_duel_id:    duelId,
        p_player_id:  playerId,
        p_question_id: questionId,
      });

      if (error) {
        console.error('[useServerTimer] RPC error:', error);
        return null;
      }

      const result: MarkQuestionStartedResult = {
        questionStartedAt: data.question_started_at as number,
        serverNow:         data.server_now as number,
        timeLimitMs:       data.time_limit_ms as number,
        elapsedMs:         data.elapsed_ms as number,
        remainingMs:       Math.max(0, data.remaining_ms as number),
      };

      log('[useServerTimer] ✅ Question started:', {
        questionId,
        remainingSec: Math.round(result.remainingMs / 1000),
        elapsedSec:   Math.round(result.elapsedMs / 1000),
      });

      lastRequestKey.current = requestKey;
      lastResult.current = result;

      return result;
    } catch (err) {
      console.error('[useServerTimer] Unexpected error:', err);
      return null;
    }
  }, []);

  return { markQuestionStarted };
}
