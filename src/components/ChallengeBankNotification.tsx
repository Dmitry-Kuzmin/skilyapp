import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ChallengeBankNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ChallengeBankNotification = ({ isVisible, onClose }: ChallengeBankNotificationProps) => {
  const [position, setPosition] = useState({ top: 80, right: 16 });

  useEffect(() => {
    if (!isVisible) return;

    // Находим кнопку закладки и позиционируем уведомление под ней
    const bookmarkButton = document.getElementById('challenge-bank-bookmark-button');
    if (bookmarkButton) {
      const rect = bookmarkButton.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8, // 8px ниже кнопки
        right: window.innerWidth - rect.right, // выровнено по правому краю кнопки
      });
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ top: `${position.top}px`, right: `${position.right}px` }}
          className="fixed z-[100] w-60 sm:w-64"
          onClick={onClose}
        >
          {/* Указатель к кнопке (треугольник) */}
          <div className="absolute -top-1.5 right-4 w-3 h-3 bg-primary transform rotate-45" />
          
          {/* Компактное уведомление */}
          <div className="bg-primary rounded-lg p-3 shadow-2xl cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-2">
              {/* Иконка */}
              <div className="w-8 h-8 rounded-full bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
                <Bookmark className="w-4 h-4 text-primary-foreground fill-current" />
              </div>
              
              {/* Текст */}
              <div className="flex-1 min-w-0">
                <p className="text-primary-foreground text-[11px] leading-tight">
                  Добавлено в
                </p>
                <p className="text-primary-foreground font-bold text-sm leading-tight">
                  Банк Вопросов™
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
