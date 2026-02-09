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
    if (!profileId || !questions.length || !questions[currentIndex]?.question_id) return;

    try {
      const { data, error } = await supabase
        .from('user_challenge_questions')
        .select('is_favorite')
        .eq('user_id', profileId)
        .eq('question_id', questions[currentIndex].question_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsQuestionBookmarked(!!data?.is_favorite);
    } catch (error) {
      console.error('[useQuestionBookmark] Error checking bookmark:', error);
    }
  }, [profileId, questions, currentIndex]);

  const toggleBookmark = useCallback(async () => {
    if (!profileId || !questions.length || !questions[currentIndex]?.question_id) return;

    setBookmarkLoading(true);
    const questionId = questions[currentIndex].question_id;

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('user_challenge_questions')
        .select('*')
        .eq('user_id', profileId)
        .eq('question_id', questionId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (isQuestionBookmarked) {
        if (existing) {
          // Logic: If it's an "Error" (mastered=false or times_wrong>0), keep record but unmark favorite.
          // If it's "Pure Bookmark" (mastered=true and times_wrong=0), delete record.
          const isError = !existing.mastered || existing.times_wrong > 0;

          if (isError) {
            const { error } = await supabase
              .from('user_challenge_questions')
              .update({ is_favorite: false })
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('user_challenge_questions')
              .delete()
              .eq('id', existing.id);
            if (error) throw error;
          }

          toast.success("Удалено из Избранного");
          setIsQuestionBookmarked(false);
        }
      } else {
        if (existing) {
          const { error } = await supabase
            .from('user_challenge_questions')
            .update({ is_favorite: true })
            .eq('id', existing.id);

          if (error) throw error;
          toast.success("Сохранено в Избранное");
          setIsQuestionBookmarked(true);
        } else {
          const { error: insertError } = await supabase
            .from('user_challenge_questions')
            .insert({
              user_id: profileId,
              question_id: questionId,
              times_wrong: 0,
              mastered: true, // Not an error
              is_favorite: true,
              last_wrong_at: new Date().toISOString(),
            });

          if (insertError) throw insertError;
          toast.success("Сохранено в Избранное");
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

