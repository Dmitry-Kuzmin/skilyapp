import { useMemo } from "react";
import { useUserProgress } from "./useUserProgress";
import { usePDDTickets } from "./usePDDTickets";

export interface TicketStatus {
    answered: number;
    correct: number;
    total: number;
    completed: boolean;
    score: number;
}

export type TicketsStatusMap = Record<string, TicketStatus>;

/**
 * Хук для получения статуса прохождения билетов для пользователя
 * ПЕРЕДЕЛАНО: Работает на клиенте на основе useUserProgress для обхода ошибок 404 в RPC
 */
export function useTicketsStatus(profileId: string | null, country: string = 'ru', category?: string) {
    const { data: userProgress = [] } = useUserProgress(profileId, country, category);
    const { data: tickets = [] } = usePDDTickets(country as any);

    return useMemo(() => {
        if (!userProgress || userProgress.length === 0) return {};

        const statusMap: TicketsStatusMap = {};

        // 1. Инициализируем статусы на основе списка билетов (total)
        tickets.forEach(ticket => {
            statusMap[ticket.number.toString()] = {
                answered: 0,
                correct: 0,
                total: ticket.questions_count || 20, // По умолчанию 20 для России
                completed: false,
                score: 0
            };
        });

        // 2. Наполняем данными из прогресса
        userProgress.forEach((item: any) => {
            const ticketNum = item.questions_new?.metadata?.ticket_number;
            if (ticketNum) {
                const key = ticketNum.toString();
                if (!statusMap[key]) {
                    statusMap[key] = { answered: 0, correct: 0, total: 20, completed: false, score: 0 };
                }

                statusMap[key].answered++;
                if (item.is_correct) {
                    statusMap[key].correct++;
                }
            }
        });

        // 3. Финализируем (completed, score)
        Object.keys(statusMap).forEach(key => {
            const s = statusMap[key];
            if (s.total > 0) {
                s.completed = s.answered >= s.total;
                s.score = Math.round((s.correct / s.total) * 100);
            }
        });

        return statusMap;
    }, [userProgress, tickets]);
}
