import { motion } from 'framer-motion';
import { Sparkles, Timer, HelpCircle, SkipForward, Globe, Zap, ChevronDown, X, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { memo } from 'react';

interface Boost {
  boost_type: string;
  quantity: number;
  icon?: string | null;
  name_ru?: string;
}

interface DuelBoostsPanelProps {
  boosts: Boost[];
  usedBoosts: string[];
  isAnswered: boolean;
  translatePopoverOpen: string | null;
  onBoostUse: (boostType: string, language?: 'ru' | 'en') => void;
  onTranslatePopoverChange: (boostType: string | null) => void;
}

export const DuelBoostsPanel = memo(({
  boosts,
  usedBoosts,
  isAnswered,
  translatePopoverOpen,
  onBoostUse,
  onTranslatePopoverChange,
}: DuelBoostsPanelProps) => {
  // Логируем для отладки
  if (typeof window !== 'undefined') {
    console.log('[DuelBoostsPanel] Boosts count:', boosts.length, 'Boosts:', boosts);
  }

  // ВАЖНО: Всегда показываем панель бустов, даже если массив пустой
  // Это помогает пользователю видеть, что функционал есть, и упрощает отладку
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1'));
  
  return (
    <div className="flex items-center gap-1.5 flex-wrap w-full justify-center">
      {boosts.length === 0 && isDev && (
        <div className="text-xs text-muted-foreground/50 px-2 py-1 border border-dashed border-muted-foreground/20 rounded">
          Бусты не загружены (0)
        </div>
      )}
      {boosts.map((boost) => {
        const boostConfig = {
          // Safe Mode
          fifty_fifty: { icon: Sparkles, label: '50/50', gradient: 'from-yellow-400 via-orange-400 to-orange-500', bg: 'bg-gradient-to-br from-yellow-400/90 to-orange-500/90' },
          time_extend: { icon: Timer, label: '+30s', gradient: 'from-blue-400 via-cyan-400 to-cyan-500', bg: 'bg-gradient-to-br from-blue-400/90 to-cyan-500/90' },
          hint: { icon: HelpCircle, label: 'Hint', gradient: 'from-orange-400 via-amber-400 to-amber-500', bg: 'bg-gradient-to-br from-orange-400/90 to-amber-500/90' },
          skip: { icon: SkipForward, label: 'Skip', gradient: 'from-blue-400 via-indigo-400 to-indigo-500', bg: 'bg-gradient-to-br from-blue-400/90 to-indigo-500/90' },
          translate: { icon: Globe, label: 'Translate', gradient: 'from-green-400 via-emerald-400 to-emerald-500', bg: 'bg-gradient-to-br from-green-400/90 to-emerald-500/90' },
          rewind: { icon: Zap, label: 'Rewind', gradient: 'from-purple-400 via-violet-400 to-violet-500', bg: 'bg-gradient-to-br from-purple-400/90 to-violet-500/90' },
          // Root Mode (Exploits)
          screen_injector: { icon: Droplets, label: 'Data Leak', gradient: 'from-red-500 via-rose-500 to-red-600', bg: 'bg-gradient-to-br from-red-500/90 to-red-600/90' },
          input_lag: { icon: Zap, label: 'Input Lag', gradient: 'from-orange-500 via-red-500 to-orange-600', bg: 'bg-gradient-to-br from-orange-500/90 to-orange-600/90' },
          gps_spoofing: { icon: Zap, label: 'GPS Spoof', gradient: 'from-cyan-500 via-blue-500 to-cyan-600', bg: 'bg-gradient-to-br from-cyan-500/90 to-cyan-600/90' },
          police_backdoor: { icon: Zap, label: 'Backdoor', gradient: 'from-yellow-500 via-amber-500 to-yellow-600', bg: 'bg-gradient-to-br from-yellow-500/90 to-yellow-600/90' },
          firewall: { icon: Zap, label: 'Firewall', gradient: 'from-blue-500 via-indigo-500 to-blue-600', bg: 'bg-gradient-to-br from-blue-500/90 to-blue-600/90' },
        }[boost.boost_type] || { icon: Zap, label: boost.boost_type, gradient: 'from-gray-500 to-gray-600', bg: 'bg-gradient-to-br from-gray-500/90 to-gray-600/90' };

        const BoostIcon = boostConfig.icon;
        const isUsed = usedBoosts.includes(boost.boost_type);
        const isDisabled = isUsed || isAnswered || boost.quantity <= 0;
        
        // Используем иконку из БД, если она есть, иначе fallback на иконку из конфига
        const displayIcon = boost.icon || null;
        const displayName = boost.name_ru || boostConfig.label;

        // Для translate бустера показываем развернутую версию с выбором языка
        if (boost.boost_type === 'translate' && translatePopoverOpen === boost.boost_type && !isDisabled) {
          return (
            <motion.div
              key={boost.boost_type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex items-center gap-1"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => {
                    onBoostUse(boost.boost_type, 'ru');
                    onTranslatePopoverChange(null);
                  }}
                  variant="outline"
                  size="sm"
                  className="relative h-8 px-2.5 flex items-center gap-1 border transition-all duration-200 bg-gradient-to-br from-red-500 to-red-600 text-white border-white/30 shadow-sm hover:shadow-md"
                >
                  <span className="text-xs">🇷🇺</span>
                  <span className="text-[10px] font-bold">RU</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => {
                    onBoostUse(boost.boost_type, 'en');
                    onTranslatePopoverChange(null);
                  }}
                  variant="outline"
                  size="sm"
                  className="relative h-8 px-2.5 flex items-center gap-1 border transition-all duration-200 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-white/30 shadow-sm hover:shadow-md"
                >
                  <span className="text-xs">🇬🇧</span>
                  <span className="text-[10px] font-bold">EN</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => onTranslatePopoverChange(null)}
                  variant="outline"
                  size="sm"
                  className="relative h-8 w-8 p-0 flex items-center justify-center border transition-all duration-200 bg-muted/50 hover:bg-muted border-border"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            </motion.div>
          );
        }

        return (
          <motion.button
            key={boost.boost_type}
            onClick={() => {
              if (boost.boost_type === 'translate') {
                onTranslatePopoverChange(boost.boost_type);
              } else {
                onBoostUse(boost.boost_type);
              }
            }}
            disabled={isDisabled}
            whileHover={!isDisabled ? { scale: 1.05 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            className={`relative h-8 px-2 flex items-center gap-1 rounded-lg font-bold text-[11px] transition-all shadow-sm border ${
              isDisabled
                ? 'bg-muted/30 border-border/40 opacity-40 cursor-not-allowed grayscale'
                : `${boostConfig.bg} text-white border-white/25 hover:shadow-md hover:border-white/40`
            }`}
          >
            {displayIcon ? (
              <span className="text-lg flex items-center justify-center shrink-0 w-4 h-4 leading-none" title={displayName}>
                {displayIcon}
              </span>
            ) : (
              <BoostIcon className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="whitespace-nowrap leading-none" title={displayName}>{displayName}</span>
            {boost.boost_type === 'translate' && !isDisabled && (
              <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 shrink-0 ${translatePopoverOpen === boost.boost_type ? 'rotate-180' : ''}`} />
            )}
            <div className={`ml-0.5 h-4 px-1 flex items-center justify-center rounded text-white text-[9px] font-bold min-w-[16px] shrink-0 ${
              isDisabled ? 'bg-white/10' : 'bg-white/30'
            }`}>
              {boost.quantity}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
});

DuelBoostsPanel.displayName = 'DuelBoostsPanel';

