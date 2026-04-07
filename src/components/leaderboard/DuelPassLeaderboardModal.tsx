import { useEffect, useState, useMemo, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Crown, Sparkles, Award, Star, TrendingUp, Search, Globe, Users, MapPin, ChevronLeft, ChevronRight, Flame, Coins } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { UserContext } from "@/contexts/UserContext";
import { RankBadge, RankIcon, RankFrame, getRankFromLevel, type RankType } from "@/components/ranking/RankBadge";
import { motion } from "@/components/optimized/Motion";
import { LeaderboardRewardsModal } from "@/components/leaderboard/LeaderboardRewardsModal";
import { useModalRoute } from "@/hooks/useModalRoute";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";

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

// Вспомогательная функция для расчета времени
const calculateTimeLeft = (endDate?: string | null) => {
  if (!endDate) return null;
  const difference = new Date(endDate).getTime() - Date.now();
  const total = Math.max(difference, 0);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { total, days, hours, minutes, seconds };
};

export function DuelPassLeaderboardView({
  onBack,
  onOpenHallOfFame
}: {
  onBack: () => void;
  onOpenHallOfFame: () => void;
}) {
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const user = userContext?.user ?? null;
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme ?? "dark";
  const isLightTheme = theme === "light";
  const rowBaseClass = useMemo(
    () =>
      isLightTheme
        ? "border-b border-slate-200 !bg-white text-slate-900 hover:!bg-slate-50 [&:nth-child(even)]:!bg-slate-50/50 [&>td]:!bg-inherit"
        : "border-b-0 !bg-slate-900/40 text-white hover:!bg-slate-800/60 [&:nth-child(even)]:!bg-slate-900/30 [&>td]:!bg-inherit",
    [isLightTheme]
  );
  const highlightedRowClass = useMemo(
    () =>
      isLightTheme
        ? "bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-200/50 shadow-sm backdrop-blur-md"
        : "bg-gradient-to-r from-indigo-600/80 to-blue-600/80 border border-white/10 shadow-[0_8px_32px_rgba(79,70,229,0.3)] backdrop-blur-xl",
    [isLightTheme]
  );
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [absoluteTop3, setAbsoluteTop3] = useState<LeaderboardEntry[]>([]);
  const [userPositionData, setUserPositionData] = useState<UserPositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [seasonEndDate, setSeasonEndDate] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calculateTimeLeft>>(null);
  const [filterType, setFilterType] = useState<FilterType>("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0,
  });
  const [showMyPosition, setShowMyPosition] = useState(false);

  // Кэшируем ID и дату активного сезона, чтобы не дергать базу при каждой смене вкладки/страницы
  // ОПТИМИЗАЦИЯ СКОРОСТИ
  useEffect(() => {
    const fetchActiveSeason = async () => {
      const { data: activeSeason } = await supabase
        .from("duel_pass_seasons")
        .select("id, end_date")
        .eq("is_active", true)
        .order("season_number", { ascending: false })
        .limit(1)
        .single<{ id: number; end_date: string }>();

      if (activeSeason) {
        setActiveSeasonId(activeSeason.id);
        setSeasonEndDate(activeSeason.end_date);
        setTimeLeft(calculateTimeLeft(activeSeason.end_date));
      }
    };
    fetchActiveSeason();
  }, []);

  // Загрузка топ-10
  const loadTopLeaderboard = async (page: number = 1) => {
    // Если сезон еще не загружен - ждем (loading уже true по умолчанию)
    if (activeSeasonId === null) return;

    setLoading(true);
    setError(null);
    try {

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

      // Фиксируем ТОП-3 только если это первая страница
      if (page === 1 && data?.leaderboard) {
        setAbsoluteTop3(data.leaderboard.slice(0, 3));
      }

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

  // Эффект для таймера
  useEffect(() => {
    if (!seasonEndDate) return;

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(seasonEndDate);
      setTimeLeft(remaining);
      if (remaining && remaining.total <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [seasonEndDate]);

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
    if (activeSeasonId !== null) {
      loadTopLeaderboard(1);
    }
  }, [filterType, activeSeasonId]);

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
    // Проверка через userContext.profileId (может быть null, если не авторизован)
    const currentUserId = userContext?.profileId;
    return leaders.some((leader) => leader.user_id === profileId);
  }, [leaders, profileId]);

  const getUserPosition = () => {
    if (!profileId) return null;
    return leaders.findIndex((leader) => leader.user_id === profileId);
  };

  const userPosition = getUserPosition();

  const disableAnimations = loading;

  const getMotionProps = <T,>(config: T): Partial<T> => (disableAnimations ? {} : config);

  const renderLoadingState = () => (
    <div className="space-y-6 py-6 px-4 sm:px-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 sm:w-40 rounded-full" />
        <Skeleton className="h-8 w-48 sm:w-64 rounded-xl" />
        <Skeleton className="h-4 w-56 sm:w-72 rounded-xl" />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-3 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-10 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <div className="flex justify-center">
              <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20 mx-auto rounded-full" />
            <Skeleton className="h-3 w-16 mx-auto rounded-full" />
            <Skeleton className="h-3 w-14 mx-auto rounded-full" />
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
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex-1 overflow-y-auto w-full"
      >
        {loading ? (
          renderLoadingState()
        ) : (
          <div className="space-y-6 py-4 px-4 sm:px-6">
            <header className="space-y-4 text-left relative flex flex-col pt-2">
              {/* Кнопка Назад и Плашка на одном уровне */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-slate-900/50 hover:bg-slate-800 text-white border border-white/5 backdrop-blur-md shrink-0"
                  onClick={onBack}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase tracking-wider font-bold">
                  <Trophy className="w-3 h-3" />
                  Соревновательный сезон
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 pt-4 md:pt-2">
                <div className="space-y-2 flex-1 min-w-0">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                    Топ игроков
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Бейся в дуэлях, копи XP и забирай <span className="text-yellow-500 font-bold">Premium</span> или <span className="text-yellow-500 font-bold">1000 монет</span> в конце сезона!
                  </p>
                </div>
                <div className="flex flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                  {timeLeft && (
                    <div className="flex flex-col justify-center px-4 py-2 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md shrink-0 flex-1 sm:flex-none">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold whitespace-nowrap">До конца сезона</p>
                      <p className="text-sm font-mono font-bold text-primary whitespace-nowrap">
                        {timeLeft.days > 0 && `${timeLeft.days}д `}
                        {String(timeLeft.hours).padStart(2, '0')}:
                        {String(timeLeft.minutes).padStart(2, '0')}:
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={onOpenHallOfFame}
                    className="h-auto py-2.5 px-4 gap-2 bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl shrink-0 flex-1 sm:flex-none"
                  >
                    <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
                    <span className="font-semibold whitespace-nowrap">Зал славы</span>
                  </Button>
                </div>
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
                            <UserAvatar
                              profileId={neighbor.user_id}
                              size="md"
                              showPremiumGlow={false}
                            />
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

            {/* ТОП-3 — Премиальный подиум */}
            {absoluteTop3.length >= 3 && !showMyPosition && (
              <div className="flex items-end justify-center gap-3 md:gap-8 pb-8 pt-10 px-4 relative">
                {/* Фоновое свечение для всего блока */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl bg-primary/5 blur-[100px] -z-10" />

                {/* 2 место — Серебро */}
                <div className="flex-1 max-w-[150px] relative flex flex-col items-center gap-3 p-4 rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-slate-400/10 to-slate-900/90 backdrop-blur-2xl transition-all hover:scale-[1.05] group shadow-2xl">
                  <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-slate-900 font-black text-xs shadow-[0_0_15px_rgba(255,255,255,0.2)] z-20">2</div>
                  <div className="relative">
                    <UserAvatar
                      profileId={absoluteTop3[1]?.user_id}
                      size="xl"
                      showPremiumGlow={false}
                      avatarClassName="rounded-full"
                      className="rounded-full ring-2 ring-slate-300/30 relative z-10 shadow-lg"
                    />
                    <div className="absolute inset-0 bg-slate-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="font-bold text-sm truncate text-white uppercase tracking-tight">{absoluteTop3[1]?.profile?.first_name || 'Гонщик'}</p>
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-black text-slate-400/80 uppercase tracking-widest leading-none">Приз</span>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 font-bold shadow-inner">
                        <Coins className="w-3 h-3 text-slate-400" />
                        500
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1 место — Золото */}
                <div className="flex-1 max-w-[190px] relative flex flex-col items-center gap-4 p-5 rounded-[3rem] border-2 border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 via-slate-900/95 to-slate-900 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-10 transition-all hover:scale-[1.08] group">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                    <Crown className="w-12 h-12 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-pulse" />
                  </div>
                  <div className="absolute -top-4 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-yellow-950 font-black text-sm shadow-[0_0_20px_rgba(234,179,8,0.5)] z-20 border-2 border-yellow-200/50">1</div>
                  <div className="relative">
                    <UserAvatar
                      profileId={absoluteTop3[0]?.user_id}
                      size="2xl"
                      showPremiumGlow={false}
                      avatarClassName="rounded-full"
                      className="rounded-full ring-4 ring-yellow-400/50 shadow-[0_0_30px_rgba(234,179,8,0.4)] relative z-10 scale-105"
                    />
                    <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full animate-pulse" />
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="font-black text-base md:text-lg truncate bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent uppercase tracking-tighter">{absoluteTop3[0]?.profile?.first_name || 'Чемпион'}</p>
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <span className="text-[11px] font-black text-yellow-500 uppercase tracking-[0.2em] leading-none">Награда</span>
                      <div className="mt-1 flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-400 text-yellow-950 text-[11px] font-black uppercase tracking-wider shadow-[0_4px_15px_rgba(234,179,8,0.4)] transition-transform group-hover:scale-105">
                        <Star className="w-4 h-4 fill-yellow-950" />
                        Premium
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 место — Бронза */}
                <div className="flex-1 max-w-[150px] relative flex flex-col items-center gap-3 p-4 rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-orange-400/10 to-slate-900/90 backdrop-blur-2xl transition-all hover:scale-[1.05] group shadow-2xl">
                  <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center text-orange-50 font-black text-xs shadow-[0_0_15px_rgba(249,115,22,0.2)] z-20">3</div>
                  <div className="relative">
                    <UserAvatar
                      profileId={absoluteTop3[2]?.user_id}
                      size="xl"
                      showPremiumGlow={false}
                      avatarClassName="rounded-full"
                      className="rounded-full ring-2 ring-orange-500/30 relative z-10 shadow-lg"
                    />
                    <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="font-bold text-sm truncate text-white uppercase tracking-tight">{absoluteTop3[2]?.profile?.first_name || 'Гонщик'}</p>
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-black text-orange-400/80 uppercase tracking-widest leading-none">Приз</span>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-orange-200 font-bold shadow-inner">
                        <Coins className="w-3 h-3 text-orange-400" />
                        250
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Заголовок основного списка */}
            <div className="flex items-center justify-between px-2 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h2 className="text-xl font-bold tracking-tight">Полный рейтинг</h2>
              </div>
              <Badge variant="secondary" className="bg-white/5 text-muted-foreground border-white/10 flex items-center gap-1.5 px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-yellow-500" />
                <span>{pagination.total || filteredLeaders.length} игроков</span>
              </Badge>
            </div>

            <div className="space-y-2">
              {/* Шапка "таблицы" */}
              <div className="flex items-center px-6 py-2 text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                <div className="w-10">#</div>
                <div className="flex-1 ml-4">Гонщик</div>
                <div className="hidden sm:block w-24 text-center">Уровень</div>
                <div className="w-24 text-right">SP</div>
              </div>

              <div className="space-y-2">
                {filteredLeaders.map((leader, index) => {
                  const name = leader.profile?.first_name || leader.profile?.username || "Гонщик";
                  const isCurrentUser = leader.user_id === profileId;
                  const rank = (leader.rank || getRankFromLevel(leader.duel_pass_level)) as RankType;
                  const position = leader.position || (pagination.page - 1) * pagination.page_size + index + 1;

                  return (
                    <div
                      key={leader.user_id}
                      className={cn(
                        "flex items-center p-4 rounded-2xl transition-all border border-white/[0.02] backdrop-blur-md",
                        isCurrentUser
                          ? highlightedRowClass
                          : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.01]"
                      )}
                    >
                      {/* Ранг # */}
                      <div className="w-10 flex flex-col items-center justify-center shrink-0">
                        <span className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg shadow-black/20",
                          position === 1 ? "bg-yellow-400 text-yellow-950" :
                            position === 2 ? "bg-slate-300 text-slate-800" :
                              position === 3 ? "bg-orange-500 text-orange-50" : "text-muted-foreground/60 bg-white/5"
                        )}>
                          {position}
                        </span>
                      </div>

                      {/* Игрок + Лига */}
                      <div className="flex-1 ml-4 flex items-center gap-3 min-w-0">
                        <UserAvatar
                          profileId={leader.user_id}
                          size="md"
                          showPremiumGlow={false}
                          avatarClassName="rounded-full"
                          className={cn(
                            "rounded-full ring-2 ring-white/5 shrink-0",
                            isCurrentUser && "ring-white/30"
                          )}
                        />
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <p className={cn(
                            "font-bold text-sm md:text-base truncate text-white max-w-[120px] md:max-w-[200px]",
                            isCurrentUser && "text-white"
                          )}>
                            {name}
                          </p>
                          <div className="shrink-0 flex items-center">
                            <RankIcon rank={rank} size="xs" />
                          </div>
                        </div>
                      </div>

                      {/* Уровень (LVL) - Скрываем на мобилках */}
                      <div className="hidden sm:flex w-24 flex-col items-center shrink-0">
                        <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-muted-foreground uppercase">
                          Ур. {leader.duel_pass_level}
                        </div>
                      </div>

                      {/* Season Points (SP) */}
                      <div className="w-24 text-right shrink-0">
                        <p className={cn(
                          "font-mono font-black tabular-nums tracking-tighter",
                          isCurrentUser ? "text-white text-lg" : "text-white/90 text-sm md:text-base"
                        )}>
                          {(leader.season_points ?? 0).toLocaleString("ru-RU")}
                          <span className="text-[9px] ml-1 opacity-50 uppercase font-black">SP</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* СТИКИ-ФУТЕР ПОЛЬЗОВАТЕЛЯ */}
            {profileId && !isUserInTop && userPositionData && (
              <div className="sticky bottom-4 mx-4 p-5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.6)] z-30 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center font-black text-white shadow-inner transform rotate-3">
                      {userPositionData.position}
                    </div>
                    <UserAvatar profileId={profileId} size="lg" className="ring-4 ring-white/30 shadow-2xl" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black text-white leading-none">Ты</p>
                        <Badge className="bg-white/20 hover:bg-white/30 text-[9px] uppercase font-black text-white border-0 py-0 px-1.5 h-4">
                          LVL {userPositionData?.user_data?.duel_pass_level || 1}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-white/80 font-bold mt-1.5 uppercase tracking-wider flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        До топ-10: <span className="text-white font-black">1.2k XP</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white font-mono tabular-nums leading-none">
                      {(userPositionData?.user_data?.season_points ?? userPositionData?.user_data?.duel_pass_xp ?? 0).toLocaleString()}
                      <span className="text-[10px] ml-1 text-white/60">SP</span>
                    </p>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.2em] mt-1">Твой прогресс</p>
                  </div>
                </div>
              </div>
            )}

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
          </div>
        )}
      </motion.div>

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

