import React, { useState, useMemo } from 'react';
import { Flame, Award } from 'lucide-react';
import { sounds } from '@/lib/sounds';

interface DailyRewardsProps {
  currentStreak: number;
  hasClaimedToday: boolean;
  onClaim: () => void;
}

export const DailyRewards = React.memo<DailyRewardsProps>(({ currentStreak, hasClaimedToday, onClaim }) => {
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    if (hasClaimedToday || isClaiming) return;
    
    sounds.click(1000, 0.2);
    setIsClaiming(true);
    try {
      await onClaim();
      sounds.click(1200, 0.15); // Success sound
    } finally {
      setTimeout(() => setIsClaiming(false), 1000);
    }
  };

  const { weeklyProgress, progressPercent, strokeDashoffset, radius, circumference } = useMemo(() => {
    // Вычисляем прогресс в текущей неделе (от 1 до 7)
    // Если стрик 0, то прогресс 0
    // Если стрик кратен 7 (7, 14, 21...), то прогресс 7 (неделя завершена)
    // Иначе: остаток от деления на 7 (1-6 дней в текущей неделе)
    const wp = currentStreak === 0 ? 0 : (currentStreak % 7 === 0 ? 7 : currentStreak % 7);
    const pp = (wp / 7) * 100;
    const r = 50;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pp / 100) * circ;
    return { 
      weeklyProgress: wp, 
      progressPercent: pp, 
      strokeDashoffset: offset,
      radius: r,
      circumference: circ
    };
  }, [currentStreak]);

  return (
    <div className="h-full min-h-[360px] bg-[#0B1120] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between border border-slate-800 group hover:border-slate-700 transition-colors">
      
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-start">
        <div>
           <h3 className="font-bold text-lg tracking-tight text-slate-100">Ежедневная серия</h3>
           <p className="text-xs text-slate-400 font-medium mt-0.5">Уровень: Платформа</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-slate-700 shadow-lg">
           <Award size={20} className="text-yellow-400" />
        </div>
      </div>

      {/* Main Gauge */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-6">
        <div className="relative w-40 h-40">
          {/* Glow Behind */}
          <div className="absolute inset-0 bg-orange-500/10 rounded-full blur-[40px]"></div>
          
          <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" viewBox="0 0 120 120">
            {/* Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#1e293b"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            {/* Active Progress */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="url(#fireGradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className={`w-8 h-8 mb-2 ${hasClaimedToday ? 'text-orange-500 fill-orange-500' : 'text-slate-600'} transition-colors`} />
            <span className="text-4xl font-bold text-white tracking-tighter leading-none">{currentStreak}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Дней</span>
          </div>
        </div>
      </div>

      {/* Week Days Dots */}
      <div className="relative z-10 flex justify-between gap-2 mb-6 px-2">
         {[1, 2, 3, 4, 5, 6, 7].map((day) => {
           const isCompleted = day < weeklyProgress || (day === weeklyProgress && hasClaimedToday);
           const isActive = day === weeklyProgress && !hasClaimedToday;
           
           return (
             <div key={day} className="flex-1 flex justify-center group/day relative">
                <div 
                  className={`w-full max-w-[12px] h-2 rounded-full transition-all duration-500 ${
                    isCompleted ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 
                    isActive ? 'bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-slate-800'
                  }`}
                ></div>
             </div>
           );
         })}
      </div>

      {/* Action Button */}
      <button
        onClick={handleClaim}
        disabled={hasClaimedToday || isClaiming}
        className={`relative z-10 w-full py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all duration-300 overflow-hidden group/btn ${
          hasClaimedToday 
            ? 'bg-slate-800/50 text-slate-500 cursor-default border border-slate-700' 
            : 'bg-white text-slate-900 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
        }`}
      >
        {hasClaimedToday ? (
          <span className="flex items-center justify-center gap-2">
             Миссия выполнена
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
             {isClaiming ? 'Обработка...' : 'Получить бонус'}
          </span>
        )}
      </button>
    </div>
  );
});

