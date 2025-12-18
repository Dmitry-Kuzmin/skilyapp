/**
 * Хук для получения списка билетов для страны
 * Использует Strategy Pattern для работы с разными источниками данных
 */

import { useQuery } from '@tanstack/react-query';
import { CountryCode, PDDRussiaTicket } from '@/types/pdd';
import { getPDDStrategy } from '@/core/pdd';

export function usePDDTickets(country: CountryCode) {
  return useQuery({
    queryKey: ['pdd-tickets', country],
    queryFn: async (): Promise<PDDRussiaTicket[]> => {
      const strategy = getPDDStrategy(country);
      return strategy.getTickets(country);
    },
    enabled: !!country,
  });
}


