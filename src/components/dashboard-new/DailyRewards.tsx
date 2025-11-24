import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Flame, Award, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CelebrationAnimations, CelebrationType } from './CelebrationAnimations';
import { CelebrationModal } from './CelebrationModal';
import { playClickSound, playSuccessSound } from '@/services/audioService';
import { useCockpitSettings } from '@/hooks/useCockpitSettings';

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
  const [celebrationType, setCelebrationType] = useState<CelebrationType>('phoenix');
  const [celebrationSoundType, setCelebrationSoundType] = useState<'default' | 'fanfare' | 'bells' | 'synth' | 'orchestral' | 'pop'>('orchestral');
  const flameAnchorRef = useRef<HTMLDivElement>(null);
  const [flameAnchorPosition, setFlameAnchorPosition] = useState<{ x: number; y: number } | null>(null);
  const effectiveHasClaimed = hasClaimedToday;

  const { settings: cockpitSettings } = useCockpitSettings();
  const celebrationMode = cockpitSettings.animationMode;
  const canPlayCelebration = celebrationMode !== 'off';
  const celebrationDuration = celebrationMode === 'reduced' ? 4500 : 8000;

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
    const isDay7Value = wd === 7 && !effectiveHasClaimed;
    const isNewWeekValue = wd === 1 && currentStreak > 7 && !effectiveHasClaimed;
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
  }, [currentStreak, effectiveHasClaimed]);

  // Показываем плашку "Следующая неделя началась" при новой неделе
  useEffect(() => {
    if (isNewWeek && !showNewWeek) {
      setShowNewWeek(true);
      const timer = setTimeout(() => setShowNewWeek(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNewWeek, showNewWeek]);

  // Синхронизируем координаты иконки огня с анимацией
  useEffect(() => {
    const updateAnchorPosition = () => {
      if (!flameAnchorRef.current) return;
      const rect = flameAnchorRef.current.getBoundingClientRect();
      setFlameAnchorPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    };

    updateAnchorPosition();
    window.addEventListener('resize', updateAnchorPosition);
    window.addEventListener('scroll', updateAnchorPosition, true);

    return () => {
      window.removeEventListener('resize', updateAnchorPosition);
      window.removeEventListener('scroll', updateAnchorPosition, true);
    };
  }, []);

  const handleClaim = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (effectiveHasClaimed || isClaiming) {
      console.log('[DailyRewards] Claim blocked:', { effectiveHasClaimed, isClaiming });
      return;
    }

    console.log('[DailyRewards] Claim started');
    playClickSound();
    setIsClaiming(true);

    // Показываем эффекты победы для всех дней
    if (canPlayCelebration) {
      // Для дня 7 - полная анимация с модальным окном
      if (weekDay === 7) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setShowCelebrationModal(true);
        }, celebrationDuration);
      } else {
        // Для остальных дней - короткая анимация
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
        }, celebrationMode === 'reduced' ? 2000 : 3000);
      }
    } else if (weekDay === 7) {
      // Если анимации отключены, но день 7 - показываем только модальное окно
      setShowCelebration(false);
      setShowCelebrationModal(true);
    }

    try {
      await onClaim();
      playSuccessSound(); // Success sound
    } finally {
      setTimeout(() => setIsClaiming(false), 1000);
    }
  };

  return (
    <div className="h-full min-h-[360px] bg-[#0B1120] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between border border-slate-800 group hover:border-slate-700 transition-colors">

      {/* Анимация поздравления */}
      <CelebrationAnimations
        type={weekDay === 7 ? celebrationType : 'confetti'}
        show={showCelebration && canPlayCelebration}
        withSound={true}
        soundType={weekDay === 7 ? celebrationSoundType : 'default'}
        fullScreen={weekDay === 7}
        anchorPosition={flameAnchorPosition || undefined}
        message={weekDay === 7 ? "🏆 Неделя завершена!" : "🎉 Награда получена!"}
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
              className="flex items-center gap-2 mt-1 flex-wrap"
            >
              <span className="text-xs font-bold text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700">
                Неделя {weekNumber}
              </span>
              {weekDay > 0 && weekDay < 7 && (
                <span className="text-[10px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800">
                  До звания «Недельный герой» осталось {7 - weekDay} {7 - weekDay === 1 ? 'день' : (7 - weekDay >= 2 && 7 - weekDay <= 4 ? 'дня' : 'дней')}
                </span>
              )}
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
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              stroke="url(#fireGradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>

          <div
            ref={flameAnchorRef}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <motion.div
              animate={effectiveHasClaimed ? {
                scale: [1, 1.1, 1],
                filter: [
                  "drop-shadow(0 0 0px rgba(249,115,22,0))",
                  "drop-shadow(0 0 15px rgba(249,115,22,0.4))",
                  "drop-shadow(0 0 0px rgba(249,115,22,0))"
                ]
              } : isDay7 ? {
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className={`w-8 h-8 mb-2 ${effectiveHasClaimed ? 'text-orange-500 fill-orange-500' : isDay7 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} transition-colors duration-500`} />
            </motion.div>
            <span className="text-4xl font-bold text-white tracking-tighter leading-none">{currentStreak}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Дней</span>
          </div>
        </div>
      </div>

      {/* Week Days Dots */}
      <div className="relative z-10 flex justify-between gap-2 mb-6 px-2">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isCompleted = day < weeklyProgress || (day === weeklyProgress && effectiveHasClaimed);
          const isActive = day === weeklyProgress && !effectiveHasClaimed;

          return (
            <div key={day} className="flex-1 flex justify-center group/day relative">
              <div
                className={`w-full max-w-[12px] h-2 rounded-full transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' :
                  isActive ? 'bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-slate-800'
                  }`}
              ></div>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <motion.button
        layout
        onClick={handleClaim}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClaim(e as any);
        }}
        disabled={effectiveHasClaimed || isClaiming}
        animate={isDay7 && !effectiveHasClaimed ? {
          boxShadow: [
            '0 0 20px rgba(255,255,255,0.1)',
            '0 0 30px rgba(251, 191, 36, 0.4)',
            '0 0 20px rgba(255,255,255,0.1)'
          ]
        } : {}}
        transition={{ duration: 2, repeat: isDay7 && !effectiveHasClaimed ? Infinity : 0 }}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className={`relative z-50 w-full py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden group/btn ${effectiveHasClaimed
          ? 'bg-slate-800/50 text-emerald-400 cursor-default border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
          : isDay7
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
            : 'bg-white text-slate-900 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
          }`}
      >
        <AnimatePresence mode="wait">
          {effectiveHasClaimed ? (
            <motion.span
              key="completed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <Check size={16} className="text-emerald-400" />
              Миссия выполнена
            </motion.span>
          ) : (
            <motion.span
              key="claim"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-center gap-2"
            >
              {isClaiming ? 'Обработка...' : weekDay === 7 ? '🎉 Завершить неделю!' : 'Получить бонус'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Продакшен: тестовые кнопки удалены */}
    </div>
  );
});
