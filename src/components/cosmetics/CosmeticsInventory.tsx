import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Trophy, Smile, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SkinDefinition {
  id: string;
  name_ru: string;
  description_ru: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  is_premium: boolean;
  metadata: {
    color?: string;
    effect?: string;
    animated?: boolean;
  };
}

interface UserSkin {
  id: string;
  skin_id: string;
  is_active: boolean;
  obtained_at: string;
  skin_definitions: SkinDefinition | any; // Может быть JSONB из RPC
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

interface UserBadge {
  id: string;
  badge_id: string;
  is_displayed: boolean;
  display_order: number;
  obtained_at: string;
  badge_definitions: BadgeDefinition | any; // Может быть JSONB из RPC
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

interface UserSticker {
  id: string;
  sticker_id: string;
  quantity: number;
  obtained_at: string;
  sticker_definitions: StickerDefinition | any; // Может быть JSONB из RPC
}

const rarityColors = {
  common: "bg-gray-500/20 text-gray-700 border-gray-500/30",
  rare: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  epic: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  legendary: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
};

const rarityLabels = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

export function CosmeticsInventory() {
  const { profileId } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [skins, setSkins] = useState<UserSkin[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [stickers, setStickers] = useState<UserSticker[]>([]);

  useEffect(() => {
    if (profileId) {
      loadInventory();
    }
  }, [profileId]);

  const loadInventory = async () => {
    if (!profileId) return;

    try {
      setLoading(true);

      // Загружаем через RPC функции (обходит RLS для Telegram пользователей)
      const [skinsResult, badgesResult, stickersResult] = await Promise.allSettled([
        supabase.rpc('get_user_skins', { p_user_id: profileId }),
        supabase.rpc('get_user_badges', { p_user_id: profileId }),
        supabase.rpc('get_user_stickers', { p_user_id: profileId })
      ]);

      // Обрабатываем скины
      if (skinsResult.status === 'fulfilled' && skinsResult.value.data) {
        // Преобразуем данные из RPC в формат компонента
        // skin_definitions приходит как JSONB объект, нужно его распарсить
        const transformedSkins = skinsResult.value.data
          .filter((item: any) => item.skin_definitions) // Фильтруем скины без определений
          .map((item: any) => ({
            id: item.id,
            skin_id: item.skin_id,
            is_active: item.is_active,
            obtained_at: item.obtained_at,
            skin_definitions: typeof item.skin_definitions === 'object' 
              ? item.skin_definitions 
              : (typeof item.skin_definitions === 'string' 
                  ? JSON.parse(item.skin_definitions) 
                  : item.skin_definitions)
          }));
        setSkins(transformedSkins);
        console.log('[CosmeticsInventory] ✅ Загружено скинов через RPC:', transformedSkins.length, transformedSkins);
        
        // Если есть скины без определений, логируем для отладки
        const skinsWithoutDefinitions = skinsResult.value.data.filter((item: any) => !item.skin_definitions);
        if (skinsWithoutDefinitions.length > 0) {
          console.warn('[CosmeticsInventory] ⚠️ Найдены скины без определений:', skinsWithoutDefinitions.map((s: any) => s.skin_id));
        }
      } else if (skinsResult.status === 'rejected' || (skinsResult.value && skinsResult.value.error)) {
        // Fallback на прямой запрос
        const error = skinsResult.status === 'rejected' ? skinsResult.reason : skinsResult.value.error;
        console.warn('[CosmeticsInventory] RPC для скинов не работает, используем fallback:', error);
        const { data: fallbackSkins, error: fallbackError } = await supabase
          .from("user_skins")
          .select("*, skin_definitions(*)")
          .eq("user_id", profileId)
          .order("obtained_at", { ascending: false });
        
        if (fallbackError) {
          console.error('[CosmeticsInventory] Ошибка fallback запроса:', fallbackError);
        }
        
        if (fallbackSkins) {
          // Фильтруем скины без определений
          const validSkins = fallbackSkins.filter((skin: any) => skin.skin_definitions);
          setSkins(validSkins);
          console.log('[CosmeticsInventory] Загружено скинов через fallback:', validSkins.length);
          
          // Логируем скины без определений
          const invalidSkins = fallbackSkins.filter((skin: any) => !skin.skin_definitions);
          if (invalidSkins.length > 0) {
            console.warn('[CosmeticsInventory] ⚠️ Скины без определений (возможно, не существуют в skin_definitions):', 
              invalidSkins.map((s: any) => s.skin_id));
          }
        }
      }

      // Обрабатываем бейджи
      if (badgesResult.status === 'fulfilled' && badgesResult.value.data) {
        const transformedBadges = badgesResult.value.data.map((item: any) => ({
          id: item.id,
          badge_id: item.badge_id,
          is_displayed: item.is_displayed,
          display_order: item.display_order,
          obtained_at: item.obtained_at,
          badge_definitions: typeof item.badge_definitions === 'object' 
            ? item.badge_definitions 
            : (typeof item.badge_definitions === 'string' 
                ? JSON.parse(item.badge_definitions) 
                : item.badge_definitions)
        }));
        setBadges(transformedBadges);
        console.log('[CosmeticsInventory] ✅ Загружено бейджей через RPC:', transformedBadges.length, transformedBadges);
      } else if (badgesResult.status === 'rejected' || (badgesResult.value && badgesResult.value.error)) {
        const error = badgesResult.status === 'rejected' ? badgesResult.reason : badgesResult.value.error;
        console.warn('[CosmeticsInventory] RPC для бейджей не работает, используем fallback:', error);
        const { data: fallbackBadges } = await supabase
          .from("user_badges")
          .select("*, badge_definitions(*)")
          .eq("user_id", profileId)
          .order("obtained_at", { ascending: false });
        if (fallbackBadges) {
          setBadges(fallbackBadges);
          console.log('[CosmeticsInventory] Загружено бейджей через fallback:', fallbackBadges.length);
        }
      }

      // Обрабатываем стикеры
      if (stickersResult.status === 'fulfilled' && stickersResult.value.data) {
        const transformedStickers = stickersResult.value.data.map((item: any) => ({
          id: item.id,
          sticker_id: item.sticker_id,
          quantity: item.quantity,
          obtained_at: item.obtained_at,
          sticker_definitions: typeof item.sticker_definitions === 'object' 
            ? item.sticker_definitions 
            : (typeof item.sticker_definitions === 'string' 
                ? JSON.parse(item.sticker_definitions) 
                : item.sticker_definitions)
        }));
        setStickers(transformedStickers);
        console.log('[CosmeticsInventory] ✅ Загружено стикеров через RPC:', transformedStickers.length, transformedStickers);
      } else if (stickersResult.status === 'rejected' || (stickersResult.value && stickersResult.value.error)) {
        const error = stickersResult.status === 'rejected' ? stickersResult.reason : stickersResult.value.error;
        console.warn('[CosmeticsInventory] RPC для стикеров не работает, используем fallback:', error);
        const { data: fallbackStickers } = await supabase
          .from("user_stickers")
          .select("*, sticker_definitions(*)")
          .eq("user_id", profileId)
          .order("obtained_at", { ascending: false });
        if (fallbackStickers) {
          setStickers(fallbackStickers);
          console.log('[CosmeticsInventory] Загружено стикеров через fallback:', fallbackStickers.length);
        }
      }
    } catch (error: any) {
      console.error("[CosmeticsInventory] Error loading inventory:", error);
      toast.error("Ошибка загрузки инвентаря", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const activateSkin = async (skinId: string) => {
    if (!profileId) return;

    try {
      const { error } = await supabase.rpc("activate_skin", {
        p_user_id: profileId,
        p_skin_id: skinId,
      });

      if (error) throw error;

      toast.success("Скин активирован!");
      loadInventory();
    } catch (error: any) {
      console.error("Error activating skin:", error);
      toast.error("Ошибка активации скина", {
        description: error.message,
      });
    }
  };

  const toggleBadgeDisplay = async (badgeId: string, currentDisplay: boolean) => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase.rpc("toggle_badge_display", {
        p_user_id: profileId,
        p_badge_id: badgeId,
        p_display: !currentDisplay,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        toast.error(result.message || "Ошибка");
        return;
      }

      toast.success(currentDisplay ? "Бейдж скрыт" : "Бейдж отображается в профиле");
      loadInventory();
    } catch (error: any) {
      console.error("Error toggling badge:", error);
      toast.error("Ошибка", {
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Инвентарь</h2>
        <p className="text-sm text-muted-foreground">
          Управляйте своей коллекцией косметических предметов
        </p>
      </div>

      <Tabs defaultValue="skins" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="skins" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Скины ({skins.length})
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-2">
            <Trophy className="w-4 h-4" />
            Бейджи ({badges.length})
          </TabsTrigger>
          <TabsTrigger value="stickers" className="gap-2">
            <Smile className="w-4 h-4" />
            Стикеры ({stickers.length})
          </TabsTrigger>
        </TabsList>

        {/* Скины */}
        <TabsContent value="skins" className="space-y-4">
          {skins.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">У вас пока нет скинов</p>
              <p className="text-sm text-muted-foreground mt-2">
                Получайте скины через Duel Pass и ежедневные награды
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skins.map((skin) => (
                <Card
                  key={skin.id}
                  className={cn(
                    "p-4 transition-all hover:shadow-lg",
                    skin.is_active && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex flex-col gap-3">
                    {/* Превью скина */}
                    <div
                      className={cn(
                        "w-full aspect-square rounded-lg flex items-center justify-center text-4xl font-bold text-white relative overflow-hidden",
                        skin.skin_definitions?.metadata?.animated && "animate-pulse"
                      )}
                      style={{
                        background: skin.skin_definitions?.metadata?.color || "#6366f1",
                      }}
                    >
                      {skin.skin_definitions?.metadata?.effect === "sparkle" && (
                        <Sparkles className="absolute top-2 right-2 w-6 h-6 animate-spin" />
                      )}
                      {skin.skin_definitions?.name_ru?.charAt(0) || '?'}
                    </div>

                    {/* Информация */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{skin.skin_definitions.name_ru}</h3>
                          <p className="text-xs text-muted-foreground">
                            {skin.skin_definitions.description_ru}
                          </p>
                        </div>
                        {skin.is_active && (
                          <Badge variant="default" className="shrink-0">
                            <Check className="w-3 h-3 mr-1" />
                            Активен
                          </Badge>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className={cn("text-xs", rarityColors[skin.skin_definitions.rarity])}
                      >
                        {rarityLabels[skin.skin_definitions.rarity]}
                      </Badge>

                      {!skin.is_active && (
                        <Button
                          size="sm"
                          onClick={() => activateSkin(skin.skin_id)}
                          className="w-full"
                        >
                          Активировать
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Бейджи */}
        <TabsContent value="badges" className="space-y-4">
          {badges.length === 0 ? (
            <Card className="p-8 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">У вас пока нет бейджей</p>
              <p className="text-sm text-muted-foreground mt-2">
                Зарабатывайте бейджи за достижения и участие в сезонах
              </p>
            </Card>
          ) : (
            <>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  💡 Вы можете отображать до 3 бейджей в своем профиле
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <Card
                    key={badge.id}
                    className={cn(
                      "p-4 transition-all hover:shadow-lg",
                      badge.is_displayed && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex flex-col gap-3">
                      {/* Иконка бейджа */}
                      <div
                        className="w-full aspect-square rounded-lg flex items-center justify-center text-5xl relative"
                        style={{
                          background: `${badge.badge_definitions?.metadata?.color || "#6366f1"}20`,
                        }}
                      >
                        {badge.badge_definitions?.metadata?.icon === "trophy" && (
                          <Trophy className="w-16 h-16" style={{ color: badge.badge_definitions?.metadata?.color }} />
                        )}
                        {badge.badge_definitions?.metadata?.icon === "flame" && "🔥"}
                        {badge.badge_definitions?.metadata?.icon === "star" && "⭐"}
                        {badge.badge_definitions?.metadata?.icon === "crown" && "👑"}
                        {badge.badge_definitions?.metadata?.icon === "calendar" && "📅"}
                      </div>

                      {/* Информация */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{badge.badge_definitions?.name_ru || 'Неизвестный бейдж'}</h3>
                            <p className="text-xs text-muted-foreground">
                              {badge.badge_definitions?.description_ru || ''}
                            </p>
                          </div>
                          {badge.is_displayed && (
                            <Badge variant="default" className="shrink-0">
                              <Check className="w-3 h-3 mr-1" />
                              Показан
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", rarityColors[badge.badge_definitions?.rarity || 'common'])}
                          >
                            {rarityLabels[badge.badge_definitions?.rarity || 'common']}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {badge.badge_definitions?.category === "achievement" && "Достижение"}
                            {badge.badge_definitions?.category === "seasonal" && "Сезонный"}
                            {badge.badge_definitions?.category === "special" && "Особый"}
                          </Badge>
                        </div>

                        <Button
                          size="sm"
                          variant={badge.is_displayed ? "outline" : "default"}
                          onClick={() => toggleBadgeDisplay(badge.badge_id, badge.is_displayed)}
                          className="w-full"
                        >
                          {badge.is_displayed ? "Скрыть" : "Показать в профиле"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Стикеры */}
        <TabsContent value="stickers" className="space-y-4">
          {stickers.length === 0 ? (
            <Card className="p-8 text-center">
              <Smile className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">У вас пока нет стикеров</p>
              <p className="text-sm text-muted-foreground mt-2">
                Получайте стикеры для использования в дуэлях
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stickers.map((sticker) => (
                <Card key={sticker.id} className="p-4 transition-all hover:shadow-lg">
                  <div className="flex flex-col gap-3">
                    {/* Стикер */}
                    <div className="w-full aspect-square rounded-lg flex items-center justify-center text-6xl bg-muted/30">
                      {sticker.sticker_definitions?.metadata?.emoji || "😊"}
                    </div>

                    {/* Информация */}
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-sm">
                          {sticker.sticker_definitions?.name_ru || 'Неизвестный стикер'}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Количество: {sticker.quantity}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn("text-xs", rarityColors[sticker.sticker_definitions?.rarity || 'common'])}
                      >
                        {rarityLabels[sticker.sticker_definitions?.rarity || 'common']}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

