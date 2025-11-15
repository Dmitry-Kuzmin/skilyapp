import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Trophy, Crown, Bell } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { usePremium } from '@/hooks/usePremium';
import { useCoins } from '@/hooks/useCoins';
import { supabase } from '@/integrations/supabase/client';
import { BoostShopModal } from '@/components/shop/BoostShopModal';
import { ReminderConnectModal } from '@/components/notifications/ReminderConnectModal';
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
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [duelPassModalOpen, setDuelPassModalOpen] = useState(false);
  const [duelPassData, setDuelPassData] = useState<{ level: number; xp: number; progress: number } | null>(null);

  useEffect(() => {
    if (!profileId) return;

    const loadDuelPass = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('duel_pass_level, duel_pass_xp')
        .eq('id', profileId)
        .single();

      if (data) {
        // Простой расчет прогресса (упрощенный)
        const maxLevelXP = 3000; // Примерно для 10 уровней
        const progress = Math.min((data.duel_pass_xp / maxLevelXP) * 100, 100);
        
        setDuelPassData({
          level: data.duel_pass_level || 1,
          xp: data.duel_pass_xp || 0,
          progress
        });
      }
    };

    loadDuelPass();
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

        {/* Duel Pass Mini Progress - компактная версия на мобильных */}
        {duelPassData && (
          <button
            onClick={() => setDuelPassModalOpen(true)}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer sm:hidden"
            title={`Duel Pass уровень ${duelPassData.level}`}
          >
            <Trophy className="w-3 h-3 text-yellow-500" />
            <span className="text-xs font-medium text-muted-foreground">{duelPassData.level}</span>
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

        {/* Reminder Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setReminderModalOpen(true)}
          className="h-8 w-8"
          title="Напоминания"
        >
          <Bell className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </Button>
      </div>

      <BoostShopModal open={shopOpen} onOpenChange={setShopOpen} />
      <ReminderConnectModal open={reminderModalOpen} onOpenChange={setReminderModalOpen} />
      <DuelPassSeasonModal open={duelPassModalOpen} onOpenChange={setDuelPassModalOpen} />
    </>
  );
}

