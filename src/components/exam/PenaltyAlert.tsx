/**
 * Модальное окно уведомления о штрафе за ошибку в экзамене РФ
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PenaltyAlertProps {
  open: boolean;
  blockNumber: number;
  questionsAdded: number;
  minutesAdded: number;
  onContinue: () => void;
}

export function PenaltyAlert({
  open,
  blockNumber,
  questionsAdded,
  minutesAdded,
  onContinue,
}: PenaltyAlertProps) {
  const [canContinue, setCanContinue] = useState(false);
  const [countdown, setCountdown] = useState(1);

  useEffect(() => {
    if (open) {
      setCanContinue(false);
      setCountdown(1);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanContinue(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={() => { }}>
          <DialogContent
            className="sm:max-w-md border-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-t-[2rem] sm:rounded-[2rem] p-0"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-500/10 pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative z-10 p-2"
            >
              <DialogHeader className="space-y-4">
                <div className="flex flex-col items-center text-center space-y-4">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="p-4 rounded-3xl bg-orange-500 shadow-lg shadow-orange-500/30"
                  >
                    <AlertTriangle className="w-10 h-10 text-white" />
                  </motion.div>

                  <div className="space-y-1">
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      ОШИБКА В БЛОКЕ {blockNumber}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                      Вам начислены дополнительные вопросы
                    </DialogDescription>
                  </div>
                </div>

                <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl p-6 space-y-4 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200">Вопросы</span>
                    </div>
                    <span className="text-xl font-black text-orange-600">+{questionsAdded}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200">Время</span>
                    </div>
                    <span className="text-xl font-black text-blue-600">+{minutesAdded} мин</span>
                  </div>
                </div>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400 px-4">
                  Согласно регламенту ГИБДД, при одной ошибке в блоке вы должны ответить на 5 дополнительных вопросов без ошибок.
                </p>
              </DialogHeader>

              <div className="mt-8 pb-6 px-4 sm:px-0 sm:pb-0">
                <Button
                  onClick={onContinue}
                  disabled={!canContinue}
                  className={cn(
                    "w-full h-14 rounded-2xl text-lg font-black transition-all duration-300 shadow-xl active:scale-95",
                    canContinue
                      ? "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-slate-900/20 dark:shadow-white/10"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-none opacity-80"
                  )}
                >
                  {canContinue ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      ПРОДОЛЖИТЬ <ArrowRight className="w-5 h-5 animate-pulse" />
                    </motion.div>
                  ) : (
                    `ПОДОЖДИТЕ (${countdown}с)`
                  )}
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

