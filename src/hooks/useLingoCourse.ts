import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { LINGO_CHAPTERS } from '@/data/lingo';

interface LingoProgressRow {
  lesson_id: string;
  stars: number;
  xp_earned: number;
  completed_at: string;
}

export function useLingoCourse() {
  const { profileId } = useUserContext();
  const queryClient = useQueryClient();

  const { data: progressRows = [], isLoading } = useQuery<LingoProgressRow[]>({
    queryKey: ['lingo-progress', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('user_lingo_progress')
        .select('lesson_id, stars, xp_earned, completed_at')
        .eq('user_id', profileId);
      if (error) throw error;
      return (data ?? []) as LingoProgressRow[];
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });

  const completedIds = new Set(progressRows.map((r) => r.lesson_id));
  const totalXP = progressRows.reduce((sum, r) => sum + r.xp_earned, 0);
  const totalLessons = LINGO_CHAPTERS.reduce((s, ch) => s + ch.lessons.length, 0);
  const completedLessons = completedIds.size;

  const chapterStates = LINGO_CHAPTERS.map((ch) => {
    const lessons = ch.lessons.map((l) => {
      const row = progressRows.find((r) => r.lesson_id === l.id);
      return {
        ...l,
        completed: completedIds.has(l.id),
        stars: row?.stars ?? 0,
        xpEarned: row?.xp_earned ?? 0,
      };
    });
    const doneCount = lessons.filter((l) => l.completed).length;
    return {
      ...ch,
      lessons,
      unlocked: true,
      progress: doneCount / lessons.length,
      doneCount,
    };
  });

  const saveProgress = useMutation({
    mutationFn: async ({
      lessonId,
      stars,
      xpEarned,
    }: {
      lessonId: string;
      stars: number;
      xpEarned: number;
    }) => {
      if (!profileId) return;
      const { error } = await supabase.from('user_lingo_progress').upsert(
        {
          user_id: profileId,
          lesson_id: lessonId,
          stars,
          xp_earned: xpEarned,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lingo-progress', profileId] });
    },
  });

  return {
    isLoading,
    chapterStates,
    completedIds,
    totalXP,
    totalLessons,
    completedLessons,
    saveProgress: saveProgress.mutateAsync,
    isSaving: saveProgress.isPending,
  };
}
