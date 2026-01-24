import { useState, useEffect, useCallback } from 'react';
import { motion } from "@/components/optimized/Motion";
import { HeartCrack, Trophy, Coins, TrendingDown } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useIsMobile } from "@/hooks/use-mobile";

interface ExitDuelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duelId: string;
  onSurrender: () => void;
}

export function ExitDuelModal({
  open,
  onOpenChange,
  duelId,
  onSurrender
}: ExitDuelModalProps) {
  const isMobile = useIsMobile();
  const { profileId } = useUserContext();
  const [isSurrendering, setIsSurrendering] = useState(false);
  const [betAmount, setBetAmount] = useState<number>(0);

  // Загружаем информацию о ставке
  useEffect(() => {
    if (!duelId || !open) return;

    const fetchBetInfo = async () => {
      try {
        const { data: duelData, error: duelError } = await supabase
          .from('duels')
          .select('bet_amount')
          .eq('id', duelId)
          .single();

        if (duelError) {
          console.error('[ExitDuelModal] Error fetching duel bet_amount:', duelError);
          setBetAmount(0);
          return;
        }

        const betAmountValue = duelData?.bet_amount && duelData.bet_amount > 0
          ? Number(duelData.bet_amount)
          : 0;

        setBetAmount(betAmountValue);
      } catch (error) {
        console.error('[ExitDuelModal] Exception fetching bet info:', error);
        setBetAmount(0);
      }
    };

    fetchBetInfo();
  }, [duelId, open]);

  // Haptic feedback при открытии модалки
  useEffect(() => {
    if (open) {
      haptics.warning();
    }
  }, [open]);

  const handleSurrender = useCallback(async () => {
    if (!profileId || !duelId) {
      toast.error('Недостаточно данных для выхода из дуэли');
      return;
    }

    setIsSurrendering(true);
    try {
      const { data, error } = await supabase.functions.invoke('duel-manager', {
        body: {
          action: 'surrender',
          duel_id: duelId,
          profile_id: profileId
        }
      });

      if (error) {
        console.error('[ExitDuelModal] Error surrendering:', error);
        let errorMessage = 'Ошибка при выходе из дуэли';
        if (error.message) errorMessage = error.message;

        toast.error(errorMessage);
        setIsSurrendering(false);
        return;
      }

      if (data?.success || data?.surrendered) {
        toast.info('Вы сдались. Соперник получает победу.');
        onSurrender();
        onOpenChange(false);
      } else {
        toast.error('Неожиданный ответ от сервера');
        setIsSurrendering(false);
      }
    } catch (error) {
      console.error('[ExitDuelModal] Exception surrendering:', error);
      toast.error('Ошибка при выходе из дуэли');
      setIsSurrendering(false);
    }
  }, [profileId, duelId, onSurrender, onOpenChange]);

  const handleStay = () => {
    onOpenChange(false);
  };

  const Content = (
    <div className="relative flex flex-col h-full w-full">
      {/* Handle bar (Mobile only) */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>
      )}

      {/* Header Icon */}
      <div className={cn("flex justify-center", isMobile ? "pt-4 pb-6" : "pt-6 pb-6")}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, -1, 1, -1, 1, 0],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <HeartCrack className="w-16 h-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500/20 blur-xl"
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Title */}
      <div className="text-center px-6 pb-2">
        <h2 className="text-xl font-bold text-white mb-2 select-none">
          Покинуть битву?
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Это действие необратимо. Вам будет засчитано техническое поражение.
        </p>
      </div>

      {/* Impact Cards */}
      <div className="px-6 py-6">
        <div className={cn(
          "grid gap-3",
          betAmount > 0 ? "grid-cols-3" : "grid-cols-2"
        )}>
          {/* Победа врагу */}
          <div className="flex flex-col items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl select-none">
            <Trophy className="w-5 h-5 text-red-500" />
            <span className="text-xs font-semibold text-zinc-300 text-center leading-tight">
              Победа врагу
            </span>
          </div>

          {/* Потеря монет */}
          {betAmount > 0 && (
            <div className="flex flex-col items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl select-none">
              <Coins className="w-5 h-5 text-red-500" />
              <span className="text-xs font-semibold text-zinc-300 text-center leading-tight">
                -{betAmount} монет
              </span>
            </div>
          )}

          {/* Потеря рейтинга */}
          <div className="flex flex-col items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl select-none">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-xs font-semibold text-zinc-300 text-center leading-tight">
              Потеря рейтинга
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={cn("px-6 space-y-3", isMobile ? "pb-6 pt-2" : "pb-0")}>
        <Button
          onClick={handleStay}
          disabled={isSurrendering}
          className={cn(
            "w-full h-12",
            "bg-white text-black",
            "font-semibold",
            "hover:bg-white/90",
            "active:scale-[0.98]",
            "transition-all duration-200",
            "shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
          )}
        >
          Остаться в бою
        </Button>

        <Button
          onClick={handleSurrender}
          disabled={isSurrendering}
          variant="outline"
          className={cn(
            "w-full h-12 relative overflow-hidden",
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
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isSurrendering ? (
              <>
                <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                Выход...
              </>
            ) : (
              <span>Сдаться (Поражение)</span>
            )}
          </span>
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "rounded-t-[30px] border-t border-white/10",
            "bg-zinc-950/90 backdrop-blur-md",
            "p-0 pb-safe",
            "max-h-[85vh]",
            "overflow-hidden"
          )}
          hideCloseButton
        >
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-white/10 p-6 rounded-3xl">
        {Content}
      </DialogContent>
    </Dialog>
  );
}

