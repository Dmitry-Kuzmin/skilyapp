import { useState, useMemo } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Sparkles,
  Trophy,
  Smile,
  Check,
  Lock,
  Crown,
  Flame,
  CheckCircle,
  Eye,
  Gift,
  Calendar,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "@/components/optimized/Motion";
import { useCosmeticsPreview, type PreviewSkin, type PreviewBadge, type PreviewSticker } from "@/contexts/CosmeticsPreviewContext";
import { useCosmeticsDefinitions, useCosmeticsInventory, useActivateSkin, useToggleBadgeDisplay } from "@/hooks/useCosmetics";

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

const rarityColors = {
  common: {
    bg: "bg-gray-500/10",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-500/30",
    glow: "shadow-gray-500/20",
  },
  rare: {
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20",
  },
  epic: {
    bg: "bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/20",
  },
  legendary: {
    bg: "bg-gradient-to-br from-yellow-500/20 to-orange-500/20",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-500/50",
    glow: "shadow-yellow-500/30",
  },
};

const rarityLabels = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

// Helper to generate unique patterns
const getPatternStyle = (index: number) => {
  const patterns = [
    `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.2' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1h2v2H1V1zm4 0h2v2H5V1zm4 0h2v2H9V1z' fill='%23ffffff' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0V0zm10 17l-7-7h14l-7 7z' fill='%23ffffff' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z' fill='%23ffffff' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`
  ];
  return {
    backgroundImage: patterns[index % patterns.length],
    transform: `rotate(${index * 15}deg)`
  };
};

