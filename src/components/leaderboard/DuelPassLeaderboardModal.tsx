import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Crown, Sparkles, Award, Star, TrendingUp, Search, Globe, Users, MapPin, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { RankBadge, RankIcon, RankFrame, getRankFromLevel, type RankType } from "@/components/ranking/RankBadge";
import { motion } from "framer-motion";
import { LeaderboardRewardsModal } from "@/components/leaderboard/LeaderboardRewardsModal";
import { useModalRoute } from "@/hooks/useModalRoute";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  user_id: string;
  duel_pass_level: number;
  duel_pass_xp: number;
  season_points?: number; // SP (Season Points) - приоритет для отображения
  rank?: string;
  profile?: {
    first_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
    avatar_url?: string | null;
  };
  active_skin?: {
    skin_id: string;
    skin_definitions?: {
      name_ru: string;
      rarity: string;
      metadata?: any;
    };
  } | null;
  displayed_badges?: Array<{
    badge_id: string;
    display_order: number;
    badge_definitions?: {
      name_ru: string;
      rarity: string;
      metadata?: any;
    };
  }>;
  claimed_rewards_count?: number;
  position?: number; // Для соседей
}

interface UserPositionData {
  position: number;
  total_players: number;
  user_data: {
    user_id: string;
    duel_pass_level: number;
    duel_pass_xp: number;
  };
  neighbors: LeaderboardEntry[];
}

interface PaginationData {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

const rarityColors = {
  common: "bg-gray-500/20 text-gray-700 border-gray-500/30",
  rare: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  legendary: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
};

type FilterType = "global" | "friends" | "country";

// Вспомогательная функция для рендеринга аватара с косметикой
const renderAvatarWithCosmetics = (
  photoUrl: string | null | undefined,
  name: string,
  skin: any,
  badges: any[],
  size: "sm" | "md" | "lg" = "md",
  className?: string
) => {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28",
    lg: "w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36"
  };

  const skinRarity = skin?.rarity || "common";
  const skinMetadata = skin?.metadata || {};
  const skinColor = skinMetadata.color || "#6366f1";

