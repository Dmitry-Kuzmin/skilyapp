/**
 * Сегментированный прогресс-бар для экзамена РФ
 * Показывает блоки вопросов и штрафные сегменты
 */

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface ExamProgressBarProps {
  /** Текущий вопрос (1-based) */
  currentQuestion: number;
  /** Общее количество основных вопросов (обычно 20) */
  totalMainQuestions: number;
  /** Количество вопросов в блоке (обычно 5) */
  questionsPerBlock: number;
  /** Количество штрафных вопросов */
  penaltyQuestions: number;
  /** Номер текущего блока (1-4) */
  currentBlock: number | null;
  /** Ошибки по блокам: { blockId: errorCount } */
  errorsByBlock: Record<number, number>;
  /** Режим доп. вопросов */
  isExtraMode: boolean;
  /** Обработчик клика на сегмент (опционально) */
  onSegmentClick?: (blockId: number) => void;
  className?: string;
}

export function ExamProgressBar({
  currentQuestion,
  totalMainQuestions,
  questionsPerBlock,
  penaltyQuestions,
  currentBlock,
  errorsByBlock,
  isExtraMode,
  onSegmentClick,
  className,
}: ExamProgressBarProps) {
  const totalBlocks = Math.ceil(totalMainQuestions / questionsPerBlock);
  const totalQuestions = totalMainQuestions + penaltyQuestions;
  const penaltyBlocks = Math.ceil(penaltyQuestions / questionsPerBlock);

  // Определяем состояние каждого блока
  const getBlockState = (blockId: number): 'future' | 'active' | 'completed' | 'error' => {
    if (!currentBlock) {
      // Если мы в режиме доп. вопросов, все основные блоки считаются пройденными
      return errorsByBlock[blockId] > 0 ? 'error' : 'completed';
    }

    if (blockId < currentBlock) {
      // Блок пройден
      return errorsByBlock[blockId] > 0 ? 'error' : 'completed';
    }
    if (blockId === currentBlock && !isExtraMode) {
      // Текущий блок (только если не в доп. вопросах)
      return 'active';
    }
    // Будущий блок
    return 'future';
  };

  // Определяем, есть ли ошибка в блоке
  const hasError = (blockId: number) => errorsByBlock[blockId] > 0;

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Основные блоки */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalBlocks }, (_, i) => {
          const blockId = i + 1;
          const state = getBlockState(blockId);
          const blockHasError = hasError(blockId);

          return (
            <motion.div
              key={`main-${blockId}`}
              className={cn(
                "flex-1 h-2 rounded-md transition-all duration-300 relative",
                {
                  'bg-slate-800': state === 'future',
                  'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/50': state === 'active',
                  'bg-slate-600': state === 'completed' && !blockHasError,
                  'bg-gradient-to-r from-red-500/50 to-red-600/50 border border-red-400/50': blockHasError,
                }
              )}
              initial={{ scale: 1 }}
              animate={{
                scale: state === 'active' ? [1, 1.02, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: state === 'active' ? Infinity : 0,
              }}
              onClick={() => onSegmentClick?.(blockId)}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
            >
              {/* Индикатор ошибки */}
              {blockHasError && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-950 z-10"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                />
              )}
            </motion.div>
          );
        })}

        {/* Штрафные блоки */}
        <AnimatePresence>
          {penaltyQuestions > 0 && (
            <motion.div
              initial={{ opacity: 0, width: 0, scaleX: 0 }}
              animate={{ opacity: 1, width: 'auto', scaleX: 1 }}
              exit={{ opacity: 0, width: 0, scaleX: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex items-center gap-1.5 ml-2"
            >
              <div className="w-1 h-2 bg-slate-600" />
              {Array.from({ length: penaltyBlocks }, (_, i) => {
                const penaltyBlockId = totalBlocks + i + 1;
                const isActive = isExtraMode && currentBlock === penaltyBlockId;

                return (
                  <motion.div
                    key={`penalty-${i}`}
                    className={cn(
                      "h-2 rounded-md transition-all duration-300",
                      {
                        'bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/50': isActive,
                        'bg-gradient-to-r from-orange-600/60 to-amber-600/60': !isActive,
                      },
                      penaltyQuestions > questionsPerBlock * (i + 1)
                        ? 'flex-1 min-w-[40px]'
                        : 'w-8'
                    )}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Индикаторы "жизни" (защита от 2 ошибок в блоке) */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Защита:</span>
        {Array.from({ length: totalBlocks }, (_, i) => {
          const blockId = i + 1;
          const errorCount = errorsByBlock[blockId] || 0;
          const isCurrentBlock = blockId === currentBlock;
          const isBroken = errorCount >= 1;

          return (
            <div
              key={`shield-${blockId}`}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded",
                {
                  'bg-slate-800/50': !isCurrentBlock && !isBroken,
                  'bg-cyan-500/20 border border-cyan-500/50': isCurrentBlock && !isBroken,
                  'bg-red-500/20 border border-red-500/50': isBroken,
                }
              )}
            >
              <span className={cn(
                "text-sm",
                {
                  'text-slate-500': !isCurrentBlock && !isBroken,
                  'text-cyan-400': isCurrentBlock && !isBroken,
                  'text-red-400': isBroken,
                }
              )}>
                {isBroken ? '🛡️' : '🛡'}
              </span>
              <span className={cn(
                "font-mono text-xs",
                {
                  'text-slate-500': !isCurrentBlock && !isBroken,
                  'text-cyan-400': isCurrentBlock && !isBroken,
                  'text-red-400': isBroken,
                }
              )}>
                {blockId}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

