import React, { useMemo, useCallback, useState } from 'react';
import { Power, Volume2, Play, Bell, CheckCircle, Star, Circle, Car, Settings, Zap, FileText, Coins, Gauge } from 'lucide-react';
import { DailyRewards } from './DailyRewards';
import { SkilyChat } from './SkilyChat';
import { ExamReadiness } from './ExamReadiness';
import { PremiumCard } from './PremiumCard';
import { DuelPassInfo } from './DuelPassInfo';
import { ADASControlPanel } from './ADASControlPanel';
import { CockpitSettingsPanel } from './CockpitSettingsPanel';
import { UnifiedModal } from '@/components/ui/unified-modal';

import { QuickSettingsPanel } from './QuickSettingsPanel';
import { playClickSound, playHoverSound, playAlertSound, playSuccessSound } from '@/services/audioService';

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
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [cockpitOpen, setCockpitOpen] = useState(false);
  
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
    <div className="min-h-screen bg-[#0f172a] p-6 md:p-10 font-sans pb-24 text-white">
      <div className="max-w-[1370px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-end gap-3 mb-3">
            {/* Quick Settings Button - только иконка */}
            <button
              onClick={() => {
                playClickSound();
                setQuickSettingsOpen(true);
              }}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-indigo-500/50 transition-all group flex items-center justify-center"
              aria-label="Настройки"
            >
              <Settings className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Online Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 backdrop-blur-sm shadow-lg shadow-emerald-500/10">
              <div className="relative">
                <Circle className="w-2 h-2 text-emerald-400 fill-emerald-400" />
                <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75" />
              </div>
              <span className="text-xs font-semibold text-emerald-300">Sistema en línea</span>
            </div>

            {/* License Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-blue-500/30 backdrop-blur-sm group hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
              <Car className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                Licencia B
              </span>
            </div>
            <button
              onClick={() => {
                playClickSound();
                setCockpitOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700/60 bg-slate-900/60 hover:border-emerald-400/50 hover:bg-slate-800/80 transition-all text-xs font-semibold text-slate-200"
              aria-label="Панель пилота"
            >
              <Gauge className="w-3.5 h-3.5 text-emerald-300" />
              Cockpit
            </button>
           </div>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
          
          {/* 1. HERO CARD (Col: 2, Row: 2) */}
          <div 
            onMouseEnter={playHoverSound}
            className="md:col-span-2 lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-[2.5rem] text-white p-8 md:p-10 flex flex-col justify-between shadow-2xl group"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            }}
          >
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              {/* Top section: Level badge */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-white">Уровень {stats.level || 1}</span>
                </div>
              </div>

              {/* Middle section: Greeting and content */}
              <div className="flex-1 flex flex-col md:flex-row justify-between items-center gap-8 mb-6">
                <div className="flex-1">
                  <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4 text-white">
                    Привет, Пилот!
                  </h2>
                  <p className="text-white/90 font-medium text-base md:text-lg leading-relaxed max-w-md">
                    Твоя эффективность составляет <strong>{stats.averageScore}%</strong>. 
                    {stats.averageScore >= 75 
                      ? ' Датчики показывают, что ты готов к новой сессии.' 
                      : stats.averageScore >= 50
                      ? ' Продолжай тренироваться для лучшего результата.'
                      : ' Рекомендуем пройти больше тестов для улучшения готовности.'}
                  </p>
                </div>

                {/* START Button */}
                <button 
                  onClick={handleStartQuiz}
                  className="group relative w-36 h-36 md:w-40 md:h-40 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 transform-gpu"
                >
                  {/* Glow effect */}
                  <div className="absolute inset-[-20%] rounded-full opacity-50 group-hover:opacity-100 transition-all duration-500 pointer-events-none bg-white/30 blur-xl"></div>
                  
                  {/* White circle background */}
                  <div className="absolute inset-0 rounded-full bg-white shadow-[0_20px_50px_rgba(255,255,255,0.3)]"></div>
                  
                  {/* Inner content */}
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <Power size={32} className="text-indigo-600 mb-2 drop-shadow-lg" />
                    <span className="text-indigo-600 font-bold text-sm tracking-wider uppercase">START</span>
                  </div>
                </button>
              </div>

              {/* Bottom section: Stats blocks - компактный улучшенный дизайн */}
              <div className="flex items-stretch gap-2 sm:gap-2.5">
                {/* XP Card */}
                <button
                  onClick={() => handleStatClick('xp')}
                  className="group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500/12 via-orange-500/8 to-yellow-600/12 backdrop-blur-sm border border-yellow-400/30 px-2.5 sm:px-3 py-2 sm:py-2.5 hover:border-yellow-300/50 hover:shadow-lg hover:shadow-yellow-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-yellow-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Shimmer effect - только при hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                  <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 w-full min-w-0">
                    {/* Icon container - компактный */}
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-yellow-400/25 via-orange-500/20 to-yellow-500/25 border border-yellow-400/40 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-yellow-500/20">
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-200 relative z-10" />
                    </div>
                    
                    {/* Text content - компактный */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] sm:text-[10px] text-yellow-200/80 font-bold uppercase tracking-wide leading-none mb-0.5 sm:mb-1">Опыт</div>
                      <div className="text-base sm:text-lg font-black text-white leading-tight group-hover:text-yellow-50 transition-colors duration-200">
                        {stats.xp || 0} <span className="text-xs sm:text-sm font-bold text-yellow-300/70">XP</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Tests Card */}
                <button
                  onClick={() => handleStatClick('tests')}
                  className="group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/12 via-indigo-500/8 to-blue-600/12 backdrop-blur-sm border border-blue-400/30 px-2.5 sm:px-3 py-2 sm:py-2.5 hover:border-blue-300/50 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Shimmer effect - только при hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                  <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 w-full min-w-0">
                    {/* Icon container - компактный */}
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-400/25 via-indigo-500/20 to-blue-500/25 border border-blue-400/40 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-blue-500/20">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 relative z-10" />
                    </div>
                    
                    {/* Text content - компактный */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] sm:text-[10px] text-blue-200/80 font-bold uppercase tracking-wide leading-none mb-0.5 sm:mb-1">Тестов</div>
                      <div className="text-base sm:text-lg font-black text-white leading-tight group-hover:text-blue-50 transition-colors duration-200">
                        {stats.testsCompleted}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Coins Card */}
                <button
                  onClick={() => handleStatClick('coins')}
                  className="group relative flex-1 flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/12 via-yellow-500/8 to-amber-600/12 backdrop-blur-sm border border-amber-400/30 px-2.5 sm:px-3 py-2 sm:py-2.5 hover:border-amber-300/50 hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Shimmer effect - только при hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/8 to-transparent" />

                  <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 w-full min-w-0">
                    {/* Icon container - компактный */}
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400/25 via-yellow-500/20 to-amber-500/25 border border-amber-400/40 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-md shadow-amber-500/20">
                      <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200 relative z-10" />
                    </div>
                    
                    {/* Text content - компактный */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] sm:text-[10px] text-amber-200/80 font-bold uppercase tracking-wide leading-none mb-0.5 sm:mb-1">Монеты</div>
                      <div className="text-base sm:text-lg font-black text-white leading-tight group-hover:text-amber-50 transition-colors duration-200">
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

          {/* 5. ADAS PANEL */}
          <div className="md:col-span-1 lg:col-span-1">
            <ADASControlPanel
              stats={{
                averageScore: stats.averageScore,
                currentStreak: stats.currentStreak,
                testsCompleted: stats.testsCompleted,
                accuracy: stats.accuracy ?? stats.averageScore,
              }}
              readinessStatus={readinessStatus}
            />
          </div>

          {/* 6. PREMIUM CARD */}
          <div className="md:col-span-1 lg:col-span-1 transition-all duration-500 ease-in-out">
             <PremiumCard onGetPremium={onGetPremium} />
          </div>

          {/* 7. DUEL PASS INFO */}
          <div className="md:col-span-2 lg:col-span-2">
            <DuelPassInfo />
          </div>

        </div>
      </div>



      {/* Quick Settings Panel */}
      <QuickSettingsPanel
        open={quickSettingsOpen}
        onOpenChange={setQuickSettingsOpen}
      />

      <UnifiedModal
        title="Панель пилота"
        open={cockpitOpen}
        onOpenChange={setCockpitOpen}
        size="lg"
      >
        <div className="max-h-[75vh] overflow-y-auto">
          <CockpitSettingsPanel />
        </div>
      </UnifiedModal>
    </div>
  );
};

