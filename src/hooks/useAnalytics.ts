import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateTrend,
  calculateConsistencyScore,
  calculateTimeToPass,
  findCriticalPoint,
  calculateFocusBattery,
  generateActivityHeatmap,
} from '@/utils/analytics';
import type { TrendData, CriticalPoint } from '@/utils/analytics';

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

export function useAnalytics(
  profileId: string | null,
  currentScore: number,
  targetScore: number = 85
) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Загружаем сессии тестов для анализа
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('game_sessions')
          .select(`
            score,
            total_questions,
            created_at,
            game_type
          `)
          .eq('user_id', profileId)
          .or('game_type.eq.test_exam,game_type.eq.test_practice')
          .order('created_at', { ascending: false })
          .limit(50); // Берем последние 50 тестов

        if (sessionsError) throw sessionsError;

        // 2. Загружаем прогресс для определения критической точки
        // Делаем два запроса для избежания проблем с вложенными join'ами
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select(`
            is_correct,
            question_id,
            questions_new!inner(topic_id)
          `)
          .eq('user_id', profileId)
          .eq('is_answered', true);

        // Загружаем темы отдельно
        let topicMap = new Map<string, { id: string; title: string }>();
        if (progressData && progressData.length > 0) {
          // Собираем уникальные topic_id
          const topicIds = new Set<string>();
          progressData.forEach((progress: any) => {
            const topicId = progress.questions_new?.topic_id;
            if (topicId) {
              topicIds.add(topicId);
            }
          });

          // Загружаем темы одним запросом
          if (topicIds.size > 0) {
            const { data: topicsData, error: topicsError } = await supabase
              .from('topics')
              .select('id, title')
              .in('id', Array.from(topicIds));

            if (!topicsError && topicsData) {
              topicsData.forEach((topic: any) => {
                topicMap.set(topic.id, { id: topic.id, title: topic.title || 'Неизвестная тема' });
              });
            }
          }
        }

        if (progressError) {
          console.error('[useAnalytics] Progress query error:', progressError);
          // Продолжаем работу без данных прогресса, используем только сессии
          console.warn('[useAnalytics] Continuing without progress data');
        }

        // 3. Преобразуем данные сессий в формат TestResult
        const testResults: TestResult[] = (sessionsData || []).map(session => {
          const accuracy = session.total_questions > 0
            ? ((session.score || 0) / session.total_questions) * 100
            : 0;
          
          return {
            score: session.score || 0,
            accuracy: Math.round(accuracy),
            date: session.created_at,
            topic_id: undefined, // Пока не сохраняем topic_id в сессиях
          };
        });

        // 4. Подсчитываем ошибки по темам (используем уже загруженную карту тем)
        const topicErrors = new Map<string, { errors: number; attempts: number }>();
        if (progressData) {
          progressData.forEach((progress: any) => {
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
        }

        // Преобразуем данные прогресса в формат для критической точки
        const testResultsWithTopics: TestResult[] = testResults.map((result, index) => {
          // Простая эвристика: распределяем ошибки по темам пропорционально
          if (index < progressData?.length) {
            const progress = progressData[index];
            const topicId = (progress as any).questions_new?.topic_id;
            return {
              ...result,
              topic_id: topicId,
            };
          }
          return result;
        });

        // Если есть данные по ошибкам, обновляем topic_id для тестов
        if (topicErrors.size > 0) {
          testResultsWithTopics.forEach((result, index) => {
            if (!result.topic_id && index < 10) {
              // Присваиваем тему с наибольшим количеством ошибок первым тестам
              const maxErrorTopic = Array.from(topicErrors.entries())
                .sort((a, b) => {
                  const aRate = a[1].attempts > 0 ? a[1].errors / a[1].attempts : 0;
                  const bRate = b[1].attempts > 0 ? b[1].errors / b[1].attempts : 0;
                  return bRate - aRate;
                })[0];
              if (maxErrorTopic) {
                result.topic_id = maxErrorTopic[0];
              }
            }
          });
        }

        // 5. Рассчитываем метрики
        const trend = calculateTrend(testResults, 10);
        const consistency = calculateConsistencyScore(testResults);
        
        // Рассчитываем среднее количество тестов в день (за последние 7 дней)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentTests = testResults.filter(t => new Date(t.date) >= sevenDaysAgo);
        const averageDailyTests = recentTests.length / 7;

        const timeToPass = calculateTimeToPass(
          currentScore,
          targetScore,
          trend,
          averageDailyTests
        );

        // Улучшенная логика для критической точки
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
            .sort((a, b) => {
              // Сортируем по error_rate, затем по error_count
              if (b.error_rate !== a.error_rate) {
                return b.error_rate - a.error_rate;
              }
              return b.error_count - a.error_count;
            });

          if (topicsWithErrors.length > 0 && topicsWithErrors[0].error_rate > 0) {
            const topicInfo = topicMap.get(topicsWithErrors[0].topic_id);
            criticalPoint = {
              ...topicsWithErrors[0],
              topic_title: topicInfo?.title || topicsWithErrors[0].topic_title,
            };
          }
        }

        const focusBattery = calculateFocusBattery(testResults);
        const activityHeatmap = generateActivityHeatmap(testResults, 30);

        setAnalytics({
          trend,
          consistency,
          timeToPass,
          criticalPoint,
          focusBattery,
          activityHeatmap,
        });
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [profileId, currentScore, targetScore]);

  return { analytics, loading, error };
}

