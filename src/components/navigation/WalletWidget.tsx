import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Trophy, Crown } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { usePremium } from '@/hooks/usePremium';
import { useCoins } from '@/hooks/useCoins';
import { supabase } from '@/integrations/supabase/client';
import { BoostShopModal } from '@/components/shop/BoostShopModal';
import { DuelPassSeasonModal } from '@/components/monetization/DuelPassSeasonModal';
import { cn } from '@/lib/utils';

interface WalletWidgetProps {
  className?: string;
}

export function WalletWidget({ className }: WalletWidgetProps) {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const { balance } = useCoins();
  const [shopOpen, setShopOpen] = useState(false);
  const [duelPassModalOpen, setDuelPassModalOpen] = useState(false);
  const [duelPassData, setDuelPassData] = useState<{ level: number; xp: number; progress: number; spToNextLevel: number } | null>(null);

  useEffect(() => {
    if (!profileId) return;

    const loadDuelPass = async () => {
      try {
        // Получаем активный сезон и прогресс пользователя
        const { data: seasonData, error: seasonError } = await supabase
          .rpc("get_active_season");

        if (seasonError || !seasonData || seasonData.length === 0) {
          console.warn('[WalletWidget] No active season found');
          return;
        }

        const activeSeason = seasonData[0];

        // Получаем прогресс пользователя в сезоне
        const { data: progressData, error: progressError } = await supabase
          .rpc("get_or_create_season_progress", {
            p_user_id: profileId,
            p_season_id: activeSeason.id,
          });

        if (progressError || !progressData || progressData.length === 0) {
          console.warn('[WalletWidget] Error loading season progress:', progressError);
          return;
        }

        const progress = progressData[0];
        const currentSP = progress.season_points || 0;
        const currentLevel = progress.level || 1;
        
        // Получаем награды для расчета прогресса
        const { data: rewardsData } = await supabase
          .from("duel_pass_season_rewards")
          .select("level, sp_required")
          .eq("season_id", activeSeason.id)
          .order("level", { ascending: true });

        if (rewardsData && rewardsData.length > 0) {
          // Находим следующий уровень
          const nextLevelReward = rewardsData.find((r: any) => r.level === currentLevel + 1);
          const totalSPNeeded = rewardsData[rewardsData.length - 1]?.sp_required || 3000;
          
          // Рассчитываем прогресс до следующего уровня
          const nextLevelSP = nextLevelReward?.sp_required || totalSPNeeded;
          const spToNextLevel = Math.max(0, nextLevelSP - currentSP);
          const spForCurrentLevel = currentLevel > 1 
            ? (rewardsData.find((r: any) => r.level === currentLevel)?.sp_required || 0) - 
              (rewardsData.find((r: any) => r.level === currentLevel - 1)?.sp_required || 0)
            : nextLevelSP;
          
          const progressPercent = spForCurrentLevel > 0 
            ? Math.min(((spForCurrentLevel - spToNextLevel) / spForCurrentLevel) * 100, 100)
            : 0;

          setDuelPassData({
            level: currentLevel,
            xp: currentSP,
            progress: Math.max(0, progressPercent),
            spToNextLevel: spToNextLevel
          });
        } else {
          // Fallback если нет наград
          setDuelPassData({
            level: currentLevel,
            xp: currentSP,
            progress: 0,
            spToNextLevel: 0
          });
        }
      } catch (error) {
        console.error('[WalletWidget] Error loading Duel Pass data:', error);
      }
    };

    loadDuelPass();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadDuelPass, 30000);
    return () => clearInterval(interval);
  }, [profileId]);

  return (
    <>
      <div className={cn("flex items-center gap-1.5 md:gap-2", className)}>
        {/* Coins */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShopOpen(true)}
          className="h-8 px-1.5 md:px-2 gap-1 md:gap-1.5 hover:bg-muted/50"
        >
          <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />
          <span className="text-xs md:text-sm font-semibold">{balance}</span>
        </Button>

        {/* Duel Pass - улучшенная версия для мобильных с прогресс-баром и SP */}
        {duelPassData && (
          <button
            onClick={() => setDuelPassModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer sm:hidden"
            title={`Duel Pass уровень ${duelPassData.level} - ${duelPassData.xp} SP`}
          >
            {/* Season Points */}
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-purple-400">S</span>
              </div>
              <span className="text-xs font-semibold text-foreground">{duelPassData.xp}</span>
            </div>
            
            {/* Разделитель */}
            <div className="w-px h-4 bg-border" />
            
            {/* Уровень с прогресс-баром */}
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                  style={{ width: `${Math.max(5, duelPassData.progress)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground min-w-[18px]">{duelPassData.level}</span>
            </div>
          </button>
        )}
        {duelPassData && (
          <button
            onClick={() => setDuelPassModalOpen(true)}
            className="hidden sm:flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            title={`Duel Pass уровень ${duelPassData.level} - Кликните для просмотра сезона`}
          >
            <Trophy className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-500" />
            <div className="w-10 md:w-12 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                style={{ width: `${duelPassData.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{duelPassData.level}</span>
          </button>
        )}

        {/* Premium Badge - компактная версия на мобильных */}
        {isPremium && (
          <Badge className="h-6 px-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-none text-xs sm:hidden">
            <Crown className="w-3 h-3" />
          </Badge>
        )}
        {isPremium && (
          <Badge className="hidden sm:flex h-6 px-1 md:px-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-none text-xs">
            <Crown className="w-3 h-3 mr-0.5" />
            <span className="hidden md:inline">Premium</span>
          </Badge>
        )}

      </div>

      <BoostShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <DuelPassSeasonModal open={duelPassModalOpen} onOpenChange={setDuelPassModalOpen} />
    </>
  );
}

