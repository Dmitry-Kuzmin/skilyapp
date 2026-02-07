import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCountry } from "@/contexts/CountryContext";
import { Swords, Zap, CreditCard, Puzzle, Languages, Shield, Flag, TrendingUp, Crown, Trophy, Brain, Gamepad2, Hourglass, Snowflake, Timer, Car, AlertTriangle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import Layout from "@/components/Layout";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { PaywallModal } from "@/components/monetization/PaywallModal";
import { TermProgressModal } from "@/components/TermProgressModal";
import { DuelCreateModal } from "@/components/duel/DuelCreateModal";
import { AuthModalNew as AuthModal } from "@/components/AuthModalNew";
import { useModal } from "@/hooks/useModal";
import { isTelegramMiniApp } from "@/lib/telegram";
import { motion } from "@/components/optimized/Motion";
import { useGamesStats, useOnlinePlayers } from "@/hooks/useGamesData";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { cn } from "@/lib/utils";

// Fallback игроки для отображения, пока загружаются реальные
const fallbackPlayers = [
  { id: "fallback-1", name: "Lola", photoUrl: null, initials: "LO" },
  { id: "fallback-2", name: "David", photoUrl: null, initials: "DA" },
  { id: "fallback-3", name: "Inés", photoUrl: null, initials: "IN" },
];

const Games = () => {
  const { language } = useLanguage();
  const { selectedCountry } = useCountry();
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isDuelModalOpen, setIsDuelModalOpen] = useState(false);
  const [duelInitialTab, setDuelInitialTab] = useState<'random' | 'friend'>('random');
  const { openModal: openBoostShop } = useModal('BOOST_SHOP');
  const { enabled: duelsEnabled } = useFeatureFlag('duels_enabled', true);
  const { isAuthenticated } = useUserContext();
  const isTelegramUser = isTelegramMiniApp();

  const handleActionClick = useCallback((action: () => void) => {
    if (!isAuthenticated && !isTelegramUser) {
      setIsAuthModalOpen(true);
      return;
    }
    action();
  }, [isAuthenticated, isTelegramUser]);

  const openDuelModal = useCallback((mode: 'random' | 'friend') => {
    setDuelInitialTab(mode);
    setIsDuelModalOpen(true);
  }, []);

  const handleDuelCreated = useCallback((id: string, code: string) => {
    navigate(`/games/duel?duelId=${id}`);
    setIsDuelModalOpen(false);
  }, [navigate]);

  // ОПТИМИЗАЦИЯ: Используем React Query hooks вместо useState + useEffect
  const { data: stats, isLoading: isLoadingStats } = useGamesStats(profileId);
  const { data: onlineData } = useOnlinePlayers();

  const onlinePlayers = onlineData?.players || [];
  const onlineCount = onlineData?.count || 0;

  // Fallback значения для stats
  const safeStats = stats || { gamesPlayed: 0, studiedTerms: 0, averageResult: 0 };

  const games = [
    {
      id: 1,
      title: "Дуэль с другом",
      description: "Соревнуйся с другом или ботом на знание ПДД",
      icon: Swords,
      color: "primary",
      premium: false,
      difficulty: "Средняя",
      route: "/games/duel",
      featured: true,
      gradient: "from-violet-600 via-purple-600 to-indigo-600",
    },
    {
      id: 2,
      title: "Гонка",
      description: "Переведи максимум слов за ограниченное время",
      icon: Zap,
      color: "secondary",
      premium: false,
      difficulty: "Лёгкая",
      route: "/games/race",
      featured: true,
      gradient: "from-cyan-600 via-blue-600 to-indigo-600",
    },
    {
      id: 3,
      title: "Флэш-карточки",
      description: "Классический метод изучения с карточками",
      icon: CreditCard,
      color: "success",
      premium: false,
      difficulty: "Лёгкая",
      route: "/games/flashcards",
      gradient: "from-emerald-600 to-teal-600",
    },
    {
      id: 4,
      title: "Перекрёстки",
      description: "Разрули пробку! Выбери порядок проезда перекрёстка",
      icon: AlertTriangle,
      color: "warning",
      premium: false,
      difficulty: "Средняя",
      route: "/games/intersection",
      gradient: "from-orange-600 to-red-600",
      featured: true,
    },
    {
      id: 6,
      title: "Четыре варианта",
      description: "Выбери правильный перевод термина из четырех вариантов",
      icon: Languages,
      color: "success",
      premium: false,
      difficulty: "Средняя",
      route: "/games/four-variants",
      gradient: "from-yellow-600 to-orange-600",
    },
    {
      id: 8,
      title: "Угадай Знак",
      description: "Проверь свои знания дорожных знаков в премиум игре",
      icon: Shield,
      color: "secondary",
      premium: false,
      difficulty: "Средняя",
      route: "/games/guess-sign",
      gradient: "from-rose-600 to-red-600",
    },
    {
      id: 9,
      title: "Дорожная Гонка",
      description: "Марафон тестов в формате гонки по трассе Испании",
      icon: Flag,
      color: "primary",
      premium: false,
      difficulty: "Сложная",
      route: "/games/road-race",
      gradient: "from-blue-600 to-cyan-600",
    },
  ];

  const difficultyColors = {
    "Лёгкая": "success",
    "Средняя": "warning",
    "Сложная": "destructive",
  };

  // Smart Filtering for Games
  const filteredGames = games.filter(game => {
    // ID 1: Duel (Universal) - Keep (hide from list as it's featured above)
    if (game.id === 1) return true;

    // ID 2: Race (Vocabulary Translation)
    // Logic: Only for SPAIN content, but NOT for Spanish interface users (natives)
    // They don't need to translate their own language.
    if (game.id === 2) {
      const isSpain = selectedCountry?.code === 'es';
      const isNotSpanishLang = language !== 'es';
      return isSpain && isNotSpanishLang;
    }

    // ID 9: Road Race (Marathon) - Seems like DGT/Spain specific content
    if (game.id === 9) {
      return selectedCountry?.code === 'es';
    }

    // Default: Show all other games
    return true;
  });

  return (
    <>
      <Layout>
        <div className="min-h-screen bg-background p-6 md:p-10 font-sans pb-6 text-foreground">
          <div className="max-w-[1370px] mx-auto space-y-8">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fade-in">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
                  Игровая зона
                </h1>
                <p className="text-muted-foreground font-medium text-lg">
                  Выбирай режим и прокачивай навыки
                </p>
              </div>

              {/* Stats Badges - Style from Dashboard - Always on one line */}
              <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
                {/* Games Played Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 backdrop-blur-sm shadow-lg shadow-violet-500/10 flex-shrink-0 whitespace-nowrap">
                  <Trophy className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-violet-700 dark:text-violet-100">
                    {safeStats.gamesPlayed} <span className="text-violet-600/70 dark:text-violet-300/70 font-normal">игр</span>
                  </span>
                </div>

                {/* Terms Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 backdrop-blur-sm shadow-lg shadow-emerald-500/10 flex-shrink-0 whitespace-nowrap">
                  <Brain className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-emerald-700 dark:text-emerald-100">
                    {safeStats.studiedTerms} <span className="text-emerald-600/70 dark:text-emerald-300/70 font-normal">терминов</span>
                  </span>
                </div>

                {/* Result Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur-sm shadow-lg shadow-amber-500/10 flex-shrink-0 whitespace-nowrap">
                  <TrendingUp className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-amber-700 dark:text-amber-100">
                    {safeStats.averageResult}% <span className="text-amber-600/70 dark:text-amber-300/70 font-normal">рез.</span>
                  </span>
                </div>
              </div>
            </div>

            {/* DUEL HERO CARD - Dashboard Style */}
            <div className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "relative w-full overflow-hidden rounded-[2rem] shadow-2xl group border",
                  duelsEnabled
                    ? "cursor-pointer border-white/10 rounded-[2.5rem]"
                    : "cursor-not-allowed rounded-[2rem] bg-gradient-to-br from-cyan-900 via-blue-900 to-slate-900 border-cyan-500/30 shadow-[0_0_40px_rgba(8,145,178,0.2)]"
                )}
                style={duelsEnabled ? {
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                  // ОПТИМИЗАЦИЯ: Явно указываем pointer-events и touch-action для мгновенной отзывчивости
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                } : {
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onClick={(e) => {
                  if (!duelsEnabled) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  // ОПТИМИЗАЦИЯ: Предотвращаем двойные клики и улучшаем обработку
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/games/duel');
                }}
                onTouchStart={(e) => {
                  // ОПТИМИЗАЦИЯ: Обработка touch событий для мгновенной реакции
                  e.stopPropagation();
                }}
              >
                {/* Noise texture - только для активной карточки */}
                {duelsEnabled && (
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("/noise.svg")' }}></div>
                )}

                {/* Animated Background Gradients - только для активной карточки */}
                {duelsEnabled && (
                  <>
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/30 to-blue-600/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                  </>
                )}

                {/* Frost Icon для замороженной карточки */}
                {!duelsEnabled && (
                  <div className="absolute -right-10 -bottom-10 w-56 h-56">
                    <Snowflake
                      className="w-full h-full text-cyan-200/20 rotate-12 animate-pulse"
                      style={{
                        filter: 'drop-shadow(0 0 30px rgba(165, 243, 252, 0.15)) drop-shadow(0 0 60px rgba(165, 243, 252, 0.1))',
                      }}
                    />
                  </div>
                )}

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
                  {/* Left Content */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-md shadow-lg",
                        duelsEnabled
                          ? "bg-white/10 border border-white/20"
                          : "bg-white/10 border border-white/20"
                      )}>
                        <Crown className={cn(
                          "w-4 h-4",
                          duelsEnabled ? "text-yellow-300 fill-yellow-300" : "text-cyan-300 fill-cyan-300"
                        )} />
                        <span className={cn(
                          "text-sm font-bold",
                          duelsEnabled ? "text-white" : "text-cyan-300"
                        )}>Главный режим</span>
                      </div>
                      <h2 className={cn(
                        "text-5xl md:text-7xl font-black tracking-tight leading-[0.9] drop-shadow-lg",
                        duelsEnabled ? "text-white" : "text-cyan-100"
                      )}>
                        ДУЭЛЬ
                      </h2>
                      <p className={cn(
                        "text-lg md:text-xl font-medium max-w-md leading-relaxed",
                        duelsEnabled
                          ? "text-white/90"
                          : "text-cyan-200/80"
                      )}>
                        {duelsEnabled
                          ? "Сразись с другом или случайным соперником в битве знаний. Ставки, рейтинг и слава ждут!"
                          : "❄️ Арена временно замерзла. Слишком много горячих битв! Мы остужаем сервера, чтобы вы могли вернуться в бой с новыми силами."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-6 items-center">
                      {/* Split Action Buttons - Random & Friend */}
                      {duelsEnabled ? (
                        <div className="flex gap-3">
                          {/* Primary: Быстрый бой (Random Match) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(() => openDuelModal('random'));
                            }}
                            className="group relative h-14 sm:h-16 px-6 sm:px-8 rounded-full font-black text-sm sm:text-base bg-white text-indigo-600 shadow-[0_10px_30px_rgba(255,255,255,0.3)] hover:shadow-[0_20px_40px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 cursor-pointer transition-all duration-300 flex items-center gap-2 sm:gap-3 overflow-hidden flex-grow"
                          >
                            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="hidden sm:inline">Быстрый бой</span>
                            <span className="sm:hidden">Быстрый</span>
                            {/* Shimmer */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-indigo-100/50 to-transparent" />
                          </button>

                          {/* Secondary: С другом (Friend Duel) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(() => openDuelModal('friend'));
                            }}
                            className="group relative h-14 sm:h-16 px-5 sm:px-6 rounded-full font-bold text-sm sm:text-base bg-white/20 backdrop-blur-sm text-white border-2 border-white/50 hover:bg-white/30 hover:border-white/70 hover:scale-105 active:scale-95 cursor-pointer transition-all duration-300 flex items-center gap-2 overflow-hidden"
                          >
                            <Users className="w-5 h-5" />
                            <span className="hidden sm:inline">С другом</span>
                            <span className="sm:hidden">Друг</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled
                          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold tracking-wide cursor-not-allowed backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:bg-cyan-500/15 transition-colors"
                        >
                          <Timer className="w-5 h-5" />
                          <span>Система остывает ❄️</span>
                        </button>
                      )}

                      {duelsEnabled && (
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                          <div className="flex -space-x-3">
                            {(onlinePlayers.length ? onlinePlayers : fallbackPlayers).map((player) => {
                              const isRealUser = player.id && !player.id.startsWith('fallback-');

                              if (isRealUser) {
                                return (
                                  <UserAvatar
                                    key={player.id}
                                    profileId={player.id}
                                    size="sm"
                                    className="-ml-3 first:ml-0 border-2 border-indigo-400/70"
                                    showPremiumGlow={false}
                                  />
                                );
                              }

                              return (
                                <Avatar
                                  key={player.id}
                                  className="w-9 h-9 border-2 border-indigo-400/70 shadow-sm shadow-indigo-500/20 bg-card -ml-3 first:ml-0"
                                >
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-400/30 to-purple-400/30 text-white text-xs font-bold">
                                    {player.initials}
                                  </AvatarFallback>
                                </Avatar>
                              );
                            })}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-sm leading-none">{onlineCount}+</span>
                            <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider">Онлайн</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Visual */}
                  {duelsEnabled && (
                    <div className="hidden lg:flex justify-center items-center relative">
                      <motion.div
                        animate={{
                          y: [0, -20, 0],
                          rotate: [0, 5, 0]
                        }}
                        transition={{
                          duration: 6,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="relative z-10"
                      >
                        <div className="w-80 h-80 rounded-[3rem] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl border border-white/30 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] transform rotate-6 group-hover:rotate-12 transition-transform duration-700">
                          <Swords className="w-40 h-40 text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all duration-300" />
                        </div>

                        {/* Floating elements */}
                        <div className="absolute -top-10 -right-10 p-5 rounded-3xl bg-gradient-to-br from-yellow-400/30 to-orange-500/30 backdrop-blur-xl border border-yellow-400/40 shadow-xl animate-bounce delay-700">
                          <Trophy className="w-10 h-10 text-yellow-200" />
                        </div>
                        <div className="absolute -bottom-5 -left-10 p-5 rounded-3xl bg-gradient-to-br from-cyan-400/30 to-blue-500/30 backdrop-blur-xl border border-cyan-400/40 shadow-xl animate-bounce delay-1000">
                          <Zap className="w-10 h-10 text-cyan-200" />
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Other Games Grid - Dashboard Style (Darker, Glassmorphism) */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-xl bg-card border border-border">
                  <Gamepad2 className="w-6 h-6 text-indigo-400" />
                </div>
                Другие режимы
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGames.filter(g => g.id !== 1).map((game, index) => {
                  const Icon = game.icon;
                  // Race is still featured but smaller than Duel
                  const isFeatured = game.id === 2;

                  // Map game colors to tailwind classes
                  const colorMap: Record<string, {
                    base: string;
                    border: string;
                    shadow: string;
                    iconBg: string;
                    icon: string;
                    titleHover: string;
                    gradient: string;
                  }> = {
                    primary: {
                      base: 'violet',
                      border: 'hover:border-violet-500/50',
                      shadow: 'hover:shadow-violet-500/10',
                      iconBg: 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/30 shadow-violet-500/10',
                      icon: 'text-violet-400',
                      titleHover: 'group-hover:text-violet-300',
                      gradient: 'from-violet-500/5'
                    },
                    secondary: {
                      base: 'blue',
                      border: 'hover:border-blue-500/50',
                      shadow: 'hover:shadow-blue-500/10',
                      iconBg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 shadow-blue-500/10',
                      icon: 'text-blue-400',
                      titleHover: 'group-hover:text-blue-300',
                      gradient: 'from-blue-500/5'
                    },
                    success: {
                      base: 'emerald',
                      border: 'hover:border-emerald-500/50',
                      shadow: 'hover:shadow-emerald-500/10',
                      iconBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 shadow-emerald-500/10',
                      icon: 'text-emerald-400',
                      titleHover: 'group-hover:text-emerald-300',
                      gradient: 'from-emerald-500/5'
                    },
                    warning: {
                      base: 'amber',
                      border: 'hover:border-amber-500/50',
                      shadow: 'hover:shadow-amber-500/10',
                      iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 shadow-amber-500/10',
                      icon: 'text-amber-400',
                      titleHover: 'group-hover:text-amber-300',
                      gradient: 'from-amber-500/5'
                    },
                    destructive: {
                      base: 'red',
                      border: 'hover:border-red-500/50',
                      shadow: 'hover:shadow-red-500/10',
                      iconBg: 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 shadow-red-500/10',
                      icon: 'text-red-400',
                      titleHover: 'group-hover:text-red-300',
                      gradient: 'from-red-500/5'
                    },
                  };

                  const theme = colorMap[game.color] || colorMap.primary;

                  return (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
                      className={`
                        ${isFeatured ? 'md:col-span-2' : 'col-span-1'}
                        relative overflow-hidden rounded-[2rem] p-6 md:p-8 cursor-pointer group
                        bg-card/60 dark:bg-card/40 backdrop-blur-sm border border-border
                        ${theme.border} hover:bg-card/80 dark:hover:bg-card/60
                        shadow-lg hover:shadow-xl ${theme.shadow}
                        transition-colors duration-150
                        hover:-translate-y-1
                      `}
                      style={{
                        // ОПТИМИЗАЦИЯ: Явно указываем pointer-events и touch-action для мгновенной отзывчивости
                        pointerEvents: 'auto',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      onClick={(e) => {
                        // ОПТИМИЗАЦИЯ: Предотвращаем двойные клики и улучшаем обработку
                        e.preventDefault();
                        e.stopPropagation();
                        if (game.premium && !isPremium) {
                          setPaywallOpen(true);
                        } else if (game.route) {
                          navigate(game.route);
                        }
                      }}
                      onTouchStart={(e) => {
                        // ОПТИМИЗАЦИЯ: Обработка touch событий для мгновенной реакции
                        e.stopPropagation();
                      }}
                    >
                      {/* Subtle Gradient Background on Hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                      {/* Premium badge */}
                      {game.premium && (
                        <div className="absolute top-4 right-4 z-20">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none font-bold shadow-lg px-3 py-1">
                            Premium
                          </Badge>
                        </div>
                      )}

                      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div className="flex justify-between items-start">
                          {/* Icon Container - Dashboard Style */}
                          <div className={`
                              w-14 h-14 rounded-2xl 
                              ${theme.iconBg}
                              flex items-center justify-center
                              group-hover:scale-110 transition-transform duration-300
                           `}>
                            <Icon className={`w-7 h-7 ${theme.icon}`} />
                          </div>

                          <Badge variant="outline" className="border-border text-muted-foreground bg-card/50">
                            {game.difficulty}
                          </Badge>
                        </div>

                        <div>
                          <h3 className={`text-2xl font-bold text-foreground mb-2 tracking-tight ${theme.titleHover} transition-colors`}>
                            {game.title}
                          </h3>
                          <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                            {game.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </Layout>

      {/* Modals */}
      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
      />

      <TermProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
      />

      <DuelCreateModal
        open={isDuelModalOpen}
        onClose={() => setIsDuelModalOpen(false)}
        initialTab={duelInitialTab}
        onDuelCreated={handleDuelCreated}
      />

      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
      />
    </>
  );
};

export default Games;
