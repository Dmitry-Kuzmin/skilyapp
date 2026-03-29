import { cn } from "@/lib/utils";
import { PRICING_PLANS, COIN_PACKS, DUEL_PASS_PRICE } from "@/lib/pricing-config";
import { useTonAddress } from "@/contexts/TonAddressContext";
import { beginCell } from "@ton/core";
import {
  useState,
  useEffect,
  useRef,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveModal,
  ModalSkeleton,
} from "@/components/ui/responsive-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Coins,
  X,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  History,
  Gift,
  Trophy,
  TestTube,
  Zap,
  Calendar,
  CreditCard,
  Users,
  Filter,
  Crown,
  Sparkles,
  Check,
  Video,
  ChevronDown,
  Shield,
  Wand2,
  Download,
  Lock,
  Heart,
  LayoutGrid,
  Pickaxe,
  Box,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext, UserContext } from "@/contexts/UserContext";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { toast } from "@/lib/toast";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { BoostCard } from "./BoostCard";
import { MarketItem } from "./MarketItem";
import { CryptoMinerAdvanced } from "./CryptoMinerAdvanced";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { PaywallModal } from "@/components/monetization/PaywallModal";
import { usePremium } from "@/hooks/usePremium";
import { RewardedAdModal } from "@/components/monetization/RewardedAdModal";
import { StarsPaymentButton } from "@/components/monetization/StarsPaymentButton";
import { TonWalletHeader } from "@/components/monetization/TonWalletHeader";
// CryptomusPaymentPreview merged into PaymentSelectorModal
import { useAddress } from "@ton/appkit-react";
import {
  getTelegramWebApp,
  isTelegramMiniApp,
  triggerHapticFeedback,
} from "@/lib/telegram";
import { NumberTicker } from "@/components/ui/NumberTicker";
import { dispatchUserEvent } from "@/lib/notification-events";
import { PAYMENT_CONFIG, isPaymentMethodAvailable } from "@/lib/payment-config";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { trackOfflineAction } from "@/utils/offlineAnalytics";
import {
  getPaddleInstance,
  getPaddleInstanceSync,
  preloadPaddle,
} from "@/lib/paddle";
import type { Paddle } from "@paddle/paddle-js";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModalStore } from "@/store/modalStore";
import { showAdSenseRewardedVideo } from "@/lib/adsense";
import { UnifiedPricingCard } from "./UnifiedPricingCard";
import { PaymentSelectorModal } from "./PaymentSelectorModal";


const supabaseClient = supabase as any;

const localeMap: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
  ru: "ru-RU",
};

const PLAN_TO_CATALOG: Record<string, string> = {
  monthly: "premium_monthly",
  quarterly: "premium_quarterly",
  biannual: "premium_biannual",
  yearly: "premium_yearly",
  lifetime: "premium_lifetime",
};

interface BoostShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "boosts" | "coins" | "premium" | "history";
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
  category?: "earn" | "spend" | "purchase" | "reward";
  icon?: any; // React component
  metadata?: any;
}

