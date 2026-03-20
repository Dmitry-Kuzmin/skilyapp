import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { Zap, Trophy, Target, Flame, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuestCompletedItem {
  user_quest_id: string;
  title: string;
  reward_sp: number;
  category: string;
}

interface QuestCompletionOverlayProps {
  quests: QuestCompletedItem[];
  onDismiss?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  questions:     Target,
  duels:         Zap,
  duel_wins:     Trophy,
  accuracy:      Star,
  exams:         Trophy,
  perfect_exams: Sparkles,
  default:       Flame,
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string; glow: string }> = {
  questions:     { bg: 'from-blue-600/30 to-blue-800/30',     border: 'border-blue-500/40',   icon: 'text-blue-400',   glow: 'shadow-blue-500/30'   },
  duels:         { bg: 'from-purple-600/30 to-purple-800/30', border: 'border-purple-500/40', icon: 'text-purple-400', glow: 'shadow-purple-500/30' },
  duel_wins:     { bg: 'from-amber-600/30 to-orange-800/30',  border: 'border-amber-500/40',  icon: 'text-amber-400',  glow: 'shadow-amber-500/30'  },
  accuracy:      { bg: 'from-emerald-600/30 to-green-800/30', border: 'border-emerald-500/40',icon: 'text-emerald-400',glow: 'shadow-emerald-500/30'},
  exams:         { bg: 'from-indigo-600/30 to-indigo-800/30', border: 'border-indigo-500/40', icon: 'text-indigo-400', glow: 'shadow-indigo-500/30' },
  perfect_exams: { bg: 'from-yellow-500/30 to-amber-700/30',  border: 'border-yellow-400/50', icon: 'text-yellow-300', glow: 'shadow-yellow-400/40' },
  default:       { bg: 'from-slate-600/30 to-slate-800/30',   border: 'border-slate-500/40',  icon: 'text-slate-300',  glow: 'shadow-slate-500/30'  },
};

const QuestCard: React.FC<{ quest: QuestCompletedItem; delay: number; onDone: () => void }> = ({ quest, delay, onDone }) => {
  const colors = CATEGORY_COLORS[quest.category] ?? CATEGORY_COLORS.default;
  const Icon = CATEGORY_ICONS[quest.category] ?? CATEGORY_ICONS.default;

  useEffect(() => {
    const t = setTimeout(onDone, delay + 4000);
    return () => clearTimeout(t);
  }, [delay, onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -60, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22, delay: delay / 1000 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-xl px-5 py-4',
        'bg-gradient-to-br shadow-2xl',
        colors.bg, colors.border, colors.glow
      )}
      style={{ maxWidth: 340 }}
    >
      {/* Фоновое свечение */}
      <div className={cn('absolute inset-0 opacity-20 blur-2xl bg-gradient-to-br pointer-events-none', colors.bg)} />

      <div className="relative z-10 flex items-center gap-4">
        {/* Иконка категории */}
        <div className={cn('shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/10')}>
          <Icon className={cn('w-6 h-6', colors.icon)} />
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40 mb-0.5">
            Квест выполнен!
          </p>
          <p className="text-base font-bold text-white leading-tight truncate">
            {quest.title}
          </p>
        </div>

        {/* SP награда */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: (delay / 1000) + 0.25 }}
          className="shrink-0 flex flex-col items-center"
        >
          <span className={cn('text-2xl font-black tabular-nums leading-none', colors.icon)}>
            +{quest.reward_sp}
          </span>
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">SP</span>
        </motion.div>
      </div>

      {/* Таймер-прогресс снизу */}
      <motion.div
        className={cn('absolute bottom-0 left-0 h-[2px] bg-gradient-to-r', colors.icon, 'opacity-60')}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 3.5, ease: 'linear', delay: delay / 1000 + 0.3 }}
      />
    </motion.div>
  );
};

export const QuestCompletionOverlay: React.FC<QuestCompletionOverlayProps> = ({ quests, onDismiss }) => {
  const [visible, setVisible] = useState<QuestCompletedItem[]>([]);
  const shownRef = useRef<Set<string>>(new Set());
  const totalShown = useRef(0);

  useEffect(() => {
    if (!quests.length) return;
    const newItems = quests.filter(q => !shownRef.current.has(q.user_quest_id));
    if (!newItems.length) return;
    newItems.forEach(q => shownRef.current.add(q.user_quest_id));
    setVisible(prev => [...prev, ...newItems]);
  }, [quests]);

  const handleDone = (id: string) => {
    setVisible(prev => {
      const next = prev.filter(q => q.user_quest_id !== id);
      totalShown.current += 1;
      if (next.length === 0 && totalShown.current > 0) onDismiss?.();
      return next;
    });
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2.5 pointer-events-none w-full px-4" style={{ maxWidth: 380 }}>
      <AnimatePresence mode="sync">
        {visible.map((quest, i) => (
          <QuestCard
            key={quest.user_quest_id}
            quest={quest}
            delay={i * 400}
            onDone={() => handleDone(quest.user_quest_id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
