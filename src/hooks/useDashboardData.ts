import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

interface DashboardStats {
  profile: {
    id: string;
    rank: string;
    xp: number;
    coins: number;
    boosts: number;
    streak_days: number;
  };
  stats: {
    tests_completed: number;
    total_questions: number;
    correct_answers: number;
    accuracy: number;
  };
  daily_bonus: {
    id: string | null;
    current_streak: number;
    last_claimed_date: string | null;
    total_claims: number;
    can_claim: boolean;
  };
}

interface DashboardData extends DashboardStats {
  dailyTasks: any[];
  recentAchievements: any[];
  weeklyRewards: any[];
}

// Глобальный кэш для данных дашборда
const dashboardCache: Record<string, { data: DashboardData | null; timestamp: number }> = {};
const CACHE_DURATION = 30000; // 30 секунд

export function useDashboardData() {
  const { profileId } = useUserContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasInitializedRef = useRef(false);

  const refreshData = useCallback(async (force = false) => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    // Проверяем кэш перед загрузкой
    const cached = dashboardCache[profileId];
    const now = Date.now();
    if (!force && cached && (now - cached.timestamp) < CACHE_DURATION) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Используем RPC функцию для получения основной статистики
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_dashboard_stats', { p_user_id: profileId });

      if (statsError) throw statsError;

      if (!statsData) {
        setData(null);
        setLoading(false);
        return;
      }

      const stats = statsData as DashboardStats;

      // Загружаем дополнительные данные параллельно
      const [tasksResult, achievementsResult, rewardsResult] = await Promise.all([
        // Ежедневные задания
        supabase
          .from('daily_tasks')
          .select('id, title, description, completed, progress, date')
          .eq('user_id', profileId)
          .eq('date', new Date().toISOString().split('T')[0]),
        
        // Последние достижения
        supabase
          .from('achievements')
          .select('id, title, description, icon, created_at')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false })
          .limit(4),
        
        // Ежедневные награды
        supabase
          .from('daily_bonus_def')
          .select('day_number, reward, description')
          .order('day_number', { ascending: true })
          .limit(90),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (achievementsResult.error) throw achievementsResult.error;
      if (rewardsResult.error) throw rewardsResult.error;

      const result: DashboardData = {
        ...stats,
        dailyTasks: tasksResult.data || [],
        recentAchievements: achievementsResult.data || [],
        weeklyRewards: rewardsResult.data || [],
      };

      // Сохраняем в кэш
      dashboardCache[profileId] = { data: result, timestamp: now };
      setData(result);
    } catch (err) {
      console.error('[useDashboardData] Error loading data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    // Проверяем кэш при первой загрузке
    const cached = dashboardCache[profileId];
    if (cached && !hasInitializedRef.current) {
      setData(cached.data);
      setLoading(false);
      hasInitializedRef.current = true;
    }

    refreshData();
  }, [profileId, refreshData]);

  // Функция для инвалидации кэша
  const invalidateCache = useCallback(() => {
    if (profileId && dashboardCache[profileId]) {
      delete dashboardCache[profileId];
    }
  }, [profileId]);

  return {
    data,
    loading,
    error,
    refresh: refreshData,
    invalidateCache,
  };
}

