/**
 * Хук для получения тем ПДД России с количеством вопросов
 */

import { useQuery } from '@tanstack/react-query';
import { CountryCode } from '@/types/pdd';
import { getPDDStrategy } from '@/core/pdd';

export function usePDDTopics(country: CountryCode) {
  return useQuery({
    queryKey: ['pdd-topics', country],
    queryFn: async () => {
      const strategy = getPDDStrategy(country);
      if (strategy.getTopicsWithCounts) {
        return strategy.getTopicsWithCounts(country);
      }
      return [];
    },
    enabled: !!country && country === 'russia',
  });
}

/**
 * Хук для получения вопросов по теме
 */
export function usePDDTopicQuestions(
  country: CountryCode,
  topicName: string,
  count: number = 30
) {
  return useQuery({
    queryKey: ['pdd-topic-questions', country, topicName, count],
    queryFn: async () => {
      const strategy = getPDDStrategy(country);
      if (strategy.getQuestionsByTopic) {
        return strategy.getQuestionsByTopic(country, topicName, count);
      }
      return [];
    },
    enabled: !!country && !!topicName && country === 'russia',
  });
}

