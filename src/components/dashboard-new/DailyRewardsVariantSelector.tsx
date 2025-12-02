import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface DailyRewardsVariantSelectorProps {
  selectedVariant: 'A' | 'B' | 'C' | 'original';
  onSelect: (variant: 'A' | 'B' | 'C' | 'original') => void;
}

export const DailyRewardsVariantSelector: React.FC<DailyRewardsVariantSelectorProps> = ({
  selectedVariant,
  onSelect
}) => {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  const variants = [
    { id: 'original', name: 'Оригинал', desc: 'Текущий' },
    { id: 'A', name: 'Вариант A', desc: 'Горизонтальный' },
    { id: 'B', name: 'Вариант B', desc: 'С кругом' },
    { id: 'C', name: 'Вариант C', desc: 'Карточки' },
  ] as const;

  return (
    <div className={`rounded-2xl p-4 mb-4 border ${
      isDarkTheme 
        ? 'bg-slate-900/50 border-slate-800' 
        : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={`font-bold text-sm ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
            🎨 Выбор дизайна виджета
          </h4>
          <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
            Протестируй разные варианты и выбери лучший
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {variants.map((variant) => (
          <motion.button
            key={variant.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(variant.id as any)}
            className={`p-3 rounded-xl border-2 transition-all ${
              selectedVariant === variant.id
                ? isDarkTheme
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                  : 'bg-orange-100 border-orange-400 text-orange-600'
                : isDarkTheme
                ? 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className="text-sm font-bold mb-1">{variant.name}</div>
            <div className="text-[10px] opacity-70">{variant.desc}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

