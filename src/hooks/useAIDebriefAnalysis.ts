import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isTelegramMiniApp } from '@/lib/telegram';
import { useAnalysisHistoryStore, type AIDiagnosis } from '@/stores/useAnalysisHistoryStore';
import type { FailedQuestion, StudentStats } from '@/components/test-results/SmartDebriefCard';

/**
 * 🔧 Hook for AI Debrief Analysis
 * Handles AI requests, caching, and history management
 */
export function useAIDebriefAnalysis() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Zustand store actions
    const { saveAnalysis, findAnalysisByQuestions } = useAnalysisHistoryStore();

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
            const cached = findAnalysisByQuestions(questionIds);

            if (cached) {
                console.log('[useAIDebriefAnalysis] ✅ Using cached analysis');
                setIsLoading(false);
                return cached.diagnosis;
            }

            // 2. Get auth token
            let accessToken: string | null = null;
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.access_token) {
                accessToken = session.access_token;
            } else if (!isTelegramMiniApp()) {
                throw new Error('Требуется авторизация');
            }

            // 3. Generate prompt
            if (!generatePromptFn) {
                throw new Error('Prompt generator function is required');
            }

            const prompt = generatePromptFn(failedQuestions, country, studentStats, language);

            console.log('[useAIDebriefAnalysis] 🚀 Sending AI request...');
            console.log('[useAIDebriefAnalysis] Country:', country);
            console.log('[useAIDebriefAnalysis] StudentStats:', studentStats);

            // 4. Call AI Edge Function
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            const response = await fetch(`${supabase.supabaseUrl}/functions/v1/ai-chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                    temperature: 0.7,
                    country: country,
                    mode: 'debrief',
                }),
            });

            if (!response.ok) {
                throw new Error(`AI request failed: ${response.status}`);
            }

            // 5. Read SSE Stream
            let resultText = '';
            const contentType = response.headers.get('content-type');

            if (contentType?.includes('text/event-stream')) {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let lineBuffer = '';
                let isDone = false;

                if (reader) {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done || isDone) break;

                            const chunk = decoder.decode(value, { stream: true });
                            lineBuffer += chunk;

                            const lines = lineBuffer.split('\n');
                            lineBuffer = lines.pop() || '';

                            for (const line of lines) {
                                const trimmedLine = line.trim();
                                if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                                const data = trimmedLine.slice(6);
                                if (data === '[DONE]') {
                                    isDone = true;
                                    break;
                                }

                                try {
                                    const parsed = JSON.parse(data);
                                    const textChunk = (
                                        parsed.content ||
                                        parsed.text ||
                                        parsed.response ||
                                        parsed.choices?.[0]?.delta?.content ||
                                        parsed.choices?.[0]?.text ||
                                        ''
                                    );

                                    if (textChunk) {
                                        resultText += textChunk;
                                    }
                                } catch (e) {
                                    // Ignore JSON parse errors in SSE lines
                                }
                            }
                        }
                    } finally {
                        reader.releaseLock();
                    }
                }
            } else {
                const data = await response.json();
                resultText = data.content || data.text || data.response || '';
            }

            console.log('[useAIDebriefAnalysis] ✅ Full result length:', resultText.length);

            // 6. Parse and save to history
            const diagnosis = parseAIResponse(resultText);

            saveAnalysis({
                country,
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
    }, [findAnalysisByQuestions, parseAIResponse, saveAnalysis]);

    /**
     * 🔍 Get cached analysis by question IDs
     */
    const getCachedAnalysis = useCallback((questionIds: string[]) => {
        return findAnalysisByQuestions(questionIds);
    }, [findAnalysisByQuestions]);

    return {
        performAnalysis,
        getCachedAnalysis,
        isLoading,
        error,
    };
}
