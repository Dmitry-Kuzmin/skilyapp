import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';

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

export const AttackFlyout: React.FC<AttackFlyoutProps> = ({ attack, opponentName, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!attack) return;
    timerRef.current = setTimeout(() => onDismiss(), 2200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [attack, onDismiss]);

  return (
    <AnimatePresence>
      {attack && (
        <motion.div
          key={attack.type + '-flyout'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          className="fixed inset-0 z-[9990] flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
          style={{
            background: `radial-gradient(ellipse at center, ${attack.glow} 0%, rgba(0,0,0,0.82) 70%)`,
          }}
        >
          {/* Ripple rings */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0.4, opacity: 0.6 }}
              animate={{ scale: 3.5, opacity: 0 }}
              transition={{ duration: 1.1, delay: i * 0.18, ease: 'easeOut' }}
              className="absolute rounded-full border"
              style={{
                width: 120,
                height: 120,
                borderColor: `${attack.color}55`,
                borderWidth: 2,
              }}
            />
          ))}

          {/* Central emoji burst */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0, y: 40 }}
            animate={{ scale: [0.2, 1.45, 1.15], opacity: [0, 1, 1], y: [40, -10, 0] }}
            transition={{ duration: 0.55, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="relative flex flex-col items-center gap-3"
          >
            {/* Glow halo behind emoji */}
            <div
              className="absolute rounded-full blur-2xl opacity-60"
              style={{
                width: 140,
                height: 140,
                background: attack.glow,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -60%)',
              }}
            />

            <span
              className="text-[80px] leading-none relative z-10"
              style={{ filter: `drop-shadow(0 0 24px ${attack.glow}) drop-shadow(0 0 8px ${attack.color})` }}
            >
              {attack.emoji}
            </span>

            {/* Attack name */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.25 }}
              className="flex flex-col items-center gap-1 z-10"
            >
              <span
                className="text-[11px] font-mono uppercase tracking-[0.22em] font-black"
                style={{ color: `${attack.color}99` }}
              >
                атака
              </span>
              <span
                className="text-2xl font-black tracking-tight leading-none"
                style={{ color: attack.color, textShadow: `0 0 20px ${attack.glow}` }}
              >
                {attack.name}
              </span>
            </motion.div>
          </motion.div>

          {/* "SENT TO OPPONENT" banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.65, duration: 0.3 }}
            className="absolute bottom-[28%] flex flex-col items-center gap-1.5"
          >
            <div
              className="px-5 py-2 rounded-full border"
              style={{
                borderColor: `${attack.color}40`,
                background: `${attack.glow}`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="text-white/90 text-sm font-bold tracking-wide">
                {opponentName ? `→ ${opponentName}` : 'Сопернику отправлено'}
              </span>
            </div>
            <span className="text-white/35 text-[11px] font-mono">действует 30 секунд</span>
          </motion.div>

          {/* Corner flash vignette */}
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${attack.color}30 0%, transparent 65%)`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
