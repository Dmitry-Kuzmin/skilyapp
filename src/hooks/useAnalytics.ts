import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateTrend,
  calculateConsistencyScore,
  calculateTimeToPass,
  calculateFocusBattery,
  generateActivityHeatmap,
} from '@/utils/analytics';
import type { TrendData, CriticalPoint } from '@/utils/analytics';
import { useTopicsList } from './useStaticData';

interface TestResult {
  score: number;
  accuracy: number;
  date: string;
  topic_id?: string;
}

interface AnalyticsData {
  trend: TrendData;
  consistency: ReturnType<typeof calculateConsistencyScore>;
  timeToPass: ReturnType<typeof calculateTimeToPass>;
  criticalPoint: CriticalPoint | null;
  focusBattery: ReturnType<typeof calculateFocusBattery>;
  activityHeatmap: ReturnType<typeof generateActivityHeatmap>;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для аналитики
 * Использует React Query для кэширования + объединяет запросы
 * БЫЛО: 3 запроса при каждом использовании
 * СТАЛО: 1 запрос + кэширование
 */
export function useAnalytics(
  profileId: string | null,
  currentScore: number,
  targetScore: number = 85
) {
  // Получаем список тем из кэша (статические данные)
  const { data: topicsList = [] } = useTopicsList();

  // Загружаем аналитические данные одним запросом
  const { data: rawData, isLoading: loading, error } = useQuery({
    queryKey: ['analytics-data', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      // ОПТИМИЗАЦИЯ: Объединяем запросы
      const [sessionsResult, progressResult] = await Promise.all([
        // 1. Сессии тестов
        supabase
          .from('game_sessions')
          .select('score, total_questions, created_at, game_type')
          .eq('user_id', profileId)
          .or('game_type.eq.test_exam,game_type.eq.test_practice')
          .order('created_at', { ascending: false })
          .limit(50),
        
        // 2. Прогресс пользователя
        supabase
          .from('user_progress')
          .select('is_correct, question_id, questions_new!inner(topic_id)')
          .eq('user_id', profileId)
          .eq('is_answered', true),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (progressResult.error) {
        console.warn('[useAnalytics] Progress error, continuing without it:', progressResult.error);
      }

      return {
        sessions: sessionsResult.data || [],
        progress: progressResult.data || [],
      };
    },
    enabled: !!profileId,
    staleTime: 60 * 1000, // 1 минута
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Вычисляем аналитику на основе загруженных данных
  const analytics = useMemo(() => {
    if (!rawData) return null;

    // Преобразуем данные сессий в формат TestResult
    const testResults: TestResult[] = rawData.sessions.map(session => {
      const accuracy = session.total_questions > 0
        ? ((session.score || 0) / session.total_questions) * 100
        : 0;
      
      return {
        score: session.score || 0,
        accuracy: Math.round(accuracy),
        date: session.created_at,
        topic_id: undefined,
      };
    });

    // Создаем карту тем из кэшированного списка
    const topicMap = new Map(
      topicsList.map(t => [t.id, { id: t.id, title: t.title_ru || 'Неизвестная тема' }])
    );

    // Подсчитываем ошибки по темам
    const topicErrors = new Map<string, { errors: number; attempts: number }>();
    rawData.progress.forEach((progress: any) => {
      const topicId = progress.questions_new?.topic_id;
      if (topicId && topicMap.has(topicId)) {
        const stats = topicErrors.get(topicId) || { errors: 0, attempts: 0 };
        stats.attempts += 1;
        if (!progress.is_correct) {
          stats.errors += 1;
        }
        topicErrors.set(topicId, stats);
      }
    });

    // Рассчитываем метрики
    const trend = calculateTrend(testResults, 10);
    const consistency = calculateConsistencyScore(testResults);
    
    // Рассчитываем среднее количество тестов в день
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTests = testResults.filter(t => new Date(t.date) >= sevenDaysAgo);
    const averageDailyTests = recentTests.length / 7;

    const timeToPass = calculateTimeToPass(
      currentScore,
      targetScore,
      trend,
      averageDailyTests
    );

    // Критическая точка
    let criticalPoint: CriticalPoint | null = null;
    if (topicErrors.size > 0) {
      const topicsWithErrors = Array.from(topicErrors.entries())
        .map(([topicId, stats]) => {
          const errorRate = stats.attempts > 0
            ? Math.round((stats.errors / stats.attempts) * 100)
            : 0;
          const topicInfo = topicMap.get(topicId);
          return {
            topic_id: topicId,
            topic_title: topicInfo?.title || 'Неизвестная тема',
            error_count: stats.errors,
            error_rate: errorRate,
            attempts: stats.attempts,
          };
        })
        .sort((a, b) => b.error_rate !== a.error_rate ? b.error_rate - a.error_rate : b.error_count - a.error_count);

      if (topicsWithErrors.length > 0 && topicsWithErrors[0].error_rate > 0) {
        criticalPoint = topicsWithErrors[0];
      }
    }

    const focusBattery = calculateFocusBattery(testResults);
    const activityHeatmap = generateActivityHeatmap(testResults, 30);

    return {
      trend,
      consistency,
      timeToPass,
      criticalPoint,
      focusBattery,
      activityHeatmap,
    };
  }, [rawData, topicsList, currentScore, targetScore]);

  return { 
    analytics, 
    loading, 
    error: error as Error | null 
  };
}

