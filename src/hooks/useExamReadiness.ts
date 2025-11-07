import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateReadiness,
  type ReadinessMetrics,
  type ReadinessResult,
} from '@/utils/examReadiness';
import { calculateOverallProgress } from '@/utils/learningMap';

interface UseExamReadinessResult {
  readiness: ReadinessResult | null;
  metrics: ReadinessMetrics | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Хук для загрузки данных и расчета готовности к экзамену
 */
export function useExamReadiness(profileId: string | null): UseExamReadinessResult {
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [metrics, setMetrics] = useState<ReadinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const loadReadinessData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Загружаем прогресс пользователя из user_progress
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('is_correct, is_answered, last_attempt_at, question_id, questions_new!inner(topic_id)')
          .eq('user_id', profileId)
          .eq('is_answered', true);

        if (progressError) throw progressError;

        // 2. Загружаем сессии тестов
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('game_sessions')
          .select('score, total_questions, created_at')
          .eq('user_id', profileId)
          .or('game_type.eq.test_exam,game_type.eq.test_practice')
          .order('created_at', { ascending: false });

        if (sessionsError) throw sessionsError;

        // 3. Рассчитываем метрики с учетом новой системы тем
        const totalAnswered = progressData?.length || 0;
        const correct = progressData?.filter(p => p.is_correct === true).length || 0;
        const accuracy = totalAnswered > 0 ? correct / totalAnswered : 0;

        // Количество пройденных тестов
        const testsCompleted = sessionsData?.length || 0;

        // Используем новую систему расчета прогресса по темам
        let topicsCovered = 0;
        let testSuccessRate = 0;
        
        if (profileId) {
          const overallProgress = await calculateOverallProgress(profileId);
          
          // Покрытие тем: доля завершенных тем
          topicsCovered = overallProgress.totalTopics > 0
            ? overallProgress.completedTopics / overallProgress.totalTopics
            : 0;
          
          // Успешность тестов: доля успешно пройденных тестов
          testSuccessRate = overallProgress.testSuccessRate / 100; // Конвертируем из процентов в 0-1
        } else {
          // Fallback: старая логика, если нет profileId
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select('id')
            .order('number');

          if (!topicsError && topicsData) {
            const uniqueTopics = new Set(
              progressData
                ?.map((p: any) => {
                  const question = p.questions_new;
                  return question?.topic_id;
                })
                .filter(Boolean) || []
            );
            topicsCovered = topicsData.length > 0
              ? uniqueTopics.size / topicsData.length
              : 0;
          }
        }

        // Средний балл по последним 5 тестам
        const recentSessions = sessionsData?.slice(0, 5) || [];
        const recentPerformance = recentSessions.length > 0
          ? recentSessions.reduce((sum, s) => sum + (s.score || 0) / 100, 0) / recentSessions.length
          : 0;

        // Активность: последние попытки
        const lastAttempts = progressData
          ?.map(p => p.last_attempt_at ? new Date(p.last_attempt_at) : null)
          .filter((date): date is Date => date !== null) || [];
        
        // Рассчитываем активность на основе последних попыток
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentAttempts = lastAttempts.filter(date => date.getTime() > sevenDaysAgo.getTime());
        const activityScore = recentAttempts.length > 0 ? 1 : (lastAttempts.length > 0 ? 0.5 : 0);

        // Если нет данных вообще, возвращаем дефолтные значения
        if (totalAnswered === 0 && testsCompleted === 0) {
          const defaultMetrics: ReadinessMetrics = {
            accuracy: 0,
            testsCompleted: 0,
            topicsCovered: 0,
            recentPerformance: 0,
            activityScore: 0,
          };
          const defaultReadiness = calculateReadiness(defaultMetrics);
          setMetrics(defaultMetrics);
          setReadiness(defaultReadiness);
          setLoading(false);
          return;
        }

        const readinessMetrics: ReadinessMetrics & { testSuccessRate?: number } = {
          accuracy,
          testsCompleted,
          topicsCovered,
          recentPerformance,
          activityScore,
          testSuccessRate, // Добавляем успешность тестов для новой формулы
        };

        // Рассчитываем готовность
        const readinessResult = calculateReadiness(readinessMetrics);

        setMetrics(readinessMetrics);
        setReadiness(readinessResult);
      } catch (err) {
        console.error('Error loading readiness data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadReadinessData();
  }, [profileId]);

  return { readiness, metrics, loading, error };
}

