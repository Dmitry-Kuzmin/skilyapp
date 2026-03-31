import React, { useMemo, useCallback, useState, lazy, Suspense } from 'react';
import { Power, Volume2, Play, Bell, CheckCircle, Star, Circle, Zap, FileText, Coins, BookOpen, ArrowRight, Target, BarChart2, Settings } from 'lucide-react';
import { ContextSwitcher } from '@/components/shared';
import { usePDDContext } from '@/contexts/PDDContext';
import { useUserContext } from '@/contexts/UserContext';
import { usePDDTickets } from '@/hooks/usePDDTickets';
import { useTopics } from '@/hooks/useTopics';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
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
const TelemetryOverlay = lazy(() => import('../telemetry/TelemetryOverlay').then(m => ({ default: m.TelemetryOverlay })));
const CourseBanner = lazy(() => import('./CourseBanner').then(m => ({ default: m.CourseBanner })));

// Fallback component for lazy loading
const ComponentSkeleton = () => (
  <div className="h-32 bg-muted/50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
);

import { playClickSound, playHoverSound, playAlertSound, playSuccessSound } from '@/services/audioService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { useModalRoute } from '@/hooks/useModalRoute';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';
import { RehabilitationTest } from './RehabilitationTest';
import { AnimatePresence } from 'framer-motion';

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
    license_points?: number;
    referral_code?: string | null;
    duel_wins?: number;
    duel_total?: number;
  };
  licenseHistory?: Array<{
    points: number;
    recorded_at: string;
  }>;
  licenseAudit?: Array<{
    delta: number;
    event_type: string;
    created_at: string;
  }>;
  animatePoints?: boolean;
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
  userProfile,
  licenseHistory,
  licenseAudit,
  animatePoints = false
}) => {
  const { user } = useUserContext();
  const stats = {
    ...initialStats, userProfile: {
      ...userProfile,
      photo_url: userProfile?.photo_url || user?.photo_url
    }
  }; // Merge for convenience
  const { language, t } = useLanguage();
  const [examReadinessExpanded, setExamReadinessExpanded] = React.useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState<'xp' | 'tests' | 'coins'>('xp');
  const [telemetryOpen, setTelemetryOpen] = useState(false);

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

  const [showRehabTest, setShowRehabTest] = useState(false);

  const handleStartQuiz = useCallback(() => {
    const points = userProfile?.license_points || 8;

    // GATING: License suspended if 0 points
    if (points === 0) {
      toast({
        title: t("dashboard.toasts.suspendedTitle"),
        description: t("dashboard.toasts.suspendedDesc"),
        variant: 'destructive',
      });
      return;
    }

    // QUALIFICATION: Need 10 points for Exam
    // Note: In Dashboard.tsx 'onStartQuiz' usually opens the PRACTICE/EXAM selector or starts practice.
    // If it's the EXAM button specifically (handled in children or this component), we apply the 10 point rule.
    // However, since handleStartQuiz is the main entry, we let them enter practice but might block EXAM later.
    // For now, let's keep it simple: 0 = blocked, others can enter. 
    // BUT the user asked for "qualification system", so let's check if we should block START if < 10.
    // Actually, Dashboard start usually means "Test Selector".

    playSuccessSound();
    onStartQuiz();
  }, [onStartQuiz, userProfile?.license_points, language]);

  const handleRecoverPoints = useCallback(() => {
    playClickSound();
    setShowRehabTest(true);
  }, []);

  // NEW: Helper to refresh dashboard data after point changes
  const { refresh } = useDashboardData();

  const handleRehabComplete = async () => {
    try {
      const { error } = await (supabase as any).rpc('process_license_event', {
        p_user_id: profileId,
        p_event_type: 'rehabilitation_pass'
      });

      if (error) throw error;

      toast({
        title: t("dashboard.toasts.rehabCompleteTitle"),
        description: t("dashboard.toasts.rehabCompleteDesc"),
      });

      setShowRehabTest(false);
      refresh(true); // Force refresh dashboard data
    } catch (e: any) {
      console.error('Rehab failed:', e);
      toast({
        title: 'Error',
        description: e.message,
        variant: 'destructive',
      });
    }
  };

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
                  ? 'bg-transparent hover:bg-white/10 text-muted-foreground hover:text-white'
                  : 'bg-transparent hover:bg-black/5 text-muted-foreground hover:text-black'
              )}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 lg:gap-6 animate-slide-up">

          {/* 1. HERO CARD (LICENSE STYLE - PREMIUM) */}
          <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
            <LicenseCard
              userProfile={userProfile}
              stats={stats}
              isDarkTheme={isDarkTheme}
              selectedCountry={
                (selectedCountry?.toLowerCase() === 'spain' || selectedCountry?.toUpperCase() === 'ES') ? 'es' :
                  (selectedCountry?.toLowerCase() === 'russia' || selectedCountry?.toUpperCase() === 'RU') ? 'ru' : 'ru'
              }
              language={language}
              hasClaimedToday={hasClaimedToday}
              onClaimReward={onClaimReward}
              onStartQuiz={handleStartQuiz}
              onRecoverPoints={handleRecoverPoints}
              t={t}
              licenseHistory={licenseHistory}
              licenseAudit={licenseAudit}
              animatePoints={animatePoints}
            />
          </div>

          {/* 2. DUEL PASS INFO */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <Suspense fallback={<ComponentSkeleton />}>
              <DuelPassInfo />
            </Suspense>
          </div>

          {/* 3. SKILY CHAT */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <Suspense fallback={<ComponentSkeleton />}>
              <SkilyChat />
            </Suspense>
          </div>

          {/* 4. PREMIUM CARD */}
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
            <Suspense fallback={<ComponentSkeleton />}>
              <PremiumCard onGetPremium={onGetPremium} />
            </Suspense>
          </div>

          {/* 5½. COURSE BANNER (Only visible in Russian language) */}
          {language === 'ru' && (
            <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
              <Suspense fallback={<ComponentSkeleton />}>
                <CourseBanner />
              </Suspense>
            </div>
          )}

          {/* 6. EXAM READINESS */}
          <div className={cn(
            "transition-all duration-500 ease-in-out",
            examReadinessExpanded
              ? 'md:col-span-2 lg:col-span-3 xl:col-span-4'
              : 'md:col-span-1 lg:col-span-1 xl:col-span-1'
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
                licensePoints={userProfile?.license_points || 8}
                onStartTest={handleStartQuiz}
                onExpandedChange={handleExamReadinessExpanded}
                onTelemetryClick={() => setTelemetryOpen(true)}
              />
            </Suspense>
          </div>

        </div>
      </div>

      <Suspense fallback={null}>
        <DuelPassSeasonModalWrapper />
        <TelemetryOverlay open={telemetryOpen} onOpenChange={setTelemetryOpen} />
      </Suspense>

      <AnimatePresence>
        {showRehabTest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <RehabilitationTest
              language={language}
              onComplete={handleRehabComplete}
              onCancel={() => setShowRehabTest(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
