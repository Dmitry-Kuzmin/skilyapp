import { useEffect } from 'react';

interface TestAIBehaviorParams {
    mode: string;
    showAIExplanation: boolean;
    currentQuestionId: string | undefined;
    handleOpenAIChat: () => void;
}

export const useTestAIBehavior = ({
    mode,
    showAIExplanation,
    currentQuestionId,
    handleOpenAIChat
}: TestAIBehaviorParams) => {
    useEffect(() => {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth > 1280;
        if (mode === 'by-topic' && isDesktop && !showAIExplanation && currentQuestionId) {
            handleOpenAIChat();
        }
    }, [mode, currentQuestionId, handleOpenAIChat, showAIExplanation]);
};
