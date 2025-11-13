import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
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
          className="fixed z-40 w-64 sm:w-72"
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
              boxShadow: '0 0 0 2px #f97316, 0 0 10px rgba(249, 115, 22, 0.5)',
              zIndex: 1
            }}
          >
            {/* Оранжевый центр */}
            <div className="absolute inset-[2px] rounded-full bg-orange-500" />
            
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
              className="absolute inset-0 rounded-full border-2 border-orange-500"
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
              className="absolute inset-0 rounded-full border-2 border-orange-500"
              style={{ willChange: 'transform, opacity' }}
            />
          </motion.div>
          
          {/* Вертикальная линия */}
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
              right: `${position.buttonWidth / 2 - 5}px`,
              top: `${lineHeight - dotSize / 2 - 5}px`,
              zIndex: 1
            }}
          />
          
          {/* Уведомление в стиле Lumi */}
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
            className="bg-white rounded-xl px-3 py-2.5 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform border border-orange-100"
            style={{ 
              marginTop: `${lineHeight - dotSize / 2 + 6}px`,
              boxShadow: '0 10px 40px rgba(249, 115, 22, 0.12)',
              zIndex: 1,
              willChange: 'transform, opacity'
            }}
          >
            <div className="flex items-start gap-2">
              {/* Аватар Lumi */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 600 }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md"
              >
                <Lightbulb className="w-4 h-4 text-white fill-white" />
              </motion.div>
              
              {/* Текст от Lumi */}
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="flex-1 min-w-0"
              >
                <p className="text-gray-700 text-[11px] leading-relaxed">
                  Я сохранила этот вопрос в твой <span className="font-bold text-orange-600">Банк Вопросов™</span> для практики! 💡
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
