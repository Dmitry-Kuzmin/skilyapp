/**
 * Strategy Pattern для работы с данными ПДД разных стран
 * Каждая страна имеет свою стратегию получения данных
 */

import { CountryCode, UniversalQuestion, PDDTicketSummary } from '@/types/pdd';

/**
 * Интерфейс стратегии для работы с данными ПДД
 */
export interface PDDDataStrategy {
  /**
   * Получить список билетов/тем для страны
   */
  getTickets(country: CountryCode): Promise<PDDTicketSummary[]>;

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

  /**
   * Получить вопросы по теме (для режима "По Темам")
   */
  getQuestionsByTopic?(
    country: CountryCode,
    topicName: string,
    count?: number
  ): Promise<UniversalQuestion[]>;

  /**
   * Получить список доступных тем с количеством вопросов
   */
  getTopicsWithCounts?(country: CountryCode): Promise<Array<{
    name: string;
    count: number;
  }>>;
}

