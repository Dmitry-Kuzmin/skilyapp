import React, { useMemo } from 'react';
import { Crown, ChevronRight, Sparkles } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { playClickSound } from '@/services/audioService';

interface PremiumCardProps {
  onGetPremium?: () => void;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ onGetPremium }) => {
  const { isPremium, isLifetime, daysRemaining, loading } = usePremium();

  const handleClick = () => {
    playClickSound();
    if (onGetPremium) {
      onGetPremium();
    } else {
      // Fallback: попытка открыть через событие или магазин
      const event = new CustomEvent('openPaywall');
      window.dispatchEvent(event);
    }
  };

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
      description: 'Доступ к 5,000+ тестам и безлимитные возможности',
      badge: null,
    };
  }, [isPremium, isLifetime, daysRemaining, loading]);

  return (
    <div 
      onClick={handleClick}
      className="h-full bg-slate-950 rounded-[2.5rem] p-8 relative overflow-hidden group cursor-pointer shadow-xl border border-slate-800"
    >
      {/* Gold Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out z-20"></div>
      
      {/* Noise Texture */}
      {/* ОПТИМИЗАЦИЯ: Используем <img> вместо background-image для лучшей производительности */}
      <img 
        src="https://grainy-gradients.vercel.app/noise.svg" 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
           <div className="flex items-center gap-2">
              {isLifetime ? (
                <Sparkles size={20} className="text-yellow-400 fill-yellow-400" />
              ) : (
                <Crown size={20} className="text-yellow-400 fill-yellow-400" />
              )}
              <span className="text-xs font-bold text-yellow-500 tracking-[0.3em] uppercase">
                {isLifetime ? 'Forever' : 'Premium Pass'}
              </span>
           </div>
           <div className="flex items-center gap-2">
             {statusInfo.badge && (
               <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                 {statusInfo.badge}
               </span>
             )}
             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
               <ChevronRight size={16} className="text-white" />
             </div>
           </div>
        </div>

        <div>
           <h3 className="text-xl md:text-2xl font-bold text-white mb-1 leading-tight">
             {statusInfo.title}
           </h3>
           <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
             {statusInfo.description}
           </p>
        </div>
      </div>
    </div>
  );
};

