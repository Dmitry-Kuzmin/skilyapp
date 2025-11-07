import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, X, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import Confetti from 'react-confetti';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { BoostCard } from './BoostCard';

interface BoostShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Boost {
  id: string;
  type: string;
  name_ru: string;
  description_ru: string;
  icon: string;
  cost_coins: number;
  is_premium: boolean;
}

interface BoostInventory {
  boost_type: string;
  quantity: number;
}

export function BoostShopModal({ open, onOpenChange }: BoostShopModalProps) {
  const { profileId } = useUserContext();
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [inventory, setInventory] = useState<BoostInventory[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    if (!profileId) {
      console.warn('[BoostShop] profileId не установлен');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Загрузка бустов
      const { data: boostsData, error: boostsError } = await supabase
        .from('boost_definitions')
        .select('*')
        .order('cost_coins', { ascending: true });

      if (boostsError) {
        console.error('[BoostShop] Ошибка загрузки бустов:', boostsError);
      } else if (boostsData) {
        setBoosts(boostsData);
      }

      // Загрузка профиля
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', profileId)
        .single();

      if (profileError) {
        console.error('[BoostShop] Ошибка загрузки профиля:', profileError);
      } else if (profile) {
        setCoins(profile.coins || 0);
      }

      // Загрузка инвентаря
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('boost_inventory')
        .select('boost_type, quantity')
        .eq('user_id', profileId);

      if (inventoryError) {
        console.error('[BoostShop] Ошибка загрузки инвентаря:', inventoryError);
      } else if (inventoryData) {
        setInventory(inventoryData);
      }
    } catch (error) {
      console.error('[BoostShop] Ошибка загрузки данных магазина:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInventoryCount = (boostType: string) => {
    return inventory.find(i => i.boost_type === boostType)?.quantity || 0;
  };

  const handlePurchase = async (boost: Boost) => {
    if (!profileId) {
      toast({
        title: '❌ Ошибка',
        description: 'Необходимо войти в систему',
        variant: 'destructive',
      });
      return;
    }

    if (coins < boost.cost_coins) {
      toast({
        title: '❌ Недостаточно монет',
        description: `Вам нужно ещё ${boost.cost_coins - coins} монет`,
        variant: 'destructive',
      });
      haptics.wrongAnswer();
      sounds.wrongAnswer();
      return;
    }

    try {
      console.log('[BoostShop] Начало покупки:', { 
        profileId, 
        boostType: boost.type, 
        cost: boost.cost_coins, 
        currentCoins: coins 
      });

      // Используем функцию increment_profile_value для списания монет
      // Она использует SECURITY DEFINER и обходит RLS проблемы
      const { error: coinsError } = await supabase.rpc('increment_profile_value', {
        p_profile_id: profileId,
        p_column: 'coins',
        p_amount: -boost.cost_coins
      });

      if (coinsError) {
        console.error('[BoostShop] Ошибка списания монет:', coinsError);
        throw new Error(`Не удалось списать монеты: ${coinsError.message}`);
      }

      console.log('[BoostShop] Монеты списаны успешно');

      // Добавляем буст в инвентарь используя функцию modify_boost_inventory
      // Это более надежный способ, который обходит RLS проблемы
      const { error: inventoryError } = await supabase.rpc('modify_boost_inventory', {
        p_user_id: profileId,
        p_boost_type: boost.type,
        p_change: 1
      });

      if (inventoryError) {
        console.error('[BoostShop] Ошибка добавления буста в инвентарь:', inventoryError);
        
        // Откатываем списание монет при ошибке
        await supabase.rpc('increment_profile_value', {
          p_profile_id: profileId,
          p_column: 'coins',
          p_amount: boost.cost_coins
        });
        
        throw new Error(`Не удалось добавить буст в инвентарь: ${inventoryError.message}`);
      }

      console.log('[BoostShop] Буст добавлен в инвентарь успешно');

      // Анимации и звуки
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      sounds.correctAnswer();
      haptics.boostActivated();

      // Перезагружаем данные для получения актуальных значений
      await loadData();

      toast({
        title: '✅ Покупка успешна!',
        description: `${boost.name_ru} добавлен в инвентарь`,
      });
    } catch (error: any) {
      console.error('[BoostShop] Ошибка покупки:', error);
      
      const errorMessage = error?.message || error?.error?.message || 'Неизвестная ошибка';
      console.error('[BoostShop] Детали ошибки:', {
        message: errorMessage,
        fullError: error
      });
      
      toast({
        title: '❌ Ошибка покупки',
        description: errorMessage.includes('RLS') 
          ? 'Ошибка доступа. Попробуйте обновить страницу и войти снова.'
          : errorMessage || 'Не удалось совершить покупку. Попробуйте еще раз.',
        variant: 'destructive',
      });
      haptics.wrongAnswer();
    }
  };

  const regularBoosts = boosts.filter(b => !b.is_premium);
  const premiumBoosts = boosts.filter(b => b.is_premium);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0">
        {showConfetti && (
          <Confetti
            width={600}
            height={800}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
          />
        )}

        {/* Компактный заголовок с балансом */}
        <DialogHeader className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <DialogTitle className="text-lg font-semibold">Магазин бустов</DialogTitle>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50">
                <Coins className="w-4 h-4 text-gold" />
                <span className="text-sm font-semibold">{coins}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Загрузка...</p>
            </div>
          ) : (
            <>
              {/* Regular Boosts */}
              {regularBoosts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground px-1">Популярные бусты</h3>
                  <div className="space-y-2">
                    {regularBoosts.map((boost) => (
                      <BoostCard
                        key={boost.id}
                        boost={boost}
                        inventoryCount={getInventoryCount(boost.type)}
                        coins={coins}
                        onPurchase={() => handlePurchase(boost)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Premium Boosts */}
              {premiumBoosts.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-sm font-semibold text-muted-foreground">Премиум бусты</h3>
                    <Badge className="gradient-gold border-none text-xs px-1.5 py-0">Premium</Badge>
                  </div>
                  <div className="space-y-2">
                    {premiumBoosts.map((boost) => (
                      <BoostCard
                        key={boost.id}
                        boost={boost}
                        inventoryCount={getInventoryCount(boost.type)}
                        coins={coins}
                        onPurchase={() => handlePurchase(boost)}
                        isPremium
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
