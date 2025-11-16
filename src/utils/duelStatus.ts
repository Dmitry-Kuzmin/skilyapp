import { supabase } from '@/integrations/supabase/client';
import { DUEL_STATUS, type DuelStatus } from '@/constants/duel';

/**
 * Общая логика проверки статуса дуэли
 */

export interface DuelStatusCheckResult {
  status: DuelStatus;
  finished: boolean;
  cancelled: boolean;
  myAnswersCount?: number;
  opponentAnswersCount?: number;
  totalQuestions?: number;
}

/**
 * Проверка статуса дуэли через Edge Function
 */
export async function checkDuelStatus(
  duelId: string,
  profileId: string
): Promise<DuelStatusCheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke('duel-manager', {
      body: {
        action: 'check_status',
        duel_id: duelId,
        profile_id: profileId,
      },
    });

    if (error) {
      console.error('[checkDuelStatus] Edge Function error:', error);
      throw error;
    }

    return {
      status: data?.status || DUEL_STATUS.WAITING,
      finished: data?.finished === true || data?.status === DUEL_STATUS.FINISHED,
      cancelled: data?.cancelled === true || data?.status === DUEL_STATUS.CANCELLED,
      myAnswersCount: data?.my_answers_count,
      opponentAnswersCount: data?.opponent_answers_count,
      totalQuestions: data?.total_questions,
    };
  } catch (error) {
    console.error('[checkDuelStatus] Exception:', error);
    throw error;
  }
}

/**
 * Проверка статуса дуэли напрямую из базы данных (fallback)
 */
export async function checkDuelStatusDirect(duelId: string): Promise<DuelStatusCheckResult> {
  try {
    const { data, error } = await supabase
      .from('duels')
      .select('status')
      .eq('id', duelId)
      .single();

    if (error) {
      console.error('[checkDuelStatusDirect] Database error:', error);
      throw error;
    }

    return {
      status: data?.status || DUEL_STATUS.WAITING,
      finished: data?.status === DUEL_STATUS.FINISHED,
      cancelled: data?.status === DUEL_STATUS.CANCELLED,
    };
  } catch (error) {
    console.error('[checkDuelStatusDirect] Exception:', error);
    throw error;
  }
}

