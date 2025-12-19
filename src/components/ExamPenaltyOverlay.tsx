/**
 * Оверлей для отображения штрафа при ошибке
 * Показывает красный глитч и информацию о добавленных вопросах
 */

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Plus } from 'lucide-react';

export interface ExamPenaltyOverlayProps {
  /** Показывать ли оверлей */
  show: boolean;
  /** Номер блока, в котором произошла ошибка */
  blockNumber: number;
  /** Количество добавленных вопросов */
  questionsAdded: number;
  /** Количество добавленных минут */
  minutesAdded: number;
  /** Обработчик закрытия */
  onClose: () => void;
}

export function ExamPenaltyOverlay({
  show,
  blockNumber,
  questionsAdded,
  minutesAdded,
  onClose,
}: ExamPenaltyOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Красный глитч-эффект на весь экран */}
          <motion.div
            className="fixed inset-0 bg-red-500/20 z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Центральный оверлей */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setTimeout(onClose, 2000);
            }}
          >
            <div className="bg-slate-950/95 backdrop-blur-xl border-2 border-red-500/50 rounded-2xl p-8 shadow-2xl shadow-red-500/20 max-w-md mx-4">
              {/* Заголовок */}
              <motion.div
                className="flex items-center gap-3 mb-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
                <h2 className="text-2xl font-bold text-red-400">
                  ⚠️ НАРУШЕНИЕ В БЛОКЕ {blockNumber}
                </h2>
              </motion.div>

              {/* Информация о штрафе */}
              <motion.div
                className="space-y-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3 text-slate-300">
                  <Plus className="w-5 h-5 text-orange-500" />
                  <span className="text-lg">
                    Добавлено <span className="font-bold text-orange-400">{questionsAdded} вопросов</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Clock className="w-5 h-5 text-cyan-500" />
                  <span className="text-lg">
                    Добавлено <span className="font-bold text-cyan-400">+{minutesAdded} минут</span>
                  </span>
                </div>
              </motion.div>

              {/* Предупреждение */}
              <motion.div
                className="mt-6 pt-4 border-t border-red-500/30"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm text-slate-400 text-center">
                  Вторая ошибка в этом блоке приведет к провалу экзамена
                </p>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

