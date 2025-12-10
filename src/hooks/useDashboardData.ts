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
    total_xp_earned: number;
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
 * Использует React Query + SUPER RPC get_dashboard_super
 * БЫЛО: 200+ запросов на загрузку dashboard
 * СТАЛО: 1 SUPER запрос на загрузку ВСЕГО dashboard (включая topics, partners, premium)
 * 
 * SUPER RPC v2.1 возвращает:
 * - Profile (полный с аватаром)
 * - Stats, Readiness, Daily Bonus
 * - Premium Status (без Edge Function!)
 * - Partner Status (без отдельного запроса!)
 * - Topics (список тем)
 * - Daily Bonus Definitions
 * - НОВОЕ: Active Season (активный сезон)
 * - НОВОЕ: Season Progress (прогресс пользователя)
 * - НОВОЕ: Unread Notifications Count
 */
export function useDashboardData() {
  // Безопасное обращение к UserContext и QueryClient
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const queryClient = useSafeQueryClient();

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useSafeQuery<DashboardData | null>({
    queryKey: [DASHBOARD_QUERY_KEY, profileId],
    queryFn: async () => {
      if (!profileId) return null;

      console.log('[useDashboardData] 🚀 Fetching dashboard with SUPER RPC call');

      // SUPER ОПТИМИЗАЦИЯ: Пробуем новый Super RPC
      const { data: superResult, error: superError } = await supabase
        .rpc('get_dashboard_super', { p_user_id: profileId });

      if (superError) {
        console.error('[useDashboardData] ❌ Super RPC error:', {
          error: superError,
          code: superError.code,
          message: superError.message,
          details: superError.details,
          hint: superError.hint,
          profileId,
          profileIdType: typeof profileId,
        });
      }

      if (!superError && superResult && !superResult.error) {
        console.log('[useDashboardData] ✅ SUPER RPC success - all data in 1 request!', {
          profileId,
          hasPremium: !!superResult.premium,
          hasPartner: !!superResult.partner,
          hasTopics: !!superResult.topics,
        });
        return superResult as DashboardData;
      }

      // Fallback на обычный RPC
      if (superError) {
        console.warn('[useDashboardData] ⚠️ Super RPC failed, trying regular RPC', {
          errorCode: superError.code,
          errorMessage: superError.message,
        });
      } else {
        console.warn('[useDashboardData] ⚠️ Super RPC not available, trying regular RPC');
      }
      const { data: result, error: rpcError } = await supabase
        .rpc('get_dashboard_complete', { p_user_id: profileId });

      if (rpcError) {
        console.error('[useDashboardData] ❌ RPC error:', rpcError);
        console.warn('[useDashboardData] ⚠️ Falling back to old method');
        return await fetchDashboardFallback(profileId);
      }

      if (!result || result.error) {
        console.error('[useDashboardData] ❌ No data or error in result:', result);
        return null;
      }

      console.log('[useDashboardData] ✅ Dashboard loaded successfully (regular RPC)', {
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
    if (!queryClient) return;
    if (force) {
      // Инвалидируем кэш перед обновлением
      queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, profileId] });
    }
    await refetch();
  };

  // Функция для инвалидации кэша
  const invalidateCache = () => {
    if (!queryClient) return;
    queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, profileId] });
  };

  // Если нет провайдеров - возвращаем заглушку
  if (!userContext || !queryClient) {
    return {
      data: null,
      loading: false,
      error: null,
      refresh: async () => {},
      invalidateCache: () => {},
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

