import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/lazyClient";
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
        await supabase.rpc("increment_profile_value", {
          p_profile_id: profileId,
          p_column: "coins",
          p_amount: 100,
        });
        localStorage.removeItem(DEMO_COINS_KEY);
        localStorage.setItem(DEMO_DONE_KEY, "awarded");
        toast.success("🪙 ¡100 monedas añadidas!", {
          description: "Por completar el test de diagnóstico. ¡Úsalas en duelos y boosters!",
        });
      } catch (e) {
        console.error("[useDemoCoinsReward] Failed:", e);
        awardedRef.current = false;
      }
    };

    // Small delay so dashboard renders first
    const t = setTimeout(award, 1500);
    return () => clearTimeout(t);
  }, [profileId]);
}