  return (
    <div className="relative">
      <Avatar className={cn(
        sizeClasses[size],
        "border-2 shadow-md transition-all relative",
        skinRarity === "legendary" && "border-yellow-400/60 ring-2 ring-yellow-300/30",
        skinRarity === "epic" && "border-blue-400/60 ring-2 ring-blue-300/30",
        skinRarity === "rare" && "border-blue-400/40 ring-1 ring-blue-300/20",
        !skin && "border-slate-400/60",
        className
      )}>
        {photoUrl ? (
          <AvatarImage
            src={photoUrl}
            alt={name}
            className={cn(
              skinMetadata.animated && "animate-pulse"
            )}
            onError={(e) => {
              console.warn('[DuelPassLeaderboard] Avatar image failed to load:', photoUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <AvatarFallback 
          className={cn(
            "text-white font-bold relative z-10 overflow-hidden",
            size === "sm" && "text-sm",
            size === "md" && "text-2xl md:text-3xl",
            size === "lg" && "text-3xl md:text-4xl",
            skinMetadata.animated && "animate-pulse"
          )}
          style={
            skin
              ? {
                  background: `radial-gradient(circle at 30% 30%, ${skinColor}ff, ${skinColor}cc 40%, ${skinColor}88 100%)`,
                }
              : undefined
          }
        >
          {/* Эффекты скина */}
          {skinMetadata.effect === "sparkle" && (
            <Sparkles className="absolute top-0.5 right-0.5 w-3 h-3 animate-spin text-white/90" />
          )}
          {skinMetadata.effect === "fire" && (
            <Flame className="absolute top-0.5 right-0.5 w-3 h-3 text-orange-400 animate-bounce" />
          )}
          {skinMetadata.effect === "shine" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer rounded-full" />
          )}
          {skinRarity === "legendary" && (
            <>
              <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
              <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
            </>
          )}
          <span className="relative z-10">{name.slice(0, 1).toUpperCase()}</span>
        </AvatarFallback>
      </Avatar>
      
      {/* Overlay эффекты скина поверх фото */}
      {skin && photoUrl && (
        <div className="absolute inset-0 rounded-full pointer-events-none z-20">
          {skinMetadata.effect === "sparkle" && (
            <>
              <Sparkles className="absolute top-0.5 right-0.5 w-3 h-3 animate-spin text-white/90 drop-shadow-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.1)_100%)] animate-pulse rounded-full" />
            </>
          )}
          {skinMetadata.effect === "fire" && (
            <>
              <Flame className="absolute top-0.5 right-0.5 w-3 h-3 text-orange-400 animate-bounce drop-shadow-lg" />
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-orange-500/30 to-transparent rounded-full" />
            </>
          )}
          {skinMetadata.effect === "shine" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer rounded-full" />
          )}
          {skinRarity === "legendary" && (
            <>
              <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
              <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
            </>
          )}
          <div
            className={cn(
              "absolute inset-0 rounded-full border-2 opacity-60",
              skinRarity === "legendary" && "border-yellow-400/60",
              skinRarity === "epic" && "border-blue-400/60",
              skinRarity === "rare" && "border-blue-400/40",
              skinRarity === "common" && "border-gray-400/40"
            )}
          />
        </div>
      )}
      
      {/* Бейджи рядом с аватаром (максимум 3) */}
      {badges.length > 0 && (
        <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 z-30">
          {badges.slice(0, 3).map((badge: any, index: number) => {
            const badgeDef = badge.badge_definitions || {};
            const badgeRarity = badgeDef.rarity || "common";
            const badgeMetadata = badgeDef.metadata || {};
            return (
              <div
                key={badge.badge_id || index}
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[8px] shadow-lg",
                  badgeRarity === "legendary" && "bg-gradient-to-br from-yellow-500/80 via-orange-500/80 to-yellow-500/80 ring-1 ring-yellow-400/50",
                  badgeRarity === "epic" && "bg-gradient-to-br from-blue-500/80 via-pink-500/80 to-blue-500/80 ring-1 ring-blue-400/50",
                  badgeRarity === "rare" && "bg-gradient-to-br from-blue-500/80 via-cyan-500/80 to-blue-500/80 ring-1 ring-blue-400/30",
                  badgeRarity === "common" && "bg-gradient-to-br from-gray-500/80 via-gray-400/80 to-gray-500/80",
                  badgeMetadata.animated && "animate-bounce"
                )}
                style={{
                  color: badgeMetadata.color || "#6366f1",
                }}
                title={badgeDef.name_ru}
              >
                {badgeMetadata.icon === "trophy" && <Trophy className="w-2.5 h-2.5" />}
                {badgeMetadata.icon === "flame" && "🔥"}
                {badgeMetadata.icon === "star" && "⭐"}
                {badgeMetadata.icon === "crown" && "👑"}
                {badgeMetadata.icon === "calendar" && "📅"}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export function DuelPassLeaderboardModal() {
  const { profileId, user } = useUserContext();
  const { isOpen, closeModal } = useModalRoute('duel-pass-leaderboard');
  const { openModal: openHallOfFameModal } = useModalRoute('hall-of-fame');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [userPositionData, setUserPositionData] = useState<UserPositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0,
  });
  const [showMyPosition, setShowMyPosition] = useState(false);

  // Загрузка топ-10
  const loadTopLeaderboard = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data: activeSeason } = await supabase
        .from("duel_pass_seasons")
        .select("id")
        .eq("is_active", true)
        .order("season_number", { ascending: false })
        .limit(1)
        .single();

      if (activeSeason) {
        setActiveSeasonId(activeSeason.id);
      }

      const { data, error } = await supabase.functions.invoke("duel-pass-leaderboard", {
        body: {
          type: "top",
          limit: 10,
          page,
          page_size: pagination.page_size,
          filter_type: filterType,
          user_id: filterType === "friends" ? profileId : null,
          filter_value: filterType === "country" ? user?.language_code || null : null,
        },
      });

      if (error) {
        throw error;
      }

      setLeaders(data?.leaderboard || []);
      if (data?.pagination) {
        setPagination(data.pagination);
      }
    } catch (err: any) {
      console.error("[DuelPassLeaderboard] Error:", err);
      setError("Не удалось загрузить рейтинг. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  // Загрузка позиции пользователя
  const loadUserPosition = async () => {
    if (!profileId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("duel-pass-leaderboard", {
        body: {
          type: "user_position",
          user_id: profileId,
          neighbors_count: 5,
          filter_type: filterType,
          filter_value: filterType === "country" ? user?.language_code || null : null,
        },
      });

      if (error) {
        throw error;
      }

      setUserPositionData(data);
      setShowMyPosition(true);
    } catch (err: any) {
      console.error("[DuelPassLeaderboard] Error loading user position:", err);
      setError("Не удалось загрузить вашу позицию. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadTopLeaderboard(pagination.page);
  }, [filterType, isOpen]);

  // Фильтрация по поиску
  const filteredLeaders = useMemo(() => {
    if (!searchQuery.trim()) return leaders;

    const query = searchQuery.toLowerCase();
    return leaders.filter((leader) => {
      const name = leader.profile?.first_name || leader.profile?.username || "";
      return name.toLowerCase().includes(query);
    });
  }, [leaders, searchQuery]);

  // Проверка, находится ли пользователь в топе
  const isUserInTop = useMemo(() => {
    if (!profileId) return false;
    return leaders.some((leader) => leader.user_id === profileId);
  }, [leaders, profileId]);

  const getUserPosition = () => {
    if (!profileId) return null;
    return leaders.findIndex((leader) => leader.user_id === profileId);
  };

  const userPosition = getUserPosition();

  const renderLoadingState = () => (
    <div className="space-y-6 py-4">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-xl" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="flex-1 min-w-0 p-4 space-y-4">
            <Skeleton className="h-6 w-16 rounded-full" />
            <div className="flex justify-center">
              <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 mx-auto rounded-full" />
              <Skeleton className="h-4 w-24 mx-auto rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 mx-auto rounded-full" />
              <Skeleton className="h-3 w-16 mx-auto rounded-full" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-4">
        <Skeleton className="h-10 w-full rounded-2xl" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <UnifiedModal
        open={isOpen}
        onOpenChange={(open) => (!open ? closeModal() : undefined)}
        title="Таблица лидеров"
        snapPoints={["70vh", "95vh"]}
        initialSnap={0}
        showTitleBar={false}
        className="max-w-5xl"
      >
        {loading ? (
          renderLoadingState()
        ) : (
          <div className="space-y-8 py-4">
          <header className="space-y-3 text-left">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-primary text-sm font-semibold">
              <Trophy className="w-4 h-4" />
              Турнирная таблица Duel Pass
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Топ игроков по Duel Pass
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Лучшие игроки, заработавшие больше всего уровней и наград в Duel Pass.
              Покажи свою косметику и достижения!
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                onClick={() => openHallOfFameModal()}
                className="gap-2"
              >
                <Trophy className="w-4 h-4" />
                Зал славы
              </Button>
            </div>
          </header>

          {/* Фильтры и поиск */}
          <Card className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Фильтры */}
              <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)} className="w-full sm:w-auto">
                <TabsList className="grid w-full sm:w-auto grid-cols-3">
                  <TabsTrigger value="global" className="gap-2">
                    <Globe className="w-4 h-4" />
                    Глобальный
                  </TabsTrigger>
                  <TabsTrigger value="friends" className="gap-2" disabled={!profileId}>
                    <Users className="w-4 h-4" />
                    Друзья
                  </TabsTrigger>
                  <TabsTrigger value="country" className="gap-2" disabled={!user?.language_code}>
                    <MapPin className="w-4 h-4" />
                    Страна
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Поиск */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Кнопка "Моё место" */}
              {profileId && !isUserInTop && (
                <Button
                  variant="outline"
                  onClick={loadUserPosition}
                  className="gap-2"
                  disabled={loading}
                >
                  <TrendingUp className="w-4 h-4" />
                  Моё место
                </Button>
              )}
            </div>
          </Card>

          {/* Блок "Моё место" с соседями */}
          {showMyPosition && userPositionData && (
            <Card className="p-6 space-y-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    Моё место
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Позиция {userPositionData.position} из {userPositionData.total_players}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMyPosition(false)}
                >
                  Скрыть
                </Button>
              </div>

              {/* Соседи */}
              {userPositionData.neighbors && userPositionData.neighbors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Соседи</h3>
                  <div className="space-y-1">
                    {userPositionData.neighbors.map((neighbor) => {
                      const name = neighbor.profile?.first_name || neighbor.profile?.username || "Игрок";
                      const isCurrentUser = neighbor.user_id === profileId;
                      const rank = (neighbor.rank || getRankFromLevel(neighbor.duel_pass_level)) as RankType;

                      return (
                        <div
                          key={neighbor.user_id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-all",
                            isCurrentUser
                              ? "bg-primary/10 border-2 border-primary/30"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <div className="font-bold w-12 text-center">
                            {neighbor.position}
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={neighbor.profile?.photo_url || neighbor.profile?.avatar_url}
                              alt={name}
                            />
                            <AvatarFallback>
                              {name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold flex items-center gap-2">
                              {name}
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                                  Вы
                                </Badge>
                              )}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <RankBadge rank={rank} size="xs" variant="pill" />
                              <span>Уровень {neighbor.duel_pass_level}</span>
                              <span>•</span>
                              <span>{(neighbor.season_points ?? neighbor.duel_pass_xp).toLocaleString("ru-RU")} {neighbor.season_points !== undefined ? 'SP' : 'XP'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Топ 3 - Премиум пьедестал (новая версия) */}
          {filteredLeaders.length >= 3 && !showMyPosition && (
            <div className="relative">
              {/* Фон пьедестала */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent -z-10" />
              
              {/* Пьедестал */}
              <div className="flex flex-col items-center gap-4 md:gap-6">
                {/* Карточки игроков */}
                <div className="w-full max-w-5xl mx-auto flex items-stretch justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 px-1 sm:px-2 md:px-4 pb-2 sm:pb-3 md:pb-4">
                  {/* 2 место - Серебро */}
                  <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 150, damping: 15 }}
                    className="order-1 flex-1 basis-0 min-w-0"
                  >
                    <Card className="relative overflow-hidden h-full bg-gradient-to-br from-slate-50 via-slate-100/70 to-slate-50 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                      {/* Серебряный градиентный фон */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200/30 via-slate-100/20 to-transparent dark:from-slate-700/30 dark:via-slate-800/20" />
                      
                      {/* Блестящий эффект */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                        animate={{
                          x: ["-100%", "200%"],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatDelay: 2,
                          ease: "easeInOut",
                        }}
                      />
                      
                      {/* Номер места */}
                      <div className="absolute top-3 right-3 z-20">
                        <motion.div
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          2
                        </motion.div>
                      </div>

                      <CardContent className="p-4 md:p-6 pt-8 md:pt-10 relative z-10">
                        {/* Аватар */}
                        <div className="flex flex-col items-center space-y-3 md:space-y-4">
                          <div className="relative">
                            <RankFrame rank={(filteredLeaders[1]?.rank || getRankFromLevel(filteredLeaders[1]?.duel_pass_level || 1)) as RankType} />
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              {renderAvatarWithCosmetics(
                                filteredLeaders[1]?.profile?.photo_url || filteredLeaders[1]?.profile?.avatar_url,
                                filteredLeaders[1]?.profile?.first_name || filteredLeaders[1]?.profile?.username || "Игрок",
                                filteredLeaders[1]?.active_skin?.skin_definitions,
                                filteredLeaders[1]?.displayed_badges || [],
                                "md",
                                "border-4 border-slate-400/60 shadow-2xl ring-2 ring-slate-300/30"
                              )}
                            </motion.div>
                            {/* Серебряная аура */}
                            <div className="absolute inset-0 rounded-full bg-slate-400/20 blur-xl -z-10" />
                          </div>

                          {/* Имя */}
                          <div className="text-center space-y-2 w-full">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative px-2 w-full overflow-hidden">
                                    <h3 
                                      className="font-bold text-base md:text-lg lg:text-xl text-foreground cursor-help line-clamp-1 max-w-[100px] sm:max-w-[120px] md:max-w-[140px]"
                                      style={{
                                        maskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent 100%)',
                                        WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent 100%)'
                                      }}
                                    >
                                      {filteredLeaders[1]?.profile?.first_name || filteredLeaders[1]?.profile?.username || "Игрок"}
                                    </h3>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold">{filteredLeaders[1]?.profile?.first_name || filteredLeaders[1]?.profile?.username || "Игрок"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Ранг */}
                            <RankBadge
                              rank={(filteredLeaders[1]?.rank || getRankFromLevel(filteredLeaders[1]?.duel_pass_level || 1)) as RankType}
                              size="xs"
                              variant="subtle"
                            />

                            {/* Статистика */}
                            <div className="flex flex-col items-center gap-1.5 text-sm">
                              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                <Star className="w-4 h-4" />
                                <span className="font-semibold">Уровень {filteredLeaders[1]?.duel_pass_level || 1}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="w-3 h-3" />
                                <span>{((filteredLeaders[1]?.season_points ?? filteredLeaders[1]?.duel_pass_xp) || 0).toLocaleString("ru-RU")} {filteredLeaders[1]?.season_points !== undefined ? 'SP' : 'XP'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
              </motion.div>

                  {/* 1 место - Золото (центр, выше) */}
                  <motion.div
                    initial={{ opacity: 0, y: -30, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 12 }}
                    className="order-2 -mt-6 md:-mt-12 lg:-mt-16 flex-1 basis-0 min-w-0"
                  >
                    <Card className="relative overflow-hidden h-full bg-gradient-to-br from-yellow-50 via-amber-50/80 to-yellow-50 dark:from-yellow-950/40 dark:via-amber-950/40 dark:to-yellow-950/40 shadow-2xl hover:shadow-yellow-500/30 transition-all duration-300 group">
                      {/* Золотой градиентный фон */}
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 via-amber-400/20 to-yellow-500/30" />
                      
                      {/* Анимированное свечение */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-yellow-400/40 via-amber-400/30 to-yellow-500/40"
                        animate={{
                          opacity: [0.4, 0.6, 0.4],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      
                      {/* Блестящий эффект */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                        animate={{
                          x: ["-100%", "200%"],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          repeatDelay: 1.5,
                          ease: "easeInOut",
                        }}
                      />
                      
                      {/* Частицы золота */}
                      <div className="absolute inset-0 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                            style={{
                              left: `${20 + i * 15}%`,
                              top: `${10 + i * 12}%`,
                            }}
                            animate={{
                              y: [0, -20, 0],
                              opacity: [0.3, 0.8, 0.3],
                              scale: [1, 1.5, 1],
                            }}
                            transition={{
                              duration: 2 + i * 0.3,
                              repeat: Infinity,
                              delay: i * 0.2,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>

                      {/* Корона */}
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
                        <motion.div
                          animate={{
                            y: [0, -8, 0],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <Crown className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 fill-yellow-500 drop-shadow-2xl filter" />
                        </motion.div>
                      </div>

                      {/* Номер места */}
                      <div className="absolute top-3 right-3 z-20">
                        <motion.div
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-xl"
                          whileHover={{ scale: 1.15, rotate: 15 }}
                          animate={{
                            boxShadow: [
                              "0 0 20px rgba(234, 179, 8, 0.6)",
                              "0 0 40px rgba(234, 179, 8, 0.8)",
                              "0 0 20px rgba(234, 179, 8, 0.6)",
                            ],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          1
                        </motion.div>
                      </div>

                      <CardContent className="p-5 md:p-7 pt-12 md:pt-16 relative z-10">
                        {/* Аватар */}
                        <div className="flex flex-col items-center space-y-4 md:space-y-5">
                          <div className="relative">
                            <RankFrame rank={(filteredLeaders[0]?.rank || getRankFromLevel(filteredLeaders[0]?.duel_pass_level || 1)) as RankType} />
                            <motion.div
                              whileHover={{ scale: 1.08 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              {renderAvatarWithCosmetics(
                                filteredLeaders[0]?.profile?.photo_url || filteredLeaders[0]?.profile?.avatar_url,
                                filteredLeaders[0]?.profile?.first_name || filteredLeaders[0]?.profile?.username || "Игрок",
                                filteredLeaders[0]?.active_skin?.skin_definitions,
                                filteredLeaders[0]?.displayed_badges || [],
                                "lg",
                                "border-4 border-yellow-400 shadow-2xl ring-4 ring-yellow-300/40"
                              )}
                            </motion.div>
                            {/* Золотая аура */}
                            <motion.div
                              className="absolute inset-0 rounded-full bg-yellow-400/30 blur-2xl -z-10"
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3],
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          </div>

                          {/* Имя */}
                          <div className="text-center space-y-2.5 w-full">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative px-2 w-full overflow-hidden">
                                    <h3 
                                      className="font-black text-lg md:text-xl lg:text-2xl bg-gradient-to-r from-yellow-700 via-amber-700 to-yellow-700 dark:from-yellow-400 dark:via-amber-400 dark:to-yellow-400 bg-clip-text text-transparent cursor-help line-clamp-1 max-w-[120px] sm:max-w-[140px] md:max-w-[160px]"
                                      style={{
                                        maskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent 100%)',
                                        WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent 100%)'
                                      }}
                                    >
                                      {filteredLeaders[0]?.profile?.first_name || filteredLeaders[0]?.profile?.username || "Игрок"}
                                    </h3>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold">{filteredLeaders[0]?.profile?.first_name || filteredLeaders[0]?.profile?.username || "Игрок"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Ранг */}
                              <RankBadge
                                rank={(filteredLeaders[0]?.rank || getRankFromLevel(filteredLeaders[0]?.duel_pass_level || 1)) as RankType}
                                size="sm"
                                variant="subtle"
                              />

                            {/* Статистика */}
                            <div className="flex flex-col items-center gap-2 text-sm md:text-base">
                              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                <Crown className="w-5 h-5" />
                                <span className="font-bold">Уровень {filteredLeaders[0]?.duel_pass_level || 1}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground font-semibold">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{((filteredLeaders[0]?.season_points ?? filteredLeaders[0]?.duel_pass_xp) || 0).toLocaleString("ru-RU")} {filteredLeaders[0]?.season_points !== undefined ? 'SP' : 'XP'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
              </motion.div>

                  {/* 3 место - Бронза */}
                  <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 150, damping: 15 }}
                    className="order-3 flex-1 basis-0 min-w-0"
                  >
                    <Card className="relative overflow-hidden h-full bg-gradient-to-br from-orange-50 via-amber-50/70 to-orange-50 dark:from-orange-950/40 dark:via-amber-950/40 dark:to-orange-950/40 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                      {/* Бронзовый градиентный фон */}
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-300/25 via-orange-200/15 to-transparent dark:from-orange-700/25 dark:via-orange-800/15" />
                      
                      {/* Блестящий эффект */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                        animate={{
                          x: ["-100%", "200%"],
                        }}
                        transition={{
                          duration: 3.5,
                          repeat: Infinity,
                          repeatDelay: 2.5,
                          ease: "easeInOut",
                        }}
                      />
                      
                      {/* Номер места */}
                      <div className="absolute top-3 right-3 z-20">
                        <motion.div
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg"
                          whileHover={{ scale: 1.1, rotate: -5 }}
                        >
                          3
                        </motion.div>
                      </div>

                      <CardContent className="p-4 md:p-6 pt-8 md:pt-10 relative z-10">
                        {/* Аватар */}
                        <div className="flex flex-col items-center space-y-3 md:space-y-4">
                          <div className="relative">
                            <RankFrame rank={(filteredLeaders[2]?.rank || getRankFromLevel(filteredLeaders[2]?.duel_pass_level || 1)) as RankType} />
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              {renderAvatarWithCosmetics(
                                filteredLeaders[2]?.profile?.photo_url || filteredLeaders[2]?.profile?.avatar_url,
                                filteredLeaders[2]?.profile?.first_name || filteredLeaders[2]?.profile?.username || "Игрок",
                                filteredLeaders[2]?.active_skin?.skin_definitions,
                                filteredLeaders[2]?.displayed_badges || [],
                                "md",
                                "border-4 border-orange-400/60 shadow-2xl ring-2 ring-orange-300/30"
                              )}
                            </motion.div>
                            {/* Оранжевая аура */}
                            <div className="absolute inset-0 rounded-full bg-orange-400/20 blur-xl -z-10" />
                          </div>

                          {/* Имя */}
                          <div className="text-center space-y-2 w-full">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative px-2 w-full overflow-hidden">
                                    <h3 
                                      className="font-bold text-base md:text-lg lg:text-xl text-foreground cursor-help line-clamp-1 max-w-[100px] sm:max-w-[120px] md:max-w-[140px]"
                                      style={{
                                        maskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent 100%)',
                                        WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent 100%)'
                                      }}
                                    >
                                      {filteredLeaders[2]?.profile?.first_name || filteredLeaders[2]?.profile?.username || "Игрок"}
                                    </h3>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold">{filteredLeaders[2]?.profile?.first_name || filteredLeaders[2]?.profile?.username || "Игрок"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Ранг */}
                            <RankBadge
                              rank={(filteredLeaders[2]?.rank || getRankFromLevel(filteredLeaders[2]?.duel_pass_level || 1)) as RankType}
                              size="xs"
                              variant="subtle"
                            />

                            {/* Статистика */}
                            <div className="flex flex-col items-center gap-1.5 text-sm">
                              <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                <Award className="w-4 h-4" />
                                <span className="font-semibold">Уровень {filteredLeaders[2]?.duel_pass_level || 1}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="w-3 h-3" />
                                <span>{((filteredLeaders[2]?.season_points ?? filteredLeaders[2]?.duel_pass_xp) || 0).toLocaleString("ru-RU")} {filteredLeaders[2]?.season_points !== undefined ? 'SP' : 'XP'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>
          )}

          {/* Таблица лидеров */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
              <div>
                <h2 className="text-xl font-bold">Полный рейтинг</h2>
                <p className="text-sm text-muted-foreground">
                  {filterType === "global" && "Глобальный рейтинг"}
                  {filterType === "friends" && "Рейтинг среди друзей"}
                  {filterType === "country" && "Рейтинг по стране"}
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {pagination.total || filteredLeaders.length} игроков
              </Badge>
            </div>

            {loading ? (
              <div className="p-6 text-center text-muted-foreground">
                Загрузка...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-destructive font-semibold">
                {error}
              </div>
            ) : filteredLeaders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                {searchQuery ? "Ничего не найдено по запросу." : "Пока нет игроков в рейтинге."}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Игрок</TableHead>
                      <TableHead>Ранг</TableHead>
                      <TableHead>Уровень</TableHead>
                      <TableHead>SP/XP</TableHead>
                      <TableHead>Скин</TableHead>
                      <TableHead>Бейджи</TableHead>
                      <TableHead>Награды</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaders.map((leader, index) => {
                      const name =
                        leader.profile?.first_name ||
                        leader.profile?.username ||
                        "Игрок";
                      const isCurrentUser = leader.user_id === profileId;
                      const skin = leader.active_skin?.skin_definitions;
                      const badges = leader.displayed_badges || [];
                      const rank = (leader.rank || getRankFromLevel(leader.duel_pass_level)) as RankType;
                      const position = leader.position || (pagination.page - 1) * pagination.page_size + index + 1;

                      return (
                        <TableRow
                          key={leader.user_id}
                          className={cn(
                            "transition-all hover:bg-muted/50",
                            isCurrentUser && "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-l-4 border-l-primary shadow-lg ring-1 ring-primary/20"
                          )}
                        >
                          <TableCell className="font-bold">
                            {position}
                            {position <= 3 && (
                              <Trophy className="w-4 h-4 inline-block ml-1 text-yellow-500" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] sm:max-w-[250px] md:max-w-none">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex-shrink-0">
                                <RankFrame rank={rank} />
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  {renderAvatarWithCosmetics(
                                    leader.profile?.photo_url || leader.profile?.avatar_url,
                                    name,
                                    skin,
                                    badges,
                                    "sm",
                                    cn(
                                      "border-2 shadow-md",
                                      rank === "master" && "border-yellow-400/60 ring-2 ring-yellow-300/30",
                                      rank === "diamond" && "border-purple-400/60 ring-2 ring-purple-300/30",
                                      rank === "platinum" && "border-blue-400/60",
                                      rank === "gold" && "border-yellow-400/60",
                                      rank === "silver" && "border-gray-300/60",
                                      rank === "bronze" && "border-orange-400/60"
                                    )
                                  )}
                                </motion.div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="relative flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                        <p 
                                          className={cn(
                                            "font-semibold cursor-help line-clamp-1 max-w-[80px] sm:max-w-[120px] md:max-w-[150px]",
                                            isCurrentUser && "text-primary font-bold"
                                          )}
                                          style={{
                                            maskImage: 'linear-gradient(to right, black calc(100% - 15px), transparent 100%)',
                                            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 15px), transparent 100%)'
                                          }}
                                        >
                                          {name}
                                        </p>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-semibold">{name}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <p className="text-xs text-muted-foreground truncate">
                                  Уровень {leader.duel_pass_level}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <RankBadge rank={rank} size="sm" variant="pill" />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <Star className="w-3 h-3" />
                              {leader.duel_pass_level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {(leader.season_points ?? leader.duel_pass_xp).toLocaleString("ru-RU")} {leader.season_points !== undefined ? 'SP' : 'XP'}
                          </TableCell>
                          <TableCell>
                            {skin ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  rarityColors[skin.rarity as keyof typeof rarityColors] ||
                                    rarityColors.common
                                )}
                              >
                                {skin.name_ru}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {badges.length > 0 ? (
                                badges.slice(0, 3).map((badge, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      badge.badge_definitions &&
                                        rarityColors[
                                          badge.badge_definitions.rarity as keyof typeof rarityColors
                                        ] || rarityColors.common
                                    )}
                                    title={badge.badge_definitions?.name_ru}
                                  >
                                    <Award className="w-3 h-3 mr-1" />
                                    {badge.badge_definitions?.name_ru || "Бейдж"}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              <Trophy className="w-3 h-3" />
                              {leader.claimed_rewards_count || 0}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Пагинация */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Страница {pagination.page} из {pagination.total_pages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadTopLeaderboard(pagination.page - 1)}
                        disabled={pagination.page <= 1 || loading}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Назад
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadTopLeaderboard(pagination.page + 1)}
                        disabled={pagination.page >= pagination.total_pages || loading}
                      >
                        Вперёд
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
          </div>
        )}
      </UnifiedModal>

      {activeSeasonId && selectedPosition && (
        <LeaderboardRewardsModal
          open={rewardsModalOpen}
          onOpenChange={setRewardsModalOpen}
          seasonId={activeSeasonId}
          position={selectedPosition}
        />
      )}
    </>
  );
}

