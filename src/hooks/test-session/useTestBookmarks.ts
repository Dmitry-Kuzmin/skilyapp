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
                .select('id')
                .eq('user_id', profileId)
                .eq('question_id', currentQuestionId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;
            setIsBookmarked(!!data);
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
            if (isBookmarked) {
                const { error } = await supabase
                    .from('user_challenge_questions')
                    .delete()
                    .eq('user_id', profileId)
                    .eq('question_id', currentQuestionId);

                if (error) throw error;
                toast.success("Удалено из закладок");
                setIsBookmarked(false);
            } else {
                const { data: existing, error: checkError } = await supabase
                    .from('user_challenge_questions')
                    .select('id')
                    .eq('user_id', profileId)
                    .eq('question_id', currentQuestionId)
                    .maybeSingle();

                if (checkError && checkError.code !== 'PGRST116') throw checkError;

                if (existing) {
                    toast.success("Вопрос уже в закладках");
                    setIsBookmarked(true);
                } else {
                    const { error: insertError } = await supabase
                        .from('user_challenge_questions')
                        .insert({
                            user_id: profileId,
                            question_id: currentQuestionId,
                            times_wrong: 0,
                            last_wrong_at: new Date().toISOString(),
                        });

                    if (insertError) throw insertError;
                    toast.success("Добавлено в закладки");
                    setIsBookmarked(true);
                }
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
