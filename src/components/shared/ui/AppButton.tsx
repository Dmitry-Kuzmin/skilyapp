/**
 * Универсальная кнопка приложения
 * Единый дизайн для всех кнопок: меню, тесты, дуэли, игры
 * 
 * Изменения здесь применяются ВЕЗДЕ
 */

import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface AppButtonProps extends ButtonProps {
  /**
   * Вариант кнопки для разных контекстов
   */
  context?: 'default' | 'primary' | 'success' | 'danger' | 'ghost';
}

/**
 * Универсальная кнопка приложения
 * 
 * Использование:
 * ```tsx
 * <AppButton context="primary">Начать тест</AppButton>
 * <AppButton context="success">Продолжить</AppButton>
 * ```
 */
export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ context = 'default', className, variant, ...props }, ref) => {
    // Маппинг context на variant для единообразия
    const mappedVariant = variant || (
      context === 'primary' ? 'default' :
      context === 'success' ? 'success' :
      context === 'danger' ? 'destructive' :
      context === 'ghost' ? 'ghost' :
      'outline'
    );

    return (
      <Button
        ref={ref}
        variant={mappedVariant}
        className={cn(
          // Единые стили для всех кнопок
          "transition-all duration-200",
          "font-semibold",
          "shadow-sm hover:shadow-md",
          "active:scale-[0.98]",
          className
        )}
        {...props}
      />
    );
  }
);

AppButton.displayName = 'AppButton';

