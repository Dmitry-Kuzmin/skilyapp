import React, { useMemo, useCallback } from 'react';
import { Power, Volume2, Play, Bell, CheckCircle } from 'lucide-react';
import { DailyRewards } from './DailyRewards';
import { SkilyChat } from './SkilyChat';
import { ExamReadiness } from './ExamReadiness';
import { PremiumCard } from './PremiumCard';
import { sounds } from '@/lib/sounds';

interface DashboardProps {
  stats: {
    averageScore: number;
    currentStreak: number;
    testsCompleted: number;
    accuracy: number;
    coins: number;
  };
  onStartQuiz: () => void;
  onClaimReward: () => void;
  hasClaimedToday: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  stats, 
  onStartQuiz, 
  onClaimReward,
  hasClaimedToday 
}) => {
  
  const handleStartQuiz = () => {
    sounds.click(1000, 0.2);
    onStartQuiz();
  };

  const playClickSound = useCallback(() => sounds.click(800, 0.1), []);
  const playAlertSound = useCallback(() => sounds.click(600, 0.15), []);
  const playSuccessSound = useCallback(() => sounds.click(1200, 0.15), []);

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
            className="md:col-span-2 lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-[2.5rem] mesh-gradient text-white p-8 md:p-10 flex flex-col justify-between shadow-2xl shadow-indigo-900/20 group"
          >
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 h-full">
              <div className="flex-1">
                <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4">
                  Ready for <br /> Takeoff?
                </h2>
                <p className="text-indigo-100 font-medium max-w-xs text-lg">
                  Твоя эффективность составляет {stats.averageScore}%.
                </p>
              </div>

              <button 
                onClick={handleStartQuiz}
                className="group relative w-40 h-40 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 transform-gpu"
              >
                {/* Radial Gradient Glow (Fix for Safari Square Shadow) */}
                <div className="absolute inset-[-30%] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
                     style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0) 70%)' }}>
                </div>
                
                {/* Metal Ring */}
                <div className="absolute inset-0 rounded-full metal-ring shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.9)] p-2 z-10">
                  <div className="w-full h-full rounded-full bg-[#1a1a1a] shadow-[inset_0_5px_15px_rgba(0,0,0,0.9)] p-1">
                    <div className="w-full h-full rounded-full bg-gradient-to-b from-[#333] to-[#111] border-t border-white/10 flex flex-col items-center justify-center relative overflow-hidden group-hover:shadow-[inset_0_0_30px_rgba(99,102,241,0.4)] transition-all">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>
                      <div className="w-12 h-1.5 rounded-full bg-black/50 mb-3 overflow-hidden border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,1)]">
                        <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-indigo-400 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                      </div>
                      <div className="flex flex-col items-center relative z-10">
                         <Power size={24} className="text-white mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" />
                         <span className="text-[10px] text-slate-400 font-bold tracking-[0.25em] uppercase group-hover:text-indigo-400 transition-colors">Engine</span>
                         <span className="text-[8px] text-slate-600 font-bold tracking-widest uppercase mt-0.5">Start/Stop</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
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
             <ExamReadiness averageScore={stats.averageScore} />
          </div>

          {/* 5. PREMIUM CARD (Col: 1, Row: 1) */}
          <div className="md:col-span-1 lg:col-span-1">
             <PremiumCard />
          </div>

          {/* 6. AUDIO CONSOLE (Col: 4, Row: 1) */}
          <div className="md:col-span-2 lg:col-span-2 bg-slate-800/50 rounded-[2.5rem] p-6 shadow-lg border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                 <Volume2 size={18} />
               </div>
               <h3 className="font-bold text-slate-200 text-sm">System Audio FX</h3>
            </div>
            <div className="flex flex-wrap gap-2">
               <AudioButton onClick={playClickSound} icon={Play} color="indigo" />
               <AudioButton onClick={playAlertSound} icon={Bell} color="orange" />
               <AudioButton onClick={playSuccessSound} icon={CheckCircle} color="emerald" />
            </div>
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

