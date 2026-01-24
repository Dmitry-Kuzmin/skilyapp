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
      <div className={cn("flex justify-center", isMobile ? "pt-4 pb-4" : "pt-2 pb-6")}>
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
            <HeartCrack className="w-20 h-20 text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]" />
          </motion.div>

          {/* Enhanced Glow */}
          <motion.div
            className="absolute inset-0 -z-10 rounded-full bg-red-500/20 blur-2xl"
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1.2, 1.4, 1.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Title & Description */}
      <div className="text-center px-6 pb-6 space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Покинуть битву?
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
          Это действие нельзя отменить. Вам будет засчитано <span className="text-red-400 font-medium">техническое поражение</span>.
        </p>
      </div>

      {/* Impact Cards */}
      <div className="px-6 pb-8">
        <div className={cn(
          "grid gap-3",
          betAmount > 0 ? "grid-cols-3" : "grid-cols-2"
        )}>
          {/* Card Item Component */}
          {[{
            icon: Trophy,
            label: "Победа врагу",
            value: null
          },
          betAmount > 0 && {
            icon: Coins,
            label: "Монеты",
            value: `-${betAmount}`
          },
          {
            icon: TrendingDown,
            label: "Рейтинг",
            value: "Потеря"
          }].filter(Boolean).map((item, i) => (
            <div key={i} className="group flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <div className="p-2 rounded-full bg-zinc-900 group-hover:bg-red-500/20 transition-colors">
                <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{item.label}</span>
                {item.value && (
                  <span className="text-xs font-bold text-red-400">{item.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className={cn("px-6 space-y-3", isMobile ? "pb-6" : "pb-2")}>
        <Button
          onClick={handleStay}
          disabled={isSurrendering}
          className={cn(
            "w-full h-14 text-base",
            "bg-gradient-to-r from-blue-600 to-indigo-600",
            "text-white font-bold rounded-2xl",
            "hover:from-blue-500 hover:to-indigo-500",
            "hover:shadow-lg hover:shadow-blue-500/20",
            "active:scale-[0.98]",
            "transition-all duration-200",
            "border-0"
          )}
        >
          Остаться в бою
        </Button>

        <Button
          onClick={handleSurrender}
          disabled={isSurrendering}
          variant="ghost"
          className={cn(
            "w-full h-12 text-sm",
            "text-zinc-500 hover:text-red-400",
            "bg-transparent hover:bg-red-500/10",
            "font-medium rounded-xl",
            "transition-all duration-200"
          )}
        >
          <span className="flex items-center gap-2">
            {isSurrendering && (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            Принять поражение
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
            "rounded-t-[32px] border-t-0",
            "bg-[#0A0A0B]", // Solid dark background for mobile performance
            "p-0 pb-safe",
            "max-h-[85vh]",
            "overflow-hidden ring-1 ring-white/10"
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
      <DialogContent className={cn(
        "max-w-[380px] p-0 border-0",
        "bg-[#0A0A0B]/90 backdrop-blur-3xl",
        "shadow-2xl shadow-black/50",
        "rounded-[32px]",
        "ring-1 ring-white/10",
        "overflow-hidden"
      )}>
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/10 blur-[60px] pointer-events-none" />

        <div className="relative">
          {Content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

