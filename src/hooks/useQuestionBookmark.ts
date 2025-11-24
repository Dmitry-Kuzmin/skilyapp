import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseQuestionBookmarkProps {
  profileId: string | null;
  questions: any[];
  currentIndex: number;
}

export function useQuestionBookmark({ profileId, questions, currentIndex }: UseQuestionBookmarkProps) {
  const [isQuestionBookmarked, setIsQuestionBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const checkIfBookmarked = useCallback(async () => {
    // Используем question_id (ID вопроса из questions_new), а не id (ID записи в duel_questions)
    if (!profileId || !questions.length || !questions[currentIndex]?.question_id) return;

    try {
      const { data, error } = await supabase
        .from('user_challenge_questions')
        .select('id')
        .eq('user_id', profileId)
        .eq('question_id', questions[currentIndex].question_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsQuestionBookmarked(!!data);
    } catch (error) {
      console.error('[useQuestionBookmark] Error checking bookmark:', error);
    }
  }, [profileId, questions, currentIndex]);

  const toggleBookmark = useCallback(async () => {
    // Используем question_id (ID вопроса из questions_new), а не id (ID записи в duel_questions)
    if (!profileId || !questions.length || !questions[currentIndex]?.question_id) return;

    setBookmarkLoading(true);
    const questionId = questions[currentIndex].question_id;

    try {
      if (isQuestionBookmarked) {
        const { error } = await supabase
          .from('user_challenge_questions')
          .delete()
          .eq('user_id', profileId)
          .eq('question_id', questionId);

        if (error) throw error;
        toast.success("Удалено из закладок");
        setIsQuestionBookmarked(false);
      } else {
        const { data: existing } = await supabase
          .from('user_challenge_questions')
          .select('id, times_wrong')
          .eq('user_id', profileId)
          .eq('question_id', questionId)
          .maybeSingle();

        if (existing) {
          toast.success("Вопрос уже в закладках");
          setIsQuestionBookmarked(true);
        } else {
          const { error: insertError } = await supabase
            .from('user_challenge_questions')
            .insert({
              user_id: profileId,
              question_id: questionId,
              times_wrong: 0,
              last_wrong_at: new Date().toISOString(),
            });

          if (insertError) throw insertError;
          toast.success("Добавлено в закладки");
          setIsQuestionBookmarked(true);
        }
      }
    } catch (error) {
      console.error('[useQuestionBookmark] Error toggling bookmark:', error);
      toast.error("Не удалось изменить закладку");
    } finally {
      setBookmarkLoading(false);
    }
  }, [profileId, questions, currentIndex, isQuestionBookmarked]);

  // Check bookmark on question change
  useEffect(() => {
    if (profileId && questions.length > 0 && questions[currentIndex]?.question_id) {
      checkIfBookmarked();
    }
  }, [profileId, currentIndex, questions, checkIfBookmarked]);

  return {
    isQuestionBookmarked,
    bookmarkLoading,
    toggleBookmark,
  };
}

