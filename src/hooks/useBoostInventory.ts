import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

interface BoostInventory {
  fifty_fifty: number;
  time_extend: number;
  hint: number;
  skip: number;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки инвентаря бустов
 * Кэширует данные на 1 минуту
 */
export function useBoostInventory() {
  const { profileId } = useUserContext();

  return useQuery<BoostInventory>({
    queryKey: ["boost-inventory", profileId],
    queryFn: async () => {
      if (!profileId) {
        return { fifty_fifty: 0, time_extend: 0, hint: 0, skip: 0 };
      }

      const { data, error } = await supabase
        .from("boost_inventory")
        .select("boost_type, quantity")
        .eq("user_id", profileId);

      if (error) {
        console.error("[useBoostInventory] Error loading boosts:", error);
        throw error;
      }

      // Преобразуем в объект
      const boostMap: BoostInventory = {
        fifty_fifty: 0,
        time_extend: 0,
        hint: 0,
        skip: 0,
      };

      (data || []).forEach((item: any) => {
        if (item.boost_type in boostMap) {
          boostMap[item.boost_type as keyof BoostInventory] = item.quantity || 0;
        }
      });

      return boostMap;
    },
    enabled: !!profileId,
    staleTime: 1 * 60 * 1000, // 1 минута
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

