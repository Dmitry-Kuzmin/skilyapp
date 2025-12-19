/**
 * Универсальная карточка вопроса
 * Используется во всех тестах: обычные, дуэли, игры, ПДД разных стран
 */

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  'data-testid'?: string;
}

export function QuestionCard({
  children,
  className,
  compact = false,
  'data-testid': testId
}: QuestionCardProps) {
  return (
    <Card
      data-testid={testId || "question-card"}
      className={cn(
        "p-3 sm:p-4 md:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl backdrop-blur-sm",
        compact && "p-3 sm:p-3",
        className
      )}
    >
      {children}
    </Card>
  );
}


