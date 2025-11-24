import React, { useMemo, useCallback, useState } from 'react';
import { Power, Volume2, Play, Bell, CheckCircle, Star, Circle, Car, Zap, FileText, Coins, Gauge } from 'lucide-react';
import { DailyRewards } from './DailyRewards';
import { SkilyChat } from './SkilyChat';
import { ExamReadiness } from './ExamReadiness';
import { PremiumCard } from './PremiumCard';
import { DuelPassInfo } from './DuelPassInfo';
import { CockpitSettingsPanel } from './CockpitSettingsPanel';
import { UnifiedModal } from '@/components/ui/unified-modal';

import { playClickSound, playHoverSound, playAlertSound, playSuccessSound } from '@/services/audioService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';

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
  readinessStatus
}) => {
  const [examReadinessExpanded, setExamReadinessExpanded] = React.useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState<'xp' | 'tests' | 'coins'>('xp');
  const [cockpitOpen, setCockpitOpen] = useState(false);
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';
  const pageBgClass = isDarkTheme ? 'bg-[#0f172a] text-white' : 'bg-[#f5f6fb] text-slate-900';
  // Улучшенный hero background с более насыщенными цветами
  const heroBackground = isDarkTheme
    ? 'linear-gradient(135deg, #1e1b2e 0%, #2d1b4e 25%, #4c2d7a 50%, #6d4c9e 75%, #8b6fb8 100%)'
    : 'linear-gradient(135deg, #e0ebff 0%, #f0e5ff 30%, #ffe5f0 60%, #ffeef5 100%)';
  const heroShadowClass = isDarkTheme
    ? 'shadow-2xl shadow-purple-900/30'
    : 'shadow-[0_32px_80px_rgba(139,92,246,0.25)]';
  const onlineBadgeClass = isDarkTheme
    ? 'flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/25 to-emerald-600/25 border border-emerald-400/40 backdrop-blur-sm shadow-lg shadow-emerald-500/20'
    : 'flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-emerald-200/80 shadow-[0_12px_34px_rgba(16,185,129,0.25)] backdrop-blur-sm';
  const licenseBadgeClass = isDarkTheme
    ? 'flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/25 via-indigo-500/25 to-purple-500/25 border border-blue-400/40 backdrop-blur-sm group hover:border-blue-300/60 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300'
    : 'flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50/95 via-indigo-50/95 to-purple-50/95 border border-indigo-200/80 text-indigo-700 shadow-[0_12px_32px_rgba(99,102,241,0.25)] backdrop-blur-sm';
  const cockpitButtonClass = isDarkTheme
    ? 'flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700/70 bg-slate-900/70 hover:border-emerald-400/60 hover:bg-slate-800/90 transition-all text-xs font-semibold text-slate-200 backdrop-blur-sm'
    : 'flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/80 bg-gradient-to-r from-white/95 to-slate-50/95 hover:border-emerald-300 hover:bg-emerald-50/95 transition-all text-xs font-semibold text-slate-600 shadow-[0_10px_30px_rgba(148,163,184,0.3)] backdrop-blur-sm';
  const statValueClass = isDarkTheme ? 'text-base sm:text-lg font-black text-white' : 'text-base sm:text-lg font-black text-slate-900';
  const statLabelBase = 'text-[9px] sm:text-[10px] font-bold uppercase tracking-wide leading-none mb-0.5 sm:mb-1';
  const statStartButtonText = isDarkTheme ? 'text-indigo-300' : 'text-purple-600';
  const onlineTextClass = isDarkTheme ? 'text-emerald-200' : 'text-emerald-700';
  // Улучшенная opacity для noise - лучше видимость текста
  const heroNoiseOpacity = isDarkTheme ? 'opacity-[0.15]' : 'opacity-[0.12]';
  const heroHeadingClass = isDarkTheme ? 'text-white drop-shadow-lg' : 'text-slate-900';
  const heroBodyTextClass = isDarkTheme ? 'text-white/90' : 'text-slate-600';
  // Улучшенные цвета карточек с лучшим контрастом
  const xpCardClass = isDarkTheme
    ? 'group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-yellow-600/15 backdrop-blur-sm border border-yellow-400/40 px-2.5 sm:px-3 py-2 sm:py-2.5 hover:border-yellow-300/60 hover:shadow-xl hover:shadow-yellow-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden'
    : 'group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-2xl bg-white/95 border border-amber-100/90 px-3 py-2 sm:py-2.5 shadow-[0_20px_45px_rgba(251,191,36,0.3)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm';
  const xpOverlayClass = isDarkTheme
    ? 'absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
    : 'absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100 opacity-70 group-hover:opacity-100 transition-opacity duration-300';
  const testsCardClass = isDarkTheme
    ? 'group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-600/15 backdrop-blur-sm border border-blue-400/40 px-2.5 sm:px-3 py-2 sm:py-2.5 hover:border-blue-300/60 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden'
    : 'group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-2xl bg-white/95 border border-blue-100/90 px-3 py-2 sm:py-2.5 shadow-[0_20px_45px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm';
  const testsOverlayClass = isDarkTheme
    ? 'absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
    : 'absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-100 opacity-70 group-hover:opacity-100 transition-opacity duration-300';
  const coinsCardClass = isDarkTheme
    ? 'group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-600/15 backdrop-blur-sm border border-amber-400/40 px-2.5 sm:px-3 py-2 sm:py-2.5 hover:border-amber-300/60 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden'
    : 'group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-2xl bg-white/95 border border-amber-100/90 px-3 py-2 sm:py-2.5 shadow-[0_20px_45px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm';
  const coinsOverlayClass = isDarkTheme
    ? 'absolute inset-0 bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
    : 'absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100 opacity-70 group-hover:opacity-100 transition-opacity duration-300';
  // Улучшенные цвета иконок для лучшей видимости
  const xpIconColor = isDarkTheme ? 'text-yellow-100' : 'text-amber-600';
  const testsIconColor = isDarkTheme ? 'text-blue-100' : 'text-indigo-600';
  const coinsIconColor = isDarkTheme ? 'text-amber-100' : 'text-amber-600';
  const heroStatusKey =
    stats.averageScore >= 75
      ? 'dashboard.heroStatus.ready'
      : stats.averageScore >= 50
      ? 'dashboard.heroStatus.progress'
      : 'dashboard.heroStatus.start';
  
  const handleStartQuiz = () => {
    playClickSound();
    onStartQuiz();
  };

  const handleExamReadinessExpanded = (expanded: boolean) => {
    setExamReadinessExpanded(expanded);
  };

  const handleStatClick = (statType: 'xp' | 'tests' | 'coins') => {
    playClickSound();
    setSelectedStatType(statType);
    setStatsModalOpen(true);
  };

  return (
    <div className={`h-full ${pageBgClass} p-4 md:p-6 font-sans overflow-y-auto`}>
      <div className="max-w-[1370px] mx-auto space-y-3 md:space-y-4 h-full flex flex-col">
        
        {/* Header */}
        <div className="mb-2 md:mb-3 flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Online Status Badge */}
            <div className={onlineBadgeClass}>
              <div className="relative">
                <Circle className="w-2 h-2 text-emerald-400 fill-emerald-400" />
                <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75" />
              </div>
              <span className={`text-xs font-semibold ${onlineTextClass}`}>{t('dashboard.onlineStatus')}</span>
            </div>

            {/* License Badge */}
            <div className={licenseBadgeClass}>
              <Car className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
              <span
                className={
                  isDarkTheme
                    ? 'text-xs font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent'
                    : 'text-xs font-bold text-indigo-600'
                }
              >
                {t('dashboard.licenseStatus')}
              </span>
            </div>
            <button
              onClick={() => {
                playClickSound();
                setCockpitOpen(true);
              }}
              className={cockpitButtonClass}
              aria-label={t('dashboard.cockpitButton')}
            >
              <Gauge className="w-3.5 h-3.5 text-emerald-300" />
              {t('dashboard.cockpitButton')}
            </button>
           </div>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5 animate-slide-up flex-1 min-h-0 auto-rows-fr">
          
          {/* 1. HERO CARD (Col: 2, Row: 2) */}
          <div 
            onMouseEnter={playHoverSound}
            className="md:col-span-2 lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-2xl md:rounded-[2rem] text-white p-4 md:p-6 lg:p-8 flex flex-col justify-between shadow-2xl group"
            style={{
              background: heroBackground,
            }}
          >
            <div className={`absolute inset-0 ${heroNoiseOpacity} mix-blend-overlay`} style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
            
            {/* Дополнительный градиентный overlay для глубины */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-indigo-900/20 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              {/* Top section: Level badge */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 shadow-lg shadow-white/10">
                  <Star size={16} className="text-yellow-300 fill-yellow-300 drop-shadow-sm" />
                  <span className="text-sm font-bold text-white drop-shadow-sm">Уровень {stats.level || 1}</span>
                </div>
              </div>

              {/* Middle section: Greeting and content */}
              <div className="flex-1 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 mb-4 md:mb-6">
                <div className="flex-1">
                  <h2 className={`text-2xl md:text-3xl lg:text-4xl font-bold leading-tight tracking-tight mb-2 md:mb-3 ${heroHeadingClass}`}>
                    {t('dashboard.heroGreeting')}
                  </h2>
                  <p className={`${heroBodyTextClass} font-medium text-sm md:text-base leading-relaxed max-w-md`}>
                    {t('dashboard.heroEfficiencyPrefix')} <strong className="text-white">{stats.averageScore}%</strong>.{' '}
                    {t(heroStatusKey)}
                  </p>
                </div>

                {/* START Button */}
                <button 
                  onClick={handleStartQuiz}
                  className="group relative w-36 h-36 md:w-40 md:h-40 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 transform-gpu"
                >
                  {/* Glow effect - улучшенный */}
                  <div className="absolute inset-[-20%] rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500 pointer-events-none bg-gradient-to-br from-white/40 via-purple-200/30 to-indigo-200/40 blur-xl"></div>
                  
                  {/* White circle background - с градиентом */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white via-purple-50/90 to-indigo-50/90 shadow-[0_20px_50px_rgba(255,255,255,0.4)]"></div>
                  
                  {/* Inner content */}
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <Power size={32} className={`${isDarkTheme ? 'text-indigo-600' : 'text-indigo-600'} mb-2 drop-shadow-lg`} />
                    <span className={`${statStartButtonText} font-bold text-sm tracking-wider uppercase`}>
                      {t('dashboard.startButton')}
                    </span>
                  </div>
                </button>
              </div>

              {/* Bottom section: Stats blocks - компактный улучшенный дизайн */}
              <div className="flex items-stretch gap-2 sm:gap-2.5">
                {/* XP Card */}
                <button
                  onClick={() => handleStatClick('xp')}
                  className={xpCardClass}
                >
                  {/* Hover glow effect */}
                  <div className={xpOverlayClass} />
                  
                  {/* Shimmer effect - только при hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                  <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 w-full min-w-0">
                    {/* Icon container - компактный */}
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-yellow-400/30 via-orange-500/25 to-yellow-500/30 border border-yellow-400/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-yellow-500/25">
                      <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${xpIconColor} relative z-10`} />
                    </div>
                    
                    {/* Text content - компактный */}
                    <div className="flex-1 min-w-0">
                      <div className={`${statLabelBase} ${isDarkTheme ? 'text-yellow-100/90' : 'text-yellow-700/90'}`}>
                        {t('dashboard.stats.xp')}
                      </div>
                      <div className={`${statValueClass} leading-tight ${isDarkTheme ? 'group-hover:text-yellow-50' : 'group-hover:text-yellow-700'} transition-colors duration-200`}>
                        {stats.xp || 0} <span className={`text-xs sm:text-sm font-bold ${isDarkTheme ? 'text-yellow-200/80' : 'text-yellow-600/80'}`}>XP</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Tests Card */}
                <button
                  onClick={() => handleStatClick('tests')}
                  className={testsCardClass}
                >
                  {/* Hover glow effect */}
                  <div className={testsOverlayClass} />
                  
                  {/* Shimmer effect - только при hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                  <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 w-full min-w-0">
                    {/* Icon container - компактный */}
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-400/30 via-indigo-500/25 to-blue-500/30 border border-blue-400/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-blue-500/25">
                      <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ${testsIconColor} relative z-10`} />
                    </div>
                    
                    {/* Text content - компактный */}
                    <div className="flex-1 min-w-0">
                      <div className={`${statLabelBase} ${isDarkTheme ? 'text-blue-100/90' : 'text-blue-700/90'}`}>
                        {t('dashboard.stats.tests')}
                      </div>
                      <div className={`${statValueClass} leading-tight ${isDarkTheme ? 'group-hover:text-blue-50' : 'group-hover:text-blue-700'} transition-colors duration-200`}>
                        {stats.testsCompleted}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Coins Card */}
                <button
                  onClick={() => handleStatClick('coins')}
                  className={coinsCardClass}
                >
                  {/* Hover glow effect */}
                  <div className={coinsOverlayClass} />
                  
                  {/* Shimmer effect - только при hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                  <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 w-full min-w-0">
                    {/* Icon container - компактный */}
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400/30 via-yellow-500/25 to-amber-500/30 border border-amber-400/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-amber-500/25">
                      <Coins className={`w-4 h-4 sm:w-5 sm:h-5 ${coinsIconColor} relative z-10`} />
                    </div>
                    
                    {/* Text content - компактный */}
                    <div className="flex-1 min-w-0">
                      <div className={`${statLabelBase} ${isDarkTheme ? 'text-amber-100/90' : 'text-amber-700/90'}`}>
                        {t('dashboard.stats.coins')}
                      </div>
                      <div className={`${statValueClass} leading-tight ${isDarkTheme ? 'group-hover:text-amber-50' : 'group-hover:text-amber-700'} transition-colors duration-200`}>
                        {stats.coins}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 2. DAILY REWARDS (Col: 1, Row: 2) */}
          <div className="md:col-span-1 lg:col-span-1 lg:row-span-2">
            <DailyRewards 
              currentStreak={stats.currentStreak} 
              hasClaimedToday={hasClaimedToday} 
              onClaim={onClaimReward} 
            />
          </div>

          {/* 3. SKILY CHAT (Col: 1, Row: 2) */}
          <div className="md:col-span-1 lg:col-span-1 lg:row-span-2">
             <SkilyChat />
          </div>

          {/* 4. EXAM READINESS (Col: 1, Row: 1) - расширяется до 2 колонок */}
          <div className={`transition-all duration-500 ease-in-out ${examReadinessExpanded
              ? 'md:col-span-2 lg:col-span-2 lg:row-span-2' 
              : 'md:col-span-1 lg:col-span-1'
          }`}>
             <ExamReadiness 
               averageScore={stats.averageScore}
               testsCompleted={stats.testsCompleted}
               status={readinessStatus?.status}
               statusText={readinessStatus?.statusText}
               shortText={readinessStatus?.shortText}
               description={readinessStatus?.description}
               profileId={profileId}
               onStartTest={onStartQuiz}
               onExpandedChange={handleExamReadinessExpanded}
             />
          </div>

          {/* 5. PREMIUM CARD */}
          <div className="md:col-span-1 lg:col-span-1 transition-all duration-500 ease-in-out">
             <PremiumCard onGetPremium={onGetPremium} />
          </div>

          {/* 6. DUEL PASS INFO */}
          <div className="md:col-span-2 lg:col-span-2">
            <DuelPassInfo />
          </div>

        </div>
      </div>



      <UnifiedModal
        title="Панель пилота"
        open={cockpitOpen}
        onOpenChange={setCockpitOpen}
        className="max-w-3xl max-h-[85vh]"
        contentClassName="max-h-[calc(85vh-80px)]"
      >
        <CockpitSettingsPanel />
      </UnifiedModal>
    </div>
  );
};

