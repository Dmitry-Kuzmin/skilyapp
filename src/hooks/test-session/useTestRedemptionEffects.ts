import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestRedemptionEffectsParams {
    isRedemptionMode: boolean;
    redemptionStep: string;
    redemptionFailedQuestions: any[];
    pddCountry: string;
    setFlashcardsLoading: (l: boolean) => void;
    setRedemptionFlashcards: (f: any[]) => void;
    questionsState: any[];
    currentIndex: number;
    answers: any[];
    setShowReflectionOverlay: (s: boolean) => void;
}

export const useTestRedemptionEffects = ({
    isRedemptionMode,
    redemptionStep,
    redemptionFailedQuestions,
    pddCountry,
    setFlashcardsLoading,
    setRedemptionFlashcards,
    questionsState,
    currentIndex,
    answers,
    setShowReflectionOverlay
}: TestRedemptionEffectsParams) => {
    const flashcardsRequestedRef = useRef(false);
    const shownReflectionForQuestionsRef = useRef<Set<string>>(new Set());

    // 1. Generate Flashcards
    useEffect(() => {
        if (!isRedemptionMode || flashcardsRequestedRef.current || !redemptionFailedQuestions?.length) return;

        flashcardsRequestedRef.current = true;

        const generateFlashcards = async () => {
            setFlashcardsLoading(true);
            try {
                const { data, error } = await supabase.functions.invoke('generate-flashcards', {
                    body: {
                        failedQuestions: redemptionFailedQuestions,
                        country: pddCountry || 'russia'
                    }
                });

                if (error) throw error;
                if (data?.flashcards) setRedemptionFlashcards(data.flashcards);
            } catch (err) {
                console.error('[TestSession] Failed to generate flashcards:', err);
                toast.error('Не удалось загрузить подсказки. Режим работает с базовыми данными.', {
                    id: 'flashcards-error',
                    duration: 3000,
                });
            } finally {
                setFlashcardsLoading(false);
            }
        };

        generateFlashcards();
    }, [isRedemptionMode, redemptionFailedQuestions, pddCountry, setFlashcardsLoading, setRedemptionFlashcards]);

    // 2. Auto-Show Reflection Overlay
    useEffect(() => {
        if (!isRedemptionMode || redemptionStep !== 'reflection' || questionsState.length === 0) return;

        const currentQuestionId = questionsState[currentIndex]?.id;
        if (!currentQuestionId || shownReflectionForQuestionsRef.current.has(currentQuestionId)) return;

        const isAnswered = answers.some(a => a.questionId === currentQuestionId);
        if (isAnswered) return;

        shownReflectionForQuestionsRef.current.add(currentQuestionId);
        setShowReflectionOverlay(true);
    }, [currentIndex, isRedemptionMode, redemptionStep, questionsState, answers, setShowReflectionOverlay]);
};
