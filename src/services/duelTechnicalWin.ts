/**
 * 🎯 Duel Technical Win Service
 * 
 * КРИТИЧНО: Этот файл НЕ содержит React hooks и может быть импортирован
 * из любого места без риска циклических зависимостей.
 * 
 * Используется для безопасного вызова claim_technical_win RPC функции.
 */

import { supabase } from '@/integrations/supabase/client';
import type { ClaimTechnicalWinResult } from '@/features/duel/shared';

/**
 * Вызывает RPC функцию claim_technical_win для получения технической победы
 * при отключении оппонента
 * 
 * @param duelId - ID дуэли
 * @param profileId - ID профиля игрока, который заявляет о победе
 * @returns Результат вызова с информацией о победе или ошибке
 */
export async function claimTechnicalWin(
  duelId: string,
  profileId: string
): Promise<ClaimTechnicalWinResult> {
  try {
    const { data, error } = await supabase.rpc('claim_technical_win', {
      p_duel_id: duelId,
      p_profile_id: profileId,
    });

    if (error) {
      console.error('[claimTechnicalWin] RPC error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }

    // Проверяем структуру ответа
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Invalid response from server',
      };
    }

    // Возвращаем результат (может быть success: false с error)
    return {
      success: data.success === true,
      winner_id: data.winner_id,
      reason: data.reason,
      my_score: data.my_score,
      opponent_score: data.opponent_score,
      offline_seconds: data.offline_seconds,
      error: data.error,
      debug_seconds: data.debug_seconds,
    };
  } catch (error) {
    console.error('[claimTechnicalWin] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown exception',
    };
  }
}

