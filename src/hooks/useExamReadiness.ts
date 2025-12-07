import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateReadiness,
  type ReadinessMetrics,
  type ReadinessResult,
} from '@/utils/examReadiness';
import { useDashboardData } from './useDashboardData';

interface UseExamReadinessResult {
  readiness: ReadinessResult | null;
  metrics: ReadinessMetrics | null;
  loading: boolean;
  error: Error | null;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для расчета готовности к экзамену
 * Использует данные из useDashboardData (кэшированные) + минимум доп. запросов
 * БЫЛО: 3+ запроса на каждую загрузку
 * СТАЛО: 0 дополнительных запросов (использует кэш dashboard) или 1 легкий запрос
 */
export function useExamReadiness(profileId: string | null): UseExamReadinessResult {
  // Получаем данные из dashboard (уже закэшированные)
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData();

  // Дополнительно запрашиваем только данные для активности (легкий запрос)
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['exam-readiness-activity', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      // Легкий запрос: только даты последних попыток
      const { data, error } = await supabase
          .from('user_progress')
        .select('last_attempt_at')
          .eq('user_id', profileId)
        .eq('is_answered', true)
        .order('last_attempt_at', { ascending: false })
        .limit(50); // Ограничиваем для производительности

      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
          
  // Вычисляем метрики на основе данных dashboard
  const { metrics, readiness } = useMemo(() => {
    if (!dashboardData) {
      return {
        metrics: null,
        readiness: null,
      };
    }

    const stats = dashboardData.stats;
    const readinessData = dashboardData.readiness;

    // Если нет данных, возвращаем дефолт
    if (stats.tests_completed === 0 && stats.total_questions === 0) {
          const defaultMetrics: ReadinessMetrics = {
            accuracy: 0,
            testsCompleted: 0,
            topicsCovered: 0,
            recentPerformance: 0,
            activityScore: 0,
          };
      return {
        metrics: defaultMetrics,
        readiness: calculateReadiness(defaultMetrics),
      };
    }

    // Рассчитываем активность
    let activityScore = 0;
    if (activityData && activityData.length > 0) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentAttempts = activityData.filter(
        (item) => item.last_attempt_at && new Date(item.last_attempt_at).getTime() > sevenDaysAgo.getTime()
      );
      activityScore = recentAttempts.length > 0 ? 1 : 0.5;
        }

    const calculatedMetrics: ReadinessMetrics = {
      accuracy: stats.accuracy / 100, // Конвертируем из процентов в 0-1
      testsCompleted: stats.tests_completed,
      topicsCovered: readinessData ? readinessData.topics_covered_percent / 100 : 0,
      recentPerformance: stats.recent_performance ? stats.recent_performance / 100 : 0,
          activityScore,
    };

    return {
      metrics: calculatedMetrics,
      readiness: calculateReadiness(calculatedMetrics),
    };
  }, [dashboardData, activityData]);

  return {
    readiness,
    metrics,
    loading: dashboardLoading || activityLoading,
    error: null,
  };
}

