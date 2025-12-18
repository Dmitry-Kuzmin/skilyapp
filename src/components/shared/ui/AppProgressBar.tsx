/**
 * Универсальная полоска прогресса
 * Используется везде: тесты, дуэли, игры, обучение
 * 
 * Изменения здесь применяются ВЕЗДЕ
 */

import { cn } from '@/lib/utils';

export interface AppProgressBarProps {
  /**
   * Текущее значение (например, 15)
   */
  current: number;
  
  /**
   * Максимальное значение (например, 20)
   */
  total: number;
  
  /**
   * Вариант отображения
   */
  variant?: 'default' | 'timer' | 'compact';
  
  /**
   * Показывать ли текст (15/20)
   */
  showLabel?: boolean;
  
  /**
   * Кастомный лейбл
   */
  label?: string;
  
  /**
   * Цвет прогресса (для разных режимов)
   */
  color?: 'primary' | 'success' | 'warning' | 'danger';
  
  className?: string;
}

/**
 * Универсальная полоска прогресса
 * 
 * Использование:
 * ```tsx
 * <AppProgressBar current={15} total={20} showLabel />
 * <AppProgressBar current={120} total={300} variant="timer" color="warning" />
 * ```
 */
export function AppProgressBar({
  current,
  total,
  variant = 'default',
  showLabel = false,
  label,
  color = 'primary',
  className,
}: AppProgressBarProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const textColorClasses = {
    primary: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Лейбл */}
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2">
          <span className={cn(
            "text-sm font-medium",
            textColorClasses[color]
          )}>
            {label || `${current}/${total}`}
          </span>
          {variant === 'timer' && (
            <span className={cn(
              "text-sm font-medium",
              textColorClasses[color]
            )}>
              {Math.floor(current / 60)}:{(current % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      )}

      {/* Полоска прогресса */}
      <div className={cn(
        "w-full rounded-full overflow-hidden",
        variant === 'compact' ? "h-1.5" : "h-2",
        "bg-muted"
      )}>
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            colorClasses[color],
            variant === 'timer' && percentage < 20 && "bg-red-500",
            variant === 'timer' && percentage >= 20 && percentage < 50 && "bg-yellow-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}


