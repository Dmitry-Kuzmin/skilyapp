import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, X, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
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
    try {
      setLoading(true);

      // Загрузка бустов
      const { data: boostsData } = await supabase
        .from('boost_definitions')
        .select('*')
        .order('cost_coins', { ascending: true });

      if (boostsData) {
        setBoosts(boostsData);
      }

      // Загрузка профиля
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', profileId)
        .single();

      if (profile) {
        setCoins(profile.coins || 0);
      }

      // Загрузка инвентаря
      const { data: inventoryData } = await supabase
        .from('boost_inventory')
        .select('boost_type, quantity')
        .eq('user_id', profileId);

      if (inventoryData) {
        setInventory(inventoryData);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных магазина:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInventoryCount = (boostType: string) => {
    return inventory.find(i => i.boost_type === boostType)?.quantity || 0;
  };

  const handlePurchase = async (boost: Boost) => {
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
      // Списываем монеты
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: coins - boost.cost_coins })
        .eq('id', profileId);

      if (updateError) throw updateError;

      // Добавляем буст в инвентарь
      const currentQuantity = getInventoryCount(boost.type);
      
      const { error: inventoryError } = await supabase
        .from('boost_inventory')
        .upsert({
          user_id: profileId,
          boost_type: boost.type,
          quantity: currentQuantity + 1,
        }, {
          onConflict: 'user_id,boost_type',
        });

      if (inventoryError) throw inventoryError;

      // Обновляем локальное состояние
      setCoins(prev => prev - boost.cost_coins);
      setInventory(prev => {
        const existing = prev.find(i => i.boost_type === boost.type);
        if (existing) {
          return prev.map(i => 
            i.boost_type === boost.type 
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...prev, { boost_type: boost.type, quantity: 1 }];
      });

      // Анимации и звуки
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      sounds.correctAnswer();
      haptics.boostActivated();

      toast({
        title: '✅ Покупка успешна!',
        description: `${boost.name_ru} добавлен в инвентарь`,
      });
    } catch (error) {
      console.error('Ошибка покупки:', error);
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось совершить покупку',
        variant: 'destructive',
      });
      haptics.wrongAnswer();
    }
  };

  const regularBoosts = boosts.filter(b => !b.is_premium);
  const premiumBoosts = boosts.filter(b => b.is_premium);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {showConfetti && (
          <Confetti
            width={600}
            height={800}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
          />
        )}

        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <ShoppingBag className="w-6 h-6 text-primary-foreground" />
              </div>
              Магазин бустов
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Balance Section */}
          <motion.div
            className="mt-4 p-4 rounded-xl bg-gradient-to-r from-gold/20 via-yellow-500/20 to-gold/20 border-2 border-gold/30"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/30 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ваш баланс</p>
                  <p className="text-2xl font-black text-gold">{coins} монет</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-gold/50 text-gold hover:bg-gold/10">
                <Sparkles className="w-4 h-4 mr-2" />
                Пополнить
              </Button>
            </div>
          </motion.div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Загрузка...</p>
            </div>
          ) : (
            <>
              {/* Regular Boosts */}
              {regularBoosts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-primary to-secondary rounded-full"></div>
                    <h3 className="text-lg font-bold">🎯 Популярные бусты</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-gold to-yellow-600 rounded-full"></div>
                    <h3 className="text-lg font-bold">💎 Премиум бусты</h3>
                    <Badge className="gradient-gold border-none text-xs">Premium</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Info Card */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Совет:</strong> Используйте бусты стратегически! В дуэлях можно использовать только 1 буст за матч.
                </p>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
