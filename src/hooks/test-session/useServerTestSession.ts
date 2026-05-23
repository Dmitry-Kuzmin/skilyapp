// ============================================================
// useServerTestSession — bridge между data loader и test-manager.
// ============================================================
// Принимает question_ids от useTestDataLoader, стартует серверную сессию,
// возвращает session_id + вопросы из snapshot (без is_correct).
//
// Дальше TestSession.tsx работает с этими serverQuestions и serverSessionId.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  startTestSession,
  submitTestAnswer,
  completeTestSession,
  type StartSessionResult,
  type TestMode,
  type TestSessionCountry,
  type TestSessionQuestion,
} from '@/lib/testManager';

export type UseServerTestSessionParams = {
  enabled: boolean;
  questionIds: string[];
  mode: TestMode;
  testId?: string | null;
  country?: TestSessionCountry | null;
  topicId?: string | null;
};

export type UseServerTestSessionResult = {
  sessionId: string | null;
  serverQuestions: TestSessionQuestion[];
  isStarting: boolean;
  startError: string | null;
  submit: (params: {
    test_session_question_id: string;
    selected_option_id: string | null;
    time_taken_ms: number;
    client_reported_correct?: boolean;
    is_skipped?: boolean;
  }) => Promise<{ isCorrect: boolean; correctOptionId: string | null }>;
  complete: (params: {
    client_correct_count?: number;
    test_duration_seconds?: number;
    premium_flag?: boolean;
    double_sp_active?: boolean;
    effective_question_count?: number;
  }) => Promise<Awaited<ReturnType<typeof completeTestSession>> | null>;
};

export function useServerTestSession(params: UseServerTestSessionParams): UseServerTestSessionResult {
  const { enabled, questionIds, mode, testId, country, topicId } = params;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [serverQuestions, setServerQuestions] = useState<TestSessionQuestion[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const startedRef = useRef<string | null>(null); // hash of questionIds — чтобы не стартовать повторно

  useEffect(() => {
    if (!enabled) return;
    if (!questionIds || questionIds.length === 0) return;

    const hash = `${mode}|${testId ?? ''}|${topicId ?? ''}|${questionIds.join(',')}`;
    if (startedRef.current === hash) return; // уже стартовано для этой комбинации
    startedRef.current = hash;

    let cancelled = false;
    setIsStarting(true);
    setStartError(null);

    startTestSession({
      question_ids: questionIds,
      mode,
      test_id: testId ?? null,
      country: country ?? null,
      topic_id: topicId ?? null,
    })
      .then((res: StartSessionResult) => {
        if (cancelled) return;
        setSessionId(res.session_id);
        setServerQuestions(res.questions);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[useServerTestSession] start error:', msg);
        setStartError(msg);
        startedRef.current = null; // разрешим повторную попытку
      })
      .finally(() => {
        if (!cancelled) setIsStarting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, mode, testId, topicId, country, questionIds.join(',')]);

  const submit = async (p: {
    test_session_question_id: string;
    selected_option_id: string | null;
    time_taken_ms: number;
    client_reported_correct?: boolean;
    is_skipped?: boolean;
  }): Promise<{ isCorrect: boolean; correctOptionId: string | null }> => {
    if (!sessionId) {
      console.warn('[useServerTestSession] submit called before session_id ready');
      return { isCorrect: false, correctOptionId: null };
    }
    try {
      const res = await submitTestAnswer({ session_id: sessionId, ...p });
      return {
        isCorrect: res.is_correct,
        correctOptionId: res.correct_option_id ?? null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useServerTestSession] submit error:', msg);
      toast.error('Не удалось сохранить ответ');
      // fallback — клиентское мнение, без раскрытия правильного
      return { isCorrect: Boolean(p.client_reported_correct), correctOptionId: null };
    }
  };

  const complete = async (p: {
    client_correct_count?: number;
    test_duration_seconds?: number;
    premium_flag?: boolean;
    double_sp_active?: boolean;
    effective_question_count?: number;
  }) => {
    if (!sessionId) {
      console.warn('[useServerTestSession] complete called before session_id ready');
      return null;
    }
    try {
      return await completeTestSession({ session_id: sessionId, ...p });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useServerTestSession] complete error:', msg);
      return null;
    }
  };

  return {
    sessionId,
    serverQuestions,
    isStarting,
    startError,
    submit,
    complete,
  };
}
