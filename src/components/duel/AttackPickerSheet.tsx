import React, { useState } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { X, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useModal } from '@/hooks/useModal';

// ─── Static config for all known attack types ────────────────────────────────

export const ATTACK_BOOST_TYPES = new Set([
  'ice_screen', 'fog_screen', 'sun_glare', 'rain_storm', 'bug_splat',
  'police_backdoor', 'cryptolocker', 'input_lag', 'oil_spill',
  'screen_injector', 'gps_spoofing', 'firewall',
]);

const ATTACK_META: Record<string, { emoji: string; name: string; color: string; glow: string }> = {
  ice_screen:      { emoji: '🧊', name: 'Заморозка',  color: '#22d3ee', glow: 'rgba(34,211,238,0.45)' },
  fog_screen:      { emoji: '🌫️', name: 'Туман',      color: '#94a3b8', glow: 'rgba(148,163,184,0.45)' },
  sun_glare:       { emoji: '☀️', name: 'Солнце',     color: '#f59e0b', glow: 'rgba(245,158,11,0.45)' },
  rain_storm:      { emoji: '🌧️', name: 'Гроза',      color: '#818cf8', glow: 'rgba(129,140,248,0.45)' },
  bug_splat:       { emoji: '🐛', name: 'Баги',        color: '#34d399', glow: 'rgba(52,211,153,0.45)' },
  police_backdoor: { emoji: '🚓', name: 'Полиция',    color: '#f87171', glow: 'rgba(248,113,113,0.45)' },
  cryptolocker:    { emoji: '🔐', name: 'Шифровка',   color: '#a78bfa', glow: 'rgba(167,139,250,0.45)' },
  input_lag:       { emoji: '🕸️', name: 'Лаг',        color: '#fb923c', glow: 'rgba(251,146,60,0.45)' },
  oil_spill:       { emoji: '🛢️', name: 'Масло',      color: '#a8a29e', glow: 'rgba(168,162,158,0.45)' },
  screen_injector: { emoji: '💉', name: 'Инъекция',   color: '#ef4444', glow: 'rgba(239,68,68,0.45)' },
  gps_spoofing:    { emoji: '📡', name: 'GPS Спуф',   color: '#06b6d4', glow: 'rgba(6,182,212,0.45)' },
  firewall:        { emoji: '🔥', name: 'Файрвол',    color: '#f97316', glow: 'rgba(249,115,22,0.45)' },
};

const ATTACK_ORDER = [
  'ice_screen', 'fog_screen', 'sun_glare', 'rain_storm',
  'bug_splat', 'police_backdoor', 'cryptolocker', 'input_lag',
  'oil_spill', 'screen_injector', 'gps_spoofing', 'firewall',
];

// ─── Utility boost types (shown in a compact row at bottom) ──────────────────

const UTILITY_BOOST_TYPES = new Set([
  'fifty_fifty', 'time_extend', 'hint', 'skip', 'translate', 'rewind',
]);

