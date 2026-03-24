import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone } from 'lucide-react';
import { useTelegramHomeScreen } from '@/hooks/useTelegramHomeScreen';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'homescreen_prompt_dismissed_at';
const SHOW_AFTER_DAYS = 7;

/**
 * Ненавязчивый баннер «Добавь на главный экран».
 * Показывается раз в SHOW_AFTER_DAYS дней, только если апп ещё не добавлен.
 * Работает только внутри Telegram (Bot API 8.0+).
 */
export function AddToHomeScreenPrompt() {
  const { status, isSupported, addToHomeScreen } = useTelegramHomeScreen();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Показываем только когда точно знаем что ещё не добавлено
    if (!isSupported || status !== 'missed') return;

    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < SHOW_AFTER_DAYS) return;
    }

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [status, isSupported]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  const handleAdd = () => {
    console.log('[AddToHomeScreenPrompt] handleAdd clicked');
    const result = addToHomeScreen();
    if (result === false) {
      console.error('[AddToHomeScreenPrompt] addToHomeScreen returned false');
    }
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'fixed bottom-[5.5rem] left-4 right-4 z-[60]',
            'bg-card border border-border rounded-2xl shadow-2xl p-4',
            'flex items-center gap-3'
          )}
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug">
              Добавь на экран
            </p>
            <p className="text-xs text-muted-foreground">
              Открывай без Telegram
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
          >
            Добавить
          </button>

          <button
            onClick={handleDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
