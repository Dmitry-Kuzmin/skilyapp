import { motion } from "@/components/optimized/Motion";
import { Wifi, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReconnectionModalProps {
  open: boolean;
  onResume: () => void;
  onSurrender: () => void;
  isReconnecting?: boolean;
  className?: string;
}

/**
 * Модалка для возвращения в дуэль после перезагрузки
 * В стиле System Restore / Cyberpunk
 */
export function ReconnectionModal({
  open,
  onResume,
  onSurrender,
  isReconnecting = false,
  className,
}: ReconnectionModalProps) {
  return (
    <Sheet open={open} onOpenChange={() => {}}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-[30px] border-t border-white/10",
          "bg-zinc-950/95 backdrop-blur-md",
          "p-0 pb-safe",
          "max-h-[85vh]",
          "overflow-hidden",
          className
        )}
        hideCloseButton
      >
        <div className="relative flex flex-col h-full">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-white/20 rounded-full" />
          </div>

          {isReconnecting ? (
            /* RE-ESTABLISHING UPLINK экран */
            <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-6"
              >
                <Wifi className="w-16 h-16 text-blue-500" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-2"
              >
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                  Re-establishing Uplink
                </h2>
                <p className="text-sm text-zinc-400">
                  Восстановление соединения...
                </p>
              </motion.div>

              {/* Матричный эффект (опционально) */}
              <motion.div
                className="mt-8 text-xs font-mono text-green-500/30 space-y-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div>01001000 01100101 01101100 01101100 01101111</div>
                <div>01010111 01101111 01110010 01101100 01100100</div>
              </motion.div>
            </div>
          ) : (
            /* Выбор действия */
            <>
              {/* Header Icon */}
              <div className="flex justify-center pt-6 pb-4">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative"
                >
                  <AlertCircle className="w-16 h-16 text-yellow-500" />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-yellow-500/20 blur-xl"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              </div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center px-6 pb-4"
              >
                <h2 className="text-xl font-bold text-white mb-2">
                  Обнаружена активная дуэль
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Вы можете вернуться в игру или сдаться
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="px-6 pb-6 pt-2 space-y-3"
              >
                {/* Primary: Resume Button */}
                <Button
                  onClick={onResume}
                  className={cn(
                    "w-full h-12",
                    "bg-gradient-to-r from-green-500 to-emerald-500",
                    "text-white font-semibold",
                    "hover:from-green-600 hover:to-emerald-600",
                    "active:scale-[0.98]",
                    "transition-all duration-200",
                    "shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]"
                  )}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Resume Session
                </Button>

                {/* Destructive: Surrender Button */}
                <Button
                  onClick={onSurrender}
                  variant="outline"
                  className={cn(
                    "w-full h-12",
                    "bg-transparent",
                    "border-2 border-red-500/50",
                    "text-red-500",
                    "font-semibold",
                    "hover:bg-red-500/10",
                    "hover:border-red-500",
                    "active:scale-[0.98]",
                    "transition-all duration-200"
                  )}
                >
                  <X className="w-5 h-5 mr-2" />
                  Abort Mission
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

