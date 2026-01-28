import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContext } from 'react';
import { UserContext } from '@/contexts/UserContext';

// Безопасная обертка для useQueryClient - возвращает null если провайдер отсутствует
function useSafeQueryClient() {
  try {
    return useQueryClient();
  } catch (error) {
    // QueryClientProvider отсутствует - возвращаем null
    return null;
  }
}

// Безопасная обертка для useQuery - возвращает заглушку если QueryClient отсутствует
// ВАЖНО: Всегда вызываем useQuery для соблюдения правил хуков
function useSafeQuery<T>(options: Parameters<typeof useQuery<T>>[0] & { enabled?: boolean }) {
  const queryClient = useSafeQueryClient();
  const hasQueryClient = !!queryClient;

  // Всегда вызываем useQuery, но с enabled: false если нет queryClient
  // Если QueryClient отсутствует, useQuery может упасть, но мы надеемся что enabled: false предотвратит это
  const queryResult = useQuery<T>({
    ...options,
    enabled: hasQueryClient && (options.enabled !== false),
  });

  // Если нет queryClient, возвращаем заглушку
  if (!hasQueryClient) {
    return {
      data: undefined,
      isLoading: false,
      error: null,
      refetch: async () => ({ data: undefined, error: null }),
    };
  }

  return queryResult;
}

interface DashboardStats {
  profile: {
    id: string;
    rank: string;
    xp: number;
    coins: number;
    boosts: number;
    streak_days: number;
    settings?: any;
    photo_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    license_points?: number; // Added field
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
  premium?: {
    is_premium: boolean;
    subscription_status?: string | null;
    subscription_end_date?: string | null;
    trial_days_remaining?: number | null;
  };
  partner?: {
    is_partner: boolean;
    partner_id?: string | null;
    partner_code?: string | null;
    partner_name?: string | null;
    partner_status?: string | null;
  };
  topics?: Array<{
    id: string;
    number: number;
    title_ru: string;
    title_es?: string;
    order_index: number;
  }>;
  daily_bonus_definitions?: Array<{
    day_number: number;
    reward: number;
    description: string;
  }>;
  // НОВОЕ: Данные сезона (из Super RPC v2.1)
  active_season?: {
    id: number;
    season_number: number;
    name_ru: string;
    name_es?: string;
    name_en?: string;
    theme?: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
  } | null;
  season_progress?: {
    id: string;
    user_id: string;
    season_id: number;
    season_points: number;
    level: number;
    premium_pass_purchased: boolean;
    premium_pass_purchased_at?: string | null;
    levels_skipped: number;
    final_level?: number | null;
    final_sp?: number | null;
    created_at: string;
    updated_at: string;
  } | null;
  unread_notifications_count?: number;
}

interface DashboardData extends DashboardStats {
  dailyTasks: any[];
  recentAchievements: any[];
  weeklyRewards: any[];
}

const DASHBOARD_QUERY_KEY = 'dashboard-data';

/**
 * SUPER ОПТИМИЗИРОВАННЫЙ хук для получения данных dashboard
 */
export function useDashboardData() {
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const queryClient = useSafeQueryClient();

  /* DEBUG LOGS REMOVED FOR PERFORMANCE
  console.log('[useDashboardData] Hook called:', {
    hasUserContext: !!userContext,
    profileId,
    hasQueryClient: !!queryClient
  });
  */

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useSafeQuery<DashboardData | null>({
    queryKey: [DASHBOARD_QUERY_KEY, profileId],
    queryFn: async () => {
      // console.log('[useDashboardData] 🏃 queryFn started for:', profileId);
      if (!profileId) {
        // console.warn('[useDashboardData] ⚠️ No profileId, returning null');
        return null;
      }

      // ФИКС 400: Проверяем авторизацию перед любыми RPC вызовами
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // console.warn('[useDashboardData] ⚠️ No active session, skipping RPC calls');
        return null;
      }

      // SUPER ОПТИМИЗАЦИЯ: Пробуем новый Super RPC
      // console.log('[useDashboardData] 🔗 Calling get_dashboard_super...');
      try {
        const promise = (supabase as any).rpc('get_dashboard_super', { p_user_id: profileId });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));

        const response: any = await Promise.race([promise, timeoutPromise]);

        if (!response.error && response.data && !response.data.error) {
          // console.log('[useDashboardData] ✅ get_dashboard_super success');
          return response.data as DashboardData;
        }
        // console.warn('[useDashboardData] ⚠️ get_dashboard_super error or empty:', response.error || response.data?.error);
      } catch (e: any) {
        // console.warn('[useDashboardData] ❌ get_dashboard_super failed:', e.message);
      }

      // Fallback на обычный RPC
      // console.log('[useDashboardData] 🔗 Calling get_dashboard_complete...');
      try {
        const promise = (supabase as any).rpc('get_dashboard_complete', { p_user_id: profileId });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));

