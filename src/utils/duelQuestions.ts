import { supabase } from '@/integrations/supabase/client';

/**
 * Общая логика загрузки вопросов для дуэли
 * Используется в DuelBattle и DuelBattleFullscreen
 */

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000; // 30 секунд

export interface DuelQuestion {
  id: string;
  duel_id: string;
  question_id: string;
  position: number;
  question_snapshot: any;
  correct_option_ids: string[];
  created_at: string;
}

/**
 * Загрузка вопросов через Edge Function с retry логикой
 */
export async function loadDuelQuestions(
  duelId: string,
  profileId: string
): Promise<DuelQuestion[]> {
  if (!duelId || !profileId) {
    throw new Error('Missing duelId or profileId');
  }

  let lastError: any = null;

  // Retry логика с экспоненциальной задержкой
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Edge Function не ответил за 30 секунд')), TIMEOUT_MS);
      });

      const invokePromise = supabase.functions.invoke('duel-manager', {
        body: { action: 'get_questions', duel_id: duelId, profile_id: profileId },
      });

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      if (error) {
        lastError = error;
        if (attempt < MAX_RETRIES - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`[loadDuelQuestions] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }

      if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        console.log(`[loadDuelQuestions] ✅ Loaded ${data.questions.length} questions via Edge Function`);
        return data.questions;
      }

      // Если нет вопросов, пробуем fallback
      if (attempt === MAX_RETRIES - 1) {
        console.log('[loadDuelQuestions] No questions from Edge Function, trying direct query...');
        return await loadDuelQuestionsDirect(duelId);
      }
    } catch (error: any) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[loadDuelQuestions] Exception on attempt ${attempt + 1}, retrying after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Если все retry не удались, пробуем прямой запрос
  console.log('[loadDuelQuestions] All retries failed, trying direct database query...');
  try {
    return await loadDuelQuestionsDirect(duelId);
  } catch (fallbackError) {
    console.error('[loadDuelQuestions] ❌ Fallback also failed:', fallbackError);
    throw lastError || fallbackError;
  }
}

/**
 * Fallback: Прямой запрос к базе данных
 */
export async function loadDuelQuestionsDirect(duelId: string): Promise<DuelQuestion[]> {
  try {
    console.log('[loadDuelQuestionsDirect] 🔄 Loading questions directly from database...');
    
    const { data, error } = await supabase
      .from('duel_questions')
      .select('*')
      .eq('duel_id', duelId)
      .order('position');

    if (error) {
      console.error('[loadDuelQuestionsDirect] Database error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No questions found for this duel');
    }

    console.log(`[loadDuelQuestionsDirect] ✅ Loaded ${data.length} questions directly from database`);
    return data;
  } catch (error) {
    console.error('[loadDuelQuestionsDirect] ❌ Exception:', error);
    throw error;
  }
}

