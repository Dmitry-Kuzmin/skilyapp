import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark } from 'lucide-react';

interface ChallengeBankNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ChallengeBankNotification = ({ isVisible, onClose }: ChallengeBankNotificationProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, x: 10 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -10, x: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-16 right-4 z-[100] w-64 sm:w-72"
          onClick={onClose}
        >
          {/* Указатель к иконке (треугольник) */}
          <div className="absolute -top-2 right-6 w-4 h-4 bg-primary transform rotate-45" />
          
          {/* Компактное уведомление */}
          <div className="bg-primary rounded-lg p-3 shadow-2xl cursor-pointer hover:shadow-3xl transition-all relative">
            <div className="flex items-start gap-2.5">
              {/* Иконка */}
              <div className="w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
                <Bookmark className="w-4 h-4 text-primary-foreground fill-current" />
              </div>
              
              {/* Текст */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-primary-foreground text-xs leading-snug">
                  Вопрос добавлен в
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
