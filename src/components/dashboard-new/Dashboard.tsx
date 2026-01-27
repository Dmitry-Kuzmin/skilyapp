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
import { motion } from "@/components/optimized/Motion";
import { cn } from '@/lib/utils';

import { DashboardSkeleton } from "./DashboardSkeleton";
import { LicenseCard } from './LicenseCard';
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
  userProfile?: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
    rank?: string | null;
    id?: string;
    license_points?: number; // Added field
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
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 h-full">
            <LicenseCard
              userProfile={userProfile}
              stats={stats}
              isDarkTheme={isDarkTheme}
              selectedCountry={selectedCountry}
              language={language}
              hasClaimedToday={hasClaimedToday}
              onClaimReward={onClaimReward}
              onStartQuiz={handleStartQuiz}
              t={t}
            />
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
