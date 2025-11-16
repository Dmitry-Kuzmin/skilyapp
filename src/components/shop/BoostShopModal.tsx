import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, X, ShoppingBag, TrendingUp, TrendingDown, History, Gift, Trophy, TestTube, Zap, Calendar, CreditCard, Users, Filter, Crown, Sparkles, Check, Star } from 'lucide-react';
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
import { getDialogContentClasses, getSheetContentClasses, shouldUseSheet } from '@/lib/modal-config';
import { useIsMobile } from '@/hooks/use-mobile';
import { isTelegramMiniApp } from '@/lib/telegram';
import { cn } from '@/lib/utils';

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
  const { profileId, platform } = useUserContext();
  const { isPremium } = usePremium();
  const isMobile = useIsMobile();
  // Определяем Telegram СТРОГО - только если действительно в Telegram Web App
  // В браузере (не Telegram) isTelegramMiniApp() должен вернуть false
  // Используем ТОЛЬКО isTelegramMiniApp() для надежности, игнорируем platform из контекста
  const isTelegram = isTelegramMiniApp();
  
  // Дополнительная проверка: если нет window.Telegram?.WebApp, то точно не Telegram
  const hasTelegramWebApp = typeof window !== 'undefined' && !!window.Telegram?.WebApp;
  
  // Финальная строгая проверка: должны быть И isTelegram И hasTelegramWebApp
  // Также проверяем, что есть реальные данные пользователя (не мок)
  const hasTelegramUser = typeof window !== 'undefined' && 
                          !!window.Telegram?.WebApp?.initDataUnsafe?.user;
  const hasTelegramInitData = typeof window !== 'undefined' && 
                              !!window.Telegram?.WebApp?.initData &&
                              window.Telegram.WebApp.initData !== '';
  
  // isTelegramStrict = true только если ВСЕ условия выполнены
  const isTelegramStrict = isTelegram && 
                          hasTelegramWebApp && 
                          (hasTelegramUser || hasTelegramInitData);
  
  // Sheet используется ТОЛЬКО в Telegram Web App (со свайпом снизу)
  // В браузере (включая мобильный) всегда используем Dialog по центру
  const useSheet = shouldUseSheet(isMobile, isTelegramStrict);
  
  // Логирование для отладки (только при первом рендере, чтобы не спамить)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && open) {
      console.log('[BoostShop] Platform detection:', {
        platform,
        isMobile,
        isTelegram,
        isTelegramStrict,
        useSheet,
        hasTelegramWebApp,
        telegramPlatform: typeof window !== 'undefined' && window.Telegram?.WebApp?.platform,
        telegramInitData: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData,
        telegramUser: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initDataUnsafe?.user
      });
    }
  }, [open]); // Только при открытии модалки
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
      // Всегда перезагружаем данные при открытии модалки
      // Это гарантирует актуальность инвентаря и баланса
      loadData();
      // Также загружаем историю транзакций при открытии
      if (profileId && transactions.length === 0) {
        loadTransactionHistory();
      }
    }
  }, [open, profileId]); // Добавляем profileId в зависимости для перезагрузки при смене пользователя

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

      // Загрузка инвентаря - используем более надежный запрос
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('boost_inventory')
        .select('boost_type, quantity')
        .eq('user_id', profileId)
        .order('boost_type', { ascending: true });

      if (inventoryError) {
        console.error('[BoostShop] Ошибка загрузки инвентаря:', inventoryError);
        console.error('[BoostShop] Детали ошибки инвентаря:', {
          code: inventoryError.code,
          message: inventoryError.message,
          details: inventoryError.details,
          hint: inventoryError.hint
        });
      } else if (inventoryData) {
        console.log('[BoostShop] Инвентарь загружен:', inventoryData);
        setInventory(inventoryData);
      } else {
        console.log('[BoostShop] Инвентарь пуст для пользователя:', profileId);
        setInventory([]);
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
      'coins_spent_boost': { icon: Zap, desc: `Покупка буста: ${metadata?.boost_name || metadata?.boost_type || 'Буст'}`, cat: 'spend' },
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
      
      // 1. Load new transactions table (monetization system) using RPC function
      // Используем RPC функцию для обхода RLS политики (работает для Telegram пользователей)
      const { data: newTransactions, error: transactionsError } = await supabase.rpc('get_user_transactions', {
        p_user_id: profileId,
        p_limit: 100
      });
      
      if (transactionsError) {
        console.error('[BoostShop] Ошибка загрузки транзакций через RPC:', transactionsError);
        // Fallback: пытаемся загрузить напрямую (может не работать для Telegram)
        const { data: fallbackTransactions } = await supabase
          .from('transactions')
          .select('id, amount, transaction_type, metadata, created_at')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (fallbackTransactions) {
          fallbackTransactions.forEach(tx => {
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
      } else if (newTransactions) {
        console.log('[BoostShop] Загружено транзакций через RPC:', newTransactions.length);
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

  const handleCoinPurchaseStars = async (catalogKey: string, coinsAmount: number) => {
    if (!profileId || !isTelegram) {
      toast({
        title: '❌ Ошибка',
        description: 'Telegram Stars доступны только в Telegram Web App',
        variant: 'destructive',
      });
      return;
    }

    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      toast({
        title: '❌ Ошибка',
        description: 'Telegram WebApp не найден',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Маппинг catalog_key на package_key для Telegram Stars
      const packageKeyMap: Record<string, string> = {
        'coins_pack_100': 'coins_100',
        'coins_pack_500': 'coins_500',
        'coins_pack_1200': 'coins_1200',
        'coins_pack_3000': 'coins_3000',
      };

      const packageKey = packageKeyMap[catalogKey];
      if (!packageKey) {
        toast({
          title: '❌ Ошибка',
          description: 'Неизвестный пакет монет',
          variant: 'destructive',
        });
        return;
      }

      const telegramUserId = webApp.initDataUnsafe?.user?.id;
      if (!telegramUserId) {
        console.error("[BoostShop] Telegram user ID not found:", {
          hasWebApp: !!webApp,
          hasInitDataUnsafe: !!webApp.initDataUnsafe,
          initDataUnsafe: webApp.initDataUnsafe,
          user: webApp.initDataUnsafe?.user
        });
        
        toast({
          title: '❌ Ошибка',
          description: 'Не удалось получить ID пользователя Telegram. Попробуйте оплатить через Stripe или обновите страницу.',
          variant: 'destructive',
          duration: 6000,
        });
        return;
      }

      console.log("[BoostShop] Creating Telegram Stars invoice:", { profileId, packageKey, telegramUserId });

      const { data, error } = await supabase.functions.invoke("telegram-stars-payment", {
        body: {
          action: 'create_invoice',
          user_id: profileId,
          package_key: packageKey,
          telegram_user_id: telegramUserId,
        },
      });

      if (error) {
        console.error("[BoostShop] Stars payment error:", error);
        toast({
          title: '❌ Ошибка',
          description: error.message || 'Не удалось создать invoice',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        console.error("[BoostShop] Error in Stars response:", data);
        toast({
          title: '❌ Ошибка',
          description: data.error || 'Ошибка создания invoice',
          variant: 'destructive',
        });
        return;
      }

      if (!data?.invoice_link) {
        console.error("[BoostShop] No invoice_link in response:", data);
        toast({
          title: '❌ Ошибка',
          description: 'Не удалось получить ссылку на оплату',
          variant: 'destructive',
        });
        return;
      }

      // Открываем invoice через Telegram WebApp
      webApp.openInvoice(data.invoice_link, (status: string) => {
        console.log("[BoostShop] Invoice status:", status);
        if (status === 'paid') {
          // Обновляем данные после успешной оплаты
          setTimeout(async () => {
            await loadData();
            toast({
              title: '✅ Покупка успешна!',
              description: `Вы получили ${coinsAmount} монет`,
              duration: 5000,
            });
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
          }, 2000);
        } else if (status === 'cancelled') {
          toast({
            title: 'ℹ️ Оплата отменена',
            description: 'Вы можете попробовать снова в любое время',
          });
        } else if (status === 'failed') {
          toast({
            title: '❌ Ошибка оплаты',
            description: 'Попробуйте позже или используйте другой способ оплаты',
            variant: 'destructive',
          });
        }
      });
    } catch (err: any) {
      console.error("[BoostShop] Stars purchase error:", err);
      toast({
        title: '❌ Ошибка',
        description: err?.message || 'Произошла ошибка при создании покупки',
        variant: 'destructive',
      });
    }
  };

  const handleCoinPurchase = async (catalogKey: string, paymentMethod: 'stripe' | 'stars' = 'stripe') => {
    if (!profileId) {
      toast({
        title: '❌ Ошибка',
        description: 'Необходимо войти в систему',
        variant: 'destructive',
      });
      return;
    }

    // Если выбрана оплата через Stars (только в Telegram)
    if (paymentMethod === 'stars' && isTelegram) {
      const coinsMap: Record<string, number> = {
        'coins_pack_100': 100,
        'coins_pack_500': 550,
        'coins_pack_1200': 1400,
        'coins_pack_3000': 3500,
      };
      const coinsAmount = coinsMap[catalogKey] || 0;
      await handleCoinPurchaseStars(catalogKey, coinsAmount);
      return;
    }

    // По умолчанию используем Stripe (работает и в браузере, и в Telegram)

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

      // Используем redirect вместо popup для избежания блокировки браузера
      // В Telegram Web App используем window.open для нативного опыта
      if (isTelegram && window.Telegram?.WebApp) {
        // В Telegram пробуем открыть в новой вкладке
        const popup = window.open(data.url, '_blank');
        if (!popup) {
          // Если popup заблокирован, используем redirect
          window.location.href = data.url;
        }
      } else {
        // В браузере всегда используем redirect
        window.location.href = data.url;
      }
      
      return; // Прерываем выполнение, так как происходит redirect

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

    // Оптимистичное обновление UI - сразу обновляем состояние для мгновенной реакции
    const newCoins = coins - boost.cost_coins;
    const currentInventoryCount = getInventoryCount(boost.type);
    const newInventory = [...inventory];
    const existingBoostIndex = newInventory.findIndex(i => i.boost_type === boost.type);
    
    if (existingBoostIndex >= 0) {
      newInventory[existingBoostIndex] = {
        ...newInventory[existingBoostIndex],
        quantity: newInventory[existingBoostIndex].quantity + 1
      };
    } else {
      newInventory.push({
        boost_type: boost.type,
        quantity: 1
      });
    }

    // Применяем оптимистичные обновления
    setCoins(newCoins);
    setInventory(newInventory);
    setIsRefreshing(true);

    // Анимации и звуки сразу для лучшего UX
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    sounds.correctAnswer();
    haptics.boostActivated();

    // Показываем успешное сообщение сразу
    toast({
      title: '✅ Покупка успешна!',
      description: `${boost.name_ru} добавлен в инвентарь`,
    });

    try {
      console.log('[BoostShop] Начало покупки:', { 
        profileId, 
        boostType: boost.type, 
        cost: boost.cost_coins, 
        currentCoins: coins 
      });

      // Выполняем операции параллельно для скорости
      const [coinsResult, inventoryResult, transactionResult] = await Promise.allSettled([
        // Списание монет
        supabase.rpc('increment_profile_value', {
          p_profile_id: profileId,
          p_column: 'coins',
          p_amount: -boost.cost_coins
        }),
        // Добавление буста в инвентарь
        supabase.rpc('modify_boost_inventory', {
          p_user_id: profileId,
          p_boost_type: boost.type,
          p_change: 1
        }),
        // Создание транзакции (не критично, можно пропустить)
        supabase.rpc('create_transaction', {
          p_user_id: profileId,
          p_transaction_type: 'coins_spent_boost',
          p_amount: -boost.cost_coins,
          p_metadata: {
            boost_type: boost.type,
            boost_name: boost.name_ru,
          }
        }).catch(err => {
          console.warn('[BoostShop] Транзакция не создана (не критично):', err);
          return { error: null }; // Игнорируем ошибку транзакции
        })
      ]);

      // Проверяем результаты
      if (coinsResult.status === 'rejected' || (coinsResult.status === 'fulfilled' && coinsResult.value.error)) {
        const error = coinsResult.status === 'rejected' ? coinsResult.reason : coinsResult.value.error;
        console.error('[BoostShop] Ошибка списания монет:', error);
        // Откатываем оптимистичное обновление
        setCoins(coins);
        setInventory(inventory);
        throw new Error(`Не удалось списать монеты: ${error?.message || 'Неизвестная ошибка'}`);
      }

      if (inventoryResult.status === 'rejected' || (inventoryResult.status === 'fulfilled' && inventoryResult.value.error)) {
        const error = inventoryResult.status === 'rejected' ? inventoryResult.reason : inventoryResult.value.error;
        console.error('[BoostShop] Ошибка добавления буста в инвентарь:', error);
        
        // Откатываем монеты
        await supabase.rpc('increment_profile_value', {
          p_profile_id: profileId,
          p_column: 'coins',
          p_amount: boost.cost_coins
        }).catch(rollbackErr => {
          console.error('[BoostShop] Ошибка отката монет:', rollbackErr);
        });
        
        // Откатываем оптимистичное обновление
        setCoins(coins);
        setInventory(inventory);
        throw new Error(`Не удалось добавить буст в инвентарь: ${error?.message || 'Неизвестная ошибка'}`);
      }

      console.log('[BoostShop] ✅ Покупка завершена успешно');

      // Обновляем данные в фоне (не блокируем UI)
      // Используем небольшую задержку для гарантии консистентности БД
      setTimeout(async () => {
        try {
          // Параллельно загружаем актуальные данные
          const [profileData, inventoryData] = await Promise.all([
            supabase
              .from('profiles')
              .select('coins')
              .eq('id', profileId)
              .single(),
            supabase
              .from('boost_inventory')
              .select('boost_type, quantity')
              .eq('user_id', profileId)
          ]);

          // Обновляем состояние только если данные изменились
          if (profileData.data && profileData.data.coins !== newCoins) {
            console.log('[BoostShop] Синхронизация баланса:', profileData.data.coins);
            setCoins(profileData.data.coins);
          }

          if (inventoryData.data) {
            console.log('[BoostShop] Синхронизация инвентаря:', inventoryData.data);
            setInventory(inventoryData.data);
          }

          // Обновляем историю транзакций в фоне
          loadTransactionHistory().catch(err => {
            console.warn('[BoostShop] Ошибка обновления истории (не критично):', err);
          });
        } catch (syncError) {
          console.warn('[BoostShop] Ошибка синхронизации данных (не критично):', syncError);
          // Не показываем ошибку пользователю - покупка уже успешна
        } finally {
          setIsRefreshing(false);
        }
      }, 300); // Уменьшена задержка с 500ms до 300ms

    } catch (error: any) {
      console.error('[BoostShop] Ошибка покупки:', error);
      
      // Откатываем оптимистичные обновления
      setCoins(coins);
      setInventory(inventory);
      setIsRefreshing(false);
      
      const errorMessage = error?.message || error?.error?.message || 'Неизвестная ошибка';
      
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
      <div className="w-full max-w-full overflow-x-hidden">
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
        {useSheet ? (
          <SheetHeader className="px-3 md:px-4 py-2 md:py-3 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                <SheetTitle className="text-base md:text-lg font-semibold truncate">Магазин</SheetTitle>
              </div>
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
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
          </SheetHeader>
        ) : (
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
        )}

        <div className="relative">
          {isRefreshing && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full px-4">
            <TabsList className="grid w-full grid-cols-3 mt-4">
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
                          {isTelegramStrict ? (
                            // В Telegram Web App показываем обе опции оплаты
                            <div className="flex flex-col gap-1.5 mt-1">
                              <Button 
                                size="sm" 
                                onClick={() => handleCoinPurchase(pack.catalogKey, 'stripe')}
                                className="w-full"
                                disabled={!profileId}
                                variant="default"
                              >
                                <CreditCard className="w-3 h-3 mr-1" />
                                Stripe
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleCoinPurchase(pack.catalogKey, 'stars')}
                                className="w-full"
                                disabled={!profileId}
                                variant="outline"
                              >
                                <Star className="w-3 h-3 mr-1" />
                                Stars
                              </Button>
                            </div>
                          ) : (
                            // В браузере только Stripe (кнопка Stars не показывается)
                            <Button 
                              size="sm" 
                              onClick={() => handleCoinPurchase(pack.catalogKey, 'stripe')}
                              className="mt-1"
                              disabled={!profileId}
                            >
                              Купить
                            </Button>
                          )}
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
      </div>
    );
  };

  // Используем Sheet для мобильных/Telegram, Dialog для десктопа
  if (useSheet) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent 
            side="bottom" 
            hideCloseButton
            className={cn(
              getSheetContentClasses('shop', isMobile),
              // Убираем пустое пространство снизу для Telegram Web App
              'pb-0 rounded-t-2xl'
            )}
          >
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <ModalContent />
            </div>
          </SheetContent>
        </Sheet>
        <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={getDialogContentClasses('shop', isMobile)} hideCloseButton>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <ModalContent />
          </div>
        </DialogContent>
      </Dialog>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
