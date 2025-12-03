import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Topic {
  id: string;
  number: number;
  title_ru: string;
  title_es: string;
  title_en: string;
  cover_image: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
  is_premium: boolean;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки тем
 * Кэширует статические данные на 30 минут
 */
export function useTopics() {
  return useQuery<Topic[]>({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select(`
          id, number, title_ru, title_es, title_en, cover_image, 
          gradient_from, gradient_to, is_premium
        `)
        .order("number");

      if (error) throw error;

      return (data || []) as Topic[];
    },
    staleTime: 30 * 60 * 1000, // 30 минут - темы редко меняются
    gcTime: 60 * 60 * 1000, // 1 час
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}






