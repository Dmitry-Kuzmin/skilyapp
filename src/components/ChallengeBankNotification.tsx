import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { X } from 'lucide-react';

interface ChallengeBankNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ChallengeBankNotification = ({ isVisible, onClose }: ChallengeBankNotificationProps) => {
  const { t, language } = useLanguage();
  const [position, setPosition] = useState({ top: 80, right: 16, buttonWidth: 44 });
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Функция для обновления позиции
  const updatePosition = useCallback(() => {
    const bookmarkButton = document.getElementById('challenge-bank-bookmark-button');
    if (bookmarkButton) {
      const rect = bookmarkButton.getBoundingClientRect();
      
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        buttonWidth: rect.width
      });
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Обновляем позицию при открытии
    updatePosition();

    // Обновляем позицию при скролле и изменении размера окна
    const handleScroll = () => {
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true); // true для capture фазы
    window.addEventListener('resize', handleResize);
    
    // Также обновляем позицию периодически для надежности
    const positionInterval = setInterval(() => {
      updatePosition();
    }, 100);

    // Автоматическое закрытие через 6 секунд
    const timer = setTimeout(() => {
      onClose();
    }, 6000);

    setAutoCloseTimer(timer);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      clearInterval(positionInterval);
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, onClose, updatePosition]);

  const handleDontShowAgain = () => {
    localStorage.setItem('challenge-bank-notification-hidden', 'true');
    onClose();
  };

  const handleClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
    onClose();
  };

  const dotSize = 10;
  const lineHeight = 20;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ 
            top: `${position.top - dotSize / 2}px`,
            right: `${position.right}px` 
          }}
          className="fixed z-50 w-[280px] sm:w-[320px] md:w-[360px]"
        >
          {/* Пульсирующая точка */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.3,
              delay: 0.2,
              ease: "backOut"
            }}
            className="absolute -top-[20px] w-[10px] h-[10px] rounded-full bg-white"
            style={{ 
              right: `${position.buttonWidth / 2 - dotSize / 2}px`,
              boxShadow: '0 0 0 2px hsl(217 91% 60%), 0 0 10px hsla(217, 91%, 60%, 0.5)',
              zIndex: 1
            }}
          >
            {/* Синий центр - используем secondary цвет */}
            <div className="absolute inset-[2px] rounded-full bg-secondary" />
            
            {/* Пульсирующие кольца */}
            <motion.div
              animate={{ 
                scale: [1, 2.2],
                opacity: [0.5, 0]
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeOut",
                repeatType: "loop"
              }}
              className="absolute inset-0 rounded-full border-2 border-secondary"
              style={{ willChange: 'transform, opacity' }}
            />
            <motion.div
              animate={{ 
                scale: [1, 2.5],
                opacity: [0.3, 0]
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.6,
                repeatType: "loop"
              }}
              className="absolute inset-0 rounded-full border-2 border-secondary"
              style={{ willChange: 'transform, opacity' }}
            />
          </motion.div>
          
          {/* Вертикальная линия - синяя с тенью для видимости */}
          <motion.div
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ 
              duration: 0.4, 
              delay: 0.3,
              ease: "easeOut"
            }}
            className="absolute w-[2px] bg-secondary origin-top"
            style={{ 
              right: `${position.buttonWidth / 2 - 1}px`,
              top: `-${dotSize / 2}px`,
              height: `${lineHeight}px`,
              zIndex: 1,
              willChange: 'transform, opacity',
              boxShadow: '0 0 4px hsla(217, 91%, 60%, 0.6), 0 0 8px hsla(217, 91%, 60%, 0.3)'
            }}
          />
          
          {/* Треугольник-указатель */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: 0.5,
              duration: 0.2,
              ease: "backOut"
            }}
            className="absolute w-[10px] h-[10px] bg-secondary transform rotate-45"
            style={{ 
              right: `${position.buttonWidth / 2 - 5}px`,
              top: `${lineHeight - dotSize / 2 - 5}px`,
              zIndex: 1,
              boxShadow: '0 2px 4px hsla(217, 91%, 60%, 0.4)'
            }}
          />
          
          {/* Уведомление в синем стиле */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 25,
              delay: 0.6
            }}
            className="bg-secondary rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
            style={{ 
              marginTop: `${lineHeight - dotSize / 2 + 6}px`,
              boxShadow: '0 10px 40px hsla(217, 91%, 60%, 0.25)',
              zIndex: 1,
              willChange: 'transform, opacity',
              maxWidth: 'calc(100vw - 32px)',
              minWidth: '280px'
            }}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Иконка сохранения */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 600 }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              {/* Текст уведомления */}
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="flex-1 min-w-0 space-y-1.5"
              >
                <p className="text-white text-sm sm:text-base font-semibold leading-snug">
                  {t('challengeBankAdded')}
                </p>
                <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                  {t('challengeBankDesc')}
                </p>
                
                {/* Кнопка "Не показывать" */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDontShowAgain();
                  }}
                  className="mt-2.5 text-white/80 hover:text-white text-xs sm:text-sm underline transition-colors font-medium"
                >
                  {t('dontShowAgain')}
                </button>
              </motion.div>
              
              {/* Кнопка закрытия */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors mt-0.5"
                aria-label="Закрыть"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
