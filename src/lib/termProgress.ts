import { supabase } from "@/integrations/supabase/client";

export interface TermProgress {
  term_id: string;
  term_es: string;
  term_ru: string;
  mastery_level: number;
  times_practiced: number;
  last_practiced_at: string | null;
  is_studied: boolean;
}

/**
 * Обновляет прогресс термина при правильном/неправильном ответе
 */
// Кэш для предотвращения дублирующих запросов
const updateProgressCache = new Map<string, number>();
const CACHE_TTL = 1000; // 1 секунда

export async function updateTermProgress(
  userId: string,
  termId: string,
  isCorrect: boolean
): Promise<void> {
  try {
    // Проверяем кэш, чтобы избежать дублирующих запросов
    const cacheKey = `${userId}-${termId}-${isCorrect}`;
    const lastUpdate = updateProgressCache.get(cacheKey);
    const now = Date.now();

    if (lastUpdate && (now - lastUpdate) < CACHE_TTL) {

      return;
    }

    updateProgressCache.set(cacheKey, now);

    // Очищаем старые записи из кэша (старше 5 секунд)
    if (updateProgressCache.size > 100) {
      for (const [key, timestamp] of updateProgressCache.entries()) {
        if (now - timestamp > 5000) {
          updateProgressCache.delete(key);
        }
      }
    }

    // Используем upsert для надежности
    if (isCorrect) {
      // Получаем текущий прогресс
      const { data: existing } = await supabase
        .from('user_term_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('term_id', termId)
        .maybeSingle();

      if (existing) {
        // Обновляем существующий прогресс
        const newTimesPracticed = existing.times_practiced + 1;
        // Увеличиваем mastery_level на 10 за каждый правильный ответ, максимум 100
        const newMasteryLevel = Math.min(100, existing.mastery_level + 10);

        const { error } = await supabase
          .from('user_term_progress')
          .update({
            times_practiced: newTimesPracticed,
            mastery_level: newMasteryLevel,
            last_practiced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating term progress:', error);
        } else {

        }
      } else {
        // Создаем новую запись
        const { error } = await supabase
          .from('user_term_progress')
          .insert({
            user_id: userId,
            term_id: termId,
            times_practiced: 1,
            mastery_level: 10,
            last_practiced_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error inserting term progress:', error);
        } else {

        }
      }
    } else {
      // При неправильном ответе уменьшаем mastery_level, но не уменьшаем times_practiced
      const { data: existing } = await supabase
        .from('user_term_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('term_id', termId)
        .maybeSingle();

      if (existing && existing.mastery_level > 0) {
        const { error } = await supabase
          .from('user_term_progress')
          .update({
            mastery_level: Math.max(0, existing.mastery_level - 5),
            last_practiced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating term progress (wrong answer):', error);
        }
      }
    }
  } catch (error) {
    console.error('Error updating term progress:', error);
  }
}

/**
 * Получает количество изученных терминов
 * Термин считается изученным, если times_practiced >= 3 (правильно ответил 3 раза)
 */
export async function getStudiedTermsCount(userId: string): Promise<number> {
  try {
    const { data, error, count } = await supabase
      .from('user_term_progress')
      .select('term_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('times_practiced', 3);

    if (error) {
      console.error('Error getting studied terms count:', error);
      throw error;
    }


    return count || 0;
  } catch (error) {
    console.error('Error getting studied terms count:', error);
    return 0;
  }
}

/**
 * Получает детальную статистику по терминам
 */
export async function getTermProgressStats(userId: string): Promise<{
  studied: number;
  inProgress: number;
  notStarted: number;
  total: number;
  progress: TermProgress[];
}> {
  try {
    // Получаем все термины
    const { data: allTerms } = await supabase
      .from('language_terms')
      .select('id, term_es, term_ru');

    // Получаем прогресс пользователя
    const { data: userProgress, error: progressError } = await supabase
      .from('user_term_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error getting user progress:', progressError);
    }



    const total = allTerms?.length || 0;
    const progressMap = new Map(
      userProgress?.map(p => [p.term_id, p]) || []
    );

    let studied = 0;
    let inProgress = 0;
    let notStarted = 0;

    const progress: TermProgress[] = (allTerms || []).map(term => {
      const userProg = progressMap.get(term.id);
      // Термин считается изученным, если правильно ответил 3 раза
      const isStudied = userProg ? userProg.times_practiced >= 3 : false;
      const isInProgress = userProg
        ? userProg.times_practiced > 0 && !isStudied
        : false;

      if (isStudied) studied++;
      else if (isInProgress) inProgress++;
      else notStarted++;

      return {
        term_id: term.id,
        term_es: term.term_es,
        term_ru: term.term_ru,
        mastery_level: userProg?.mastery_level || 0,
        times_practiced: userProg?.times_practiced || 0,
        last_practiced_at: userProg?.last_practiced_at || null,
        is_studied: isStudied,
      };
    });

    return {
      studied,
      inProgress,
      notStarted,
      total,
      progress: progress.sort((a, b) => {
        // Сначала изученные, потом в процессе, потом не начатые
        if (a.is_studied !== b.is_studied) return a.is_studied ? -1 : 1;
        if (a.times_practiced !== b.times_practiced) return b.times_practiced - a.times_practiced;
        return b.mastery_level - a.mastery_level;
      }),
    };
  } catch (error) {
    console.error('Error getting term progress stats:', error);
    return {
      studied: 0,
      inProgress: 0,
      notStarted: 0,
      total: 0,
      progress: [],
    };
  }
}

