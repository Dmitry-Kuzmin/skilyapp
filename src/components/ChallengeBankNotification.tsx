import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChallengeBankNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ChallengeBankNotification = ({ isVisible, onClose }: ChallengeBankNotificationProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay для закрытия по клику вне */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
          />

          {/* Основное уведомление */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90%] max-w-md"
          >
            {/* Указатель на иконку закладки (если она есть в навигации) */}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 60 }}
              transition={{ delay: 0.2 }}
              className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Bookmark className="w-5 h-5 text-primary-foreground fill-current" />
              </div>
              <div className="w-0.5 h-6 bg-white/60" />
              <div className="w-3 h-3 rounded-full bg-white/60" />
            </motion.div>

            {/* Карточка уведомления */}
            <div className="bg-primary rounded-2xl p-6 shadow-2xl relative">
              {/* Кнопка закрытия */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Контент */}
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-primary-foreground/90 text-sm leading-relaxed">
                    Мы добавили этот вопрос в ваш
                  </p>
                  <h3 className="text-primary-foreground text-2xl font-bold mt-1">
                    Банк Вопросов™
                  </h3>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-primary-foreground/80 text-sm leading-relaxed"
                >
                  Все пропущенные вопросы сохраняются автоматически для дополнительной практики.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-2"
                >
                  <Button
                    onClick={onClose}
                    variant="secondary"
                    size="lg"
                    className="w-full bg-white hover:bg-white/90 text-primary font-semibold shadow-lg"
                  >
                    Понятно
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

