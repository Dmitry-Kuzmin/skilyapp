import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEMO_COINS_KEY = "skily_demo_coins_pending";
const DEMO_DONE_KEY = "skily_demo_completed";

export function useDemoCoinsReward(profileId: string | null) {
  const awardedRef = useRef(false);

  useEffect(() => {
    if (!profileId || awardedRef.current) return;

    const pending = localStorage.getItem(DEMO_COINS_KEY);
    if (pending !== "100") return;

    awardedRef.current = true;

    const award = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("claim-demo-bonus");
        const result = data as {
          success?: boolean;
          error?: string;
          amount?: number;
        } | null;

        if (error || !result?.success) {
          // already_claimed = пользователь уже получал бонус → тихо очищаем флаг
          if (result?.error === "already_claimed") {
            localStorage.removeItem(DEMO_COINS_KEY);
            localStorage.setItem(DEMO_DONE_KEY, "awarded");
            return;
          }
          console.error("[useDemoCoinsReward] Failed:", error, result);
          awardedRef.current = false;
          return;
        }

        localStorage.removeItem(DEMO_COINS_KEY);
        localStorage.setItem(DEMO_DONE_KEY, "awarded");
        toast.success(`🪙 ¡${result.amount ?? 100} monedas añadidas!`, {
          description: "Por completar el test de diagnóstico. ¡Úsalas en duelos y boosters!",
        });
      } catch (e) {
        console.error("[useDemoCoinsReward] Failed:", e);
        awardedRef.current = false;
      }
    };

    const t = setTimeout(award, 1500);
    return () => clearTimeout(t);
  }, [profileId]);
}
