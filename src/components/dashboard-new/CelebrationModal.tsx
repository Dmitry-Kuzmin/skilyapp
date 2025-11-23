import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Star, Crown, Zap } from 'lucide-react';

interface CelebrationModalProps {
  show: boolean;
  onClose: () => void;
  message?: string;
  weekNumber?: number;
  totalStreak?: number;
}

/**
 * Модальное окно с поздравлением для дня 7
 * Полноэкранное, с яркой анимацией и текстом
 */
export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  show,
  onClose,
  message = "🏆 Неделя завершена!",
  weekNumber,
  totalStreak
}) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Затемнение фона */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
          />

          {/* Модальное окно */}
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 180, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, duration: 0.8 }}
              className="relative bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-xl border-2 border-yellow-400/50 rounded-3xl p-8 max-w-md w-full shadow-2xl pointer-events-auto"
              style={{
                boxShadow: '0 0 100px rgba(251, 191, 36, 0.5)',
              }}
            >
              {/* Золотое свечение вокруг */}
              <motion.div
                className="absolute -inset-4 bg-gradient-to-r from-yellow-400/30 via-orange-400/30 to-red-400/30 rounded-3xl blur-2xl"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Иконка трофея */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Trophy className="w-24 h-24 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" />
                </motion.div>
              </div>

              {/* Заголовок */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-center text-white mb-4 bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 bg-clip-text text-transparent"
              >
                {message}
              </motion.h2>

              {/* Статистика */}
              {(weekNumber || totalStreak) && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center space-y-2 mb-6"
                >
                  {weekNumber && (
                    <div className="text-lg text-yellow-200">
                      Неделя <span className="font-bold text-yellow-400">{weekNumber}</span> завершена!
                    </div>
                  )}
                  {totalStreak && (
                    <div className="text-sm text-slate-300">
                      Общий streak: <span className="font-bold text-yellow-400">{totalStreak} дней</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Искры вокруг */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                    x: (Math.cos((i / 12) * Math.PI * 2) * 150),
                    y: (Math.sin((i / 12) * Math.PI * 2) * 150),
                    rotate: 360,
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.8 + i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
              ))}

              {/* Кнопка закрытия */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                onClick={onClose}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                Продолжить
              </motion.button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

