import React, { useState } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { X, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useModal } from '@/hooks/useModal';

// ─── Attack types ─────────────────────────────────────────────────────────────

export const ATTACK_BOOST_TYPES = new Set([
  'ice_screen', 'fog_screen', 'sun_glare', 'rain_storm', 'bug_splat',
  'police_backdoor', 'cryptolocker', 'input_lag', 'oil_spill',
  'screen_injector', 'gps_spoofing', 'firewall',
]);

const ATTACK_META: Record<string, { emoji: string; name: string; color: string; glow: string }> = {
  ice_screen:      { emoji: '🧊', name: 'Заморозка',  color: '#22d3ee', glow: 'rgba(34,211,238,0.4)' },
  fog_screen:      { emoji: '🌫️', name: 'Туман',      color: '#94a3b8', glow: 'rgba(148,163,184,0.4)' },
  sun_glare:       { emoji: '☀️', name: 'Солнце',     color: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  rain_storm:      { emoji: '🌧️', name: 'Гроза',      color: '#818cf8', glow: 'rgba(129,140,248,0.4)' },
  bug_splat:       { emoji: '🐛', name: 'Баги',        color: '#34d399', glow: 'rgba(52,211,153,0.4)' },
  police_backdoor: { emoji: '🚓', name: 'Полиция',    color: '#f87171', glow: 'rgba(248,113,113,0.4)' },
  cryptolocker:    { emoji: '🔐', name: 'Шифровка',   color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
  input_lag:       { emoji: '🕸️', name: 'Лаг',        color: '#fb923c', glow: 'rgba(251,146,60,0.4)' },
  oil_spill:       { emoji: '🛢️', name: 'Масло',      color: '#a8a29e', glow: 'rgba(168,162,158,0.4)' },
  screen_injector: { emoji: '💉', name: 'Инъекция',   color: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
  gps_spoofing:    { emoji: '📡', name: 'GPS Спуф',   color: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
  firewall:        { emoji: '🔥', name: 'Файрвол',    color: '#f97316', glow: 'rgba(249,115,22,0.4)' },
};

const ATTACK_ORDER = [
  'ice_screen', 'fog_screen', 'sun_glare', 'rain_storm',
  'bug_splat', 'police_backdoor', 'cryptolocker', 'input_lag',
  'oil_spill', 'screen_injector', 'gps_spoofing', 'firewall',
];

// ─── Utility types ────────────────────────────────────────────────────────────

const UTILITY_META: Record<string, { emoji: string; name: string; color: string }> = {
  fifty_fifty: { emoji: '✂️',  name: '50/50',      color: '#f59e0b' },
  time_extend: { emoji: '⏱️',  name: '+30 сек',    color: '#22d3ee' },
  hint:        { emoji: '💡',  name: 'Подсказка',  color: '#fb923c' },
  skip:        { emoji: '⏭️',  name: 'Пропустить', color: '#818cf8' },
  translate:   { emoji: '🌐',  name: 'Перевод',    color: '#34d399' },
  rewind:      { emoji: '↩️',  name: 'Перемотка',  color: '#a78bfa' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoostItem {
  boost_type: string;
  quantity: number;
  icon?: string | null;
  name_ru?: string;
}

interface AttackPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  boosts: BoostItem[];
  usedBoosts: string[];
  isAnswered: boolean;
  onBoostUse: (boostType: string, lang?: 'ru' | 'en') => void;
  translatePopoverOpen: string | null;
  onTranslatePopoverChange: (id: string | null) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const AttackPickerSheet: React.FC<AttackPickerSheetProps> = ({
  isOpen,
  onClose,
  boosts,
  usedBoosts,
  isAnswered,
  onBoostUse,
  translatePopoverOpen,
  onTranslatePopoverChange,
}) => {
  const { openModal } = useModal('BOOST_SHOP');
  const [pendingBuy, setPendingBuy] = useState<string | null>(null);

  const inventoryMap = new Map(boosts.map(b => [b.boost_type, b.quantity]));

  const handleClose = () => {
    setPendingBuy(null);
    onTranslatePopoverChange(null);
    onClose();
  };

  const handleAttack = (type: string) => {
    if (isAnswered) return;
    const qty = inventoryMap.get(type) ?? 0;
    if (qty <= 0) {
      setPendingBuy(prev => (prev === type ? null : type));
      return;
    }
    haptics.medium();
    onBoostUse(type);
    handleClose();
  };

  const handleUtility = (type: string) => {
    if (isAnswered || usedBoosts.includes(type)) return;
    const qty = inventoryMap.get(type) ?? 0;
    if (qty <= 0) {
      handleClose();
      openModal({ initialTab: 'boosts' });
      return;
    }
    if (type === 'translate') {
      onTranslatePopoverChange(translatePopoverOpen === type ? null : type);
      return;
    }
    haptics.light();
    onBoostUse(type);
    handleClose();
  };

  const utilityBoosts = Object.keys(UTILITY_META).map(type => ({
    type,
    qty: inventoryMap.get(type) ?? 0,
  }));

  const hasAnyUtility = utilityBoosts.some(b => b.qty > 0);
  const hasAnyAttack = ATTACK_ORDER.some(t => (inventoryMap.get(t) ?? 0) > 0);
  const hasAnything = hasAnyUtility || hasAnyAttack;

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) handleClose(); }}>
      <SheetContent
        side="bottom"
        className="p-0 border-0 rounded-t-3xl focus:outline-none overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(13,14,20,0.99) 0%, rgba(9,10,15,1) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 -4px 60px rgba(0,0,0,0.7)',
          maxHeight: '75vh',
        }}
      >
        {/* Gradient accent top border */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px]"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(99,102,241,0.7) 35%, rgba(168,85,247,0.7) 65%, transparent 95%)' }}
        />

        <div className="max-w-xl mx-auto flex flex-col" style={{ maxHeight: '75vh' }}>
          {/* Handle */}
          <div className="flex justify-center pt-3">
            <div className="w-9 h-1 rounded-full bg-white/15" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-3">
            <div>
              <h3 className="text-white font-black text-[15px] tracking-wide uppercase font-mono flex items-center gap-2">
                <span className="text-base">⚡</span> Арсенал
              </h3>
              <p className="text-white/35 text-[11px] mt-0.5">
                {isAnswered ? 'Ответ дан — жди следующего вопроса' : 'Атакуй соперника или используй инструмент'}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/14 transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-4 pb-5 flex-1">

            {/* ── ATTACKS ─────────────────────────────────────── */}
            <p className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-2.5">
              Атаки сопернику
            </p>

            <div className="grid grid-cols-4 gap-2">
              {ATTACK_ORDER.map((type, idx) => {
                const meta = ATTACK_META[type];
                if (!meta) return null;
                const qty = inventoryMap.get(type) ?? 0;
                const hasIt = qty > 0;
                const isUsed = usedBoosts.includes(type);
                const disabled = isAnswered || isUsed;
                const isBuyPending = pendingBuy === type;

                return (
                  <div key={type} className="flex flex-col gap-1">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.025, type: 'spring', stiffness: 400, damping: 30 }}
                      whileTap={!disabled && hasIt ? { scale: 0.88 } : {}}
                      onClick={() => handleAttack(type)}
                      disabled={disabled}
                      className={cn(
                        'relative aspect-square flex flex-col items-center justify-center rounded-2xl border transition-all duration-150',
                        disabled
                          ? 'opacity-30 cursor-not-allowed bg-white/3 border-white/5'
                          : hasIt
                            ? 'cursor-pointer bg-white/5 border-white/12 active:brightness-125'
                            : 'cursor-pointer bg-white/[0.02] border-dashed border-white/8',
                      )}
                      style={hasIt && !disabled ? {
                        boxShadow: `0 0 16px ${meta.glow}`,
                        borderColor: `${meta.color}35`,
                      } : undefined}
                    >
                      {/* Qty badge */}
                      <div className={cn(
                        'absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full border text-[9px] font-black flex items-center justify-center leading-none',
                        hasIt ? 'bg-white text-black border-transparent' : 'bg-transparent text-white/30 border-white/10',
                      )}>
                        {hasIt ? qty : '+'}
                      </div>

                      {/* Icon */}
                      <span
                        className="text-2xl leading-none mb-1"
                        style={hasIt && !disabled ? { filter: `drop-shadow(0 0 6px ${meta.glow})` } : { opacity: 0.25 }}
                      >
                        {meta.emoji}
                      </span>

                      {/* Name */}
                      <span
                        className="text-[9px] font-semibold text-center leading-tight w-full truncate px-1"
                        style={{ color: hasIt && !disabled ? `${meta.color}cc` : 'rgba(255,255,255,0.2)' }}
                      >
                        {meta.name}
                      </span>
                    </motion.button>

                    {/* Buy confirm pill */}
                    <AnimatePresence>
                      {isBuyPending && !disabled && (
                        <motion.button
                          initial={{ opacity: 0, y: -6, scaleY: 0.6 }}
                          animate={{ opacity: 1, y: 0, scaleY: 1 }}
                          exit={{ opacity: 0, y: -4, scaleY: 0.7 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => { handleClose(); openModal({ initialTab: 'boosts' }); }}
                          className="w-full py-1.5 rounded-xl text-[9px] font-bold text-indigo-300 border border-indigo-500/40 bg-indigo-500/15 active:bg-indigo-500/30 flex items-center justify-center gap-1 transition-colors"
                        >
                          <ShoppingBag className="w-2.5 h-2.5" /> Купить
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* ── UTILITY ─────────────────────────────────────── */}
            {hasAnyUtility && (
              <div className="mt-5">
                <p className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-2.5">
                  Инструменты
                </p>
                <div className="flex flex-wrap gap-2">
                  {utilityBoosts.map(({ type, qty }) => {
                    const meta = UTILITY_META[type];
                    if (!meta || qty <= 0) return null;
                    const isUsed = usedBoosts.includes(type);
                    const disabled = isAnswered || isUsed;
                    const isTranslateOpen = translatePopoverOpen === type;

                    if (type === 'translate' && isTranslateOpen && !disabled) {
                      return (
                        <div key={type} className="flex items-center gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { haptics.light(); onBoostUse('translate', 'ru'); handleClose(); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 text-xs font-bold active:bg-red-500/30 transition-colors"
                          >
                            🇷🇺 RU
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { haptics.light(); onBoostUse('translate', 'en'); handleClose(); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 text-blue-300 text-xs font-bold active:bg-blue-500/30 transition-colors"
                          >
                            🇬🇧 EN
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onTranslatePopoverChange(null)}
                            className="w-7 h-7 rounded-xl border border-white/10 bg-white/5 text-white/40 flex items-center justify-center transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </motion.button>
                        </div>
                      );
                    }

                    return (
                      <motion.button
                        key={type}
                        whileTap={!disabled ? { scale: 0.91 } : {}}
                        onClick={() => handleUtility(type)}
                        disabled={disabled}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                          disabled
                            ? 'opacity-30 cursor-not-allowed border-white/5 bg-white/3 text-white/30'
                            : 'border-white/12 bg-white/6 text-white/75 active:bg-white/14 cursor-pointer',
                        )}
                        style={!disabled ? { borderColor: `${meta.color}25` } : undefined}
                      >
                        <span className="text-sm leading-none">{meta.emoji}</span>
                        <span>{meta.name}</span>
                        <span className="text-[10px] font-black rounded-full px-1.5 py-0.5 bg-white/10 text-white/60">
                          ×{qty}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── EMPTY STATE ──────────────────────────────────── */}
            {!hasAnything && (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="text-5xl mb-3 opacity-20">🎒</span>
                <p className="text-white/40 text-sm font-semibold mb-1">Арсенал пуст</p>
                <p className="text-white/25 text-xs mb-5 max-w-[200px]">Купи атаки и инструменты — используй прямо в дуэли</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { handleClose(); openModal({ initialTab: 'boosts' }); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white border border-indigo-500/40 bg-indigo-500/15 active:bg-indigo-500/30 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Открыть магазин
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
