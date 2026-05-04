import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TestLimitMode = string;

const FULL_TEST_MODES: ReadonlySet<string> = new Set([
  'practice',
  'exam',
  'blitz',
  'pdd-ticket',
  'pdd-topic',
  'by-topic',
  'module',
  'dgt',
  'exam-russia',
]);

export const isFullTestMode = (mode: TestLimitMode | null | undefined): boolean =>
  !!mode && FULL_TEST_MODES.has(mode);

interface CheckResult {
  current_count: number;
  daily_cap: number;
  remaining: number;
  limit_reached: boolean;
  is_premium: boolean;
}

interface IncrementResult {
  current_count: number;
  daily_cap: number;
  limit_reached: boolean;
  is_premium: boolean;
}

interface GrantResult {
  new_ad_grants: number;
  new_cap: number;
}

const queryKey = (profileId: string | null | undefined) => ['daily-test-limit', profileId];

export function useDailyTestLimit(profileId: string | null | undefined) {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: queryKey(profileId),
    queryFn: async (): Promise<CheckResult> => {
      if (!profileId) {
        return { current_count: 0, daily_cap: 5, remaining: 5, limit_reached: false, is_premium: false };
      }
      const { data, error } = await supabase.rpc('check_test_limit', { p_user_id: profileId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as CheckResult;
    },
    enabled: !!profileId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const incrementMutation = useMutation({
    mutationFn: async (): Promise<IncrementResult> => {
      if (!profileId) throw new Error('No profile');
      const { data, error } = await supabase.rpc('increment_test_usage', { p_user_id: profileId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as IncrementResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(profileId) });
    },
  });

  const grantFromAdMutation = useMutation({
    mutationFn: async (): Promise<GrantResult> => {
      if (!profileId) throw new Error('No profile');
      const { data, error } = await supabase.rpc('grant_test_from_ad', { p_user_id: profileId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as GrantResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKey(profileId) });
    },
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKey(profileId) });
  }, [qc, profileId]);

  return {
    status: status.data,
    isLoading: status.isLoading,
    incrementMutation,
    grantFromAdMutation,
    refresh,
  };
}
