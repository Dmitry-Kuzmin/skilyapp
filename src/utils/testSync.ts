/**
 * Система синхронизации прогресса теста с разрешением конфликтов
 * Реализует стратегию слияния (merging strategy) для предотвращения потери данных
 */

import { supabase } from '@/integrations/supabase/client';
import { loadTestProgress, TestProgress, TestAnswer } from './testStorage';
import { toServerTime, getServerTime } from './serverTime';

interface ServerProgress {
  question_id: string;
  is_answered: boolean;
  is_correct: boolean;
  last_attempt_at: string;
}

interface MergedAnswer {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  timestamp: number;
  source: 'local' | 'server' | 'merged';
}

/**
 * Получить прогресс с сервера для конкретного теста
 */
async function getServerProgress(
  userId: string,
  testId: string,
  questionIds: string[]
): Promise<Map<string, ServerProgress>> {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('question_id, is_answered, is_correct, last_attempt_at')
      .eq('user_id', userId)
      .in('question_id', questionIds);

    if (error) {
      console.error('[testSync] Error fetching server progress:', error);
      return new Map();
    }

    const progressMap = new Map<string, ServerProgress>();
    (data || []).forEach((item) => {
      if (item.is_answered) {
        progressMap.set(item.question_id, {
          question_id: item.question_id,
          is_answered: item.is_answered,
          is_correct: item.is_correct,
          last_attempt_at: item.last_attempt_at,
        });
      }
    });

    return progressMap;
  } catch (error) {
    console.error('[testSync] Exception fetching server progress:', error);
    return new Map();
  }
}

/**
 * Слияние локального и серверного прогресса
 * Стратегия: используем самый свежий ответ, если конфликт - объединяем уникальные ответы
 */
function mergeProgress(
  localProgress: TestProgress,
  serverProgress: Map<string, ServerProgress>
): MergedAnswer[] {
  const mergedAnswers = new Map<string, MergedAnswer>();

  // Добавляем локальные ответы
  localProgress.answers.forEach((answer) => {
    mergedAnswers.set(answer.questionId, {
      questionId: answer.questionId,
      selectedAnswerId: answer.selectedAnswerId,
      isCorrect: answer.isCorrect,
      timestamp: answer.timestamp,
      source: 'local',
    });
  });

  // Объединяем с серверными ответами
  serverProgress.forEach((serverItem, questionId) => {
    const serverTimestamp = new Date(serverItem.last_attempt_at).getTime();
    const localAnswer = mergedAnswers.get(questionId);

    if (!localAnswer) {
      // Только на сервере - добавляем
      mergedAnswers.set(questionId, {
        questionId,
        selectedAnswerId: '', // На сервере нет selectedAnswerId
        isCorrect: serverItem.is_correct,
        timestamp: serverTimestamp,
        source: 'server',
      });
    } else {
      // Конфликт: есть и локально, и на сервере
      // КРИТИЧНО: Конвертируем локальное время в серверное для корректного сравнения
      const localTimestampServer = toServerTime(localAnswer.timestamp);
      const serverTimestampServer = serverTimestamp; // Уже серверное время

      if (serverTimestampServer > localTimestampServer) {
        // Серверный ответ новее - используем его
        mergedAnswers.set(questionId, {
          ...localAnswer,
          isCorrect: serverItem.is_correct,
          timestamp: serverTimestamp,
          source: 'merged',
        });
        console.log(
          `[testSync] Conflict resolved for ${questionId}: using server answer (server: ${new Date(serverTimestampServer).toISOString()} vs local (converted): ${new Date(localTimestampServer).toISOString()})`
        );
      } else if (localTimestampServer > serverTimestampServer) {
        // Локальный ответ новее (после коррекции на server time) - оставляем его
        mergedAnswers.set(questionId, {
          ...localAnswer,
          source: 'merged',
        });
        console.log(
          `[testSync] Conflict resolved for ${questionId}: using local answer (local (converted): ${new Date(localTimestampServer).toISOString()} vs server: ${new Date(serverTimestampServer).toISOString()})`
        );
      } else {
        // Одинаковое время - приоритет локальному (более полная информация)
        mergedAnswers.set(questionId, {
          ...localAnswer,
          source: 'merged',
        });
      }
    }
  });

  return Array.from(mergedAnswers.values());
}

/**
 * Синхронизировать прогресс теста с сервером с разрешением конфликтов
 */
