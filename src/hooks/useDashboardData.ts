import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    settings?: any;
  };
  stats: {
    tests_completed: number;
    total_questions: number;
    correct_answers: number;
    accuracy: number;
    recent_performance?: number;
  };
  readiness?: {
    topics_covered_percent: number;
    unique_questions_answered: number;
    topics_with_answers: number;
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

const DASHBOARD_QUERY_KEY = 'dashboard-data';

/**
 * ОПТИМИЗИРОВАННЫЙ хук для получения данных dashboard
 * Использует React Query + новый RPC get_dashboard_complete
 * БЫЛО: 50+ запросов на загрузку dashboard
 * СТАЛО: 1 запрос на загрузку всего dashboard
 */
export function useDashboardData() {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery<DashboardData | null>({
    queryKey: [DASHBOARD_QUERY_KEY, profileId],
    queryFn: async () => {
      if (!profileId) return null;

      console.log('[useDashboardData] 🚀 Fetching dashboard with single RPC call');

      // ОПТИМИЗАЦИЯ: Один RPC вместо 50+ запросов
      const { data: result, error: rpcError } = await supabase
        .rpc('get_dashboard_complete', { p_user_id: profileId });

      if (rpcError) {
        console.error('[useDashboardData] ❌ RPC error:', rpcError);
        
        // Fallback: если новый RPC не работает, используем старый способ
        console.warn('[useDashboardData] ⚠️ Falling back to old method');
        return await fetchDashboardFallback(profileId);
      }

      if (!result || result.error) {
        console.error('[useDashboardData] ❌ No data or error in result:', result);
        return null;
      }

      console.log('[useDashboardData] ✅ Dashboard loaded successfully', {
        profileId,
        testsCompleted: result.stats.tests_completed,
        xp: result.profile.xp,
      });

      return result as DashboardData;
    },
    enabled: !!profileId,
    staleTime: 30 * 1000, // 30 секунд - данные считаются свежими
    gcTime: 5 * 60 * 1000, // 5 минут - кэш в памяти
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 1,
  });

  // Функция для принудительного обновления
  const refresh = async (force = false) => {
    if (force) {
      // Инвалидируем кэш перед обновлением
      queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, profileId] });
    }
    await refetch();
  };

  // Функция для инвалидации кэша
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, profileId] });
  };

  return {
    data,
    loading,
    error: error as Error | null,
    refresh,
    invalidateCache,
  };
}

// Fallback функция для старого способа загрузки (если новый RPC не работает)
async function fetchDashboardFallback(profileId: string): Promise<DashboardData | null> {
  const [profileResult, sessionsResult, bonusResult, tasksResult, achievementsResult, rewardsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, rank, xp, coins, boosts, streak_days, settings')
      .eq('id', profileId)
      .maybeSingle(),
    
    supabase
      .from('game_sessions')
      .select('total_questions, score')
      .eq('user_id', profileId)
      .or('game_type.eq.test_exam,game_type.eq.test_practice'),
    
    supabase
      .from('user_daily_bonus')
      .select('id, current_streak, last_claimed_date, total_claims')
      .eq('user_id', profileId)
      .maybeSingle(),

    supabase
      .from('daily_tasks')
      .select('id, task_type, title, progress, max_progress, reward, completed, date')
      .eq('user_id', profileId)
      .eq('date', new Date().toISOString().split('T')[0]),
    
    supabase
      .from('achievements')
      .select('id, achievement_type, title, description, unlocked, progress, max_progress, unlocked_at, created_at')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(4),
    
    supabase
      .from('daily_bonus_def')
      .select('day_number, reward, description')
      .order('day_number', { ascending: true })
      .limit(7),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (sessionsResult.error) throw sessionsResult.error;

  const profile = profileResult.data;
  if (!profile) return null;

  const sessions = sessionsResult.data || [];
  const testsCompleted = sessions.length;
  const totalQuestions = sessions.reduce((acc, s) => acc + (s.total_questions || 0), 0);
  const correctAnswers = sessions.reduce((acc, s) => acc + (s.score || 0), 0);
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const bonus = bonusResult.data;
  const today = new Date().toISOString().split('T')[0];

  return {
    profile: {
      id: profile.id,
      rank: profile.rank || 'Ученик',
      xp: profile.xp || 0,
      coins: profile.coins || 0,
      boosts: profile.boosts || 0,
      streak_days: profile.streak_days || 0,
      settings: profile.settings || {},
    },
    stats: {
      tests_completed: testsCompleted,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      accuracy: accuracy,
    },
    daily_bonus: {
      id: bonus?.id || null,
      current_streak: bonus?.current_streak || 0,
      last_claimed_date: bonus?.last_claimed_date || null,
      total_claims: bonus?.total_claims || 0,
      can_claim: !bonus?.last_claimed_date || bonus.last_claimed_date !== today,
    },
    dailyTasks: tasksResult.data || [],
    recentAchievements: achievementsResult.data || [],
    weeklyRewards: rewardsResult.data || [],
  };
}

