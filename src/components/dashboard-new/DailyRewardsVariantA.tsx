import React, { useState, useMemo } from 'react';
import { Flame, Info, X, Coins, TrendingUp, Gift, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

interface DailyRewardsVariantAProps {
  currentStreak: number;
  hasClaimedToday: boolean;
  onClaim: () => void;
  weeklyRewards?: any[];
}

/**
 * ВАРИАНТ A: Горизонтальный layout (компактный)
 * - Компактный header в одну строку
 * - БОЛЬШИЕ карточки дней горизонтально
 * - Инфо о текущей награде
 * - Фокус на прогрессе
 */
export const DailyRewardsVariantA = React.memo<DailyRewardsVariantAProps>(({ 
  currentStreak, 
  hasClaimedToday, 
  onClaim,
  weeklyRewards = []
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  const { weekNumber, weekDay, todayReward } = useMemo(() => {
    const wn = currentStreak === 0 ? 0 : Math.ceil(currentStreak / 7);
    const wd = currentStreak === 0 ? 0 : (currentStreak % 7 || 7);
    const reward = weeklyRewards.find(r => r.day_number === wd);
    return { weekNumber: wn, weekDay: wd, todayReward: reward };
  }, [currentStreak, weeklyRewards]);

  const handleClaim = async () => {
    if (isClaiming || hasClaimedToday) return;
    setIsClaiming(true);
    try {
      await onClaim();
    } finally {
      setTimeout(() => setIsClaiming(false), 1000);
    }
  };

  const rewardData = todayReward?.reward || {};

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
      
      {/* КОМПАКТНЫЙ HEADER - одна строка */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            isDarkTheme ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-100/80 border-orange-300/60'
          }`}>
            <Flame className={`w-5 h-5 ${isDarkTheme ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div className="flex items-center gap-3">
            <h3 className={`font-bold text-xl ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
              Серия: {currentStreak} {currentStreak === 1 ? 'день' : currentStreak < 5 ? 'дня' : 'дней'}
            </h3>
            {weekNumber > 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                isDarkTheme 
                  ? 'text-slate-400 bg-slate-800/50 border-slate-700' 
                  : 'text-slate-600 bg-slate-100/80 border-slate-300'
              }`}>
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

      {/* БОЛЬШИЕ КАРТОЧКИ ДНЕЙ */}
      <div className="relative z-10 mb-6">
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isClaimed = day < weekDay || (day === weekDay && hasClaimedToday);
            const isCurrent = day === weekDay && !hasClaimedToday;
            const isLocked = day > weekDay;
            const dayReward = weeklyRewards.find(r => r.day_number === day);
            const dayRewardData = dayReward?.reward || {};
            const isDay7 = day === 7;

            return (
              <motion.div
                key={day}
                whileHover={{ scale: 1.05 }}
                className={`relative aspect-square rounded-xl border-2 p-2 flex flex-col items-center justify-center transition-all ${
                  isCurrent
                    ? isDarkTheme
                      ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/50 shadow-lg shadow-orange-500/20'
                      : 'bg-gradient-to-br from-orange-100 to-red-100 border-orange-400 shadow-lg shadow-orange-400/20'
                    : isClaimed
                    ? isDarkTheme
                      ? 'bg-slate-800/50 border-slate-700'
                      : 'bg-slate-100 border-slate-300'
                    : isDarkTheme
                    ? 'bg-slate-900/30 border-slate-800 opacity-60'
                    : 'bg-slate-50/40 border-slate-200 opacity-60'
                }`}
              >
                {/* День */}
                <div className={`text-lg font-bold mb-1 ${
                  isCurrent
                    ? isDarkTheme ? 'text-orange-400' : 'text-orange-600'
                    : isClaimed
                    ? isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                    : isDarkTheme ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {isClaimed ? '✓' : day}
                </div>
                
                {/* Иконка награды */}
                {isDay7 ? (
                  <Gift className={`w-4 h-4 ${
                    isCurrent ? 'text-yellow-400 animate-bounce' : 
                    isClaimed ? 'text-slate-500' : 'text-slate-600'
                  }`} />
                ) : (
                  <div className={`text-xs font-semibold ${
                    isCurrent
                      ? isDarkTheme ? 'text-orange-300' : 'text-orange-700'
                      : isClaimed
                      ? isDarkTheme ? 'text-slate-500' : 'text-slate-500'
                      : isDarkTheme ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {dayRewardData.xp ? `${dayRewardData.xp}` : '?'}
                  </div>
                )}

                {/* Замок для будущих дней */}
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-sm">
                    <div className={`text-2xl ${isDarkTheme ? 'text-slate-700' : 'text-slate-400'}`}>🔒</div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ИНФО О ТЕКУЩЕЙ НАГРАДЕ */}
      {!hasClaimedToday && todayReward && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative z-10 p-3 rounded-xl border mb-4 ${
            isDarkTheme
              ? 'bg-orange-500/10 border-orange-500/20'
              : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className={`font-semibold ${isDarkTheme ? 'text-orange-300' : 'text-orange-700'}`}>
              Сегодня награда:
            </span>
            {rewardData.xp > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  +{rewardData.xp} XP
                </span>
              </div>
            )}
            {rewardData.coins > 0 && (
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  +{rewardData.coins} 🪙
                </span>
              </div>
            )}
            {rewardData.boost && (
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Boost</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

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

