import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { useModalStore } from '@/store/modalStore';
import { usePremium } from '@/hooks/usePremium';

interface MidTestAITeaserProps {
  incorrectCount: number;
}

export function MidTestAITeaser({ incorrectCount }: MidTestAITeaserProps) {
  const { isPremium } = usePremium();
  const openModal = useModalStore((s) => s.openModal);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isPremium || dismissed || incorrectCount < 1 || visible) return;
    setVisible(true);
  }, [incorrectCount, isPremium, dismissed, visible]);

  if (isPremium || !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-700 dark:text-violet-300 cursor-pointer select-none w-fit mx-auto"
          onClick={() => {
            setDismissed(true);
            setVisible(false);
            openModal('PAYWALL');
          }}
        >
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>AI запомнил эту ошибку — открой план в Premium</span>
          <button
            className="ml-1 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              setVisible(false);
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
