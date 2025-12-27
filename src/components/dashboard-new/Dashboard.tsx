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
import { StartEngineButton } from '@/components/landing/StartEngineButton';

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
  userProfile?: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
    rank?: string | null;
    id?: string;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats: initialStats,
  onStartQuiz,
  onClaimReward,
  hasClaimedToday,
  onGetPremium,
  profileId,
  isClaiming = false,
  readinessStatus,
  userProfile
}) => {
  const stats = { ...initialStats, userProfile }; // Merge for convenience
  const { language, t } = useLanguage();
  const [examReadinessExpanded, setExamReadinessExpanded] = React.useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState<'xp' | 'tests' | 'coins'>('xp');

  const { selectedCountry } = usePDDContext();
  const navigate = useNavigate();
  const { openSettings } = useSettingsStore();
  const { theme, systemTheme } = useTheme();

  // Helper to check if dark mode is active
  const isDarkTheme = useMemo(() => {
    return theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  }, [theme, systemTheme]);

  // Format user data for License Card
  const userData = useMemo(() => {
    const fullName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') ||
      userProfile?.username ||
      (language === 'ru' ? 'КУРСАНТ' : 'PILOT');

    // Generate a cool License ID if none exists
    const licenseId = userProfile?.id?.substring(0, 8).toUpperCase() || '560C5DF8';

    const rank = userProfile?.rank || (language === 'ru' ? 'УЧЕНИК' : 'CADET');

    return {
      fullName,
      lastName: userProfile?.last_name?.toUpperCase() || '',
      firstName: userProfile?.first_name?.toUpperCase() || '',
      licenseId,
      rank: rank.toUpperCase(),
      photoUrl: userProfile?.photo_url
    };
  }, [userProfile, language]);

  const handleExamReadinessExpanded = useCallback((expanded: boolean) => {
    setExamReadinessExpanded(expanded);
  }, []);

  const handleStartQuiz = useCallback(() => {
    playSuccessSound(); // Start engine sound effect ideally
    onStartQuiz();
  }, [onStartQuiz]);

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
            {/* Context Switcher (Country | Category) */}
            <ContextSwitcher className="shrink-0" />

            {/* Settings Button - Icon Only */}
            <button
              onClick={() => {
                playClickSound();
                openSettings();
              }}
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-xl transition-all',
                'backdrop-blur-sm hover:scale-105 active:scale-95',
                isDarkTheme
                  ? 'bg-transparent hover:bg-white/10 text-zinc-400 hover:text-white'
                  : 'bg-transparent hover:bg-black/5 text-zinc-400 hover:text-black'
              )}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">

          {/* 1. HERO CARD (LICENSE STYLE - PREMIUM) */}
          <div
            className={cn(
              "md:col-span-2 lg:col-span-2 lg:row-span-2 relative h-full min-h-[340px] rounded-[2rem] overflow-hidden transition-all hover:scale-[1.005] group select-none shadow-xl",
              isDarkTheme ? "shadow-black/40" : "shadow-slate-200/60"
            )}
            style={{
              background: isDarkTheme
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            }}
          >
            {/* 1. Security Pattern Layer (Guilloche-like) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, ${isDarkTheme ? '#fff' : '#000'} 0, ${isDarkTheme ? '#fff' : '#000'} 1px, transparent 0, transparent 50%)`,
                backgroundSize: '10px 10px'
              }}>
            </div>

            {/* 2. Holographic Noise */}
            <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay pointer-events-none"></div>

            {/* 3. Glow Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

            {/* CONTENT LAYER */}
            <div className="relative z-10 w-full h-full p-6 sm:p-8 flex flex-col">

              {/* HEADER: Flag & Title */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  {/* Country Flag Badge */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 shadow-lg shadow-blue-900/20 border border-blue-400/20 flex flex-col items-center justify-center text-white ring-2 ring-blue-900/10">
                    <span className="text-[10px] opacity-70 mb-[-2px]">★</span>
                    <span className="text-sm font-black tracking-widest">{selectedCountry === 'es' ? 'E' : selectedCountry === 'ru' ? 'RUS' : 'SK'}</span>
                  </div>

                  {/* License Titles */}
                  <div className="flex flex-col">
                    <h2 className={cn("text-xs sm:text-sm font-black tracking-[0.25em] uppercase mb-0.5", isDarkTheme ? "text-indigo-300" : "text-indigo-900")}>
                      {t('dashboard.licenseType') || (language === 'ru' ? 'ВОДИТЕЛЬСКОЕ УДОСТОВЕРЕНИЕ' : 'PERMISO DE CONDUCCIÓN')}
                    </h2>
                    <span className={cn("text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase opacity-60", isDarkTheme ? "text-slate-400" : "text-slate-500")}>
                      {selectedCountry === 'es' ? 'REINO DE ESPAÑA' : 'SKILY ACADEMY • OFFICIAL DOCUMENT'}
                    </span>
                  </div>
                </div>

                {/* EMV Chip (Realistic) */}
                <div className="w-14 h-11 rounded-lg bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 shadow-md relative overflow-hidden ring-1 ring-yellow-600/20 opacity-90">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_24%,rgba(161,98,7,0.3)_25%,rgba(161,98,7,0.3)_26%)]"></div>
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_49%,rgba(161,98,7,0.3)_50%,rgba(161,98,7,0.3)_51%)]"></div>
                  <div className="absolute center w-4 h-3 border border-yellow-700/40 rounded-sm top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                </div>
              </div>

              {/* BODY: Photo & Data */}
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 h-full">

                {/* PHOTO SECTION */}
                <div className="flex-shrink-0 relative group/photo self-start sm:self-auto">
                  <div className={cn(
                    "w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden shadow-lg border-[3px] relative z-10 transition-transform group-hover/photo:scale-[1.02]",
                    isDarkTheme ? "bg-slate-800 border-slate-600" : "bg-slate-200 border-white"
                  )}>
                    {userData.photoUrl ? (
                      <img src={userData.photoUrl} alt="Pilot" className="w-full h-full object-cover grayscale-[0.2] group-hover/photo:grayscale-0 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <span className="text-4xl filter grayscale">🙂</span>
                      </div>
                    )}

                    {/* Holographic Overlay on Photo */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 via-transparent to-blue-500/20 opacity-40 mix-blend-overlay"></div>
                    <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/photo:animate-shimmer rotate-45 transform pointer-events-none"></div>

                    {/* Official Stamps */}
                    {hasClaimedToday && (
                      <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Under Photo Label */}
                  <div className="mt-2 flex justify-center">
                    <span className={cn(
                      "text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border",
                      hasClaimedToday
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                        : "bg-slate-500/10 border-slate-500/30 text-slate-500"
                    )}>
                      {hasClaimedToday ? 'VERIFIED' : 'UNVERIFIED'}
                    </span>
                  </div>
                </div>

                {/* DATA FIELDS & CONSOLE */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">

                  {/* User Data Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">

                    {/* 1. Name */}
                    <div className="col-span-full">
                      <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1 opacity-50", isDarkTheme ? "text-slate-400" : "text-slate-500")}>1. SURNAME / FIRST NAME</div>
                      <div className={cn("text-xl sm:text-2xl font-black uppercase tracking-tight truncate font-sans", isDarkTheme ? "text-white" : "text-slate-900")}>
                        {userData.fullName}
                      </div>
                    </div>

                    {/* 2. Rank */}
                    <div>
                      <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1 opacity-50", isDarkTheme ? "text-slate-400" : "text-slate-500")}>2. RANGO</div>
                      <div className={cn("text-sm font-bold uppercase tracking-wider", isDarkTheme ? "text-indigo-400" : "text-indigo-700")}>
                        {userData.rank}
                      </div>
                    </div>

                    {/* 3. License No */}
                    <div>
                      <div className={cn("text-[9px] font-bold uppercase tracking-widest mb-1 opacity-50", isDarkTheme ? "text-slate-400" : "text-slate-500")}>3. LICENSE NO.</div>
                      <div className={cn("text-sm font-mono font-bold tracking-wider", isDarkTheme ? "text-slate-300" : "text-slate-700")}>
                        {userData.licenseId}
                      </div>
                    </div>
                  </div>

                  {/* Stats "Stamps" */}
                  <div className="flex flex-wrap items-end gap-3 pb-2 mt-auto">
                    {/* XP Stamp */}
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg border flex flex-col items-start min-w-[70px]",
                      isDarkTheme ? "bg-slate-800/60 border-slate-700" : "bg-white/60 border-slate-300"
                    )}>
                      <span className="text-[8px] font-bold uppercase opacity-50 tracking-wider">XP</span>
                      <span className={cn("text-xs font-mono font-bold", isDarkTheme ? "text-yellow-400" : "text-yellow-600")}>{(stats.xp || 0).toLocaleString()}</span>
                    </div>

                    {/* Level Stamp */}
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg border flex flex-col items-start min-w-[70px]",
                      isDarkTheme ? "bg-slate-800/60 border-slate-700" : "bg-white/60 border-slate-300"
                    )}>
                      <span className="text-[8px] font-bold uppercase opacity-50 tracking-wider">LEVEL</span>
                      <span className={cn("text-xs font-mono font-bold", isDarkTheme ? "text-indigo-400" : "text-indigo-600")}>{stats.level || 1}</span>
                    </div>

                    {/* Streak Stamp (Interactive) */}
                    <button
                      onClick={() => !hasClaimedToday && onClaimReward()}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border flex flex-col items-start min-w-[90px] transition-all active:scale-95",
                        hasClaimedToday
                          ? (isDarkTheme ? "bg-emerald-950/30 border-emerald-800/50" : "bg-emerald-50 border-emerald-200")
                          : (isDarkTheme ? "bg-orange-950/30 border-orange-800/50 animate-pulse hover:bg-orange-900/40" : "bg-orange-50 border-orange-200 animate-pulse hover:bg-orange-100")
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold uppercase opacity-70 tracking-wider text-inherit">STREAK</span>
                        {!hasClaimedToday && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />}
                      </div>
                      <span className={cn(
                        "text-xs font-mono font-bold flex items-center gap-1",
                        hasClaimedToday ? "text-emerald-500" : "text-orange-500"
                      )}>
                        {stats.currentStreak} DAYS
                        {hasClaimedToday && <CheckCircle size={10} />}
                      </span>
                    </button>
                  </div>

                </div>

                {/* Console Start Button (Integrated) */}
                <div className="absolute bottom-6 right-6 sm:static sm:flex sm:flex-col sm:justify-end sm:ml-4 pl-0 sm:pl-6 sm:border-l sm:border-slate-500/10">
                  <div className="relative group/start">
                    {/* Bezel */}
                    <div className={cn(
                      "absolute inset-[-4px] rounded-full border opacity-30",
                      isDarkTheme ? "border-white/20" : "border-black/10"
                    )}></div>

                    <div className="scale-[0.7] sm:scale-[0.8]">
                      <StartEngineButton
                        onClick={handleStartQuiz}
                        isIgniting={false}
                      />
                    </div>

                    <div className={cn(
                      "absolute -bottom-5 w-full text-center text-[8px] font-black tracking-[0.2em] uppercase opacity-40 transition-opacity group-hover/start:opacity-80",
                      isDarkTheme ? "text-white" : "text-slate-900"
                    )}>
                      IGNITION
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* 2. EXAM READINESS (Col: 1, Row: 1) - placement adjusted */}
          <div className={cn(
            "transition-all duration-500 ease-in-out",
            examReadinessExpanded
              ? 'md:col-span-2 lg:col-span-2 lg:row-span-2'
              : 'md:col-span-1 lg:col-span-1 lg:row-span-2'
          )}>
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

          {/* 3. SKILY CHAT (Col: 1, Row: 2) */}
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

// Wrapper component for DuelPassSeasonModal with useModalRoute
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
