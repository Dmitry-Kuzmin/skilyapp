import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Sparkles, 
  Trophy, 
  Smile, 
  Lock, 
  Check, 
  Gift, 
  Crown,
  Target,
  Calendar,
  Flame,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import { useCosmeticsPreview, type PreviewSkin, type PreviewBadge, type PreviewSticker } from "@/contexts/CosmeticsPreviewContext";

interface SkinDefinition {
  id: string;
  name_ru: string;
  name_es: string;
  description_ru: string;
  description_es: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  is_premium: boolean;
  metadata: {
    color?: string;
    effect?: string;
    animated?: boolean;
  };
}

interface BadgeDefinition {
  id: string;
  name_ru: string;
  name_es: string;
  description_ru: string;
  description_es: string;
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
  name_es: string;
  description_ru: string;
  description_es: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: string;
  is_premium: boolean;
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
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/20",
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

const rarityGradients = {
  common: "from-gray-400 to-gray-600",
  rare: "from-blue-400 to-blue-600",
  epic: "from-blue-400 to-blue-600",
  legendary: "from-yellow-400 via-orange-400 to-yellow-600",
};

export function CosmeticsCatalog() {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const { previewSkin, previewBadges, previewSticker, setPreviewSkin, setPreviewBadges, setPreviewSticker } = useCosmeticsPreview();
  const [loading, setLoading] = useState(true);
  const [skins, setSkins] = useState<SkinDefinition[]>([]);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [stickers, setStickers] = useState<StickerDefinition[]>([]);
  const [ownedSkins, setOwnedSkins] = useState<Set<string>>(new Set());
  const [ownedBadges, setOwnedBadges] = useState<Set<string>>(new Set());
  const [ownedStickers, setOwnedStickers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCatalog();
    if (profileId) {
      loadOwnedItems();
    }
  }, [profileId]);

