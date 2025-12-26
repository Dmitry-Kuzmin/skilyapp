import { useMemo } from "react";
import { useUserProgress } from "./useUserProgress";
import { usePDDTickets } from "./usePDDTickets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketStatus {
    answered: number;
    correct: number;
    total: number;
    completed: boolean;
    score: number; // Реальный счет за сессию билета
    hasErrors: boolean; // Есть ли НЕИСПРАВЛЕННЫЕ ошибки в этом билете
    errorCount: number; // Количество активных ошибок в этом билете
    isStarted: boolean; // Была ли хоть одна завершенная сессия этого билета
}

export type TicketsStatusMap = Record<string, TicketStatus>;

/**
 * Хук для получения статуса прохождения билетов для пользователя
 * ИСПРАВЛЕНО: Теперь 'damaged' (красный) статус разделен на 'заслужил' и 'просто ошибки в базе'
 */
export function useTicketsStatus(profileId: string | null, country: string = 'ru', category?: string) {
    const { data: userProgress = [] } = useUserProgress(profileId, country, category);
    const { data: tickets = [] } = usePDDTickets(country as any);

    // 1. Загружаем завершенные сессии тестов (билетов) для прогресса
    const { data: sessions = [] } = useQuery({
        queryKey: ["user-test-progress", profileId],
        queryFn: async () => {
            if (!profileId) return [];
            const { data, error } = await supabase
                .from("user_test_progress")
                .select("*")
                .eq("user_id", profileId)
                .ilike("test_id", "pdd-ticket-%");
            if (error) throw error;
            return data || [];
        },
        enabled: !!profileId
    });

    // 2. Загружаем активные ошибки (Challenge Bank)
    const { data: activeErrors = [] } = useQuery({
        queryKey: ["active-challenge-errors", profileId],
        queryFn: async () => {
            if (!profileId) return [];
            const { data, error } = await supabase
                .from("user_challenge_questions")
                .select("question_id, questions_new!inner(metadata)")
                .eq("user_id", profileId)
                .eq("mastered", false);
            if (error) throw error;
            return data || [];
        },
        enabled: !!profileId
    });

    return useMemo(() => {
        const statusMap: TicketsStatusMap = {};

        // 1. Инициализируем на основе списка билетов
        tickets.forEach(ticket => {
            const ticketNum = ticket.number.toString();
            statusMap[ticketNum] = {
                answered: 0,
                correct: 0,
                total: ticket.questions_count || 20,
                completed: false,
                score: 0,
                hasErrors: false,
                errorCount: 0,
                isStarted: false
            };
        });

        // 2. Наполняем реальными результатами сессий (Score %)
        sessions.forEach(session => {
            const match = session.test_id.match(/pdd-ticket-(\d+)/);
            if (match) {
                const ticketNum = match[1];
                if (statusMap[ticketNum]) {
                    statusMap[ticketNum].score = session.score;
                    statusMap[ticketNum].completed = session.status === 'completed' || session.status === 'passed';
                    statusMap[ticketNum].isStarted = true;
                }
            }
        });

        // 3. Синхронизируем ошибки из Challenge Bank
        activeErrors.forEach((err: any) => {
            const ticketNum = err.questions_new?.metadata?.ticket_number;
            if (ticketNum) {
                const key = ticketNum.toString();
                if (statusMap[key]) {
                    statusMap[key].hasErrors = true;
                    statusMap[key].errorCount++;
                }
            }
        });

        // 4. Справка (не влияет на статус 'начатости')
        userProgress.forEach((item: any) => {
            const ticketNum = item.questions_new?.metadata?.ticket_number;
            if (ticketNum) {
                const key = ticketNum.toString();
                if (statusMap[key]) {
                    statusMap[key].answered++;
                    if (item.is_correct) {
                        statusMap[key].correct++;
                    }
                }
            }
        });

        return statusMap;
    }, [userProgress, tickets, sessions, activeErrors]);
}
