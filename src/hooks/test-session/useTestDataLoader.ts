import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useTestQuestions } from "@/hooks/useTestQuestions";
import { useSequentialTestQuestions } from "@/hooks/useTestQuestions";
import {
    useChallengeBankQuestions,
    useDGTQuestions,
    useQuestionsByTopic,
    useTestInfo,
} from "@/hooks/useTestQuestionsByMode";
import { usePDDExamQuestions } from "@/hooks/usePDDExamQuestions";
import { usePDDTicketQuestions, usePDDRandomQuestions, usePDDSequentialQuestions } from "@/hooks/usePDDQuestions";
import { usePDDTopicQuestions } from "@/hooks/usePDDTopics";
import { CountryCode } from "@/types/pdd";

export type TestMode =
    | 'practice'
    | 'exam'
    | 'blitz'
    | 'sequential'
    | 'challenge-bank'
    | 'module'
    | 'dgt'
    | 'exam-russia'
    | 'by-topic'
    | 'nonstop'
    | 'pdd-ticket'
    | 'pdd-topic'
    | 'marathon'
    | 'traps'
    | 'redemption'
    | 'mastery';

interface UseTestDataLoaderProps {
    mode: TestMode;
    profileId: string | null;
    testId?: string;
    topic?: string;
    pddCountry?: CountryCode | null;
    ticketNumber?: number | null;
    questionCount?: number;
    redemptionData?: {
        failedIds: string[];
    };
}

interface UseTestDataLoaderResult {
    questions: any[];
    isLoading: boolean;
    error: Error | null;
    testInfo: { id: string; title: string } | null;
    refetch?: () => void;
    // Meta for special modes
    meta?: {
        allQuestionsByBlock?: any; // For exam-russia
        rawData?: any; // Original data from hook
    };
}

