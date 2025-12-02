import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Coins, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StreakFreezePanelProps {
  userId: string;
  freezeCount: number;
  currentStreak: number;
  onFreezePurchased?: () => void;
}

export const StreakFreezePanel = ({ 
  userId, 
  freezeCount, 
  currentStreak,
  onFreezePurchased 
}: StreakFreezePanelProps) => {
  const { toast } = useToast();
  const [buying, setBuying] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? 'dark') !== 'light';

  const handleBuy = async () => {
    setBuying(true);
    try {
      const { data, error } = await supabase.rpc('buy_streak_freeze', {
        p_user_id: userId,
        p_quantity: 1
      });

      if (error) {
        console.error('[StreakFreezePanel] Error:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось купить заморозку",
          variant: "destructive"
        });
        setBuying(false);
        return;
      }

      if (!data?.success) {
        toast({
          title: "Ошибка",
          description: data?.message || "Не удалось купить заморозку",
          variant: "destructive"
        });
        setBuying(false);
        return;
      }

      toast({
        title: "❄️ Заморозка куплена!",
        description: `Теперь твой streak защищен! Осталось ${freezeCount + 1} ${freezeCount + 1 === 1 ? 'заморозка' : 'заморозки'}`,
      });

      // Обновить данные родителя
      onFreezePurchased?.();
    } catch (err) {
      console.error('[StreakFreezePanel] Error:', err);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при покупке",
        variant: "destructive"
      });
    } finally {
      setBuying(false);
    }
  };

  // Не показываем если streak слишком маленький
  if (currentStreak < 3) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
              ${freezeCount > 0
                ? isDark
                  ? 'bg-cyan-500/15 border-cyan-500/40'
                  : 'bg-cyan-50 border-cyan-300/60'
                : isDark
                  ? 'bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/40'
                  : 'bg-slate-100/50 border-slate-300/50 hover:border-cyan-400/60'
              }
            `}
          >
            <motion.div
              animate={freezeCount > 0 ? {
                scale: [1, 1.2, 1],
                filter: [
                  'drop-shadow(0 0 0px rgba(6, 182, 212, 0))',
                  'drop-shadow(0 0 10px rgba(6, 182, 212, 0.6))',
                  'drop-shadow(0 0 0px rgba(6, 182, 212, 0))'
                ]
              } : {}}
              transition={{ duration: 2, repeat: freezeCount > 0 ? Infinity : 0 }}
            >
              <Shield className={`w-4 h-4 ${
                freezeCount > 0 
                  ? 'text-cyan-400 fill-cyan-400/20' 
                  : isDark ? 'text-slate-400' : 'text-slate-500'
              }`} />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${
                freezeCount > 0 
                  ? isDark ? 'text-cyan-300' : 'text-cyan-700'
                  : isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {freezeCount > 0 ? 'Защита активна' : 'Защита streak'}
              </div>
              {freezeCount > 0 && (
                <div className={`text-[10px] ${isDark ? 'text-cyan-400/70' : 'text-cyan-600/70'}`}>
                  {freezeCount} {freezeCount === 1 ? 'заморозка' : 'заморозки'}
                </div>
              )}
            </div>
            
            {freezeCount === 0 && (
              <Button
                size="sm"
                variant="outline"
                className={`h-7 px-2 text-xs transition-all ${
                  isDark
                    ? 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/60'
                    : 'border-cyan-400/60 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-500'
                }`}
                onClick={handleBuy}
                disabled={buying}
              >
                {buying ? (
                  <Sparkles className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Coins className="w-3 h-3 mr-1" />
                    50
                  </>
                )}
              </Button>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className={isDark ? 'bg-slate-900/95' : 'bg-white border-slate-200'}>
          <div className="space-y-2 max-w-[240px]">
            <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ❄️ Streak Freeze
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {freezeCount > 0 
                ? `Если пропустишь день, streak не сгорит! Осталось ${freezeCount} ${freezeCount === 1 ? 'заморозка' : 'заморозки'}.`
                : 'Защити свой streak! Если пропустишь день, заморозка спасет серию.'
              }
            </div>
            {freezeCount === 0 && (
              <div className={`text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-600'} font-semibold`}>
                Цена: 50 монет за заморозку
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

