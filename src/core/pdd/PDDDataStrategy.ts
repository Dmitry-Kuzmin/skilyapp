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
  getTickets(country: CountryCode, category?: string): Promise<PDDTicketSummary[]>;

  /**
   * Получить вопросы билета/темы
   */
  getTicketQuestions(
    country: CountryCode,
    ticketNumber: number,
    category?: string
  ): Promise<UniversalQuestion[]>;

  /**
   * Получить случайные вопросы
   */
  getRandomQuestions(
    country: CountryCode,
    count: number,
    category?: string
  ): Promise<UniversalQuestion[]>;

  /**
   * Получить вопросы для экзамена (специфичная логика для страны)
   */
  getExamQuestions(country: CountryCode, category?: string): Promise<{
    selectedQuestions: UniversalQuestion[];
    allQuestionsByBlock: Record<number, UniversalQuestion[]>;
  }>;

  /**
   * Получить вопросы по теме (для режима "По Темам")
   */
  getQuestionsByTopic?(
    country: CountryCode,
    topicName: string,
    count?: number,
    category?: string
  ): Promise<UniversalQuestion[]>;

  /**
   * Получить список доступных тем с количеством вопросов
   */
  getTopicsWithCounts?(country: CountryCode, category?: string): Promise<Array<{
    name: string;
    count: number;
  }>>;

  /**
   * Получить последовательные вопросы (все вопросы по порядку)
   * Для режима "Нон-стоп"
   */
  getSequentialQuestions?(country: CountryCode, category?: string): Promise<UniversalQuestion[]>;
}

