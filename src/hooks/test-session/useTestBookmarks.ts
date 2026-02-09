import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestBookmarksParams {
    profileId: string | undefined;
    currentQuestionId: string | undefined;
    isQuestionsLoaded: boolean;
}

export const useTestBookmarks = ({
    profileId,
    currentQuestionId,
    isQuestionsLoaded
}: TestBookmarksParams) => {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [loading, setLoading] = useState(false);

    const checkBookmarkStatus = useCallback(async () => {
        if (!profileId || !currentQuestionId || !isQuestionsLoaded) return;

        try {
            const { data, error } = await supabase.from('user_challenge_questions')
                .select('is_favorite')
                .eq('user_id', profileId)
                .eq('question_id', currentQuestionId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;
            setIsBookmarked(!!data?.is_favorite);
        } catch (error) {
            console.error('[Bookmark] Error checking bookmark:', error);
        }
    }, [profileId, currentQuestionId, isQuestionsLoaded]);

    useEffect(() => {
        checkBookmarkStatus();
    }, [checkBookmarkStatus]);

    const toggleBookmark = async () => {
        if (!profileId) {
            toast.error("Необходима авторизация для добавления в закладки");
            return;
        }

        if (!currentQuestionId) return;
        if (loading) return;

        try {
            setLoading(true);

            const { data: existing, error: fetchError } = await supabase
                .from('user_challenge_questions')
                .select('*')
                .eq('user_id', profileId)
                .eq('question_id', currentQuestionId)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            if (isBookmarked) {
                if (existing) {
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
                    setIsBookmarked(false);
                }
            } else {
                if (existing) {
                    const { error } = await supabase
                        .from('user_challenge_questions')
                        .update({ is_favorite: true })
                        .eq('id', existing.id);
                    if (error) throw error;
                } else {
                    const { error: insertError } = await supabase
                        .from('user_challenge_questions')
                        .insert({
                            user_id: profileId,
                            question_id: currentQuestionId,
                            times_wrong: 0,
                            mastered: true,
                            is_favorite: true,
                            last_wrong_at: new Date().toISOString(),
                        });
                    if (insertError) throw insertError;
                }
                toast.success("Сохранено в Избранное");
                setIsBookmarked(true);
            }
        } catch (error) {
            console.error('[Bookmark] Error toggling bookmark:', error);
            toast.error("Не удалось изменить закладку");
        } finally {
            setLoading(false);
        }
    };

    return { isBookmarked, setIsBookmarked, toggleBookmark, bookmarkLoading: loading };
};