export async function syncTestProgress(
  userId: string,
  localProgress: TestProgress
): Promise<{
  success: boolean;
  syncedAnswers: number;
  conflicts: number;
  mergedAnswers: MergedAnswer[];
  error?: string;
}> {
  try {
    // Получаем ID всех вопросов из локального прогресса
    const questionIds = localProgress.answers.map((a) => a.questionId);

    if (questionIds.length === 0) {
      return {
        success: true,
        syncedAnswers: 0,
        conflicts: 0,
        mergedAnswers: [],
      };
    }

    // Получаем серверный прогресс
    const serverProgress = await getServerProgress(userId, localProgress.testId, questionIds);

    // Объединяем прогрессы
    const mergedAnswers = mergeProgress(localProgress, serverProgress);

    // Определяем, какие ответы нужно отправить на сервер
    const answersToSync: Array<{
      questionId: string;
      isCorrect: boolean;
      timestamp: number;
    }> = [];

    let conflicts = 0;

    mergedAnswers.forEach((answer) => {
      const serverItem = serverProgress.get(answer.questionId);
      
      // Если ответа нет на сервере, или локальный новее - отправляем на сервер
      if (!serverItem) {
        answersToSync.push({
          questionId: answer.questionId,
          isCorrect: answer.isCorrect,
          timestamp: answer.timestamp,
        });
      } else {
        const serverTimestamp = new Date(serverItem.last_attempt_at).getTime();
        // КРИТИЧНО: Конвертируем локальное время в серверное для корректного сравнения
        const localTimestampServer = toServerTime(answer.timestamp);
        
        if (localTimestampServer > serverTimestamp) {
          // Локальный ответ новее (после коррекции на server time) - отправляем на сервер
          answersToSync.push({
            questionId: answer.questionId,
            isCorrect: answer.isCorrect,
            timestamp: answer.timestamp, // Сохраняем оригинальный timestamp для отправки
          });
          conflicts++;
        } else if (localTimestampServer < serverTimestamp && answer.source === 'local') {
          // Серверный ответ новее - конфликт, но не отправляем
          conflicts++;
        }
      }
    });

    // Отправляем новые/обновленные ответы на сервер
    if (answersToSync.length > 0) {
      const progressUpdates = answersToSync.map((answer) => ({
        user_id: userId,
        question_id: answer.questionId,
        is_answered: true,
        is_correct: answer.isCorrect,
        attempts: 1,
        last_attempt_at: new Date(answer.timestamp).toISOString(),
      }));

      // Используем upsert для обновления/создания записей
      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert(progressUpdates, {
          onConflict: 'user_id,question_id',
        });

      if (upsertError) {
        console.error('[testSync] Error syncing progress to server:', upsertError);
        return {
          success: false,
          syncedAnswers: 0,
          conflicts,
          mergedAnswers,
          error: upsertError.message,
        };
      }
    }

    return {
      success: true,
      syncedAnswers: answersToSync.length,
      conflicts,
      mergedAnswers,
    };
  } catch (error) {
    console.error('[testSync] Exception syncing progress:', error);
    return {
      success: false,
      syncedAnswers: 0,
      conflicts: 0,
      mergedAnswers: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Загрузить и объединить прогресс теста с сервера
 * Используется при загрузке теста для получения актуального состояния
 */
export async function loadAndMergeProgress(
  userId: string,
  testId: string,
  questionIds: string[]
): Promise<{
  localProgress: TestProgress | null;
  mergedAnswers: MergedAnswer[];
  hasConflicts: boolean;
}> {
  try {
    // Загружаем локальный прогресс
    const localProgress = await loadTestProgress(testId);

    // Получаем серверный прогресс
    const serverProgress = await getServerProgress(userId, testId, questionIds);

    // Если нет локального прогресса, используем только серверный
    if (!localProgress) {
      const serverAnswers: MergedAnswer[] = Array.from(serverProgress.values()).map((item) => ({
        questionId: item.question_id,
        selectedAnswerId: '',
        isCorrect: item.is_correct,
        timestamp: new Date(item.last_attempt_at).getTime(),
        source: 'server',
      }));

      return {
        localProgress: null,
        mergedAnswers: serverAnswers,
        hasConflicts: false,
      };
    }

    // Объединяем прогрессы
    const mergedAnswers = mergeProgress(localProgress, serverProgress);

    // Проверяем наличие конфликтов
    let hasConflicts = false;
    mergedAnswers.forEach((answer) => {
      if (answer.source === 'merged') {
        hasConflicts = true;
      }
    });

    return {
      localProgress,
      mergedAnswers,
      hasConflicts,
    };
  } catch (error) {
    console.error('[testSync] Error loading and merging progress:', error);
    // В случае ошибки возвращаем локальный прогресс
    const localProgress = await loadTestProgress(testId);
    return {
      localProgress,
      mergedAnswers: localProgress?.answers.map((a) => ({
        questionId: a.questionId,
        selectedAnswerId: a.selectedAnswerId,
        isCorrect: a.isCorrect,
        timestamp: a.timestamp,
        source: 'local',
      })) || [],
      hasConflicts: false,
    };
  }
}

