import React from 'react';
import { Maximize2 } from 'lucide-react';

export const SkilyChat: React.FC = () => {
  const handleExpand = () => {
    // Можно открыть чат или навигацию к AI ассистенту
    window.location.href = '/assistant';
  };

  return (
    <div 
      onClick={handleExpand}
      className="h-full bg-slate-800/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-lg border border-slate-700 flex flex-col justify-between group hover:border-slate-600 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex flex-col items-center justify-center flex-1 relative z-10">
        <div className="mb-8 transition-transform group-hover:scale-110 duration-700">
           <div className="relative w-36 h-36 flex items-center justify-center">
             <div className="absolute inset-0 rounded-full border-2 border-indigo-500 opacity-60 border-t-transparent border-b-transparent shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-spin-slow"></div>
             <div className="absolute inset-2 rounded-full border-2 border-purple-500 opacity-60 border-l-transparent border-r-transparent animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
             <div className="absolute inset-4 rounded-full border border-slate-400 opacity-30 animate-spin-slow"></div>
           </div>
        </div>

        <div className="text-center">
           <h3 className="font-bold text-white text-xl tracking-tight">AI Помощник</h3>
           <p className="text-xs text-slate-400 mt-2 font-medium">Интеллектуальный ассистент</p>
        </div>
      </div>

      <div className="relative z-10">
        <div className="w-full h-12 pl-5 pr-4 bg-slate-900/50 border border-slate-700 rounded-xl font-medium text-sm text-slate-400 flex items-center justify-between group-hover:bg-slate-900 group-hover:border-indigo-500/30 transition-all">
          <span>Задать вопрос...</span>
          <Maximize2 size={16} className="text-indigo-400" />
        </div>
      </div>
    </div>
  );
};