export function CosmeticsInventory() {
  const { profileId } = useUserContext();
  const { previewSkin, previewBadges, previewSticker, setPreviewSkin, setPreviewBadges, setPreviewSticker } = useCosmeticsPreview();
  
  // ОПТИМИЗАЦИЯ: Используем React Query хуки вместо прямых запросов
  const { data: definitions, isLoading: definitionsLoading } = useCosmeticsDefinitions();
  const { data: inventory, isLoading: inventoryLoading } = useCosmeticsInventory(profileId);
  const activateSkinMutation = useActivateSkin();
  const toggleBadgeMutation = useToggleBadgeDisplay();

  const loading = definitionsLoading || inventoryLoading;

  // ОПТИМИЗАЦИЯ: Вычисляем производные данные через useMemo
  const allSkins = useMemo(() => definitions?.skins || [], [definitions]);
  const allBadges = useMemo(() => definitions?.badges || [], [definitions]);
  const allStickers = useMemo(() => definitions?.stickers || [], [definitions]);

  const ownedSkins = useMemo(() => {
    return new Set(inventory?.skins.map(s => s.skin_id) || []);
  }, [inventory]);

  const activeSkinId = useMemo(() => {
    return inventory?.skins.find(s => s.is_active)?.skin_id || null;
  }, [inventory]);

  const ownedBadges = useMemo(() => {
    return new Set(inventory?.badges.map(b => b.badge_id) || []);
  }, [inventory]);

  const displayedBadgeIds = useMemo(() => {
    return new Set(inventory?.badges.filter(b => b.is_displayed).map(b => b.badge_id) || []);
  }, [inventory]);

  const ownedStickers = useMemo(() => {
    return new Map(inventory?.stickers.map(s => [s.sticker_id, s.quantity]) || []);
  }, [inventory]);

  const activateSkin = async (skinId: string) => {
    if (!profileId) return;

    try {
      await activateSkinMutation.mutateAsync({
        profileId,
        skinId,
      });

      toast.success("Скин активирован!");
    } catch (error: any) {
      console.error("Error activating skin:", error);
      toast.error("Ошибка активации скина");
    }
  };

  const toggleBadgeDisplay = async (badgeId: string, currentDisplay: boolean) => {
    if (!profileId) return;

    try {
      await toggleBadgeMutation.mutateAsync({
        profileId,
        badgeId,
        display: !currentDisplay,
      });

      toast.success(currentDisplay ? "Бейдж скрыт" : "Бейдж отображается в профиле");
    } catch (error: any) {
      console.error("Error toggling badge:", error);
      toast.error("Ошибка");
    }
  };

  const handleSkinPreview = (skin: SkinDefinition) => {
    setPreviewSkin(skin as PreviewSkin);
    setPreviewBadges([]);
    setPreviewSticker(null);
  };

  const getObtainMethod = (item: SkinDefinition | BadgeDefinition | StickerDefinition) => {
    if (item.is_premium) {
      return { icon: Crown, text: "Premium", color: "text-yellow-500" };
    }

    if ('category' in item && item.category === 'seasonal') {
      return { icon: Calendar, text: "Duel Pass", color: "text-blue-500" };
    }

    if ('category' in item && item.category === 'achievement') {
      return { icon: Target, text: "Достижение", color: "text-blue-500" };
    }

    return { icon: Gift, text: "Награда", color: "text-green-500" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Моя Коллекция
          </h2>
          <p className="text-muted-foreground mt-1">
            Управляйте своими уникальными предметами и настраивайте профиль
          </p>
        </div>

        {(previewSkin || previewBadges.length > 0 || previewSticker) && (
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm text-primary animate-pulse">
            <Eye className="w-4 h-4" />
            <span>Режим предпросмотра активен</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="skins" className="w-full">
        <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="skins" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Скины</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{ownedSkins.size}/{allSkins.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Бейджи</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{ownedBadges.size}/{allBadges.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stickers" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <Smile className="w-4 h-4" />
            <span className="hidden sm:inline">Стикеры</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">{ownedStickers.size}/{allStickers.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Скины */}
        <TabsContent value="skins" className="space-y-6 mt-6">
          <div className="bg-card/50 border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Прогресс коллекции скинов</span>
              <span className="font-medium">{ownedSkins.size} / {allSkins.length}</span>
            </div>
            <Progress value={(ownedSkins.size / allSkins.length) * 100} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {allSkins.map((skin, index) => {
              const isOwned = ownedSkins.has(skin.id);
              const isActive = activeSkinId === skin.id;
              const rarity = rarityColors[skin.rarity];
              const obtainMethod = getObtainMethod(skin);

              return (
                <motion.div
                  key={skin.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "p-3 transition-all hover:shadow-xl relative overflow-hidden group border-2 flex flex-col items-center text-center",
                      rarity.border,
                      isActive ? "ring-2 ring-primary border-primary shadow-lg scale-[1.02]" : "hover:scale-[1.02]",
                      !isOwned && "opacity-80 grayscale-[0.3]"
                    )}
                  >
                    {/* Градиентный фон для легендарных */}
                    {skin.rarity === "legendary" && (
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-yellow-500/10 opacity-50" />
                    )}

                    {/* Статус активен */}
                    {isActive && (
                      <div className="absolute top-2 right-2 z-20">
                        <Badge className="bg-primary text-primary-foreground shadow-lg animate-in zoom-in h-5 px-1.5 text-[10px]">
                          <Check className="w-3 h-3 mr-1" />
                          Активен
                        </Badge>
                      </div>
                    )}

                    {/* Замок если не куплено */}
                    {!isOwned && (
                      <div className="absolute top-2 right-2 z-20">
                        <div className="bg-background/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    )}

                    <div className="relative z-10 flex flex-col gap-3 w-full items-center">
                      {/* Превью скина (Аватар стиль) */}
                      <motion.div
                        className={cn(
                          "w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold text-white relative overflow-hidden shadow-2xl ring-4 ring-offset-2 ring-offset-background",
                          skin.rarity === "legendary" && "shadow-yellow-500/40 ring-yellow-500/50",
                          skin.rarity === "epic" && "shadow-purple-500/40 ring-purple-500/50",
                          skin.rarity === "rare" && "shadow-blue-500/40 ring-blue-500/50",
                          skin.rarity === "common" && "shadow-gray-500/20 ring-gray-200/50 dark:ring-gray-700/50",
                          skin.metadata?.animated && "animate-pulse"
                        )}
                        style={{
                          background: skin.metadata?.color
                            ? `radial-gradient(circle at 30% 30%, ${skin.metadata.color}ff, ${skin.metadata.color}cc 40%, ${skin.metadata.color}88 100%)`
                            : "radial-gradient(circle at 30% 30%, #6366f1ff, #8b5cf6cc 40%, #6366f188 100%)",
                        }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {/* Генерация уникального узора на основе ID/Имени */}
                        <div
                          className="absolute inset-0 opacity-30 mix-blend-overlay"
                          style={getPatternStyle(index)}
                        />

                        {/* Эффекты */}
                        {skin.metadata?.effect === "sparkle" && (
                          <Sparkles className="absolute top-2 right-2 w-5 h-5 text-white/90 animate-spin-slow" />
                        )}
                        {skin.metadata?.effect === "fire" && (
                          <Flame className="absolute bottom-2 right-2 w-5 h-5 text-orange-300 animate-bounce" />
                        )}

                        <span className="relative z-10 drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300 text-4xl">
                          {skin.metadata?.emoji || skin.name_ru?.charAt(0).toUpperCase()}
                        </span>
                      </motion.div>

                      {/* Информация */}
                      <div className="space-y-2 w-full">
                        <div>
                          <h3 className="font-bold text-sm truncate">{skin.name_ru}</h3>
                          <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5 py-0 h-5", rarity.text, rarity.border, rarity.bg)}
                            >
                              {rarityLabels[skin.rarity]}
                            </Badge>
                            {skin.is_premium && (
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 border-none text-[10px] px-1.5 py-0 h-5 text-white">
                                <Crown className="w-2.5 h-2.5 mr-0.5" />
                                PRO
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Способ получения для некупленных */}
                        {!isOwned && (
                          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                            <obtainMethod.icon className={cn("w-3 h-3 flex-shrink-0", obtainMethod.color)} />
                            <span className="truncate">{obtainMethod.text}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {isOwned ? (
                            !isActive ? (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => activateSkin(skin.id)}
                                className="w-full h-8 text-xs"
                              >
                                Надеть
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-8 text-xs border-primary text-primary bg-primary/5"
                                disabled
                              >
                                Надето
                              </Button>
                            )
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-8 text-xs opacity-50 cursor-not-allowed"
                              disabled
                            >
                              Закрыто
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={previewSkin?.id === skin.id ? "secondary" : "ghost"}
                            className="w-full h-8 text-xs"
                            onClick={() => handleSkinPreview(skin)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Вид
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Бейджи */}
        <TabsContent value="badges" className="space-y-6 mt-6">
          <div className="bg-card/50 border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Прогресс коллекции бейджей</span>
              <span className="font-medium">{ownedBadges.size} / {allBadges.length}</span>
            </div>
            <Progress value={(ownedBadges.size / allBadges.length) * 100} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {allBadges.map((badge, index) => {
              const isOwned = ownedBadges.has(badge.id);
              const isDisplayed = displayedBadgeIds.has(badge.id);
              const rarity = rarityColors[badge.rarity || 'common'];
              const obtainMethod = getObtainMethod(badge);

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "p-3 transition-all hover:shadow-lg relative overflow-hidden group border-2",
                      rarity.border,
                      isDisplayed ? "ring-2 ring-primary border-primary bg-primary/5" : "",
                      !isOwned && "opacity-80 grayscale-[0.3]"
                    )}
                  >
                    {isDisplayed && (
                      <div className="absolute top-2 right-2 z-20">
                        <Badge className="bg-primary h-5 px-1.5 text-[10px]">
                          <Check className="w-3 h-3 mr-1" />
                          Показан
                        </Badge>
                      </div>
                    )}

                    {!isOwned && (
                      <div className="absolute top-2 right-2 z-20">
                        <div className="bg-background/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <div
                        className="w-full aspect-square rounded-xl flex items-center justify-center text-5xl relative bg-muted/30 group-hover:bg-muted/50 transition-colors"
                        style={{
                          background: `${badge.metadata?.color || "#6366f1"}15`,
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          {badge.metadata?.icon === "trophy" && (
                            <Trophy className="w-16 h-16 drop-shadow-md" style={{ color: badge.metadata?.color }} />
                          )}
                          {badge.metadata?.icon === "flame" && "🔥"}
                          {badge.metadata?.icon === "star" && "⭐"}
                          {badge.metadata?.icon === "crown" && "👑"}
                          {badge.metadata?.icon === "calendar" && "📅"}
                        </motion.div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <h3 className="font-bold text-sm truncate">{badge.name_ru}</h3>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0 h-5 mt-1", rarity.text, rarity.border, rarity.bg)}
                          >
                            {rarityLabels[badge.rarity || 'common']}
                          </Badge>
                        </div>

                        {!isOwned && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <obtainMethod.icon className={cn("w-3 h-3 flex-shrink-0", obtainMethod.color)} />
                            <span className="truncate">{obtainMethod.text}</span>
                          </div>
                        )}

                        {isOwned ? (
                          <Button
                            size="sm"
                            variant={isDisplayed ? "outline" : "default"}
                            onClick={() => toggleBadgeDisplay(badge.id, isDisplayed)}
                            className={cn(
                              "w-full h-8 text-xs",
                              isDisplayed && "border-primary text-primary hover:bg-primary/10"
                            )}
                          >
                            {isDisplayed ? "Скрыть" : "Показать"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs opacity-50 cursor-not-allowed"
                            disabled
                          >
                            Закрыто
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Стикеры */}
        <TabsContent value="stickers" className="space-y-6 mt-6">
          <div className="bg-card/50 border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Прогресс коллекции стикеров</span>
              <span className="font-medium">{ownedStickers.size} / {allStickers.length}</span>
            </div>
            <Progress value={(ownedStickers.size / allStickers.length) * 100} className="h-2" />
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {allStickers.map((sticker, index) => {
              const quantity = ownedStickers.get(sticker.id) || 0;
              const isOwned = quantity > 0;
              const rarity = rarityColors[sticker.rarity || 'common'];

              return (
                <motion.div
                  key={sticker.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className={cn(
                    "p-3 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group border-2",
                    rarity.border,
                    !isOwned && "opacity-70 grayscale-[0.5]"
                  )}>
                    <div className="flex flex-col gap-2 items-center">
                      <div className="w-full aspect-square rounded-xl flex items-center justify-center text-5xl bg-muted/30 group-hover:bg-muted/50 transition-colors relative">
                        {!isOwned && (
                          <div className="absolute top-1 right-1">
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          {sticker.metadata?.emoji || "😊"}
                        </motion.div>
                      </div>

                      <div className="text-center w-full">
                        <div className="flex justify-center mb-1">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0 h-4", rarity.text, rarity.border, rarity.bg)}
                          >
                            {rarityLabels[sticker.rarity || 'common']}
                          </Badge>
                        </div>
                        {isOwned ? (
                          <p className="text-xs text-muted-foreground font-medium">
                            x{quantity}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Закрыто
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
