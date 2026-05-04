import { useState, useCallback } from 'react';
import { useAnalysisHistoryStore, type AIDiagnosis } from '@/stores/useAnalysisHistoryStore';
import type { FailedQuestion, StudentStats } from '@/components/test-results/SmartDebriefCard';
import { useAIRequest } from '@/hooks/useAIRequest';

/**
 * 🔧 Hook for AI Debrief Analysis
 * Handles AI requests, caching, and history management
 */
export function useAIDebriefAnalysis() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Zustand store actions
    const { saveAnalysis, findAnalysisByQuestions } = useAnalysisHistoryStore();
    const { sendRequest } = useAIRequest();

    /**
     * 🧪 Parse AI Response with aggressive repair
     */
    const parseAIResponse = useCallback((text: string): AIDiagnosis => {
        try {
            console.log('[useAIDebriefAnalysis] Raw AI response:', text.slice(0, 500));

            let cleanText = text
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();

            const firstBrace = cleanText.indexOf('{');
            const lastBrace = cleanText.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanText = cleanText.slice(firstBrace, lastBrace + 1);
            }

            try {
                return JSON.parse(cleanText);
            } catch (parseError) {
                console.warn('[useAIDebriefAnalysis] JSON parse failed, attempting repair...', parseError);

                let repairedText = cleanText;

                // Repair logic for truncated logicSteps array
                if (repairedText.includes('"logicSteps":')) {
                    const logicStepsMatch = repairedText.match(/"logicSteps":\s*\[(.*)/s);
                    if (logicStepsMatch) {
                        const stepsContent = logicStepsMatch[1];
                        const lastCompleteItemIndex = stepsContent.lastIndexOf('}');
                        if (lastCompleteItemIndex !== -1) {
                            const beforeSteps = repairedText.substring(0, repairedText.indexOf('"logicSteps":'));
                            const completeSteps = stepsContent.substring(0, lastCompleteItemIndex + 1);
                            repairedText = beforeSteps + '"logicSteps": [' + completeSteps + ']';
                        }
                    }
                }

                // Close remaining braces
                const openBraces = (repairedText.match(/\{/g) || []).length;
                const closeBraces = (repairedText.match(/\}/g) || []).length;
                repairedText += '}'.repeat(Math.max(0, openBraces - closeBraces));

                console.log('[useAIDebriefAnalysis] Repaired JSON, length:', repairedText.length);
                return JSON.parse(repairedText);
            }
        } catch (e) {
            console.error('[useAIDebriefAnalysis] Failed to parse AI JSON even after repair:', e);
            return {
                greeting: "Привет! Возникли сложности с обработкой ответа.",
                diagnosis: "ИИ вернул ответ в нестандартном формате. Попробуй сгенерировать заново.",
                severity: "low" as const,
                tags: ["Ошибка формата"],
                logicSteps: [{ step: "Нажми 'Попробовать снова'", source: "" }],
                mnemonic: "Иногда даже роботы ошибаются"
            };
        }
    }, []);

    /**
     * 🚀 Perform AI Analysis
     */
    const performAnalysis = useCallback(async (
        failedQuestions: FailedQuestion[],
        country: string,
        studentStats?: StudentStats,
        generatePromptFn?: (questions: FailedQuestion[], country: string, stats?: StudentStats, language?: string) => string,
        language?: string
    ): Promise<AIDiagnosis | null> => {
        try {
            setIsLoading(true);
            setError(null);

            // 1. Check cache first
            const questionIds = failedQuestions.map(q => q.questionId);
            const cached = findAnalysisByQuestions(questionIds, country, language);

            if (cached) {
                console.log('[useAIDebriefAnalysis] ✅ Using cached analysis');
                setIsLoading(false);
                return cached.diagnosis;
            }

            // 2. Generate prompt
            if (!generatePromptFn) {
                throw new Error('Prompt generator function is required');
            }

            const prompt = generatePromptFn(failedQuestions, country, studentStats, language);

            console.log('[useAIDebriefAnalysis] 🚀 Sending AI request...');

            // 3. Stream via shared hook, accumulate full text
            let resultText = '';
            let requestError: Error | null = null;

            await sendRequest(
                { messages: [{ role: 'user', content: prompt }], country, language: language ?? 'es', mode: 'debrief' },
                {
                    onChunk: (text) => { resultText += text; },
                    onError: (err) => { requestError = err; },
                },
            );

            if (requestError) throw requestError;

            console.log('[useAIDebriefAnalysis] ✅ Full result length:', resultText.length);

            // 6. Parse and save to history
            const diagnosis = parseAIResponse(resultText);

            saveAnalysis({
                country,
                responseLanguage: language,
                questionIds,
                diagnosis,
                studentName: studentStats?.name,
                errorCount: failedQuestions.length,
            });

            setIsLoading(false);
            return diagnosis;

        } catch (err) {
            console.error('[useAIDebriefAnalysis] Error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
            setError(errorMessage);
            setIsLoading(false);
            return null;
        }
    }, [findAnalysisByQuestions, parseAIResponse, saveAnalysis, sendRequest]);

    /**
     * 🔍 Get cached analysis by question IDs
     */
    const getCachedAnalysis = useCallback((questionIds: string[], country?: string, language?: string) => {
        return findAnalysisByQuestions(questionIds, country, language);
    }, [findAnalysisByQuestions]);

    return {
        performAnalysis,
        getCachedAnalysis,
        isLoading,
        error,
    };
}
