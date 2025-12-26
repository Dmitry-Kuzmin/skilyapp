import React, { useMemo, useCallback, useState, lazy, Suspense } from 'react';
import { Power, Volume2, Play, Bell, CheckCircle, Star, Circle, Zap, FileText, Coins, BookOpen, ArrowRight, Loader2, Target, BarChart2, Settings } from 'lucide-react';
import { ContextSwitcher } from '@/components/shared';
import { usePDDContext } from '@/contexts/PDDContext';
import { usePDDTickets } from '@/hooks/usePDDTickets';
import { useTopics } from '@/hooks/useTopics';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES_CONFIG } from '@/types/pdd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import { DashboardSkeleton } from "./DashboardSkeleton";
import { CompactStreakJewel } from '@/components/shared/CompactStreakJewel';

// Lazy load heavy dashboard components
const DailyRewards = lazy(() => import('./DailyRewards').then(m => ({ default: m.DailyRewards })));
const SkilyChat = lazy(() => import('./SkilyChat').then(m => ({ default: m.SkilyChat })));
const ExamReadiness = lazy(() => import('./ExamReadiness').then(m => ({ default: m.ExamReadiness })));
const PremiumCard = lazy(() => import('./PremiumCard').then(m => ({ default: m.PremiumCard })));
const DuelPassInfo = lazy(() => import('./DuelPassInfo').then(m => ({ default: m.DuelPassInfo })));
const DuelPassSeasonModal = lazy(() => import('../monetization/DuelPassSeasonModal').then(m => ({ default: m.DuelPassSeasonModal })));

// Fallback component for lazy loading
const ComponentSkeleton = () => (
  <div className="h-32 bg-slate-800/50 rounded-2xl animate-pulse" />
);

import { playClickSound, playHoverSound, playAlertSound, playSuccessSound } from '@/services/audioService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { useModalRoute } from '@/hooks/useModalRoute';
import { useSettingsStore } from '@/store/settingsStore';

