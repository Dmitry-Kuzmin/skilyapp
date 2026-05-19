/**
 * savePddTicketProgress — сохраняет прогресс PDD-билета.
 * При ошибке БД делает fallback в localStorage чтобы прогресс не потерялся.
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PddTicketProgressInput = {
    profileId: string;
    effectiveTestId: string;
    pddCountry: string;
    questionsTotal: number;
    correctCount: number;
    timeSpentSec: number;
};

const normalizeCountry = (pddCountry: string): string => {
    if (pddCountry === 'russia') return 'ru';
    if (pddCountry === 'spain') return 'es';
    return pddCountry || 'ru';
};

export async function savePddTicketProgress(
    input: PddTicketProgressInput,
    queryClient: QueryClient
): Promise<void> {
    const { profileId, effectiveTestId, pddCountry, questionsTotal, correctCount, timeSpentSec } = input;

    const ticketScore = Math.round((correctCount / Math.max(1, questionsTotal)) * 100);
    const ticketStatus: 'passed' | 'failed' | 'in_progress' =
        ticketScore >= 90 ? 'passed' : ticketScore > 0 ? 'failed' : 'in_progress';
    const dbCountry = normalizeCountry(pddCountry);

    const { error: upsertError } = await supabase
        .from('user_pdd_ticket_progress')
        .upsert(
            {
                user_id: profileId,
                ticket_id: effectiveTestId,
                country: dbCountry,
                status: ticketStatus,
                score: ticketScore,
                correct_answers: correctCount,
                total_questions: questionsTotal,
                time_spent_seconds: timeSpentSec,
                completed_at: new Date().toISOString(),
                best_score: ticketScore, // DB trigger обрабатывает max если есть
            },
            { onConflict: 'user_id,ticket_id,country' }
        );

    if (upsertError) {
        console.error('[savePddTicketProgress] DB error, fallback to localStorage:', upsertError);
        saveToLocalStorage({ profileId, dbCountry, effectiveTestId, ticketScore, ticketStatus, correctCount, questionsTotal });
    }

    queryClient.invalidateQueries({ queryKey: ['user-pdd-ticket-progress'] });
}

function saveToLocalStorage(args: {
    profileId: string;
    dbCountry: string;
    effectiveTestId: string;
    ticketScore: number;
    ticketStatus: string;
    correctCount: number;
    questionsTotal: number;
}): void {
    const { profileId, dbCountry, effectiveTestId, ticketScore, ticketStatus, correctCount, questionsTotal } = args;
    const localKey = `pdd-ticket-progress-${profileId}-${dbCountry}`;

    try {
        const existingData = localStorage.getItem(localKey);
        const tickets: Array<{ ticket_id: string; best_score?: number; [k: string]: unknown }> =
            existingData ? JSON.parse(existingData) : [];

        const existingIndex = tickets.findIndex((t) => t.ticket_id === effectiveTestId);
        const ticketData = {
            ticket_id: effectiveTestId,
            score: ticketScore,
            status: ticketStatus,
            correct_answers: correctCount,
            total_questions: questionsTotal,
            best_score: Math.max(
                ticketScore,
                existingIndex >= 0 ? Number(tickets[existingIndex].best_score) || 0 : 0
            ),
        };

        if (existingIndex >= 0) tickets[existingIndex] = ticketData;
        else tickets.push(ticketData);

        localStorage.setItem(localKey, JSON.stringify(tickets));
    } catch (err) {
        console.error('[savePddTicketProgress] localStorage fallback failed:', err);
    }
}
