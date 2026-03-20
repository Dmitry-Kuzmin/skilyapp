import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCountry } from "@/contexts/CountryContext";
import { Swords, Zap, CreditCard, Puzzle, Languages, Shield, Flag, TrendingUp, Crown, Trophy, Brain, Gamepad2, Hourglass, Snowflake, Timer, Car, AlertTriangle, Users, Lock } from "lucide-react";
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

import { AuthModalNew as AuthModal } from "@/components/AuthModalNew";
import { isTelegramMiniApp } from "@/lib/telegram";
import { motion } from "@/components/optimized/Motion";
import { useGamesStats, useOnlinePlayers } from "@/hooks/useGamesData";
import { useProfileData } from "@/hooks/useProfileData";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { cn } from "@/lib/utils";
import { OnlinePlayers } from "@/components/shared/OnlinePlayers";

// Fallback игроки для отображения, пока загружаются реальные
const fallbackPlayers = [
  { id: "fallback-1", name: "Lola", photoUrl: null, initials: "LO" },
  { id: "fallback-2", name: "David", photoUrl: null, initials: "DA" },
  { id: "fallback-3", name: "Inés", photoUrl: null, initials: "IN" },
];

const Games = () => {
  const { language, t } = useLanguage();
  const { selectedCountry } = useCountry();
  const navigate = useNavigate();
  const { user, profileId, supabaseUser } = useUserContext();
  const { isPremium } = usePremium();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const { enabled: duelsEnabled } = useFeatureFlag('duels_enabled', true);
  const { isAuthenticated } = useUserContext();
  const isTelegramUser = isTelegramMiniApp();

  const handleDuelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated && !isTelegramUser) {
      setIsAuthModalOpen(true);
      return;
    }
    navigate('/games/duel');
  }, [isAuthenticated, isTelegramUser, navigate]);

  // ОПТИМИЗАЦИЯ: Используем React Query hooks вместо useState + useEffect
  const { data: stats, isLoading: isLoadingStats } = useGamesStats(profileId);
  const { profileData } = useProfileData(profileId);
  const { data: onlineData } = useOnlinePlayers();

  const onlinePlayers = onlineData?.players || [];
  const onlineCount = onlineData?.count || 1240;

  // Получаем актуальный аватар из профиля (приоритет) или из метаданных
  const currentUserPhoto = profileData?.photo_url || user?.photo_url || supabaseUser?.user_metadata?.avatar_url || null;

  // Fallback значения для stats
  const safeStats = stats || { gamesPlayed: 0, studiedTerms: 0, averageResult: 0 };

  const games = [
    {
      id: 1,
      title: t('gamesPage.gameTitles.duel'),
      description: t('gamesPage.gameDescriptions.duel'),
      icon: Swords,
      color: "primary",
      premium: false,
      difficulty: t('gamesPage.difficulties.medium'),
      route: "/games/duel",
      featured: true,
      gradient: "from-violet-600 via-purple-600 to-indigo-600",
    },
    {
      id: 2,
      title: t('gamesPage.gameTitles.race'),
      description: t('gamesPage.gameDescriptions.race'),
      icon: Zap,
      color: "secondary",
      premium: false,
      difficulty: t('gamesPage.difficulties.easy'),
      route: "/games/race",
      featured: true,
      gradient: "from-cyan-600 via-blue-600 to-indigo-600",
    },
    {
      id: 3,
      title: t('gamesPage.gameTitles.flashcards'),
      description: t('gamesPage.gameDescriptions.flashcards'),
      icon: CreditCard,
      color: "success",
      premium: false,
      difficulty: t('gamesPage.difficulties.easy'),
      route: "/games/flashcards",
      gradient: "from-emerald-600 to-teal-600",
    },
    {
      id: 4,
      title: t('gamesPage.gameTitles.intersections'),
      description: t('gamesPage.gameDescriptions.intersections'),
      icon: AlertTriangle,
      color: "warning",
      premium: false,
      difficulty: t('gamesPage.difficulties.medium'),
      route: "/games/intersection",
      gradient: "from-orange-600 to-red-600",
      featured: true,
    },
    {
      id: 6,
      title: t('gamesPage.gameTitles.lexicon'),
      description: t('gamesPage.gameDescriptions.lexicon'),
      icon: Brain,
      color: "primary",
      premium: false,
      difficulty: t('gamesPage.difficulties.medium'),
      route: "/games/four-variants",
      gradient: "from-indigo-600 via-purple-600 to-pink-600",
    },
    {
      id: 8,
      title: t('gamesPage.gameTitles.guessSign'),
      description: t('gamesPage.gameDescriptions.guessSign'),
      icon: Shield,
      color: "secondary",
      premium: false,
      difficulty: t('gamesPage.difficulties.medium'),
      route: "/games/guess-sign",
      gradient: "from-rose-600 to-red-600",
    },
    {
      id: 9,
      title: t('gamesPage.gameTitles.roadRace'),
      description: t('gamesPage.gameDescriptions.roadRace'),
      icon: Flag,
      color: "primary",
      premium: false,
      difficulty: t('gamesPage.difficulties.hard'),
      route: "/games/road-race",
      gradient: "from-blue-600 to-cyan-600",
    },
    {
      id: 10,
      title: t('gamesPage.gameTitles.blitz'),
      description: t('gamesPage.gameDescriptions.blitz'),
      icon: Zap,
      color: "warning",
      premium: false,
      difficulty: t('gamesPage.difficulties.special'),
      route: "/test/blitz?count=20&timer=300",
      gradient: "from-orange-500 via-amber-500 to-yellow-500",
      featured: true,
    },
  ];

  // Smart Filtering for Games
  const filteredGames = games.filter(game => {
    // ID 1: Duel (Universal) - Keep (hide from list as it's featured above)
    if (game.id === 1) return true;

    const countryCode = selectedCountry?.code?.toLowerCase();

    // ID 2: Race (Vocabulary Translation)
    // Logic: Only for SPAIN content, but NOT for Spanish interface users (natives)
    // They don't need to translate their own language.
    if (game.id === 2) {
      const isSpain = countryCode === 'es';
      const isNotSpanishLang = language !== 'es';
      return isSpain && isNotSpanishLang;
    }

    // ID 9: Road Race (Marathon) - DGT/Spain specific content
    if (game.id === 9) {
      return countryCode === 'es';
    }

    // Default: Show all other games
    return true;
  });

  return (
    <>
      <Layout>
        <div className="min-h-screen bg-transparent px-3 py-6 md:px-10 md:py-10 font-sans pb-6 text-foreground">
          <div className="max-w-[1370px] mx-auto space-y-6 md:space-y-8">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fade-in">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-2">
                  {t('gamesPage.title')}
                </h1>
                <p className="text-muted-foreground font-medium text-lg">
                  {t('gamesPage.subtitle')}
                </p>
              </div>

              {/* Stats Badges - Style from Dashboard - Always on one line */}
              <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
                {/* Games Played Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/10 backdrop-blur-sm shadow-lg shadow-violet-500/5 flex-shrink-0 whitespace-nowrap">
                  <Trophy className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-violet-700 dark:text-violet-100">
                    {safeStats.gamesPlayed} <span className="text-violet-600/70 dark:text-violet-300/70 font-normal">{t('gamesPage.stats.played')}</span>
                  </span>
                </div>

                {/* Terms Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/10 backdrop-blur-sm shadow-lg shadow-emerald-500/5 flex-shrink-0 whitespace-nowrap">
                  <Brain className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-emerald-700 dark:text-emerald-100">
                    {safeStats.studiedTerms} <span className="text-emerald-600/70 dark:text-emerald-300/70 font-normal">{t('gamesPage.stats.terms')}</span>
                  </span>
                </div>

                {/* Result Badge */}
                <div className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1.5 xs:py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/10 backdrop-blur-sm shadow-lg shadow-amber-500/5 flex-shrink-0 whitespace-nowrap">
                  <TrendingUp className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-xs xs:text-sm font-bold text-amber-700 dark:text-amber-100">
                    {safeStats.averageResult}% <span className="text-amber-600/70 dark:text-amber-300/70 font-normal">{t('gamesPage.stats.result')}</span>
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
                  "relative w-full overflow-hidden rounded-[1.5rem] md:rounded-[2rem] shadow-2xl group",
                  duelsEnabled
                    ? "cursor-pointer rounded-[2rem] md:rounded-[2.5rem]"
                    : "cursor-not-allowed rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-br from-cyan-900 via-blue-900 to-slate-900 shadow-[0_0_40px_rgba(8,145,178,0.2)]"
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
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("/noise.svg")' }}></div>
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

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 p-6 md:p-12 items-center">
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
                        )}>{t('gamesPage.featured.badge')}</span>
                      </div>
                      <h2 className={cn(
                        "text-5xl md:text-7xl font-black tracking-tight leading-[0.9] drop-shadow-lg",
                        duelsEnabled ? "text-white" : "text-cyan-100"
                      )}>
                        {t('gamesPage.featured.title')}
                      </h2>
                      <p className={cn(
                        "text-lg md:text-xl font-medium max-w-md leading-relaxed",
                        duelsEnabled
                          ? "text-white/90"
                          : "text-cyan-200/80"
                      )}>
                        {duelsEnabled
                          ? t('gamesPage.featured.description')
                          : t('gamesPage.featured.frozenDescription')}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-6 items-center">
                      {/* Single CTA Button → /games/duel */}
                      {duelsEnabled ? (
                        <button
                          onClick={handleDuelClick}
                          className="group relative h-14 sm:h-16 px-8 sm:px-10 rounded-full font-black text-sm sm:text-base bg-white text-indigo-600 shadow-[0_10px_30px_rgba(255,255,255,0.35)] hover:shadow-[0_20px_50px_rgba(255,255,255,0.45)] hover:scale-105 active:scale-95 cursor-pointer transition-all duration-300 flex items-center gap-3 overflow-hidden"
                        >
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-indigo-100/60 to-transparent pointer-events-none" />
                          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-4 ring-white/30 pointer-events-none" />
                          <Swords className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                          <span className="relative z-10">{t('gamesPage.featured.button')}</span>
                          <div className="relative z-10 flex items-center gap-1 ml-1 opacity-60">
                            <div className="w-1 h-1 rounded-full bg-indigo-400" />
                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold tracking-wide cursor-not-allowed backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:bg-cyan-500/15 transition-colors"
                        >
                          <Timer className="w-5 h-5" />
                          <span>{t('gamesPage.featured.coolingButton')}</span>
                        </button>
                      )}

                      {duelsEnabled && (
                        <OnlinePlayers
                          baseCount={onlineCount}
                          players={onlinePlayers}
                          currentUserPhoto={currentUserPhoto}
                          currentUserId={profileId}
                        />
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
                {t('gamesPage.otherModes')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGames.filter(g => g.id !== 1).map((game, index) => {
                  const Icon = game.icon;
                  // Race is still featured but smaller than Duel
                  const isFeatured = game.id === 2;
                  
                  // Временная блокировка для разработки (IDs 4 и 9)
                  const minLevel = [4, 9].includes(game.id) ? 10 : 0;
                  const isLocked = minLevel > 0;

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

                  const theme = isLocked ? colorMap.primary : (colorMap[game.color] || colorMap.primary);

                  return (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
                      className={`
                        ${isFeatured ? 'md:col-span-2' : 'col-span-1'}
                        relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 cursor-pointer group
                        bg-card/60 dark:bg-card/40 backdrop-blur-sm border border-border
                        ${isLocked ? 'opacity-70 grayscale-[0.4] cursor-not-allowed' : `${theme.border} hover:bg-card/80 dark:hover:bg-card/60 shadow-lg hover:shadow-xl ${theme.shadow} hover:-translate-y-1`}
                        transition-all duration-300
                      `}
                      style={{
                        pointerEvents: 'auto',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isLocked) return;
                        if (game.premium && !isPremium) {
                          setPaywallOpen(true);
                        } else if (game.route) {
                          navigate(game.route);
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {/* Interaction Overlay for Locked State */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] z-10" />
                      )}

                      {/* Subtle Gradient Background on Hover */}
                      {!isLocked && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-4 right-4 z-20 flex gap-2">
                        {isLocked && (
                          <Badge className="bg-slate-900/80 text-slate-100 border-none font-black shadow-xl px-3 py-1.5 flex items-center gap-1.5 backdrop-blur-md ring-1 ring-white/10">
                            <Lock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>LVL 10</span>
                          </Badge>
                        )}
                        {game.premium && !isLocked && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none font-bold shadow-lg px-3 py-1">
                            Premium
                          </Badge>
                        )}
                      </div>

                      <div className="relative z-20 flex flex-col h-full justify-between gap-6">
                        <div className="flex justify-between items-start">
                          <div className={`
                              w-14 h-14 rounded-2xl 
                              ${isLocked ? 'bg-slate-800/50 border-slate-700/50 text-slate-500' : `${theme.iconBg} ${theme.icon}`}
                              flex items-center justify-center
                              ${!isLocked && 'group-hover:scale-110'} transition-transform duration-300
                           `}>
                            <Icon className="w-7 h-7" />
                          </div>

                          {!isLocked && (
                            <Badge variant="outline" className="border-border text-muted-foreground bg-card/50">
                              {game.difficulty}
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h3 className={`text-2xl font-bold text-foreground mb-2 tracking-tight ${!isLocked && theme.titleHover} transition-colors`}>
                            {game.title}
                          </h3>
                          <p className="text-muted-foreground font-medium text-sm leading-relaxed line-clamp-2">
                            {isLocked ? t('gamesPage.lockedLabel') : game.description}
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
        open={isProgressModalOpen}
        onOpenChange={setIsProgressModalOpen}
      />



      <AuthModal
        open={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};

export default Games;
