import { useNavigate } from 'react-router-dom';
import { Award, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useExamReadiness } from '@/hooks/useExamReadiness';
import { useUserContext } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

/**
 * Компонент кругового прогресс-бара (мини-версия)
 */
interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

function CircularProgress({ percent, size = 120, strokeWidth = 10, color = 'primary', className }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  
  const gradientId = `gradient-widget-${color}`;
  
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
            {color === 'primary' && (
              <>
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" />
              </>
            )}
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        {/* Progress circle */}
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
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="text-3xl font-bold"
            style={{ 
              color: color === 'orange' 
                ? '#f97316' 
                : color === 'emerald' 
                ? '#10b981' 
                : color === 'destructive'
                ? '#ef4444'
                : `hsl(var(--primary))`
            }}
          >
            {percent}%
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Виджет готовности к экзамену для главной страницы
 */
export function ExamReadinessWidget() {
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { readiness, loading, error } = useExamReadiness(profileId);

  if (loading) {
    return (
      <Card className="p-4 gradient-card border-border/50">
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <div className="text-sm text-muted-foreground">Загрузка...</div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !readiness) {
    return null; // Не показываем виджет, если нет данных
  }

  const { percent, status, color } = readiness;

  const statusColors = {
    low: 'text-destructive',
    medium: 'text-orange-500',
    high: 'text-emerald-500',
  };

  const statusTexts = {
    low: 'Пока рано',
    medium: 'Почти готов',
    high: 'Готов!',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card 
        className="p-4 gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
        onClick={() => navigate('/tests')}
      >
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex-shrink-0"
          >
            <CircularProgress
              percent={percent}
              size={100}
              strokeWidth={8}
              color={color}
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex-1 min-w-0"
          >
            <div className="flex items-center gap-2 mb-1">
              <Award className={cn('w-4 h-4', statusColors[status])} />
              <h3 className="text-sm font-semibold text-foreground">Готовность к экзамену</h3>
            </div>
            <p className={cn('text-lg font-bold mb-1', statusColors[status])}>
              {percent}% — {statusTexts[status]}
            </p>
            <p className="text-xs text-muted-foreground">
              Нажмите, чтобы увидеть детали
            </p>
          </motion.div>

          <motion.div
            whileHover={{ x: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}

