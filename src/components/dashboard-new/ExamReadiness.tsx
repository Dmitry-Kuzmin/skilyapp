import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { playClickSound } from '@/services/audioService';
import { Info, Rocket, TrendingUp, Target, Award, Sparkles, AlertCircle, Activity, Brain, Calendar, Zap, Lock, Play } from 'lucide-react';
import { usePDDContext } from '@/contexts/PDDContext';
import { motion } from "@/components/optimized/Motion";
import { getReadinessStatus } from '@/utils/examReadiness';
import { EXAM_PASS_TARGET_PERCENT } from '@/lib/exam-config';
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
  studyProgress?: number;
  lifetimeAttempts?: number;
  onStartTest?: () => void;
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
  studyProgress,
  lifetimeAttempts,
  onStartTest,
  onTelemetryClick
}) => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';


  // Все уровни готовности с иконками и переводами
  const readinessLevels = useMemo(() => [
    {
      status: 'start' as const,
      range: '0-20%',
      title: t('dashboard.examReadiness.levels.start.title'),
      titleColor: 'text-red-400',
      description: t('dashboard.examReadiness.levels.start.desc'),
      icon: Rocket,
      color: '#ef4444',
      bgColor: 'bg-red-500/10',
    },
    {
      status: 'progress' as const,
      range: '21-50%',
      title: t('dashboard.examReadiness.levels.progress.title'),
      titleColor: 'text-orange-400',
      description: t('dashboard.examReadiness.levels.progress.desc'),
      icon: TrendingUp,
      color: '#f59e0b',
      bgColor: 'bg-orange-500/10',
    },
    {
      status: 'near' as const,
      range: '51-75%',
      title: t('dashboard.examReadiness.levels.near.title'),
      titleColor: 'text-yellow-400',
      description: t('dashboard.examReadiness.levels.near.desc'),
      icon: Target,
      color: '#eab308',
      bgColor: 'bg-yellow-500/10',
    },
    {
      status: 'ready' as const,
      range: '76-90%',
      title: t('dashboard.examReadiness.levels.ready.title'),
      titleColor: 'text-emerald-400',
      description: t('dashboard.examReadiness.levels.ready.desc'),
      icon: Award,
      color: '#10b981',
      bgColor: 'bg-emerald-500/10',
    },
    {
      status: 'legend' as const,
      range: '91-100%',
      title: t('dashboard.examReadiness.levels.legend.title'),
      titleColor: 'text-purple-400',
      description: t('dashboard.examReadiness.levels.legend.desc'),
      icon: Sparkles,
      color: '#a855f7',
      bgColor: 'bg-purple-500/10',
    },
  ], [t]);

  const hasNoData = averageScore === 0 && testsCompleted === 0 && (lifetimeAttempts ?? 0) < 10;

  const { selectedCountry } = usePDDContext();

  const { analytics, loading: analyticsLoading } = useAnalytics(
    profileId || null,
    averageScore,
    EXAM_PASS_TARGET_PERCENT,
    selectedCountry,
    language
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
      // Используем переданный статус, но берём label из i18n (не из Russian examReadiness.ts)
      readinessStatusValue = status;
      const levelData = readinessLevels.find(l => l.status === status);
      statusLabel = levelData?.title || statusText;
      shortLabel = levelData?.title || shortText || statusText;
      descriptionText = levelData?.description || description || '';

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

  // Для новых пользователей — запускаем случайный тест из 10 вопросов
  const handleFirstTest = useCallback(() => {
    playClickSound();
    const category = selectedCountry === 'spain' ? 'B' : 'B';
    const countryParam = selectedCountry === 'spain' ? '' : '&country=russia';
    navigate(`/test/practice?count=10${countryParam}&category=${category}`);
  }, [navigate, selectedCountry]);

  const toggleLevels = useCallback(() => {
    playClickSound();
    onTelemetryClick?.();
  }, [onTelemetryClick]);

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
      "backdrop-blur-md rounded-3xl xl:rounded-[2.5rem] p-5 md:p-6 xl:p-8 shadow-lg border flex flex-col relative group h-full overflow-hidden items-center justify-center"
    )}>
      {/* Hover overlay effect */}
      <div className={`absolute inset-0 ${hoverOverlayClass} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}></div>

      {/* Header with Info Icon */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleLevels}
          className={`w-8 h-8 rounded-full ${infoButtonClass} border flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95`}
        >
          <Info size={16} className={infoIconClass} />
        </button>
      </div>

      {/* Main Content - Gauge */}
      <div
        onClick={() => {
          if (onTelemetryClick) {
            playClickSound();
            onTelemetryClick();
          }
        }}
        className={cn(
          "relative w-full transition-all duration-500 opacity-100 scale-100 translate-y-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
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
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
            style={!hasNoData ? { filter: `drop-shadow(0 0 6px ${gaugeColor})` } : undefined}
          >
            <circle cx="50" cy="50" r="45" fill="none" stroke={isDarkTheme ? "#1e293b" : "#e2e8f0"} strokeWidth="8" strokeLinecap="round" />
            {!hasNoData && (
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={gaugeColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={283}
                strokeDashoffset={283 - (283 * score) / 100}
                className="transition-all duration-1000"
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

          {/* ── New user overlay — sits on top of the radar ── */}
          {hasNoData && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              onClick={handleFirstTest}
              className="absolute inset-2 rounded-full flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform"
              style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: isDarkTheme ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.72)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Play className="w-4 h-4 text-white fill-white translate-x-px" />
              </div>
              <div className="text-center px-3">
                <p className={`text-[11px] font-black leading-tight ${textPrimaryClass}`}>
                  {language === 'es' ? 'Primer test' : language === 'ru' ? 'Первый тест' : 'First test'}
                </p>
                <p className="text-[9px] text-slate-400 leading-tight mt-0.5">
                  {language === 'es' ? 'La IA calculará tu nivel' : language === 'ru' ? 'ИИ рассчитает прогноз' : 'AI will predict your score'}
                </p>
              </div>
              <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {language === 'es' ? '10 preguntas · 5 min' : language === 'ru' ? '10 вопросов · 5 мин' : '10 questions · 5 min'}
              </span>
            </motion.button>
          )}
        </div>

        {/* Study Progress Bar — visible for active users to show learning momentum */}
        {!hasNoData && studyProgress !== undefined && studyProgress > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="w-full mt-4 px-1"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'es' ? 'Material estudiado' : language === 'ru' ? 'Прогресс изучения' : 'Study progress'}
              </span>
              <span className={`text-[10px] font-bold ${
                studyProgress >= 86 ? 'text-emerald-400' :
                studyProgress >= 61 ? 'text-blue-400' :
                studyProgress >= 31 ? 'text-orange-400' : 'text-slate-400'
              }`}>
                {studyProgress}%
              </span>
            </div>
            <div className={`w-full h-1.5 rounded-full ${isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-200'} overflow-hidden`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${studyProgress}%` }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  studyProgress >= 86 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                  studyProgress >= 61 ? 'bg-gradient-to-r from-blue-500 to-indigo-400' :
                  studyProgress >= 31 ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                  'bg-gradient-to-r from-slate-500 to-slate-400'
                }`}
              />
            </div>
          </motion.div>
        )}

      </div>


    </div>
  );
});
