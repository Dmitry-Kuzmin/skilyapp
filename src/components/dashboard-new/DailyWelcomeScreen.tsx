import React, { useState } from 'react';
import { Power } from 'lucide-react';
import { playClickSound, playEngineSound } from '@/services/audioService';

interface DailyWelcomeScreenProps {
  onComplete: () => void;
}

export const DailyWelcomeScreen: React.FC<DailyWelcomeScreenProps> = ({ onComplete }) => {
  const [isIgniting, setIsIgniting] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);

  const handleStart = () => {
    if (isIgniting) return;
    
    setIsIgniting(true);
    
    // Звуки запуска
    playClickSound();
    playEngineSound();
    
    // Последовательность запуска
    setTimeout(() => {
      setIsLaunched(true);
      // Сохраняем дату последнего открытия
      const today = new Date().toDateString();
      localStorage.setItem('last_daily_open', today);
      setTimeout(onComplete, 800); // Плавный переход после запуска
    }, 1800);
  };

  if (isLaunched) {
    // Состояние плавного исчезновения
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 transition-opacity duration-700 opacity-0 pointer-events-none"></div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-6 transition-all duration-500 overflow-hidden">
      
      {/* Фоновый градиент */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950"></div>
      
      {/* Сетка на фоне */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <div className="relative z-10 flex flex-col items-center animate-fade-in">
        {/* Амбиентное свечение */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="mb-12 text-center space-y-2">
          <p className="text-indigo-400 text-xs font-mono tracking-[0.3em] animate-pulse">SYSTEM READY</p>
        </div>

        <button 
          onClick={handleStart}
          className={`group relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 transform-gpu ${
            isIgniting ? 'animate-shake' : 'hover:scale-105'
          }`}
        >
          {/* Радиальный градиент свечения */}
          <div 
            className={`absolute inset-[-50%] rounded-full transition-all duration-500 pointer-events-none mix-blend-screen ${
              isIgniting ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-60'
            }`}
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0) 70%)' }}
          ></div>

          {/* Металлическое кольцо */}
          <div className="absolute inset-0 rounded-full metal-ring shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_5px_rgba(255,255,255,0.5)] p-3 z-10">
            {/* Внутренний темный пластик */}
            <div className="w-full h-full rounded-full bg-[#111] shadow-[inset_0_5px_15px_rgba(0,0,0,0.9)] p-1.5">
              
              {/* Поверхность кнопки */}
              <div className={`w-full h-full rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#050505] border-t border-white/10 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 ${
                isIgniting ? 'border-indigo-500/50' : ''
              }`}>
                
                {/* Текстура металла */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>
                
                {/* LED индикатор */}
                <div className="w-16 h-2 rounded-full bg-black/80 mb-4 overflow-hidden border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,1)]">
                  <div 
                    className={`h-full bg-gradient-to-r from-indigo-600 to-purple-400 shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all ease-out ${
                      isIgniting ? 'w-full' : 'w-0'
                    }`}
                    style={{ transitionDuration: '1500ms' }}
                  ></div>
                </div>

                <div className="flex flex-col items-center relative z-10">
                  <Power 
                    size={32} 
                    className={`mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] transition-colors duration-300 ${
                      isIgniting ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`} 
                  />
                  <span className={`text-xs font-bold tracking-[0.25em] uppercase transition-colors duration-300 ${
                    isIgniting ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'
                  }`}>
                    Engine
                  </span>
                  <span className="text-[10px] text-slate-700 font-bold tracking-widest uppercase mt-1">
                    Start/Stop
                  </span>
                </div>
                
                {/* Отражение снизу */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-8 bg-white/5 blur-md rounded-t-full opacity-50"></div>
              </div>
            </div>
          </div>
        </button>

        <p className={`mt-12 text-slate-500 text-sm font-medium transition-opacity duration-500 ${
          isIgniting ? 'opacity-0' : 'opacity-100'
        }`}>
          НАЖМИ START
        </p>
      </div>
    </div>
  );
};

