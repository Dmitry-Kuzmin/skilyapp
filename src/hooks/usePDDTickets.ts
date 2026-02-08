/**
 * Хук для получения списка билетов для страны
 * Использует Strategy Pattern для работы с разными источниками данных
 */

import { useQuery } from '@tanstack/react-query';
import { CountryCode, PDDTicketSummary } from '@/types/pdd';
import { getPDDStrategy } from '@/core/pdd';

export function usePDDTickets(country: CountryCode, category?: string) {
  return useQuery({
    queryKey: ['pdd-tickets', country, category],
    queryFn: async (): Promise<PDDTicketSummary[]> => {
      const strategy = getPDDStrategy(country);
      return strategy.getTickets(country, category);
    },
    enabled: !!country,
  });
}


