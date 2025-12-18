/**
 * Универсальная типографика
 * Единые стили для заголовков и текстов
 * 
 * Изменения здесь применяются ВЕЗДЕ
 */

import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  /**
   * Вариант текста
   */
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
  
  /**
   * Жирность
   */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  
  /**
   * Цвет
   */
  color?: 'default' | 'muted' | 'primary' | 'success' | 'danger';
  
  /**
   * HTML тег
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

const variantClasses = {
  h1: 'text-3xl sm:text-4xl md:text-5xl font-bold',
  h2: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  h3: 'text-xl sm:text-2xl md:text-3xl font-semibold',
  body: 'text-base sm:text-lg',
  small: 'text-sm sm:text-base',
  caption: 'text-xs sm:text-sm',
};

const weightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const colorClasses = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-green-600 dark:text-green-400',
  danger: 'text-red-600 dark:text-red-400',
};

/**
 * Универсальный компонент типографики
 * 
 * Использование:
 * ```tsx
 * <Typography variant="h1">Заголовок</Typography>
 * <Typography variant="body" color="muted">Текст</Typography>
 * ```
 */
export function Typography({
  variant = 'body',
  weight,
  color = 'default',
  as,
  className,
  children,
  ...props
}: TypographyProps) {
  const Component = as || (
    variant === 'h1' ? 'h1' :
    variant === 'h2' ? 'h2' :
    variant === 'h3' ? 'h3' :
    'p'
  );

  return (
    <Component
      className={cn(
        variantClasses[variant],
        weight ? weightClasses[weight] : '',
        colorClasses[color],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

