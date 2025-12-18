/**
 * Strategy Pattern для работы с данными ПДД разных стран
 * Каждая страна имеет свою стратегию получения данных
 */

import { CountryCode, UniversalQuestion, PDDRussiaTicket } from '@/types/pdd';

/**
 * Интерфейс стратегии для работы с данными ПДД
 */
export interface PDDDataStrategy {
  /**
   * Получить список билетов/тем для страны
   */
  getTickets(country: CountryCode): Promise<PDDRussiaTicket[]>;

  /**
   * Получить вопросы билета/темы
   */
  getTicketQuestions(
    country: CountryCode,
    ticketNumber: number
  ): Promise<UniversalQuestion[]>;

  /**
   * Получить случайные вопросы
   */
  getRandomQuestions(
    country: CountryCode,
    count: number
  ): Promise<UniversalQuestion[]>;

  /**
   * Получить вопросы для экзамена (специфичная логика для страны)
   */
  getExamQuestions(country: CountryCode): Promise<{
    selectedQuestions: UniversalQuestion[];
    allQuestionsByBlock: Record<number, UniversalQuestion[]>;
  }>;
}

