import React, { useState, useMemo } from 'react';
import { Flame, Info, X, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

interface DailyRewardsVariantBProps {
  currentStreak: number;
  hasClaimedToday: boolean;
  onClaim: () => void;
  weeklyRewards?: any[];
}

/**
 * ВАРИАНТ B: С уменьшенным кругом (баланс)
 * - Круг меньшего размера слева
 * - Карточки дней справа от круга
 * - Баланс между старым и новым дизайном
 */
export const DailyRewardsVariantB = React.memo<DailyRewardsVariantBProps>(({ 
  currentStreak, 
  hasClaimedToday, 
  onClaim,
  weeklyRewards = []
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  const { weekNumber, weekDay, weeklyProgress, progressPercent, strokeDashoffset } = useMemo(() => {
    const wp = currentStreak === 0 ? 0 : (currentStreak % 7 === 0 ? 7 : currentStreak % 7);
    const pp = (wp / 7) * 100;
    const radius = 35;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (pp / 100) * circ;
    const wn = currentStreak === 0 ? 0 : Math.ceil(currentStreak / 7);
    const wd = currentStreak === 0 ? 0 : (currentStreak % 7 || 7);
    
    return {
      weekNumber: wn,
      weekDay: wd,
      weeklyProgress: wp,
      progressPercent: pp,
      strokeDashoffset: offset,
      radius: 35,
      circumference: circ
    };
  }, [currentStreak]);

  const handleClaim = async () => {
    if (isClaiming || hasClaimedToday) return;
    setIsClaiming(true);
    try {
      await onClaim();
    } finally {
      setTimeout(() => setIsClaiming(false), 1000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl p-6 ${
        isDarkTheme 
          ? 'bg-gradient-to-br from-[#0B1120] via-[#0f172a] to-[#0B1120] border-slate-800' 
          : 'bg-gradient-to-br from-white via-slate-50 to-white border-slate-200'
      } border shadow-xl`}
    >
      {/* Background effects */}
      <div className={`absolute -top-20 -right-20 w-60 h-60 ${isDarkTheme ? 'bg-orange-500/10' : 'bg-orange-200/30'} rounded-full blur-3xl animate-pulse opacity-50`} />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            isDarkTheme ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-100/80 border-orange-300/60'
          }`}>
            <Flame className={`w-5 h-5 ${isDarkTheme ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div>
            <h3 className={`font-bold text-xl ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
              Ежедневная серия
            </h3>
            {weekNumber > 0 && (
              <span className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                Неделя {weekNumber}
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowInfo(!showInfo)}
          className={`p-2 rounded-full transition-colors ${
            isDarkTheme
              ? 'bg-slate-700/50 hover:bg-slate-700 border-slate-600/50'
              : 'bg-slate-100/80 hover:bg-slate-200 border-slate-200/60'
          } border`}
        >
          {showInfo ? <X size={16} /> : <Info size={16} />}
        </button>
      </div>

      {/* MAIN CONTENT: Круг + Карточки */}
      <div className="relative z-10 flex items-center gap-6 mb-6">
        {/* УМЕНЬШЕННЫЙ КРУГ */}
        <div className="flex-shrink-0">
          <div className="relative w-28 h-28">
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
                strokeDasharray={2 * Math.PI * 35}
                initial={{ strokeDashoffset: 2 * Math.PI * 35 }}
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

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Flame className={`w-6 h-6 mb-1 ${isDarkTheme ? 'text-orange-400' : 'text-orange-600'}`} />
              <span className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                {currentStreak}
              </span>
              <span className={`text-[8px] uppercase font-bold tracking-widest ${
                isDarkTheme ? 'text-slate-500' : 'text-slate-500'
              }`}>
                ДНЕЙ
              </span>
            </div>
          </div>
        </div>

        {/* КАРТОЧКИ СПРАВА */}
        <div className="flex-1">
          <div className={`text-xs mb-2 ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
            Осталось {7 - weekDay} {7 - weekDay === 1 ? 'день' : 'дней'} до 🎁
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isClaimed = day < weekDay || (day === weekDay && hasClaimedToday);
              const isCurrent = day === weekDay && !hasClaimedToday;
              const isDay7 = day === 7;

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
                  ) : isDay7 ? (
                    <Gift className={`w-4 h-4 ${isCurrent ? 'text-yellow-400' : 'text-slate-600'}`} />
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

      {/* КНОПКА */}
      <motion.button
        onClick={handleClaim}
        disabled={isClaiming || hasClaimedToday}
        whileTap={{ scale: 0.98 }}
        className={`relative z-10 w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all ${
          hasClaimedToday
            ? isDarkTheme
              ? 'bg-slate-800/50 text-slate-500 cursor-default'
              : 'bg-slate-200/50 text-slate-500 cursor-default'
            : isDarkTheme
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/50'
            : 'bg-gradient-to-r from-orange-400 to-red-400 text-white hover:shadow-lg hover:shadow-orange-400/50'
        }`}
      >
        {hasClaimedToday ? '✓ Получено сегодня' : 'Получить бонус'}
      </motion.button>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col rounded-3xl overflow-hidden"
          >
            <div className={`absolute inset-0 ${isDarkTheme ? 'bg-slate-900/98' : 'bg-white/98'} backdrop-blur-xl`} />
            <div className="relative z-10 p-6 overflow-y-auto">
              <h3 className={`text-xl font-bold mb-4 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                📅 Награды по дням
              </h3>
              <div className="space-y-2">
                {weeklyRewards.map((reward) => (
                  <div
                    key={reward.day_number}
                    className={`p-3 rounded-lg border ${
                      isDarkTheme
                        ? 'bg-slate-800/30 border-slate-700/40'
                        : 'bg-slate-50/60 border-slate-200/40'
                    }`}
                  >
                    <div className={`font-semibold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                      День {reward.day_number}: {reward.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

