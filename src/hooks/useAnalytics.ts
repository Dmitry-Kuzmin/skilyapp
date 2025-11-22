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
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select(`
            is_correct,
            question_id,
            questions_new!inner(topic_id, topics!inner(id, title))
          `)
          .eq('user_id', profileId)
          .eq('is_answered', true);

        if (progressError) throw progressError;

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

        // 4. Создаем карту тем для критической точки
        const topicMap = new Map<string, string>();
        if (progressData) {
          progressData.forEach((progress: any) => {
            const topic = progress.questions_new?.topics;
            if (topic && topic.id) {
              topicMap.set(topic.id, topic.title || 'Неизвестная тема');
            }
          });
        }

        // Подсчитываем ошибки по темам
        const topicErrors = new Map<string, { errors: number; attempts: number }>();
        if (progressData) {
          progressData.forEach((progress: any) => {
            const topic = progress.questions_new?.topics;
            if (topic && topic.id) {
              const stats = topicErrors.get(topic.id) || { errors: 0, attempts: 0 };
              stats.attempts += 1;
              if (!progress.is_correct) {
                stats.errors += 1;
              }
              topicErrors.set(topic.id, stats);
            }
          });
        }

        // Преобразуем данные прогресса в формат для критической точки
        const testResultsWithTopics: TestResult[] = testResults.map((result, index) => {
          // Простая эвристика: распределяем ошибки по темам пропорционально
          if (index < progressData?.length) {
            const progress = progressData[index];
            const topic = (progress as any).questions_new?.topics;
            return {
              ...result,
              topic_id: topic?.id,
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
                .sort((a, b) => b[1].error_rate - a[1].error_rate)[0];
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
              return {
                topic_id: topicId,
                topic_title: topicMap.get(topicId) || 'Неизвестная тема',
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
            criticalPoint = topicsWithErrors[0];
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

