/**
 * Модальное окно уведомления о штрафе за ошибку в экзамене РФ
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock } from 'lucide-react';
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
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    if (open) {
      setCanContinue(false);
      setCountdown(2);
      
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
        <Dialog open={open} onOpenChange={() => {}}>
          <DialogContent 
            className="sm:max-w-md"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-orange-500/10">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <DialogTitle className="text-xl font-bold">
                    Нарушение в Блоке {blockNumber}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-base pt-2">
                  <p className="mb-3">
                    Допущена <span className="font-semibold text-orange-600 dark:text-orange-400">1 ошибка</span>.
                  </p>
                  <p className="mb-4">
                    В соответствии с регламентом экзамена ПДД РФ:
                  </p>
                  <div className="space-y-2 pl-4 border-l-2 border-orange-500/30">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">+{questionsAdded} дополнительных вопросов</span>
                      <span className="text-muted-foreground">по этой теме</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">+{minutesAdded} минут</span>
                      <span className="text-muted-foreground">времени</span>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={onContinue}
                  disabled={!canContinue}
                  className={cn(
                    "min-w-[160px]",
                    !canContinue && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {canContinue ? (
                    'Продолжить экзамен'
                  ) : (
                    `Продолжить (${countdown}с)`
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

