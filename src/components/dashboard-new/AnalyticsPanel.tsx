import React from 'react';
import { motion } from "@/components/optimized/Motion";
import { AlertCircle, TrendingUp, Activity, Brain, Calendar, Target, Zap, Clock } from 'lucide-react';
import type { TrendData, CriticalPoint } from '@/utils/analytics';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface AnalyticsPanelProps {
  trend: TrendData | null;
  consistency: { score: number; deviation: number; level: 'high' | 'medium' | 'low' } | null;
  timeToPass: { days: number; date: Date; confidence: 'high' | 'medium' | 'low' } | null;
  criticalPoint: CriticalPoint | null;
  focusBattery: { charge: number; level: 'high' | 'medium' | 'low'; message: string } | null;
  activityHeatmap: Array<{ date: Date; count: number; level: 0 | 1 | 2 | 3 | 4 }> | null;
  currentScore: number;
  loading?: boolean;
  showHeader?: boolean;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  trend,
  consistency,
  timeToPass,
  criticalPoint,
  focusBattery,
  activityHeatmap,
  currentScore,
  loading = false,
  showHeader = true,
}) => {
  const { t, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';

  if (loading || !trend || !consistency || !timeToPass) {
    return (
      <div className={cn(
        "flex-1 backdrop-blur-xl rounded-2xl p-4 border transition-colors duration-500",
        isDarkTheme ? "bg-slate-900/50 border-slate-700/50" : "bg-white border-slate-200"
      )}>
        <div className="h-full flex items-center justify-center">
          <div className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>
            {t('dashboard.analytics.loading')}
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className={cn(
      "flex-1 backdrop-blur-xl rounded-2xl p-4 border overflow-y-auto transition-colors duration-500",
      isDarkTheme ? "bg-slate-900/50 border-slate-700/50" : "bg-white border-slate-100"
    )}>
      <div className="space-y-4">
        {/* Header - опциональный */}
        {showHeader && (
          <div className="mb-4">
            <h3 className={cn(
              "text-xs font-bold uppercase tracking-wider mb-1",
              isDarkTheme ? "text-white" : "text-slate-900"
            )}>
              {t('dashboard.examReadiness.advancedTelemetryTitle')}
            </h3>
          </div>
        )}

        {/* Critical Point */}
        {criticalPoint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "backdrop-blur-sm rounded-xl p-3 border",
              isDarkTheme ? "bg-red-950/30 border-red-500/20" : "bg-red-50 border-red-100/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-red-400" />
              <span className={cn(
                "text-xs font-bold uppercase",
                isDarkTheme ? "text-white" : "text-slate-900"
              )}>{t('dashboard.analytics.criticalPoint.title')}</span>
            </div>
            <div className={cn(
              "text-sm font-bold mb-1",
              isDarkTheme ? "text-white" : "text-slate-900"
            )}>{criticalPoint.topic_title}</div>
            <div className={cn(
              "h-1.5 rounded-full overflow-hidden mb-1",
              isDarkTheme ? "bg-red-950/50" : "bg-red-100"
            )}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${criticalPoint.error_rate}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-red-500 to-pink-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              />
            </div>
            <div className="text-[10px] text-red-400">
              {t('dashboard.analytics.criticalPoint.stats', { errorRate: criticalPoint.error_rate, attempts: criticalPoint.attempts })}
            </div>
          </motion.div>
        )}

        {/* Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "backdrop-blur-sm rounded-xl p-3 border transition-colors",
            isDarkTheme ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200/50"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp
                size={14}
                className={trend.trend === 'positive' ? 'text-emerald-400' : trend.trend === 'negative' ? 'text-red-400' : (isDarkTheme ? 'text-slate-400' : 'text-slate-500')}
              />
              <span className={cn(
                "text-xs font-bold uppercase",
                isDarkTheme ? "text-white" : "text-slate-900"
              )}>{t('dashboard.analytics.trend.title')}</span>
            </div>
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded",
                trend.trend === 'positive'
                  ? (isDarkTheme ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                  : trend.trend === 'negative'
                    ? (isDarkTheme ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600')
                    : (isDarkTheme ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-200 text-slate-500')
              )}
            >
              {trend.trend === 'positive' ? t('dashboard.analytics.trend.positive') : trend.trend === 'negative' ? t('dashboard.analytics.trend.negative') : t('dashboard.analytics.trend.stable')}
            </span>
          </div>

          {/* Simple Trend Graph */}
          <div className={cn(
            "h-16 rounded-lg p-2 relative overflow-hidden transition-colors",
            isDarkTheme ? "bg-slate-900/50" : "bg-white border border-slate-100 shadow-sm"
          )}>
            {trend.points.length > 0 && (
              <svg className="w-full h-full" viewBox={`0 0 ${trend.points.length * 20} 60`} preserveAspectRatio="none">
                {/* Trend line */}
                <polyline
                  points={trend.points
                    .map((p, i) => `${i * 20},${60 - (p.y / 100) * 60}`)
                    .join(' ')}
                  fill="none"
                  stroke={trend.trend === 'positive' ? '#10b981' : trend.trend === 'negative' ? '#ef4444' : '#64748b'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Area under curve */}
                <polygon
                  points={`0,60 ${trend.points.map((p, i) => `${i * 20},${60 - (p.y / 100) * 60}`).join(' ')} ${trend.points.length * 20 - 20},60`}
                  fill={trend.trend === 'positive' ? 'url(#trendGradientPositive)' : trend.trend === 'negative' ? 'url(#trendGradientNegative)' : 'url(#trendGradientNeutral)'}
                  opacity="0.3"
                />
                <defs>
                  <linearGradient id="trendGradientPositive" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="trendGradientNegative" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="trendGradientNeutral" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        </motion.div>

        {/* Consistency Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "backdrop-blur-sm rounded-xl p-3 border transition-colors",
            isDarkTheme ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200/50"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity
              size={14}
              className={
                consistency.level === 'high'
                  ? 'text-emerald-400'
                  : consistency.level === 'medium'
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }
            />
            <span className={cn(
                "text-xs font-bold uppercase",
                isDarkTheme ? "text-white" : "text-slate-900"
              )}>{t('dashboard.analytics.consistency.title')}</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              "text-2xl font-bold",
              isDarkTheme ? "text-white" : "text-slate-900"
            )}>{consistency.score}%</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${consistency.level === 'high'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : consistency.level === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
            >
              {consistency.level === 'high' ? t('dashboard.analytics.consistency.high') : consistency.level === 'medium' ? t('dashboard.analytics.consistency.medium') : t('dashboard.analytics.consistency.low')}
            </span>
          </div>
          <div className={cn(
            "h-1.5 rounded-full overflow-hidden transition-colors",
            isDarkTheme ? "bg-slate-900/50" : "bg-slate-200"
          )}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${consistency.score}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full ${consistency.level === 'high'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : consistency.level === 'medium'
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                    : 'bg-gradient-to-r from-red-500 to-red-400'
                }`}
            />
          </div>
        </motion.div>

        {/* Time to Pass / ETA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-emerald-950/30 backdrop-blur-sm rounded-xl p-3 border border-emerald-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase">{t('dashboard.analytics.eta.title')}</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{t('dashboard.analytics.eta.days', { days: timeToPass.days })}</div>
          <div className="text-[10px] text-emerald-400">
            {t('dashboard.analytics.eta.desc')}
          </div>
          <div className="text-[9px] text-slate-500 mt-1">
            {formatDate(timeToPass.date)} ·{' '}
            {timeToPass.confidence === 'high' ? t('dashboard.analytics.eta.highConfidence') : timeToPass.confidence === 'medium' ? t('dashboard.analytics.eta.mediumConfidence') : t('dashboard.analytics.eta.lowConfidence')}
          </div>
        </motion.div>

        {/* Focus Battery */}
        {focusBattery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "backdrop-blur-sm rounded-xl p-3 border transition-colors",
              isDarkTheme ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Brain
                size={14}
                className={
                  focusBattery.level === 'high'
                    ? 'text-emerald-400'
                    : focusBattery.level === 'medium'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }
              />
              <span className={cn(
                "text-xs font-bold uppercase",
                isDarkTheme ? "text-white" : "text-slate-900"
              )}>{t('dashboard.analytics.focusBattery.title')}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "flex-1 h-2 rounded-full overflow-hidden transition-colors",
                isDarkTheme ? "bg-slate-900/50" : "bg-slate-200"
              )}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${focusBattery.charge}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full ${focusBattery.level === 'high'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : focusBattery.level === 'medium'
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                        : 'bg-gradient-to-r from-red-500 to-red-400'
                    }`}
                />
              </div>
              <span className={cn(
                "text-xs font-bold",
                isDarkTheme ? "text-white" : "text-slate-900"
              )}>{focusBattery.charge}%</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {t(`dashboard.analytics.focusBattery.messages.${focusBattery.level}`)}
            </div>
          </motion.div>
        )}

        {/* Activity Heatmap */}
        {activityHeatmap && activityHeatmap.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              "backdrop-blur-sm rounded-xl p-3 border transition-colors",
              isDarkTheme ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200/50"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} className={isDarkTheme ? "text-white" : "text-slate-600"} />
                <span className={cn(
                  "text-xs font-bold uppercase",
                  isDarkTheme ? "text-white" : "text-slate-900"
                )}>{t('dashboard.analytics.activity.title')}</span>
              </div>
              <span className="text-[9px] text-slate-500">{t('dashboard.analytics.activity.last30Days')}</span>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {activityHeatmap.slice(-30).map((day, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.01 }}
                  className={`aspect-square rounded ${day.level === 0
                      ? 'bg-slate-800/30'
                      : day.level === 1
                        ? 'bg-emerald-900/50'
                        : day.level === 2
                          ? 'bg-emerald-800/60'
                          : day.level === 3
                            ? 'bg-emerald-700/70'
                            : 'bg-emerald-600/80'
                    } border border-slate-700/30`}
                  title={`${formatDate(day.date)}: ${t('dashboard.analytics.activity.tests', { count: day.count })}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};


