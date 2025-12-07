import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Subtopic {
  id: string;
  code: string;
  title_ru: string;
  title_es: string;
  title_en: string;
  type: "material" | "terms" | "test";
  topic_id: string;
  order_index: number;
  content_id: string | null;
  topics: {
    id: string;
    number: number;
    title_ru: string;
    title_es: string;
  } | null;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки подтемы с темой
 * Кэширует данные на 5 минут
 */
export function useSubtopic(subtopicId: string | null) {
  return useQuery<Subtopic | null>({
    queryKey: ["subtopic", subtopicId],
    queryFn: async () => {
      if (!subtopicId) return null;

      const { data, error } = await supabase
        .from("subtopics")
        .select("*, topics(id, number, title_ru, title_es)")
        .eq("id", subtopicId)
        .single();

      if (error) throw error;

      return (data as Subtopic) || null;
    },
    enabled: !!subtopicId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки всех подтем темы
 * Кэширует данные на 5 минут
 */
export function useSubtopicsByTopic(topicId: string | null) {
  return useQuery<Subtopic[]>({
    queryKey: ["subtopics-by-topic", topicId],
    queryFn: async () => {
      if (!topicId) return [];

      const { data, error } = await supabase
        .from("subtopics")
        .select("*")
        .eq("topic_id", topicId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      return (data || []) as Subtopic[];
    },
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}














