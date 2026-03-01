import React, { useMemo, useCallback } from 'react';
import { Crown, ChevronRight, Sparkles } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { playClickSound } from '@/services/audioService';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
  onGetPremium?: () => void;
}

export const PremiumCard: React.FC<PremiumCardProps> = React.memo(({ onGetPremium }) => {
  const { isPremium, isLifetime, daysRemaining, loading } = usePremium();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчик для предотвращения лишних ре-рендеров
  const handleClick = useCallback(() => {
    playClickSound();
    if (onGetPremium) {
      onGetPremium();
    } else {
      // Fallback: попытка открыть через событие или магазин
      const event = new CustomEvent('openPaywall');
      window.dispatchEvent(event);
    }
  }, [onGetPremium]);

  const statusInfo = useMemo(() => {
    if (loading) {
      return {
        title: 'Загрузка...',
        description: 'Проверка статуса',
        badge: null,
      };
    }

    if (isLifetime) {
      return {
        title: 'Premium Forever',
        description: 'Пожизненный доступ ко всем функциям',
        badge: 'Forever',
      };
    }

    if (isPremium) {
      if (daysRemaining !== null && daysRemaining > 0 && daysRemaining < 30) {
        return {
          title: 'Premium активен',
          description: `Осталось ${daysRemaining} ${daysRemaining === 1 ? 'день' : daysRemaining < 5 ? 'дня' : 'дней'}`,
          badge: `${daysRemaining}д`,
        };
      }
      return {
        title: 'Premium активен',
        description: 'Все функции доступны',
        badge: null,
      };
    }

    return {
      title: 'Разблокировать все',
      description: 'Доступ к 3,000+ тестам и безлимитные возможности',
      badge: null,
    };
  }, [isPremium, isLifetime, daysRemaining, loading]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "h-full rounded-3xl xl:rounded-[2.5rem] p-5 md:p-6 xl:p-8 relative overflow-hidden group cursor-pointer shadow-xl border transition-all duration-500",
        isDarkTheme
          ? "bg-slate-950 border-slate-800"
          : "bg-white border-slate-200 shadow-[0_20px_45px_rgba(0,0,0,0.06)] hover:border-yellow-400/30"
      )}
    >
      {/* Gold Shimmer effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-tr transition-transform duration-1000 ease-in-out z-20 translate-x-[-100%] group-hover:translate-x-[100%]",
        isDarkTheme
          ? "from-yellow-400/0 via-yellow-400/10 to-yellow-400/0"
          : "from-yellow-400/0 via-yellow-400/25 to-yellow-400/0"
      )}></div>

      {/* Noise Texture */}
      {/* ОПТИМИЗАЦИЯ: Используем <img> вместо background-image для лучшей производительности */}
      <img
        src="/noise.svg"
        alt=""
        className={cn(
          "absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity",
          isDarkTheme ? "opacity-20" : "opacity-10"
        )}
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {isLifetime ? (
              <Sparkles size={20} className={isDarkTheme ? "text-yellow-400 fill-yellow-400" : "text-yellow-500 fill-yellow-500"} />
            ) : (
              <Crown size={20} className={isDarkTheme ? "text-yellow-400 fill-yellow-400" : "text-yellow-500 fill-yellow-500"} />
            )}
            <span className={cn(
              "text-xs font-bold tracking-[0.3em] uppercase",
              isDarkTheme ? "text-yellow-500" : "text-yellow-600"
            )}>
              {isLifetime ? 'Forever' : 'Premium Pass'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {statusInfo.badge && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                {statusInfo.badge}
              </span>
            )}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              isDarkTheme ? "bg-white/10 group-hover:bg-white/20" : "bg-slate-100 group-hover:bg-yellow-50"
            )}>
              <ChevronRight size={16} className={isDarkTheme ? "text-white" : "text-slate-600"} />
            </div>
          </div>
        </div>

        <div>
          <h3 className={cn(
            "text-xl md:text-2xl font-bold mb-1 leading-tight",
            isDarkTheme ? "text-white" : "text-slate-900"
          )}>
            {statusInfo.title}
          </h3>
          <p className={cn(
            "text-xs md:text-sm leading-relaxed",
            isDarkTheme ? "text-slate-400" : "text-slate-500"
          )}>
            {statusInfo.description}
          </p>
        </div>
      </div>
    </div>
  );
});

