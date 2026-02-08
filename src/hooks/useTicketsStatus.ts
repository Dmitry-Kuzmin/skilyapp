import { useMemo } from "react";
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
 * 
 * ИЗОЛИРОВАННАЯ ЛОГИКА:
 * - Прогресс билетов берётся ТОЛЬКО из сессий конкретного билета (pdd-ticket-X)
 * - Ответы из Блица, Марафона и других режимов НЕ влияют на прогресс билетов
 * - Ошибки из Challenge Bank всё ещё показываются для информирования
 */
export function useTicketsStatus(profileId: string | null, country: string = 'ru', category?: string) {
    const { data: tickets = [] } = usePDDTickets(country as any, category);

    // 1. Загружаем завершенные сессии из ИЗОЛИРОВАННОЙ таблицы билетов
    const { data: sessions = [] } = useQuery({
        queryKey: ["user-pdd-ticket-progress", profileId, country],
        queryFn: async () => {
            if (!profileId) return [];

            // Map country param to DB country code
            const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

            try {
                const { data, error } = await supabase
                    .from("user_pdd_ticket_progress")
                    .select("ticket_id, score, status, correct_answers, total_questions, best_score")
                    .eq("user_id", profileId)
                    .eq("country", dbCountry);
                if (error) {
                    // Table might not exist yet, fallback to localStorage
                    console.warn("[useTicketsStatus] user_pdd_ticket_progress not available, using localStorage");
                    const localKey = `pdd-ticket-progress-${profileId}-${dbCountry}`;
                    const localData = localStorage.getItem(localKey);
                    return localData ? JSON.parse(localData) : [];
                }
                return data || [];
            } catch (e) {
                // Fallback to localStorage on any error
                console.warn("[useTicketsStatus] Error fetching from DB:", e);
                const localKey = `pdd-ticket-progress-${profileId}-${dbCountry}`;
                const localData = localStorage.getItem(localKey);
                return localData ? JSON.parse(localData) : [];
            }
        },
        enabled: !!profileId,
        staleTime: 2 * 60 * 1000,
    });

    // 2. Загружаем активные ошибки (Challenge Bank) для отображения бейджей
    const { data: activeErrors = [] } = useQuery({
        queryKey: ["active-challenge-errors-tickets", profileId, country],
        queryFn: async () => {
            if (!profileId) return [];

            // Map country param to DB country code
            const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

            let query = supabase
                .from("user_challenge_questions")
                .select("question_id, questions_new!inner(metadata, country)")
                .eq("user_id", profileId)
                .eq("mastered", false);

            if (dbCountry) {
                query = query.eq("questions_new.country", dbCountry);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!profileId,
        staleTime: 2 * 60 * 1000,
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

        // 2. ИЗОЛИРОВАННЫЙ ПРОГРЕСС: Наполняем ТОЛЬКО из сессий билетов
        sessions.forEach((session: any) => {
            // ticket_id format: "pdd-ticket-1", "pdd-ticket-2", etc.
            const match = session.ticket_id?.match(/pdd-ticket-(\d+)/);
            if (match) {
                const ticketNum = match[1];
                if (statusMap[ticketNum]) {
                    // Берём данные напрямую из сессии билета
                    statusMap[ticketNum].score = session.score ?? 0;
                    statusMap[ticketNum].answered = session.total_questions ?? 20;
                    statusMap[ticketNum].correct = session.correct_answers ?? 0;

                    // Билет сдан если статус passed/completed ИЛИ score >= 90%
                    statusMap[ticketNum].completed =
                        session.status === 'completed' ||
                        session.status === 'passed' ||
                        (session.score ?? 0) >= 90;

                    statusMap[ticketNum].isStarted = true;
                }
            }
        });

        // 3. Синхронизируем ошибки из Challenge Bank (только для информации)
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

        return statusMap;
    }, [tickets, sessions, activeErrors]);
}
