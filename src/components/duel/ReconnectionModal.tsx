import { motion } from "@/components/optimized/Motion";
import { Wifi, AlertCircle, CheckCircle2, X, Swords } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

interface ReconnectionModalProps {
  open: boolean;
  onResume: () => void;
  onSurrender: () => void;
  isReconnecting?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Модалка для возвращения в дуэль после перезагрузки
 * Обновленный премиальный дизайн
 */
export function ReconnectionModal({
  open,
  onResume,
  onSurrender,
  isReconnecting = false,
  className,
  onOpenChange,
}: ReconnectionModalProps) {
  const location = useLocation();

  // КРИТИЧНО: Не показываем модалку, если пользователь уже на странице дуэли
  const isAlreadyInDuel = location.pathname.includes('/games/duel') || location.pathname.includes('/duel');

  if (isAlreadyInDuel && open) {
    // Если мы уже в дуэли, но стор говорит показать модалку - игнорируем
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-[32px] border-t border-white/10",
          "bg-[#09090B]/95 backdrop-blur-xl",
          "p-0 pb-safe",
          "max-h-[85vh]",
          "overflow-hidden shadow-[0_-20px_50px_-20px_rgba(59,130,246,0.3)]",
          className
        )}
        hideCloseButton
      >
        <div className="relative flex flex-col h-full">
          {/* Декоративный градиентный фон сверху */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

          {/* Handle bar */}
          <div className="flex justify-center pt-4 pb-2 z-10">
            <div className="w-12 h-1.5 bg-white/10 rounded-full" />
          </div>

          {isReconnecting ? (
            /* RE-ESTABLISHING UPLINK экран */
            <div className="flex flex-col items-center justify-center flex-1 px-8 py-14 z-10">
              <div className="relative mb-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                  className="relative z-10"
                >
                  <div className="p-5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <Wifi className="w-14 h-14 text-blue-500" />
                  </div>
                </motion.div>

                {/* Пульсирующие круги вокруг */}
                <motion.div
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-blue-500/20 -z-0"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-3"
              >
                <h2 className="text-2xl font-bold text-white tracking-tight uppercase">
                  Восстановление связи
                </h2>
                <p className="text-zinc-400 font-medium">
                  Переподключение к серверам дуэли...
                </p>
              </motion.div>

              <motion.div
                className="mt-10 flex gap-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      backgroundColor: ["#3b82f6", "#60a5fa", "#3b82f6"]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="w-2.5 h-2.5 rounded-full bg-blue-500"
                  />
                ))}
              </motion.div>
            </div>
          ) : (
            /* Выбор действия */
            <>
              {/* Header Icon */}
              <div className="flex justify-center pt-8 pb-6 z-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative"
                >
                  <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 relative z-10">
                    <Swords className="w-14 h-14 text-amber-500" />
                  </div>

                  {/* Фоновое свечение */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-amber-500/25 blur-3xl -z-0"
                    animate={{
                      opacity: [0.4, 0.7, 0.4],
                      scale: [0.8, 1.1, 0.8],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              </div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center px-8 pb-6 z-10"
              >
                <h2 className="text-2xl font-bold text-white mb-2.5 tracking-tight">
                  Дуэль всё еще идет!
                </h2>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  Мы обнаружили вашу активную сессию. Желаете вернуться на поле битвы?
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="px-6 pb-10 pt-4 space-y-3.5 z-10"
              >
                {/* Primary: Resume Button */}
                <Button
                  onClick={onResume}
                  className={cn(
                    "w-full h-14",
                    "bg-gradient-to-r from-blue-600 to-indigo-600",
                    "text-white text-lg font-bold",
                    "hover:from-blue-700 hover:to-indigo-700",
                    "active:scale-[0.97]",
                    "rounded-2xl border-t border-white/20",
                    "transition-all duration-300",
                    "shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)]"
                  )}
                >
                  <CheckCircle2 className="w-6 h-6 mr-2.5" />
                  Вернуться в игру
                </Button>

                {/* Destructive: Surrender Button */}
                <Button
                  onClick={onSurrender}
                  variant="ghost"
                  className={cn(
                    "w-full h-14",
                    "bg-white/5",
                    "text-zinc-400 hover:text-red-400",
                    "font-semibold text-base",
                    "hover:bg-red-500/10",
                    "active:scale-[0.97]",
                    "rounded-2xl border border-transparent hover:border-red-500/20",
                    "transition-all duration-300"
                  )}
                >
                  <X className="w-5 h-5 mr-2.5 opacity-70" />
                  Завершить и сдаться
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

