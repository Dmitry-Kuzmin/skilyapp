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
      try {
        if (!country) {
          return [];
        }
        const strategy = getPDDStrategy(country);
        if (strategy.getTopicsWithCounts) {
          return await strategy.getTopicsWithCounts(country);
        }
        return [];
      } catch (error) {
        console.error('[usePDDTopics] Error fetching topics:', error);
        return [];
      }
    },
    enabled: !!country,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 минут
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
      try {
        const strategy = getPDDStrategy(country);
        if (strategy.getQuestionsByTopic) {
          return await strategy.getQuestionsByTopic(country, topicName, count);
        }
        return [];
      } catch (error) {
        console.error('[usePDDTopicQuestions] Error fetching topic questions:', error);
        return [];
      }
    },
    enabled: !!country && !!topicName,
    retry: 1,
  });
}


