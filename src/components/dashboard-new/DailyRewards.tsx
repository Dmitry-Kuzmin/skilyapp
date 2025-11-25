import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Flame, Award, Sparkles, Check, Star } from 'lucide-react';
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
  const [showReward, setShowReward] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [showNewWeek, setShowNewWeek] = useState(false);
  const [celebrationType, setCelebrationType] = useState<CelebrationType>('phoenix');
  const [celebrationSoundType, setCelebrationSoundType] = useState<'default' | 'fanfare' | 'bells' | 'synth' | 'orchestral' | 'pop'>('orchestral');
  const flameAnchorRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [flameAnchorPosition, setFlameAnchorPosition] = useState<{ x: number; y: number } | null>(null);
  const [particles, setParticles] = useState<Array<{ 
    id: number; 
    x: number; 
    y: number; 
    type: 'circle' | 'star' | 'sparkle' | 'burst';
    size: number;
    color: string;
    angle: number;
    distance: number;
  }>>([]);
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
    
    // Разрешаем повторное нажатие для тестирования
    if (isClaiming) {
      console.log('[DailyRewards] Claim blocked: already claiming');
      return;
    }

    console.log('[DailyRewards] Claim started');
    playClickSound();
    setIsClaiming(true);
    setShowReward(true); // Показываем overlay эффект сразу

    // Создаем эффект разлетающихся частиц от кнопки
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Создаем 80 частиц разных типов, разлетающихся от центра кнопки
      const particleTypes: Array<'circle' | 'star' | 'sparkle' | 'burst'> = ['circle', 'star', 'sparkle', 'burst'];
      const newParticles = Array.from({ length: 80 }, (_, i) => {
        const type = particleTypes[i % particleTypes.length];
        const angle = (i / 80) * Math.PI * 2;
        const baseDistance = 120;
        const distance = baseDistance + (i % 5) * 40 + Math.sin(i) * 30;
        const hue = (i * 4.5) % 360;
        const size = type === 'star' ? 4 : type === 'sparkle' ? 3 : type === 'burst' ? 5 : 3;
        
        return {
          id: Date.now() + i,
          x: centerX,
          y: centerY,
          type,
          size,
          color: `hsl(${hue}, 100%, ${60 + (i % 3) * 10}%)`,
          angle,
          distance,
        };
      });
      setParticles(newParticles);
      
      // Удаляем частицы через 2 секунды
      setTimeout(() => {
        setParticles([]);
      }, 2000);
    }

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
      console.log('[DailyRewards] Calling onClaim...');
        await onClaim();
      console.log('[DailyRewards] onClaim completed successfully');
      playSuccessSound(); // Success sound
      
      // Держим overlay видимым 3 секунды
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
    <div className="h-full min-h-[360px] bg-gradient-to-br from-[#0B1120] via-[#0f172a] to-[#0B1120] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between border border-slate-800 group hover:border-slate-700 transition-all duration-500">
      {/* Улучшенное свечение фона - усилено */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-red-500/10 to-orange-500/15 pointer-events-none"
        animate={{
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Shimmer эффект на всей карточке - усилен */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none z-0"
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatDelay: 1.5,
          ease: "linear",
        }}
      />
      
      {/* Дополнительный градиентный overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10 pointer-events-none" />

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
      <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none"
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
          {/* Улучшенное свечение с пульсацией - усилено */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-red-500/25 to-orange-500/30 rounded-full blur-[60px]"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Дополнительное внешнее свечение - усилено */}
          <motion.div
            className="absolute -inset-6 bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-red-500/20 rounded-full blur-[80px]"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Третье свечение для большей глубины */}
          <motion.div
            className="absolute -inset-8 bg-gradient-to-br from-yellow-400/15 via-orange-400/10 to-red-400/15 rounded-full blur-[100px]"
            animate={{
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

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

      {/* Разлетающиеся частицы от кнопки - улучшенная версия */}
      <AnimatePresence>
        {particles.map((particle) => {
          // Разные траектории для разных типов
          let x = 0;
          let y = 0;
          let rotation = 0;
          
          if (particle.type === 'burst') {
            // Взрыв - радиальное разлетание
            x = Math.cos(particle.angle) * particle.distance;
            y = Math.sin(particle.angle) * particle.distance;
          } else if (particle.type === 'star') {
            // Звезды - спиральная траектория
            const spiralFactor = particle.distance * 0.3;
            x = Math.cos(particle.angle + spiralFactor) * particle.distance;
            y = Math.sin(particle.angle + spiralFactor) * particle.distance;
            rotation = particle.angle * (180 / Math.PI) + 360;
          } else if (particle.type === 'sparkle') {
            // Искры - волновая траектория
            const wave = Math.sin(particle.angle * 3) * 30;
            x = Math.cos(particle.angle) * particle.distance + wave;
            y = Math.sin(particle.angle) * particle.distance + wave;
            rotation = particle.angle * (180 / Math.PI) * 2;
          } else {
            // Круги - стандартное разлетание
            x = Math.cos(particle.angle) * particle.distance;
            y = Math.sin(particle.angle) * particle.distance;
          }
          
          const baseDuration = particle.type === 'burst' ? 1.5 : particle.type === 'star' ? 1.8 : 1.3;
          
          if (particle.type === 'star') {
            return (
              <motion.div
                key={particle.id}
                className="absolute pointer-events-none z-[60]"
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                }}
                initial={{ 
                  scale: 0, 
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotate: 0,
                }}
                animate={{ 
                  scale: [0, 1.2, 0.8, 0],
                  opacity: [1, 1, 0.8, 0],
                  x: x,
                  y: y,
                  rotate: rotation,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: baseDuration,
                  ease: "easeOut",
                }}
              >
                <Star 
                  style={{
                    width: `${particle.size * 4}px`,
                    height: `${particle.size * 4}px`,
                    color: particle.color,
                    fill: particle.color,
                    filter: `drop-shadow(0 0 ${particle.size * 2}px ${particle.color})`,
                  }}
                />
              </motion.div>
            );
          } else if (particle.type === 'sparkle') {
            return (
              <motion.div
                key={particle.id}
                className="absolute pointer-events-none z-[60]"
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                }}
                initial={{ 
                  scale: 0, 
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotate: 0,
                }}
                animate={{ 
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                  x: x,
                  y: y,
                  rotate: rotation,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: baseDuration,
                  ease: "easeOut",
                }}
              >
                <Sparkles 
                  style={{
                    width: `${particle.size * 4}px`,
                    height: `${particle.size * 4}px`,
                    color: particle.color,
                    filter: `drop-shadow(0 0 ${particle.size * 2}px ${particle.color})`,
                  }}
                />
              </motion.div>
            );
          } else {
            return (
              <motion.div
                key={particle.id}
                className={`absolute pointer-events-none z-[60] ${particle.type === 'burst' ? 'rounded-full' : 'rounded-full'}`}
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                  width: `${particle.size * 4}px`,
                  height: `${particle.size * 4}px`,
                  background: particle.type === 'burst' 
                    ? `radial-gradient(circle, ${particle.color}, transparent)`
                    : particle.color,
                  boxShadow: `0 0 ${particle.size * 3}px ${particle.color}, 0 0 ${particle.size * 6}px ${particle.color}40`,
                }}
                initial={{ 
                  scale: 0, 
                  opacity: 1,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  scale: particle.type === 'burst' ? [0, 2, 3, 0] : [0, 1.5, 0],
                  opacity: [1, 1, 0.8, 0],
                  x: x,
                  y: y,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: baseDuration,
                  ease: "easeOut",
                }}
              />
            );
          }
        })}
      </AnimatePresence>

      {/* Action Button */}
      <motion.button
        ref={buttonRef}
        layout
        onClick={handleClaim}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClaim(e as any);
        }}
        disabled={isClaiming}
        animate={isDay7 && !isClaiming ? {
          boxShadow: [
            '0 0 20px rgba(255,255,255,0.1)',
            '0 0 40px rgba(251, 191, 36, 0.6)',
            '0 0 20px rgba(255,255,255,0.1)'
          ],
          scale: [1, 1.02, 1],
        } : !isClaiming ? {
          scale: [1, 1.01, 1],
        } : {}}
        transition={{ duration: 2, repeat: !isClaiming ? Infinity : 0 }}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className={`relative z-50 w-full py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden group/btn ${isClaiming
          ? 'bg-slate-800/50 text-slate-400 cursor-wait border border-slate-700/20 shadow-[0_0_15px_rgba(148,163,184,0.1)]'
          : isDay7
            ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(251,191,36,0.4)]'
            : 'bg-gradient-to-r from-white via-slate-50 to-white text-slate-900 hover:scale-[1.02] active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.2)]'
          }`}
      >
        {/* Shimmer эффект на кнопке - усилен */}
        {!isClaiming && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent z-10"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 0.8,
              ease: "linear",
            }}
          />
        )}
        
        {/* Дополнительное свечение для дня 7 - усилено */}
        {isDay7 && !isClaiming && (
          <>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-orange-400/30 to-red-400/30 rounded-2xl blur-md"
              animate={{
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-2xl blur-lg"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        )}
        <AnimatePresence mode="wait">
          {isClaiming ? (
            <motion.span
              key="claiming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2"
            >
              Обработка...
            </motion.span>
          ) : (
            <motion.span
              key="claim"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-center gap-2"
            >
              {weekDay === 7 ? '🎉 Завершить неделю!' : 'Получить бонус'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Reward animation overlay - как в Ai-Studio-2 */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 rounded-[2.5rem]"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-center space-y-4"
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
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center shadow-2xl shadow-orange-500/50"
              >
                <Flame className="w-10 h-10 text-white" fill="white" />
              </motion.div>
              <div>
                <motion.h3
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold mb-2 text-white"
                >
                  Награда получена! 🎉
                </motion.h3>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-4 text-lg"
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
                    className="text-orange-400 font-bold"
                  >
                    +{currentStreak} 🔥
                  </motion.span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
