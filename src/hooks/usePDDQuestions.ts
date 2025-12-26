/**
 * Хук для получения вопросов билета с адаптацией к универсальному формату
 * Использует Strategy Pattern для работы с разными источниками данных
 */

import { useQuery } from '@tanstack/react-query';
import { CountryCode, UniversalQuestion } from '@/types/pdd';
import { getPDDStrategy } from '@/core/pdd';

export function usePDDTicketQuestions(
  country: CountryCode,
  ticketNumber: number
) {
  return useQuery({
    queryKey: ['pdd-questions', country, ticketNumber],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      const strategy = getPDDStrategy(country);
      return strategy.getTicketQuestions(country, ticketNumber);
    },
    enabled: !!country && ticketNumber > 0,
  });
}

/**
 * Хук для получения случайных вопросов
 * Использует Strategy Pattern для работы с разными источниками данных
 */
export function usePDDRandomQuestions(country: CountryCode, count: number = 20) {
  return useQuery({
    queryKey: ['pdd-random-questions', country, count],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      const strategy = getPDDStrategy(country);
      return strategy.getRandomQuestions(country, count);
    },
    enabled: !!country && count > 0,
  });
}

export function usePDDSequentialQuestions(country: CountryCode, enabled: boolean = true) {
  return useQuery({
    queryKey: ['pdd-sequential-questions', country],
    queryFn: async (): Promise<UniversalQuestion[]> => {
      const strategy = getPDDStrategy(country);
      if (strategy.getSequentialQuestions) {
        return strategy.getSequentialQuestions(country);
      }
      // Fallback to random if not implemented
      return strategy.getRandomQuestions(country, 800);
    },
    enabled: !!country && enabled,
    staleTime: 30 * 60 * 1000, // Long stale time for full database
  });
}


