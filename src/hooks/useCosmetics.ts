import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SkinDefinition {
  id: string;
  name_ru: string;
  description_ru: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  is_premium: boolean;
  category?: string;
  metadata: {
    color?: string;
    effect?: string;
    animated?: boolean;
  };
}

interface BadgeDefinition {
  id: string;
  name_ru: string;
  description_ru: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: string;
  is_premium: boolean;
  metadata: {
    icon?: string;
    color?: string;
    animated?: boolean;
  };
}

interface StickerDefinition {
  id: string;
  name_ru: string;
  description_ru: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: string;
  metadata: {
    emoji?: string;
    effect?: string;
  };
}

interface UserSkin {
  skin_id: string;
  is_active: boolean;
}

interface UserBadge {
  badge_id: string;
  is_displayed: boolean;
}

interface UserSticker {
  sticker_id: string;
  quantity: number;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки определений косметики
 * Кэширует статические данные на 30 минут
 */
export function useCosmeticsDefinitions() {
  return useQuery<{
    skins: SkinDefinition[];
    badges: BadgeDefinition[];
    stickers: StickerDefinition[];
  }>({
    queryKey: ["cosmetics-definitions"],
    queryFn: async () => {
      // ОПТИМИЗАЦИЯ: Загружаем все определения параллельно
      const [skinsDef, badgesDef, stickersDef] = await Promise.all([
        supabase
          .from("skin_definitions")
          .select("*")
          .order("rarity", { ascending: false }),
        supabase
          .from("badge_definitions")
          .select("*")
          .order("rarity", { ascending: false }),
        supabase
          .from("sticker_definitions")
          .select("*")
          .order("rarity", { ascending: false }),
      ]);

      if (skinsDef.error) throw skinsDef.error;
      if (badgesDef.error) throw badgesDef.error;
      if (stickersDef.error) throw stickersDef.error;

      return {
        skins: (skinsDef.data || []) as SkinDefinition[],
        badges: (badgesDef.data || []) as BadgeDefinition[],
        stickers: (stickersDef.data || []) as StickerDefinition[],
      };
    },
    staleTime: 30 * 60 * 1000, // 30 минут - определения редко меняются
    gcTime: 60 * 60 * 1000, // 1 час
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки инвентаря пользователя
 * Кэширует данные на 2 минуты
 */
export function useCosmeticsInventory(profileId: string | null) {
  return useQuery<{
    skins: UserSkin[];
    badges: UserBadge[];
    stickers: UserSticker[];
  }>({
    queryKey: ["cosmetics-inventory", profileId],
    queryFn: async () => {
      if (!profileId) {
        return { skins: [], badges: [], stickers: [] };
      }

      // ОПТИМИЗАЦИЯ: Загружаем весь инвентарь параллельно
      const [userSkins, userBadges, userStickers] = await Promise.all([
        supabase
          .from("user_skins")
          .select("skin_id, is_active")
          .eq("user_id", profileId),
        supabase
          .from("user_badges")
          .select("badge_id, is_displayed")
          .eq("user_id", profileId),
        supabase
          .from("user_stickers")
          .select("sticker_id, quantity")
          .eq("user_id", profileId),
      ]);

      if (userSkins.error) throw userSkins.error;
      if (userBadges.error) throw userBadges.error;
      if (userStickers.error) throw userStickers.error;

      return {
        skins: (userSkins.data || []) as UserSkin[],
        badges: (userBadges.data || []) as UserBadge[],
        stickers: (userStickers.data || []) as UserSticker[],
      };
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * Мутация для активации скина
 */
export function useActivateSkin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      skinId,
    }: {
      profileId: string;
      skinId: string;
    }) => {
      const { error } = await supabase.rpc("activate_skin", {
        p_user_id: profileId,
        p_skin_id: skinId,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Инвалидируем инвентарь для обновления активного скина
      queryClient.invalidateQueries({
        queryKey: ["cosmetics-inventory", variables.profileId],
      });
    },
  });
}

/**
 * Мутация для переключения отображения бейджа
 */
export function useToggleBadgeDisplay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      badgeId,
      display,
    }: {
      profileId: string;
      badgeId: string;
      display: boolean;
    }) => {
      const { data, error } = await supabase.rpc("toggle_badge_display", {
        p_user_id: profileId,
        p_badge_id: badgeId,
        p_display: display,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.message || "Ошибка");
      }

      return result;
    },
    onSuccess: (_, variables) => {
      // Инвалидируем инвентарь для обновления отображаемых бейджей
      queryClient.invalidateQueries({
        queryKey: ["cosmetics-inventory", variables.profileId],
      });
    },
  });
}



