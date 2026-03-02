/**
 * Хук для получения вопросов билета с адаптацией к универсальному формату
 * Использует Strategy Pattern для работы с разными источниками данных
 */

import { useQuery } from '@tanstack/react-query';
import { CountryCode, UniversalQuestion } from '@/types/pdd';
import { getPDDStrategy } from '@/core/pdd';

export function usePDDTicketQuestions(
  country: CountryCode,
  ticketNumber: number,
  category?: string
) {
  return useQuery({
    queryKey: ['pdd-questions', country, ticketNumber, category],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      const strategy = getPDDStrategy(country);
      return strategy.getTicketQuestions(country, ticketNumber, category);
    },
    enabled: !!country && ticketNumber > 0,
  });
}

/**
 * Хук для получения случайных вопросов
 * Использует Strategy Pattern для работы с разными источниками данных
 */
export function usePDDRandomQuestions(country: CountryCode, count: number = 20, category?: string) {
  return useQuery({
    queryKey: ['pdd-random-questions', country, count, category],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      const strategy = getPDDStrategy(country);
      return strategy.getRandomQuestions(country, count, category);
    },
    enabled: !!country && count > 0,
  });
}

export function usePDDSequentialQuestions(country: CountryCode, enabled: boolean = true, category?: string) {
  return useQuery({
    queryKey: ['pdd-sequential-questions', country, category],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      const strategy = getPDDStrategy(country);
      if (strategy.getSequentialQuestions) {
        // @ts-expect-error - method might not exist on interface yet if not updated fully, but we know it does
        return strategy.getSequentialQuestions(country, category);
      }
      // Fallback to random if not implemented
      return strategy.getRandomQuestions(country, 800, category);
    },
    enabled: !!country && enabled,
    staleTime: 30 * 60 * 1000, // Long stale time for full database
  });
}