interface DashboardProps {
  stats: {
    averageScore: number;
    currentStreak: number;
    testsCompleted: number;
    accuracy: number;
    coins: number;
    xp?: number;
    level?: number;
  };
  onStartQuiz: () => void;
  onClaimReward: () => void;
  hasClaimedToday: boolean;
  onGetPremium?: () => void;
  profileId?: string | null;
  isClaiming?: boolean;
  readinessStatus?: {
    status: 'start' | 'progress' | 'near' | 'ready' | 'legend';
    statusText: string;
    shortText?: string;
    description?: string;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  onStartQuiz,
  onClaimReward,
  hasClaimedToday,
  onGetPremium,
  profileId,
  isClaiming = false,
  readinessStatus
}) => {
  const [examReadinessExpanded, setExamReadinessExpanded] = React.useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState<'xp' | 'tests' | 'coins'>('xp');
  const { openSettings } = useSettingsStore();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  // Получаем выбранную страну и категорию из контекста
  const { selectedCountry, selectedCategory } = usePDDContext();
  const countryData = COUNTRIES_CONFIG[selectedCountry];

  // Загружаем билеты для России или темы для Испании
  const { data: tickets, isLoading: ticketsLoading } = usePDDTickets(selectedCountry);
  const { data: topics = [], isLoading: topicsLoading } = useTopics();

  // ОПТИМИЗАЦИЯ: Мемоизируем вычисление isDarkTheme для избежания лишних пересчетов
  const isDarkTheme = useMemo(() => (resolvedTheme ?? 'dark') !== 'light', [resolvedTheme]);

  // ОПТИМИЗАЦИЯ: Мемоизируем все вычисления классов для избежания пересчетов при каждом рендере
  const themeClasses = useMemo(() => {
    // УБРАНО: pageBgClass - используем фон из Layout (bg-background) для единообразия
    const heroBackground = isDarkTheme
      ? 'linear-gradient(135deg, #1e1b2e 0%, #2d1b4e 25%, #4c2d7a 50%, #6d4c9e 75%, #8b6fb8 100%)'
      : 'linear-gradient(135deg, #e0ebff 0%, #f0e5ff 30%, #ffe5f0 60%, #ffeef5 100%)';
    const heroShadowClass = isDarkTheme
      ? 'shadow-2xl shadow-purple-900/30'
      : 'shadow-[0_32px_80px_rgba(139,92,246,0.25)]';
    const onlineBadgeClass = isDarkTheme
      ? 'flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap bg-gradient-to-r from-emerald-500/25 to-emerald-600/25 border border-emerald-400/40 backdrop-blur-sm shadow-lg shadow-emerald-500/20'
      : 'flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap bg-white/95 border border-emerald-200/80 shadow-[0_12px_34px_rgba(16,185,129,0.25)] backdrop-blur-sm';
    const statValueClass = isDarkTheme ? 'text-sm sm:text-base md:text-lg font-black text-white' : 'text-sm sm:text-base md:text-lg font-black text-slate-900';
    const statLabelBase = 'text-[9px] xs:text-[10px] sm:text-xs font-semibold';
    const statStartButtonText = isDarkTheme ? 'text-indigo-300' : 'text-purple-600';
    const onlineTextClass = isDarkTheme ? 'text-emerald-200' : 'text-emerald-700';
    const heroNoiseOpacity = isDarkTheme ? 'opacity-[0.15]' : 'opacity-[0.12]';
    const heroHeadingClass = isDarkTheme ? 'text-white drop-shadow-lg' : 'text-slate-900';
    const heroBodyTextClass = isDarkTheme ? 'text-white/90' : 'text-slate-600';
    const xpCardClass = isDarkTheme
      ? 'group relative flex-1 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 rounded-lg xs:rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-yellow-600/15 backdrop-blur-sm border border-yellow-400/40 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 hover:border-yellow-300/60 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden'
      : 'group relative flex-1 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 rounded-lg xs:rounded-xl sm:rounded-2xl bg-white/95 border border-amber-100/90 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 shadow-[0_20px_45px_rgba(251,191,36,0.3)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm';
    const xpOverlayClass = isDarkTheme
      ? 'absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
      : 'absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100 opacity-70 group-hover:opacity-100 transition-opacity duration-300';
    const testsCardClass = isDarkTheme
      ? 'group relative flex-1 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 rounded-lg xs:rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-600/15 backdrop-blur-sm border border-blue-400/40 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 hover:border-blue-300/60 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden'
      : 'group relative flex-1 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 rounded-lg xs:rounded-xl sm:rounded-2xl bg-white/95 border border-blue-100/90 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 shadow-[0_20px_45px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm';
    const testsOverlayClass = isDarkTheme
      ? 'absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
      : 'absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-100 opacity-70 group-hover:opacity-100 transition-opacity duration-300';
    const coinsCardClass = isDarkTheme
      ? 'group relative flex-1 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 rounded-lg xs:rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-600/15 backdrop-blur-sm border border-amber-400/40 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 hover:border-amber-300/60 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden'
      : 'group relative flex-1 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 rounded-lg xs:rounded-xl sm:rounded-2xl bg-white/95 border border-amber-100/90 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 shadow-[0_20px_45px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm';
    const coinsOverlayClass = isDarkTheme
      ? 'absolute inset-0 bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
      : 'absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100 opacity-70 group-hover:opacity-100 transition-opacity duration-300';
    const xpIconColor = isDarkTheme ? 'text-yellow-100' : 'text-amber-600';
    const testsIconColor = isDarkTheme ? 'text-blue-100' : 'text-indigo-600';
    const coinsIconColor = isDarkTheme ? 'text-amber-100' : 'text-amber-600';

    return {
      heroBackground,
      heroShadowClass,
      onlineBadgeClass,
      statValueClass,
      statLabelBase,
      statStartButtonText,
      onlineTextClass,
      heroNoiseOpacity,
      heroHeadingClass,
      heroBodyTextClass,
      xpCardClass,
      xpOverlayClass,
      testsCardClass,
      testsOverlayClass,
      coinsCardClass,
      coinsOverlayClass,
      xpIconColor,
      testsIconColor,
      coinsIconColor,
    };
  }, [isDarkTheme]);

  // ОПТИМИЗАЦИЯ: Мемоизируем вычисление heroStatusKey
  const heroStatusKey = useMemo(() =>
    stats.averageScore >= 75
      ? 'dashboard.heroStatus.ready'
      : stats.averageScore >= 50
        ? 'dashboard.heroStatus.progress'
        : 'dashboard.heroStatus.start',
    [stats.averageScore]
  );

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчики событий
  const handleStartQuiz = useCallback(() => {
    playClickSound();
    onStartQuiz();
  }, [onStartQuiz]);

  const handleExamReadinessExpanded = useCallback((expanded: boolean) => {
    setExamReadinessExpanded(expanded);
  }, []);

  const handleStatClick = useCallback((statType: 'xp' | 'tests' | 'coins') => {
    playClickSound();
    setSelectedStatType(statType);
    setStatsModalOpen(true);
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 pt-4 md:pt-6 pb-6 md:pb-8 font-sans">
      <div className="max-w-[1370px] mx-auto space-y-6">

        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 flex-nowrap min-w-0 max-w-full">
            {/* Умный переключатель контекста (Страна | Категория) */}
            <ContextSwitcher className="shrink-0" />

            {/* Кнопка статистики - Ghost стиль */}
            <button
              onClick={() => {
                playClickSound();
                openSettings();
              }}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full',
                'border transition-all text-[11px] sm:text-xs font-semibold whitespace-nowrap',
                'backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]',
                isDarkTheme
                  ? 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-zinc-200'
                  : 'border-zinc-300/60 bg-white/50 hover:border-zinc-400/80 hover:bg-white/80 text-zinc-700'
              )}
              aria-label="Настройки"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Настройки</span>
            </button>
          </div>
        </div>

        {/* 1. PREMIUM STREAK BANNER (Full Width) */}
        <div className="animate-slide-up mb-2">
          <CompactStreakJewel
            streak={stats.currentStreak}
            label={t('dashboard.streak').toUpperCase()}
            hasClaimedToday={hasClaimedToday}
            onClaim={() => {
              onClaimReward();
            }}
            isClaiming={isClaiming}
            size="lg"
            className="shadow-orange-500/5"
          />
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">

          {/* 1. HERO CARD (Col: 2, Row: 2) */}
          <div
            onMouseEnter={playHoverSound}
            className="md:col-span-2 lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-[2.5rem] text-white p-8 md:p-10 flex flex-col justify-between shadow-2xl group"
            style={{
              background: themeClasses.heroBackground,
            }}
          >
            {/* ... hero content ... */}
            <img
              src="https://grainy-gradients.vercel.app/noise.svg"
              alt=""
              className={`absolute inset-0 w-full h-full object-cover ${themeClasses.heroNoiseOpacity} mix-blend-overlay pointer-events-none`}
              fetchpriority="high"
              loading="eager"
              decoding="async"
              aria-hidden="true"
            />

            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-indigo-900/20 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 shadow-lg shadow-white/10">
                  <Star size={14} className="text-yellow-300 fill-yellow-300 drop-shadow-sm" />
                  <span className="text-xs sm:text-sm font-bold text-white drop-shadow-sm">{t('dashboard.level')} {stats.level || 1}</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row justify-between items-center gap-6 mb-4">
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-3 ${themeClasses.heroHeadingClass}`}>
                    {t('dashboard.heroGreeting')}
                  </h2>
                  <p className={`${themeClasses.heroBodyTextClass} font-medium text-sm sm:text-base md:text-lg leading-relaxed`}>
                    {t('dashboard.heroEfficiencyPrefix')} <strong className="text-white">{stats.averageScore}%</strong>.{' '}
                    {t(heroStatusKey)}
                  </p>
                </div>

                <button
                  onClick={handleStartQuiz}
                  className="group relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 transform-gpu"
                >
                  <div className="absolute inset-[-15%] rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 pointer-events-none bg-gradient-to-br from-white/40 via-purple-200/30 to-indigo-200/40 blur-xl"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white via-purple-50/90 to-indigo-50/90 shadow-[0_20px_50px_rgba(255,255,255,0.4)]"></div>
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <Power size={24} className={`sm:w-7 sm:h-7 md:w-8 md:h-8 ${isDarkTheme ? 'text-indigo-600' : 'text-indigo-600'} mb-1 sm:mb-2 drop-shadow-lg`} />
                    <span className={`${themeClasses.statStartButtonText} font-bold text-[10px] sm:text-xs md:text-sm tracking-wider uppercase`}>
                      {t('dashboard.startButton')}
                    </span>
                  </div>
                </button>
              </div>

              <div className="flex items-stretch gap-1.5 xs:gap-2 sm:gap-2.5">
                <button onClick={() => handleStatClick('xp')} className={themeClasses.xpCardClass}>
                  <div className={themeClasses.xpOverlayClass} />
                  <div className="relative z-10 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 w-full min-w-0">
                    <div className="relative w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg xs:rounded-xl bg-gradient-to-br from-yellow-400/30 via-orange-500/25 to-yellow-500/30 border border-yellow-400/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-yellow-500/25">
                      <Zap className={`w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ${themeClasses.xpIconColor} relative z-10`} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className={`${themeClasses.statLabelBase} ${isDarkTheme ? 'text-yellow-100/90' : 'text-yellow-700/90'} truncate`}>{t('dashboard.stats.xp')}</div>
                      <div className={`${themeClasses.statValueClass} leading-tight ${isDarkTheme ? 'group-hover:text-yellow-50' : 'group-hover:text-yellow-700'} transition-colors duration-200 truncate`}>
                        <span className="truncate block">{(stats.xp || 0).toLocaleString()}</span>
                        <span className={`text-[9px] xs:text-[10px] sm:text-xs font-bold ${isDarkTheme ? 'text-yellow-200/80' : 'text-yellow-600/80'}`}>XP</span>
                      </div>
                    </div>
                  </div>
                </button>
                <button onClick={() => handleStatClick('tests')} className={themeClasses.testsCardClass}>
                  <div className={themeClasses.testsOverlayClass} />
                  <div className="relative z-10 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 w-full min-w-0">
                    <div className="relative w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg xs:rounded-xl bg-gradient-to-br from-blue-400/30 via-indigo-500/25 to-blue-500/30 border border-blue-400/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-blue-500/25">
                      <FileText className={`w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ${themeClasses.testsIconColor} relative z-10`} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className={`${themeClasses.statLabelBase} ${isDarkTheme ? 'text-blue-100/90' : 'text-blue-700/90'} truncate`}>{t('dashboard.stats.tests')}</div>
                      <div className={`${themeClasses.statValueClass} leading-tight ${isDarkTheme ? 'group-hover:text-blue-50' : 'group-hover:text-blue-700'} transition-colors duration-200 truncate`}>{stats.testsCompleted.toLocaleString()}</div>
                    </div>
                  </div>
                </button>
                <button onClick={() => handleStatClick('coins')} className={themeClasses.coinsCardClass}>
                  <div className={themeClasses.coinsOverlayClass} />
                  <div className="relative z-10 flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 w-full min-w-0">
                    <div className="relative w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg xs:rounded-xl bg-gradient-to-br from-amber-400/30 via-yellow-500/25 to-amber-500/30 border border-amber-400/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-amber-500/25">
                      <Coins className={`w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ${themeClasses.coinsIconColor} relative z-10`} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className={`${themeClasses.statLabelBase} ${isDarkTheme ? 'text-amber-100/90' : 'text-amber-700/90'} truncate`}>{t('dashboard.stats.coins')}</div>
                      <div className={`${themeClasses.statValueClass} leading-tight ${isDarkTheme ? 'group-hover:text-amber-50' : 'group-hover:text-amber-700'} transition-colors duration-200 truncate`}>{(stats.coins || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 2. EXAM READINESS (Col: 1, Row: 1) - теперь в новом месте */}
          <div className={`transition-all duration-500 ease-in-out ${examReadinessExpanded
            ? 'md:col-span-2 lg:col-span-2 lg:row-span-2'
            : 'md:col-span-1 lg:col-span-1 lg:row-span-2'
            }`}>
            <Suspense fallback={<ComponentSkeleton />}>
              <ExamReadiness
                averageScore={stats.averageScore}
                testsCompleted={stats.testsCompleted}
                status={readinessStatus?.status}
                statusText={readinessStatus?.statusText}
                shortText={readinessStatus?.shortText}
                description={readinessStatus?.description}
                profileId={profileId}
                onStartTest={handleStartQuiz}
                onExpandedChange={handleExamReadinessExpanded}
              />
            </Suspense>
          </div>

          {/* 3. SKILY CHAT (Col: 1, Row: 2) - видим на всех разрешениях */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 lg:row-span-2">
            <Suspense fallback={<ComponentSkeleton />}>
              <SkilyChat />
            </Suspense>
          </div>

          {/* 4. PREMIUM CARD */}
          <div className="md:col-span-1 lg:col-span-1">
            <Suspense fallback={<ComponentSkeleton />}>
              <PremiumCard onGetPremium={onGetPremium} />
            </Suspense>
          </div>

          {/* 5. DUEL PASS INFO */}
          <div className="md:col-span-1 lg:col-span-1">
            <Suspense fallback={<ComponentSkeleton />}>
              <DuelPassInfo />
            </Suspense>
          </div>


        </div>
      </div>




      {/* Duel Pass Season Modal */}
      <Suspense fallback={null}>
        <DuelPassSeasonModalWrapper />
      </Suspense>
    </div>
  );
};

// Wrapper component для DuelPassSeasonModal с useModalRoute
const DuelPassSeasonModalWrapper = () => {
  const { isOpen, closeModal } = useModalRoute('duel-pass-season');

  return (
    <DuelPassSeasonModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeModal();
        }
      }}
    />
  );
};

