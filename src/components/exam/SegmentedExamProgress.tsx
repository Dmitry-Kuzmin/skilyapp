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
  miniMode?: boolean;
}

export function SegmentedExamProgress({
  currentQuestion,
  totalMainQuestions,
  questionsPerBlock,
  penaltyQuestions,
  answers,
  className,
  miniMode = false,
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
      <motion.div
        key={blockIndex}
        layout
        initial={isPenalty ? { opacity: 0, scale: 0.9, y: 10 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "flex gap-1.5 flex-1 min-w-0 relative group",
          isPenalty && "p-1.5 rounded-xl border-2 border-orange-500/40 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
        )}
      >
        {isPenalty && !miniMode && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500 text-[9px] font-black text-white uppercase tracking-widest shadow-lg">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>Штраф</span>
          </div>
        )}
        {Array.from({ length: questionsPerBlock }).map((_, i) => {
          const qIdx = startIdx + i;
          const state = getSlotState(qIdx);
          const isCurrent = currentQuestion === qIdx + 1;

          return (
            <div key={i} className="flex-1 relative">
              <motion.div
                layoutId={`slot-${qIdx}`}
                className={cn(
                  "h-2 rounded-full w-full transition-all duration-500 relative overflow-hidden",
                  {
                    'bg-slate-200 dark:bg-slate-800': state === 'pending',
                    'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)]': state === 'active',
                    'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]': state === 'success',
                    'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]': state === 'error',
                  }
                )}
              >
                {state === 'active' && (
                  <motion.div
                    className="absolute inset-0 bg-white/30"
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                )}
              </motion.div>

              {/* Индикатор текущего вопроса */}
              <AnimatePresence>
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-blue-600 dark:text-blue-400"
                  >
                    {qIdx + 1}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={cn("flex gap-4 w-full items-center py-8", className)}>
      {/* Основные блоки */}
      <div className="flex gap-4 flex-[4] items-center">
        {Array.from({ length: mainBlocksCount }).map((_, i) => renderBlock(i))}
      </div>

      {/* Штрафные блоки - separated by gap */}
      <AnimatePresence mode="popLayout">
        {penaltyQuestions > 0 && (
          <>
            {/* Visual separator in miniMode */}
            {miniMode && <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />}

            <motion.div
              layout
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.8 }}
              className={cn("flex gap-2 items-center", miniMode ? "ml-2" : "gap-4")}
              style={{ flex: penaltyQuestions / questionsPerBlock }}
            >
              {Array.from({ length: Math.ceil(penaltyQuestions / questionsPerBlock) }).map((_, i) =>
                renderBlock(mainBlocksCount + i, true)
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
