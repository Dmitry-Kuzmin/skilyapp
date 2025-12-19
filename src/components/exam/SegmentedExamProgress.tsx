/**
 * Сегментированный прогресс-бар для экзамена РФ
 * Визуализирует 4 блока по 5 вопросов + штрафные вопросы
 */

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SegmentedExamProgressProps {
  currentQuestion: number; // Текущий вопрос (1-20 для основных, 21+ для штрафных)
  totalMainQuestions: number; // 20
  questionsPerBlock: number; // 5
  penaltyQuestions: number; // Количество штрафных вопросов
  currentBlock: number; // Текущий блок (1-4)
  errorsByBlock: Record<number, number>; // Ошибки по блокам {1: 1, 2: 0, ...}
  isExtraMode: boolean; // Режим штрафных вопросов
  className?: string;
}

export function SegmentedExamProgress({
  currentQuestion,
  totalMainQuestions,
  questionsPerBlock,
  penaltyQuestions,
  currentBlock,
  errorsByBlock,
  isExtraMode,
  className,
}: SegmentedExamProgressProps) {
  const blocksCount = 4;
  const gapSize = 2; // Отступ между блоками в px

  // Вычисляем состояние каждого вопроса
  const getQuestionState = (blockId: number, questionInBlock: number) => {
    const questionNumber = (blockId - 1) * questionsPerBlock + questionInBlock;
    
    if (questionNumber < currentQuestion) {
      // Пройденный вопрос - проверяем, была ли ошибка
      const blockErrors = errorsByBlock[blockId] || 0;
      // Если в этом блоке была ошибка, и это последний вопрос блока - красный
      if (blockErrors > 0 && questionInBlock === questionsPerBlock) {
        return 'error';
      }
      return 'completed';
    }
    
    if (questionNumber === currentQuestion) {
      return 'current';
    }
    
    return 'upcoming';
  };

  // Рендерим один блок
  const renderBlock = (blockId: number) => {
    const blockErrors = errorsByBlock[blockId] || 0;
    const hasError = blockErrors > 0;
    
    return (
      <div
        key={blockId}
        className="flex items-center gap-1"
      >
        {/* 5 вопросов в блоке */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: questionsPerBlock }).map((_, qIdx) => {
            const questionInBlock = qIdx + 1;
            const state = getQuestionState(blockId, questionInBlock);
            const isCurrentBlock = currentBlock === blockId;
            const questionNumber = (blockId - 1) * questionsPerBlock + questionInBlock;
            const isCurrentQuestion = 
              !isExtraMode && 
              currentQuestion === questionNumber;

            return (
              <div
                key={qIdx}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  {
                    // Предстоящий
                    'bg-muted/30 dark:bg-muted/20': state === 'upcoming',
                    // Текущий
                    'bg-primary scale-125 ring-2 ring-primary/50': state === 'current' && isCurrentQuestion,
                    // Пройденный успешно
                    'bg-green-500 dark:bg-green-400': state === 'completed' && !hasError,
                    // Пройденный с ошибкой (последний вопрос блока с ошибкой)
                    'bg-red-500 dark:bg-red-400': state === 'error',
                    // Текущий блок (но не текущий вопрос в штрафных)
                    'bg-primary/50': isCurrentBlock && !isCurrentQuestion && state !== 'completed',
                  }
                )}
              />
            );
          })}
        </div>
        
        {/* Отступ между блоками (кроме последнего) */}
        {blockId < blocksCount && (
          <div className={cn("h-2 w-1 mx-1 rounded", "bg-border/50")} />
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Основные блоки */}
      <div className="flex items-center gap-1">
        {Array.from({ length: blocksCount }).map((_, idx) => renderBlock(idx + 1))}
      </div>

      {/* Штрафные вопросы - анимированное появление */}
      <AnimatePresence>
        {penaltyQuestions > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <div className="h-px w-4 bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400 mr-1">
                Штрафные:
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: penaltyQuestions }).map((_, qIdx) => {
                  const penaltyQuestionNumber = totalMainQuestions + qIdx + 1;
                  const isCurrent = currentQuestion === penaltyQuestionNumber;
                  
                  return (
                    <div
                      key={qIdx}
                      className={cn(
                        "h-2 w-2 rounded-full transition-all duration-300",
                        {
                          'bg-orange-500 dark:bg-orange-400 scale-125 ring-2 ring-orange-500/50': isCurrent,
                          'bg-orange-500/50 dark:bg-orange-400/50': !isCurrent && penaltyQuestionNumber < currentQuestion,
                          'bg-orange-500/30 dark:bg-orange-400/20': penaltyQuestionNumber > currentQuestion,
                        }
                      )}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

