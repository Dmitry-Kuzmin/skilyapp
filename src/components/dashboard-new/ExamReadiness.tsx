import React, { useMemo } from 'react';

interface ExamReadinessProps {
  averageScore: number;
}

export const ExamReadiness = React.memo<ExamReadinessProps>(({ averageScore }) => {
  const { score, isReady } = useMemo(() => ({
    score: averageScore,
    isReady: averageScore >= 90,
  }), [averageScore]);
  
  return (
    <div className="h-full bg-slate-800/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-lg border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-slate-600 transition-colors">
       <div className="text-center mb-6 relative z-10">
         <h3 className="font-bold text-white">Вероятность DGT</h3>
         <p className="text-xs text-slate-400">AI Prediction Model</p>
       </div>

       <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Outer Radar Circles */}
          <div className="absolute inset-0 rounded-full border border-slate-700/50"></div>
          <div className="absolute inset-4 rounded-full border border-slate-700/50"></div>
          <div className="absolute inset-8 rounded-full border border-slate-700/50"></div>
          
          {/* Scanning Radar Line */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent via-transparent to-indigo-500/10 animate-spin-slow"></div>
          <div className="absolute top-1/2 left-1/2 w-[50%] h-[2px] bg-gradient-to-r from-transparent to-indigo-500 origin-left animate-spin-slow"></div>

          {/* The Gauge */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
             <circle 
               cx="50" cy="50" r="45" fill="none" 
               stroke={isReady ? '#10b981' : '#6366f1'} 
               strokeWidth="8" 
               strokeLinecap="round"
               strokeDasharray={283}
               strokeDashoffset={283 - (283 * score) / 100}
               className="transition-all duration-1000 shadow-[0_0_20px_currentColor]"
             />
          </svg>

          <div className="absolute flex flex-col items-center">
             <span className={`text-4xl font-extrabold tracking-tighter ${isReady ? 'text-emerald-400' : 'text-indigo-400'}`}>
               {score}%
             </span>
             <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
               {isReady ? 'ГОТОВ' : 'В ПРОЦЕССЕ'}
             </span>
          </div>
       </div>
    </div>
  );
});