export function BoostShopModal({
  open,
  onOpenChange,
  initialTab,
}: BoostShopModalProps) {
  // БЕЗОПАСНОЕ использование UserContext - может быть undefined если модалка открыта вне UserProvider
  const userContext = useContext(UserContext);

  // Хуки должны вызываться безусловно (правила React)
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [inventory, setInventory] = useState<BoostInventory[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [paddleLoading, setPaddleLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [boostPurchaseLoading, setBoostPurchaseLoading] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'earn' | 'spend' | 'purchase' | 'reward'>('all');
  const [activeTab, setActiveTab] = useState<'boosts' | 'coins' | 'premium' | 'history'>(initialTab || 'boosts');
  const [paddleCheckoutUrl, setPaddleCheckoutUrl] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [showRewardedAdModal, setShowRewardedAdModal] = useState(false);
  const [adTestLoading, setAdTestLoading] = useState(false);
  
  // Новое состояние для унифицированной оплаты
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [isPaymentSelectorOpen, setIsPaymentSelectorOpen] = useState(false);


  const modalContentRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  const historyLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Вычисляем параметры которые нужны для useEffect (не хуки — просто вычисления)
  const profileId = userContext?.profileId ?? null;
  const platform = userContext?.platform ?? 'web';
  const dateLocale = localeMap[language] || 'en-US';
  const { enqueue: enqueueOfflineAction } = useOfflineQueue(profileId || undefined);
  // Супер-надежная проверка Telegram (включая Desktop MacOS) из telegram.ts
  const webApp = getTelegramWebApp();
  const isTWA = isTelegramMiniApp() || !!webApp;
  const currentPlatform: 'telegram' | 'web' | 'mobile' = isTWA ? 'telegram' : (platform === 'telegram' ? 'telegram' : 'web');
  
  // Принудительно показываем звезды в среде Telegram
  const showStarsPayment = isTWA || isPaymentMethodAvailable('telegram_stars', currentPlatform);
  const showCryptomusPayment = isPaymentMethodAvailable('cryptomus', currentPlatform);
  const showPaddlePayment = isPaymentMethodAvailable('paddle', currentPlatform);
  const showTonPayment = isPaymentMethodAvailable('ton', currentPlatform);
  const tonAddress = useTonAddress();

  const handleBuyClick = useCallback((pack: any) => {
    setSelectedPack(pack);
    setIsPaymentSelectorOpen(true);
    triggerHapticFeedback('light');
  }, []);


  // Логирование для отладки
  useEffect(() => {
    if (open) {
      console.log('[BoostShopModal] Payment methods availability:', {
        platform,
        currentPlatform,
        showStarsPayment,
        showCryptomusPayment,
        showPaddlePayment,
        paddleEnabled: PAYMENT_CONFIG.paddleEnabled,
      });
    }
  }, [open, platform, currentPlatform, showStarsPayment, showCryptomusPayment, showPaddlePayment]);

  // Инициализация Paddle SDK
  useEffect(() => {
    if (!showPaddlePayment) return;
    const existingPaddle = getPaddleInstanceSync();
    if (existingPaddle) {
      setPaddle(existingPaddle);
      return;
    }
    setPaddleLoading(true);
    getPaddleInstance()
      .then((instance) => { setPaddle(instance || null); })
      .catch((error) => { console.error('[BoostShopModal] Failed to get Paddle instance:', error); })
      .finally(() => { setPaddleLoading(false); });
  }, [showPaddlePayment]);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Загружаем данные при открытии
  useEffect(() => {
    if (open && !hasLoadedRef.current && profileId) {
      console.log('[BoostShopModal] Загрузка данных, profileId:', profileId);
      hasLoadedRef.current = true;
      loadData();
    } else if (!open) {
      hasLoadedRef.current = false;
    } else if (open && !profileId) {
      console.warn('[BoostShopModal] Модалка открыта, но profileId отсутствует');
    }
  }, [open, profileId]);

  // Загружаем историю транзакций при переключении на вкладку "История"
  useEffect(() => {
    if (open && activeTab === 'history' && transactions.length === 0 && !loadingHistory) {
      historyLoadTimeoutRef.current = setTimeout(() => { loadTransactionHistory(); }, 150);
    }
    return () => {
      if (historyLoadTimeoutRef.current) clearTimeout(historyLoadTimeoutRef.current);
    };
  }, [open, activeTab]);

  // Сбрасываем скролл контента при переключении вкладок
  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => {
      const scrollableContainer = modalContentRef.current?.querySelector('[data-scrollable]') as HTMLElement;
      if (scrollableContainer) scrollableContainer.scrollTop = 0;
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [activeTab, open]);

  // userContext проверен на null в самом конце компонента перед рендером
  const translateBoostField = (
    boostType: string | undefined,
    field: "name" | "description",
    fallback?: string,
  ) => {
    if (!boostType) {
      return fallback || "";
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
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPremiumTypeLabel = (subType: string) => {
    const key = `boostShop.transactions.premiumType.${subType}`;
    const label = t(key);
    return label === key ? subType : label;
  };

  const getPremiumPurchaseDescription = (subType: string, price?: number) => {
    const description = t("boostShop.transactions.premiumPurchase", {
      type: getPremiumTypeLabel(subType),
    });
    return price ? `${description} - €${price}` : description;
  };

  const coinPacks = [
    {
      amount: 100,
      price: "€2.99",
      priceValue: 2.99,
      bonus: 0,
      catalogKey: "coins_pack_100",
      packageKey: "coins_100",
      priceCoins: 100,
      descriptionKey: "boostShop.coins.descriptions.starter",
      helperKey: "boostShop.coins.helpers.starter",
    },
    {
      amount: 500,
      price: "€9.99",
      priceValue: 9.99,
      bonus: 50,
      catalogKey: "coins_pack_500",
      packageKey: "coins_500",
      priceCoins: 550,
      descriptionKey: "boostShop.coins.descriptions.grinder",
      helperKey: "boostShop.coins.helpers.grinder",
    },
    {
      amount: 1200,
      price: "€19.99",
      priceValue: 19.99,
      bonus: 200,
      catalogKey: "coins_pack_1200",
      packageKey: "coins_1200",
      priceCoins: 1400,
      descriptionKey: "boostShop.coins.descriptions.pro",
      helperKey: "boostShop.coins.helpers.pro",
    },
    {
      amount: 3000,
      price: "€39.99",
      priceValue: 39.99,
      bonus: 500,
      catalogKey: "coins_pack_3000",
      packageKey: "coins_3000",
      priceCoins: 3500,
      highlight: true,
      descriptionKey: "boostShop.coins.descriptions.elite",
      helperKey: "boostShop.coins.helpers.elite",
    },
  ] as const;



  const loadData = async () => {
    console.log("[BoostShopModal] loadData вызвана, profileId:", profileId);
    if (!profileId) {
      console.warn("[BoostShop] profileId не установлен");
      setLoading(false);
      return;
    }

    try {
      console.log("[BoostShopModal] Начинаем загрузку данных...");
      setLoading(true);

      // Загрузка бустов
      const { data: boostsData, error: boostsError } = await supabaseClient
        .from("boost_definitions")
        .select("*")
        .order("cost_coins", { ascending: true });

      if (boostsError) {
        console.error("[BoostShop] Ошибка загрузки бустов:", boostsError);
      } else if (boostsData) {
        setBoosts(boostsData);
      }

      // Загрузка профиля
      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, coins")
        .eq("id", profileId)
        .single();

      if (profileError) {
        console.error("[BoostShop] Ошибка загрузки профиля:", profileError);
        console.error("[BoostShop] ProfileId, который не найден:", profileId);
        // Если профиль не найден, пробуем перезагрузить profileId из контекста
        if (profileError.code === "PGRST116") {
          console.warn(
            "[BoostShop] Профиль не найден в базе. Возможно, profileId устарел.",
          );
        }
      } else if (profile) {
        console.log("[BoostShop] Профиль загружен:", {
          id: profile.id,
          coins: profile.coins,
        });
        setCoins(profile.coins || 0);
      }

      // Загрузка инвентаря через RPC (обходит RLS для Telegram)
      const { data: inventoryData, error: inventoryError } =
        await supabaseClient.rpc("get_user_boost_inventory", {
          p_user_id: profileId,
        });

      if (inventoryError) {
        console.error("[BoostShop] Ошибка загрузки инвентаря:", inventoryError);
        // Fallback к прямому запросу
        const { data: fallbackData } = await supabaseClient
          .from("boost_inventory")
          .select("boost_type, quantity")
          .eq("user_id", profileId);
        if (fallbackData) {
          setInventory(fallbackData);
        }
      } else if (inventoryData) {
        setInventory(inventoryData);
      }
    } catch (error) {
      console.error("[BoostShop] Ошибка загрузки данных магазина:", error);
    } finally {
      console.log("[BoostShopModal] Загрузка данных завершена, loading: false");
      setLoading(false);
    }
  };

  const getInventoryCount = (boostType: string) => {
    return inventory.find((i) => i.boost_type === boostType)?.quantity || 0;
  };

  // Функция для получения читаемого названия буста
  const getBoostDisplayName = (
    boostType?: string,
    fallback?: string,
  ): string => {
    return translateBoostField(boostType, "name", fallback);
  };

  const getTransactionInfo = (
    type: string,
    metadata?: any,
  ): {
    description: string;
    icon: any;
    category: "earn" | "spend" | "purchase" | "reward";
  } => {
    const duelPassRewardDescription = (meta?: any) => {
      const levelSuffix = meta?.level
        ? t("boostShop.transactions.duelPassRewardLevelSuffix", {
          level: meta.level,
        })
        : "";
      const premiumSuffix = meta?.is_premium
        ? t("boostShop.transactions.duelPassRewardPremiumSuffix")
        : "";
      return t("boostShop.transactions.duelPassReward", {
        level: levelSuffix,
        premium: premiumSuffix,
      });
    };

    switch (type) {
      case "coins_earned_test":
        return {
          icon: TestTube,
          description: t("boostShop.transactions.coinsEarnedTest"),
          category: "earn",
        };
      case "coins_earned_duel":
        return {
          icon: Zap,
          description: t("boostShop.transactions.coinsEarnedDuel"),
          category: "earn",
        };
      case "coins_earned_daily":
        if (metadata?.source === "duel_pass_reward") {
          return {
            icon: Trophy,
            description: duelPassRewardDescription(metadata),
            category: "reward",
          };
        }
        return {
          icon: Calendar,
          description: t("boostShop.transactions.coinsEarnedDaily"),
          category: "earn",
        };
      case "coins_earned_premium_bonus":
        return {
          icon: Gift,
          description: t("boostShop.transactions.coinsEarnedPremiumBonus"),
          category: "earn",
        };
      case "coins_earned_ad":
        return {
          icon: Video,
          description: t("boostShop.transactions.coinsEarnedAd", {
            amount: metadata?.amount || 25,
          }),
          category: "earn",
        };
      case "coins_spent_boost":
        return {
          icon: Zap,
          description: t("boostShop.transactions.coinsSpentBoost", {
            name:
              metadata?.boost_name ||
              getBoostDisplayName(
                metadata?.boost_type,
                metadata?.boost_type || "",
              ),
          }),
          category: "spend",
        };
      case "coins_spent_skin":
        return {
          icon: Gift,
          description: t("boostShop.transactions.coinsSpentSkin"),
          category: "spend",
        };
      case "coins_spent_duel_entry":
        return {
          icon: Zap,
          description: t("boostShop.transactions.coinsSpentDuelEntry"),
          category: "spend",
        };
      case "coins_spent_slot_unlock":
        return {
          icon: Zap,
          description: t("boostShop.transactions.coinsSpentSlotUnlock"),
          category: "spend",
        };
      case "premium_purchase_monthly":
      case "premium_purchase_yearly":
      case "premium_purchase_forever": {
        const subType =
          metadata?.subscription_type ||
          (type.includes("yearly")
            ? "yearly"
            : type.includes("forever")
              ? "forever"
              : "monthly");
        return {
          icon: CreditCard,
          description: getPremiumPurchaseDescription(subType, metadata?.price),
          category: "purchase",
        };
      }
      case "coins_purchase_paddle":
        return {
          icon: CreditCard,
          description: t("boostShop.transactions.coinsPurchasePaddle", {
            amount: metadata?.amount || 0,
          }),
          category: "purchase",
        };
      case "coins_purchase_cryptomus":
        return {
          icon: CreditCard,
          description: t("boostShop.transactions.coinsPurchaseCryptomus", {
            amount: metadata?.amount || 0,
          }),
          category: "purchase",
        };
      case "coins_purchase_telegram_stars":
        return {
          icon: Sparkles,
          description: t("boostShop.transactions.coinsPurchaseStars", {
            amount: metadata?.amount || 0,
          }),
          category: "purchase",
        };
      case "duel_pass_purchase":
        return {
          icon: Trophy,
          description: t("boostShop.transactions.duelPassPurchase"),
          category: "purchase",
        };
      case "bet":
        return {
          icon: Zap,
          description: t("boostShop.transactions.bet"),
          category: "spend",
        };
      case "win":
        return {
          icon: Trophy,
          description: t("boostShop.transactions.win"),
          category: "earn",
        };
      case "refund":
        return {
          icon: Gift,
          description: t("boostShop.transactions.refund"),
          category: "earn",
        };
      case "commission":
        return {
          icon: Coins,
          description: t("boostShop.transactions.commission"),
          category: "spend",
        };
      case "win_payout":
        return {
          icon: Trophy,
          description: t("boostShop.transactions.win_payout"),
          category: "earn",
        };
      case "base_payout":
        return {
          icon: Trophy,
          description: t("boostShop.transactions.base_payout"),
          category: "earn",
        };
      case "insurance_premium":
        return {
          icon: Shield,
          description: t("boostShop.transactions.insurance_premium"),
          category: "spend",
        };
      case "insurance_refund":
        return {
          icon: Shield,
          description: t("boostShop.transactions.insurance_refund"),
          category: "earn",
        };
      case "help_friend":
        return {
          icon: Heart,
          description: t("boostShop.transactions.help_friend"),
          category: "spend",
        };
      case "referral_earned":
        return {
          icon: Users,
          description: t("boostShop.transactions.referralReward", {
            name:
              metadata?.name ||
              t("boostShop.transactions.referralFallbackName"),
          }),
          category: "reward",
        };
      case "referral_joined":
        return {
          icon: Gift,
          description: t("boostShop.transactions.referralJoined"),
          category: "reward",
        };
      case "duel_pass_reward":
        return {
          icon: Trophy,
          description: duelPassRewardDescription(metadata),
          category: "reward",
        };
      default:
        return { icon: Coins, description: type, category: "earn" };
    }
  };

  const loadTransactionHistory = async () => {
    if (!profileId) return;

    setLoadingHistory(true);
    try {
      const allTransactions: Transaction[] = [];

      // 🚀 ОПТИМИЗАЦИЯ: Параллельная загрузка всех источников данных
      const [
        purchasesResult,
        transactionsResult,
        duelTxResult,
        referralsResult,
      ] = await Promise.all([
        // 1. Purchases (для enrichment + отображения)
        supabaseClient
          .from("purchases")
          .select(
            "id, item_type, price, currency, metadata, completed_at, created_at, status",
          )
          .eq("user_id", profileId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(30),

        // 2. Transactions через RPC
        supabaseClient.rpc("get_user_transactions", {
          p_user_id: profileId,
          p_limit: 100,
        }),

        // 3. Duel transactions
        supabaseClient
          .from("duel_transactions")
          .select("id, amount, transaction_type, created_at")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false })
          .limit(50),

        // 4. Referrals
        supabaseClient
          .from("referrals")
          .select(
            "referred_bonus, referral_bonus, reward_given, created_at, reward_given_at, referred:referred_id(first_name)",
          )
          .or(`referrer_id.eq.${profileId},referred_id.eq.${profileId}`)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      // Create purchase map for enrichment
      const purchaseMap = new Map<string, any>();
      const purchases = purchasesResult.data || [];
      purchases.forEach((p: any) => {
        const sessionId = p.metadata?.session_id || p.id;
        purchaseMap.set(sessionId, p);
      });

      // Process transactions
      const newTransactions = transactionsResult.data;
      if (transactionsResult.error) {
        console.error(
          "[BoostShop] RPC error, using empty array:",
          transactionsResult.error.message,
        );
      }

      if (newTransactions) {
        newTransactions.forEach((tx: any) => {
          let enrichedMetadata = { ...tx.metadata };
          if (
            tx.transaction_type?.startsWith("premium_purchase_") &&
            tx.metadata?.session_id
          ) {
            const purchase = purchaseMap.get(tx.metadata.session_id);
            if (purchase?.price) {
              enrichedMetadata = {
                ...enrichedMetadata,
                price: purchase.price,
                currency: purchase.currency || "EUR",
                subscription_type:
                  purchase.metadata?.subscription_type ||
                  (tx.transaction_type.includes("yearly")
                    ? "yearly"
                    : tx.transaction_type.includes("forever")
                      ? "forever"
                      : "monthly"),
              };
            }
          }

          const info = getTransactionInfo(
            tx.transaction_type,
            enrichedMetadata,
          );
          allTransactions.push({
            id: tx.id,
            amount: tx.amount,
            type: tx.transaction_type,
            description: info.description,
            created_at: tx.created_at,
            category: info.category,
            icon: info.icon,
            metadata: enrichedMetadata,
          });
        });
      }

      // Process duel transactions
      const duelTx = duelTxResult.data;
      if (duelTx) {
        duelTx.forEach((tx: any) => {
          const info = getTransactionInfo(tx.transaction_type);
          allTransactions.push({
            id: tx.id || `duel_${tx.created_at}`,
            amount: tx.amount,
            type: tx.transaction_type,
            description: info.description,
            created_at: tx.created_at,
            category: info.category,
            icon: info.icon,
          });
        });
      }

      // Process purchases
      purchases.forEach((purchase: any) => {
        let description = "";
        let amount = 0;
        let transactionType = "coins_purchase_paddle";

        if (purchase.item_type === "coins_pack") {
          const coinsAmount = purchase.metadata?.coins_amount || 0;

          if (
            purchase.metadata?.payment_method === "telegram_stars" ||
            purchase.metadata?.gateway === "telegram_stars"
          ) {
            transactionType = "coins_purchase_telegram_stars";
          }

          description = t("boostShop.transactions.coinsPurchasePaddle", {
            amount: coinsAmount,
          });
          amount = coinsAmount;
        } else if (purchase.item_type === "premium") {
          const price = purchase.price || purchase.metadata?.price || 0;
          const subscriptionType =
            purchase.metadata?.subscription_type || "monthly";
          description = getPremiumPurchaseDescription(subscriptionType, price);

          allTransactions.push({
            id: purchase.id,
            amount: 0,
            type:
              subscriptionType === "forever"
                ? "premium_purchase_forever"
                : subscriptionType === "yearly"
                  ? "premium_purchase_yearly"
                  : "premium_purchase_monthly",
            description,
            created_at: purchase.completed_at || purchase.created_at,
            category: "purchase",
            icon: CreditCard,
            metadata: {
              ...purchase.metadata,
              price,
              subscription_type: subscriptionType,
              currency: purchase.currency || "EUR",
            },
          });
        } else if (purchase.item_type === "duel_pass") {
          description = t("boostShop.transactions.duelPassPurchase");
          amount = 0;
        }

        if (amount > 0) {
          allTransactions.push({
            id: `purchase_${purchase.id}`,
            amount,
            type: transactionType,
            description,
            created_at: purchase.completed_at || purchase.created_at,
            category: "purchase",
            icon: CreditCard,
            metadata: purchase.metadata,
          });
        }
      });

      // Process referrals
      const referrals = referralsResult.data;
      if (referrals) {
        referrals.forEach((ref: any) => {
          const isReferrer = ref.reward_given;
          const referralName =
            (ref.referred as any)?.first_name ||
            t("boostShop.transactions.referralFallbackName");
          if (isReferrer) {
            allTransactions.push({
              id: `ref_earned_${ref.created_at}`,
              amount: ref.referral_bonus || 100,
              type: "referral_earned",
              description: t("boostShop.transactions.referralReward", {
                name: referralName,
              }),
              created_at: ref.reward_given_at || ref.created_at,
              category: "reward",
              icon: Users,
              metadata: { name: referralName },
            });
          }
          allTransactions.push({
            id: `ref_joined_${ref.created_at}`,
            amount: ref.referred_bonus || 50,
            type: "referral_joined",
            description: t("boostShop.transactions.referralJoined"),
            created_at: ref.created_at,
            category: "reward",
            icon: Gift,
          });
        });
      }

      // Sort by date (newest first)
      allTransactions.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error("[BoostShop] Error loading transaction history:", error);
      toast({
        title: t("boostShop.toasts.errorTitle"),
        description: t("boostShop.toasts.historyError"),
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // ОПТИМИЗАЦИЯ: useCallback для предотвращения лишних ререндеров дочерних компонентов
  const handleCoinPurchase = useCallback(
    async (catalogKey: string) => {
      if (!profileId) {
        toast({
          title: t("boostShop.toasts.errorTitle"),
          description: t("boostShop.toasts.needLogin"),
          variant: "destructive",
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
          console.log("[BoostShop] Paddle not ready, initializing...");
          paddleInstance = await getPaddleInstance();
          if (paddleInstance) {
            setPaddle(paddleInstance);
          }
        }

        // Получаем partner_code из localStorage (если пользователь пришел через партнерскую ссылку)
        const partnerCode = localStorage.getItem("partner_code");

        // Создаем Paddle Transaction через Edge Function
        const { data, error } = await supabaseClient.functions.invoke(
          "paddle-payment",
          {
            body: {
              user_id: profileId,
              catalog_key: catalogKey,
              ...(partnerCode ? { partner_code: partnerCode } : {}),
            },
          },
        );

        if (error) {
          console.error("[BoostShop] Purchase error:", error);
          toast({
            title: t("boostShop.toasts.errorTitle"),
            description:
              error.message || t("boostShop.toasts.purchaseErrorDescription"),
            variant: "destructive",
          });
          setPurchaseLoading(null);
          return;
        }

        if (data?.error) {
          console.error("[BoostShop] Error in response:", data.error);
          toast({
            title: t("boostShop.toasts.errorTitle"),
            description:
              data.error || t("boostShop.toasts.purchaseErrorDescription"),
            variant: "destructive",
          });
          setPurchaseLoading(null);
          return;
        }

        console.log("[BoostShop] Paddle response data:", {
          transactionId: data?.transaction_id,
          fullData: data,
        });

        if (!data?.transaction_id) {
          console.error("[BoostShop] No transaction_id in response:", data);
          toast({
            title: t("boostShop.toasts.errorTitle"),
            description: t("boostShop.toasts.sessionError"),
            variant: "destructive",
          });
          setPurchaseLoading(null);
          return;
        }

        // Сохраняем transaction_id для проверки
        sessionStorage.setItem("paddle_transaction_id", data.transaction_id);
        localStorage.setItem("paddle_transaction_id", data.transaction_id);

        // Open Paddle checkout as fullscreen iframe portal
        const checkoutUrl = data.checkout_url || `https://checkout.paddle.com/transaction/${data.transaction_id}`;
        setPaddleCheckoutUrl(checkoutUrl);
      } catch (err: any) {
        console.error("[BoostShop] Purchase error:", err);
        toast({
          title: t("boostShop.toasts.errorTitle"),
          description:
            err?.message || t("boostShop.toasts.purchaseErrorDescription"),
          variant: "destructive",
        });
      } finally {
        setPurchaseLoading(null);
      }
    },
    [profileId, paddle, showPaddlePayment, toast, t, loadData],
  );

  const handleCryptomusPurchase = useCallback(async () => {
    if (!selectedPack || !profileId) throw new Error("No pack selected");

    const itemName = selectedPack.title;
    const priceValue = selectedPack.priceValue;
    const catalogKey = selectedPack.catalogKey;

    console.log("[BoostShop] Starting Cryptomus purchase for:", catalogKey);
    const { data, error } = await supabaseClient.functions.invoke(
      "cryptomus-payment",
      {
        body: {
          user_id: profileId,
          catalog_key: catalogKey,
        },
      },
    );

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    console.log("[BoostShop] Cryptomus response:", { data: parsed, error });
    if (error || !parsed?.url) {
      toast({
        title: t("boostShop.toasts.errorTitle"),
        description: t("boostShop.toasts.purchaseErrorDescription"),
        variant: "destructive"
      });
      throw error || new Error("No payment URL");
    }

    return {
      paymentUrl: parsed.url,
      orderId: parsed.orderId,
      amount: priceValue,
      currency: 'EUR',
      itemName: itemName,
    };
  }, [selectedPack, profileId, t]);

  const handleCardPurchase = useCallback(() => {
    if (selectedPack) {
      handleCoinPurchase(selectedPack.catalogKey);
      setIsPaymentSelectorOpen(false);
    }
  }, [selectedPack, handleCoinPurchase]);

  // TON payment — close our modal first, then SDK shows its own popup
  const handleTonPurchase = useCallback(async () => {
    if (!selectedPack) return;
    setIsPaymentSelectorOpen(false);

    const amountTon = selectedPack.priceValue / 5;
    const { tonConnectUI, tonConnectionRestored } = await import('@/lib/ton-appkit');

    const doTransfer = async () => {
      console.log("[TON] Executing doTransfer for:", selectedPack.title);
      try {
        const commentBoc = beginCell()
          .storeUint(0, 32)
          .storeStringTail(`Purchase: ${selectedPack.title}`)
          .endCell()
          .toBoc()
          .toString('base64');

        // Используем 5 минут (300 секунд) вместо 10 минут - это более стандартно
        const now = Math.floor(Date.now() / 1000);
        const validUntil = now + 300;
        console.log("[TON] Time check - Now:", now, "Valid until:", validUntil, "Difference:", 300);

        await tonConnectUI.sendTransaction({
          validUntil: validUntil,
          messages: [{
            address: "UQBIEbX1WnJ-tVNvR9AqzsLGueW8K9idJlDFSBkm6xJiT6-m",
            amount: BigInt(Math.floor(amountTon * 1e9)).toString(),
            payload: commentBoc,
          }],
        });
        toast({ title: "TON", description: "✅ Оплата отправлена!" });
      } catch (err: any) {
        console.error("[TON] Transaction failure:", err);
        const msg = err?.message ?? String(err);
        console.log("[TON] Error details:", {
          message: msg,
          code: err?.code,
          isUserReject: msg.includes('User rejects') || msg.includes('User rejected'),
        });
        if (!msg.includes('User rejects') && !msg.includes('User rejected')) {
          toast({ title: "TON", description: "Ошибка оплаты", variant: "destructive" });
        }
      }
    };

    // Wait for session restoration before checking wallet state.
    // Without this, tonConnectUI.wallet is null during the first seconds
    // even if the session is being restored — causing the connect modal
    // to open unnecessarily every time.
    await tonConnectionRestored;

    const effectiveAddress = tonConnectUI.wallet?.account?.address;
    console.log("[TON] Address check after restore:", { sdk: effectiveAddress });

    if (effectiveAddress) {
      await doTransfer();
      return;
    }

    // Not connected even after restoration — open connect modal
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let modalDismissed = false;

    const unsub = tonConnectUI.onStatusChange((w) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (w) {
        unsub();
        modalDismissed = true;
        console.log("[TON] ✅ Connected! Wallet:", w.account?.address);
        console.log("[TON] Sending transaction...");
        doTransfer();
      } else {
        console.log("[TON] ⚠️ Wallet disconnected during modal");
      }
    });

    try {
      console.log("[TON] Opening wallet connection modal...");
      // Set timeout - if modal doesn't resolve in 45 seconds, close it
      timeoutHandle = setTimeout(() => {
        console.warn("[TON] Modal timeout - closing modal");
        modalDismissed = true;
        unsub();
        tonConnectUI.closeModal?.();
      }, 45000);

      await tonConnectUI.openModal();
      console.log("[TON] Modal closed");

      // If we get here and wallet wasn't selected, show error
      if (!modalDismissed) {
        console.log("[TON] No wallet was selected in modal");
      }
    } catch (e) {
      console.error('[TON] Modal error:', e);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      unsub();
    }
  }, [selectedPack]);

  // ОПТИМИЗАЦИЯ: useCallback для предотвращения лишних ререндеров дочерних компонентов
  const handlePurchase = useCallback(
    async (boost: Boost) => {
      // КРИТИЧНО: Защита от двойных кликов
      if (boostPurchaseLoading === boost.type) {
        console.warn(
          "[BoostShop] Purchase already in progress for:",
          boost.type,
        );
        return;
      }

      if (!profileId) {
        toast({
          title: t("boostShop.toasts.errorTitle"),
          description: t("boostShop.toasts.needLogin"),
          variant: "destructive",
        });
        return;
      }

      if (coins < boost.cost_coins) {
        toast({
          title: t("boostShop.toasts.errorTitle"),
          description: t("boostShop.toasts.insufficientCoins", {
            amount: boost.cost_coins - coins,
          }),
          variant: "destructive",
        });
        haptics.wrongAnswer();
        sounds.wrongAnswer();
        return;
      }

      // Haptic feedback при клике на покупку (Telegram)
      if (isTelegramMiniApp()) {
        triggerHapticFeedback("medium");
      }

      // Устанавливаем флаг загрузки сразу
      setBoostPurchaseLoading(boost.type);

      try {
        // Проверяем, что profileId действительно существует в базе
        if (!profileId) {
          throw new Error(
            "profileId не установлен. Пожалуйста, обновите страницу и войдите снова.",
          );
        }

        console.log("[BoostShop] Начало покупки:", {
          profileId,
          boostType: boost.type,
          cost: boost.cost_coins,
          currentCoins: coins,
          online: navigator.onLine,
        });

        // OFFLINE-FIRST: Если offline - добавляем в очередь
        if (!navigator.onLine) {
          console.log(
            "[BoostShop] Offline mode detected, queuing boost purchase",
          );

          await enqueueOfflineAction("coin-spend", {
            itemId: boost.type,
            cost: boost.cost_coins,
            type: "boost",
            boost_name: boost.name_ru,
          });

          // Оптимистичное обновление UI
          setCoins((prev) => prev - boost.cost_coins);

          // Оптимистично обновляем инвентарь (локально)
          setInventory((prev) => {
            const existing = prev.find((i) => i.boost_type === boost.type);
            if (existing) {
              return prev.map((i) =>
                i.boost_type === boost.type
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              );
            } else {
              return [...prev, { boost_type: boost.type, quantity: 1 }];
            }
          });

          trackOfflineAction("boost-purchase", true);

          toast({
            title: t("boostShop.toasts.successTitle") || "Буст куплен!",
            description:
              "Покупка сохранена локально. Применится при восстановлении сети.",
          });

          // Анимации (локально)
          sounds.correctAnswer();
          haptics.boostActivated();

          return;
        }

        // ONLINE: Обычная покупка
        // Проверяем существование профиля перед покупкой
        const { data: profileCheck, error: profileCheckError } =
          await supabaseClient
            .from("profiles")
            .select("id, coins")
            .eq("id", profileId)
            .single();

        if (profileCheckError || !profileCheck) {
          console.error("[BoostShop] Профиль не найден:", profileCheckError);
          throw new Error(
            `Профиль не найден: ${profileCheckError?.message || "Неизвестная ошибка"}. Пожалуйста, обновите страницу и войдите снова.`,
          );
        }

        console.log(
          "[BoostShop] Профиль найден, текущий баланс:",
          profileCheck.coins,
        );

        // Используем функцию increment_profile_value для списания монет
        // Она использует SECURITY DEFINER и обходит RLS проблемы
        const { data: coinsData, error: coinsError } = await supabaseClient.rpc(
          "increment_profile_value",
          {
            p_profile_id: profileId,
            p_column: "coins",
            p_amount: -boost.cost_coins,
          },
        );

        if (coinsError) {
          console.error("[BoostShop] Ошибка списания монет:", coinsError);
          console.error("[BoostShop] Детали ошибки списания:", {
            code: coinsError.code,
            message: coinsError.message,
            details: coinsError.details,
            hint: coinsError.hint,
          });
          throw new Error(
            `Не удалось списать монеты: ${coinsError.message || coinsError.code || "Неизвестная ошибка"}`,
          );
        }

        console.log(
          "[BoostShop] Монеты списаны успешно, результат:",
          coinsData,
        );

        // Добавляем буст в инвентарь используя функцию modify_boost_inventory
        // Это более надежный способ, который обходит RLS проблемы
        const { data: inventoryData, error: inventoryError } =
          await supabaseClient.rpc("modify_boost_inventory", {
            p_user_id: profileId,
            p_boost_type: boost.type,
            p_change: 1,
          });

        if (inventoryError) {
          console.error(
            "[BoostShop] Ошибка добавления буста в инвентарь:",
            inventoryError,
          );
          console.error("[BoostShop] Детали ошибки инвентаря:", {
            code: inventoryError.code,
            message: inventoryError.message,
            details: inventoryError.details,
            hint: inventoryError.hint,
          });

          // Откатываем списание монет при ошибке
          const { error: rollbackError } = await supabaseClient.rpc(
            "increment_profile_value",
            {
              p_profile_id: profileId,
              p_column: "coins",
              p_amount: boost.cost_coins,
            },
          );

          if (rollbackError) {
            console.error("[BoostShop] Ошибка отката монет:", rollbackError);
          }

          throw new Error(
            `Не удалось добавить буст в инвентарь: ${inventoryError.message || inventoryError.code || "Неизвестная ошибка"}`,
          );
        }

        console.log(
          "[BoostShop] Буст добавлен в инвентарь успешно, результат:",
          inventoryData,
        );

        // Создаем транзакцию о покупке буста через RPC (обходит RLS для Telegram)
        try {
          const { error: transactionError } = await supabaseClient.rpc(
            "create_transaction",
            {
              p_user_id: profileId,
              p_transaction_type: "coins_spent_boost",
              p_amount: -boost.cost_coins,
              p_metadata: { boost_type: boost.type, boost_name: boost.name_ru },
            },
          );

          if (transactionError) {
            console.warn(
              "[BoostShop] Ошибка создания транзакции (не критично):",
              transactionError,
            );
          } else {
            console.log(
              "[BoostShop] Транзакция о покупке буста создана успешно",
            );
          }
        } catch (txError) {
          console.warn(
            "[BoostShop] Исключение при создании транзакции (не критично):",
            txError,
          );
        }

        trackOfflineAction("boost-purchase", true);

        // Анимации и звуки
        sounds.correctAnswer();
        haptics.boostActivated();

        // Обновляем данные без скрытия контента
        setIsRefreshing(true);
        try {
          // Обновляем баланс монет
          const { data: updatedProfile } = await supabaseClient
            .from("profiles")
            .select("coins")
            .eq("id", profileId)
            .single();

          if (updatedProfile) {
            setCoins(updatedProfile.coins || 0);
          }

          // Обновляем инвентарь через RPC (обходит RLS для Telegram)
          const { data: updatedInventory, error: invError } =
            await supabaseClient.rpc("get_user_boost_inventory", {
              p_user_id: profileId,
            });

          if (invError) {
            console.warn(
              "[BoostShop] Ошибка обновления инвентаря через RPC, пробуем прямой запрос:",
              invError,
            );
            const { data: fallbackInventory } = await supabaseClient
              .from("boost_inventory")
              .select("boost_type, quantity")
              .eq("user_id", profileId);
            if (fallbackInventory) {
              setInventory(fallbackInventory);
            }
          } else if (updatedInventory) {
            setInventory(updatedInventory);
          }
        } catch (error) {
          console.error("[BoostShop] Ошибка обновления данных:", error);
          // При ошибке обновления все равно перезагружаем полностью
          await loadData();
        } finally {
          setIsRefreshing(false);
        }

        const localizedName = translateBoostField(
          boost.type,
          "name",
          boost.name_ru,
        );
        await dispatchUserEvent(profileId, "boost_purchase", {
          boost_type: boost.type,
          boost_name: localizedName,
          cost_coins: boost.cost_coins,
        });
        toast({
          title: t("boostShop.toasts.purchaseSuccessTitle"),
          description: t("boostShop.toasts.purchaseSuccessDescription", {
            name: localizedName,
          }),
        });
      } catch (error: any) {
        console.error("[BoostShop] Ошибка покупки:", error);

        const errorMessage =
          error?.message || error?.error?.message || "Неизвестная ошибка";
        console.error("[BoostShop] Детали ошибки:", {
          message: errorMessage,
          fullError: error,
        });

        trackOfflineAction("boost-purchase", false, errorMessage);

        toast({
          title: t("boostShop.toasts.purchaseErrorTitle"),
          description: errorMessage.includes("RLS")
            ? t("boostShop.toasts.rlsError")
            : errorMessage || t("boostShop.toasts.purchaseErrorDescription"),
          variant: "destructive",
        });
        haptics.wrongAnswer();
      } finally {
        // КРИТИЧНО: Всегда сбрасываем флаг загрузки, даже при ошибке
        setBoostPurchaseLoading(null);
      }
    },
    [
      profileId,
      coins,
      boostPurchaseLoading,
      enqueueOfflineAction,
      t,
      translateBoostField,
      dispatchUserEvent,
    ],
  );

  const regularBoosts = boosts.filter((b) => !b.is_premium);
  const premiumBoosts = boosts.filter((b) => b.is_premium);

  // Функция определения категории буста по типу
  const getBoostCategory = (
    type: string,
  ): "utility" | "exploit" | "defense" => {
    // Атака (exploit)
    if (
      ["screen_injector", "input_lag", "spam_attack", "cryptolocker", "ice_screen", "sun_glare", "rain_storm", "bug_splat", "fog_screen"].includes(
        type,
      )
    ) {
      return "exploit";
    }
    // Защита (defense)
    if (["firewall", "adas", "shield"].includes(type)) {
      return "defense";
    }
    // Утилиты (utility) - по умолчанию
    return "utility";
  };

  // Состояние фильтра категорий
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "exploit" | "defense" | "utility" | "premium"
  >("all");

  // Состояние для просмотра деталей товара (Inspect Sheet)
  const [selectedBoostForInspect, setSelectedBoostForInspect] =
    useState<Boost | null>(null);

  // Фильтрация бустов по категории
  const filteredRegularBoosts = useMemo(() => {
    if (categoryFilter === "all") return regularBoosts;
    if (categoryFilter === "premium") return [];
    return regularBoosts.filter(
      (b) => getBoostCategory(b.type) === categoryFilter,
    );
  }, [regularBoosts, categoryFilter]);

  const filteredPremiumBoosts = useMemo(() => {
    if (categoryFilter === "all" || categoryFilter === "premium")
      return premiumBoosts;
    return [];
  }, [premiumBoosts, categoryFilter]);

  // Контент модалки
  const ModalContent = () => {
    return (
      <div
        ref={modalContentRef}
        className="flex-1 flex flex-col overflow-hidden h-full"
      >
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {isRefreshing && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* Premium Pill-style Tabs */}
            <div className="px-3 md:px-4 pt-3 pb-3 shrink-0">
              <TabsList className="grid w-full grid-cols-4 h-11 p-1 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/50">
                <TabsTrigger
                  value="boosts"
                  className={cn(
                    "text-xs font-medium rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                    "data-[state=active]:text-foreground",
                    "hover:text-foreground/80",
                  )}
                >
                  <Zap className="w-3.5 h-3.5 sm:mr-1.5 flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {t("boostShop.tabs.boosts")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="coins"
                  className={cn(
                    "text-xs font-medium rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500/20 data-[state=active]:to-amber-500/20",
                    "data-[state=active]:text-yellow-600 dark:data-[state=active]:text-yellow-400",
                    "data-[state=active]:shadow-sm",
                    "hover:text-foreground/80",
                  )}
                >
                  <Coins className="w-3.5 h-3.5 sm:mr-1.5 flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {t("boostShop.tabs.coins")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="premium"
                  className={cn(
                    "text-xs font-medium rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/20 data-[state=active]:to-purple-500/20",
                    "data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400",
                    "data-[state=active]:shadow-sm",
                    "hover:text-foreground/80",
                  )}
                >
                  <Crown className="w-3.5 h-3.5 sm:mr-1.5 flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {t("boostShop.tabs.premium")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className={cn(
                    "text-xs font-medium rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                    "data-[state=active]:text-foreground",
                    "hover:text-foreground/80",
                  )}
                >
                  <History className="w-3.5 h-3.5 sm:mr-1.5 flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {t("boostShop.tabs.history")}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Boosts Tab */}
            <TabsContent
              value="boosts"
              className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 m-0 data-[state=inactive]:hidden outline-none scrollbar-hide min-h-0"
            >
              {/* Фильтры категорий */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { value: "all", label: "ALL SOFTWARE", icon: Zap },
                  {
                    value: "exploit",
                    label: "OFFENSE",
                    icon: Zap,
                    color: "red",
                  },
                  {
                    value: "defense",
                    label: "DEFENSE",
                    icon: Shield,
                    color: "cyan",
                  },
                  {
                    value: "utility",
                    label: "UTILS",
                    icon: Wand2,
                    color: "emerald",
                  },
                  {
                    value: "premium",
                    label: "PREMIUM",
                    icon: Crown,
                    color: "amber",
                  },
                ].map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCategoryFilter(value as typeof categoryFilter);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                      categoryFilter === value
                        ? color === "red"
                          ? "bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                          : color === "cyan"
                            ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                            : color === "emerald"
                              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                              : color === "amber"
                                ? "bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                                : "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                        : "bg-muted/50 dark:bg-white/5 border-border dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-white/10",
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Grid Layout для бустов */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:gap-4 gap-2.5 md:gap-3">
                {boosts
                  .filter((b: any) =>
                    categoryFilter === "all"
                      ? true
                      : getBoostCategory(b.type) === categoryFilter,
                  )
                  .map((boost: any) => (
                    <BoostCard
                      key={boost.id}
                      boost={boost}
                      onPurchase={() => handlePurchase(boost)}
                      coins={coins}
                      inventoryCount={getInventoryCount(boost.type)}
                    />
                  ))}
              </div>
            </TabsContent>

            {/* Coins Tab */}
            <TabsContent
              value="coins"
              className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 m-0 data-[state=inactive]:hidden outline-none scrollbar-hide min-h-0"
            >
              <div className="space-y-6">
                {!isPremium && (
                  <div className="px-1">
                    <CryptoMinerAdvanced onRewardClaimed={loadData} />
                  </div>
                )}
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4">
                  {COIN_PACKS.map((pack) => {
                    const isBestValue = pack.coins === 500;
                    const isHighlighted = pack.highlight;
                    
                    // Расчет цены за монету
                    const pricePerCoin = (pack.priceValue / pack.totalCoins).toFixed(3);

                    return (
                      <UnifiedPricingCard
                        key={pack.id}
                        title={t("boostShop.coins.packLabel", { amount: pack.coins })}
                        price={pack.price}
                        subtitle={t(pack.descriptionKey || "boostShop.coins.purpose")}
                        badge={isBestValue ? '🔥 ХИТ' : isHighlighted ? '⭐ VIP' : undefined}
                        isPopular={isBestValue}
                        isVip={isHighlighted}
                        accentColor={isBestValue ? 'violet' : isHighlighted ? 'amber' : 'blue'}
                        onBuy={() => handleBuyClick({
                          ...pack,
                          catalogKey: pack.id,
                          packageKey: pack.id,
                          title: `${pack.coins} монет`,
                          priceValue: pack.priceValue,
                          priceCoins: pack.coins
                        })}
                        icon="coins"
                        bonusCoins={pack.bonus > 0 ? pack.bonus : undefined}
                        giftLabel={pack.bonus > 0 ? '🎁 GIFT' : undefined}
                        pricePerUnit={`€${pricePerCoin} / coin`}
                      />
                    );
                  })}
                </div>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  <p>{t("boostShop.coins.premiumHint")}</p>
                </div>
              </div>
            </TabsContent>

            {/* Premium Tab */}
            <TabsContent
              value="premium"
              className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6 m-0 data-[state=inactive]:hidden outline-none scrollbar-hide min-h-0"
            >
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {PRICING_PLANS.map((plan) => {
                    const isPopular = plan.popular;
                    const isBestValue = plan.savings === "50%";
                    const catalogKey = PLAN_TO_CATALOG[plan.id];
                    
                    // Расчет цены в день
                    let perDayPrice = "";
                    if (plan.id === 'monthly') perDayPrice = "€0.33";
                    else if (plan.id === 'quarterly') perDayPrice = "€0.27";
                    else if (plan.id === 'biannual') perDayPrice = "€0.22";
                    else if (plan.id === 'yearly') perDayPrice = "€0.16";

                    return (
                      <UnifiedPricingCard
                        key={plan.id}
                        title={plan.title}
                        price={plan.price}
                        pricePerDay={perDayPrice ? t('boostShop.premium.pricePerDay', { price: perDayPrice }) : undefined}
                        pricePerMonth={plan.pricePerMonth ? `${plan.pricePerMonth} / ${t('common.month') || 'мес'}` : undefined}
                        benefits={plan.features.slice(0, 3)} // Берем только самое важное
                        badge={isPopular ? '🔥 ПОПУЛЯРНО' : isBestValue ? '⭐ ВЫГОДНО' : undefined}
                        isPopular={isPopular}
                        isVip={isBestValue}
                        accentColor={isPopular ? 'violet' : isBestValue ? 'emerald' : 'blue'}
                        onBuy={() => handleBuyClick({
                          ...plan,
                          catalogKey,
                          packageKey: catalogKey,
                          title: `Premium ${plan.title}`,
                          priceValue: plan.priceValue
                        })}
                        icon="premium"
                        savings={plan.savings}
                      />
                    );
                  })}
                </div>

                {/* REDESIGNED DUEL PASS CARD */}
                <div className="relative group p-[1px] rounded-[32px] overflow-hidden">
                  {/* Внешнее свечение */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="relative overflow-hidden rounded-[31px] bg-[#022c22] border border-emerald-500/20"
                  >
                    {/* Фон с паттерном */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[length:24px_24px]" />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
                    
                    <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center gap-8">
                      {/* Левая часть: Иконка и Бейдж */}
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 transition-transform duration-500 group-hover:scale-110">
                          <Trophy className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-emerald-500 text-[#022c22] text-[10px] font-black uppercase tracking-tighter shadow-lg">
                          NEW
                        </div>
                      </div>

                      {/* Центральная часть: Контент */}
                      <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-center md:justify-start gap-2">
                            <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">Duel Pass</h3>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                              SEASON 1
                            </span>
                          </div>
                          <p className="text-sm text-emerald-100/60 font-medium max-w-md">
                            Уникальный путь прогресса: открывай сундуки, получай редкие скины и доминируй в дуэлях.
                          </p>
                        </div>

                        {/* Мини-преимущества */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                          {[
                            { icon: Sparkles, text: t('boostShop.duelPass.features.rareSkins') },
                            { icon: Box, text: t('boostShop.duelPass.features.lootChests') },
                            { icon: Zap, text: t('boostShop.duelPass.features.expBoosts') }
                          ].map((feat, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-200/40 uppercase tracking-widest">
                              <feat.icon className="w-3.5 h-3.5 text-emerald-400/60" />
                              {feat.text}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Правая часть: Цена и Кнопка */}
                      <div className="shrink-0 flex flex-col items-center md:items-end gap-3 min-w-[140px]">
                        <div className="text-center md:text-right">
                          <div className="text-2xl font-black text-white">{DUEL_PASS_PRICE.price}</div>
                          <div className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">{t('boostShop.duelPass.oneTime')}</div>
                        </div>
                        <Button
                          className="bg-emerald-500 hover:bg-emerald-400 text-[#022c22] font-black uppercase tracking-widest text-xs px-8 h-12 rounded-[18px] border-0 shadow-[0_8px_30px_-5px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-1"
                          onClick={() => {
                            handleBuyClick({
                              id: 'duel_pass',
                              title: 'Duel Pass Season 1',
                              priceValue: DUEL_PASS_PRICE.priceValue,
                              catalogKey: 'duel_pass'
                            });
                          }}
                        >
                          {t('boostShop.buttons.buy')}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent
              value="history"
              className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden outline-none overflow-hidden min-h-0"
            >
              <div className="px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-border/50 shrink-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {t("boostShop.history.title")}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {t("boostShop.history.operationsCount", { count: transactions.length })}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {['all', 'earn', 'spend', 'purchase', 'reward'].map((cat) => (
                    <Button
                      key={cat}
                      variant={filterCategory === cat ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setFilterCategory(cat as any)}
                    >
                      {cat === 'earn' && <TrendingUp className="h-3 w-3 mr-1" />}
                      {cat === 'spend' && <TrendingDown className="h-3 w-3 mr-1" />}
                      {cat === 'purchase' && <CreditCard className="h-3 w-3 mr-1" />}
                      {cat === 'reward' && <Gift className="h-3 w-3 mr-1" />}
                      {t(`boostShop.history.filters.${cat}`)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4">
                {loadingHistory ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 pb-4">
                    {transactions
                      .filter((tx) => filterCategory === "all" ? true : tx.category === filterCategory)
                      .map((tx, idx) => (
                        <div
                          key={tx.id || idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              tx.amount > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {tx.amount > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{tx.description}</p>
                              <p className="text-[10px] text-muted-foreground">{formatTransactionDate(tx.created_at)}</p>
                            </div>
                          </div>
                          <span className={cn("font-bold text-sm", tx.amount > 0 ? "text-green-500" : "text-red-500")}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  };

  // 🏆 BLACK MARKET Header Design

  const headerContent = (
    <div className="relative">
      <div
        className="relative px-4 md:px-5 py-4 border-b border-border/30"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: Title & subtitle */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Icon container - синий как лого */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl blur-md opacity-50" />
              <div className="relative w-11 h-11 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="min-w-0 group/title relative">
              <motion.h2
                whileHover={{ x: [-1, 1, -1, 1, 0] }}
                transition={{ duration: 0.2, repeat: Infinity }}
                className="text-base md:text-lg font-black text-foreground truncate tracking-wide font-mono uppercase relative z-10"
              >
                BLACK MARKET
                {/* Glitch layers on hover */}
                <span className="absolute top-0 left-0 -z-10 text-red-500 opacity-0 group-hover/title:opacity-50 group-hover/title:animate-pulse translate-x-[-2px] select-none">
                  BLACK MARKET
                </span>
                <span className="absolute top-0 left-0 -z-10 text-cyan-500 opacity-0 group-hover/title:opacity-50 group-hover/title:animate-pulse translate-x-[2px] select-none">
                  BLACK MARKET
                </span>
              </motion.h2>
              <p className="text-[10px] text-muted-foreground truncate font-mono tracking-widest uppercase opacity-70 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                SECURE ACCESS GRANTED
              </p>
            </div>
          </div>

          {/* Right: Balance + Close button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {showTonPayment && (
              <div className="mr-0.5 sm:mr-1">
                <TonWalletHeader />
              </div>
            )}
            <button
              onClick={async () => {
                setActiveTab("history");
                if (transactions.length === 0) {
                  await loadTransactionHistory();
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl",
                "bg-muted/50 dark:bg-muted/30",
                "hover:bg-muted/70",
                "transition-all duration-200",
                "shadow-sm hover:shadow-md",
              )}
            >
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-sm">
                <Coins className="w-3.5 h-3.5 text-white" />
              </div>
              <NumberTicker
                value={coins}
                className="text-sm font-bold font-mono text-amber-600 dark:text-yellow-400"
                shouldFlash={true}
              />
            </button>



            <button
              onClick={() => onOpenChange(false)}
              className={cn(
                "p-2 rounded-lg relative z-[100]",
                "bg-muted/50 hover:bg-muted",
                "text-muted-foreground hover:text-foreground",
                "transition-all duration-200",
                "opacity-80 hover:opacity-100",
              )}
              aria-label="Закрыть"
            >
              <X className="w-5 h-5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Если UserContext отсутствует — не рендерим модалку
  if (!userContext) {
    return null;
  }

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        headerContent={headerContent}
        className="max-w-5xl h-[92vh] max-h-[97vh] min-h-[600px] md:h-[85vh] md:max-h-[85vh] md:min-h-[700px] flex flex-col"
        contentClassName="scrollbar-none px-2"
        hideCloseButton={true}
      >
        {loading ? <ModalSkeleton rows={4} /> : <ModalContent />}
      </ResponsiveModal>

      {/* Payment Selector Modal */}
      <PaymentSelectorModal
        open={isPaymentSelectorOpen}
        onOpenChange={setIsPaymentSelectorOpen}
        pack={selectedPack}
        onSuccess={() => {
          loadData();
          setIsPaymentSelectorOpen(false);
        }}
        onTonClick={handleTonPurchase}
        onCryptoClick={handleCryptomusPurchase}
        onCardClick={handleCardPurchase}
        availability={{
          stars: showStarsPayment,
          ton: isPaymentMethodAvailable('ton', currentPlatform),
          crypto: isPaymentMethodAvailable('cryptomus', currentPlatform),
          card: isPaymentMethodAvailable('paddle', currentPlatform)
        }}
      />

      {/* Nested Modals - рендерим только когда нужно */}
      {paywallOpen && (
        <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
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
                const { data, error } = await supabaseClient.functions.invoke(
                  "ad-reward",
                  {
                    body: {
                      user_id: profileId,
                      reward_type: "coins",
                      amount: 20,
                    },
                  },
                );

                if (error) {
                  console.error(
                    `[BoostShop] Error claiming ad reward (attempt ${attempt + 1}/${maxRetries}):`,
                    error,
                  );
                  lastError = error;

                  // Если это последняя попытка, выбрасываем ошибку
                  if (attempt === maxRetries - 1) {
                    throw error;
                  }

                  // Ждем перед следующей попыткой (экспоненциальная задержка)
                  const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
                  await new Promise((resolve) => setTimeout(resolve, delay));
                  continue;
                }

                // Успех - выходим из цикла
                console.log("[BoostShop] Ad reward claimed successfully");
                break;
              } catch (err: any) {
                console.error(
                  `[BoostShop] Exception during ad reward claim (attempt ${attempt + 1}/${maxRetries}):`,
                  err,
                );
                lastError = err;

                // Если это последняя попытка, выбрасываем ошибку
                if (attempt === maxRetries - 1) {
                  throw err;
                }

                // Ждем перед следующей попыткой
                const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }

            // Баланс уже обновлен через invalidateQueries выше, но обновляем и локальные данные модалки
            try {
              await loadData();
            } catch (loadError) {
              console.error(
                "[BoostShop] Error loading data after reward:",
                loadError,
              );
              // Не критично, просто логируем
            }

            toast({
              title: "✨ Монеты получены!",
              description: "Тебе начислено 20 монет за просмотр рекламы",
            });
          } catch (error: any) {
            console.error("[BoostShop] Error claiming ad reward:", error);
            toast({
              title: "Ошибка",
              description: error.message || "Не удалось начислить монеты",
              variant: "destructive",
            });
          }
        }}
      />

      {/* Boost Inspect Sheet (Product Details) */}
      {selectedBoostForInspect &&
        (() => {
          console.log(
            "[BoostShopModal] Rendering inspect sheet for:",
            selectedBoostForInspect.type,
          );
          const inspectBoost = selectedBoostForInspect;
          const inspectCategory = getBoostCategory(inspectBoost.type);
          const inspectInventoryCount = getInventoryCount(inspectBoost.type);
          const inspectCanAfford = coins >= inspectBoost.cost_coins;
          const inspectIsConsumable = !inspectBoost.is_premium;
          const inspectIsButtonDisabled =
            !inspectIsConsumable && inspectInventoryCount > 0;

          const inspectTheme =
            inspectCategory === "exploit"
              ? {
                border: "border-red-500/30",
                icon: "text-red-500",
                bg: "bg-red-500/20",
                text: "text-red-400",
                buttonBg: "bg-red-500/20 hover:bg-red-500/30",
                buttonBorder: "border-red-500/50",
                buttonShadow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
              }
              : inspectCategory === "defense"
                ? {
                  border: "border-cyan-500/30",
                  icon: "text-cyan-400",
                  bg: "bg-cyan-500/20",
                  text: "text-cyan-400",
                  buttonBg: "bg-cyan-500/20 hover:bg-cyan-500/30",
                  buttonBorder: "border-cyan-500/50",
                  buttonShadow: "shadow-[0_0_20px_rgba(6,182,212,0.3)]",
                }
                : {
                  border: "border-emerald-500/30",
                  icon: "text-emerald-400",
                  bg: "bg-emerald-500/20",
                  text: "text-emerald-400",
                  buttonBg: "bg-emerald-500/20 hover:bg-emerald-500/30",
                  buttonBorder: "border-emerald-500/50",
                  buttonShadow: "shadow-[0_0_20px_rgba(34,197,94,0.3)]",
                };

          return (
            <ResponsiveModal
              open={!!selectedBoostForInspect}
              onOpenChange={(open) => {
                console.log(
                  "[BoostShopModal] ResponsiveModal onOpenChange:",
                  open,
                  "selectedBoost:",
                  selectedBoostForInspect?.type,
                );
                if (!open) {
                  setSelectedBoostForInspect(null);
                }
              }}
              className={cn(
                "bg-[#0a0a0f] border border-white/10 max-h-[80vh]",
                inspectTheme.border,
              )}
              contentClassName="p-0"
            >
              {/* Cyber background effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Binary Background Effect */}
                <div className="absolute inset-0 opacity-[0.05] font-mono text-[10px] text-white leading-none select-none overflow-hidden">
                  <div className="animate-slide-down flex flex-col gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="whitespace-nowrap opacity-50">
                        {Array.from({ length: 10 })
                          .map(() => Math.round(Math.random()))
                          .join(" ")}{" "}
                        {Array.from({ length: 10 })
                          .map(() => Math.round(Math.random()))
                          .join(" ")}{" "}
                        {Array.from({ length: 10 })
                          .map(() => Math.round(Math.random()))
                          .join(" ")}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                  }}
                />
                {/* Glow effect based on category */}
                <div
                  className={cn(
                    "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30",
                    inspectCategory === "exploit" && "bg-red-500",
                    inspectCategory === "defense" && "bg-cyan-500",
                    inspectCategory === "utility" && "bg-emerald-500",
                  )}
                />
                <div
                  className={cn(
                    "absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl opacity-20",
                    inspectCategory === "exploit" && "bg-red-500",
                    inspectCategory === "defense" && "bg-cyan-500",
                    inspectCategory === "utility" && "bg-emerald-500",
                  )}
                />
              </div>

              {/* Scanline effect при появлении */}
              <motion.div
                initial={{ top: 0 }}
                animate={{ top: "100%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={cn(
                  "absolute left-0 right-0 h-1 pointer-events-none z-20",
                  inspectCategory === "exploit" &&
                  "bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_20px_rgba(239,68,68,0.8)]",
                  inspectCategory === "defense" &&
                  "bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.8)]",
                  inspectCategory === "utility" &&
                  "bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_20px_rgba(34,197,94,0.8)]",
                )}
              />

              {/* Border flash animation */}
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn(
                  "absolute inset-0 rounded-xl pointer-events-none z-10",
                  inspectCategory === "exploit" &&
                  "shadow-[inset_0_0_30px_rgba(239,68,68,0.5),0_0_30px_rgba(239,68,68,0.5)]",
                  inspectCategory === "defense" &&
                  "shadow-[inset_0_0_30px_rgba(6,182,212,0.5),0_0_30px_rgba(6,182,212,0.5)]",
                  inspectCategory === "utility" &&
                  "shadow-[inset_0_0_30px_rgba(34,197,94,0.5),0_0_30px_rgba(34,197,94,0.5)]",
                )}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  x: [0, -2, 2, -1, 1, 0], // Glitch shake
                }}
                transition={{
                  duration: 0.3,
                  x: { duration: 0.2, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
                }}
                className="relative z-10 p-5"
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center",
                      "bg-black/50 border",
                      inspectTheme.border,
                      inspectTheme.buttonShadow,
                    )}
                  >
                    <span
                      className={cn("text-3xl", inspectTheme.icon)}
                      style={{
                        filter: `drop-shadow(0 0 12px ${inspectCategory === "exploit"
                          ? "rgba(239, 68, 68, 0.8)"
                          : inspectCategory === "defense"
                            ? "rgba(6, 182, 212, 0.8)"
                            : "rgba(34, 197, 94, 0.8)"
                          })`,
                      }}
                    >
                      {inspectBoost.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div
                      className={cn(
                        "text-[10px] font-mono mb-1 uppercase tracking-widest",
                        inspectTheme.text,
                        "opacity-60",
                      )}
                    >
                      {inspectCategory === "exploit"
                        ? "ATK"
                        : inspectCategory === "defense"
                          ? "DEF"
                          : "UTL"}
                      _MODULE v.{inspectInventoryCount || 1}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      {translateBoostField(
                        inspectBoost.type,
                        "name",
                        inspectBoost.name_ru,
                      )}
                    </h2>
                    {inspectInventoryCount > 0 && inspectIsConsumable && (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono",
                          "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                        )}
                      >
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        STOCK: {inspectInventoryCount}
                      </div>
                    )}
                  </div>
                </div>

                {/* System Effect Block - Hacker style */}
                <div
                  className={cn(
                    "p-4 rounded-xl border mb-5",
                    "bg-white/[0.02]",
                    inspectTheme.border,
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        inspectCategory === "exploit" &&
                        "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]",
                        inspectCategory === "defense" &&
                        "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
                        inspectCategory === "utility" &&
                        "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]",
                      )}
                    />
                    <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      System Effect
                    </h3>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {translateBoostField(
                      inspectBoost.type,
                      "description",
                      inspectBoost.description_ru,
                    )}
                  </p>
                </div>

                {/* Specs Grid - Terminal style */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <div className="text-[9px] text-white/30 font-mono mb-1 uppercase tracking-wider">
                      DURATION
                    </div>
                    <div className="text-sm text-white font-bold font-mono">
                      1 Round
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <div className="text-[9px] text-white/30 font-mono mb-1 uppercase tracking-wider">
                      TARGET
                    </div>
                    <div className="text-sm text-white font-bold font-mono">
                      {inspectCategory === "exploit"
                        ? "Enemy"
                        : inspectCategory === "defense"
                          ? "Self"
                          : "Both"}
                    </div>
                  </div>
                </div>

                {/* Action Button - Neon style */}
                <motion.button
                  onClick={() => {
                    handlePurchase(inspectBoost);
                    setSelectedBoostForInspect(null);
                  }}
                  disabled={
                    !inspectCanAfford ||
                    inspectBoost.is_premium ||
                    inspectIsButtonDisabled
                  }
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-base transition-all",
                    "flex items-center justify-center gap-2",
                    "border",
                    inspectBoost.is_premium ||
                      inspectIsButtonDisabled ||
                      !inspectCanAfford
                      ? "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                      : cn(
                        inspectTheme.buttonBg,
                        inspectTheme.text,
                        inspectTheme.buttonBorder,
                        inspectTheme.buttonShadow,
                        "active:scale-[0.98] hover:brightness-110",
                      ),
                  )}
                >
                  {inspectBoost.is_premium ? (
                    <>
                      <Lock className="w-5 h-5" />
                      <span className="font-mono tracking-wider">LOCKED</span>
                    </>
                  ) : !inspectCanAfford ? (
                    <span className="font-mono tracking-wider">
                      INSUFFICIENT FUNDS
                    </span>
                  ) : inspectIsButtonDisabled ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span className="font-mono tracking-wider">OWNED</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 text-cyan-400" />
                      <span className="font-mono tracking-wider">
                        {inspectCategory === "exploit"
                          ? "DEPLOY EXPLOIT"
                          : inspectCategory === "defense"
                            ? "PATCH SYSTEM"
                            : "INJECT MODULE"}
                      </span>
                      <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-500 font-mono text-sm">
                          {inspectBoost.cost_coins}
                        </span>
                      </div>
                    </>
                  )}
                </motion.button>
              </motion.div>
            </ResponsiveModal>
          );
        })()}
      {/* Fullscreen Paddle checkout portal */}
      {paddleCheckoutUrl && createPortal(
        <PaddleFullscreenCheckout url={paddleCheckoutUrl} onClose={() => setPaddleCheckoutUrl(null)} />,
        document.body
      )}
    </>
  );
}

/** Fullscreen Paddle checkout with Telegram BackButton + swipe-back */
function PaddleFullscreenCheckout({ url, onClose }: { url: string; onClose: () => void }) {
  const startRef = useRef({ x: 0, y: 0, active: false });

  // Telegram BackButton
  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp?.BackButton) return;

    webApp.BackButton.show();
    webApp.BackButton.onClick(onClose);
    return () => { webApp.BackButton.offClick(onClose); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100000] bg-black flex flex-col" style={{ paddingTop: 'var(--app-content-top, env(safe-area-inset-top))', paddingBottom: 'var(--app-safe-bottom, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
        <button onClick={onClose} className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 relative">
        <iframe
          src={url}
          className="absolute inset-0 w-full h-full border-0"
          allow="payment"
          title="Paddle Checkout"
        />
        {/* Left edge swipe-back zone */}
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: 20, height: '100%', zIndex: 10, touchAction: 'pan-y', background: 'transparent' }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t.clientX <= 20) startRef.current = { x: t.clientX, y: t.clientY, active: true };
          }}
          onTouchMove={(e) => {
            if (!startRef.current.active) return;
            const t = e.touches[0];
            if (t.clientX - startRef.current.x > 60 && Math.abs(t.clientY - startRef.current.y) < 50) {
              startRef.current.active = false;
              onClose();
            }
          }}
          onTouchEnd={() => { startRef.current.active = false; }}
          onTouchCancel={() => { startRef.current.active = false; }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
