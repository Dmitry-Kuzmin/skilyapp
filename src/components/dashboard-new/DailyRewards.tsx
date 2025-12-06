import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Flame, Info, X, Gift, Coins, TrendingUp, Zap, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CelebrationAnimations, CelebrationType } from './CelebrationAnimations';
import { CelebrationModal } from './CelebrationModal';
import { playClickSound, playSuccessSound } from '@/services/audioService';
import { useCockpitSettings } from '@/hooks/useCockpitSettings';
import { useDailyBonusDefinitions } from '@/hooks/useStaticData';
import { useTheme } from 'next-themes';

interface DailyRewardsProps {
  currentStreak: number;
  hasClaimedToday: boolean;
  onClaim: () => void;
}

/**
 * DAILY REWARDS - Вариант B (улучшенный)
 * - Круг меньшего размера слева
 * - Карточки дней справа от круга
 * - Сохранен весь функционал (confetti, celebrations, mystery box)
 * - Уменьшены отступы для компактности
 */
export const DailyRewards = React.memo<DailyRewardsProps>(({ 
  currentStreak, 
  hasClaimedToday, 
  onClaim
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [celebrationType, setCelebrationType] = useState<CelebrationType>('phoenix');
  const [celebrationSoundType, setCelebrationSoundType] = useState<'default' | 'fanfare' | 'bells' | 'synth' | 'orchestral' | 'pop'>('orchestral');
  const flameAnchorRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [flameAnchorPosition, setFlameAnchorPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Canvas-based confetti
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    gravity: number;
  }>>([]);
  const animationFrameRef = useRef<number | null>(null);

  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';
  const effectiveHasClaimed = hasClaimedToday;

  // ОПТИМИЗАЦИЯ: Используем кэшированные данные вместо прямого запроса
  const { data: weeklyRewards = [] } = useDailyBonusDefinitions();

  const { settings: cockpitSettings } = useCockpitSettings();
  const celebrationMode = cockpitSettings.animationMode;
  const canPlayCelebration = celebrationMode !== 'off';
  const celebrationDuration = celebrationMode === 'reduced' ? 4500 : 8000;

  const { weekNumber, weekDay, weeklyProgress, progressPercent, strokeDashoffset, radius, circumference, isDay7 } = useMemo(() => {
    const wp = currentStreak === 0 ? 0 : (currentStreak % 7 === 0 ? 7 : currentStreak % 7);
    const pp = (wp / 7) * 100;
    const r = 35;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pp / 100) * circ;
    const wn = currentStreak === 0 ? 0 : Math.ceil(currentStreak / 7);
    const wd = currentStreak === 0 ? 0 : (currentStreak % 7 || 7);
    const isDay7Value = wd === 7 && !effectiveHasClaimed;
    
    return {
      weekNumber: wn,
      weekDay: wd,
      weeklyProgress: wp,
      progressPercent: pp,
      strokeDashoffset: offset,
      radius: r,
      circumference: circ,
      isDay7: isDay7Value
    };
  }, [currentStreak, effectiveHasClaimed]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Confetti animation
  const fireConfetti = useCallback((startX: number, startY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const colors = ['#ff4d00', '#ffb700', '#2ECC71', '#3b82f6', '#8b5cf6', '#ffffff', '#fbbf24'];
    
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    for (let i = 0; i < 150; i++) {
      particlesRef.current.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20 - 8,
        size: Math.random() * 10 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 120,
        gravity: 0.4,
      });
    }

    animateConfetti();
  }, []);

  const animateConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particlesRef.current.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ОПТИМИЗАЦИЯ: Используем более эффективный способ удаления частиц
    // Вместо filter (создает новый массив) используем in-place удаление
    let writeIndex = 0;
    for (let i = 0; i < particlesRef.current.length; i++) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;
      p.size *= 0.96;

      // Рисуем только живые частицы
      if (p.life > 0) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Сохраняем живую частицу
        particlesRef.current[writeIndex++] = p;
      }
    }
    
    // Удаляем мертвые частицы (обрезаем массив)
    particlesRef.current.length = writeIndex;
    animationFrameRef.current = requestAnimationFrame(animateConfetti);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Синхронизируем координаты иконки огня с анимацией
  useEffect(() => {
    // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для избежания forced layout
    const updateAnchorPosition = () => {
      if (!flameAnchorRef.current) return;
      // Батчим чтение layout свойств в requestAnimationFrame
      requestAnimationFrame(() => {
        const rect = flameAnchorRef.current!.getBoundingClientRect();
        setFlameAnchorPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
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
    
    if (isClaiming || effectiveHasClaimed) {
      console.log('[DailyRewards] Claim blocked:', { isClaiming, effectiveHasClaimed });
      return;
    }

    console.log('[DailyRewards] Claim started');
    playClickSound();
    setIsClaiming(true);
    setShowReward(true);

    // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для избежания forced layout
    // Запускаем confetti из позиции кнопки
    if (buttonRef.current) {
      requestAnimationFrame(() => {
        const rect = buttonRef.current!.getBoundingClientRect();
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;
        fireConfetti(clickX, clickY);
      });
    }

    // Показываем эффекты победы для всех дней
    if (canPlayCelebration) {
      if (weekDay === 7) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setShowCelebrationModal(true);
        }, celebrationDuration);
      } else {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
        }, celebrationMode === 'reduced' ? 2000 : 3000);
      }
    } else if (weekDay === 7) {
      setShowCelebration(false);
      setShowCelebrationModal(true);
    }

    try {
      console.log('[DailyRewards] Calling onClaim...');
      await onClaim();
      console.log('[DailyRewards] onClaim completed successfully');
      playSuccessSound();
      
      setTimeout(() => {
        setShowReward(false);
      }, 3000);
    } catch (error) {
      console.error('[DailyRewards] Error in onClaim:', error);
      setShowReward(false);
    } finally {
      setTimeout(() => setIsClaiming(false), 1000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`h-full relative overflow-hidden rounded-3xl p-4 flex flex-col ${
        isDarkTheme 
          ? 'bg-gradient-to-br from-[#0B1120] via-[#0f172a] to-[#0B1120] border-slate-800' 
          : 'bg-gradient-to-br from-white via-slate-50 to-white border-slate-200'
      } border shadow-xl`}
    >
      {/* Background effects */}
      <div className={`absolute -top-20 -right-20 w-60 h-60 ${isDarkTheme ? 'bg-orange-500/10' : 'bg-orange-200/30'} rounded-full blur-3xl animate-pulse opacity-50`} />
      
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 pointer-events-none z-[100]"
        style={{ width: '100vw', height: '100vh' }}
      />

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

      {/* Золотое свечение для дня 7 */}
      {isDay7 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDarkTheme ? [0.1, 0.2, 0.1] : [0.15, 0.3, 0.15] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 ${isDarkTheme ? 'bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20' : 'bg-gradient-to-br from-yellow-200/30 via-orange-200/30 to-red-200/30'} rounded-3xl pointer-events-none`}
        />
      )}

      {/* HEADER - уменьшенные отступы */}
      <div className="relative z-10 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-xl border ${
            isDarkTheme ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-100/80 border-orange-300/60'
          }`}>
            <Flame className={`w-4 h-4 ${isDarkTheme ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div>
            <h3 className={`font-bold text-base leading-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
              Ежедневная серия
            </h3>
            {weekNumber > 0 && (
              <span className={`text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                Неделя {weekNumber}
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowInfo(!showInfo)}
          className={`p-1.5 rounded-full transition-colors ${
            isDarkTheme
              ? 'bg-slate-700/50 hover:bg-slate-700 border-slate-600/50'
              : 'bg-slate-100/80 hover:bg-slate-200 border-slate-200/60'
          } border`}
        >
          {showInfo ? <X size={14} /> : <Info size={14} />}
        </button>
      </div>

      {/* MAIN CONTENT: Круг + Карточки - уменьшенные отступы */}
      <div className="relative z-10 flex items-center gap-3 mb-3 flex-1">
        {/* КРУГ */}
        <div className="flex-shrink-0">
          <div className="relative w-24 h-24">
            {/* Glow */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-red-500/25 to-orange-500/30 rounded-full blur-2xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.6, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
            
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="#1e293b"
                strokeWidth="6"
                fill="none"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="35"
                stroke="url(#fireGradient)"
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="fireGradient">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>

            <div ref={flameAnchorRef} className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                animate={effectiveHasClaimed ? {
                  scale: [1, 1.1, 1],
                } : isDay7 ? {
                  scale: [1, 1.15, 1],
                  rotate: [0, 5, -5, 0]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className={`w-5 h-5 mb-0.5 ${
                  effectiveHasClaimed 
                    ? isDarkTheme ? 'text-orange-500 fill-orange-500' : 'text-orange-500 fill-orange-500'
                    : isDay7 
                    ? isDarkTheme ? 'text-yellow-400 fill-yellow-400' : 'text-yellow-500 fill-yellow-500'
                    : isDarkTheme ? 'text-orange-400' : 'text-orange-600'
                }`} />
              </motion.div>
              <span className={`text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                {currentStreak}
              </span>
              <span className={`text-[7px] uppercase font-bold tracking-widest ${
                isDarkTheme ? 'text-slate-500' : 'text-slate-500'
              }`}>
                ДНЕЙ
              </span>
            </div>
          </div>
        </div>

        {/* КАРТОЧКИ СПРАВА */}
        <div className="flex-1">
          <div className={`text-[10px] mb-1.5 ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
            Осталось {7 - weekDay} {7 - weekDay === 1 ? 'день' : 'дней'} до 🎁
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isClaimed = day < weekDay || (day === weekDay && effectiveHasClaimed);
              const isCurrent = day === weekDay && !effectiveHasClaimed;
              const isDay7Card = day === 7;

              return (
                <motion.div
                  key={day}
                  whileHover={{ scale: 1.05 }}
                  className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? isDarkTheme
                        ? 'bg-orange-500/20 border-orange-500/50'
                        : 'bg-orange-100 border-orange-400'
                      : isClaimed
                      ? isDarkTheme
                        ? 'bg-slate-800/50 border-slate-700'
                        : 'bg-slate-100 border-slate-300'
                      : isDarkTheme
                      ? 'bg-slate-900/30 border-slate-800 opacity-50'
                      : 'bg-slate-50/40 border-slate-200 opacity-50'
                  }`}
                >
                  {isClaimed ? (
                    <span className={isDarkTheme ? 'text-slate-400' : 'text-slate-600'}>✓</span>
                  ) : isDay7Card ? (
                    <Gift className={`w-3 h-3 ${isCurrent ? 'text-yellow-400 animate-bounce' : 'text-slate-600'}`} />
                  ) : (
                    <span className={
                      isCurrent
                        ? isDarkTheme ? 'text-orange-400' : 'text-orange-600'
                        : isDarkTheme ? 'text-slate-600' : 'text-slate-400'
                    }>
                      {day}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* КНОПКА - уменьшенный padding */}
      <motion.button
        ref={buttonRef}
        onClick={handleClaim}
        disabled={isClaiming || effectiveHasClaimed}
        whileTap={{ scale: 0.98 }}
        className={`relative z-10 w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
          effectiveHasClaimed
            ? isDarkTheme
              ? 'bg-slate-800/50 text-slate-500 cursor-default'
              : 'bg-slate-200/50 text-slate-500 cursor-default'
            : isDarkTheme
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/50'
            : 'bg-gradient-to-r from-orange-400 to-red-400 text-white hover:shadow-lg hover:shadow-orange-400/50'
        }`}
      >
        {effectiveHasClaimed ? '✓ Получено сегодня' : 'Получить бонус'}
      </motion.button>

      {/* Info Panel - ИСПРАВЛЕН z-index и видимость */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col rounded-3xl overflow-hidden"
          >
            <div className={`absolute inset-0 ${isDarkTheme ? 'bg-slate-900/98' : 'bg-white/98'} backdrop-blur-xl`} />
            <div className="relative z-10 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  📅 Награды по дням
                </h3>
                <button
                  onClick={() => setShowInfo(false)}
                  className={`p-1.5 rounded-full ${
                    isDarkTheme
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {weeklyRewards.map((reward) => {
                  const rewardData = reward.reward || {};
                  return (
                    <div
                      key={reward.day_number}
                      className={`p-3 rounded-lg border ${
                        isDarkTheme
                          ? 'bg-slate-800/30 border-slate-700/40'
                          : 'bg-slate-50/60 border-slate-200/40'
                      }`}
                    >
                      <div className={`font-semibold mb-1 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                        День {reward.day_number}: {reward.description}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {rewardData.xp > 0 && (
                          <div className={`flex items-center gap-1 ${isDarkTheme ? 'text-orange-400' : 'text-orange-600'}`}>
                            <TrendingUp className="w-3 h-3" />
                            <span>+{rewardData.xp} XP</span>
                          </div>
                        )}
                        {rewardData.coins > 0 && (
                          <div className={`flex items-center gap-1 ${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            <Coins className="w-3 h-3" />
                            <span>+{rewardData.coins} 🪙</span>
                          </div>
                        )}
                        {rewardData.boost && (
                          <div className={`flex items-center gap-1 ${isDarkTheme ? 'text-purple-400' : 'text-purple-600'}`}>
                            <Zap className="w-3 h-3" />
                            <span>Boost</span>
                          </div>
                        )}
                        {rewardData.badge && (
                          <div className={`flex items-center gap-1 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>
                            <Trophy className="w-3 h-3" />
                            <span>Бейдж</span>
                          </div>
                        )}
                        {rewardData.random_loot && (
                          <div className={`flex items-center gap-1 ${isDarkTheme ? 'text-green-400' : 'text-green-600'}`}>
                            <Gift className="w-3 h-3" />
                            <span>Лут</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward animation overlay */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${isDarkTheme ? 'bg-background/95' : 'bg-white/95'} backdrop-blur-sm flex items-center justify-center z-40 rounded-3xl`}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-center space-y-3"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 0.3
                }}
                className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center ${isDarkTheme ? 'shadow-2xl shadow-orange-500/50' : 'shadow-2xl shadow-orange-400/60'}`}
              >
                <Flame className="w-8 h-8 text-white" fill="white" />
              </motion.div>
              <div>
                <motion.h3
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`text-xl font-bold mb-2 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}
                >
                  Награда получена! 🎉
                </motion.h3>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-3 text-base"
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
                    className={`${isDarkTheme ? 'text-orange-400' : 'text-orange-600'} font-bold`}
                  >
                    +{currentStreak} 🔥
                  </motion.span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
