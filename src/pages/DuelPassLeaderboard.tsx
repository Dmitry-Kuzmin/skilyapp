import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Crown, Sparkles, Award, Star, TrendingUp, Search, Globe, Users, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { RankBadge, RankIcon, RankFrame, getRankFromLevel, type RankType } from "@/components/ranking/RankBadge";
import { motion } from "framer-motion";
import { LeaderboardRewardsModal } from "@/components/leaderboard/LeaderboardRewardsModal";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardEntry {
  user_id: string;
  duel_pass_level: number;
  duel_pass_xp: number;
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

const DuelPassLeaderboard = () => {
  const { profileId, user } = useUserContext();
  const navigate = useNavigate();
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
    loadTopLeaderboard(pagination.page);
  }, [filterType]);

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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="space-y-3 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-primary text-sm font-semibold">
              <Trophy className="w-4 h-4" />
              Турнирная таблица Duel Pass
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Топ игроков по Duel Pass
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Лучшие игроки, заработавшие больше всего уровней и наград в Duel Pass.
              Покажи свою косметику и достижения!
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/hall-of-fame")}
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
                              <span>{neighbor.duel_pass_xp.toLocaleString("ru-RU")} XP</span>
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
                {/* Визуальный пьедестал (подставка) */}
                <div className="w-full max-w-4xl mx-auto relative">
                  <div className="flex items-end justify-center gap-1 md:gap-2 h-8 md:h-12">
                    {/* Левая подставка (2 место) */}
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                      className="w-[28%] md:w-[30%] h-6 md:h-8 bg-gradient-to-t from-slate-400/40 via-slate-300/30 to-slate-200/20 rounded-t-lg border-t border-x border-slate-400/30"
                    />
                    {/* Центральная подставка (1 место) - выше */}
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                      className="w-[32%] md:w-[35%] h-10 md:h-12 bg-gradient-to-t from-yellow-500/50 via-yellow-400/40 to-yellow-300/30 rounded-t-lg border-t-2 border-x-2 border-yellow-400/50 shadow-lg shadow-yellow-500/20"
                    />
                    {/* Правая подставка (3 место) */}
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                      className="w-[28%] md:w-[30%] h-5 md:h-7 bg-gradient-to-t from-orange-400/40 via-orange-300/30 to-orange-200/20 rounded-t-lg border-t border-x border-orange-400/30"
                    />
                  </div>
                </div>

                {/* Карточки игроков */}
                <div className="w-full max-w-5xl mx-auto grid grid-cols-3 gap-3 md:gap-4 lg:gap-6 px-2 md:px-4">
                  {/* 2 место - Серебро */}
                  <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 150, damping: 15 }}
                    className="order-2 md:order-1"
                  >
                    <Card className="relative overflow-hidden h-full bg-gradient-to-br from-slate-50 via-slate-100/80 to-slate-50 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 border-2 border-slate-300/50 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 group">
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
                              <Avatar className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 border-4 border-slate-400/60 shadow-2xl ring-2 ring-slate-300/30">
                                <AvatarImage
                                  src={filteredLeaders[1]?.profile?.photo_url || filteredLeaders[1]?.profile?.avatar_url}
                                  alt={filteredLeaders[1]?.profile?.first_name || "Игрок"}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-600 text-white font-bold text-2xl md:text-3xl">
                                  {(filteredLeaders[1]?.profile?.first_name || "И")[0]}
                                </AvatarFallback>
                              </Avatar>
                            </motion.div>
                            {/* Серебряная аура */}
                            <div className="absolute inset-0 rounded-full bg-slate-400/20 blur-xl -z-10" />
                          </div>

                          {/* Имя */}
                          <div className="text-center space-y-2 w-full">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <h3 className="font-bold text-base md:text-lg lg:text-xl text-foreground truncate cursor-help px-2">
                                    {filteredLeaders[1]?.profile?.first_name || filteredLeaders[1]?.profile?.username || "Игрок"}
                                  </h3>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold">{filteredLeaders[1]?.profile?.first_name || filteredLeaders[1]?.profile?.username || "Игрок"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Ранг */}
                            <RankBadge 
                              rank={(filteredLeaders[1]?.rank || getRankFromLevel(filteredLeaders[1]?.duel_pass_level || 1)) as RankType} 
                              size="sm" 
                              variant="pill"
                            />

                            {/* Статистика */}
                            <div className="flex flex-col items-center gap-1.5 text-sm">
                              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                <Star className="w-4 h-4" />
                                <span className="font-semibold">Уровень {filteredLeaders[1]?.duel_pass_level || 1}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="w-3 h-3" />
                                <span>{filteredLeaders[1]?.duel_pass_xp.toLocaleString("ru-RU") || 0} XP</span>
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
                    className="order-1 md:order-2 -mt-6 md:-mt-12 lg:-mt-16"
                  >
                <Card className="p-4 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-5 bg-gradient-to-br from-yellow-50/90 via-amber-50/90 to-yellow-50/90 dark:from-yellow-900/30 dark:via-amber-900/30 dark:to-yellow-900/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 shadow-2xl shadow-yellow-500/20 h-full">
                  {/* Анимированный фон */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-amber-400/20 to-yellow-500/20"
                    animate={{
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full -mr-24 -mt-24 blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-amber-400/20 to-transparent rounded-full -ml-20 -mb-20 blur-2xl" />
                  
                  <div className="flex items-center justify-center relative z-10">
                    <div className="relative">
                      <motion.div
                        className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-20"
                        animate={{
                          y: [0, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
                      </motion.div>
                      <motion.div
                        className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-br from-yellow-500 to-amber-600 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-black text-base sm:text-lg shadow-xl z-20"
                        whileHover={{ scale: 1.15, rotate: 15 }}
                        animate={{
                          boxShadow: [
                            "0 0 20px rgba(234, 179, 8, 0.5)",
                            "0 0 30px rgba(234, 179, 8, 0.7)",
                            "0 0 20px rgba(234, 179, 8, 0.5)",
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
                      <div className="relative">
                        <RankFrame rank={(filteredLeaders[0]?.rank || getRankFromLevel(filteredLeaders[0]?.duel_pass_level || 1)) as RankType} />
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Avatar className="w-18 h-18 sm:w-20 sm:h-20 md:w-32 md:h-32 border-2 sm:border-4 border-yellow-400 shadow-2xl ring-2 sm:ring-4 ring-yellow-300/30">
                            <AvatarImage
                              src={filteredLeaders[0]?.profile?.photo_url || filteredLeaders[0]?.profile?.avatar_url}
                              alt={filteredLeaders[0]?.profile?.first_name || "Игрок"}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-amber-600 text-white font-bold text-2xl md:text-3xl">
                              {(filteredLeaders[0]?.profile?.first_name || "И")[0]}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-3 relative z-10">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h3 className="font-black text-base sm:text-lg md:text-xl text-foreground truncate cursor-help px-2">
                            {filteredLeaders[0]?.profile?.first_name || filteredLeaders[0]?.profile?.username || "Игрок"}
                          </h3>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">{filteredLeaders[0]?.profile?.first_name || filteredLeaders[0]?.profile?.username || "Игрок"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex flex-col items-center gap-2">
                      <RankBadge 
                        rank={(filteredLeaders[0]?.rank || getRankFromLevel(filteredLeaders[0]?.duel_pass_level || 1)) as RankType} 
                        size="md" 
                        variant="pill"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span className="font-bold">Уровень {filteredLeaders[0]?.duel_pass_level || 1}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {filteredLeaders[0]?.duel_pass_xp.toLocaleString("ru-RU") || 0} XP
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* 3 место */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-auto md:flex-1"
              >
                <Card className="p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 md:space-y-4 bg-gradient-to-br from-orange-50/90 via-amber-50/90 to-orange-50/90 dark:from-orange-900/30 dark:via-amber-900/30 dark:to-orange-900/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 h-full shadow-lg">
                  {/* Декоративные элементы */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-orange-300/20 to-transparent rounded-full -mr-18 -mt-18 blur-xl" />
                  <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-amber-200/20 to-transparent rounded-full -ml-14 -mb-14 blur-xl" />
                  
                  <div className="flex items-center justify-center relative z-10">
                    <div className="relative">
                      <motion.div
                        className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-black text-sm sm:text-base shadow-lg"
                        whileHover={{ scale: 1.1, rotate: -10 }}
                      >
                        3
                      </motion.div>
                      <div className="relative">
                        <RankFrame rank={(filteredLeaders[2]?.rank || getRankFromLevel(filteredLeaders[2]?.duel_pass_level || 1)) as RankType} />
                        <Avatar className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 sm:border-4 border-orange-400/60 shadow-xl">
                          <AvatarImage
                            src={filteredLeaders[2]?.profile?.photo_url || filteredLeaders[2]?.profile?.avatar_url}
                            alt={filteredLeaders[2]?.profile?.first_name || "Игрок"}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-600 text-white font-bold text-lg sm:text-xl md:text-2xl">
                            {(filteredLeaders[2]?.profile?.first_name || "И")[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2 sm:space-y-3 relative z-10">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h3 className="font-bold text-sm sm:text-base md:text-lg text-foreground truncate cursor-help px-2">
                            {filteredLeaders[2]?.profile?.first_name || filteredLeaders[2]?.profile?.username || "Игрок"}
                          </h3>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">{filteredLeaders[2]?.profile?.first_name || filteredLeaders[2]?.profile?.username || "Игрок"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                      <RankBadge 
                        rank={(filteredLeaders[2]?.rank || getRankFromLevel(filteredLeaders[2]?.duel_pass_level || 1)) as RankType} 
                        size="sm" 
                        variant="pill"
                      />
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <Award className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="font-semibold">Уровень {filteredLeaders[2]?.duel_pass_level || 1}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {filteredLeaders[2]?.duel_pass_xp.toLocaleString("ru-RU") || 0} XP
                    </p>
                  </div>
                </Card>
              </motion.div>
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
                      <TableHead>XP</TableHead>
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
                            isCurrentUser && "bg-primary/10 border-l-4 border-l-primary shadow-sm"
                          )}
                        >
                          <TableCell className="font-bold">
                            {position}
                            {position <= 3 && (
                              <Trophy className="w-4 h-4 inline-block ml-1 text-yellow-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <RankFrame rank={rank} />
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <Avatar className={cn(
                                    "h-12 w-12 border-2 shadow-md transition-all",
                                    rank === "master" && "border-yellow-400/60 ring-2 ring-yellow-300/30",
                                    rank === "diamond" && "border-purple-400/60 ring-2 ring-purple-300/30",
                                    rank === "platinum" && "border-blue-400/60",
                                    rank === "gold" && "border-yellow-400/60",
                                    rank === "silver" && "border-gray-300/60",
                                    rank === "bronze" && "border-orange-400/60"
                                  )}>
                                    <AvatarImage
                                      src={leader.profile?.photo_url || leader.profile?.avatar_url}
                                      alt={name}
                                    />
                                    <AvatarFallback className={cn(
                                      "font-bold",
                                      rank === "master" && "bg-gradient-to-br from-yellow-400 to-amber-600",
                                      rank === "diamond" && "bg-gradient-to-br from-purple-400 to-violet-600",
                                      rank === "platinum" && "bg-gradient-to-br from-blue-300 to-cyan-500",
                                      rank === "gold" && "bg-gradient-to-br from-yellow-400 to-amber-500",
                                      rank === "silver" && "bg-gradient-to-br from-gray-200 to-gray-400",
                                      rank === "bronze" && "bg-gradient-to-br from-orange-400 to-amber-600"
                                    )}>
                                      {name.slice(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </motion.div>
                              </div>
                              <div>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="font-semibold flex items-center gap-2 truncate cursor-help">
                                        {name}
                                        {isCurrentUser && (
                                          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                                            Вы
                                          </Badge>
                                        )}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-semibold">{name}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <p className="text-xs text-muted-foreground">
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
                            {leader.duel_pass_xp.toLocaleString("ru-RU")}
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
      </div>

      {/* Модальное окно с призами */}
      {activeSeasonId && selectedPosition && (
        <LeaderboardRewardsModal
          open={rewardsModalOpen}
          onOpenChange={setRewardsModalOpen}
          seasonId={activeSeasonId}
          position={selectedPosition}
        />
      )}
    </Layout>
  );
};

export default DuelPassLeaderboard;
