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
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-20 right-4 sm:right-6 z-[100] max-w-sm"
          onClick={onClose}
        >
          {/* Компактное toast-уведомление */}
          <div className="bg-primary rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl cursor-pointer hover:shadow-3xl transition-shadow border border-primary-foreground/10">
            <div className="flex items-start gap-3">
              {/* Иконка закладки */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground fill-current" />
              </div>
              
              {/* Текст */}
              <div className="flex-1 min-w-0">
                <h3 className="text-primary-foreground font-bold text-base sm:text-lg leading-tight mb-1">
                  Банк Вопросов™
                </h3>
                <p className="text-primary-foreground/80 text-xs sm:text-sm leading-snug">
                  Вопрос сохранён для практики
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
