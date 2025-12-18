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


