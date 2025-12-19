/**
 * Сегментированный прогресс-бар для экзамена РФ (Adaptive Professional)
 * Визуализирует 4 блока по 5 вопросов + штрафные блоки
 */

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface SegmentedExamProgressProps {
  currentQuestion: number; // Текущий вопрос (1-indexed)
  totalMainQuestions: number; // 20
  questionsPerBlock: number; // 5
  penaltyQuestions: number; // Количество штрафных вопросов (0, 5, 10)
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
  }>;
  className?: string;
}

export function SegmentedExamProgress({
  currentQuestion,
  totalMainQuestions,
  questionsPerBlock,
  penaltyQuestions,
  answers,
  className,
}: SegmentedExamProgressProps) {
  const mainBlocksCount = 4;

  // Функция для определения состояния конкретного вопроса
  const getSlotState = (questionIndex: number) => {
    const answer = answers[questionIndex];
    const isCurrent = currentQuestion === questionIndex + 1;

    if (answer) {
      return answer.isCorrect ? 'success' : 'error';
    }
    if (isCurrent) {
      return 'active';
    }
    return 'pending';
  };

  // Рендеринг одного блока (5 вопросов)
  const renderBlock = (blockIndex: number, isPenalty = false) => {
    const startIdx = blockIndex * questionsPerBlock;

    return (
      <div
        key={blockIndex}
        className={cn(
          "flex gap-1 flex-1 min-w-0 relative",
          isPenalty && "p-1 rounded-lg border border-orange-500/30 bg-orange-500/5"
        )}
      >
        {isPenalty && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-bold text-orange-500 uppercase tracking-tighter whitespace-nowrap">
            <AlertCircle className="w-3 h-3" />
            <span>Штраф</span>
          </div>
        )}
        {Array.from({ length: questionsPerBlock }).map((_, i) => {
          const qIdx = startIdx + i;
          const state = getSlotState(qIdx);

          return (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full w-full transition-all duration-300",
                {
                  'bg-gray-200 dark:bg-slate-700': state === 'pending',
                  'bg-blue-600 animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.5)]': state === 'active',
                  'bg-emerald-500': state === 'success',
                  'bg-red-500': state === 'error',
                }
              )}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn("flex gap-3 w-full items-center py-6", className)}>
      {/* Основные блоки */}
      <div className="flex gap-3 flex-[4] items-center">
        {Array.from({ length: mainBlocksCount }).map((_, i) => renderBlock(i))}
      </div>

      {/* Штрафные блоки */}
      <AnimatePresence>
        {penaltyQuestions > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            className="flex gap-3 items-center"
            style={{ flex: penaltyQuestions / questionsPerBlock }}
          >
            {Array.from({ length: penaltyQuestions / questionsPerBlock }).map((_, i) =>
              renderBlock(mainBlocksCount + i, true)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
