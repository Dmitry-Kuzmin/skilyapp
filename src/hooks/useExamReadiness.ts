import { useMemo } from 'react';
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
 * Pure derivation over dashboardData. v3 RPC carries every field we need
 * (lifetime / recent accuracy, weak/hard topics, coverage). No extra queries.
 */
export function useExamReadiness(_profileId: string | null): UseExamReadinessResult {
  const { data: dashboardData, loading } = useDashboardData();

  const { metrics, readiness } = useMemo(() => {
    if (!dashboardData) return { metrics: null, readiness: null };

    const stats = dashboardData.stats;
    const readinessData = dashboardData.readiness;

    const lifetimeAttempts = Math.max(0, stats.lifetime_attempts ?? stats.total_questions ?? 0);
    // Defensive clamp: pre-v3-deploy v2 RPC sums score from buggy writers and may report
    // correct > total. Cap at attempts to keep the formula well-defined.
    const lifetimeCorrectRaw = Math.max(0, stats.lifetime_correct ?? stats.correct_answers ?? 0);
    const lifetimeCorrect = Math.min(lifetimeCorrectRaw, lifetimeAttempts);

    const m: ReadinessMetrics = {
      lifetimeAttempts,
      lifetimeCorrect,
      recentAccuracy: stats.recent_accuracy != null
        ? stats.recent_accuracy / 100
        : null,
      recentSample: stats.recent_sample ?? 0,
      topicsCovered: readinessData ? readinessData.topics_covered_percent / 100 : 0,
      testsCompleted: stats.tests_completed ?? 0,
      weakTopicsCount: readinessData?.weak_topics_count ?? 0,
      worstTopicAcc: readinessData?.worst_topic_acc ?? null,
    };

    return { metrics: m, readiness: calculateReadiness(m) };
  }, [dashboardData]);

  return { readiness, metrics, loading, error: null };
}