export const useTestDataLoader = ({
    mode,
    profileId,
    testId,
    topic,
    pddCountry,
    ticketNumber,
    questionCount = 30,
    redemptionData,
}: UseTestDataLoaderProps): UseTestDataLoaderResult => {

    // Practice/Exam mode questions
    const shouldLoadPractice = mode === 'practice' || mode === 'exam' || mode === 'blitz';
    const practiceQuestions = useTestQuestions({
        topicId: shouldLoadPractice ? topic : null,
        questionCount,
        country: pddCountry || undefined, // Передаем страну для фильтрации
        enabled: shouldLoadPractice,
    });

    // Sequential test questions
    const sequentialQuestions = useSequentialTestQuestions(
        mode === 'sequential' && testId ? testId : undefined
    );

    // Sequential test info
    const testInfoQuery = useTestInfo(
        mode === 'sequential' && testId ? testId : undefined
    );

    // Challenge bank questions  
    const challengeBankQuestions = useChallengeBankQuestions(
        mode === 'challenge-bank' ? profileId : null,
        questionCount,
        pddCountry || undefined
    );

    // DGT questions
    const dgtQuestions = useDGTQuestions(
        mode === 'dgt' || mode === 'module' ? questionCount : 0
    );

    // Topic-based questions
    const topicQuestions = useQuestionsByTopic(
        mode === 'by-topic' && topic ? topic : undefined,
        questionCount
    );

    // PDD Exam questions (Russia) - always call but only use when mode matches
    const pddExamQuestions = usePDDExamQuestions();

    // PDD Ticket questions - positional args: (country, ticketNumber)
    const pddTicketQuestions = usePDDTicketQuestions(
        pddCountry || 'russia',
        mode === 'pdd-ticket' && ticketNumber ? ticketNumber : 0
    );

    // PDD Topic questions - positional args: (country, topicName, count)
    const pddTopicQuestions = usePDDTopicQuestions(
        pddCountry || 'russia',
        mode === 'pdd-topic' || mode === 'by-topic' ? topic || '' : '',
        questionCount
    );

    // Nonstop/Marathon/Sequential questions
    const isSequentialRequired = (mode === 'nonstop' || mode === 'marathon' || mode === 'traps') && pddCountry === 'russia';
    const pddSequentialQuestions = usePDDSequentialQuestions(
        pddCountry || 'russia',
        isSequentialRequired
    );

    // Random questions - positional args: (country, count)
    const pddRandomQuestions = usePDDRandomQuestions(
        pddCountry || 'russia',
        (!isSequentialRequired && (mode === 'practice' || mode === 'blitz' || mode === 'exam' || mode === 'mastery' || mode === 'hardest')) && pddCountry === 'russia' ? questionCount : 0
    );

    // Redemption questions
    const redemptionQuestions = useQuery({
        queryKey: ["redemption-questions", redemptionData?.failedIds, pddCountry],
        queryFn: async () => {
            console.log("[useTestDataLoader] Fetching redemption questions for IDs:", redemptionData?.failedIds);
            if (!redemptionData?.failedIds?.length) return [];

            // 1. Load original failed questions
            const { data: original, error: origError } = await supabase
                .from("questions_new")
                .select("*, topics (title_ru, title_es), answer_options (*)")
                .in("id", redemptionData.failedIds);

            if (origError) throw origError;

            // 2. Load drill questions (similar topics)
            const topicIds = [...new Set(original?.map(q => q.topic_id).filter(Boolean))];

            let drill: any[] = [];
            if (topicIds.length > 0) {
                const { data: drilled, error: drillError } = await supabase
                    .from("questions_new")
                    .select("*, topics (title_ru, title_es), answer_options (*)")
                    .in("topic_id", topicIds)
                    .not("id", "in", `(${redemptionData.failedIds.join(',')})`)
                    .limit(redemptionData.failedIds.length * 2);

                if (drillError) throw drillError;
                drill = drilled || [];
            }

            // Mix: Original first (Reflection stage), then Drill (Mastery stage)
            // But we rely on TestSession to know which is which. 
            // We just return them in order: original then drill.
            const result = [...(original || []), ...(drill.sort(() => Math.random() - 0.5))];
            console.log(`[useTestDataLoader] Loaded ${result.length} redemption questions (${original?.length || 0} original, ${drill.length} drill)`);
            return result;
        },
        enabled: mode === 'redemption' && !!redemptionData?.failedIds?.length,
    });

    // Aggregate results based on mode
    const result = useMemo((): UseTestDataLoaderResult => {
        switch (mode) {
            case 'practice':
            case 'exam':
            case 'blitz':
            case 'mastery':
            case 'hardest':
                if (pddCountry === 'russia') {
                    return {
                        questions: pddRandomQuestions.data || [],
                        isLoading: pddRandomQuestions.isLoading,
                        error: pddRandomQuestions.error as Error | null,
                        testInfo: { id: 'pdd-practice', title: 'ПДД РФ' },
                    };
                }
                return {
                    questions: practiceQuestions.data || [],
                    isLoading: practiceQuestions.isLoading,
                    error: practiceQuestions.error as Error | null,
                    testInfo: { id: 'practice', title: mode === 'exam' ? 'Экзамен DGT' : 'Практика' },
                };

            case 'sequential':
                return {
                    questions: sequentialQuestions.data || [],
                    isLoading: sequentialQuestions.isLoading || testInfoQuery.isLoading,
                    error: (sequentialQuestions.error || testInfoQuery.error) as Error | null,
                    testInfo: testInfoQuery.data
                        ? { id: testInfoQuery.data.id, title: testInfoQuery.data.title_ru }
                        : null,
                };

            case 'challenge-bank':
                return {
                    questions: challengeBankQuestions.data || [],
                    isLoading: challengeBankQuestions.isLoading,
                    error: challengeBankQuestions.error as Error | null,
                    testInfo: { id: 'challenge-bank', title: '🏆 Банк сложных вопросов' },
                };

            case 'dgt':
            case 'module':
                return {
                    questions: dgtQuestions.data || [],
                    isLoading: dgtQuestions.isLoading,
                    error: dgtQuestions.error as Error | null,
                    testInfo: { id: 'dgt', title: '🚗 Вопросы DGT' },
                };

            case 'by-topic':
            case 'pdd-topic':
                {
                    const isRussia = pddCountry === 'russia';
                    const data = isRussia ? pddTopicQuestions : topicQuestions;
                    return {
                        questions: data.data || [],
                        isLoading: data.isLoading,
                        error: data.error as Error | null,
                        testInfo: { id: `topic-${topic}`, title: `📚 Тема: ${topic}` },
                    };
                }

            case 'exam-russia':
                return {
                    questions: pddExamQuestions.data?.questions || [],
                    isLoading: pddExamQuestions.isLoading,
                    error: pddExamQuestions.error as Error | null,
                    testInfo: { id: 'exam-russia', title: '🚦 Экзамен ПДД РФ' },
                    meta: {
                        allQuestionsByBlock: pddExamQuestions.data?.allQuestionsByBlock,
                        rawData: pddExamQuestions.data,
                    },
                };

            case 'pdd-ticket':
                return {
                    questions: pddTicketQuestions.data || [],
                    isLoading: pddTicketQuestions.isLoading,
                    error: pddTicketQuestions.error as Error | null,
                    testInfo: { id: `pdd-ticket-${ticketNumber}`, title: `Билет ${ticketNumber}` },
                };

            case 'nonstop':
            case 'marathon':
                return {
                    questions: pddSequentialQuestions.data || [],
                    isLoading: pddSequentialQuestions.isLoading,
                    error: pddSequentialQuestions.error as Error | null,
                    testInfo: {
                        id: mode,
                        title: mode === 'marathon' ? '🔥 Марафон' : '♾️ Нон-стоп'
                    },
                };

            case 'traps':
                return {
                    questions: (pddSequentialQuestions.data || []).filter((q: any) => {
                        const diff = parseFloat(q.difficulty || '0');
                        return diff > 0.8;
                    }).slice(0, 50),
                    isLoading: pddSequentialQuestions.isLoading,
                    error: pddSequentialQuestions.error as Error | null,
                    testInfo: { id: 'traps', title: '🪤 Топ-50 ловушек' },
                };

            case 'redemption':
                return {
                    questions: redemptionQuestions.data || [],
                    isLoading: redemptionQuestions.isLoading,
                    error: redemptionQuestions.error as Error | null,
                    testInfo: { id: 'redemption', title: '🛡️ Протокол Восстановления' },
                };

            default:
                return {
                    questions: [],
                    isLoading: false,
                    error: null,
                    testInfo: null,
                };
        }
    }, [
        mode,
        practiceQuestions,
        sequentialQuestions,
        testInfoQuery,
        challengeBankQuestions,
        dgtQuestions,
        topicQuestions,
        pddExamQuestions,
        pddTicketQuestions,
        pddTopicQuestions,
        pddRandomQuestions,
        topic,
        ticketNumber,
        redemptionQuestions,
    ]);

    return result;
};
