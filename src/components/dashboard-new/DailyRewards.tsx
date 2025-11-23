import React, { useState, useMemo, useEffect } from 'react';
import { Flame, Award, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CelebrationAnimations, CelebrationType } from './CelebrationAnimations';
import { CelebrationModal } from './CelebrationModal';
import { playClickSound, playSuccessSound } from '@/services/audioService';

interface DailyRewardsProps {
  currentStreak: number;
  hasClaimedToday: boolean;
  onClaim: () => void;
}

export const DailyRewards = React.memo<DailyRewardsProps>(({ currentStreak, hasClaimedToday, onClaim }) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [showNewWeek, setShowNewWeek] = useState(false);
  const [celebrationType, setCelebrationType] = useState<CelebrationType>('supernova'); // Можно менять тип

  const { weeklyProgress, progressPercent, strokeDashoffset, radius, circumference, weekNumber, weekDay, isDay7, isNewWeek } = useMemo(() => {
    // Вычисляем прогресс в текущей неделе (от 1 до 7)
    // Если стрик 0, то прогресс 0
    // Если стрик кратен 7 (7, 14, 21...), то прогресс 7 (неделя завершена)
    // Иначе: остаток от деления на 7 (1-6 дней в текущей неделе)
    const wp = currentStreak === 0 ? 0 : (currentStreak % 7 === 0 ? 7 : currentStreak % 7);
    const pp = (wp / 7) * 100;
    const r = 50;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pp / 100) * circ;
    const wn = currentStreak === 0 ? 0 : Math.ceil(currentStreak / 7);
    const wd = currentStreak === 0 ? 0 : (currentStreak % 7 || 7);
    const isDay7Value = wd === 7 && !hasClaimedToday;
    const isNewWeekValue = wd === 1 && currentStreak > 7 && !hasClaimedToday;
    return { 
      weeklyProgress: wp, 
      progressPercent: pp, 
      strokeDashoffset: offset,
      radius: r,
      circumference: circ,
      weekNumber: wn,
      weekDay: wd,
      isDay7: isDay7Value,
      isNewWeek: isNewWeekValue
    };
  }, [currentStreak, hasClaimedToday]);

  // Показываем плашку "Следующая неделя началась" при новой неделе
  useEffect(() => {
    if (isNewWeek && !showNewWeek) {
      setShowNewWeek(true);
      const timer = setTimeout(() => setShowNewWeek(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNewWeek, showNewWeek]);

  const handleClaim = async () => {
    if (hasClaimedToday || isClaiming) return;
    
    playClickSound();
    setIsClaiming(true);
    
    // Если день 7 - показываем анимацию поздравления и модальное окно
    if (weekDay === 7) {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setShowCelebrationModal(true);
      }, 2000); // Сначала анимация, потом модальное окно
    }
    
    try {
      await onClaim();
      playSuccessSound(); // Success sound
    } finally {
      setTimeout(() => setIsClaiming(false), 1000);
    }
  };

  // Функция для тестирования анимаций (только в dev режиме)
  const handleTestAnimations = () => {
    if (process.env.NODE_ENV === 'development') {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
    }
  };

  // Функция для смены типа анимации (только в dev режиме)
  const handleChangeAnimation = () => {
    if (process.env.NODE_ENV === 'development') {
      const types: CelebrationType[] = [
        'confetti', 'fireworks', 'stars', 'burst', 'sparkles', 'trophy', 
        'gradient', 'particles', 'mega-burst', 'galaxy', 'rainbow', 
        'champion', 'victory-fanfare', 'explosion', 'cosmic', 
        'golden-rain', 'diamond-shower', 'phoenix', 'supernova'
      ];
      const currentIndex = types.indexOf(celebrationType);
      const nextIndex = (currentIndex + 1) % types.length;
      setCelebrationType(types[nextIndex]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  };

  return (
    <div className="h-full min-h-[360px] bg-[#0B1120] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between border border-slate-800 group hover:border-slate-700 transition-colors">
      
      {/* Анимация поздравления для дня 7 */}
      <CelebrationAnimations
        type={celebrationType}
        show={showCelebration}
        duration={5000}
        withSound={true}
        fullScreen={true}
        message="🏆 Неделя завершена!"
      />

      {/* Модальное окно с поздравлением */}
      <CelebrationModal
        show={showCelebrationModal}
        onClose={() => setShowCelebrationModal(false)}
        message="🏆 Неделя завершена!"
        weekNumber={weekNumber}
        totalStreak={currentStreak}
      />

      {/* Плашка "Следующая неделя началась" */}
      <AnimatePresence>
        {showNewWeek && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-xl px-4 py-2 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-xs font-bold text-yellow-200">✨ Следующая неделя началась!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Золотое свечение для дня 7 */}
      {isDay7 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-[2.5rem] pointer-events-none"
        />
      )}

      {/* Subtle Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-start">
        <div>
           <h3 className="font-bold text-lg tracking-tight text-slate-100">Ежедневная серия</h3>
           {weekNumber > 0 && (
             <motion.div
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex items-center gap-2 mt-1"
             >
               <span className="text-xs font-bold text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700">
                 Неделя {weekNumber}
               </span>
               {isDay7 && (
                 <motion.span
                   animate={{ scale: [1, 1.1, 1] }}
                   transition={{ duration: 1.5, repeat: Infinity }}
                   className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/30"
                 >
                   🎉 Завершение!
                 </motion.span>
               )}
             </motion.div>
           )}
        </div>
        <motion.div
          animate={isDay7 ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
          transition={{ duration: 2, repeat: isDay7 ? Infinity : 0 }}
          className="w-10 h-10 rounded-xl bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-slate-700 shadow-lg"
        >
           <Award size={20} className={isDay7 ? "text-yellow-400" : "text-yellow-400"} />
        </motion.div>
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
            <motion.div
              animate={isDay7 && !hasClaimedToday ? { scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 2, repeat: isDay7 && !hasClaimedToday ? Infinity : 0 }}
            >
              <Flame className={`w-8 h-8 mb-2 ${hasClaimedToday ? 'text-orange-500 fill-orange-500' : isDay7 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} transition-colors`} />
            </motion.div>
            <span className="text-4xl font-bold text-white tracking-tighter leading-none">{currentStreak}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Дней</span>
            {weekDay > 0 && weekNumber > 0 && (
              <span className="text-[9px] text-slate-400 mt-0.5">Неделя {weekNumber}, день {weekDay}</span>
            )}
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
      <motion.button
        onClick={handleClaim}
        disabled={hasClaimedToday || isClaiming}
        animate={isDay7 && !hasClaimedToday ? {
          boxShadow: [
            '0 0 20px rgba(255,255,255,0.1)',
            '0 0 30px rgba(251, 191, 36, 0.4)',
            '0 0 20px rgba(255,255,255,0.1)'
          ]
        } : {}}
        transition={{ duration: 2, repeat: isDay7 && !hasClaimedToday ? Infinity : 0 }}
        className={`relative z-10 w-full py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all duration-300 overflow-hidden group/btn ${
          hasClaimedToday 
            ? 'bg-slate-800/50 text-slate-500 cursor-default border border-slate-700' 
            : isDay7
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
            : 'bg-white text-slate-900 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
        }`}
      >
        {hasClaimedToday ? (
          <span className="flex items-center justify-center gap-2">
             Миссия выполнена
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
             {isClaiming ? 'Обработка...' : weekDay === 7 ? '🎉 Завершить неделю!' : 'Получить бонус'}
          </span>
        )}
      </motion.button>

      {/* Кнопки тестирования анимаций (только в dev режиме) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1">
          <button
            onClick={handleTestAnimations}
            className="px-2 py-1 text-[10px] bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
            title="Тест текущей анимации"
          >
            🧪 Тест
          </button>
          <button
            onClick={handleChangeAnimation}
            className="px-2 py-1 text-[10px] bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
            title={`Сменить анимацию (текущая: ${celebrationType})`}
          >
            🎨 {celebrationType}
          </button>
        </div>
      )}
    </div>
  );
});

