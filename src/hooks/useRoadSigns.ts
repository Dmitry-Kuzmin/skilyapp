import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки дорожных знаков
 * Кэширует статические данные на 30 минут
 */
export function useRoadSigns() {
  return useQuery({
    queryKey: ["road-signs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("road_signs")
        .select("*")
        .limit(200);

      if (error) {
        console.error("[useRoadSigns] Error loading signs:", error);
        throw error;
      }

      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 минут - статические данные
    gcTime: 60 * 60 * 1000, // 1 час
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // Статические данные не меняются
  });
}

