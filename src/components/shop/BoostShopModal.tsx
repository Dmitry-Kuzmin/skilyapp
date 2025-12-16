import { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, X, ShoppingBag, TrendingUp, TrendingDown, History, Gift, Trophy, TestTube, Zap, Calendar, CreditCard, Users, Filter, Crown, Sparkles, Check, Video, ChevronDown, Shield, Wand2, Download, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext, UserContext } from '@/contexts/UserContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { BoostCard } from './BoostCard';
import { MarketItem } from './MarketItem';
import { CryptoMinerAdButton } from './CryptoMinerAdButton';
// Removed framer-motion import for better performance
import { PaywallModal } from '@/components/monetization/PaywallModal';
import { usePremium } from '@/hooks/usePremium';
import { RewardedAdModal } from '@/components/monetization/RewardedAdModal';
import { StarsPaymentButton } from '@/components/monetization/StarsPaymentButton';
import { CryptomusPaymentPreview } from '@/components/monetization/CryptomusPaymentPreview';
import { getTelegramWebApp, isTelegramMiniApp, triggerHapticFeedback } from '@/lib/telegram';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { dispatchUserEvent } from '@/lib/notification-events';
import { PAYMENT_CONFIG, isPaymentMethodAvailable } from '@/lib/payment-config';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { trackOfflineAction } from '@/utils/offlineAnalytics';
import { getPaddleInstance, getPaddleInstanceSync, preloadPaddle } from '@/lib/paddle';
import type { Paddle } from '@paddle/paddle-js';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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
  // БЕЗОПАСНОЕ использование UserContext - может быть undefined если модалка открыта вне UserProvider
  const userContext = useContext(UserContext);
  
  // Ранний возврат, если UserContext отсутствует (модалка открыта вне UserProvider)
  if (!userContext) {
    return null;
  }
  
  const profileId = userContext.profileId ?? null;
  const platform = userContext.platform ?? 'web';
  const queryClient = useQueryClient();
  
  // Если UserContext отсутствует, закрываем модалку
  useEffect(() => {
    if (open && !userContext) {
      console.warn('[BoostShopModal] UserContext not available, closing modal');
      onOpenChange(false);
    }
  }, [open, userContext, onOpenChange]);
  
  const { isPremium } = usePremium();
  const { t, language } = useLanguage();
  const dateLocale = localeMap[language] || 'en-US';
  const { enqueue: enqueueOfflineAction } = useOfflineQueue(profileId);
  // Используем isTelegramMiniApp() для более надежного определения Telegram Mini App
  const currentPlatform = platform === 'telegram' ? 'telegram' : 'web';
  const showStarsPayment = isPaymentMethodAvailable('telegram_stars', currentPlatform);
  const showCryptomusPayment = isPaymentMethodAvailable('cryptomus', currentPlatform);
  const showPaddlePayment = isPaymentMethodAvailable('paddle', currentPlatform);
  
  // Логирование для отладки (только в dev или при открытии модалки)
  useEffect(() => {
    if (open) {
      console.log("[BoostShopModal] Payment methods availability:", {
        platform,
        currentPlatform,
        showStarsPayment,
        showCryptomusPayment,
        showPaddlePayment,
        paddleEnabled: PAYMENT_CONFIG.paddleEnabled
      });
    }
  }, [open, platform, currentPlatform, showStarsPayment, showCryptomusPayment, showPaddlePayment]);
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
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [paddleLoading, setPaddleLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null); // catalogKey покупки в процессе
  const [boostPurchaseLoading, setBoostPurchaseLoading] = useState<string | null>(null); // boost.type покупки в процессе

  // Инициализация Paddle SDK через глобальную утилиту (предзагружается при старте приложения)
  useEffect(() => {
    if (!showPaddlePayment) return;

    // Пробуем получить уже инициализированный инстанс
    const existingPaddle = getPaddleInstanceSync();
    if (existingPaddle) {
      setPaddle(existingPaddle);
      return;
    }

    // Если не инициализирован - инициализируем (но это должно быть редко, т.к. предзагружается)
    setPaddleLoading(true);
    getPaddleInstance()
      .then((instance) => {
        setPaddle(instance);
      })
      .catch((error) => {
        console.error('[BoostShopModal] Failed to get Paddle instance:', error);
      })
      .finally(() => {
        setPaddleLoading(false);
      });
  }, [showPaddlePayment]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'earn' | 'spend' | 'purchase' | 'reward'>('all');
  const [activeTab, setActiveTab] = useState<'boosts' | 'coins' | 'premium' | 'history'>('boosts');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [showRewardedAdModal, setShowRewardedAdModal] = useState(false);
  
  // Реф для контейнера с контентом модалки (для сброса скролла)
  const modalContentRef = useRef<HTMLDivElement>(null);

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
      console.log('[BoostShopModal] Загрузка данных, profileId:', profileId);
      hasLoadedRef.current = true;
        loadData();
    } else if (!open) {
      // Сбрасываем флаг при закрытии
      hasLoadedRef.current = false;
    } else if (open && !profileId) {
      console.warn('[BoostShopModal] Модалка открыта, но profileId отсутствует');
    } else if (open && hasLoadedRef.current) {
      console.log('[BoostShopModal] Данные уже загружены, пропускаем');
      }
  }, [open, profileId]);

  // Загружаем историю транзакций при переключении на вкладку "История"
  const historyLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (open && activeTab === 'history' && transactions.length === 0 && !loadingHistory) {
      // ОПТИМИЗАЦИЯ: Debounce для предотвращения множественных загрузок
      historyLoadTimeoutRef.current = setTimeout(() => {
        loadTransactionHistory();
      }, 150);
    }
    
    return () => {
      if (historyLoadTimeoutRef.current) {
        clearTimeout(historyLoadTimeoutRef.current);
      }
    };
  }, [open, activeTab]);

  // Сбрасываем скролл контента при переключении вкладок и при открытии модалки
  useEffect(() => {
    if (!open) return;
    
    // Небольшая задержка для того, чтобы контент успел отрендериться
    const timeoutId = setTimeout(() => {
      // Находим скроллируемый контейнер внутри модалки
      const scrollableContainer = modalContentRef.current?.querySelector('[data-scrollable]') as HTMLElement;
      if (scrollableContainer) {
        // Сбрасываем скролл в начало
        scrollableContainer.scrollTop = 0;
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [activeTab, open]);

  const loadData = async () => {
    console.log('[BoostShopModal] loadData вызвана, profileId:', profileId);
    if (!profileId) {
      console.warn('[BoostShop] profileId не установлен');
      setLoading(false);
      return;
    }

    try {
      console.log('[BoostShopModal] Начинаем загрузку данных...');
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
      console.log('[BoostShopModal] Загрузка данных завершена, loading: false');
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
      case 'coins_earned_ad':
        return { icon: Video, description: t('boostShop.transactions.coinsEarnedAd', { amount: metadata?.amount || 20 }), category: 'earn' };
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
      case 'coins_purchase_paddle':
        return { icon: CreditCard, description: t('boostShop.transactions.coinsPurchasePaddle', { amount: metadata?.amount || 0 }), category: 'purchase' };
      case 'coins_purchase_cryptomus':
        return { icon: CreditCard, description: t('boostShop.transactions.coinsPurchaseCryptomus', { amount: metadata?.amount || 0 }), category: 'purchase' };
      case 'coins_purchase_telegram_stars':
        return { icon: Sparkles, description: t('boostShop.transactions.coinsPurchaseStars', { amount: metadata?.amount || 0 }), category: 'purchase' };
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
            // Определяем тип транзакции в зависимости от метода оплаты
            let transactionType = 'coins_purchase_paddle'; // По умолчанию Paddle
            
            if (purchase.cryptomus_order_id) {
              transactionType = 'coins_purchase_cryptomus';
            } else if (purchase.paddle_transaction_id) {
              transactionType = 'coins_purchase_paddle';
            } else if (purchase.metadata?.payment_method === 'telegram_stars' || purchase.metadata?.gateway === 'telegram_stars') {
              transactionType = 'coins_purchase_telegram_stars';
            }
            
            // Используем универсальный перевод для покупок монет
            description = t('boostShop.transactions.coinsPurchasePaddle', { amount: coinsAmount });
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
              type: transactionType, // Paddle, Cryptomus или Telegram Stars
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

  // ОПТИМИЗАЦИЯ: useCallback для предотвращения лишних ререндеров дочерних компонентов
  const handleCoinPurchase = useCallback(async (catalogKey: string) => {
    if (!profileId) {
      toast({
        title: t('boostShop.toasts.errorTitle'),
        description: t('boostShop.toasts.needLogin'),
        variant: 'destructive',
      });
      return;
    }

    // Предотвращаем двойные клики
    if (purchaseLoading === catalogKey) {
      return;
    }

    setPurchaseLoading(catalogKey);

    try {
      // Убеждаемся, что Paddle SDK готов (если еще не инициализирован - инициализируем)
      let paddleInstance = paddle || getPaddleInstanceSync();
      if (!paddleInstance && showPaddlePayment) {
        console.log('[BoostShop] Paddle not ready, initializing...');
        paddleInstance = await getPaddleInstance();
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      }

      // Получаем partner_code из localStorage (если пользователь пришел через партнерскую ссылку)
      const partnerCode = localStorage.getItem('partner_code');
      
      // Создаем Paddle Transaction через Edge Function
      const { data, error } = await supabaseClient.functions.invoke("paddle-payment", {
        body: { 
          user_id: profileId, 
          catalog_key: catalogKey,
          ...(partnerCode ? { partner_code: partnerCode } : {}),
        },
      });

      if (error) {
        console.error("[BoostShop] Purchase error:", error);
        toast({
          title: t('boostShop.toasts.errorTitle'),
          description: error.message || t('boostShop.toasts.purchaseErrorDescription'),
          variant: 'destructive',
        });
        setPurchaseLoading(null);
        return;
      }

      if (data?.error) {
        console.error("[BoostShop] Error in response:", data.error);
        toast({
          title: t('boostShop.toasts.errorTitle'),
          description: data.error || t('boostShop.toasts.purchaseErrorDescription'),
          variant: 'destructive',
        });
        setPurchaseLoading(null);
        return;
      }

      console.log("[BoostShop] Paddle response data:", {
        transactionId: data?.transaction_id,
        fullData: data
      });

      if (!data?.transaction_id) {
        console.error("[BoostShop] No transaction_id in response:", data);
        toast({
          title: t('boostShop.toasts.errorTitle'),
          description: t('boostShop.toasts.sessionError'),
          variant: 'destructive',
        });
        setPurchaseLoading(null);
        return;
      }

      // Запоминаем transaction_id (для Paddle) для последующей проверки
      sessionStorage.setItem('paddle_transaction_id', data.transaction_id);
      localStorage.setItem('paddle_transaction_id', data.transaction_id);

      // КРИТИЧНО: В Telegram WebView overlay работает плохо, используем прямой редирект
      // В веб-версии используем overlay для лучшего UX
      const isTelegram = isTelegramMiniApp();
      const webApp = getTelegramWebApp();
      
      // Формируем URL чекаута с параметрами для темной темы (если поддерживается)
      const paddleCheckoutUrl = `https://checkout.paddle.com/transaction/${data.transaction_id}`;
      
      // В Telegram всегда используем прямой редирект через openLink
      // Это откроет чекаут в системном браузере, где он будет выглядеть лучше
      if (isTelegram && webApp) {
        console.log("[BoostShop] Opening Paddle checkout in Telegram (system browser):", {
          transactionId: data.transaction_id,
          url: paddleCheckoutUrl
        });
        
        setPurchaseLoading(null);
        
        // Используем openLink для открытия в системном браузере
        // Это обеспечит лучший UX и корректное отображение чекаута
        if ((webApp as any).openLink) {
          (webApp as any).openLink(paddleCheckoutUrl);
        } else {
          // Fallback: прямой редирект (менее предпочтительно)
          window.location.href = paddleCheckoutUrl;
        }
        return;
      }
      
      // Для веб-версии используем overlay через Paddle SDK
      if (paddleInstance) {
        console.log("[BoostShop] Opening Paddle checkout overlay (web):", {
          transactionId: data.transaction_id,
          displayMode: "overlay"
        });
        
        try {
          // Overlay - открывается попап прямо на сайте (рекомендуется для веба)
          // ВАЖНО: Paddle имеет ограниченную кастомизацию через SDK
          // Для полной кастомизации (логотип, цвета) используйте Paddle Dashboard:
          // Settings → Branding → Checkout appearance
          paddleInstance.Checkout.open({
            transactionId: data.transaction_id,
            settings: {
              displayMode: "overlay", // Попап на сайте - современный UX
              successUrl: `${window.location.origin}/purchase/success?transaction_id={transaction_id}`,
              theme: "dark", // Темная тема под ваш дизайн (light/dark)
              locale: language === 'ru' ? 'ru' : language === 'es' ? 'es' : 'en', // Локализация
            },
          });
          // После успешного открытия overlay - сбрасываем loading (форма открыта)
          setPurchaseLoading(null);
        } catch (error) {
          console.error("[BoostShop] Failed to open Paddle checkout overlay:", error);
          
          // Fallback: если overlay не открылся, используем редирект
          console.warn("[BoostShop] Overlay failed, falling back to redirect");
          setPurchaseLoading(null);
          window.location.href = paddleCheckoutUrl;
        }
      } else {
        // Fallback: если SDK не инициализирован, используем редирект
        console.warn("[BoostShop] Paddle SDK not initialized, using fallback redirect");
        console.warn("[BoostShop] Make sure VITE_PADDLE_CLIENT_TOKEN is set and project is redeployed");
        
        console.log("[BoostShop] Redirecting to Paddle checkout:", paddleCheckoutUrl);
        setPurchaseLoading(null);
        window.location.href = paddleCheckoutUrl;
      }

    } catch (err: any) {
      console.error("[BoostShop] Purchase error:", err);
      toast({
        title: t('boostShop.toasts.errorTitle'),
        description: err?.message || t('boostShop.toasts.purchaseErrorDescription'),
        variant: 'destructive',
      });
      setPurchaseLoading(null);
    }
  }, [profileId, purchaseLoading, paddle, showPaddlePayment, language, t]);

  // ОПТИМИЗАЦИЯ: useCallback для предотвращения лишних ререндеров дочерних компонентов
  const handlePurchase = useCallback(async (boost: Boost) => {
    // КРИТИЧНО: Защита от двойных кликов
    if (boostPurchaseLoading === boost.type) {
      console.warn('[BoostShop] Purchase already in progress for:', boost.type);
      return;
    }

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

    // Haptic feedback при клике на покупку (Telegram)
    if (isTelegramMiniApp()) {
      triggerHapticFeedback('medium');
    }

    // Устанавливаем флаг загрузки сразу
    setBoostPurchaseLoading(boost.type);

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
    } finally {
      // КРИТИЧНО: Всегда сбрасываем флаг загрузки, даже при ошибке
      setBoostPurchaseLoading(null);
    }
  }, [profileId, coins, boostPurchaseLoading, enqueueOfflineAction, t, translateBoostField, dispatchUserEvent]);

  const regularBoosts = boosts.filter(b => !b.is_premium);
  const premiumBoosts = boosts.filter(b => b.is_premium);

  // Функция определения категории буста по типу
  const getBoostCategory = (type: string): 'utility' | 'exploit' | 'defense' => {
    // Атака (exploit)
    if (['screen_injector', 'input_lag', 'spam_attack'].includes(type)) {
      return 'exploit';
    }
    // Защита (defense)
    if (['firewall', 'adas', 'shield'].includes(type)) {
      return 'defense';
    }
    // Утилиты (utility) - по умолчанию
    return 'utility';
  };

  // Состояние фильтра категорий
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'exploit' | 'defense' | 'utility' | 'premium'>('all');
  
  // Состояние для просмотра деталей товара (Inspect Sheet)
  const [selectedBoostForInspect, setSelectedBoostForInspect] = useState<Boost | null>(null);

  // Фильтрация бустов по категории
  const filteredRegularBoosts = useMemo(() => {
    if (categoryFilter === 'all') return regularBoosts;
    if (categoryFilter === 'premium') return [];
    return regularBoosts.filter(b => getBoostCategory(b.type) === categoryFilter);
  }, [regularBoosts, categoryFilter]);

  const filteredPremiumBoosts = useMemo(() => {
    if (categoryFilter === 'all' || categoryFilter === 'premium') return premiumBoosts;
    return [];
  }, [premiumBoosts, categoryFilter]);

  // Контент модалки
  const ModalContent = () => {
    return (
      <div ref={modalContentRef} className="h-full flex flex-col">

        <div className="relative">
          {isRefreshing && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full flex flex-col h-full">
            <div className="px-4 pt-4 pb-0 shrink-0">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50 border border-border">
                <TabsTrigger value="boosts" className="text-xs truncate data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-violet-300 data-[state=active]:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <Zap className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{t('boostShop.tabs.boosts')}</span>
                </TabsTrigger>
                <TabsTrigger value="coins" className="text-xs truncate data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-violet-300 data-[state=active]:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <Coins className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{t('boostShop.tabs.coins')}</span>
                </TabsTrigger>
                <TabsTrigger value="premium" className="text-xs truncate data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-violet-300 data-[state=active]:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <Crown className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{t('boostShop.tabs.premium')}</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs truncate data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-violet-300 data-[state=active]:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <History className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{t('boostShop.tabs.history')}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Boosts Tab */}
            <TabsContent 
              value="boosts" 
              className="p-3 md:p-4 space-y-4 mt-3 md:mt-4"
            >
              {/* Фильтры категорий */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { value: 'all', label: 'ALL SOFTWARE', icon: Zap },
                  { value: 'exploit', label: 'OFFENSE', icon: Zap, color: 'red' },
                  { value: 'defense', label: 'DEFENSE', icon: Shield, color: 'cyan' },
                  { value: 'utility', label: 'UTILS', icon: Wand2, color: 'emerald' },
                  { value: 'premium', label: 'PREMIUM', icon: Crown, color: 'amber' },
                ].map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={(e) => {
                      // ОПТИМИЗАЦИЯ: Предотвращаем множественные клики
                      e.preventDefault();
                      e.stopPropagation();
                      setCategoryFilter(value as typeof categoryFilter);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                      categoryFilter === value
                        ? color === 'red'
                          ? "bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                          : color === 'cyan'
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                          : color === 'emerald'
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                          : color === 'amber'
                          ? "bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                          : "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                        : "bg-zinc-100 dark:bg-white/5 border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Grid Layout для бустов */}
              {(filteredRegularBoosts.length > 0 || filteredPremiumBoosts.length > 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredRegularBoosts.map((boost) => (
                    <MarketItem
                      key={boost.id}
                      boost={boost}
                      inventoryCount={getInventoryCount(boost.type)}
                      coins={coins}
                      onPurchase={() => handlePurchase(boost)}
                      onInspect={() => {
                        console.log('[BoostShopModal] Setting selectedBoostForInspect:', boost.type);
                        setSelectedBoostForInspect(boost);
                      }}
                      category={getBoostCategory(boost.type)}
                      isPurchasing={boostPurchaseLoading === boost.type}
                      onPurchaseComplete={() => {
                        // Callback после завершения анимации покупки
                      }}
                    />
                  ))}
                  {filteredPremiumBoosts.map((boost) => (
                    <MarketItem
                      key={boost.id}
                      boost={boost}
                      inventoryCount={getInventoryCount(boost.type)}
                      coins={coins}
                      onPurchase={() => handlePurchase(boost)}
                      onInspect={() => {
                        console.log('[BoostShopModal] Setting selectedBoostForInspect:', boost.type);
                        setSelectedBoostForInspect(boost);
                      }}
                      category={getBoostCategory(boost.type)}
                      isPurchasing={boostPurchaseLoading === boost.type}
                      onPurchaseComplete={() => {
                        // Callback после завершения анимации покупки
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('boostShop.sections.empty')}</p>
                </div>
              )}
            </TabsContent>

            {/* Coins Tab */}
            <TabsContent 
              value="coins" 
              className="p-4 md:p-6 space-y-4 mt-3 md:mt-4"
            >
              <div className="space-y-3">
                {/* CRYPTO MINER - Киберпанк-стиль реклама за монеты (только для non-Premium) */}
                {!isPremium && (
                  <CryptoMinerAdButton />
                )}

                <div className="grid gap-4">
                  {coinPacks.map((pack, idx) => {
                    // Выделяем пак 500 монет как "Best Value" (лучшее соотношение цена/количество)
                    const isBestValue = pack.amount === 500;
                    const isHighlighted = Boolean(pack.highlight);
                    const pricePerCoin = pack.priceValue && pack.priceCoins
                      ? pack.priceValue / pack.priceCoins
                      : null;
                    const description = t(pack.descriptionKey ?? 'boostShop.coins.purpose');
                    const helperText = t(pack.helperKey ?? 'boostShop.coins.deliveryHint');
                    return (
                    <Card
                      key={idx}
                        className={`group relative overflow-hidden rounded-3xl border bg-card p-4 md:p-6 shadow-lg transition-all duration-200 hover:-translate-y-1 ${
                          isBestValue
                            ? 'border-violet-500/50 shadow-[0_15px_40px_rgba(139,92,246,0.35)] dark:shadow-[0_15px_40px_rgba(139,92,246,0.35)] scale-[1.02] ring-2 ring-violet-500/30'
                            : isHighlighted
                              ? 'border-yellow-400/50 shadow-[0_15px_40px_rgba(251,191,36,0.25)] dark:shadow-[0_15px_40px_rgba(251,191,36,0.25)]'
                              : 'border-border hover:border-violet-500/30'
                        }`}
                      >
                      <div className="flex flex-col gap-4 md:gap-5">
                        <div className="flex items-start gap-4">
                            {/* Best Value бейдж - размещаем слева от иконки, не перекрывая цену */}
                            {isBestValue && (
                              <div className="absolute -top-2 left-4 z-10">
                                <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 shadow-lg shadow-violet-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  🔥 ХИТ
                                </Badge>
                              </div>
                            )}
                            <div className={`relative w-16 h-16 rounded-3xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
                              isBestValue
                                ? 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 text-white shadow-lg shadow-violet-500/50'
                                : isHighlighted
                                  ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-slate-900'
                                  : 'bg-gradient-to-br from-yellow-500/20 via-amber-500/30 to-orange-500/20 border border-yellow-500/30'
                            }`}>
                            {/* Эффект свечения для всех иконок */}
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-orange-500/20 blur-sm" />
                            <Coins className={`relative w-8 h-8 ${
                              isBestValue || isHighlighted 
                                ? 'drop-shadow-lg' 
                                : 'text-yellow-400 drop-shadow-md'
                            }`} />
                            {/* Дополнительные монеты для эффекта "кучи" */}
                            {!isBestValue && !isHighlighted && (
                              <>
                                <Coins className="absolute w-5 h-5 text-yellow-500/40 -top-1 -right-1 rotate-12" />
                                <Coins className="absolute w-4 h-4 text-amber-500/30 -bottom-1 -left-1 -rotate-12" />
                              </>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-xl font-bold text-foreground truncate">
                              {t('boostShop.coins.packLabel', { amount: pack.amount })}
                            </p>
                              <p className="text-xs text-muted-foreground">
                                {description}
                              </p>
                            {pack.bonus > 0 && (
                                <div className="flex items-center gap-1.5 text-sm font-bold mt-1.5 text-emerald-600 dark:text-emerald-400">
                                  <Sparkles className="w-4 h-4" />
                                {t('boostShop.coins.bonusLabel', { bonus: pack.bonus })}
                                </div>
                            )}
                          </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-2xl font-black text-foreground">{pack.price}</span>
                              {pricePerCoin && (
                                <p className="text-[11px] text-muted-foreground">
                                  ≈ {t('boostShop.coins.perCoin', { price: pricePerCoin.toFixed(2) })}
                                </p>
                              )}
                            </div>
                        </div>

                          <div className="flex flex-col gap-3">
                            <div className="flex items-center text-xs text-muted-foreground gap-2">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-center">{helperText}</span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                            
                            {/* Главная кнопка покупки */}
                            <div className="flex flex-col gap-2">
                              {/* Telegram Stars (приоритетный метод в Telegram) */}
                              {showStarsPayment && (
                                <StarsPaymentButton
                                  packageKey={pack.packageKey}
                                  priceCoins={pack.priceCoins}
                                  onSuccess={() => {
                                    loadData();
                                    toast({
                                      title: t('boostShop.coins.successTitle'),
                                      description: t('boostShop.coins.successDescription', { amount: pack.amount }),
                                      duration: 5000,
                                    });
                                  }}
                                  variant="default"
                                  size="default"
                                  className={`w-full h-12 font-semibold text-base ${
                                    isHighlighted 
                                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 hover:brightness-110' 
                                      : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50'
                                  } transition-all duration-200 hover:scale-[1.01] ${
                                    isBestValue ? 'ring-2 ring-violet-400/50' : ''
                                  }`}
                                />
                              )}
                              
                              {/* Paddle (основной метод для web) - главная кнопка */}
                              {!showStarsPayment && showPaddlePayment && (
                                <Button
                                  size="lg"
                                  aria-label={t('boostShop.coins.buyPackAria', { amount: pack.amount })}
                                  onClick={() => handleCoinPurchase(pack.catalogKey)}
                                  className={`w-full h-12 font-semibold text-base bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-200 hover:scale-[1.01] ${
                                    isBestValue ? 'ring-2 ring-violet-400/50' : ''
                                  }`}
                                  disabled={!profileId || purchaseLoading === pack.catalogKey || paddleLoading}
                                >
                                  {purchaseLoading === pack.catalogKey ? (
                                    <>
                                      <div className="w-5 h-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      {t('boostShop.coins.loading', { defaultValue: 'Загрузка...' })}
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingBag className="w-5 h-5 mr-2" />
                                      Купить за {pack.price}
                                    </>
                                  )}
                                </Button>
                              )}
                              
                              {/* Крипто как опция (маленькая ссылка) */}
                              {showCryptomusPayment && (
                                <button
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
                                  className="text-xs text-muted-foreground hover:text-violet-400 transition-colors text-center py-1"
                                  disabled={!profileId}
                                >
                                  или оплатить криптовалютой
                                </button>
                              )}
                            </div>
                            
                            {/* Сообщение если нет доступных методов */}
                            {!showStarsPayment && !showCryptomusPayment && !showPaddlePayment && (
                              <div className="text-sm text-muted-foreground text-center py-2 w-full">
                                Используйте Telegram Mini App для оплаты через Stars
                              </div>
                            )}
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
              className="p-3 md:p-4 space-y-4 mt-3 md:mt-4"
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
      </div>
    );
  };

  // Кастомный заголовок в стиле BLACK MARKET
  const headerContent = (
    <div className="px-4 md:px-6 py-3 md:py-4 border-b border-zinc-300 dark:border-white/10 shrink-0 bg-zinc-50 dark:bg-black/95 backdrop-blur-xl relative pr-12 md:pr-14">
      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.02] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />
      
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 to-orange-500/30 rounded-lg blur-sm" />
            <ShoppingBag className="relative w-4 h-4 md:w-5 md:h-5 text-red-500 dark:text-red-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black truncate text-zinc-900 dark:text-white tracking-wider font-mono">
              BLACK MARKET
            </h2>
            <p className="text-[10px] font-mono text-zinc-600 dark:text-white/40 tracking-widest uppercase">
              ILLEGAL SOFTWARE DEPOT
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-black/40 border border-yellow-500/40 dark:border-yellow-500/20 hover:border-yellow-500/60 dark:hover:border-yellow-500/40 transition-all cursor-pointer backdrop-blur-sm"
            onClick={async () => {
              setActiveTab('history');
              if (transactions.length === 0) {
                await loadTransactionHistory();
              }
            }}
          >
            <Coins className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
            <NumberTicker 
              value={coins} 
              className="text-sm font-bold font-mono text-yellow-600 dark:text-yellow-500"
              shouldFlash={true}
            />
            <History className="w-3 h-3 text-zinc-500 dark:text-white/40 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        headerContent={headerContent}
        className="max-w-5xl"
        contentClassName="scrollbar-none"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <ModalContent />
        )}
      </ResponsiveModal>
      
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
            loadData();
          }}
          onCancel={() => {
            // Ничего не делаем при отмене
          }}
        />
      )}

      {/* Rewarded Ad Modal */}
      <RewardedAdModal
        open={showRewardedAdModal}
        onOpenChange={setShowRewardedAdModal}
        rewardType="coins"
        rewardAmount={20}
        onRewardClaimed={async () => {
          // Вызываем Edge Function для начисления награды
          if (!profileId) return;
          
          try {
            // Retry логика для мобильных устройств (где могут быть проблемы с сетью)
            const maxRetries = 3;
            let lastError: any = null;
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                const { data, error } = await supabaseClient.functions.invoke('ad-reward', {
                  body: {
                    user_id: profileId,
                    reward_type: 'coins',
                    amount: 20,
                  },
                });

                if (error) {
                  console.error(`[BoostShop] Error claiming ad reward (attempt ${attempt + 1}/${maxRetries}):`, error);
                  lastError = error;
                  
                  // Если это последняя попытка, выбрасываем ошибку
                  if (attempt === maxRetries - 1) {
                    throw error;
                  }
                  
                  // Ждем перед следующей попыткой (экспоненциальная задержка)
                  const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }

                // Успех - выходим из цикла
                console.log('[BoostShop] Ad reward claimed successfully');
                break;
              } catch (err: any) {
                console.error(`[BoostShop] Exception during ad reward claim (attempt ${attempt + 1}/${maxRetries}):`, err);
                lastError = err;
                
                // Если это последняя попытка, выбрасываем ошибку
                if (attempt === maxRetries - 1) {
                  throw err;
                }
                
                // Ждем перед следующей попыткой
                const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }

            // Баланс уже обновлен через invalidateQueries выше, но обновляем и локальные данные модалки
            try {
              await loadData();
            } catch (loadError) {
              console.error('[BoostShop] Error loading data after reward:', loadError);
              // Не критично, просто логируем
            }
            
            toast({
              title: '✨ Монеты получены!',
              description: 'Тебе начислено 20 монет за просмотр рекламы',
            });
            
          } catch (error: any) {
            console.error('[BoostShop] Error claiming ad reward:', error);
            toast({
              title: 'Ошибка',
              description: error.message || 'Не удалось начислить монеты',
              variant: 'destructive',
            });
          }
        }}
      />

      {/* Boost Inspect Sheet (Product Details) */}
      {selectedBoostForInspect && (() => {
        console.log('[BoostShopModal] Rendering inspect sheet for:', selectedBoostForInspect.type);
        const inspectBoost = selectedBoostForInspect;
        const inspectCategory = getBoostCategory(inspectBoost.type);
        const inspectInventoryCount = getInventoryCount(inspectBoost.type);
        const inspectCanAfford = coins >= inspectBoost.cost_coins;
        const inspectIsConsumable = !inspectBoost.is_premium;
        const inspectIsButtonDisabled = !inspectIsConsumable && inspectInventoryCount > 0;
        
        const inspectTheme = inspectCategory === 'exploit'
          ? {
              border: 'border-red-500/30',
              icon: 'text-red-500',
              bg: 'bg-red-500/20',
              text: 'text-red-400',
              buttonBg: 'bg-red-500/20 hover:bg-red-500/30',
              buttonBorder: 'border-red-500/50',
              buttonShadow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
            }
          : inspectCategory === 'defense'
          ? {
              border: 'border-cyan-500/30',
              icon: 'text-cyan-400',
              bg: 'bg-cyan-500/20',
              text: 'text-cyan-400',
              buttonBg: 'bg-cyan-500/20 hover:bg-cyan-500/30',
              buttonBorder: 'border-cyan-500/50',
              buttonShadow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
            }
          : {
              border: 'border-emerald-500/30',
              icon: 'text-emerald-400',
              bg: 'bg-emerald-500/20',
              text: 'text-emerald-400',
              buttonBg: 'bg-emerald-500/20 hover:bg-emerald-500/30',
              buttonBorder: 'border-emerald-500/50',
              buttonShadow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
            };

        return (
          <ResponsiveModal
            open={!!selectedBoostForInspect} 
            onOpenChange={(open) => {
              console.log('[BoostShopModal] ResponsiveModal onOpenChange:', open, 'selectedBoost:', selectedBoostForInspect?.type);
              if (!open) {
                setSelectedBoostForInspect(null);
              }
            }}
            className="bg-white dark:bg-[#0f1014] border-t border-zinc-200 dark:border-white/10 max-h-[80vh] relative"
            contentClassName="p-6 relative"
          >
              {/* Noise texture */}
              <div 
                className="absolute inset-0 opacity-[0.01] dark:opacity-[0.02] mix-blend-overlay pointer-events-none z-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat'
                }}
              />
              
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "w-16 h-16 rounded-xl flex items-center justify-center",
                    "bg-zinc-100 dark:bg-black/50 border border-zinc-300 dark:border-white/10",
                    inspectTheme.buttonShadow
                  )}>
                    <span 
                      className={cn("text-3xl", inspectTheme.icon)}
                      style={{
                        filter: `drop-shadow(0 0 12px ${
                          inspectCategory === 'exploit' ? 'rgba(239, 68, 68, 0.8)' : 
                          inspectCategory === 'defense' ? 'rgba(6, 182, 212, 0.8)' : 
                          'rgba(34, 197, 94, 0.8)'
                        })`
                      }}
                    >
                      {inspectBoost.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-mono text-zinc-600 dark:text-white/40 mb-1">
                      {inspectCategory === 'exploit' ? 'ATK' : inspectCategory === 'defense' ? 'DEF' : 'UTL'}_MODULE v.{inspectInventoryCount || 1}
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                      {translateBoostField(inspectBoost.type, 'name', inspectBoost.name_ru)}
                    </h2>
                    {inspectInventoryCount > 0 && inspectIsConsumable && (
                      <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                        STOCK: {inspectInventoryCount}
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Description */}
                <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-xl border border-zinc-200 dark:border-white/5 mb-6">
                  <h3 className="text-xs font-mono text-zinc-600 dark:text-white/40 mb-2 uppercase tracking-wider">System Effect</h3>
                  <p className="text-sm text-zinc-700 dark:text-white/80 leading-relaxed">
                    {translateBoostField(inspectBoost.type, 'description', inspectBoost.description_ru)}
                  </p>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="p-3 rounded-lg bg-zinc-100 dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                    <div className="text-[10px] text-zinc-500 dark:text-white/30 font-mono mb-1">DURATION</div>
                    <div className="text-sm text-zinc-900 dark:text-white font-bold">1 Round</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-100 dark:bg-black/30 border border-zinc-200 dark:border-white/5">
                    <div className="text-[10px] text-zinc-500 dark:text-white/30 font-mono mb-1">TARGET</div>
                    <div className="text-sm text-zinc-900 dark:text-white font-bold">
                      {inspectCategory === 'exploit' ? 'Enemy System' : inspectCategory === 'defense' ? 'Self' : 'Both'}
                    </div>
                  </div>
                </div>

                {/* Big Action Button */}
                <button
                  onClick={() => {
                    handlePurchase(inspectBoost);
                    setSelectedBoostForInspect(null);
                  }}
                  disabled={!inspectCanAfford || inspectBoost.is_premium || inspectIsButtonDisabled}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-lg transition-all",
                    "flex items-center justify-center gap-2",
                    inspectBoost.is_premium || inspectIsButtonDisabled || !inspectCanAfford
                      ? "bg-gray-500/10 text-gray-400 border border-gray-500/30 cursor-not-allowed"
                      : cn(
                          inspectTheme.buttonBg,
                          inspectTheme.text,
                          inspectTheme.buttonBorder,
                          inspectTheme.buttonShadow,
                          "active:scale-95"
                        )
                  )}
                >
                  {inspectBoost.is_premium ? (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>LOCKED</span>
                    </>
                  ) : !inspectCanAfford ? (
                    <span>INSUFFICIENT FUNDS</span>
                  ) : inspectIsButtonDisabled ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>OWNED</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>INSTALL MODULE</span>
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-yellow-500">{inspectBoost.cost_coins}</span>
                    </>
                  )}
                </button>
              </div>
          </ResponsiveModal>
        );
      })()}
    </>
  );
}
