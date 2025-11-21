import React from 'react';
import { Crown, ChevronRight } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { useNavigate } from 'react-router-dom';

export const PremiumCard: React.FC = () => {
  const { isPremium } = usePremium();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/premium');
  };

  return (
    <div 
      onClick={handleClick}
      className="h-full bg-slate-950 rounded-[2.5rem] p-8 relative overflow-hidden group cursor-pointer shadow-xl border border-slate-800"
    >
      {/* Gold Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out z-20"></div>
      
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
           <div className="flex items-center gap-2">
              <Crown size={20} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-yellow-500 tracking-[0.3em] uppercase">Premium Pass</span>
           </div>
           <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
             <ChevronRight size={16} className="text-white" />
           </div>
        </div>

        <div>
           <h3 className="text-2xl font-bold text-white mb-1">
             {isPremium ? 'Premium активен' : 'Разблокировать все'}
           </h3>
           <p className="text-slate-400 text-sm">
             {isPremium 
               ? 'Все функции доступны' 
               : 'Доступ к 5,000+ тестам и безлимитные возможности.'
             }
           </p>
        </div>
      </div>
    </div>
  );
};

