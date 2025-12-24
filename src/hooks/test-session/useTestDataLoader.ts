import { useMemo } from 'react';
import { useTestQuestions } from "@/hooks/useTestQuestions";
import { useSequentialTestQuestions } from "@/hooks/useTestQuestions";
import {
    useChallengeBankQuestions,
    useDGTQuestions,
    useQuestionsByTopic,
    useTestInfo,
} from "@/hooks/useTestQuestionsByMode";
import { usePDDExamQuestions } from "@/hooks/usePDDExamQuestions";
import { usePDDTicketQuestions, usePDDRandomQuestions } from "@/hooks/usePDDQuestions";
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
    | 'mastery';

interface UseTestDataLoaderProps {
    mode: TestMode;
    profileId: string | null;
    testId?: string;
    topic?: string;
    pddCountry?: CountryCode | null;
    ticketNumber?: number | null;
    questionCount?: number;
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
}: UseTestDataLoaderProps): UseTestDataLoaderResult => {

    // Practice/Exam mode questions
    const shouldLoadPractice = mode === 'practice' || mode === 'exam' || mode === 'blitz';
    const practiceQuestions = useTestQuestions({
        topicId: shouldLoadPractice ? topic : null,
        questionCount,
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
        mode === 'challenge-bank' ? profileId : null
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

    // Nonstop/Random questions - positional args: (country, count)
    const pddRandomQuestions = usePDDRandomQuestions(
        pddCountry || 'russia',
        (mode === 'nonstop' || mode === 'practice' || mode === 'blitz' || mode === 'exam' || mode === 'mastery' || mode === 'hardest') && pddCountry === 'russia' ? questionCount : 0
    );

    // Aggregate results based on mode
    const result = useMemo((): UseTestDataLoaderResult => {
        switch (mode) {
            case 'practice':
            case 'exam':
            case 'blitz':
            case 'mastery':
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
                return {
                    questions: topicQuestions.data || [],
                    isLoading: topicQuestions.isLoading,
                    error: topicQuestions.error as Error | null,
                    testInfo: { id: `topic-${topic}`, title: `📚 Тема: ${topic}` },
                };

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

            case 'pdd-topic':
                return {
                    questions: pddTopicQuestions.data || [],
                    isLoading: pddTopicQuestions.isLoading,
                    error: pddTopicQuestions.error as Error | null,
                    testInfo: { id: `pdd-topic-${topic}`, title: `Тема ПДД` },
                };

            case 'nonstop':
                return {
                    questions: pddRandomQuestions.data || [],
                    isLoading: pddRandomQuestions.isLoading,
                    error: pddRandomQuestions.error as Error | null,
                    testInfo: { id: 'nonstop', title: '♾️ Нон-стоп' },
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
    ]);

    return result;
};
