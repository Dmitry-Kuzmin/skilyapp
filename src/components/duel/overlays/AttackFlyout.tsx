import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { useLanguage } from '@/contexts/LanguageContext';

export interface AttackFlyoutData {
  type: string;
  emoji: string;
  name: string;
  color: string;
  glow: string;
}

interface AttackFlyoutProps {
  attack: AttackFlyoutData | null;
  opponentName?: string;
  onDismiss: () => void;
}

// Compact pill toast — slides in below the header, auto-dismisses in 1.6s.
// No background overlay, pointer-events: none — game stays fully playable.
export const AttackFlyout: React.FC<AttackFlyoutProps> = ({ attack, opponentName, onDismiss }) => {
  const { t } = useLanguage();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!attack) return;
    timerRef.current = setTimeout(() => onDismiss(), 1600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [attack, onDismiss]);

  return (
    <AnimatePresence>
      {attack && (
        <motion.div
          key={attack.type + '-toast'}
          initial={{ opacity: 0, y: -18, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.92, transition: { duration: 0.22 } }}
          transition={{ type: 'spring', stiffness: 460, damping: 32 }}
          className="fixed top-[68px] left-1/2 -translate-x-1/2 z-[9990] pointer-events-none select-none"
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{
              background: `linear-gradient(135deg, rgba(13,14,20,0.95) 0%, rgba(9,10,15,0.98) 100%)`,
              borderColor: `${attack.color}45`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 16px ${attack.glow}`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              className="text-xl leading-none"
              style={{ filter: `drop-shadow(0 0 6px ${attack.glow})` }}
            >
              {attack.emoji}
            </span>
            <span className="text-white/90 text-sm font-bold tracking-wide whitespace-nowrap">
              {t(`boostShop.boostNames.${attack.type}.name`) || attack.name}
            </span>
            {opponentName && (
              <>
                <span className="text-white/30 text-xs">→</span>
                <span className="text-white/55 text-xs font-medium whitespace-nowrap">
                  {opponentName.split(' ')[0]}
                </span>
              </>
            )}
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${attack.color}22`, color: `${attack.color}cc` }}
            >
              ⚡ {t('duelArsenal.attackLabel')}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