        const response: any = await Promise.race([promise, timeoutPromise]);

        if (!response.error && response.data && !response.data.error) {
          // console.log('[useDashboardData] ✅ get_dashboard_complete success');
          return response.data as DashboardData;
        }
        // console.warn('[useDashboardData] ⚠️ get_dashboard_complete error:', response.error);
      } catch (e: any) {
        // console.warn('[useDashboardData] ❌ get_dashboard_complete failed:', e.message);
      }

      // Окончательный fallback
      // console.log('[useDashboardData] 🔄 Falling back to manual fetch...');
      return await fetchDashboardFallback(profileId);
    },
    enabled: !!profileId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 2,
  });

  const refresh = async (force = false) => {
    if (!queryClient || !profileId) return;
    if (force) {
      queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, profileId] });
    }
    await refetch();
  };

  const invalidateCache = () => {
    if (!queryClient || !profileId) return;
    queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, profileId] });
  };

  if (!userContext || !queryClient) {
    return {
      data: null,
      loading: false,
      error: null,
      refresh: async () => { },
      invalidateCache: () => { },
    };
  }

  return {
    data,
    loading,
    error: error as Error | null,
    refresh,
    invalidateCache,
  };
}

async function fetchDashboardFallback(profileId: string): Promise<DashboardData | null> {
  console.log('[useDashboardData] 🏃 Starting fallback fetch for:', profileId);

  try {
    // ФИКС 400: Проверяем что пользователь авторизован перед запросами
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[fetchDashboardFallback] ⚠️ No active session, aborting fallback');
      return null;
    }

    const results = await Promise.allSettled([
      supabase
        .from('profiles')
        .select('id, rank, xp, coins, boosts, streak_days, settings, first_name, last_name, username, photo_url')
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

    const [profileRes, sessionsRes, bonusRes, tasksRes, achievementsRes, definitionsRes] = results;

    console.log('[useDashboardData] 📊 Fallback results:', {
      profile: profileRes.status,
      sessions: sessionsRes.status,
      bonus: bonusRes.status,
      tasks: tasksRes.status,
      achievements: achievementsRes.status,
      definitions: definitionsRes.status
    });

    if (profileRes.status === 'rejected' || (profileRes.value as any).error) {
      console.error('[useDashboardData] ❌ Profile fetch failed:', (profileRes as any).reason || (profileRes as any).value?.error);
      throw new Error('Failed to fetch profile');
    }

    const profile = (profileRes.value as any).data;
    if (!profile) {
      console.warn('[useDashboardData] ⚠️ Profile not found in fallback');
      return null;
    }

    const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value as any).data || [] : [];
    // FIX: Filter out empty sessions (0 questions) to avoid inflating "tests completed" count
    const validSessions = sessions.filter((s: any) => s.total_questions > 0);
    const testsCompleted = validSessions.length;
    const totalQuestions = validSessions.reduce((acc: number, s: any) => acc + (s.total_questions || 0), 0);
    const correctAnswers = validSessions.reduce((acc: number, s: any) => acc + (s.score || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const bonus = bonusRes.status === 'fulfilled' ? (bonusRes.value as any).data : null;
    const today = new Date().toISOString().split('T')[0];

    const dailyTasks = tasksRes.status === 'fulfilled' ? (tasksRes.value as any).data || [] : [];
    const recentAchievements = achievementsRes.status === 'fulfilled' ? (achievementsRes.value as any).data || [] : [];
    const definitions = definitionsRes.status === 'fulfilled' ? (definitionsRes.value as any).data || [] : [];

    // Формируем weeklyRewards из definitions
    const weeklyRewards = definitions.filter((d: any) => d.day_number <= 7);

    console.log('[useDashboardData] ✅ Mapping finished successfully');

    return {
      profile: {
        id: profile.id,
        rank: profile.rank || 'Ученик',
        xp: profile.xp || 0,
        coins: profile.coins || 0,
        boosts: profile.boosts || 0,
        streak_days: profile.streak_days || 0,
        settings: profile.settings || {},
        first_name: (profile as any).first_name || null,
        last_name: (profile as any).last_name || null,
        username: (profile as any).username || null,
        photo_url: (profile as any).photo_url || null,
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
      dailyTasks,
      recentAchievements,
      weeklyRewards,
      daily_bonus_definitions: definitions,
    };
  } catch (error) {
    console.error('[fetchDashboardFallback] ❌ Error in fallback:', error);
    return null;
  }
}
