import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useProfileData } from "./useProfileData";

type SpendType = "boost_50_50" | "boost_hint" | "boost_time" | "second_chance";

/**
 * ОПТИМИЗИРОВАННЫЙ хук для работы с монетами
 * Использует useProfileData для получения баланса (один запрос вместо множества)
 */
export function useCoins() {
  const { profileId } = useUserContext();
  const { coins: balance, loading, invalidate } = useProfileData();
  const queryClient = useQueryClient();

  const supabaseClient = supabase as any;

  // Функция для обновления баланса после траты
  const refreshBalance = useCallback(async () => {
    // Инвалидируем кэш профиля, чтобы обновить баланс
    invalidate();
  }, [invalidate]);

  const spendCoins = useCallback(
    async (spendType: SpendType, metadata?: Record<string, unknown>) => {
      if (!profileId) return { success: false };

      // Получаем текущий баланс для optimistic update
      const currentData = queryClient.getQueryData(["profile-data", profileId]) as any;
      const currentCoins = currentData?.coins ?? balance;
      
      // Определяем стоимость (из COSTS в Edge Function)
      const COSTS: Record<SpendType, number> = {
        boost_50_50: 30,
        boost_hint: 40,
        boost_time: 50,
        second_chance: 60,
      };
      const cost = COSTS[spendType] || 0;
      const expectedNewBalance = currentCoins - cost;

      // OPTIMISTIC UPDATE: Обновляем UI сразу (вычисляем локально)
      queryClient.setQueryData(
        ["profile-data", profileId],
        (old: any) => ({
          ...old,
          coins: expectedNewBalance,
        })
      );

      try {
        const { data, error } = await supabaseClient.functions.invoke("coins-spend", {
          body: { user_id: profileId, spend_type: spendType, metadata },
        });

        if (error) {
          // Откатываем optimistic update при ошибке
          queryClient.setQueryData(
            ["profile-data", profileId],
            (old: any) => ({
              ...old,
              coins: currentCoins,
            })
          );
          throw error;
        }

        // Синхронизируем с реальным значением с сервера (если вернулось)
        if (data?.new_balance !== undefined) {
          queryClient.setQueryData(
            ["profile-data", profileId],
            (old: any) => ({
              ...old,
              coins: data.new_balance,
            })
          );
        } else {
          // Если баланс не вернулся, обновляем через запрос
          await refreshBalance();
        }

        return { success: true, spend_amount: data?.spend_amount };
      } catch (err) {
        console.error("[useCoins] spendCoins error", err);
        // Обновляем баланс при ошибке
        await refreshBalance();
        return { success: false };
      }
    },
    [profileId, queryClient, refreshBalance, balance]
  );

  return {
    balance,
    loading,
    refresh: refreshBalance,
    spendCoins,
  };
}