  const loadCatalog = async () => {
    try {
      setLoading(true);

      // Загружаем все определения скинов
      const { data: skinsData, error: skinsError } = await supabase
        .from("skin_definitions")
        .select("*")
        .order("rarity", { ascending: false })
        .order("is_premium", { ascending: false });

      if (skinsError) throw skinsError;
      setSkins(skinsData || []);

      // Загружаем все определения бейджей
      const { data: badgesData, error: badgesError } = await supabase
        .from("badge_definitions")
        .select("*")
        .order("rarity", { ascending: false })
        .order("is_premium", { ascending: false });

      if (badgesError) throw badgesError;
      setBadges(badgesData || []);

      // Загружаем все определения стикеров
      const { data: stickersData, error: stickersError } = await supabase
        .from("sticker_definitions")
        .select("*")
        .order("rarity", { ascending: false })
        .order("is_premium", { ascending: false });

      if (stickersError) throw stickersError;
      setStickers(stickersData || []);
    } catch (error: any) {
      console.error("Error loading catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOwnedItems = async () => {
    if (!profileId) return;

    try {
      // Загружаем владеемые скины
      const { data: userSkins } = await supabase
        .from("user_skins")
        .select("skin_id")
        .eq("user_id", profileId);

      if (userSkins) {
        setOwnedSkins(new Set(userSkins.map((s) => s.skin_id)));
      }

      // Загружаем владеемые бейджи
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", profileId);

      if (userBadges) {
        setOwnedBadges(new Set(userBadges.map((b) => b.badge_id)));
      }

      // Загружаем владеемые стикеры
      const { data: userStickers } = await supabase
        .from("user_stickers")
        .select("sticker_id")
        .eq("user_id", profileId);

      if (userStickers) {
        setOwnedStickers(new Set(userStickers.map((s) => s.sticker_id)));
      }
    } catch (error) {
      console.error("Error loading owned items:", error);
    }
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

  const handleSkinPreview = (skin: SkinDefinition) => {
    setPreviewSkin(skin as PreviewSkin);
    // Сбрасываем другие превью при переключении вкладок
    setPreviewBadges([]);
    setPreviewSticker(null);
  };

  const handleBadgePreview = (badge: BadgeDefinition) => {
    setPreviewBadges((prev) => {
      // Если бейдж уже выбран, убираем его, иначе добавляем (максимум 3)
      const isSelected = prev.some((b) => b.id === badge.id);
      if (isSelected) {
        return prev.filter((b) => b.id !== badge.id);
      }
      if (prev.length >= 3) {
        // Убираем первый, добавляем новый
        return [...prev.slice(1), badge as PreviewBadge];
      }
      return [...prev, badge as PreviewBadge];
    });
    // Сбрасываем другие превью
    setPreviewSkin(null);
    setPreviewSticker(null);
  };

  const handleStickerPreview = (sticker: StickerDefinition) => {
    setPreviewSticker((prev) => (prev?.id === sticker.id ? null : (sticker as PreviewSticker)));
    // Сбрасываем другие превью
    setPreviewSkin(null);
    setPreviewBadges([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Каталог косметики</h2>
        <p className="text-sm text-muted-foreground">
          Кликните на любой элемент, чтобы примерить его на ваш аватар в хедере в реальном времени. Получайте косметику через Duel Pass, достижения и Premium подписку!
        </p>
        {(previewSkin || previewBadges.length > 0 || previewSticker) && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary">
            <Eye className="w-3 h-3" />
            <span>Превью активно — смотрите на аватар в хедере</span>
          </div>
        )}
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
        <TabsContent value="skins" className="space-y-4 mt-4">
          {skins.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Скины скоро появятся</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skins.map((skin, index) => {
              const isOwned = ownedSkins.has(skin.id);
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
                      "p-4 transition-all hover:shadow-lg relative overflow-hidden group",
                      rarity.border,
                      !isOwned && "opacity-75"
                    )}
                  >
                    {/* Градиентный фон для легендарных */}
                    {skin.rarity === "legendary" && (
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-yellow-500/10 opacity-50" />
                    )}

                    {/* Статус владения */}
                    {isOwned && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-green-500 text-white border-none">
                          <Check className="w-3 h-3 mr-1" />
                          Получено
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 flex flex-col gap-3">
                      {/* Превью скина с улучшенным дизайном */}
                      <motion.div
                        className={cn(
                          "w-full aspect-square rounded-xl flex items-center justify-center text-6xl font-extrabold text-white relative overflow-hidden group/skin",
                          "shadow-2xl",
                          skin.rarity === "legendary" && "shadow-yellow-500/50",
                          skin.rarity === "epic" && "shadow-blue-500/50",
                          skin.rarity === "rare" && "shadow-blue-500/50",
                          skin.metadata.animated && "animate-pulse"
                        )}
                        style={{
                          background: skin.metadata.color
                            ? `radial-gradient(circle at 30% 30%, ${skin.metadata.color}ff, ${skin.metadata.color}cc 40%, ${skin.metadata.color}88 100%)`
                            : "radial-gradient(circle at 30% 30%, #6366f1ff, #8b5cf6cc 40%, #6366f188 100%)",
                        }}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {/* Эффект свечения */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover/skin:opacity-100 transition-opacity duration-500" />
                        
                        {/* Частицы для легендарных */}
                        {skin.rarity === "legendary" && (
                          <>
                            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                            <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                            <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-ping" style={{ animationDelay: '0.7s' }} />
                          </>
                        )}
                        
                        {/* Эффекты */}
                        {skin.metadata.effect === "sparkle" && (
                          <>
                            <Sparkles className="absolute top-3 right-3 w-8 h-8 animate-spin text-white/90 drop-shadow-lg" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.1)_100%)] animate-pulse" />
                          </>
                        )}
                        {skin.metadata.effect === "fire" && (
                          <>
                            <Flame className="absolute top-3 right-3 w-8 h-8 text-orange-400 animate-bounce drop-shadow-lg" />
                            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-orange-500/30 to-transparent" />
                          </>
                        )}
                        {skin.metadata.effect === "shine" && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                        )}
                        
                        {/* Буква с тенью */}
                        <span className="relative z-10 drop-shadow-2xl">
                          {skin.name_ru.charAt(0).toUpperCase()}
                        </span>
                        
                        {/* Градиентная рамка */}
                        <div className={cn(
                          "absolute inset-0 rounded-xl border-2 opacity-50",
                          skin.rarity === "legendary" && "border-yellow-400/50",
                          skin.rarity === "epic" && "border-blue-400/50",
                          skin.rarity === "rare" && "border-blue-400/50",
                          skin.rarity === "common" && "border-gray-400/50"
                        )} />
                      </motion.div>

                      {/* Информация */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{skin.name_ru}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {skin.description_ru}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", rarity.text, rarity.border, rarity.bg)}
                          >
                            {rarityLabels[skin.rarity]}
                          </Badge>
                          {skin.is_premium && (
                            <Badge className="gradient-gold border-none text-xs px-2 py-0">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>

                        {/* Способ получения */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                          <obtainMethod.icon className={cn("w-4 h-4", obtainMethod.color)} />
                          <span>{obtainMethod.text}</span>
                        </div>

                        <div className="flex gap-2 mt-2">
                          {!isOwned && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (skin.is_premium && !isPremium) {
                                  navigate("/premium");
                                } else {
                                  navigate("/duel-pass");
                                }
                              }}
                            >
                              <Lock className="w-3 h-3 mr-2" />
                              Как получить?
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={previewSkin?.id === skin.id ? "default" : "secondary"}
                            className={cn(
                              "flex-1",
                              previewSkin?.id === skin.id && "bg-primary"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSkinPreview(skin);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-2" />
                            {previewSkin?.id === skin.id ? "Выбрано" : "Примерить"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
            </div>
          )}
        </TabsContent>

        {/* Бейджи */}
        <TabsContent value="badges" className="space-y-4 mt-4">
          {badges.length === 0 ? (
            <Card className="p-8 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Бейджи скоро появятся</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge, index) => {
              const isOwned = ownedBadges.has(badge.id);
              const rarity = rarityColors[badge.rarity];
              const obtainMethod = getObtainMethod(badge);

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "p-4 transition-all hover:shadow-lg relative overflow-hidden group",
                      rarity.border,
                      !isOwned && "opacity-75"
                    )}
                  >
                    {/* Градиентный фон для легендарных */}
                    {badge.rarity === "legendary" && (
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-yellow-500/10 opacity-50" />
                    )}

                    {/* Статус владения */}
                    {isOwned && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-green-500 text-white border-none">
                          <Check className="w-3 h-3 mr-1" />
                          Получено
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 flex flex-col gap-3">
                      {/* Иконка бейджа с улучшенным дизайном */}
                      <motion.div
                        className={cn(
                          "w-full aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden group/badge",
                          "shadow-xl",
                          badge.rarity === "legendary" && "bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-yellow-500/20 shadow-yellow-500/30",
                          badge.rarity === "epic" && "bg-gradient-to-br from-blue-500/20 via-pink-500/20 to-blue-500/20 shadow-blue-500/30",
                          badge.rarity === "rare" && "bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-blue-500/20 shadow-blue-500/30",
                          badge.rarity === "common" && "bg-gradient-to-br from-gray-500/20 via-gray-400/20 to-gray-500/20"
                        )}
                        style={{
                          background: badge.metadata.color
                            ? `radial-gradient(circle at center, ${badge.metadata.color}30, ${badge.metadata.color}10)`
                            : undefined,
                        }}
                        whileHover={{ scale: 1.08, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {/* Металлический эффект */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover/badge:opacity-100 transition-opacity duration-500 rounded-2xl" />
                        
                        {/* Иконка с градиентом */}
                        <div className="relative z-10">
                          {badge.metadata.icon === "trophy" && (
                            <Trophy
                              className={cn(
                                "w-24 h-24 drop-shadow-2xl",
                                badge.rarity === "legendary" && "text-yellow-400",
                                badge.rarity === "epic" && "text-blue-400",
                                badge.rarity === "rare" && "text-blue-400",
                                badge.rarity === "common" && "text-gray-400"
                              )}
                              style={{
                                filter: badge.metadata.color ? `drop-shadow(0 0 8px ${badge.metadata.color})` : undefined,
                              }}
                            />
                          )}
                          {badge.metadata.icon === "flame" && (
                            <div className="text-7xl drop-shadow-2xl filter brightness-110">
                              🔥
                            </div>
                          )}
                          {badge.metadata.icon === "star" && (
                            <div className="text-7xl drop-shadow-2xl filter brightness-110">
                              ⭐
                            </div>
                          )}
                          {badge.metadata.icon === "crown" && (
                            <div className="text-7xl drop-shadow-2xl filter brightness-110">
                              👑
                            </div>
                          )}
                          {badge.metadata.icon === "calendar" && (
                            <div className="text-7xl drop-shadow-2xl filter brightness-110">
                              📅
                            </div>
                          )}
                        </div>
                        
                        {/* Анимация для анимированных бейджей */}
                        {badge.metadata.animated && (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer rounded-2xl" />
                            <div className="absolute inset-0 animate-pulse bg-current opacity-10 rounded-2xl" />
                          </>
                        )}
                        
                        {/* Свечение вокруг бейджа */}
                        <div className={cn(
                          "absolute -inset-1 rounded-2xl opacity-0 group-hover/badge:opacity-100 transition-opacity duration-500 blur-sm",
                          badge.rarity === "legendary" && "bg-yellow-400",
                          badge.rarity === "epic" && "bg-blue-400",
                          badge.rarity === "rare" && "bg-blue-400"
                        )} />
                      </motion.div>

                      {/* Информация */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{badge.name_ru}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {badge.description_ru}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", rarity.text, rarity.border, rarity.bg)}
                          >
                            {rarityLabels[badge.rarity]}
                          </Badge>
                          {badge.category === "achievement" && (
                            <Badge variant="outline" className="text-xs">
                              Достижение
                            </Badge>
                          )}
                          {badge.category === "seasonal" && (
                            <Badge variant="outline" className="text-xs">
                              Сезонный
                            </Badge>
                          )}
                          {badge.is_premium && (
                            <Badge className="gradient-gold border-none text-xs px-2 py-0">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>

                        {/* Способ получения */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                          <obtainMethod.icon className={cn("w-4 h-4", obtainMethod.color)} />
                          <span>{obtainMethod.text}</span>
                        </div>

                        <div className="flex gap-2 mt-2">
                          {!isOwned && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (badge.is_premium && !isPremium) {
                                  navigate("/premium");
                                } else if (badge.category === "seasonal") {
                                  navigate("/duel-pass");
                                } else {
                                  navigate("/achievements");
                                }
                              }}
                            >
                              <Lock className="w-3 h-3 mr-2" />
                              Как получить?
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={previewBadges.some((b) => b.id === badge.id) ? "default" : "secondary"}
                            className={cn(
                              "flex-1",
                              previewBadges.some((b) => b.id === badge.id) && "bg-primary"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBadgePreview(badge);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-2" />
                            {previewBadges.some((b) => b.id === badge.id) ? "Убрать" : "Примерить"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
            </div>
          )}
        </TabsContent>

        {/* Стикеры */}
        <TabsContent value="stickers" className="space-y-4 mt-4">
          {stickers.length === 0 ? (
            <Card className="p-8 text-center">
              <Smile className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Стикеры скоро появятся</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stickers.map((sticker, index) => {
              const isOwned = ownedStickers.has(sticker.id);
              const rarity = rarityColors[sticker.rarity];
              const obtainMethod = getObtainMethod(sticker);

              return (
                <motion.div
                  key={sticker.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className={cn(
                      "p-4 transition-all hover:shadow-lg relative overflow-hidden group cursor-pointer",
                      rarity.border,
                      !isOwned && "opacity-75",
                      previewSticker?.id === sticker.id && "ring-2 ring-primary shadow-lg scale-[1.02]"
                    )}
                    onClick={() => handleStickerPreview(sticker)}
                  >
                    {/* Статус владения */}
                    {isOwned && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-green-500 text-white border-none text-xs">
                          <Check className="w-2 h-2 mr-1" />
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 flex flex-col gap-3">
                      {/* Стикер с улучшенным дизайном */}
                      <motion.div
                        className={cn(
                          "w-full aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden group/sticker",
                          "shadow-lg",
                          sticker.rarity === "legendary" && "bg-gradient-to-br from-yellow-400/30 via-orange-400/30 to-yellow-400/30 shadow-yellow-500/40",
                          sticker.rarity === "epic" && "bg-gradient-to-br from-blue-400/30 via-pink-400/30 to-blue-400/30 shadow-blue-500/40",
                          sticker.rarity === "rare" && "bg-gradient-to-br from-blue-400/30 via-cyan-400/30 to-blue-400/30 shadow-blue-500/40",
                          sticker.rarity === "common" && "bg-gradient-to-br from-gray-300/30 via-gray-200/30 to-gray-300/30"
                        )}
                        whileHover={{ scale: 1.15, rotate: 12 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {/* Градиентный фон */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover/sticker:opacity-100 transition-opacity duration-500" />
                        
                        {/* Эмодзи с эффектами */}
                        <div className="relative z-10 text-8xl drop-shadow-2xl filter brightness-110 contrast-110">
                          {sticker.metadata.emoji || "😊"}
                        </div>
                        
                        {/* Эффект частиц для редких стикеров */}
                        {sticker.rarity !== "common" && (
                          <>
                            <div className="absolute top-2 left-2 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '0s' }} />
                            <div className="absolute bottom-2 right-2 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '0.3s' }} />
                          </>
                        )}
                        
                        {/* Свечение для легендарных */}
                        {sticker.rarity === "legendary" && (
                          <div className="absolute -inset-1 bg-yellow-400/30 rounded-2xl blur-md opacity-0 group-hover/sticker:opacity-100 transition-opacity duration-500" />
                        )}
                        
                        {/* Рамка */}
                        <div className={cn(
                          "absolute inset-0 rounded-2xl border-2 opacity-30",
                          sticker.rarity === "legendary" && "border-yellow-400",
                          sticker.rarity === "epic" && "border-blue-400",
                          sticker.rarity === "rare" && "border-blue-400",
                          sticker.rarity === "common" && "border-gray-400"
                        )} />
                      </motion.div>

                      {/* Информация */}
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-sm text-center">
                            {sticker.name_ru}
                          </h3>
                        </div>

                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", rarity.text, rarity.border, rarity.bg)}
                          >
                            {rarityLabels[sticker.rarity]}
                          </Badge>
                          {sticker.is_premium && (
                            <Badge className="gradient-gold border-none text-xs px-1.5 py-0">
                              <Crown className="w-2 h-2 mr-1" />
                            </Badge>
                          )}
                        </div>

                        {/* Способ получения */}
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                          <obtainMethod.icon className={cn("w-3 h-3", obtainMethod.color)} />
                          <span className="text-[10px]">{obtainMethod.text}</span>
                        </div>

                        {/* Кнопка примерки */}
                        <Button
                          size="sm"
                          variant={previewSticker?.id === sticker.id ? "default" : "secondary"}
                          className={cn(
                            "w-full mt-2",
                            previewSticker?.id === sticker.id && "bg-primary"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStickerPreview(sticker);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-2" />
                          {previewSticker?.id === sticker.id ? "Убрать" : "Примерить"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

