import React, { useMemo, useCallback } from 'react';
import { Power, Volume2, Play, Bell, CheckCircle, Star } from 'lucide-react';
import { DailyRewards } from './DailyRewards';
import { SkilyChat } from './SkilyChat';
import { ExamReadiness } from './ExamReadiness';
import { PremiumCard } from './PremiumCard';
import { DuelPassInfo } from './DuelPassInfo';
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
  readinessStatus 
}) => {
  
  const handleStartQuiz = () => {
    playClickSound();
    onStartQuiz();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 md:p-10 font-sans pb-24 text-white">
      <div className="max-w-[1370px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center mb-6 animate-fade-in">
           <div className="text-2xl font-bold text-white">DGT Prep</div>
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

              {/* Bottom section: Stats blocks */}
              <div className="flex gap-4">
                <div className="flex-1 rounded-2xl bg-purple-900/30 backdrop-blur-sm border border-white/10 p-4">
                  <div className="text-xs text-white/70 font-medium mb-2 uppercase tracking-wide">Опыт</div>
                  <div className="text-2xl font-bold text-white">{stats.xp || 0} XP</div>
                </div>
                <div className="flex-1 rounded-2xl bg-purple-900/30 backdrop-blur-sm border border-white/10 p-4">
                  <div className="text-xs text-white/70 font-medium mb-2 uppercase tracking-wide">Всего тестов</div>
                  <div className="text-2xl font-bold text-white">{stats.testsCompleted}</div>
                </div>
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

          {/* 4. EXAM READINESS (Col: 1, Row: 1) */}
          <div className="md:col-span-1 lg:col-span-1">
             <ExamReadiness 
               averageScore={stats.averageScore}
               testsCompleted={stats.testsCompleted}
               status={readinessStatus?.status}
               statusText={readinessStatus?.statusText}
               shortText={readinessStatus?.shortText}
               description={readinessStatus?.description}
               onStartTest={onStartQuiz}
             />
          </div>

          {/* 5. PREMIUM CARD (Col: 1, Row: 1) */}
          <div className="md:col-span-1 lg:col-span-1">
             <PremiumCard onGetPremium={onGetPremium} />
          </div>

          {/* 6. DUEL PASS INFO (Col: 4, Row: 1) */}
          <div className="md:col-span-2 lg:col-span-2">
            <DuelPassInfo />
          </div>

        </div>
      </div>
    </div>
  );
};

const AudioButton = React.memo(({ onClick, icon: Icon, color }: { onClick: () => void; icon: React.ComponentType<{ size?: number }>; color: 'indigo' | 'orange' | 'emerald' }) => {
  const colorClasses = {
    indigo: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20',
    orange: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20',
  };

  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-center p-3 rounded-xl transition-colors border ${colorClasses[color]}`}
    >
      <Icon size={16} />
    </button>
  );
});

