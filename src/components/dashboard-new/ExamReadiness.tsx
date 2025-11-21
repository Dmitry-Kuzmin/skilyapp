import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { sounds } from '@/lib/sounds';

interface ExamReadinessProps {
  averageScore: number;
  testsCompleted?: number;
  statusText?: string;
  status?: 'low' | 'medium' | 'high';
  onStartTest?: () => void;
}

export const ExamReadiness = React.memo<ExamReadinessProps>(({ 
  averageScore, 
  testsCompleted = 0,
  statusText,
  status,
  onStartTest 
}) => {
  const navigate = useNavigate();
  
  const hasNoData = averageScore === 0 && testsCompleted === 0;
  
  const { score, statusInfo, gaugeColor, textColor, bgColor } = useMemo(() => {
    const scoreValue = Math.round(averageScore);
    
    // Определяем статус готовности
    let readinessStatus: 'low' | 'medium' | 'high' = status || 'low';
    let statusLabel = statusText || '';
    let color = '#6366f1'; // indigo по умолчанию
    let textColorClass = 'text-indigo-400';
    let bgColorClass = 'bg-indigo-500/20';
    
    if (hasNoData) {
      readinessStatus = 'low';
      statusLabel = 'Нет данных';
      color = '#64748b'; // slate
      textColorClass = 'text-slate-400';
      bgColorClass = 'bg-slate-500/20';
    } else if (status && statusText) {
      // Используем переданный статус и текст из системы
      if (status === 'high') {
        color = '#10b981'; // emerald
        textColorClass = 'text-emerald-400';
        bgColorClass = 'bg-emerald-500/20';
      } else if (status === 'medium') {
        color = '#f59e0b'; // orange
        textColorClass = 'text-orange-400';
        bgColorClass = 'bg-orange-500/20';
      } else {
        color = '#ef4444'; // red
        textColorClass = 'text-red-400';
        bgColorClass = 'bg-red-500/20';
      }
      statusLabel = statusText; // Используем текст из системы
    } else {
      // Вычисляем статус на основе процента (соответствует системе: <= 50, 51-75, > 75)
      if (scoreValue > 75) {
        readinessStatus = 'high';
        color = '#10b981';
        textColorClass = 'text-emerald-400';
        bgColorClass = 'bg-emerald-500/20';
        statusLabel = 'Готов к экзамену!';
      } else if (scoreValue > 50) {
        readinessStatus = 'medium';
        color = '#f59e0b';
        textColorClass = 'text-orange-400';
        bgColorClass = 'bg-orange-500/20';
        statusLabel = 'Почти готов — подтяни слабые темы';
      } else {
        readinessStatus = 'low';
        color = '#ef4444';
        textColorClass = 'text-red-400';
        bgColorClass = 'bg-red-500/20';
        statusLabel = 'Пока рано идти на экзамен';
      }
    }
    
    return {
      score: scoreValue,
      statusInfo: {
        status: readinessStatus,
        label: statusLabel,
      },
      gaugeColor: color,
      textColor: textColorClass,
      bgColor: bgColorClass,
    };
  }, [averageScore, status, statusText, hasNoData]);
  
  const handleStartTest = () => {
    sounds.click(1000, 0.2);
    if (onStartTest) {
      onStartTest();
    } else {
      navigate('/tests');
    }
  };
  
  return (
    <div className="h-full bg-slate-800/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-lg border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-slate-600 transition-colors">
       <div className="text-center mb-6 relative z-10">
         <h3 className="font-bold text-white mb-1">Готовность к экзамену</h3>
         <p className="text-xs text-slate-400">AI Prediction Model</p>
       </div>

       <div className="relative w-48 h-48 flex items-center justify-center mb-4">
          {/* Outer Radar Circles */}
          <div className="absolute inset-0 rounded-full border border-slate-700/50"></div>
          <div className="absolute inset-4 rounded-full border border-slate-700/50"></div>
          <div className="absolute inset-8 rounded-full border border-slate-700/50"></div>
          
          {/* Scanning Radar Line (только если есть данные) */}
          {!hasNoData && (
            <>
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent via-transparent to-indigo-500/10 animate-spin-slow"></div>
              <div className="absolute top-1/2 left-1/2 w-[50%] h-[2px] bg-gradient-to-r from-transparent to-indigo-500 origin-left animate-spin-slow"></div>
            </>
          )}

          {/* The Gauge */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
             {!hasNoData && (
               <circle 
                 cx="50" cy="50" r="45" fill="none" 
                 stroke={gaugeColor}
                 strokeWidth="8" 
                 strokeLinecap="round"
                 strokeDasharray={283}
                 strokeDashoffset={283 - (283 * score) / 100}
                 className="transition-all duration-1000 shadow-[0_0_20px_currentColor]"
               />
             )}
          </svg>

          <div className="absolute flex flex-col items-center justify-center px-2 w-full max-w-[160px]">
             <span className={`text-4xl font-extrabold tracking-tighter ${textColor} mb-1.5`}>
               {score}%
             </span>
             <div 
               className={`text-[8px] md:text-[9px] leading-[1.2] font-bold uppercase tracking-tight px-2 py-1 rounded-full ${bgColor} ${textColor} text-center`}
               style={{ 
                 maxWidth: '100%',
                 wordWrap: 'break-word',
                 overflowWrap: 'break-word',
                 hyphens: 'auto',
                 display: 'inline-block'
               }}
             >
               {statusInfo.label}
             </div>
          </div>
       </div>

       {/* Кнопка или текст для нового пользователя */}
       {hasNoData ? (
         <button
           onClick={handleStartTest}
           className="relative z-10 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
         >
           Пройти первый тест
         </button>
       ) : (
         <p className="text-xs text-slate-500 text-center relative z-10 mt-2">
           Пройдено тестов: {testsCompleted}
         </p>
       )}
    </div>
  );
});

