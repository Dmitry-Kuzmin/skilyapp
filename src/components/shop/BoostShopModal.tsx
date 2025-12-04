import { useState, useEffect, useRef } from 'react';
import { UnifiedModal } from '@/components/ui/unified-modal';
import { useModalRoute } from '@/hooks/useModalRoute';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, X, ShoppingBag, TrendingUp, TrendingDown, History, Gift, Trophy, TestTube, Zap, Calendar, CreditCard, Users, Filter, Crown, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import Confetti from 'react-confetti';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { BoostCard } from './BoostCard';
// Removed framer-motion import for better performance
import { PaywallModal } from '@/components/monetization/PaywallModal';
import { usePremium } from '@/hooks/usePremium';
import { StarsPaymentButton } from '@/components/monetization/StarsPaymentButton';
import { CryptomusPaymentPreview } from '@/components/monetization/CryptomusPaymentPreview';
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram';
import { dispatchUserEvent } from '@/lib/notification-events';
import { PAYMENT_CONFIG, isPaymentMethodAvailable } from '@/lib/payment-config';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { trackOfflineAction } from '@/utils/offlineAnalytics';

const supabaseClient = supabase as any;

const localeMap: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
  ru: 'ru-RU',
};

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
  const { t, language } = useLanguage();
  const dateLocale = localeMap[language] || 'en-US';
  const { enqueue: enqueueOfflineAction } = useOfflineQueue(profileId);
  // UnifiedModal сам синхронизирует с URL через modalRouteKey
  // Используем isTelegramMiniApp() для более надежного определения Telegram Mini App
  const currentPlatform = platform === 'telegram' ? 'telegram' : 'web';
  const showStarsPayment = isPaymentMethodAvailable('telegram_stars', currentPlatform);
  const showStripePayment = isPaymentMethodAvailable('stripe', currentPlatform);
  const showCryptomusPayment = isPaymentMethodAvailable('cryptomus', currentPlatform);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [inventory, setInventory] = useState<BoostInventory[]>([]);
  const [coins, setCoins] = useState(0);
  
  // Состояние для предварительного экрана Cryptomus
  const [cryptomusPreview, setCryptomusPreview] = useState<{
    open: boolean;
    paymentUrl: string;
    orderId: string;
    amount: number;
    currency: string;
    itemName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'earn' | 'spend' | 'purchase' | 'reward'>('all');
  const [activeTab, setActiveTab] = useState<'boosts' | 'coins' | 'premium' | 'history'>('boosts');
  const [paywallOpen, setPaywallOpen] = useState(false);

  const translateBoostField = (boostType: string | undefined, field: 'name' | 'description', fallback?: string) => {
    if (!boostType) {
      return fallback || '';
    }
    const translationKey = `boostShop.boostNames.${boostType}.${field}`;
    const translated = t(translationKey);
    if (translated === translationKey) {
      return fallback ?? boostType;
    }
    return translated;
  };

  const formatTransactionDate = (date: string) => {
    return new Date(date).toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPremiumTypeLabel = (subType: string) => {
    const key = `boostShop.transactions.premiumType.${subType}`;
    const label = t(key);
    return label === key ? subType : label;
  };

  const getPremiumPurchaseDescription = (subType: string, price?: number) => {
    const description = t('boostShop.transactions.premiumPurchase', { type: getPremiumTypeLabel(subType) });
    return price ? `${description} - €${price}` : description;
  };

  const coinPacks = [
    {
      amount: 100,
      price: '€2.99',
      priceValue: 2.99,
      bonus: 0,
      catalogKey: 'coins_pack_100',
      packageKey: 'coins_100',
      priceCoins: 100,
      descriptionKey: 'boostShop.coins.descriptions.starter',
      helperKey: 'boostShop.coins.helpers.starter',
    },
    {
      amount: 500,
      price: '€9.99',
      priceValue: 9.99,
      bonus: 50,
      catalogKey: 'coins_pack_500',
      packageKey: 'coins_500',
      priceCoins: 550,
      descriptionKey: 'boostShop.coins.descriptions.grinder',
      helperKey: 'boostShop.coins.helpers.grinder',
    },
    {
      amount: 1200,
      price: '€19.99',
      priceValue: 19.99,
      bonus: 200,
      catalogKey: 'coins_pack_1200',
      packageKey: 'coins_1200',
      priceCoins: 1400,
      descriptionKey: 'boostShop.coins.descriptions.pro',
      helperKey: 'boostShop.coins.helpers.pro',
    },
    {
      amount: 3000,
      price: '€39.99',
      priceValue: 39.99,
      bonus: 500,
      catalogKey: 'coins_pack_3000',
      packageKey: 'coins_3000',
      priceCoins: 3500,
      highlight: true,
      descriptionKey: 'boostShop.coins.descriptions.elite',
      helperKey: 'boostShop.coins.helpers.elite',
    },
  ] as const;

  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    if (open && !hasLoadedRef.current && profileId) {
      hasLoadedRef.current = true;
      loadData();
    } else if (!open) {
      // Сбрасываем флаг при закрытии, чтобы загрузить свежие данные при следующем открытии
      hasLoadedRef.current = false;
    }
  }, [open, profileId]);

  // Загружаем историю транзакций при переключении на вкладку "История"
  useEffect(() => {
    if (open && activeTab === 'history' && transactions.length === 0) {
      loadTransactionHistory();
    }
  }, [open, activeTab]);

  const loadData = async () => {
    if (!profileId) {
      console.warn('[BoostShop] profileId не установлен');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Загрузка бустов
      const { data: boostsData, error: boostsError } = await supabaseClient
        .from('boost_definitions')
        .select('*')
        .order('cost_coins', { ascending: true });

      if (boostsError) {
        console.error('[BoostShop] Ошибка загрузки бустов:', boostsError);
      } else if (boostsData) {
        setBoosts(boostsData);
      }

      // Загрузка профиля
      const { data: profile, error: profileError } = await supabaseClient
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

      // Загрузка инвентаря через RPC (обходит RLS для Telegram)
      const { data: inventoryData, error: inventoryError } = await supabaseClient.rpc('get_user_boost_inventory', {
        p_user_id: profileId
      });

      if (inventoryError) {
        console.error('[BoostShop] Ошибка загрузки инвентаря:', inventoryError);
        // Fallback к прямому запросу
        const { data: fallbackData } = await supabaseClient
          .from('boost_inventory')
          .select('boost_type, quantity')
          .eq('user_id', profileId);
        if (fallbackData) {
          setInventory(fallbackData);
        }
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
  
  // Функция для получения читаемого названия буста
  const getBoostDisplayName = (boostType?: string, fallback?: string): string => {
    return translateBoostField(boostType, 'name', fallback);
  };

  const getTransactionInfo = (
    type: string,
    metadata?: any
  ): { description: string; icon: any; category: 'earn' | 'spend' | 'purchase' | 'reward' } => {
    const duelPassRewardDescription = (meta?: any) => {
      const levelSuffix = meta?.level
        ? t('boostShop.transactions.duelPassRewardLevelSuffix', { level: meta.level })
        : '';
      const premiumSuffix = meta?.is_premium
        ? t('boostShop.transactions.duelPassRewardPremiumSuffix')
        : '';
      return t('boostShop.transactions.duelPassReward', {
        level: levelSuffix,
        premium: premiumSuffix,
      });
    };

    switch (type) {
      case 'coins_earned_test':
        return { icon: TestTube, description: t('boostShop.transactions.coinsEarnedTest'), category: 'earn' };
      case 'coins_earned_duel':
        return { icon: Zap, description: t('boostShop.transactions.coinsEarnedDuel'), category: 'earn' };
      case 'coins_earned_daily':
        if (metadata?.source === 'duel_pass_reward') {
          return { icon: Trophy, description: duelPassRewardDescription(metadata), category: 'reward' };
        }
        return { icon: Calendar, description: t('boostShop.transactions.coinsEarnedDaily'), category: 'earn' };
      case 'coins_earned_premium_bonus':
        return { icon: Gift, description: t('boostShop.transactions.coinsEarnedPremiumBonus'), category: 'earn' };
      case 'coins_spent_boost':
        return {
          icon: Zap,
          description: t('boostShop.transactions.coinsSpentBoost', {
            name: metadata?.boost_name || getBoostDisplayName(metadata?.boost_type, metadata?.boost_type || ''),
          }),
          category: 'spend',
        };
      case 'coins_spent_skin':
        return { icon: Gift, description: t('boostShop.transactions.coinsSpentSkin'), category: 'spend' };
      case 'coins_spent_duel_entry':
        return { icon: Zap, description: t('boostShop.transactions.coinsSpentDuelEntry'), category: 'spend' };
      case 'coins_purchase_stripe':
        return {
          icon: CreditCard,
          description: t('boostShop.transactions.coinsPurchaseStripe', { amount: metadata?.amount || '' }),
          category: 'purchase',
        };
      case 'premium_purchase_monthly':
      case 'premium_purchase_yearly':
      case 'premium_purchase_forever': {
        const subType =
          metadata?.subscription_type ||
          (type.includes('yearly') ? 'yearly' : type.includes('forever') ? 'forever' : 'monthly');
        return {
          icon: CreditCard,
          description: getPremiumPurchaseDescription(subType, metadata?.price),
          category: 'purchase',
        };
      }
      case 'duel_pass_purchase':
        return { icon: Trophy, description: t('boostShop.transactions.duelPassPurchase'), category: 'purchase' };
      case 'bet':
        return { icon: Zap, description: t('boostShop.transactions.bet'), category: 'spend' };
      case 'win':
        return { icon: Trophy, description: t('boostShop.transactions.win'), category: 'earn' };
      case 'refund':
        return { icon: Gift, description: t('boostShop.transactions.refund'), category: 'earn' };
      case 'commission':
        return { icon: Coins, description: t('boostShop.transactions.commission'), category: 'spend' };
      case 'referral_earned':
    return {
          icon: Users,
          description: t('boostShop.transactions.referralReward', {
            name: metadata?.name || t('boostShop.transactions.referralFallbackName'),
          }),
          category: 'reward',
        };
      case 'referral_joined':
        return { icon: Gift, description: t('boostShop.transactions.referralJoined'), category: 'reward' };
      case 'duel_pass_reward':
        return { icon: Trophy, description: duelPassRewardDescription(metadata), category: 'reward' };
      default:
        return { icon: Coins, description: type, category: 'earn' };
    }
  };

  const loadTransactionHistory = async () => {
    if (!profileId) return;
    
    setLoadingHistory(true);
    try {
      const allTransactions: Transaction[] = [];
      
      // Load purchases to enrich Premium transaction metadata with prices
      const { data: purchasesForEnrichment } = await supabaseClient
        .from('purchases')
        .select('id, item_type, price, currency, metadata, completed_at, created_at')
        .eq('user_id', profileId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });
      
      // Create a map of session_id -> purchase data for quick lookup
      const purchaseMap = new Map<string, any>();
      if (purchasesForEnrichment) {
        purchasesForEnrichment.forEach(p => {
          const sessionId = p.metadata?.session_id || p.id;
          purchaseMap.set(sessionId, p);
        });
      }
      
      // 1. Load new transactions table через RPC (обходит RLS для Telegram)
      const { data: newTransactions, error: transactionsError } = await supabaseClient.rpc('get_user_transactions', {
        p_user_id: profileId,
        p_limit: 100
      });
      
      if (transactionsError) {
        console.error('[BoostShop] Ошибка загрузки транзакций через RPC:', transactionsError);
        // Fallback к прямому запросу
        const { data: fallbackTx } = await supabaseClient
          .from('transactions')
          .select('id, amount, transaction_type, metadata, created_at')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (fallbackTx) {
          fallbackTx.forEach(tx => {
            // Enrich Premium transactions with price from purchases
            let enrichedMetadata = { ...tx.metadata };
            if (tx.transaction_type?.startsWith('premium_purchase_') && tx.metadata?.session_id) {
              const purchase = purchaseMap.get(tx.metadata.session_id);
              if (purchase && purchase.price) {
                enrichedMetadata = {
                  ...enrichedMetadata,
                  price: purchase.price,
                  currency: purchase.currency || 'EUR',
                  subscription_type: purchase.metadata?.subscription_type || 
                    (tx.transaction_type.includes('yearly') ? 'yearly' : 
                     tx.transaction_type.includes('forever') ? 'forever' : 'monthly')
                };
              }
            }
            
            const info = getTransactionInfo(tx.transaction_type, enrichedMetadata);
            allTransactions.push({
              id: tx.id,
              amount: tx.amount,
              type: tx.transaction_type,
              description: info.description,
              created_at: tx.created_at,
              category: info.category,
              icon: info.icon,
              metadata: enrichedMetadata
            });
          });
        }
      } else if (newTransactions) {
        newTransactions.forEach(tx => {
          // Enrich Premium transactions with price from purchases
          let enrichedMetadata = { ...tx.metadata };
          if (tx.transaction_type?.startsWith('premium_purchase_') && tx.metadata?.session_id) {
            const purchase = purchaseMap.get(tx.metadata.session_id);
            if (purchase && purchase.price) {
              enrichedMetadata = {
                ...enrichedMetadata,
                price: purchase.price,
                currency: purchase.currency || 'EUR',
                subscription_type: purchase.metadata?.subscription_type || 
                  (tx.transaction_type.includes('yearly') ? 'yearly' : 
                   tx.transaction_type.includes('forever') ? 'forever' : 'monthly')
              };
            }
          }
          
          const info = getTransactionInfo(tx.transaction_type, enrichedMetadata);
          allTransactions.push({
            id: tx.id,
            amount: tx.amount,
            type: tx.transaction_type,
            description: info.description,
            created_at: tx.created_at,
            category: info.category,
            icon: info.icon,
            metadata: enrichedMetadata
          });
        });
      }
      
      // 2. Load duel transactions (bets and winnings)
      const { data: duelTx } = await supabaseClient
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
      const { data: purchases } = await supabaseClient
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
            description = t('boostShop.transactions.coinsPurchaseStripe', { amount: coinsAmount });
            amount = coinsAmount;
          } else if (purchase.item_type === 'premium') {
            const price = purchase.price || purchase.metadata?.price || 0;
            const subscriptionType = purchase.metadata?.subscription_type || 'monthly';
            description = getPremiumPurchaseDescription(subscriptionType, price);
            amount = 0; // Premium не дает монет напрямую
            
            // Добавляем Premium покупку в историю с ценой в евро
            allTransactions.push({
              id: purchase.id,
              amount: 0, // amount остается 0, но цена будет в описании и metadata
              type: subscriptionType === 'forever' ? 'premium_purchase_forever' : 
                    subscriptionType === 'yearly' ? 'premium_purchase_yearly' : 
                    'premium_purchase_monthly',
              description,
              created_at: purchase.completed_at || purchase.created_at,
              category: 'purchase',
              icon: CreditCard,
              metadata: { ...purchase.metadata, price, subscription_type: subscriptionType, currency: purchase.currency || 'EUR' }
            });
          } else if (purchase.item_type === 'duel_pass') {
            description = t('boostShop.transactions.duelPassPurchase');
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
      const { data: referrals } = await supabaseClient
        .from('referrals')
        .select('referred_bonus, referral_bonus, reward_given, created_at, reward_given_at, referred:referred_id(first_name)')
        .or(`referrer_id.eq.${profileId},referred_id.eq.${profileId}`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (referrals) {
        referrals.forEach(ref => {
          const isReferrer = ref.reward_given;
          const referralName = (ref.referred as any)?.first_name || t('boostShop.transactions.referralFallbackName');
          if (isReferrer) {
            allTransactions.push({
              id: `ref_earned_${ref.created_at}`,
              amount: ref.referral_bonus || 100,
              type: 'referral_earned',
              description: t('boostShop.transactions.referralReward', { name: referralName }),
              created_at: ref.reward_given_at || ref.created_at,
              category: 'reward',
              icon: Users,
              metadata: { name: referralName }
            });
          }
          allTransactions.push({
            id: `ref_joined_${ref.created_at}`,
            amount: ref.referred_bonus || 50,
            type: 'referral_joined',
            description: t('boostShop.transactions.referralJoined'),
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
      toast({
        title: t('boostShop.toasts.errorTitle'),
        description: t('boostShop.toasts.historyError'),
        variant: 'destructive',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCoinPurchase = async (catalogKey: string) => {
    if (!profileId) {
      toast({
        title: t('boostShop.toasts.errorTitle'),
        description: t('boostShop.toasts.needLogin'),
        variant: 'destructive',
      });
      return;
    }

    // Проверяем, доступен ли Stripe
    if (!showStripePayment) {
      toast({
        title: t('boostShop.toasts.errorTitle'),
        description: 'Stripe временно недоступен. Используйте Telegram Stars для оплаты в Telegram Mini App.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Создаем Stripe Checkout сессию
      const { data, error } = await supabaseClient.functions.invoke("purchase-create", {
        body: { user_id: profileId, catalog_key: catalogKey },
      });

      if (error) {
        console.error("[BoostShop] Purchase error:", error);
        toast({
          title: t('boostShop.toasts.errorTitle'),
          description: error.message || t('boostShop.toasts.purchaseErrorDescription'),
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        console.error("[BoostShop] Error in response:", data.error);
        toast({
          title: t('boostShop.toasts.errorTitle'),
          description: data.error || t('boostShop.toasts.purchaseErrorDescription'),
          variant: 'destructive',
        });
        return;
      }

      if (!data?.url) {
        console.error("[BoostShop] No URL in response:", data);
        toast({
          title: t('boostShop.toasts.errorTitle'),
          description: t('boostShop.toasts.sessionError'),
          variant: 'destructive',
        });
        return;
      }

      // Сохраняем session_id перед редиректом (для восстановления после возврата с Stripe)
      if (data?.sessionId) {
        console.log("[BoostShop] Saving session_id:", data.sessionId);
        // Используем sessionStorage для Telegram (более надежно при переходах между доменами)
        sessionStorage.setItem('stripe_checkout_session_id', data.sessionId);
        localStorage.setItem('stripe_checkout_session_id', data.sessionId); // Fallback
        // Также сохраняем в URL параметрах для передачи через Stripe
        sessionStorage.setItem('stripe_user_id', profileId);
      }

      const isTelegram = isTelegramMiniApp();
      const webApp = getTelegramWebApp();

      // В Telegram Web App используем прямой редирект или webApp.openLink
      // Это необходимо, так как window.open (попап) плохо работает в Telegram
      if (isTelegram && webApp) {
        console.log("[BoostShop] Opening Stripe in Telegram Web App (same window)");
        // Используем webApp.openLink для открытия в браузере Telegram
        // Это сохранит контекст и вернет пользователя обратно после оплаты
        if ((webApp as any).openLink) {
          (webApp as any).openLink(data.url);
        } else if ((webApp as any).openTelegramLink) {
          (webApp as any).openTelegramLink(data.url);
        } else {
          // Fallback: прямой редирект
          window.location.href = data.url;
        }
      } else {
        // В обычном браузере используем прямой редирект (не попап!)
        // Это гарантирует что session_id будет передан в success_url
        console.log("[BoostShop] Redirecting to Stripe (same window)");
        window.location.href = data.url;
      }

    } catch (err: any) {
      console.error("[BoostShop] Purchase error:", err);
      toast({
        title: t('boostShop.toasts.errorTitle'),
        description: err?.message || t('boostShop.toasts.purchaseErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handlePurchase = async (boost: Boost) => {
    if (!profileId) {
      toast({
        title: t('boostShop.toasts.errorTitle'),
        description: t('boostShop.toasts.needLogin'),
        variant: 'destructive',
      });
      return;
    }

    if (coins < boost.cost_coins) {
      toast({
        title: t('boostShop.toasts.errorTitle'),
        description: t('boostShop.toasts.insufficientCoins', { amount: boost.cost_coins - coins }),
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
        currentCoins: coins,
        online: navigator.onLine,
      });

      // OFFLINE-FIRST: Если offline - добавляем в очередь
      if (!navigator.onLine) {
        console.log('[BoostShop] Offline mode detected, queuing boost purchase');
        
        await enqueueOfflineAction('coin-spend', {
          itemId: boost.type,
          cost: boost.cost_coins,
          type: 'boost',
          boost_name: boost.name_ru,
        });
        
        // Оптимистичное обновление UI
        setCoins(prev => prev - boost.cost_coins);
        
        // Оптимистично обновляем инвентарь (локально)
        setInventory(prev => {
          const existing = prev.find(i => i.boost_type === boost.type);
          if (existing) {
            return prev.map(i => 
              i.boost_type === boost.type 
                ? { ...i, quantity: i.quantity + 1 }
                : i
            );
          } else {
            return [...prev, { boost_type: boost.type, quantity: 1 }];
          }
        });
        
        trackOfflineAction('boost-purchase', true);
        
        toast({
          title: t('boostShop.toasts.successTitle') || 'Буст куплен!',
          description: 'Покупка сохранена локально. Применится при восстановлении сети.',
        });
        
        // Анимации (локально)
        sounds.correctAnswer();
        haptics.boostActivated();
        
        return;
      }

      // ONLINE: Обычная покупка
      // Проверяем существование профиля перед покупкой
      const { data: profileCheck, error: profileCheckError } = await supabaseClient
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
      const { data: coinsData, error: coinsError } = await supabaseClient.rpc('increment_profile_value', {
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
      const { data: inventoryData, error: inventoryError } = await supabaseClient.rpc('modify_boost_inventory', {
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
        const { error: rollbackError } = await supabaseClient.rpc('increment_profile_value', {
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

      // Создаем транзакцию о покупке буста через RPC (обходит RLS для Telegram)
      try {
        const { error: transactionError } = await supabaseClient.rpc('create_transaction', {
          p_user_id: profileId,
          p_transaction_type: 'coins_spent_boost',
          p_amount: -boost.cost_coins,
          p_metadata: { boost_type: boost.type, boost_name: boost.name_ru }
        });
        
        if (transactionError) {
          console.warn('[BoostShop] Ошибка создания транзакции (не критично):', transactionError);
        } else {
          console.log('[BoostShop] Транзакция о покупке буста создана успешно');
        }
      } catch (txError) {
        console.warn('[BoostShop] Исключение при создании транзакции (не критично):', txError);
      }
      
      trackOfflineAction('boost-purchase', true);

      // Анимации и звуки
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      sounds.correctAnswer();
      haptics.boostActivated();

      // Обновляем данные без скрытия контента
      setIsRefreshing(true);
      try {
        // Обновляем баланс монет
        const { data: updatedProfile } = await supabaseClient
          .from('profiles')
          .select('coins')
          .eq('id', profileId)
          .single();

        if (updatedProfile) {
          setCoins(updatedProfile.coins || 0);
        }

        // Обновляем инвентарь через RPC (обходит RLS для Telegram)
        const { data: updatedInventory, error: invError } = await supabaseClient.rpc('get_user_boost_inventory', {
          p_user_id: profileId
        });

        if (invError) {
          console.warn('[BoostShop] Ошибка обновления инвентаря через RPC, пробуем прямой запрос:', invError);
          const { data: fallbackInventory } = await supabaseClient
            .from('boost_inventory')
            .select('boost_type, quantity')
            .eq('user_id', profileId);
          if (fallbackInventory) {
            setInventory(fallbackInventory);
          }
        } else if (updatedInventory) {
          setInventory(updatedInventory);
        }
      } catch (error) {
        console.error('[BoostShop] Ошибка обновления данных:', error);
        // При ошибке обновления все равно перезагружаем полностью
        await loadData();
      } finally {
        setIsRefreshing(false);
      }

      const localizedName = translateBoostField(boost.type, 'name', boost.name_ru);
      await dispatchUserEvent(profileId, 'boost_purchase', {
        boost_type: boost.type,
        boost_name: localizedName,
        cost_coins: boost.cost_coins,
      });
      toast({
        title: t('boostShop.toasts.purchaseSuccessTitle'),
        description: t('boostShop.toasts.purchaseSuccessDescription', { name: localizedName }),
      });
    } catch (error: any) {
      console.error('[BoostShop] Ошибка покупки:', error);
      
      const errorMessage = error?.message || error?.error?.message || 'Неизвестная ошибка';
      console.error('[BoostShop] Детали ошибки:', {
        message: errorMessage,
        fullError: error
      });
      
      trackOfflineAction('boost-purchase', false, errorMessage);
      
      toast({
        title: t('boostShop.toasts.purchaseErrorTitle'),
        description: errorMessage.includes('RLS')
          ? t('boostShop.toasts.rlsError')
          : errorMessage || t('boostShop.toasts.purchaseErrorDescription'),
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
        {/* ОПТИМИЗАЦИЯ: Confetti только когда модалка открыта */}
        {open && showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
            onConfettiComplete={() => setShowConfetti(false)}
          />
        )}

        {/* Компактный заголовок с балансом */}
        <div className="px-3 md:px-4 py-2 md:py-3 border-b border-border/50 shrink-0" data-vaul-no-drag>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
              <h2 className="text-base md:text-lg font-semibold truncate">
                {t('boostShop.title')}
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={async () => {
                  setActiveTab('history');
                  if (transactions.length === 0) {
                    await loadTransactionHistory();
                  }
                }}
              >
                <Coins className="w-4 h-4 text-gold" />
                <span className="text-sm font-semibold">{coins}</span>
                <History className="w-3 h-3 text-muted-foreground ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          {isRefreshing && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full overflow-hidden">
            <div className="px-4 pt-4 pb-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="boosts" className="text-xs truncate">
                  <Zap className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{t('boostShop.tabs.boosts')}</span>
                </TabsTrigger>
                <TabsTrigger value="coins" className="text-xs truncate">
                  <Coins className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{t('boostShop.tabs.coins')}</span>
                </TabsTrigger>
                <TabsTrigger value="premium" className="text-xs truncate">
                  <Crown className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{t('boostShop.tabs.premium')}</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs truncate">
                  <History className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{t('boostShop.tabs.history')}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Boosts Tab */}
            <TabsContent 
              value="boosts" 
              className="p-3 md:p-4 space-y-3 mt-3 md:mt-4 overflow-y-auto"
              data-vaul-no-drag
            >
              <>
                  {regularBoosts.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground px-1">
                        {t('boostShop.sections.popular')}
                      </h3>
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
                        <h3 className="text-sm font-semibold text-muted-foreground">
                          {t('boostShop.sections.premium')}
                        </h3>
                        <Badge className="gradient-gold border-none text-xs px-1.5 py-0">
                          {t('boostShop.sections.premiumBadge')}
                        </Badge>
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
                      <p className="text-sm">{t('boostShop.sections.empty')}</p>
                    </div>
                  )}
              </>
            </TabsContent>

            {/* Coins Tab */}
            <TabsContent 
              value="coins" 
              className="p-3 md:p-4 space-y-3 mt-3 md:mt-4 overflow-y-auto"
              data-vaul-no-drag
            >
              <div className="space-y-3">
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('boostShop.coins.topUpTitle')}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="w-6 h-6 text-yellow-500" />
                    <span className="text-2xl font-bold">{coins}</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  {coinPacks.map((pack, idx) => {
                    const isHighlighted = Boolean(pack.highlight);
                    const pricePerCoin = pack.priceValue && pack.priceCoins
                      ? pack.priceValue / pack.priceCoins
                      : null;
                    const description = t(pack.descriptionKey ?? 'boostShop.coins.purpose');
                    const helperText = t(pack.helperKey ?? 'boostShop.coins.deliveryHint');
                    return (
                    <Card
                      key={idx}
                        className={`group relative overflow-hidden rounded-3xl border bg-card backdrop-blur-xl p-4 md:p-5 shadow-lg transition-transform duration-200 hover:-translate-y-1 ${
                          isHighlighted
                            ? 'border-yellow-400/50 dark:border-yellow-400/50 shadow-[0_15px_40px_rgba(251,191,36,0.25)]'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-yellow-300/50 dark:via-yellow-300/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center flex-shrink-0 ${
                              isHighlighted
                                ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-slate-900'
                                : 'bg-gradient-to-br from-muted to-muted/80 text-foreground'
                            }`}>
                            <Coins className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-xl font-bold text-foreground truncate">
                              {t('boostShop.coins.packLabel', { amount: pack.amount })}
                            </p>
                              <p className="text-xs text-muted-foreground">
                                {description}
                              </p>
                            {pack.bonus > 0 && (
                                <div className="flex items-center gap-1 text-xs mt-1 text-yellow-600 dark:text-yellow-200">
                                  <Sparkles className="w-3 h-3" />
                                {t('boostShop.coins.bonusLabel', { bonus: pack.bonus })}
                                </div>
                            )}
                          </div>
                            <div className="text-right">
                              <span className="text-2xl font-black text-foreground">{pack.price}</span>
                              {pricePerCoin && (
                                <p className="text-[11px] text-muted-foreground">
                                  ≈ {t('boostShop.coins.perCoin', { price: pricePerCoin.toFixed(2) })}
                                </p>
                              )}
                            </div>
                        </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center text-xs text-muted-foreground gap-2">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-center">{helperText}</span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {/* Telegram Stars (приоритетный метод в Telegram) */}
                          {showStarsPayment && (
                            <StarsPaymentButton
                              packageKey={pack.packageKey}
                              priceCoins={pack.priceCoins}
                              onSuccess={() => {
                                loadData(); // Обновить баланс после успешной оплаты
                                toast({
                                  title: t('boostShop.coins.successTitle'),
                                  description: t('boostShop.coins.successDescription', { amount: pack.amount }),
                                  duration: 5000,
                                });
                                setShowConfetti(true);
                                setTimeout(() => setShowConfetti(false), 3000);
                              }}
                              variant={showStripePayment ? "outline" : "default"}
                              size="sm"
                              className={`w-full sm:flex-1 sm:min-w-[160px] ${!showStripePayment && isHighlighted ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 hover:brightness-110' : ''}`}
                            />
                          )}
                          
                          {/* Stripe (только если включен в конфиге) */}
                          {showStripePayment && (
                            <Button
                              size="sm"
                              aria-label={t('boostShop.coins.buyPackAria', { amount: pack.amount })}
                              onClick={() => handleCoinPurchase(pack.catalogKey)}
                              className={`w-full sm:flex-1 sm:min-w-[160px] ${isHighlighted ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 hover:brightness-110' : ''}`}
                              disabled={!profileId}
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              {t('boostShop.buttons.buy')}
                            </Button>
                          )}
                          
                          {/* Cryptomus (криптоплатежи) */}
                          {showCryptomusPayment && (
                            <Button
                              size="sm"
                              aria-label={t('boostShop.coins.buyPackAria', { amount: pack.amount })}
                              onClick={async () => {
                                if (!profileId) {
                                  toast({
                                    title: t('boostShop.toasts.errorTitle'),
                                    description: t('boostShop.toasts.needLogin'),
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                
                                try {
                                  const { data, error } = await supabaseClient.functions.invoke("cryptomus-payment", {
                                    body: { user_id: profileId, catalog_key: pack.catalogKey },
                                  });
                                  
                                  if (error) {
                                    console.error("[BoostShop] Cryptomus error:", error);
                                    toast({
                                      title: t('boostShop.toasts.errorTitle'),
                                      description: error.message || t('boostShop.toasts.purchaseErrorDescription'),
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  
                                  if (data?.error) {
                                    toast({
                                      title: t('boostShop.toasts.errorTitle'),
                                      description: data.error || t('boostShop.toasts.purchaseErrorDescription'),
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  
                                  if (data?.url && data?.orderId) {
                                    // Показываем предварительный экран вместо прямого редиректа
                                    // Используем priceValue (число) вместо price (строка)
                                    const amount = pack.priceValue || 0;
                                    
                                    setCryptomusPreview({
                                      open: true,
                                      paymentUrl: data.url,
                                      orderId: data.orderId,
                                      amount: amount,
                                      currency: 'EUR',
                                      itemName: `${pack.amount} монет`,
                                    });
                                  } else {
                                    toast({
                                      title: t('boostShop.toasts.errorTitle'),
                                      description: t('boostShop.toasts.sessionError'),
                                      variant: 'destructive',
                                    });
                                  }
                                } catch (err: any) {
                                  console.error("[BoostShop] Cryptomus error:", err);
                                  toast({
                                    title: t('boostShop.toasts.errorTitle'),
                                    description: err?.message || t('boostShop.toasts.purchaseErrorDescription'),
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              className={`w-full sm:flex-1 sm:min-w-[160px] ${!showStarsPayment && !showStripePayment && isHighlighted ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 hover:brightness-110' : ''}`}
                              disabled={!profileId}
                              variant="outline"
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Крипто
                            </Button>
                          )}
                          
                          {/* Сообщение если нет доступных методов */}
                          {!showStarsPayment && !showStripePayment && !showCryptomusPayment && (
                            <div className="text-sm text-muted-foreground text-center py-2 w-full">
                              Используйте Telegram Mini App для оплаты через Stars
                            </div>
                          )}
                            </div>
                        </div>
                      </div>
                    </Card>
                    );
                  })}
                </div>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  <p>{t('boostShop.coins.premiumHint')}</p>
                </div>
              </div>
            </TabsContent>

            {/* Premium & Duel Pass Tab */}
            <TabsContent 
              value="premium" 
              className="p-3 md:p-4 space-y-4 mt-3 md:mt-4 overflow-y-auto"
              data-vaul-no-drag
            >
              <div className="space-y-4">
                {/* Premium Subscription */}
                <Card className="relative overflow-hidden p-0 border-0 shadow-xl">
                  {/* Премиум градиент фон */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-orange-500/15 to-yellow-400/20 dark:from-yellow-500/20 dark:via-orange-500/15 dark:to-yellow-500/20" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-yellow-300/10 via-transparent to-transparent" />
                  
                  {/* Контент */}
                  <div className="relative p-5 md:p-6 space-y-5">
                    {/* Заголовок */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl blur-sm opacity-50" />
                          <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-2.5 rounded-xl shadow-lg">
                            <Crown className="w-6 h-6 md:w-7 md:h-7 text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
                            {t('boostShop.premium.title')}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('boostShop.premium.subtitle') || 'Получите максимум от обучения'}
                          </p>
                        </div>
                      </div>
                      {isPremium && (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md px-3 py-1">
                          {t('boostShop.premium.activeBadge')}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Преимущества */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </div>
                        <span className="text-sm font-medium">{t('boostShop.premium.benefits.unlimitedTests')}</span>
                      </div>
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </div>
                        <span className="text-sm font-medium">{t('boostShop.premium.benefits.bonusCoins')}</span>
                      </div>
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-medium">{t('boostShop.premium.benefits.duelPassRewards')}</span>
                      </div>
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm font-medium">{t('boostShop.premium.benefits.instantHints')}</span>
                      </div>
                    </div>

                    {/* Тарифы */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      {/* Месячный тариф */}
                      <Card className="relative overflow-hidden p-4 border-2 border-border/50 hover:border-primary/50 transition-all hover:shadow-lg">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t('boostShop.premium.monthlyLabel')}
                        </p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl md:text-3xl font-bold text-foreground">€9.99</span>
                              <span className="text-xs text-muted-foreground">/мес</span>
                            </div>
                          </div>
                        <Button 
                          size="sm" 
                            variant={isPremium ? "outline" : "default"}
                            className="w-full h-10 font-semibold"
                          onClick={() => setPaywallOpen(true)}
                          disabled={isPremium}
                        >
                          {isPremium ? t('boostShop.buttons.active') : t('boostShop.buttons.select')}
                        </Button>
                        </div>
                      </Card>
                      
                      {/* Годовой тариф */}
                      <Card className="relative overflow-hidden p-4 border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 hover:border-primary/70 transition-all hover:shadow-xl hover:scale-[1.02]">
                        {/* Бейдж "Популярно" */}
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white border-0 shadow-md text-xs px-2 py-0.5">
                            {t('boostShop.premium.popularBadge') || 'Популярно'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {t('boostShop.premium.yearlyLabel') || 'Годовая подписка'}
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">€59.99</span>
                              <span className="text-xs text-muted-foreground">{t('boostShop.premium.yearlySuffix')}</span>
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">{t('boostShop.premium.savingsLabel')}</p>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full h-10 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0 shadow-md"
                            onClick={() => setPaywallOpen(true)}
                            disabled={isPremium}
                          >
                            {isPremium ? t('boostShop.buttons.active') : t('boostShop.buttons.select')}
                          </Button>
                        </div>
                      </Card>
                      
                      {/* Lifetime тариф */}
                      <Card className="relative overflow-hidden p-4 border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-500/10 hover:border-yellow-500/70 transition-all hover:shadow-xl hover:scale-[1.02]">
                        {/* Бейдж "Лучший" */}
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-md text-xs px-2 py-0.5">
                            {t('boostShop.premium.bestBadge')}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {t('boostShop.premium.lifetimeLabel')}
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">€99.99</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('boostShop.premium.lifetimeSuffix')}</p>
                          </div>
                        <Button 
                          size="sm" 
                            className="w-full h-10 font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-md"
                          onClick={() => setPaywallOpen(true)}
                          disabled={isPremium}
                        >
                          {isPremium ? t('boostShop.buttons.active') : t('boostShop.buttons.select')}
                        </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </Card>

                {/* Duel Pass */}
                <Card className="relative overflow-hidden p-0 border-0 shadow-lg">
                  {/* Градиент фон для Duel Pass */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
                  
                  <div className="relative p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60 rounded-xl blur-sm opacity-50" />
                        <div className="relative bg-gradient-to-br from-primary to-primary/80 p-2.5 rounded-xl shadow-lg">
                          <Trophy className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                          {t('boostShop.duelPass.title')}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('boostShop.duelPass.subtitle') || 'Соревнуйтесь и получайте награды'}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('boostShop.duelPass.description')}
                    </p>
                    
                    <Button 
                      className="w-full h-11 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md"
                      onClick={() => {
                        toast({
                          title: t('boostShop.duelPass.toastTitle'),
                          description: t('boostShop.duelPass.toastDescription'),
                        });
                      }}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      {t('boostShop.duelPass.button')}
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent 
              value="history" 
              className="p-0 h-full flex flex-col mt-3 md:mt-4"
              data-vaul-no-drag
            >
              <div className="px-3 md:px-4 pt-1 pb-3 border-b border-border/50 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {t('boostShop.history.title')}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {t('boostShop.history.operationsCount', { count: transactions.length })}
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
                    {t('boostShop.history.filters.all')}
                  </Button>
                  <Button
                    variant={filterCategory === 'earn' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory('earn')}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {t('boostShop.history.filters.earn')}
                  </Button>
                  <Button
                    variant={filterCategory === 'spend' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory('spend')}
                  >
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {t('boostShop.history.filters.spend')}
                  </Button>
                  <Button
                    variant={filterCategory === 'purchase' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory('purchase')}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    {t('boostShop.history.filters.purchase')}
                  </Button>
                  <Button
                    variant={filterCategory === 'reward' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory('reward')}
                  >
                    <Gift className="h-3 w-3 mr-1" />
                    {t('boostShop.history.filters.reward')}
                  </Button>
                </div>
              </div>
              
              <div 
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4" 
                data-vaul-no-drag
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
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
                                <p className="text-sm font-medium mb-1">
                                  {t('boostShop.history.empty.all.title')}
                                </p>
                                <p className="text-xs">
                                  {t('boostShop.history.empty.all.description')}
                                </p>
                              </div>
                              {!isPremium && (
                                <div className="pt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {t('boostShop.history.empty.all.premiumHint')}
                                  </Badge>
                                </div>
                              )}
                            </>
                          ) : filterCategory === 'earn' ? (
                            <>
                              <TrendingUp className="h-12 w-12 mx-auto opacity-30" />
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  {t('boostShop.history.empty.earn.title')}
                                </p>
                                <p className="text-xs">
                                  {t('boostShop.history.empty.earn.description')}
                                </p>
                              </div>
                            </>
                          ) : filterCategory === 'spend' ? (
                            <>
                              <TrendingDown className="h-12 w-12 mx-auto opacity-30" />
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  {t('boostShop.history.empty.spend.title')}
                                </p>
                                <p className="text-xs">
                                  {t('boostShop.history.empty.spend.description')}
                                </p>
                              </div>
                            </>
                          ) : filterCategory === 'purchase' ? (
                            <>
                              <CreditCard className="h-12 w-12 mx-auto opacity-30" />
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  {t('boostShop.history.empty.purchase.title')}
                                </p>
                                <p className="text-xs">
                                  {t('boostShop.history.empty.purchase.description')}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <Gift className="h-12 w-12 mx-auto opacity-30" />
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  {t('boostShop.history.empty.reward.title')}
                                </p>
                                <p className="text-xs">
                                  {t('boostShop.history.empty.reward.description')}
                                </p>
                              </div>
                            </>
                          )}
                          {filterCategory !== 'all' && (
                            <p className="text-xs mt-2 pt-2 border-t border-border/50">
                              {t('boostShop.history.tryOtherFilter')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-2 pb-4">
                      {filtered.map((tx, idx) => {
                        const IconComponent = tx.icon || (tx.amount > 0 ? TrendingUp : TrendingDown);
                        const isPositive = tx.amount > 0;
                        const isPurchase = tx.category === 'purchase';
                        const isReward = tx.category === 'reward';
                        
                        return (
                          <div
                            key={tx.id || idx}
                            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card hover:bg-card hover:border-border hover:shadow-sm transition-colors duration-150"
                            style={{ 
                              animation: `fadeIn 0.2s ease-out ${Math.min(idx * 0.01, 0.3)}s both`,
                            }}
                          >
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                {/* Иконка - упрощенная версия */}
                                <div className={`flex-shrink-0 ${
                                  isPositive 
                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                                    : isPurchase
                                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                      : isReward
                                        ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                } p-2 rounded-lg`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                                
                                {/* Описание */}
                              <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {tx.description}
                                  </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-muted-foreground">
                                    {formatTransactionDate(tx.created_at)}
                                  </p>
                                    {tx.category && (isPurchase || isReward) && (
                                      <Badge 
                                        variant="secondary" 
                                        className={`text-xs h-4 px-1.5 ${
                                          isPurchase 
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                            : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                        }`}
                                      >
                                        {isPurchase
                                        ? t('boostShop.history.badges.purchase')
                                          : t('boostShop.history.badges.reward')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                              
                              {/* Сумма */}
                              <div className="flex-shrink-0 ml-2">
                              {tx.metadata?.price && tx.amount === 0 ? (
                                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    €{tx.metadata.price}
                                  </span>
                              ) : (
                                  <span className={`text-sm font-bold ${
                                    isPositive 
                                      ? 'text-green-600 dark:text-green-400' 
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {isPositive ? '+' : ''}{tx.amount}
                            </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </>
    );
  };

  return (
    <>
      <UnifiedModal
        open={open}
        onOpenChange={onOpenChange}
        title={t('boostShop.title')}
        showTitleBar={false}
        className="max-w-4xl"
        loading={loading}
        skeletonVariant="shop"
        modalRouteKey="boost-shop"
        contentClassName="!p-0"
      >
        {!loading && <ModalContent />}
      </UnifiedModal>
      
      {/* Nested Modals - рендерим только когда нужно */}
      {paywallOpen && (
        <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
      )}
      
      {cryptomusPreview && (
        <CryptomusPaymentPreview
          open={cryptomusPreview.open}
          onOpenChange={(open) => {
            if (!open) {
              setCryptomusPreview(null);
            }
          }}
          paymentUrl={cryptomusPreview.paymentUrl}
          orderId={cryptomusPreview.orderId}
          amount={cryptomusPreview.amount}
          currency={cryptomusPreview.currency}
          itemName={cryptomusPreview.itemName}
          onPaymentComplete={() => {
            loadUserData();
          }}
          onCancel={() => {
            // Ничего не делаем при отмене
          }}
        />
      )}
    </>
  );
}
