import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Trophy, Sparkles, X } from 'lucide-react';

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
 * Адаптировано для мобильных устройств
 */
export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  show,
  onClose,
  message = "🏆 Неделя завершена!",
  weekNumber,
  totalStreak
}) => {
  const [mounted, setMounted] = useState(false);

  // Предотвращаем скролл body при открытой модалке
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [show]);

  // Проверяем, что мы в браузере
  useEffect(() => {
    setMounted(true);
  }, []);

  // Предотвращаем закрытие при клике на контент
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Обработчик закрытия с логированием и проверкой
  const handleClose = useCallback(() => {
    console.log('[CelebrationModal] Closing modal, show:', show);
    if (typeof onClose === 'function') {
      onClose();
    } else {
      console.error('[CelebrationModal] onClose is not a function:', onClose);
    }
  }, [onClose, show]);

  // Предотвращаем закрытие по ESC
  useEffect(() => {
    if (!show) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[CelebrationModal] ESC pressed');
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [show, handleClose]);

  if (!show || !mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {show && (
        <>
          {/* Затемнение фона */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.preventDefault();
              console.log('[CelebrationModal] Backdrop clicked');
              handleClose();
            }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000] cursor-pointer"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              touchAction: 'none',
            }}
          />

          {/* Модальное окно - улучшенное центрирование */}
          <div 
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              minHeight: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'none',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.5, y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, duration: 0.6 }}
              onClick={handleContentClick}
              className="relative bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-xl border-2 border-yellow-400/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl pointer-events-auto mx-auto my-auto"
              style={{
                boxShadow: '0 0 100px rgba(251, 191, 36, 0.5)',
                transform: 'translateZ(0)', // Ускоряет рендеринг
                maxWidth: 'calc(100vw - 2rem)',
                margin: 'auto',
              }}
            >
              {/* Кнопка закрытия (X) в правом верхнем углу */}
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[CelebrationModal] Close button clicked');
                  handleClose();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[CelebrationModal] Close button touched');
                  handleClose();
                }}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                style={{
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                }}
                aria-label="Закрыть"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </motion.button>

              {/* Золотое свечение вокруг */}
              <motion.div
                className="absolute -inset-4 bg-gradient-to-r from-yellow-400/30 via-orange-400/30 to-red-400/30 rounded-3xl blur-2xl"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Иконка трофея */}
              <div className="flex justify-center mb-4 sm:mb-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Trophy className="w-16 h-16 sm:w-24 sm:h-24 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" />
                </motion.div>
              </div>

              {/* Заголовок */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl sm:text-3xl font-bold text-center text-white mb-3 sm:mb-4 bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 bg-clip-text text-transparent px-2"
              >
                {message}
              </motion.h2>

              {/* Статистика */}
              {(weekNumber || totalStreak) && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center space-y-2 mb-4 sm:mb-6"
                >
                  {weekNumber && (
                    <div className="text-base sm:text-lg text-yellow-200">
                      Неделя <span className="font-bold text-yellow-400">{weekNumber}</span> завершена!
                    </div>
                  )}
                  {totalStreak && (
                    <div className="text-xs sm:text-sm text-slate-300">
                      Общий streak: <span className="font-bold text-yellow-400">{totalStreak} дней</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Искры вокруг - ниже кнопки */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    zIndex: 1,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                    x: (Math.cos((i / 12) * Math.PI * 2) * 120),
                    y: (Math.sin((i / 12) * Math.PI * 2) * 120),
                    rotate: 360,
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.6 + i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                </motion.div>
              ))}

              {/* Кнопка закрытия - выше всех элементов */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[CelebrationModal] Continue button clicked');
                  handleClose();
                }}
                onTouchEnd={(e) => {
                  // Предотвращаем двойное срабатывание
                  if (e.cancelable) {
                    e.preventDefault();
                  }
                  e.stopPropagation();
                  console.log('[CelebrationModal] Continue button touched');
                  handleClose();
                }}
                className="relative z-50 w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 mt-4 cursor-pointer select-none"
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  pointerEvents: 'auto',
                  position: 'relative',
                  zIndex: 50,
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                type="button"
              >
                Продолжить
              </motion.button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  // Рендерим через портал в body
  return createPortal(modalContent, document.body);
};


