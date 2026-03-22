import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { playClickSound } from '@/services/audioService';
import { Info, X, Rocket, TrendingUp, Target, Award, Sparkles, AlertCircle, Activity, Brain, Calendar, Zap, Lock } from 'lucide-react';
import { usePDDContext } from '@/contexts/PDDContext';
import { motion } from "@/components/optimized/Motion";
import { getReadinessStatus } from '@/utils/examReadiness';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsPanel } from './AnalyticsPanel';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ExamReadinessProps {
  averageScore: number;
  testsCompleted?: number;
  statusText?: string;
  shortText?: string;
  description?: string;
  status?: 'start' | 'progress' | 'near' | 'ready' | 'legend';
  profileId?: string | null;
  licensePoints?: number;
  onStartTest?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  onTelemetryClick?: () => void;
}


export const ExamReadiness = React.memo<ExamReadinessProps>(({
  averageScore,
  testsCompleted = 0,
  statusText,
  shortText,
  description,
  status,
  profileId,
  licensePoints = 8,
  onStartTest,
  onExpandedChange,
  onTelemetryClick
}) => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';
  const [showLevels, setShowLevels] = useState(false);

  // Все уровни готовности с иконками и переводами
  const readinessLevels = useMemo(() => [
    {
      status: 'start' as const,
      range: '0-30%',
      title: t('dashboard.examReadiness.levels.start.title'),
      titleColor: 'text-red-400',
      description: t('dashboard.examReadiness.levels.start.desc'),
      icon: Rocket,
      color: '#ef4444',
      bgColor: 'bg-red-500/10',
    },
    {
      status: 'progress' as const,
      range: '31-70%',
      title: t('dashboard.examReadiness.levels.progress.title'),
      titleColor: 'text-orange-400',
      description: t('dashboard.examReadiness.levels.progress.desc'),
      icon: TrendingUp,
      color: '#f59e0b',
      bgColor: 'bg-orange-500/10',
    },
    {
      status: 'near' as const,
      range: '71-84%',
      title: t('dashboard.examReadiness.levels.near.title'),
      titleColor: 'text-yellow-400',
      description: t('dashboard.examReadiness.levels.near.desc'),
      icon: Target,
      color: '#eab308',
      bgColor: 'bg-yellow-500/10',
    },
    {
      status: 'ready' as const,
      range: '85-95%',
      title: t('dashboard.examReadiness.levels.ready.title'),
      titleColor: 'text-emerald-400',
      description: t('dashboard.examReadiness.levels.ready.desc'),
      icon: Award,
      color: '#10b981',
      bgColor: 'bg-emerald-500/10',
    },
    {
      status: 'legend' as const,
      range: '96-100%',
      title: t('dashboard.examReadiness.levels.legend.title'),
      titleColor: 'text-purple-400',
      description: t('dashboard.examReadiness.levels.legend.desc'),
      icon: Sparkles,
      color: '#a855f7',
      bgColor: 'bg-purple-500/10',
    },
  ], [t]);

  const hasNoData = averageScore === 0 && testsCompleted === 0;

  const { selectedCountry } = usePDDContext();
  const TARGET_READINESS_SCORE = 85;

  // Загружаем аналитические данные
  const { analytics, loading: analyticsLoading } = useAnalytics(
    profileId || null,
    averageScore,
    TARGET_READINESS_SCORE, // Целевой уровень 85%
    selectedCountry
  );

  const { score, statusInfo, gaugeColor, textColor, bgColor, fullDescription, currentLevelIndex } = useMemo(() => {
    // ВАЖНО: Используем averageScore из пропсов (это рассчитанная Readiness Percent по формуле),
    // если она есть. analytics.averageScore - это просто средняя точность, она не учитывает объем тестов.
    const effectiveScore = averageScore;
    const scoreValue = Math.min(100, Math.max(0, Math.round(effectiveScore || 0)));

    // Используем getReadinessStatus для определения статуса
    // ВАЖНО: Если у нас есть analytics (загрузился), мы игнорируем переданный глобальный status,
    // чтобы использовать локально рассчитанный статус на основе filtered данных
    const shouldUseLocalStatus = !!analytics;
    const readinessStatus = (status && !shouldUseLocalStatus) ? null : getReadinessStatus(scoreValue);

    // Определяем индекс текущего уровня
    let currentIndex = 0;
    if (scoreValue === 0) currentIndex = 0;
    else if (scoreValue <= 30) currentIndex = 0;
    else if (scoreValue <= 70) currentIndex = 1;
    else if (scoreValue <= 84) currentIndex = 2;
    else if (scoreValue <= 95) currentIndex = 3;
    else currentIndex = 4;

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
      statusLabel = t('dashboard.examReadiness.noData.statusLabel');
      shortLabel = t('dashboard.examReadiness.noData.shortLabel');
      descriptionText = t('dashboard.examReadiness.noData.description');
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
      currentLevelIndex: currentIndex,
    };
  }, [averageScore, status, statusText, shortText, description, hasNoData]);

  // ОПТИМИЗАЦИЯ: Мемоизируем обработчики событий для предотвращения лишних ре-рендеров
  const handleStartTest = useCallback(() => {
    playClickSound();
    if (onStartTest) {
      onStartTest();
    } else {
      navigate('/tests');
    }
  }, [onStartTest, navigate]);

  const toggleLevels = useCallback(() => {
    playClickSound();
    const newState = !showLevels;
    setShowLevels(newState);
    onExpandedChange?.(newState);
  }, [showLevels, onExpandedChange]);

  // Цветовые классы для светлой и темной темы
  const containerClass = isDarkTheme
    ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
    : 'bg-white/95 border-slate-200/80 hover:border-slate-300 shadow-[0_20px_45px_rgba(0,0,0,0.08)]';
  const textPrimaryClass = isDarkTheme ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const textTertiaryClass = isDarkTheme ? 'text-slate-500' : 'text-slate-500';
  const infoButtonClass = isDarkTheme
    ? 'bg-slate-700/50 hover:bg-slate-700 border-slate-600/50 hover:border-indigo-500/50'
    : 'bg-slate-100/80 hover:bg-slate-200 border-slate-200/60 hover:border-indigo-400/60';
  const infoIconClass = isDarkTheme ? 'text-slate-300' : 'text-slate-600';
  const radarCircleClass = isDarkTheme ? 'border-slate-700/50' : 'border-slate-300/60';
  const radarLineClass = isDarkTheme ? 'from-indigo-500/10' : 'from-indigo-500/20';
  const progressLineClass = isDarkTheme ? 'bg-slate-700/50' : 'bg-slate-300/60';
  const levelDotBorderClass = isDarkTheme ? 'border-slate-700/30' : 'border-slate-300/50';
  const levelDotBgClass = isDarkTheme ? 'bg-slate-600' : 'bg-slate-400';
  const levelTitleClass = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const levelRangeClass = isDarkTheme ? 'text-slate-500' : 'text-slate-500';
  const levelDescClass = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const sectionTitleClass = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
  const hoverOverlayClass = isDarkTheme
    ? 'bg-gradient-to-b from-indigo-500/5 to-transparent'
    : 'bg-gradient-to-b from-indigo-500/10 to-transparent';

  return (
    <div className={cn(
      "transition-all duration-500",
      containerClass,
      "backdrop-blur-md rounded-3xl xl:rounded-[2.5rem] p-5 md:p-6 xl:p-8 shadow-lg border flex flex-col relative group",
      showLevels && isMobile ? "h-auto overflow-visible" : "h-full overflow-hidden",
      showLevels ? 'items-start justify-start' : 'items-center justify-center'
    )}>
      {/* Hover overlay effect */}
      <div className={`absolute inset-0 ${hoverOverlayClass} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}></div>

      {/* Header with Info Icon */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleLevels}
          className={`w-8 h-8 rounded-full ${infoButtonClass} border flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95`}
        >
          {showLevels ? (
            <X size={16} className={infoIconClass} />
          ) : (
            <Info size={16} className={infoIconClass} />
          )}
        </button>
      </div>

      {/* Main Content - Gauge */}
      <div
        onClick={() => {
          if (!showLevels && onTelemetryClick) {
            playClickSound();
            onTelemetryClick();
          }
        }}
        className={cn(
          "relative w-full transition-all duration-500",
          showLevels && isMobile ? "hidden" : "block",
          showLevels ? 'opacity-0 scale-95 -translate-y-4 pointer-events-none' : 'opacity-100 scale-100 translate-y-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
        )}
      >
        <div className="text-center mb-6 relative z-10">
          <h3 className={`font-bold ${textPrimaryClass} mb-1`}>
            {t('dashboard.examReadiness.title')}
          </h3>
          <p className={`text-xs ${textSecondaryClass}`}>
            {t('dashboard.examReadiness.aiPredict')}
          </p>
        </div>

        <div className="relative w-48 h-48 mx-auto flex items-center justify-center mb-4">
          {/* Outer Radar Circles */}
          <div className={`absolute inset-0 rounded-full border ${radarCircleClass}`}></div>
          <div className={`absolute inset-4 rounded-full border ${radarCircleClass}`}></div>
          <div className={`absolute inset-8 rounded-full border ${radarCircleClass}`}></div>

          {/* Scanning Radar Line */}
          {!hasNoData && (
            <>
              <div className={`absolute inset-0 rounded-full bg-gradient-to-b from-transparent via-transparent ${radarLineClass} animate-spin-slow`}></div>
              <div className={`absolute top-1/2 left-1/2 w-[50%] h-[2px] bg-gradient-to-r from-transparent ${isDarkTheme ? 'to-indigo-500' : 'to-indigo-600'} origin-left animate-spin-slow`}></div>
            </>
          )}

          {/* The Gauge */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke={isDarkTheme ? "#1e293b" : "#e2e8f0"} strokeWidth="8" strokeLinecap="round" />
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

      </div>

      {/* Levels Panel - плавное появление с Split View */}
      <div className={cn(
        "transition-all duration-500 w-full",
        showLevels ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
        isMobile && showLevels ? "relative" : "absolute inset-0 p-4 sm:p-6"
      )}>
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Title */}
          <div className="mb-4 relative z-10 flex items-center justify-between flex-shrink-0">
            <h3 className={`font-bold ${textPrimaryClass} text-base sm:text-lg`}>{t('dashboard.examReadiness.telemetryTitle')}</h3>
          </div>

          {/* Split View: Levels (Left) + Analytics (Right) */}
          <div className="flex-1 flex flex-col xl:flex-row gap-6 md:gap-8 min-h-0">
            {/* Left Side: Levels */}
            <div className="flex flex-col w-full xl:w-[50%] xl:min-w-[340px] xl:max-w-[450px] min-h-0">
              <div className="mb-4">
                <h4 className={`text-xs font-bold ${sectionTitleClass} uppercase tracking-wider`}>
                  {t('dashboard.examReadiness.levelsTitle')}
                </h4>
              </div>

              {/* Levels List with Progress Line */}
              <div className="flex-1 relative pr-2 min-h-0 overflow-y-auto custom-scrollbar pb-6">
                {/* Vertical Progress Line (background) */}
                <div className={`absolute left-4 top-2 bottom-8 w-0.5 ${progressLineClass}`}></div>

                {/* Active Progress Line */}
                {!hasNoData && currentLevelIndex > 0 && (
                  <div
                    className="absolute left-4 top-2 w-0.5 transition-all duration-1000 ease-out z-10"
                    style={{
                      height: `${(currentLevelIndex / (readinessLevels.length - 1)) * (100 - 15)}%`,
                      background: `linear-gradient(to bottom, ${gaugeColor}60, ${gaugeColor}40)`,
                    }}
                  />
                )}

                {/* Levels Container */}
                <div className="relative space-y-6 sm:space-y-8 py-2">
                  {readinessLevels.map((level, index) => {
                    const isActive = index === currentLevelIndex && !hasNoData;

                    return (
                      <motion.div
                        key={level.status}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: showLevels ? 1 : 0,
                          x: showLevels ? 0 : -20
                        }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                        className="relative flex items-start gap-4 sm:gap-5"
                      >
                        {/* Dot on Progress Line */}
                        <div className="relative z-20 flex-shrink-0 flex items-center pt-1">
                          <div
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-all duration-500 flex items-center justify-center relative ${isActive
                              ? `bg-slate-900 border-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.4)] scale-110`
                              : `bg-slate-900 ${levelDotBorderClass}`
                              }`}
                          >
                            <div
                              className={`rounded-full transition-all duration-500 ${isActive
                                ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 bg-orange-500'
                                : `w-2 h-2 sm:w-2.5 sm:h-2.5 ${levelDotBgClass}`
                                }`}
                            />

                            {isActive && (
                              <motion.div
                                animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-full bg-orange-500/30"
                              />
                            )}
                          </div>
                        </div>

                        {/* Level Content */}
                        <div className={`flex-1 transition-all duration-300 flex flex-col ${isActive ? 'opacity-100 translate-x-1' : 'opacity-40'}`}>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-sm sm:text-base font-black uppercase tracking-tight ${level.titleColor}`}>
                              {level.title}
                            </span>
                            <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${level.bgColor} ${level.titleColor} font-bold`}>
                              {level.range}
                            </span>
                          </div>
                          <p className={`text-xs sm:text-sm ${levelDescClass} leading-snug max-w-[320px]`}>
                            {level.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Side: Analytics */}
            <div className="flex flex-col flex-1 min-h-0 w-full xl:min-w-0">
              <div className="mb-4">
                <h4 className={`text-xs font-bold ${textPrimaryClass} uppercase tracking-wider`}>
                  {t('dashboard.examReadiness.advancedTelemetryTitle')}
                </h4>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6 pr-1">
                <AnalyticsPanel
                  trend={analytics?.trend || null}
                  consistency={analytics?.consistency || null}
                  timeToPass={analytics?.timeToPass || null}
                  criticalPoint={analytics?.criticalPoint || null}
                  focusBattery={analytics?.focusBattery || null}
                  activityHeatmap={analytics?.activityHeatmap || null}
                  currentScore={score}
                  loading={analyticsLoading}
                  showHeader={false}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});
