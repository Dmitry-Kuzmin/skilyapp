import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { useModalRoute } from '@/hooks/useModalRoute';
import { playClickSound } from '@/services/audioService';
import { useTheme } from 'next-themes';
import { useDuelPassInfo } from '@/hooks/useDuelPassInfo';
import { DailyQuestWidget } from '@/components/duel/pass/DailyQuestWidget';
import { useLanguage } from '@/contexts/LanguageContext';

interface DuelPassInfoProps {
  className?: string;
}

/**
 * ОПТИМИЗИРОВАННЫЙ компонент DuelPassInfo
 */
export const DuelPassInfo: React.FC<DuelPassInfoProps> = React.memo(({ className }) => {
  const { openModal } = useModalRoute('duel-pass-season');
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';
  const { language } = useLanguage();

  const { data: duelPassData, loading } = useDuelPassInfo();

  const ui = {
    level:     language === 'es' ? 'Nivel'    : language === 'en' ? 'Level'     : 'Уровень',
    toNext:    language === 'es' ? 'Al sig. nivel:' : language === 'en' ? 'To next level:' : 'До след. уровня:',
    remaining: language === 'es' ? 'Quedan'   : language === 'en' ? 'Remaining' : 'Осталось',
    duels:     language === 'es' ? 'Duelos'   : language === 'en' ? 'Duels'     : 'Дуэли',
    days: (n: number) => language === 'es' ? `${n} día${n !== 1 ? 's' : ''}`
      : language === 'en' ? `${n} day${n !== 1 ? 's' : ''}`
      : `${n} ${n === 1 ? 'день' : n < 5 ? 'дня' : 'дней'}`,
  };

  const handleClick = useCallback(() => {
    playClickSound();
    openModal();
  }, [openModal]);

  const containerClass = isDarkTheme
    ? 'bg-slate-800/60 border-slate-700/60 hover:border-yellow-500/40'
    : 'bg-white/95 border-slate-200/80 hover:border-yellow-400/60 shadow-[0_20px_45px_rgba(0,0,0,0.08)]';
  const textPrimaryClass = isDarkTheme ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const textTertiaryClass = isDarkTheme ? 'text-slate-300' : 'text-slate-700';
  const iconBgClass = isDarkTheme
    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
    : 'bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border-yellow-400/40';
  const iconColorClass = isDarkTheme ? 'text-yellow-400' : 'text-yellow-600';
  const progressBgClass = isDarkTheme ? 'bg-slate-700/50' : 'bg-slate-200/60';
  const dividerClass = isDarkTheme ? 'border-slate-700/50' : 'border-slate-200/60';
  const chevronBgClass = isDarkTheme
    ? 'bg-white/10 group-hover:bg-white/20'
    : 'bg-slate-100 group-hover:bg-yellow-50';
  const chevronColorClass = isDarkTheme
    ? 'text-slate-400 group-hover:text-yellow-400'
    : 'text-slate-500 group-hover:text-yellow-600';
  const statIconClass = isDarkTheme ? 'text-slate-400' : 'text-slate-500';

  // ── Анимация роста SP — хуки ОБЯЗАТЕЛЬНО до early return ─────────────────
  const currentSp = duelPassData?.seasonPoints ?? 0;
  const prevSpRef = useRef<number | null>(null);
  const [animatedSp, setAnimatedSp] = useState(currentSp);
  const [spDelta, setSpDelta] = useState<number | null>(null);
  const [highlightProgress, setHighlightProgress] = useState(false);

  useEffect(() => {
    const prev = prevSpRef.current;
    const curr = currentSp;

    if (prev !== null && curr > prev) {
      const delta = curr - prev;
      setSpDelta(delta);
      setHighlightProgress(true);

      const start = performance.now();
      const duration = 1200;
      let raf = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        setAnimatedSp(Math.round(prev + (curr - prev) * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const timer = setTimeout(() => {
        setSpDelta(null);
        setHighlightProgress(false);
      }, 2500);

      prevSpRef.current = curr;
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    } else {
      setAnimatedSp(curr);
    }
    prevSpRef.current = curr;
  }, [currentSp]);

  if (loading) {
    return (
      <div className={`${className} ${containerClass} rounded-3xl p-4 md:p-5 shadow-lg border backdrop-blur-sm animate-pulse`}>
        <div className="flex items-center justify-between">
          <div className={`h-4 w-32 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-200'} rounded`}></div>
          <div className={`h-6 w-6 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-200'} rounded-full`}></div>
        </div>
      </div>
    );
  }

  if (!duelPassData) return null;

  const progressPercent = Math.min(100, ((100 - duelPassData.nextLevelSP) / 100) * 100);

  return (
    <div
      onClick={handleClick}
      className={`${className} ${containerClass} rounded-3xl xl:rounded-[2.5rem] p-4 md:p-5 shadow-lg border flex flex-col gap-2.5 backdrop-blur-sm cursor-pointer transition-all duration-300 group`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${iconBgClass} rounded-xl border`}>
            <Trophy className={`w-5 h-5 ${iconColorClass}`} />
          </div>
          <div>
            <h3 className={`font-bold ${textPrimaryClass} text-base leading-none mb-0.5`}>Duel Pass</h3>
            <p className={`text-[12px] mt-0.5 ${textSecondaryClass}`}>{duelPassData.seasonName}</p>
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full ${chevronBgClass} flex items-center justify-center transition-colors`}>
          <ChevronRight size={14} className={chevronColorClass} />
        </div>
      </div>

      {/* Level & Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-bold ${textPrimaryClass}`}>{ui.level} {duelPassData.level}</span>
            <span className={`text-[11px] ${textSecondaryClass}`}>/ 30</span>
          </div>
          <div className={`flex items-center gap-1 text-[11px] ${textSecondaryClass} relative`}>
            <Zap className={`w-2.5 h-2.5 ${spDelta ? 'text-yellow-400' : ''} transition-colors`} />
            <span className={`${spDelta ? 'text-yellow-400 font-bold' : ''} transition-colors tabular-nums`}>
              {animatedSp} SP
            </span>
            {/* Floating "+N SP" при апдейте */}
            {spDelta !== null && spDelta > 0 && (
              <motion.span
                key={spDelta}
                initial={{ opacity: 0, y: 0, scale: 0.7 }}
                animate={{ opacity: [0, 1, 1, 0], y: [-2, -18, -22, -28], scale: [0.7, 1.1, 1, 0.95] }}
                transition={{ duration: 2.2, times: [0, 0.15, 0.7, 1] }}
                className="absolute -top-3 right-0 text-xs font-black text-yellow-400 pointer-events-none drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]"
              >
                +{spDelta}
              </motion.span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`relative h-1.5 ${progressBgClass} rounded-full overflow-hidden ${highlightProgress ? 'ring-2 ring-yellow-400/40 ring-offset-1 ring-offset-transparent' : ''} transition-all duration-300`}>
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full shadow-sm"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          {highlightProgress && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />
          )}
        </div>
        <p className={`text-[10px] ${textSecondaryClass} leading-tight`}>
          {ui.toNext} <span className={`${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'} font-semibold`}>{duelPassData.nextLevelSP} SP</span>
        </p>
      </div>

      {/* Daily Quests — кликаем по квестам без открытия модалки */}
      <div onClick={(e) => e.stopPropagation()} className="-my-1">
        <DailyQuestWidget />
      </div>

      {/* Stats */}
      <div className={`flex items-center gap-3 pt-1.5 border-t ${dividerClass}`}>
        <div className="flex items-center gap-1.5 flex-1">
          <Clock className={`w-3.5 h-3.5 ${statIconClass}`} />
          <div>
            <p className={`text-[10px] ${textSecondaryClass} leading-none mb-0.5`}>{ui.remaining}</p>
            <p className={`text-xs font-semibold ${textPrimaryClass}`}>
              {ui.days(duelPassData.daysRemaining)}
            </p>
          </div>
        </div>
        {duelPassData.totalDuels > 0 && (
          <div className="flex items-center gap-1.5 flex-1">
            <TrendingUp className={`w-3.5 h-3.5 ${statIconClass}`} />
            <div>
              <p className={`text-[10px] ${textSecondaryClass} leading-none mb-0.5`}>{ui.duels}</p>
              <p className={`text-xs font-semibold ${textPrimaryClass}`}>
                {duelPassData.wins} / {duelPassData.totalDuels}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
