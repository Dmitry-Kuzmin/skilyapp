import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ChallengeBankNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ChallengeBankNotification = ({ isVisible, onClose }: ChallengeBankNotificationProps) => {
  const [position, setPosition] = useState({ top: 80, right: 16, buttonWidth: 44 });

  useEffect(() => {
    if (!isVisible) return;

    const bookmarkButton = document.getElementById('challenge-bank-bookmark-button');
    if (bookmarkButton) {
      const rect = bookmarkButton.getBoundingClientRect();
      
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        buttonWidth: rect.width
      });
    }
  }, [isVisible]);

  const dotSize = 10;
  const lineHeight = 18;
  const triangleSize = 10;

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
          className="fixed z-40 w-56 sm:w-64"
        >
          {/* Пульсирующая точка ТОЧНО ПО ЦЕНТРУ иконки */}
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
              boxShadow: '0 0 0 2px #3b82f6, 0 0 10px rgba(59, 130, 246, 0.5)',
              zIndex: 1
            }}
          >
            {/* Синий центр */}
            <div className="absolute inset-[2px] rounded-full bg-blue-500" />
            
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
              className="absolute inset-0 rounded-full border-2 border-blue-500"
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
              className="absolute inset-0 rounded-full border-2 border-blue-500"
              style={{ willChange: 'transform, opacity' }}
            />
          </motion.div>
          
          {/* Вертикальная линия ОТ точки */}
          <motion.div
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ 
              duration: 0.4, 
              delay: 0.3,
              ease: "easeOut"
            }}
            className="absolute w-[2px] bg-white origin-top"
            style={{ 
              right: `${position.buttonWidth / 2 - 1}px`,
              top: `-${dotSize / 2}px`,
              height: `${lineHeight}px`,
              zIndex: 1,
              willChange: 'transform, opacity'
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
            className="absolute w-[10px] h-[10px] bg-white transform rotate-45"
            style={{ 
              right: `${position.buttonWidth / 2 - triangleSize / 2}px`,
              top: `${lineHeight - dotSize / 2 - 5}px`,
              zIndex: 1
            }}
          />
          
          {/* Уведомление - белый фон, синий текст */}
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
            className="bg-white rounded-xl px-4 py-3 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform border border-blue-100"
            style={{ 
              marginTop: `${lineHeight - dotSize / 2 + 6}px`,
              boxShadow: '0 10px 40px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.1)',
              zIndex: 1,
              willChange: 'transform, opacity'
            }}
          >
            {/* Текст - синий, выровнен влево */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-blue-600/70 text-[10px] leading-tight font-medium">
                Мы добавили этот вопрос в ваш
              </p>
              <p className="text-blue-600 font-bold text-[14px] leading-tight mt-1">
                Банк Вопросов™
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
