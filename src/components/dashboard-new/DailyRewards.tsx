import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Flame, Award, Sparkles, Zap, Gift, Trophy, Info, Coins, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CelebrationAnimations, CelebrationType } from './CelebrationAnimations';
import { CelebrationModal } from './CelebrationModal';
import { playClickSound, playSuccessSound } from '@/services/audioService';
import { useCockpitSettings } from '@/hooks/useCockpitSettings';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [showRewardsInfo, setShowRewardsInfo] = useState(false);
  const [weeklyRewards, setWeeklyRewards] = useState<any[]>([]);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
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
  
  const effectiveHasClaimed = hasClaimedToday;
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  // Загружаем награды
  useEffect(() => {
    const loadRewards = async () => {
      const { data } = await supabase
        .from('daily_bonus_def')
        .select('day_number, reward, description')
        .order('day_number', { ascending: true })
        .limit(7);
      
      if (data) {
        setWeeklyRewards(data);
      }
    };
    
    loadRewards();
  }, []);

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

  // Цвета для светлой и темной темы (после вычисления isDay7)
  const containerBg = isDarkTheme 
    ? 'bg-gradient-to-br from-[#0B1120] via-[#0f172a] to-[#0B1120]'
    : 'bg-gradient-to-br from-white via-slate-50 to-white';
  const containerBorder = isDarkTheme
    ? 'border-slate-800 group-hover:border-slate-700'
    : 'border-slate-200 group-hover:border-slate-300';
  const textColor = isDarkTheme ? 'text-white' : 'text-slate-900';
  const textMuted = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const textLight = isDarkTheme ? 'text-slate-300' : 'text-slate-700';
  const bgGlow = isDarkTheme
    ? 'bg-gradient-to-br from-orange-500/15 via-red-500/10 to-orange-500/15'
    : 'bg-gradient-to-br from-orange-100/30 via-red-100/20 to-orange-100/30';
  const shimmerColor = isDarkTheme ? 'via-white/15' : 'via-slate-200/30';
  const gridColor = isDarkTheme ? '#fff' : '#000';
  const badgeBg = isDarkTheme ? 'bg-slate-800/50' : 'bg-slate-100/80';
  const badgeBorder = isDarkTheme ? 'border-slate-700' : 'border-slate-300';
  const badgeText = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const dotCompleted = isDarkTheme 
    ? 'bg-gradient-to-r from-orange-500 to-red-500'
    : 'bg-gradient-to-r from-orange-400 to-red-400';
  const dotActive = isDarkTheme ? 'bg-white' : 'bg-orange-500';
  const dotInactive = isDarkTheme ? 'bg-slate-800' : 'bg-slate-200';
  const buttonBg = isDarkTheme
    ? isDay7
      ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500'
      : 'bg-gradient-to-r from-white via-slate-50 to-white'
    : isDay7
      ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400'
      : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900';
  const buttonText = isDarkTheme
    ? isDay7 ? 'text-white' : 'text-slate-900'
    : isDay7 ? 'text-white' : 'text-white';
  const flameColor = isDarkTheme
    ? effectiveHasClaimed ? 'text-orange-500 fill-orange-500' : isDay7 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
    : effectiveHasClaimed ? 'text-orange-500 fill-orange-500' : isDay7 ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400';
  const streakText = isDarkTheme ? 'text-white' : 'text-slate-900';
  const streakLabel = isDarkTheme ? 'text-slate-500' : 'text-slate-500';

  // Показываем плашку "Следующая неделя началась" при новой неделе
  useEffect(() => {
    if (isNewWeek && !showNewWeek) {
      setShowNewWeek(true);
      const timer = setTimeout(() => setShowNewWeek(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNewWeek, showNewWeek]);

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

    const colors = ['#ff4d00', '#ffb700', '#2ECC71', '#ffffff'];
    
    // Убеждаемся, что canvas имеет правильные размеры
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    for (let i = 0; i < 100; i++) {
      particlesRef.current.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15 - 5,
        size: Math.random() * 8 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 100,
        gravity: 0.5,
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

    for (let i = 0; i < particlesRef.current.length; i++) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;
      p.size *= 0.96;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
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

    // Запускаем confetti из позиции кнопки
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const clickX = rect.left + rect.width / 2;
      const clickY = rect.top + rect.height / 2;
      fireConfetti(clickX, clickY);
    } else if (e?.currentTarget) {
      // Fallback: используем координаты клика
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = rect.left + rect.width / 2;
      const clickY = rect.top + rect.height / 2;
      fireConfetti(clickX, clickY);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`h-full min-h-[360px] ${containerBg} rounded-2xl sm:rounded-3xl p-6 sm:p-8 ${textColor} relative overflow-hidden shadow-xl hover:shadow-2xl flex flex-col justify-between border ${containerBorder} group transition-all duration-500`}
    >
      {/* Premium background effects - в стиле уровней готовности */}
      <div className={`absolute inset-0 ${isDarkTheme ? 'bg-gradient-to-br from-primary/5 via-transparent to-secondary/5' : 'bg-gradient-to-br from-primary/10 via-transparent to-secondary/10'} pointer-events-none`} />
      <div className={`absolute -top-20 -right-20 w-60 h-60 ${isDarkTheme ? 'bg-orange-500/10' : 'bg-orange-200/30'} rounded-full blur-3xl animate-pulse opacity-50`} />
      
      {/* Улучшенное свечение фона - адаптивное для темы */}
      <motion.div
        className={`absolute inset-0 ${bgGlow} pointer-events-none`}
        animate={{
          opacity: isDarkTheme ? [0.4, 0.7, 0.4] : [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Shimmer эффект на всей карточке - адаптивный */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r from-transparent ${shimmerColor} to-transparent pointer-events-none z-0`}
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
      
      {/* Дополнительный градиентный overlay - адаптивный */}
      <div className={`absolute inset-0 bg-gradient-to-br ${isDarkTheme ? 'from-orange-500/10 via-transparent to-red-500/10' : 'from-orange-100/20 via-transparent to-red-100/20'} pointer-events-none`} />

      {/* Confetti Canvas - fixed position to cover entire viewport */}
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

      {/* Плашка "Следующая неделя началась" - адаптивная */}
      <AnimatePresence>
        {showNewWeek && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 ${
              isDarkTheme
                ? 'bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border-yellow-500/30'
                : 'bg-gradient-to-r from-yellow-100/80 via-orange-100/80 to-red-100/80 border-yellow-300/60'
            } backdrop-blur-sm border rounded-xl px-4 py-2 shadow-lg`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'} animate-pulse`} />
              <span className={`text-xs font-bold ${isDarkTheme ? 'text-yellow-200' : 'text-yellow-800'}`}>✨ Следующая неделя началась!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Золотое свечение для дня 7 - адаптивное */}
      {isDay7 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDarkTheme ? [0.1, 0.2, 0.1] : [0.15, 0.3, 0.15] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 ${isDarkTheme ? 'bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20' : 'bg-gradient-to-br from-yellow-200/30 via-orange-200/30 to-red-200/30'} rounded-2xl sm:rounded-3xl pointer-events-none`}
        />
      )}

      {/* Subtle Grid Background - адаптивный */}
      <div className={`absolute inset-0 ${isDarkTheme ? 'opacity-[0.03]' : 'opacity-[0.08]'} group-hover:${isDarkTheme ? 'opacity-[0.06]' : 'opacity-[0.12]'} transition-opacity pointer-events-none`}
        style={{ backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`, backgroundSize: '24px 24px' }}>
      </div>

      {/* Header - в стиле уровней готовности, компактный для десктопа */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex-shrink-0 ${
              isDay7 
                ? isDarkTheme ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-100/80 border-yellow-300/60'
                : isDarkTheme ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-100/80 border-orange-300/60'
            }`}
          >
            <Flame className={`w-4 h-4 sm:w-5 sm:h-5 ${
              isDay7 
                ? isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'
                : isDarkTheme ? 'text-orange-400' : 'text-orange-600'
            }`} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap">
              <h3 className={`font-bold text-base sm:text-lg tracking-tight ${isDarkTheme ? 'text-slate-100' : 'text-slate-900'} whitespace-nowrap`}>
                Ежедневная серия
              </h3>
              {weekNumber > 0 && (
                <>
                  <span className={`text-[10px] sm:text-xs font-bold ${badgeText} ${badgeBg} px-1.5 sm:px-2 py-0.5 rounded-md border ${badgeBorder} whitespace-nowrap`}>
                    Неделя {weekNumber}
                  </span>
                  {weekDay > 0 && weekDay < 7 && (
                    <span className={`text-[9px] sm:text-[10px] ${badgeText} ${isDarkTheme ? 'bg-slate-900/60' : 'bg-slate-200/80'} px-1.5 sm:px-2 py-0.5 rounded-md border ${isDarkTheme ? 'border-slate-800' : 'border-slate-300'} whitespace-nowrap hidden sm:inline`}>
                      Осталось: {7 - weekDay} {7 - weekDay === 1 ? 'день' : (7 - weekDay >= 2 && 7 - weekDay <= 4 ? 'дня' : 'дней')}
                    </span>
                  )}
                  {isDay7 && (
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className={`text-[10px] sm:text-xs font-bold ${isDarkTheme ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 'text-yellow-600 bg-yellow-100/80 border-yellow-300'} px-1.5 sm:px-2 py-0.5 rounded-md border whitespace-nowrap`}
                    >
                      🎉 Завершение!
                    </motion.span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Кнопка с информацией - сверху справа как в уровнях готовности */}
        <div className="absolute top-6 right-6 z-20">
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => setShowRewardsInfo(!showRewardsInfo)}
            className={`w-8 h-8 rounded-full ${
              isDarkTheme
                ? 'bg-slate-700/50 hover:bg-slate-700 border-slate-600/50 hover:border-indigo-500/50'
                : 'bg-slate-100/80 hover:bg-slate-200 border-slate-200/60 hover:border-indigo-400/60'
            } border flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95`}
          >
            {showRewardsInfo ? (
              <X size={16} className={isDarkTheme ? 'text-slate-300' : 'text-slate-600'} />
            ) : (
              <Info size={16} className={isDarkTheme ? 'text-slate-300' : 'text-slate-600'} />
            )}
          </motion.button>
        </div>
      </div>

      {/* Main Gauge */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center py-6 transition-all duration-500 ${
        showRewardsInfo ? 'opacity-0 scale-95 -translate-y-4 pointer-events-none' : 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
      }`}>
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
                  `drop-shadow(0 0 15px rgba(249,115,22,${isDarkTheme ? '0.4' : '0.6'}))`,
                  "drop-shadow(0 0 0px rgba(249,115,22,0))"
                ]
              } : isDay7 ? {
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className={`w-8 h-8 mb-2 ${flameColor} transition-colors duration-500`} />
            </motion.div>
            <span className={`text-4xl font-bold ${streakText} tracking-tighter leading-none`}>{currentStreak}</span>
            <span className={`text-[10px] uppercase font-bold ${streakLabel} tracking-widest mt-1`}>Дней</span>
          </div>
        </div>
      </div>

      {/* Week Days Dots with Tooltips */}
      <div className={`relative z-10 flex justify-between gap-2 mb-6 px-2 transition-all duration-500 ${
        showRewardsInfo ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
      }`}>
        <TooltipProvider>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isCompleted = day < weeklyProgress || (day === weeklyProgress && effectiveHasClaimed);
            const isActive = day === weeklyProgress && !effectiveHasClaimed;
            const reward = weeklyRewards.find(r => r.day_number === day);
            const rewardData = reward?.reward || {};

            return (
              <Tooltip key={day}>
                <TooltipTrigger asChild>
                  <div 
                    className="flex-1 flex justify-center group/day relative cursor-help"
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <div
                      className={`w-full max-w-[12px] h-2 rounded-full transition-all duration-500 ${
                        isCompleted 
                          ? `${dotCompleted} ${isDarkTheme ? 'shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'shadow-[0_0_8px_rgba(249,115,22,0.4)]'}`
                          : isActive 
                            ? `${dotActive} ${isDarkTheme ? 'animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.4)]'}`
                            : dotInactive
                      }`}
                    ></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className={`${isDarkTheme ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'} p-3 max-w-[200px]`}>
                  <div className="space-y-2">
                    <div className={`font-bold text-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>День {day}</div>
                    <div className={`text-xs ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>{reward?.description || 'Награда'}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {rewardData.xp > 0 && (
                        <div className="flex items-center gap-1 text-orange-400">
                          <TrendingUp className="w-3 h-3" />
                          <span>+{rewardData.xp} XP</span>
                        </div>
                      )}
                      {rewardData.coins > 0 && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Coins className="w-3 h-3" />
                          <span>+{rewardData.coins} 🪙</span>
                        </div>
                      )}
                      {rewardData.boost && (
                        <div className="flex items-center gap-1 text-purple-400">
                          <Zap className="w-3 h-3" />
                          <span>Boost</span>
                        </div>
                      )}
                      {rewardData.badge && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <Trophy className="w-3 h-3" />
                          <span>Бейдж</span>
                        </div>
                      )}
                      {rewardData.random_loot && (
                        <div className="flex items-center gap-1 text-green-400">
                          <Gift className="w-3 h-3" />
                          <span>Лут</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Rewards Info Panel - полноэкранная панель внутри виджета */}
      <AnimatePresence>
        {showRewardsInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl"
          >
            {/* Фон панели */}
            <div className={`absolute inset-0 ${isDarkTheme ? 'bg-slate-900/98' : 'bg-white/98'} backdrop-blur-xl`} />
            
            {/* Контент панели */}
            <div className="relative z-10 flex flex-col h-full overflow-y-auto px-6 sm:px-8 py-6">
              {/* Заголовок - упрощенный, компактный для десктопа */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-start justify-between gap-4 mb-3 sm:mb-4">
                  <h2 className={`text-lg sm:text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                    💡 О ежедневных наградах
                  </h2>
                </div>
                <p className={`text-xs sm:text-sm ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'} hidden sm:block`}>
                  Каждый день ты получаешь награды за вход. Чем больше дней подряд, тем лучше награды!
                </p>
              </div>
              
              {/* Типы наград - компактные иконки, в одну строку на десктопе */}
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkTheme ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}
                  >
                    <Zap className={`w-4 h-4 ${isDarkTheme ? 'text-purple-400' : 'text-purple-600'}`} />
                    <div>
                      <div className={`text-xs font-semibold ${isDarkTheme ? 'text-purple-400' : 'text-purple-600'}`}>Boost</div>
                      <div className={`text-[10px] ${isDarkTheme ? 'text-slate-500' : 'text-slate-600'}`}>×2 SP</div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkTheme ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}
                  >
                    <Gift className={`w-4 h-4 ${isDarkTheme ? 'text-green-400' : 'text-green-600'}`} />
                    <div>
                      <div className={`text-xs font-semibold ${isDarkTheme ? 'text-green-400' : 'text-green-600'}`}>Стикеры</div>
                      <div className={`text-[10px] ${isDarkTheme ? 'text-slate-500' : 'text-slate-600'}`}>Для дуэлей</div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkTheme ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}
                  >
                    <Trophy className={`w-4 h-4 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div>
                      <div className={`text-xs font-semibold ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>Бейджи</div>
                      <div className={`text-[10px] ${isDarkTheme ? 'text-slate-500' : 'text-slate-600'}`}>Сезонные</div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkTheme ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}
                  >
                    <Sparkles className={`w-4 h-4 ${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <div>
                      <div className={`text-xs font-semibold ${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'}`}>Сюрприз</div>
                      <div className={`text-[10px] ${isDarkTheme ? 'text-slate-500' : 'text-slate-600'}`}>Случайный лут</div>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              {/* Награды по дням */}
              <div className="mt-4 sm:mt-6">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'} mb-2 sm:mb-3`}>
                  📅 Награды по дням
                </h3>
                {/* Награды по дням - компактный дизайн */}
                <div className="space-y-2">
                    {weeklyRewards.map((reward, idx) => {
                      const dayNum = reward.day_number;
                      const rewardData = reward.reward || {};
                      const isCurrentDay = dayNum === weekDay;
                      const isCompleted = dayNum < weeklyProgress || (dayNum === weeklyProgress && effectiveHasClaimed);
                      
                      return (
                        <motion.div
                          key={dayNum}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.03 }}
                          className={`p-3 rounded-lg border transition-all ${
                            isCurrentDay && !effectiveHasClaimed
                              ? isDarkTheme
                                ? 'bg-orange-500/15 border-orange-500/40'
                                : 'bg-orange-50 border-orange-300/60'
                              : isCompleted
                              ? isDarkTheme
                                ? 'bg-slate-800/30 border-slate-700/40'
                                : 'bg-slate-100/60 border-slate-300/40'
                              : isDarkTheme
                                ? 'bg-slate-800/15 border-slate-700/25 opacity-50'
                                : 'bg-slate-50/40 border-slate-200/30 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                                isCurrentDay && !effectiveHasClaimed
                                  ? isDarkTheme ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                                  : isCompleted
                                  ? isDarkTheme ? 'bg-slate-700/40 text-slate-400' : 'bg-slate-200 text-slate-600'
                                  : isDarkTheme ? 'bg-slate-800/40 text-slate-500' : 'bg-slate-200/50 text-slate-400'
                              }`}>
                                {dayNum}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-semibold text-sm ${
                                  isCurrentDay && !effectiveHasClaimed
                                    ? isDarkTheme ? 'text-orange-400' : 'text-orange-600'
                                    : isCompleted
                                    ? isDarkTheme ? 'text-slate-300' : 'text-slate-700'
                                    : isDarkTheme ? 'text-slate-500' : 'text-slate-500'
                                }`}>
                                  {reward.description}
                                </div>
                              </div>
                            </div>
                            {isCurrentDay && !effectiveHasClaimed && (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold whitespace-nowrap ${
                                isDarkTheme
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : 'bg-orange-100 text-orange-600'
                              }`}>
                                Сегодня
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1.5">
                            {rewardData.xp > 0 && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                                isDarkTheme ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-100 text-orange-600'
                              }`}>
                                <TrendingUp className="w-3 h-3 flex-shrink-0" />
                                <span className="font-semibold">+{rewardData.xp} XP</span>
                              </div>
                            )}
                            {rewardData.coins > 0 && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                                isDarkTheme ? 'bg-yellow-500/15 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                              }`}>
                                <Coins className="w-3 h-3 flex-shrink-0" />
                                <span className="font-semibold">+{rewardData.coins} 🪙</span>
                              </div>
                            )}
                            {rewardData.boost && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                                isDarkTheme ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-600'
                              }`}>
                                <Zap className="w-3 h-3 flex-shrink-0" />
                                <span className="font-semibold">Boost</span>
                              </div>
                            )}
                            {rewardData.badge && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                                isDarkTheme ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-600'
                              }`}>
                                <Trophy className="w-3 h-3 flex-shrink-0" />
                                <span className="font-semibold">Бейдж</span>
                              </div>
                            )}
                            {rewardData.random_loot && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                                isDarkTheme ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-600'
                              }`}>
                                <Gift className="w-3 h-3 flex-shrink-0" />
                                <span className="font-semibold">
                                  {rewardData.random_loot.type === 'sticker' ? 'Стикер' : 'Сюрприз'}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
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
        disabled={isClaiming || showRewardsInfo}
        className={`transition-all duration-500 ${
          showRewardsInfo ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
        }`}
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
        className={`relative z-50 w-full py-4 rounded-2xl font-bold text-xs tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden group/btn ${
          isClaiming
            ? isDarkTheme
              ? 'bg-slate-800/50 text-slate-400 cursor-wait border border-slate-700/20 shadow-[0_0_15px_rgba(148,163,184,0.1)]'
              : 'bg-slate-200/50 text-slate-500 cursor-wait border border-slate-300/20 shadow-[0_0_15px_rgba(148,163,184,0.1)]'
            : isDay7
              ? `${buttonBg} ${buttonText} hover:scale-[1.02] active:scale-95 ${isDarkTheme ? 'shadow-[0_0_30px_rgba(251,191,36,0.4)]' : 'shadow-[0_0_25px_rgba(251,191,36,0.5)]'}`
              : isDarkTheme
                ? 'bg-gradient-to-r from-white via-slate-50 to-white text-slate-900 hover:scale-[1.02] active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.2)]'
                : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white hover:scale-[1.02] active:scale-95 shadow-[0_0_25px_rgba(0,0,0,0.2)]'
        }`}
      >
        {/* Shimmer эффект на кнопке - адаптивный */}
        {!isClaiming && (
          <motion.div
            className={`absolute inset-0 bg-gradient-to-r from-transparent ${isDarkTheme ? isDay7 ? 'via-white/50' : 'via-white/50' : isDay7 ? 'via-white/40' : 'via-slate-200/30'} to-transparent z-10`}
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
        
        {/* Дополнительное свечение для дня 7 - адаптивное */}
        {isDay7 && !isClaiming && (
          <>
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r ${isDarkTheme ? 'from-yellow-400/30 via-orange-400/30 to-red-400/30' : 'from-yellow-300/40 via-orange-300/40 to-red-300/40'} rounded-2xl blur-md`}
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
              className={`absolute -inset-1 bg-gradient-to-r ${isDarkTheme ? 'from-yellow-500/20 via-orange-500/20 to-red-500/20' : 'from-yellow-400/30 via-orange-400/30 to-red-400/30'} rounded-2xl blur-lg`}
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

      {/* Reward animation overlay - адаптивный */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${isDarkTheme ? 'bg-background/95' : 'bg-white/95'} backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl sm:rounded-3xl`}
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
                className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center ${isDarkTheme ? 'shadow-2xl shadow-orange-500/50' : 'shadow-2xl shadow-orange-400/60'}`}
              >
                <Flame className="w-10 h-10 text-white" fill="white" />
              </motion.div>
              <div>
                <motion.h3
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`text-2xl font-bold mb-2 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}
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
