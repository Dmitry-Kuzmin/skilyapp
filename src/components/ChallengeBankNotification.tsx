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

    const bookmarkButton = document.getElementById('challenge-bank-bookmark-button');
    if (bookmarkButton) {
      const rect = bookmarkButton.getBoundingClientRect();
      
      setPosition({
        top: rect.bottom + 8, // Минимальный отступ
        right: window.innerWidth - rect.right,
      });
    }
  }, [isVisible]);

  const lineHeight = 20; // Еще короче

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ 
            top: `${position.top}px`, 
            right: `${position.right}px` 
          }}
          className="fixed z-[100] w-56 sm:w-60"
        >
          {/* Пульсирующая точка СРАЗУ под кнопкой */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1,
              opacity: 1
            }}
            transition={{ 
              duration: 0.3,
              delay: 0.2,
              ease: "backOut"
            }}
            className="absolute top-0 right-[14px] w-[10px] h-[10px] rounded-full bg-primary z-10"
            style={{ 
              boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.4)'
            }}
          >
            {/* Белый центр */}
            <div className="absolute inset-[2px] rounded-full bg-white" />
            
            {/* Пульсирующие кольца */}
            <motion.div
              animate={{ 
                scale: [1, 2.5],
                opacity: [0.6, 0]
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
                scale: [1, 3],
                opacity: [0.4, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.4
              }}
              className="absolute inset-0 rounded-full bg-primary"
            />
          </motion.div>
          
          {/* Короткая вертикальная линия */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: lineHeight, opacity: 1 }}
            transition={{ 
              duration: 0.4, 
              delay: 0.3,
              ease: "easeOut"
            }}
            className="absolute top-[10px] right-[18px] w-[2px] bg-primary origin-top"
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
            className="absolute right-[14px] w-[10px] h-[10px] bg-primary transform rotate-45"
            style={{ top: `${lineHeight + 3}px` }}
          />
          
          {/* Компактное уведомление */}
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
            onClick={onClose}
            className="bg-primary rounded-lg p-2.5 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform"
            style={{ 
              marginTop: `${lineHeight + 8}px`,
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.24)'
            }}
          >
            <div className="flex items-center gap-2">
              {/* Иконка */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 600 }}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0"
              >
                <Bookmark className="w-[14px] h-[14px] text-white fill-white" />
              </motion.div>
              
              {/* Текст */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                className="flex-1 min-w-0"
              >
                <p className="text-white/70 text-[9px] leading-tight font-medium">
                  Добавлено в
                </p>
                <p className="text-white font-semibold text-[12px] leading-tight mt-0.5">
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
