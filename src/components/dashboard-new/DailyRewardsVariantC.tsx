import React, { useState, useMemo } from 'react';
import { Flame, Info, X, Coins, TrendingUp, Gift, Zap, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

interface DailyRewardsVariantCProps {
  currentStreak: number;
  hasClaimedToday: boolean;
  onClaim: () => void;
  weeklyRewards?: any[];
}

/**
 * ВАРИАНТ C: Минималистичный (без круга)
 * - Максимум информации о наградах
 * - КРУПНЫЕ интерактивные карточки с деталями
 * - Современный, информативный
 */
export const DailyRewardsVariantC = React.memo<DailyRewardsVariantCProps>(({ 
  currentStreak, 
  hasClaimedToday, 
  onClaim,
  weeklyRewards = []
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  const { weekNumber, weekDay } = useMemo(() => {
    const wn = currentStreak === 0 ? 0 : Math.ceil(currentStreak / 7);
    const wd = currentStreak === 0 ? 0 : (currentStreak % 7 || 7);
    return { weekNumber: wn, weekDay: wd };
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
      
      {/* КОМПАКТНЫЙ HEADER */}
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

      {/* КРУПНЫЕ КАРТОЧКИ С ДЕТАЛЬНОЙ ИНФОРМАЦИЕЙ */}
      <div className="relative z-10 mb-6">
        {/* Дни 1-5 */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((day) => {
            const isClaimed = day < weekDay || (day === weekDay && hasClaimedToday);
            const isCurrent = day === weekDay && !hasClaimedToday;
            const dayReward = weeklyRewards.find(r => r.day_number === day);
            const dayRewardData = dayReward?.reward || {};

            return (
              <motion.div
                key={day}
                whileHover={{ scale: 1.05, y: -4 }}
                onHoverStart={() => setHoveredDay(day)}
                onHoverEnd={() => setHoveredDay(null)}
                className={`relative aspect-[3/4] rounded-xl border-2 p-3 flex flex-col items-center justify-between transition-all cursor-pointer ${
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
                <div className={`text-2xl font-bold ${
                  isCurrent
                    ? isDarkTheme ? 'text-orange-400' : 'text-orange-600'
                    : isClaimed
                    ? isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                    : isDarkTheme ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {isClaimed ? '✓✓' : day}
                </div>
                
                {/* Награда */}
                <div className="flex flex-col items-center gap-1">
                  {dayRewardData.xp > 0 && (
                    <div className={`text-xs font-bold ${
                      isCurrent ? 'text-orange-400' : isClaimed ? 'text-slate-500' : 'text-slate-600'
                    }`}>
                      {dayRewardData.xp}
                    </div>
                  )}
                  {!isClaimed && (
                    <div className={`text-[10px] ${isDarkTheme ? 'text-slate-600' : 'text-slate-400'}`}>
                      XP
                    </div>
                  )}
                </div>

                {/* Tooltip on hover */}
                <AnimatePresence>
                  {hoveredDay === day && !isClaimed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full px-2 py-1 rounded-lg text-[10px] whitespace-nowrap ${
                        isDarkTheme
                          ? 'bg-slate-800 border border-slate-700 text-white'
                          : 'bg-white border border-slate-200 text-slate-900 shadow-lg'
                      }`}
                    >
                      {dayReward?.description || 'Награда'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Дни 6-7 (крупнее) */}
        <div className="grid grid-cols-2 gap-2">
          {[6, 7].map((day) => {
            const isClaimed = day < weekDay || (day === weekDay && hasClaimedToday);
            const isCurrent = day === weekDay && !hasClaimedToday;
            const dayReward = weeklyRewards.find(r => r.day_number === day);
            const dayRewardData = dayReward?.reward || {};
            const isDay7 = day === 7;

            return (
              <motion.div
                key={day}
                whileHover={{ scale: 1.03, y: -4 }}
                onHoverStart={() => setHoveredDay(day)}
                onHoverEnd={() => setHoveredDay(null)}
                className={`relative aspect-[2/1] rounded-xl border-2 p-4 flex items-center justify-between transition-all cursor-pointer ${
                  isDay7
                    ? isCurrent
                      ? isDarkTheme
                        ? 'bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                        : 'bg-gradient-to-r from-yellow-100 via-orange-100 to-red-100 border-yellow-400 shadow-lg shadow-yellow-400/20'
                      : isClaimed
                      ? isDarkTheme
                        ? 'bg-slate-800/50 border-slate-700'
                        : 'bg-slate-100 border-slate-300'
                      : isDarkTheme
                      ? 'bg-slate-900/30 border-slate-800 opacity-60'
                      : 'bg-slate-50/40 border-slate-200 opacity-60'
                    : isCurrent
                    ? isDarkTheme
                      ? 'bg-orange-500/20 border-orange-500/50'
                      : 'bg-orange-100 border-orange-400'
                    : isClaimed
                    ? isDarkTheme
                      ? 'bg-slate-800/50 border-slate-700'
                      : 'bg-slate-100 border-slate-300'
                    : isDarkTheme
                    ? 'bg-slate-900/30 border-slate-800 opacity-60'
                    : 'bg-slate-50/40 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* День */}
                  <div className={`text-3xl font-bold ${
                    isCurrent
                      ? isDay7 
                        ? isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'
                        : isDarkTheme ? 'text-orange-400' : 'text-orange-600'
                      : isClaimed
                      ? isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                      : isDarkTheme ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {isClaimed ? '✓' : day}
                  </div>
                  
                  {/* Инфо */}
                  {isDay7 ? (
                    <div className="flex flex-col">
                      <div className={`font-bold text-sm ${
                        isCurrent ? 'text-yellow-400' : isClaimed ? 'text-slate-500' : 'text-slate-600'
                      }`}>
                        JACKPOT
                      </div>
                      <div className={`text-xs ${
                        isCurrent ? 'text-yellow-300' : 'text-slate-600'
                      }`}>
                        🎁 Mystery Box
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {dayRewardData.xp > 0 && (
                        <div className={`text-sm font-bold ${
                          isCurrent ? 'text-orange-400' : isClaimed ? 'text-slate-500' : 'text-slate-600'
                        }`}>
                          +{dayRewardData.xp} XP
                        </div>
                      )}
                      {dayRewardData.coins > 0 && (
                        <div className={`text-xs ${
                          isCurrent ? 'text-orange-300' : 'text-slate-600'
                        }`}>
                          +{dayRewardData.coins} 🪙
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Иконка */}
                {isDay7 && !isClaimed && (
                  <Gift className={`w-8 h-8 ${isCurrent ? 'text-yellow-400 animate-bounce' : 'text-slate-600'}`} />
                )}

                {/* Tooltip */}
                <AnimatePresence>
                  {hoveredDay === day && !isClaimed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                        isDarkTheme
                          ? 'bg-slate-800 border border-slate-700 text-white'
                          : 'bg-white border border-slate-200 text-slate-900 shadow-lg'
                      }`}
                    >
                      {dayReward?.description || 'Награда'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
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
            : weekDay === 7
            ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-yellow-500/50'
            : isDarkTheme
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/50'
            : 'bg-gradient-to-r from-orange-400 to-red-400 text-white hover:shadow-lg hover:shadow-orange-400/50'
        }`}
      >
        {hasClaimedToday ? '✓ Получено сегодня' : weekDay === 7 ? '🎉 Завершить неделю!' : 'Получить бонус'}
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

