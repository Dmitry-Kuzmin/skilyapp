import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playClickSound } from '@/services/audioService';
import { Info, X } from 'lucide-react';
import { getReadinessStatus } from '@/utils/examReadiness';

interface ExamReadinessProps {
  averageScore: number;
  testsCompleted?: number;
  statusText?: string;
  shortText?: string;
  description?: string;
  status?: 'start' | 'progress' | 'near' | 'ready' | 'legend';
  onStartTest?: () => void;
}

export const ExamReadiness = React.memo<ExamReadinessProps>(({ 
  averageScore, 
  testsCompleted = 0,
  statusText,
  shortText,
  description,
  status,
  onStartTest 
}) => {
  const navigate = useNavigate();
  const [showDescription, setShowDescription] = useState(false);
  
  const hasNoData = averageScore === 0 && testsCompleted === 0;
  
  const { score, statusInfo, gaugeColor, textColor, bgColor, fullDescription } = useMemo(() => {
    const scoreValue = Math.round(averageScore);
    
    // Используем getReadinessStatus для определения статуса
    const readinessStatus = status ? null : getReadinessStatus(scoreValue);
    
    // Определяем статус готовности с поддержкой 5 уровней
    let readinessStatusValue: 'start' | 'progress' | 'near' | 'ready' | 'legend' = 'start';
    let statusLabel = statusText || '';
    let shortLabel = shortText || '';
    let descriptionText = description || '';
    let color = '#64748b';
    let textColorClass = 'text-slate-400';
    let bgColorClass = 'bg-slate-500/20';
    
    if (hasNoData) {
      readinessStatusValue = 'start';
      statusLabel = 'Нет данных. Пройди свой первый тест, чтобы начать отслеживать прогресс.';
      shortLabel = 'Начни обучение';
      descriptionText = 'Ты только присоединился к платформе. Пройди первый тест, чтобы система могла оценить твою текущую готовность и составить персональный план обучения.';
      color = '#64748b';
      textColorClass = 'text-slate-400';
      bgColorClass = 'bg-slate-500/20';
    } else if (status && statusText) {
      // Используем переданный статус и текст из системы
      readinessStatusValue = status;
      statusLabel = statusText;
      shortLabel = shortText || statusText;
      descriptionText = description || '';
      
      // Цвета для каждого уровня
      switch (status) {
        case 'legend':
          color = '#a855f7';
          textColorClass = 'text-purple-400';
          bgColorClass = 'bg-purple-500/20';
          break;
        case 'ready':
          color = '#10b981';
          textColorClass = 'text-emerald-400';
          bgColorClass = 'bg-emerald-500/20';
          break;
        case 'near':
          color = '#eab308';
          textColorClass = 'text-yellow-400';
          bgColorClass = 'bg-yellow-500/20';
          break;
        case 'progress':
          color = '#f59e0b';
          textColorClass = 'text-orange-400';
          bgColorClass = 'bg-orange-500/20';
          break;
        case 'start':
        default:
          color = '#64748b';
          textColorClass = 'text-slate-400';
          bgColorClass = 'bg-slate-500/20';
          break;
      }
    } else if (readinessStatus) {
      // Используем автоматически рассчитанный статус
      readinessStatusValue = readinessStatus.status;
      statusLabel = readinessStatus.statusText;
      shortLabel = readinessStatus.shortText;
      descriptionText = readinessStatus.description;
      
      // Цвета для каждого уровня
      switch (readinessStatus.status) {
        case 'legend':
          color = '#a855f7';
          textColorClass = 'text-purple-400';
          bgColorClass = 'bg-purple-500/20';
          break;
        case 'ready':
          color = '#10b981';
          textColorClass = 'text-emerald-400';
          bgColorClass = 'bg-emerald-500/20';
          break;
        case 'near':
          color = '#eab308';
          textColorClass = 'text-yellow-400';
          bgColorClass = 'bg-yellow-500/20';
          break;
        case 'progress':
          color = '#f59e0b';
          textColorClass = 'text-orange-400';
          bgColorClass = 'bg-orange-500/20';
          break;
        case 'start':
        default:
          color = '#64748b';
          textColorClass = 'text-slate-400';
          bgColorClass = 'bg-slate-500/20';
          break;
      }
    }
    
    return {
      score: scoreValue,
      statusInfo: {
        status: readinessStatusValue,
        label: statusLabel,
        shortLabel: shortLabel,
      },
      gaugeColor: color,
      textColor: textColorClass,
      bgColor: bgColorClass,
      fullDescription: descriptionText,
    };
  }, [averageScore, status, statusText, shortText, description, hasNoData]);
  
  const handleStartTest = () => {
    playClickSound();
    if (onStartTest) {
      onStartTest();
    } else {
      navigate('/tests');
    }
  };
  
  return (
    <div className="h-full bg-slate-800/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-lg border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-slate-600 transition-colors">
       <div className="text-center mb-6 relative z-10 w-full">
         <h3 className="font-bold text-white mb-1">Готовность к экзамену</h3>
         <p className="text-xs text-slate-400">AI Prediction Model</p>
       </div>

       <div className="relative w-48 h-48 flex items-center justify-center mb-4">
          {/* Outer Radar Circles */}
          <div className="absolute inset-0 rounded-full border border-slate-700/50"></div>
          <div className="absolute inset-4 rounded-full border border-slate-700/50"></div>
          <div className="absolute inset-8 rounded-full border border-slate-700/50"></div>
          
          {/* Scanning Radar Line */}
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
               {statusInfo.shortLabel}
             </div>
          </div>
       </div>

       {/* Кнопка с информацией */}
       <div className="relative z-10 w-full flex flex-col gap-2">
         {hasNoData ? (
           <button
             onClick={handleStartTest}
             className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
           >
             Пройти первый тест
           </button>
         ) : (
           <>
             <button
               onClick={() => setShowDescription(!showDescription)}
               className="w-full py-2 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2"
             >
               <Info size={14} />
               {showDescription ? 'Скрыть подробности' : 'Что это значит?'}
             </button>
             
             {showDescription && (
               <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-300 space-y-2 animate-fade-in">
                 <div className="font-semibold text-white mb-2">{statusInfo.label}</div>
                 <div className="leading-relaxed">{fullDescription}</div>
               </div>
             )}
             
             <p className="text-xs text-slate-500 text-center mt-1">
               Пройдено тестов: {testsCompleted}
             </p>
           </>
         )}
       </div>
    </div>
  );
});
