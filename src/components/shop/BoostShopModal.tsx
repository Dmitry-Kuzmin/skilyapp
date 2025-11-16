import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, X, ShoppingBag, TrendingUp, TrendingDown, History, Gift, Trophy, TestTube, Zap, Calendar, CreditCard, Users, Filter, Crown, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import Confetti from 'react-confetti';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { BoostCard } from './BoostCard';
import { motion } from 'framer-motion';
import { PaywallModal } from '@/components/monetization/PaywallModal';
import { usePremium } from '@/hooks/usePremium';
import { ModalSkeleton } from '@/components/ui/modal-skeleton';
import { getDialogContentClasses } from '@/lib/modal-config';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  category?: 'earn' | 'spend' | 'purchase' | 'reward';
  icon?: any; // React component
  metadata?: any;
}

export function BoostShopModal({ open, onOpenChange }: BoostShopModalProps) {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const isMobile = useIsMobile();
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [inventory, setInventory] = useState<BoostInventory[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'earn' | 'spend' | 'purchase' | 'reward'>('all');
  const [activeTab, setActiveTab] = useState<'boosts' | 'coins' | 'premium'>('boosts');
  const [paywallOpen, setPaywallOpen] = useState(false);

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
        .select('id, coins')
        .eq('id', profileId)
        .single();

      if (profileError) {
        console.error('[BoostShop] Ошибка загрузки профиля:', profileError);
        console.error('[BoostShop] ProfileId, который не найден:', profileId);
        // Если профиль не найден, пробуем перезагрузить profileId из контекста
        if (profileError.code === 'PGRST116') {
          console.warn('[BoostShop] Профиль не найден в базе. Возможно, profileId устарел.');
        }
      } else if (profile) {
        console.log('[BoostShop] Профиль загружен:', { id: profile.id, coins: profile.coins });
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
  
  const getTransactionInfo = (type: string, metadata?: any): { description: string; icon: any; category: 'earn' | 'spend' | 'purchase' | 'reward' } => {
    const iconMap: Record<string, any> = {
      // Earnings
      'coins_earned_test': { icon: TestTube, desc: 'Награда за тест', cat: 'earn' },
      'coins_earned_duel': { icon: Zap, desc: 'Награда за дуэль', cat: 'earn' },
      'coins_earned_daily': { icon: Calendar, desc: 'Ежедневный бонус', cat: 'earn' },
      'coins_earned_premium_bonus': { icon: Gift, desc: 'Premium бонус', cat: 'earn' },
      // Spending
      'coins_spent_boost': { icon: Zap, desc: `Покупка буста: ${metadata?.boost_type || ''}`, cat: 'spend' },
      'coins_spent_skin': { icon: Gift, desc: 'Покупка скина', cat: 'spend' },
      'coins_spent_duel_entry': { icon: Zap, desc: 'Вход в дуэль', cat: 'spend' },
      // Purchases
      'coins_purchase_stripe': { icon: CreditCard, desc: `Покупка монет: ${metadata?.amount || ''}`, cat: 'purchase' },
      'premium_purchase_monthly': { icon: CreditCard, desc: 'Premium подписка (месяц)', cat: 'purchase' },
      'premium_purchase_yearly': { icon: CreditCard, desc: 'Premium подписка (год)', cat: 'purchase' },
      'duel_pass_purchase': { icon: Trophy, desc: 'Покупка Duel Pass', cat: 'purchase' },
      // Duel transactions
      'bet': { icon: Zap, desc: 'Ставка в дуэли', cat: 'spend' },
      'win': { icon: Trophy, desc: 'Выигрыш в дуэли', cat: 'earn' },
      'refund': { icon: Gift, desc: 'Возврат ставки', cat: 'earn' },
      'commission': { icon: Coins, desc: 'Комиссия системы', cat: 'spend' },
      // Referrals
      'referral_earned': { icon: Users, desc: `Реферальная награда: ${metadata?.name || 'друг'}`, cat: 'reward' },
      'referral_joined': { icon: Gift, desc: 'Бонус за регистрацию', cat: 'reward' },
      // Duel Pass rewards
      'duel_pass_reward': { icon: Trophy, desc: `Награда Duel Pass (уровень ${metadata?.level || ''})`, cat: 'reward' },
    };

    const info = iconMap[type] || { icon: Coins, desc: type, cat: 'earn' };
    
      // Дополнительная обработка для Duel Pass наград
      if (metadata?.source === 'duel_pass_reward' || type === 'coins_earned_daily' && metadata?.source === 'duel_pass_reward') {
        const levelText = metadata?.level ? ` (уровень ${metadata.level})` : '';
        const premiumText = metadata?.is_premium ? ' [Premium]' : '';
        return {
          icon: Trophy,
          description: `Награда Duel Pass${levelText}${premiumText}`,
          category: 'reward'
        };
      }

    return {
      icon: info.icon,
      description: info.desc,
      category: info.cat as 'earn' | 'spend' | 'purchase' | 'reward'
    };
  };

  const loadTransactionHistory = async () => {
    if (!profileId) return;
    
    setLoadingHistory(true);
    try {
      const allTransactions: Transaction[] = [];
      
      // 1. Load new transactions table (monetization system)
      const { data: newTransactions } = await supabase
        .from('transactions')
        .select('id, amount, transaction_type, metadata, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (newTransactions) {
        newTransactions.forEach(tx => {
          const info = getTransactionInfo(tx.transaction_type, tx.metadata);
          allTransactions.push({
            id: tx.id,
            amount: tx.amount,
            type: tx.transaction_type,
            description: info.description,
            created_at: tx.created_at,
            category: info.category,
            icon: info.icon,
            metadata: tx.metadata
          });
        });
      }
      
      // 2. Load duel transactions (bets and winnings)
      const { data: duelTx } = await supabase
        .from('duel_transactions')
        .select('id, amount, transaction_type, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (duelTx) {
        duelTx.forEach(tx => {
          const info = getTransactionInfo(tx.transaction_type);
          allTransactions.push({
            id: tx.id || `duel_${tx.created_at}`,
            amount: tx.amount,
            type: tx.transaction_type,
            description: info.description,
            created_at: tx.created_at,
            category: info.category,
            icon: info.icon
          });
        });
      }
      
      // 3. Load purchases (Stripe)
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id, item_type, price, currency, status, metadata, created_at, completed_at')
        .eq('user_id', profileId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);
      
      if (purchases) {
        purchases.forEach(purchase => {
          let description = '';
          let amount = 0;
          
          if (purchase.item_type === 'coins_pack') {
            const coinsAmount = purchase.metadata?.coins_amount || 0;
            description = `Покупка монет: ${coinsAmount}`;
            amount = coinsAmount;
          } else if (purchase.item_type === 'premium') {
            description = 'Premium подписка';
            amount = 0; // Premium не дает монет напрямую
          } else if (purchase.item_type === 'duel_pass') {
            description = 'Покупка Duel Pass';
            amount = 0;
          }
          
          if (amount > 0) {
            allTransactions.push({
              id: purchase.id,
              amount: amount,
              type: 'coins_purchase_stripe',
              description,
              created_at: purchase.completed_at || purchase.created_at,
              category: 'purchase',
              icon: CreditCard,
              metadata: purchase.metadata
            });
          }
        });
      }
      
      // 4. Load referral transactions
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referred_bonus, referral_bonus, reward_given, created_at, reward_given_at, referred:referred_id(first_name)')
        .or(`referrer_id.eq.${profileId},referred_id.eq.${profileId}`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (referrals) {
        referrals.forEach(ref => {
          const isReferrer = ref.reward_given;
          if (isReferrer) {
            allTransactions.push({
              id: `ref_earned_${ref.created_at}`,
              amount: ref.referral_bonus || 100,
              type: 'referral_earned',
              description: `Реферальная награда: ${(ref.referred as any)?.first_name || 'друг'}`,
              created_at: ref.reward_given_at || ref.created_at,
              category: 'reward',
              icon: Users,
              metadata: { name: (ref.referred as any)?.first_name }
            });
          }
          allTransactions.push({
            id: `ref_joined_${ref.created_at}`,
            amount: ref.referred_bonus || 50,
            type: 'referral_joined',
            description: 'Бонус за регистрацию по реферальной ссылке',
            created_at: ref.created_at,
            category: 'reward',
            icon: Gift
          });
        });
      }
      
      // Sort all transactions by date
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('[BoostShop] Error loading transaction history:', error);
      toast({ title: 'Ошибка загрузки истории', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCoinPurchase = async (catalogKey: string) => {
    if (!profileId) {
      toast({
        title: '❌ Ошибка',
        description: 'Необходимо войти в систему',
        variant: 'destructive',
      });
      return;
    }

    console.log("[BoostShop] Starting coin purchase:", { profileId, catalogKey });

    try {
      // Создаем Stripe Checkout сессию
      const requestBody = { user_id: profileId, catalog_key: catalogKey };
      console.log("[BoostShop] Invoking purchase-create with body:", requestBody);
      
      const { data, error } = await supabase.functions.invoke("purchase-create", {
        body: requestBody,
      });
      
      console.log("[BoostShop] purchase-create response:", { data, error });

      if (error) {
        console.error("[BoostShop] Purchase error:", error);
        
        // Пытаемся получить детали ошибки из response
        let errorMessage = error.message || 'Не удалось создать сессию оплаты';
        let errorDetails = '';
        
        if (error.context) {
          try {
            const errorBody = await error.context.json?.();
            if (errorBody?.error) {
              errorMessage = errorBody.error;
              if (errorBody.details) {
                errorDetails = `\nДетали: ${errorBody.details}`;
              }
              if (errorBody.available_keys) {
                errorDetails += `\nДоступные ключи: ${errorBody.available_keys.join(', ')}`;
              }
            }
          } catch (e) {
            console.warn("[BoostShop] Cannot parse error context:", e);
          }
        }
        
        toast({
          title: '❌ Ошибка',
          description: `${errorMessage}${errorDetails}`,
          variant: 'destructive',
          duration: 6000,
        });
        return;
      }

      if (data?.error) {
        console.error("[BoostShop] Error in response:", data);
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : JSON.stringify(data.error);
        const errorDetails = data.details 
          ? `\nДетали: ${data.details}` 
          : '';
        const availableKeys = data.available_keys 
          ? `\nДоступные ключи: ${data.available_keys.join(', ')}` 
          : '';
        
        toast({
          title: '❌ Ошибка',
          description: `${errorMessage}${errorDetails}${availableKeys}`,
          variant: 'destructive',
          duration: 6000,
        });
        return;
      }

      if (!data?.url) {
        console.error("[BoostShop] No URL in response:", data);
        toast({
          title: '❌ Ошибка',
          description: 'Не удалось получить ссылку на оплату',
          variant: 'destructive',
        });
        return;
      }

      // Открываем Stripe Checkout в попапе
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const popup = window.open(
        data.url,
        'Stripe Checkout',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        toast({
          title: '⚠️ Внимание',
          description: 'Пожалуйста, разрешите открытие всплывающих окон для этого сайта',
          variant: 'destructive',
        });
        return;
      }

      // Слушаем сообщения от попапа
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data?.type === 'STRIPE_SUCCESS') {
          // Покупка успешна, проверяем статус
          setTimeout(async () => {
            await checkPurchaseStatus();
          }, 2000);
        } else if (event.data?.type === 'STRIPE_CANCEL') {
          // Покупка отменена
          toast({
            title: 'ℹ️ Оплата отменена',
            description: 'Вы можете попробовать снова в любое время',
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Отслеживаем закрытие попапа и проверяем статус покупки
      const checkPurchaseStatus = async () => {
        try {
          // Проверяем последнюю покупку пользователя
          const { data: purchases } = await supabase
            .from('purchases')
            .select('id, status, metadata, stripe_session_id, created_at')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(5);

          if (purchases && purchases.length > 0) {
            // Ищем последнюю покупку (pending или completed)
            const lastPurchase = purchases[0];
            
            // Если покупка pending, пытаемся обработать её вручную
            if (lastPurchase.status === 'pending' && lastPurchase.stripe_session_id) {
              console.log("[BoostShop] Found pending purchase, attempting to process:", lastPurchase.stripe_session_id);
              
              try {
                const { data: processData, error: processError } = await supabase.functions.invoke("process-purchase", {
                  body: { 
                    session_id: lastPurchase.stripe_session_id,
                    user_id: profileId 
                  },
                });

                if (processError) {
                  console.error("[BoostShop] Error processing purchase:", processError);
                } else if (processData?.success) {
                  console.log("[BoostShop] Purchase processed successfully:", processData);
                  await loadData(); // Обновляем баланс
                  
                  const coinsAmount = processData.coins_added || lastPurchase.metadata?.coins || 0;
                  if (coinsAmount > 0) {
                    toast({
                      title: '✅ Покупка успешна!',
                      description: `Вы получили ${coinsAmount} монет`,
                      duration: 5000,
                    });
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 3000);
                    return true;
                  }
                }
              } catch (processErr) {
                console.error("[BoostShop] Exception processing purchase:", processErr);
              }
            }
            
            // Ищем покупку со статусом completed, созданную недавно (последние 5 минут)
            const recentCompleted = purchases.find(p => 
              p.status === 'completed' && 
              new Date(p.created_at).getTime() > Date.now() - 5 * 60 * 1000
            );

            if (recentCompleted) {
              const coinsAmount = recentCompleted.metadata?.coins || 0;
              if (coinsAmount > 0) {
                await loadData(); // Обновляем баланс
                toast({
                  title: '✅ Покупка успешна!',
                  description: `Вы получили ${coinsAmount} монет`,
                  duration: 5000,
                });
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
                return true; // Покупка найдена
              }
            }
          }
          return false;
        } catch (error) {
          console.error("[BoostShop] Error checking purchase status:", error);
          return false;
        }
      };

      // Проверяем статус покупки каждую секунду после закрытия попапа
      const checkInterval = setInterval(async () => {
        try {
          // Проверяем, закрыт ли попап
          if (popup.closed) {
            clearInterval(checkInterval);
            
            // Даем время webhook обработаться (2 секунды)
            setTimeout(async () => {
              let attempts = 0;
              const maxAttempts = 10; // Проверяем до 10 раз (10 секунд)
              
              const statusCheckInterval = setInterval(async () => {
                attempts++;
                const found = await checkPurchaseStatus();
                
                if (found || attempts >= maxAttempts) {
                  clearInterval(statusCheckInterval);
                  if (!found && attempts >= maxAttempts) {
                    // Если покупка не найдена, просто обновляем данные
                    await loadData();
                  }
                }
              }, 1000);
            }, 2000);
          }
        } catch (error) {
          console.error("[BoostShop] Error checking popup:", error);
        }
      }, 500);

      // Очищаем интервал через 5 минут (на случай если попап не закрылся)
      setTimeout(() => {
        clearInterval(checkInterval);
        window.removeEventListener('message', handleMessage);
      }, 5 * 60 * 1000);

    } catch (err: any) {
      console.error("[BoostShop] Purchase error:", err);
      toast({
        title: '❌ Ошибка',
        description: err?.message || 'Произошла ошибка при создании покупки',
        variant: 'destructive',
      });
    }
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
      // Проверяем, что profileId действительно существует в базе
      if (!profileId) {
        throw new Error('profileId не установлен. Пожалуйста, обновите страницу и войдите снова.');
      }

      console.log('[BoostShop] Начало покупки:', { 
        profileId, 
        boostType: boost.type, 
        cost: boost.cost_coins, 
        currentCoins: coins 
      });

      // Проверяем существование профиля перед покупкой
      const { data: profileCheck, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, coins')
        .eq('id', profileId)
        .single();

      if (profileCheckError || !profileCheck) {
        console.error('[BoostShop] Профиль не найден:', profileCheckError);
        throw new Error(`Профиль не найден: ${profileCheckError?.message || 'Неизвестная ошибка'}. Пожалуйста, обновите страницу и войдите снова.`);
      }

      console.log('[BoostShop] Профиль найден, текущий баланс:', profileCheck.coins);

      // Используем функцию increment_profile_value для списания монет
      // Она использует SECURITY DEFINER и обходит RLS проблемы
      const { data: coinsData, error: coinsError } = await supabase.rpc('increment_profile_value', {
        p_profile_id: profileId,
        p_column: 'coins',
        p_amount: -boost.cost_coins
      });

      if (coinsError) {
        console.error('[BoostShop] Ошибка списания монет:', coinsError);
        console.error('[BoostShop] Детали ошибки списания:', {
          code: coinsError.code,
          message: coinsError.message,
          details: coinsError.details,
          hint: coinsError.hint
        });
        throw new Error(`Не удалось списать монеты: ${coinsError.message || coinsError.code || 'Неизвестная ошибка'}`);
      }

      console.log('[BoostShop] Монеты списаны успешно, результат:', coinsData);

      // Добавляем буст в инвентарь используя функцию modify_boost_inventory
      // Это более надежный способ, который обходит RLS проблемы
      const { data: inventoryData, error: inventoryError } = await supabase.rpc('modify_boost_inventory', {
        p_user_id: profileId,
        p_boost_type: boost.type,
        p_change: 1
      });

      if (inventoryError) {
        console.error('[BoostShop] Ошибка добавления буста в инвентарь:', inventoryError);
        console.error('[BoostShop] Детали ошибки инвентаря:', {
          code: inventoryError.code,
          message: inventoryError.message,
          details: inventoryError.details,
          hint: inventoryError.hint
        });
        
        // Откатываем списание монет при ошибке
        const { error: rollbackError } = await supabase.rpc('increment_profile_value', {
          p_profile_id: profileId,
          p_column: 'coins',
          p_amount: boost.cost_coins
        });
        
        if (rollbackError) {
          console.error('[BoostShop] Ошибка отката монет:', rollbackError);
        }
        
        throw new Error(`Не удалось добавить буст в инвентарь: ${inventoryError.message || inventoryError.code || 'Неизвестная ошибка'}`);
      }

      console.log('[BoostShop] Буст добавлен в инвентарь успешно, результат:', inventoryData);

      // Анимации и звуки
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      sounds.correctAnswer();
      haptics.boostActivated();

      // Обновляем данные без скрытия контента
      setIsRefreshing(true);
      try {
        // Обновляем баланс монет
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('coins')
          .eq('id', profileId)
          .single();

        if (updatedProfile) {
          setCoins(updatedProfile.coins || 0);
        }

        // Обновляем инвентарь
        const { data: updatedInventory } = await supabase
          .from('boost_inventory')
          .select('boost_type, quantity')
          .eq('user_id', profileId);

        if (updatedInventory) {
          setInventory(updatedInventory);
        }
      } catch (error) {
        console.error('[BoostShop] Ошибка обновления данных:', error);
        // При ошибке обновления все равно перезагружаем полностью
        await loadData();
      } finally {
        setIsRefreshing(false);
      }

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

  // Контент модалки с skeleton
  const ModalContent = () => {
    if (loading) {
      return <ModalSkeleton variant="shop" />;
    }
    
    return (
      <>
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
        <DialogHeader className="px-3 md:px-4 py-2 md:py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
              <DialogTitle className="text-base md:text-lg font-semibold truncate">Магазин</DialogTitle>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Popover open={showHistory} onOpenChange={setShowHistory}>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={async () => {
                      setShowHistory(true);
                      if (transactions.length === 0) {
                        await loadTransactionHistory();
                      }
                    }}
                  >
                <Coins className="w-4 h-4 text-gold" />
                <span className="text-sm font-semibold">{coins}</span>
                    <History className="w-3 h-3 text-muted-foreground ml-0.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 max-w-96 p-0" align="end">
                  <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold flex items-center gap-2">
                        <History className="h-4 w-4" />
                        История монет
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {transactions.length} операций
                      </span>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        variant={filterCategory === 'all' ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilterCategory('all')}
                      >
                        Все
                      </Button>
                      <Button
                        variant={filterCategory === 'earn' ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilterCategory('earn')}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Доходы
                      </Button>
                      <Button
                        variant={filterCategory === 'spend' ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilterCategory('spend')}
                      >
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Расходы
                      </Button>
                      <Button
                        variant={filterCategory === 'purchase' ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilterCategory('purchase')}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Покупки
                      </Button>
                      <Button
                        variant={filterCategory === 'reward' ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setFilterCategory('reward')}
                      >
                        <Gift className="h-3 w-3 mr-1" />
                        Награды
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-[500px] overflow-y-auto p-2">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : (() => {
                      const filtered = filterCategory === 'all' 
                        ? transactions 
                        : transactions.filter(tx => tx.category === filterCategory);
                      
                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-12 text-muted-foreground">
                              <div className="space-y-3">
                                {filterCategory === 'all' ? (
                                  <>
                                    <Coins className="h-12 w-12 mx-auto opacity-30" />
                                    <div>
                                      <p className="text-sm font-medium mb-1">Здесь появятся твои транзакции</p>
                                      <p className="text-xs">Начни зарабатывать монеты, проходя тесты и дуэли!</p>
                                    </div>
                                    {!isPremium && (
                                      <div className="pt-2">
                                        <Badge variant="secondary" className="text-xs">
                                          💡 Premium удваивает награды
                                        </Badge>
                                      </div>
                                    )}
                                  </>
                                ) : filterCategory === 'earn' ? (
                                  <>
                                    <TrendingUp className="h-12 w-12 mx-auto opacity-30" />
                                    <div>
                                      <p className="text-sm font-medium mb-1">Нет доходов</p>
                                      <p className="text-xs">Проходи тесты, выигрывай дуэли и получай ежедневные бонусы!</p>
                                    </div>
                                  </>
                                ) : filterCategory === 'spend' ? (
                                  <>
                                    <TrendingDown className="h-12 w-12 mx-auto opacity-30" />
                                    <div>
                                      <p className="text-sm font-medium mb-1">Нет расходов</p>
                                      <p className="text-xs">Покупай бусты и используй их для улучшения результатов!</p>
                                    </div>
                                  </>
                                ) : filterCategory === 'purchase' ? (
                                  <>
                                    <CreditCard className="h-12 w-12 mx-auto opacity-30" />
                                    <div>
                                      <p className="text-sm font-medium mb-1">Нет покупок</p>
                                      <p className="text-xs">Пополни баланс монет или получи Premium для больше возможностей!</p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Gift className="h-12 w-12 mx-auto opacity-30" />
                                    <div>
                                      <p className="text-sm font-medium mb-1">Нет наград</p>
                                      <p className="text-xs">Получай награды за Duel Pass, рефералов и достижения!</p>
                                    </div>
                                  </>
                                )}
                                {filterCategory !== 'all' && (
                                  <p className="text-xs mt-2 pt-2 border-t border-border/50">Попробуйте другой фильтр</p>
                                )}
                              </div>
                            </div>
                          );
                        }
                      
                      return (
                        <div className="space-y-1">
                          {filtered.map((tx, idx) => {
                            const IconComponent = tx.icon || (tx.amount > 0 ? TrendingUp : TrendingDown);
                            return (
                              <motion.div
                                key={tx.id || idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                                    tx.amount > 0 
                                      ? 'bg-green-500/10 text-green-600' 
                                      : 'bg-red-500/10 text-red-600'
                                  }`}>
                                    <IconComponent className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{tx.description}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(tx.created_at).toLocaleDateString('ru', { 
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit' 
                                        })}
                                      </p>
                                      {tx.category && tx.category !== 'earn' && tx.category !== 'spend' && (
                                        <Badge variant="secondary" className="text-xs h-4 px-1.5">
                                          {tx.category === 'purchase' ? 'Покупка' : tx.category === 'reward' ? 'Награда' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-sm font-bold flex-shrink-0 ml-2 ${
                                  tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
              
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

        <div className="relative">
          {isRefreshing && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
              <TabsTrigger value="boosts" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Бусты
              </TabsTrigger>
              <TabsTrigger value="coins" className="text-xs">
                <Coins className="w-3 h-3 mr-1" />
                Монеты
              </TabsTrigger>
              <TabsTrigger value="premium" className="text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </TabsTrigger>
            </TabsList>

            {/* Boosts Tab */}
            <TabsContent value="boosts" className="p-3 md:p-4 space-y-3 mt-3 md:mt-4">
              <>
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

                  {boosts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Бусты скоро появятся</p>
                    </div>
                  )}
              </>
            </TabsContent>

            {/* Coins Tab */}
            <TabsContent value="coins" className="p-3 md:p-4 space-y-3 mt-3 md:mt-4">
              <div className="space-y-3">
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">Пополните баланс монет</p>
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="w-6 h-6 text-yellow-500" />
                    <span className="text-2xl font-bold">{coins}</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    { amount: 100, price: '€2.99', bonus: 0, catalogKey: 'coins_pack_100' },
                    { amount: 500, price: '€9.99', bonus: 50, catalogKey: 'coins_pack_500' },
                    { amount: 1200, price: '€19.99', bonus: 200, catalogKey: 'coins_pack_1200' },
                    { amount: 3000, price: '€39.99', bonus: 500, catalogKey: 'coins_pack_3000' },
                  ].map((pack, idx) => (
                    <Card key={idx} className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                            <Coins className="w-6 h-6 text-yellow-500" />
                          </div>
                          <div>
                            <p className="font-semibold">{pack.amount} монет</p>
                            {pack.bonus > 0 && (
                              <Badge variant="secondary" className="text-xs mt-0.5">
                                +{pack.bonus} бонус
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{pack.price}</p>
                          <Button 
                            size="sm" 
                            onClick={() => handleCoinPurchase(pack.catalogKey)}
                            className="mt-1"
                            disabled={!profileId}
                          >
                            Купить
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  <p>💡 Получайте больше монет с Premium</p>
                </div>
              </div>
            </TabsContent>

            {/* Premium & Duel Pass Tab */}
            <TabsContent value="premium" className="p-3 md:p-4 space-y-3 mt-3 md:mt-4">
              <div className="space-y-4">
                {/* Premium Subscription */}
                <Card className="p-4 md:p-5 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-500/10 border-2 border-yellow-500/20">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                        <h3 className="text-base md:text-lg font-bold">Premium подписка</h3>
                      </div>
                      {isPremium && (
                        <Badge className="bg-green-500">Активна</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Безлимитный доступ ко всем тестам</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>+50% монет за обучение</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Duel Pass Premium награды</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Без рекламы и мгновенные подсказки</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <Card className="p-3 border-primary/30">
                        <p className="text-xs text-muted-foreground mb-1">Месяц</p>
                        <p className="text-base md:text-lg font-bold">€9.99</p>
                        <Button 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => setPaywallOpen(true)}
                          disabled={isPremium}
                        >
                          {isPremium ? 'Активна' : 'Выбрать'}
                        </Button>
                      </Card>
                      <Card className="p-3 border-yellow-500/50 bg-yellow-500/5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">Год</p>
                          <Badge className="text-xs bg-yellow-500">-50%</Badge>
                        </div>
                        <p className="text-base md:text-lg font-bold">€59.99</p>
                        <Button 
                          size="sm" 
                          className="w-full mt-2 bg-gradient-to-r from-yellow-500 to-orange-500"
                          onClick={() => setPaywallOpen(true)}
                          disabled={isPremium}
                        >
                          {isPremium ? 'Активна' : 'Выбрать'}
                        </Button>
                      </Card>
                    </div>
                  </div>
                </Card>

                {/* Duel Pass */}
                <Card className="p-4 md:p-5 border-2 border-primary/20">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                      <h3 className="text-base md:text-lg font-bold">Duel Pass</h3>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Получайте эксклюзивные награды за каждый уровень! Premium удваивает все награды.
                    </p>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // TODO: Navigate to Duel Pass or show Duel Pass modal
                        toast({ title: 'Duel Pass', description: 'Откройте Duel Pass на главной странице' });
                      }}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Открыть Duel Pass
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={getDialogContentClasses('shop', isMobile)} hideCloseButton>
          <div className="flex-1 overflow-y-auto">
            <ModalContent />
          </div>
        </DialogContent>
      </Dialog>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
