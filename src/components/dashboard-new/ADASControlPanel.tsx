import React, { useMemo } from 'react';
import { Navigation, Gauge, EyeOff, AlertTriangle, Zap as Lightning } from 'lucide-react';

interface ADASControlPanelProps {
  stats: {
    averageScore: number;
    currentStreak: number;
    testsCompleted: number;
    accuracy: number;
  };
  readinessStatus?: {
    status: 'start' | 'progress' | 'near' | 'ready' | 'legend';
    statusText: string;
  };
}

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

export const ADASControlPanel: React.FC<ADASControlPanelProps> = ({ stats, readinessStatus }) => {
  const indicators = useMemo(() => {
    const laneAssistScore = clamp((Math.min(stats.currentStreak, 7) / 7) * 100);
    const laneAssistStatus =
      laneAssistScore >= 80 ? 'Полоса удерживается' : laneAssistScore >= 50 ? 'Подровняй курс' : 'Смещение!';

    const adaptiveCruiseScore = clamp(stats.averageScore);
    const adaptiveCruiseStatus =
      adaptiveCruiseScore >= 80 ? 'Автопилот удерживает темп' : adaptiveCruiseScore >= 60 ? 'Добавь тягу' : 'Нужно ускориться';

    const blindSpotScore = clamp(100 - (stats.accuracy || stats.averageScore));
    const blindSpotStatus =
      blindSpotScore <= 20 ? 'Слепые зоны чисты' : blindSpotScore <= 45 ? 'Проверь слабые темы' : 'Обнаружены пробелы!';

    const statusPriority: Record<NonNullable<typeof readinessStatus>['status'], number> = {
      start: 80,
      progress: 60,
      near: 40,
      ready: 20,
      legend: 10,
    };
    const collisionScore = readinessStatus ? clamp(statusPriority[readinessStatus.status]) : 50;
    const collisionStatus =
      collisionScore <= 25 ? 'Режим готовности' : collisionScore <= 50 ? 'Контролируй нагрузку' : 'Повышенная нагрузка!';

    return [
      {
        key: 'lane',
        title: 'Lane Assist',
        value: `${Math.round(laneAssistScore)}%`,
        status: laneAssistStatus,
        progress: laneAssistScore,
        accent: 'from-cyan-500/20 to-slate-900/40',
        icon: <Navigation className="w-4 h-4 text-cyan-300" />,
      },
      {
        key: 'cruise',
        title: 'Adaptive Cruise',
        value: `${Math.round(adaptiveCruiseScore)}%`,
        status: adaptiveCruiseStatus,
        progress: adaptiveCruiseScore,
        accent: 'from-indigo-500/20 to-slate-900/40',
        icon: <Gauge className="w-4 h-4 text-indigo-300" />,
      },
      {
        key: 'blind',
        title: 'Blind Spot',
        value: blindSpotScore <= 15 ? 'OK' : `${Math.round(blindSpotScore)}%`,
        status: blindSpotStatus,
        progress: 100 - blindSpotScore,
        accent: 'from-amber-500/20 to-slate-900/40',
        icon: <EyeOff className="w-4 h-4 text-amber-300" />,
      },
      {
        key: 'collision',
        title: 'Collision Warning',
        value: collisionScore <= 20 ? 'Safe' : `${Math.round(collisionScore)}%`,
        status: collisionStatus,
        progress: 100 - collisionScore,
        accent: 'from-rose-500/20 to-slate-900/40',
        icon: <AlertTriangle className="w-4 h-4 text-rose-300" />,
      },
    ];
  }, [stats, readinessStatus]);

  return (
    <div className="relative rounded-[2rem] bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-900/20 border border-slate-800/70 p-6 shadow-2xl shadow-slate-900/20 overflow-hidden">
      {/* ОПТИМИЗАЦИЯ: Используем <img> вместо background-image для лучшей производительности */}
      <img 
        src="/noise.svg" 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">ADAS CONTROL</p>
          <h3 className="text-xl font-semibold text-white mt-1">Системы ассистента</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
          <Lightning className="w-3.5 h-3.5 text-emerald-300" />
          Live
        </div>
      </div>

      <div className="space-y-4">
        {indicators.map((indicator) => (
          <div
            key={indicator.key}
            className="relative rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm p-3"
          >
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${indicator.accent} opacity-30`} />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                  {indicator.icon}
                  {indicator.title}
                </div>
                <div className="text-[11px] text-slate-300 uppercase tracking-[0.2em] mt-1">{indicator.status}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white leading-none">{indicator.value}</div>
                <div className="text-[10px] text-white/60 mt-1">Status</div>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-white via-white to-transparent"
                style={{ width: `${indicator.progress}%`, transition: 'width 0.6s ease' }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

