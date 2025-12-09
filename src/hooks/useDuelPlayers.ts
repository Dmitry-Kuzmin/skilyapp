import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DuelPlayer {
  id: string;
  user_id: string;
  score: number;
  correct_count: number;
  profiles?: {
    id: string;
    username: string | null;
    first_name: string | null;
    photo_url: string | null;
  };
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки игроков дуэли
 * Загружает игроков с профилями одним запросом через join
 */
export function useDuelPlayers(duelId: string | null) {
  return useQuery<DuelPlayer[]>({
    queryKey: ["duel-players", duelId],
    queryFn: async () => {
      if (!duelId) return [];

      // ОПТИМИЗАЦИЯ: Загружаем игроков с профилями одним запросом через join
      const { data, error } = await supabase
        .from("duel_players")
        .select(`
          id,
          user_id,
          score,
          correct_count,
          profiles (id, username, first_name, photo_url)
        `)
        .eq("duel_id", duelId);

      if (error) {
        console.error("[useDuelPlayers] Error loading players:", error);
        throw error;
      }

      return (data || []) as DuelPlayer[];
    },
    enabled: !!duelId,
    staleTime: 10 * 1000, // 10 секунд - данные игроков меняются часто
    gcTime: 2 * 60 * 1000, // 2 минуты
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}


















