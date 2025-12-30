import { useNavigate } from 'react-router-dom';
import { Award, Target, BookOpen, TrendingUp, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExamReadiness } from '@/hooks/useExamReadiness';
import { useUserContext } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { motion } from "@/components/optimized/Motion";

/**
 * Компонент кругового прогресс-бара
 */
interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

function CircularProgress({ percent, size = 160, strokeWidth = 12, color = 'primary', className }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  
  const gradientId = `gradient-${color}-${size}`;
  
  // Определяем размер текста в зависимости от размера круга
  const textSize = size <= 120 ? 'text-2xl sm:text-3xl' : size <= 140 ? 'text-3xl sm:text-4xl' : 'text-4xl';
  
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {color === 'destructive' && (
              <>
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </>
            )}
            {color === 'orange' && (
              <>
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </>
            )}
            {color === 'emerald' && (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </>
            )}
            {color === 'purple' && (
              <>
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#9333ea" />
              </>
            )}
            {color === 'yellow' && (
              <>
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </>
            )}
            {color === 'slate' && (
              <>
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#475569" />
              </>
            )}
            {color === 'primary' && (
              <>
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" />
              </>
            )}
          </linearGradient>
          {/* Glow effect */}
          <filter id={`glow-${gradientId}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Background circle - более заметный на мобильных, особенно при 0% */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={size <= 120 ? "text-muted/40" : size <= 140 ? "text-muted/30" : "text-muted/20"}
        />
        {/* Дополнительный круг для лучшей видимости на мобильных при 0% */}
        {percent === 0 && size <= 120 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 2}
            stroke="currentColor"
            strokeWidth={1}
            fill="none"
            className="text-muted/20"
            strokeDasharray="4 4"
          />
        )}
        {/* Progress circle with glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out drop-shadow-lg"
          style={{ filter: `url(#glow-${gradientId})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className={cn('font-bold', textSize)}
            style={{ 
              color: color === 'purple'
                ? '#a855f7'
                : color === 'yellow'
                ? '#eab308'
                : color === 'slate'
                ? '#64748b'
                : color === 'orange' 
                ? '#f97316' 
                : color === 'emerald' 
                ? '#10b981' 
                : color === 'destructive'
                ? '#ef4444'
                : `hsl(var(--primary))`
            }}
          >
            {percent}%
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * Основной компонент карточки готовности к экзамену
 */
export function ExamReadinessCard() {
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { readiness, metrics, loading, error } = useExamReadiness(profileId);

  if (loading) {
    return (
      <Card className="p-6 gradient-card border-border/50">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <div className="text-muted-foreground">Загрузка данных...</div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 gradient-card border-border/50">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <div className="text-muted-foreground">
              Ошибка загрузки данных
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Обновить
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!readiness || !metrics) {
    return null; // Не показываем, если нет данных (но нет ошибки)
  }

  const { percent, status, statusText, shortText, description, color, recommendations } = readiness;

  // Определяем CTA кнопку в зависимости от статуса
  const getCTAAction = () => {
    if (status === 'ready' || status === 'legend') {
      return {
        text: 'Пройти пробный экзамен',
        onClick: () => navigate('/test/exam'),
        variant: 'default' as const,
      };
    } else if (status === 'near') {
      return {
        text: 'Улучшить слабые темы',
        onClick: () => navigate('/tests'),
        variant: 'default' as const,
      };
    } else {
      return {
        text: 'Продолжить обучение',
        onClick: () => navigate('/tests'),
        variant: 'outline' as const,
      };
    }
  };

  const cta = getCTAAction();

  // Цвета для статуса (5 уровней)
  const statusColors = {
    start: {
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/20',
      text: 'text-slate-500',
      icon: AlertCircle,
    },
    progress: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      text: 'text-orange-500',
      icon: TrendingUp,
    },
    near: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      text: 'text-yellow-500',
      icon: TrendingUp,
    },
    ready: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-500',
      icon: CheckCircle2,
    },
    legend: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-500',
      icon: Award,
    },
  };

  const statusColor = statusColors[status];
  const StatusIcon = statusColor.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden gradient-card border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
        {/* Premium background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl animate-pulse opacity-50" />
        
        <div className="relative p-4 sm:p-6">
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={cn('p-1.5 sm:p-2 rounded-lg sm:rounded-xl border', statusColor.bg, statusColor.border)}
              >
                <Award className={cn('w-4 h-4 sm:w-5 sm:h-5', statusColor.text)} />
              </motion.div>
              <div>
                <CardTitle className="text-lg sm:text-xl md:text-2xl">Готовность к экзамену</CardTitle>
                <CardDescription className="text-xs sm:text-sm hidden sm:block">
                  {readiness?.description || 'Проверь, насколько ты готов к сдаче теории'}
                </CardDescription>
              </div>
            </div>
            {/* Status badge - compact */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className={cn(
                'px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs sm:text-sm font-semibold flex items-center gap-1.5',
                statusColor.bg,
                statusColor.border,
                statusColor.text
              )}
            >
              <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{shortText || statusText}</span>
              <span className="sm:hidden">{percent}%</span>
            </motion.div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Круговой прогресс и метрики - компактная версия */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex-shrink-0"
              >
                <CircularProgress
                  percent={percent}
                  size={120}
                  strokeWidth={10}
                  color={color}
                  className="sm:hidden"
                />
                <CircularProgress
                  percent={percent}
                  size={140}
                  strokeWidth={12}
                  color={color}
                  className="hidden sm:block md:hidden"
                />
                <CircularProgress
                  percent={percent}
                  size={160}
                  strokeWidth={12}
                  color={color}
                  className="hidden md:block"
                />
              </motion.div>

              {/* Компактные метрики - в одну строку на мобильных */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex-1 w-full space-y-3 sm:space-y-4"
              >
                {/* Компактная версия метрик - как в верхних карточках статистики */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:bg-primary/15 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Target className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground truncate">Точность</span>
                    </div>
                    <p className="text-3xl font-bold text-primary">
                      {Math.round(metrics.accuracy * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ≥80%
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 hover:bg-secondary/15 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <BookOpen className="w-5 h-5 text-secondary flex-shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground truncate">Темы</span>
                    </div>
                    <p className="text-3xl font-bold text-secondary">
                      {Math.round(metrics.topicsCovered * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ≥70%
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground truncate">Тесты</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-500">
                      {metrics.testsCompleted}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ≥5
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 hover:bg-amber-500/15 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground truncate">Балл</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-500">
                      {Math.round(metrics.recentPerformance * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ≥75%
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Компактные рекомендации */}
            {recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="space-y-2 sm:space-y-3"
              >
                <h4 className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Что улучшить:
                </h4>
                <div className="space-y-2 sm:space-y-3">
                  {recommendations.slice(0, 3).map((rec, index) => {
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + index * 0.1, duration: 0.3 }}
                        className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 hover:border-primary/20 transition-all group"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 sm:mt-2 flex-shrink-0 group-hover:scale-150 transition-transform" />
                        <p className="text-sm sm:text-base text-foreground flex-1 leading-relaxed">
                          {rec}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* CTA кнопка */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.5 }}
              className="pt-2 sm:pt-4"
            >
              <Button
                onClick={cta.onClick}
                variant={cta.variant}
                size="lg"
                className="w-full text-sm sm:text-base h-10 sm:h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
              >
                {cta.text}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

