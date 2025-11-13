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
      const notificationTop = rect.bottom + 50; // 50px ниже кнопки (место для линии и точки)
      
      setPosition({
        top: notificationTop,
        right: window.innerWidth - rect.right,
      });
      
      setLineHeight(50); // Высота линии от кнопки до уведомления
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ 
            top: `${position.top - lineHeight}px`, 
            right: `${position.right}px` 
          }}
          className="fixed z-[100] w-60 sm:w-64"
        >
          {/* Вертикальная линия от кнопки */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: lineHeight, opacity: 1 }}
            transition={{ 
              duration: 0.5, 
              ease: [0.4, 0, 0.2, 1],
              delay: 0.1
            }}
            className="absolute top-0 right-[18px] w-[2px] bg-primary origin-top"
            style={{ 
              boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)'
            }}
          />
          
          {/* Пульсирующая точка на линии */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1,
              opacity: 1
            }}
            transition={{ 
              duration: 0.4,
              delay: 0.4,
              ease: "easeOut"
            }}
            className="absolute right-[14px] w-[10px] h-[10px] rounded-full bg-primary"
            style={{ 
              top: `${lineHeight / 2}px`,
              boxShadow: '0 0 12px rgba(139, 92, 246, 0.6), 0 0 24px rgba(139, 92, 246, 0.3)'
            }}
          >
            {/* Внутренний круг */}
            <div className="absolute inset-[2px] rounded-full bg-white" />
            
            {/* Пульсирующие кольца */}
            <motion.div
              animate={{ 
                scale: [1, 2.5],
                opacity: [0.5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                repeatDelay: 0.5
              }}
              className="absolute inset-0 rounded-full border-2 border-primary"
            />
            <motion.div
              animate={{ 
                scale: [1, 3],
                opacity: [0.3, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5,
                repeatDelay: 0.5
              }}
              className="absolute inset-0 rounded-full border-2 border-primary"
            />
          </motion.div>
          
          {/* Треугольник-указатель */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: 0.6,
              duration: 0.3,
              ease: "backOut"
            }}
            className="absolute right-[14px] w-[10px] h-[10px] bg-primary transform rotate-45"
            style={{ 
              top: `${lineHeight - 5}px`,
              boxShadow: '0 0 8px rgba(139, 92, 246, 0.3)'
            }}
          />
          
          {/* Компактное уведомление */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 20,
              delay: 0.7
            }}
            onClick={onClose}
            className="bg-primary rounded-xl p-3 shadow-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
            style={{ 
              marginTop: `${lineHeight}px`,
              boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
            }}
          >
            <div className="flex items-center gap-2.5">
              {/* Иконка */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: 'spring', stiffness: 500 }}
                className="w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center flex-shrink-0"
              >
                <Bookmark className="w-4 h-4 text-primary-foreground fill-current" />
              </motion.div>
              
              {/* Текст */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.3 }}
                className="flex-1 min-w-0"
              >
                <p className="text-primary-foreground/80 text-[10px] leading-tight font-medium">
                  Добавлено в
                </p>
                <p className="text-primary-foreground font-bold text-[13px] leading-tight mt-0.5">
                  Банк Вопросов™
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
