import { useEffect, useState } from "react";
import { Zap, Crown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ActiveBoostIndicatorProps {
  userId: string;
  className?: string;
}

export function ActiveBoostIndicator({ userId, className }: ActiveBoostIndicatorProps) {
  const [activeBoosts, setActiveBoosts] = useState<Array<{
    type: string;
    multiplier: number;
    expiresAt: string;
  }>>([]);

  useEffect(() => {
    if (!userId) return;

    const loadActiveBoosts = async () => {
      const now = new Date();
      
      // Проверяем Double SP
      const { data: spBoost } = await supabase
        .from('active_boosts')
        .select('effect_multiplier, expires_at')
        .eq('user_id', userId)
        .eq('effect_type', 'sp_multiplier')
        .gt('expires_at', now.toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const boosts: Array<{ type: string; multiplier: number; expiresAt: string }> = [];
      
      if (spBoost && spBoost.effect_multiplier && parseFloat(spBoost.effect_multiplier.toString()) >= 2) {
        boosts.push({
          type: 'double_sp',
          multiplier: parseFloat(spBoost.effect_multiplier.toString()),
          expiresAt: spBoost.expires_at,
        });
      }

      setActiveBoosts(boosts);
    };

    loadActiveBoosts();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadActiveBoosts, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  if (activeBoosts.length === 0) return null;

  const formatTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}м ${seconds}с`;
    }
    return `${seconds}с`;
  };

  return (
    <AnimatePresence>
      {activeBoosts.map((boost) => {
        const timeLeft = formatTimeLeft(boost.expiresAt);
        if (!timeLeft) return null;

        return (
          <motion.div
            key={boost.type}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-lg",
              boost.type === 'double_sp' 
                ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
                : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
              className
            )}
          >
            {boost.type === 'double_sp' && (
              <>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Zap className="w-4 h-4 fill-current" />
                </motion.div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">Double SP активен</span>
                  <span className="text-[10px] opacity-80">SP x{boost.multiplier} • {timeLeft}</span>
                </div>
              </>
            )}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

