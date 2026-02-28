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
  topicStats: Array<{ topic_id: string; topic_title: string; error_rate: number; attempts: number; accuracy: number }>;
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
  targetScore: number = 85,
  country: string = 'ru'
) {
  // Получаем список тем из кэша (статические данные)
  const { data: topicsList = [] } = useTopicsList();

  // Фильтруем темы по стране
  const countryTopics = useMemo(() => {
    // Если topicsList имеет поле country или language, фильтруем. 
    // Пока предполагаем, что topicsList возвращает все, и мы фильтруем по логике приложения или topicsList уже отфильтрован
    // Но topicsList из useStaticData обычно общий.
    // В данном случае просто возвращаем все, так как progress фильтрует по topic_id
    return topicsList;
  }, [topicsList]);

  // Загружаем аналитические данные одним запросом
  const { data: rawData, isLoading: loading, error } = useQuery({
    queryKey: ['analytics-data', profileId, country],
    queryFn: async () => {
      if (!profileId) return null;

      // ФИКС 400: Проверяем авторизацию перед запросами
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[useAnalytics] ⚠️ No active session, returning empty data');
        return { sessions: [], progress: [] };
      }

      // ОПТИМИЗАЦИЯ: Объединяем запросы
      const [sessionsResult, progressResult] = await Promise.all([
        // 1. Сессии тестов
        supabase
          .from('game_sessions')
          .select('score, total_questions, created_at, game_type') // metadata column missing in DB
          .eq('user_id', profileId)
          .or('game_type.eq.test_exam,game_type.eq.test_practice')
          .order('created_at', { ascending: false })
          .limit(50),

        // 2. Прогресс пользователя (фильтруем по стране через JOIN)
        supabase
          .from('user_progress')
          .select('is_correct, question_id, questions_new!inner(topic_id, country)')
          .eq('user_id', profileId)
          .eq('is_answered', true)
          .eq('questions_new.country', country), // Фильтрация по стране
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
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Вычисляем аналитику на основе загруженных данных
  const analytics = useMemo(() => {
    if (!rawData) return null;

    // Фильтруем сессии по стране (если есть metadata.country)

    // ТАКЖЕ: Отсеиваем "мусорные" сессии (менее 5 вопросов)
    const filteredSessions = rawData.sessions.filter((s: any) => {
      // 1. Проверка на пустоту
      if (!s.total_questions || s.total_questions < 5) return false;

      // 2. Проверка страны
      if (s.metadata && s.metadata.country) {
        return s.metadata.country === country;
      }
      return true;
    });

    // Преобразуем данные сессий в формат TestResult
    const testResults: TestResult[] = filteredSessions.map((session: any) => {
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
      countryTopics.map(t => [t.id, { id: t.id, title: t.title_ru || 'Неизвестная тема' }])
    );

    // Подсчитываем ошибки по темам
    const topicErrors = new Map<string, { errors: number; attempts: number }>();
    rawData.progress.forEach((progress: any) => {
      // progress уже отфильтрован по стране в запросе
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
    const calculatedTopicsWithErrors = topicErrors.size > 0
      ? Array.from(topicErrors.entries())
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
        .sort((a, b) => b.error_rate !== a.error_rate ? b.error_rate - a.error_rate : b.error_count - a.error_count)
      : [];

    const criticalPoint = calculatedTopicsWithErrors.length > 0 && calculatedTopicsWithErrors[0].error_rate > 0
      ? calculatedTopicsWithErrors[0] as CriticalPoint
      : null;


    const focusBattery = calculateFocusBattery(testResults);
    const activityHeatmap = generateActivityHeatmap(testResults, 30);

    // Рассчитываем средний балл по отфильтрованным тестам
    const filteredAverageScore = testResults.length > 0
      ? Math.round(testResults.reduce((acc, t) => acc + t.accuracy, 0) / testResults.length)
      : 0;

    return {
      trend,
      consistency,
      timeToPass,
      criticalPoint,
      focusBattery,
      activityHeatmap,
      topicStats: calculatedTopicsWithErrors.map(t => ({ ...t, accuracy: 100 - t.error_rate })),
      averageScore: filteredAverageScore, // Возвращаем отфильтрованный средний балл
    };
  }, [rawData, countryTopics, currentScore, targetScore, country]);

  return {
    analytics,
    loading,
    error: error as Error | null
  };
}
