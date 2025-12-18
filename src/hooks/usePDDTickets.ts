/**
 * Хук для получения списка билетов для страны
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CountryCode, PDDRussiaTicket } from '@/types/pdd';

export function usePDDTickets(country: CountryCode) {
  return useQuery({
    queryKey: ['pdd-tickets', country],
    queryFn: async (): Promise<PDDRussiaTicket[]> => {
      if (country === 'russia') {
        // Получаем список билетов через RPC или прямой запрос
        const { data, error } = await supabase
          .from('pdd_russia_questions')
          .select('ticket_number')
          .order('ticket_number', { ascending: true });

        if (error) throw error;

        // Группируем по билетам и считаем количество вопросов
        const ticketsMap = new Map<number, number>();
        data?.forEach((q) => {
          const count = ticketsMap.get(q.ticket_number) || 0;
          ticketsMap.set(q.ticket_number, count + 1);
        });

        // Преобразуем в массив билетов
        const tickets: PDDRussiaTicket[] = Array.from(ticketsMap.entries())
          .map(([ticketNumber, questionsCount]) => ({
            ticket_number: ticketNumber,
            questions_count: questionsCount,
            completed: false, // TODO: получать из user_progress
            progress: 0, // TODO: вычислять из user_progress
          }))
          .sort((a, b) => a.ticket_number - b.ticket_number);

        return tickets;
      }

      // Для других стран - пока пусто
      return [];
    },
    enabled: country === 'russia', // пока только Россия
  });
}


