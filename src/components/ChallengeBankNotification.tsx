import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ChallengeBankNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ChallengeBankNotification = ({ isVisible, onClose }: ChallengeBankNotificationProps) => {
  const [position, setPosition] = useState({ top: 80, right: 16 });
  const [lineHeight, setLineHeight] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Находим кнопку закладки и позиционируем уведомление под ней
    const bookmarkButton = document.getElementById('challenge-bank-bookmark-button');
    if (bookmarkButton) {
      const rect = bookmarkButton.getBoundingClientRect();
      const notificationTop = rect.bottom + 40; // 40px ниже кнопки (место для линии)
      
      setPosition({
        top: notificationTop,
        right: window.innerWidth - rect.right,
      });
      
      setLineHeight(40); // Высота линии от кнопки до уведомления
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ 
            top: `${position.top - lineHeight}px`, 
            right: `${position.right}px` 
          }}
          className="fixed z-[100] w-60 sm:w-64"
        >
          {/* Вертикальная линия от кнопки */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: lineHeight }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute top-0 right-4 w-0.5 bg-primary origin-top"
          />
          
          {/* Пульсирующая точка на линии */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1, 1, 1],
              opacity: [0, 1, 1, 1]
            }}
            transition={{ 
              duration: 0.6,
              times: [0, 0.3, 0.6, 1],
              delay: 0.2
            }}
            className="absolute right-3 w-2 h-2 rounded-full bg-primary"
            style={{ top: `${lineHeight / 2}px` }}
          >
            {/* Пульсирующие кольца */}
            <motion.div
              animate={{ 
                scale: [1, 2, 2],
                opacity: [0.6, 0, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut"
              }}
              className="absolute inset-0 rounded-full bg-primary"
            />
            <motion.div
              animate={{ 
                scale: [1, 2.5, 2.5],
                opacity: [0.4, 0, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.3
              }}
              className="absolute inset-0 rounded-full bg-primary"
            />
          </motion.div>
          
          {/* Треугольник-указатель */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute right-4 w-3 h-3 bg-primary transform rotate-45"
            style={{ top: `${lineHeight - 1.5}px` }}
          />
          
          {/* Компактное уведомление */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 25,
              delay: 0.4
            }}
            onClick={onClose}
            className="bg-primary rounded-lg p-3 shadow-2xl cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ marginTop: `${lineHeight}px` }}
          >
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