const UTILITY_META: Record<string, { emoji: string; name: string }> = {
  fifty_fifty:  { emoji: '✂️',  name: '50/50' },
  time_extend:  { emoji: '⏱️',  name: '+30с' },
  hint:         { emoji: '💡',  name: 'Подсказка' },
  skip:         { emoji: '⏭️',  name: 'Пропуск' },
  translate:    { emoji: '🌐',  name: 'Перевод' },
  rewind:       { emoji: '↩️',  name: 'Перемотка' },
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
  onBoostUse: (boostType: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const AttackPickerSheet: React.FC<AttackPickerSheetProps> = ({
  isOpen,
  onClose,
  boosts,
  usedBoosts,
  isAnswered,
  onBoostUse,
}) => {
  const { openModal } = useModal('BOOST_SHOP');
  const [pendingBuy, setPendingBuy] = useState<string | null>(null);

  const inventoryMap = new Map(boosts.map(b => [b.boost_type, b.quantity]));

  const handleAttack = (type: string) => {
    if (isAnswered) return;
    const qty = inventoryMap.get(type) ?? 0;
    if (qty <= 0) {
      setPendingBuy(prev => (prev === type ? null : type));
      return;
    }
    haptics.medium();
    onBoostUse(type);
    onClose();
  };

  const handleBuyAndAttack = () => {
    onClose();
    openModal({ initialTab: 'boosts' });
  };

  const utilityBoosts = boosts.filter(b => UTILITY_BOOST_TYPES.has(b.boost_type) && b.quantity > 0);

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) { onClose(); setPendingBuy(null); } }}>
      <SheetContent
        side="bottom"
        className="p-0 border-0 rounded-t-3xl focus:outline-none"
        style={{
          background: 'linear-gradient(180deg, rgba(15,17,23,0.98) 0%, rgba(10,11,16,0.99) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 -2px 60px rgba(0,0,0,0.6)',
          maxHeight: '72vh',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(168,85,247,0.6), transparent)' }}
        />

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="text-white font-black text-base tracking-wider uppercase font-mono">Атаки</span>
            </div>
            <p className="text-white/40 text-xs mt-0.5 font-mono">Отправь помеху сопернику</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Attack grid */}
        <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(72vh - 100px)' }}>
          <div className="grid grid-cols-4 gap-2.5">
            {ATTACK_ORDER.map((type, idx) => {
              const meta = ATTACK_META[type];
              if (!meta) return null;
              const qty = inventoryMap.get(type) ?? 0;
              const hasIt = qty > 0;
              const isUsed = usedBoosts.includes(type);
              const isBuyPending = pendingBuy === type;
              const disabled = isAnswered || isUsed;

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, type: 'spring', stiffness: 380, damping: 28 }}
                  className="flex flex-col gap-1.5"
                >
                  <motion.button
                    whileTap={!disabled && hasIt ? { scale: 0.92 } : {}}
                    onClick={() => handleAttack(type)}
                    disabled={disabled}
                    className={cn(
                      'relative flex flex-col items-center justify-center rounded-2xl pt-3 pb-2 px-1 border transition-all duration-200',
                      disabled
                        ? 'opacity-35 cursor-not-allowed border-white/5 bg-white/3'
                        : hasIt
                          ? 'cursor-pointer border-white/15 bg-white/5 active:brightness-110'
                          : 'cursor-pointer border-dashed border-white/10 bg-white/[0.02]',
                    )}
                    style={hasIt && !disabled ? {
                      boxShadow: `0 0 18px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                      borderColor: `${meta.color}40`,
                    } : undefined}
                  >
                    {/* Qty badge */}
                    <div
                      className={cn(
                        'absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black border',
                        hasIt
                          ? 'bg-white text-black border-white/20'
                          : 'bg-white/10 text-white/40 border-white/10',
                      )}
                    >
                      {hasIt ? qty : '+'}
                    </div>

                    {/* Icon */}
                    <span
                      className="text-2xl leading-none mb-1.5"
                      style={hasIt && !disabled ? { filter: `drop-shadow(0 0 8px ${meta.glow})` } : { opacity: 0.35 }}
                    >
                      {meta.emoji}
                    </span>

                    {/* Name */}
                    <span
                      className="text-[9px] font-bold text-center leading-tight w-full truncate px-0.5"
                      style={{ color: hasIt && !disabled ? meta.color : 'rgba(255,255,255,0.3)' }}
                    >
                      {meta.name}
                    </span>
                  </motion.button>

                  {/* Buy confirm */}
                  <AnimatePresence>
                    {isBuyPending && !hasIt && !disabled && (
                      <motion.button
                        initial={{ opacity: 0, scaleY: 0.7, y: -4 }}
                        animate={{ opacity: 1, scaleY: 1, y: 0 }}
                        exit={{ opacity: 0, scaleY: 0.7, y: -4 }}
                        transition={{ duration: 0.18 }}
                        onClick={handleBuyAndAttack}
                        className="flex items-center justify-center gap-1 rounded-xl py-1.5 text-[9px] font-bold text-white border border-indigo-500/50 bg-indigo-500/20 active:bg-indigo-500/35 transition-colors"
                      >
                        <ShoppingBag className="w-2.5 h-2.5" />
                        Купить
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Utility boosts row */}
          {utilityBoosts.length > 0 && (
            <div className="mt-5">
              <p className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-2.5 px-0.5">
                Инструменты
              </p>
              <div className="flex flex-wrap gap-2">
                {utilityBoosts.map(b => {
                  const meta = UTILITY_META[b.boost_type];
                  const isUsed = usedBoosts.includes(b.boost_type);
                  const disabled = isAnswered || isUsed;
                  return (
                    <motion.button
                      key={b.boost_type}
                      whileTap={!disabled ? { scale: 0.93 } : {}}
                      onClick={() => {
                        if (disabled) return;
                        haptics.light();
                        onBoostUse(b.boost_type);
                        onClose();
                      }}
                      disabled={disabled}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3 py-1.5 border text-xs font-semibold transition-all',
                        disabled
                          ? 'opacity-35 cursor-not-allowed border-white/5 bg-white/3 text-white/30'
                          : 'border-white/15 bg-white/8 text-white/80 active:bg-white/15 cursor-pointer',
                      )}
                    >
                      <span>{meta?.emoji ?? b.icon ?? '⚡'}</span>
                      <span>{meta?.name ?? b.name_ru ?? b.boost_type}</span>
                      <span className="text-[10px] font-black bg-white/15 rounded-full px-1.5 py-0.5 text-white/70">
                        ×{b.quantity}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {boosts.filter(b => ATTACK_BOOST_TYPES.has(b.boost_type) && b.quantity > 0).length === 0 &&
            utilityBoosts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="text-4xl mb-3 opacity-30">⚡</span>
              <p className="text-white/40 text-sm font-semibold mb-1">Нет атак в арсенале</p>
              <p className="text-white/25 text-xs mb-4">Купи атаки в магазине и используй их прямо здесь</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleBuyAndAttack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white border border-indigo-500/50 bg-indigo-500/20 active:bg-indigo-500/35 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Открыть магазин
              </motion.button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
