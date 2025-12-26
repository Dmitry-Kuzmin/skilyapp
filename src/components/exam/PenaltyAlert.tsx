/**
 * PenaltyAlert — Fixed Layout with AlertDialog
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, ArrowRight, FileQuestion } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';
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
    <AlertDialog open={open} onOpenChange={() => { }}>
      <AlertDialogContent
        className={cn(
          "max-w-[360px] p-5",
          "bg-slate-900/95 backdrop-blur-xl",
          "border border-white/10",
          "rounded-3xl"
        )}
      >
        {/* Header */}
        <div className="text-center space-y-3">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-gradient-to-b from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-white">
            Дополнительные вопросы
          </h2>

          {/* Reason Badge */}
          <span className="inline-flex px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium uppercase tracking-wide">
            Ошибка в блоке {blockNumber}
          </span>
        </div>

        {/* Penalty Pills */}
        <div className="flex gap-2 mt-4">
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 border border-white/5">
            <FileQuestion className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-sm text-white font-medium whitespace-nowrap">
              <span className="text-orange-400">+{questionsAdded}</span> вопросов
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/5 border border-white/5">
            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm text-white font-medium whitespace-nowrap">
              <span className="text-blue-400">+{minutesAdded}</span> минут
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 text-center leading-relaxed mt-3">
          При ошибке нужно ответить на дополнительные вопросы без ошибок.
        </p>

        {/* Continue Button */}
        <button
          type="button"
          onClick={() => {
            console.log('PenaltyAlert: Continue clicked');
            onContinue();
          }}
          disabled={!canContinue}
          className={cn(
            "w-full h-11 mt-4 rounded-xl font-semibold text-sm transition-all duration-200",
            "flex items-center justify-center gap-2",
            canContinue
              ? cn(
                "bg-gradient-to-r from-blue-500 to-blue-600",
                "text-white",
                "shadow-lg shadow-blue-500/25",
                "hover:brightness-110",
                "active:scale-[0.98]",
                "cursor-pointer"
              )
              : "bg-slate-800/50 text-slate-500 cursor-not-allowed"
          )}
        >
          {canContinue ? (
            <>Продолжить <ArrowRight className="w-4 h-4" /></>
          ) : (
            `Подождите (${countdown}с)`
          )}
        </button>
      </AlertDialogContent>
    </AlertDialog>
  );
}
