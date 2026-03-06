import { PRICING_PLANS } from "@/lib/pricing-config";
import {
  useState,
  useEffect,
  useRef,
  useContext,
  useMemo,
  useCallback,
} from "react";
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
import { CryptomusPaymentPreview } from "@/components/monetization/CryptomusPaymentPreview";
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
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";


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
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [boostPurchaseLoading, setBoostPurchaseLoading] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'earn' | 'spend' | 'purchase' | 'reward'>('all');
  const [activeTab, setActiveTab] = useState<'boosts' | 'coins' | 'premium' | 'history'>(initialTab || 'boosts');
  const [modalSnapPoint, setModalSnapPoint] = useState<number | string>(0.92);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [showRewardedAdModal, setShowRewardedAdModal] = useState(false);


  const modalContentRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  const historyLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Вычисляем параметры которые нужны для useEffect (не хуки — просто вычисления)
  const profileId = userContext?.profileId ?? null;
  const platform = userContext?.platform ?? 'web';
  const dateLocale = localeMap[language] || 'en-US';
  const { enqueue: enqueueOfflineAction } = useOfflineQueue(profileId || undefined);
  const currentPlatform = platform === 'telegram' ? 'telegram' : 'web';
  const showStarsPayment = isPaymentMethodAvailable('telegram_stars', currentPlatform);
  const showCryptomusPayment = isPaymentMethodAvailable('cryptomus', currentPlatform);
  const showPaddlePayment = isPaymentMethodAvailable('paddle', currentPlatform);

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
      .then((instance) => { setPaddle(instance); })
      .catch((error) => { console.error('[BoostShopModal] Failed to get Paddle instance:', error); })
      .finally(() => { setPaddleLoading(false); });
  }, [showPaddlePayment]);

  useEffect(() => {
    if (open) {
      setModalSnapPoint(0.92);
      if (initialTab) {
        setActiveTab(initialTab);
      }
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
            amount: metadata?.amount || 20,
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

        // Telegram Mini App — открываем через Telegram.openLink
        if (isTelegramMiniApp()) {
          const webApp = getTelegramWebApp();
          const url = data.checkout_url;
          if (url && webApp?.openLink) {
            webApp.openLink(url);
          } else if (url) {
            window.open(url, "_blank");
          }
          onOpenChange(false);
          return;
        }

        // Веб (мобилка + десктоп) — открываем Paddle Overlay НАПРяМУЮ
        // (overlay будет поверх нашего UI, не уходим со страницы)
        let paddleForCheckout = paddle || getPaddleInstanceSync();
        if (!paddleForCheckout) paddleForCheckout = await getPaddleInstance();

        if (paddleForCheckout) {
          const locale = language === "ru" ? "ru" : language === "es" ? "es" : "en";
          const successUrl = `${window.location.origin}/purchase/success?transaction_id={transaction_id}`;

          (paddleForCheckout.Checkout.open as (opts: any) => void)({
            transactionId: data.transaction_id,
            settings: {
              displayMode: "overlay",
              theme: "dark",
              locale,
              successUrl,
            },
            eventCallback: (event: any) => {
              if (event.name === "checkout.completed") {
                toast({ title: t("boostShop.coins.successTitle"), description: "Оплата прошла успешно! 🎉" });
                loadData();
                onOpenChange(false);
              }
              if (event.name === "checkout.closed") {
                onOpenChange(false);
              }
            },
          });
          // Даём Paddle 100ms чтобы инжектировать overlay в body,
          // только потом закрываем нашу модалку (иначе backdrop блокирует клики)
          setTimeout(() => onOpenChange(false), 100);
        } else {
          // Фоллбэк — открываем checkout_url если Paddle SDK недоступен
          const url = data.checkout_url;
          if (url) window.open(url, "_blank");
          onOpenChange(false);
        }
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
    [profileId, purchaseLoading, paddle, showPaddlePayment, language, t],
  );

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
      ["screen_injector", "input_lag", "spam_attack", "cryptolocker"].includes(
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
                      // ОПТИМИЗАЦИЯ: Предотвращаем множественные клики
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
                        : "bg-zinc-100 dark:bg-white/5 border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10",
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Grid Layout для бустов */}
              {filteredRegularBoosts.length > 0 ||
                filteredPremiumBoosts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-1">
                  {filteredRegularBoosts.map((boost) => (
                    <MarketItem
                      key={boost.id}
                      boost={boost}
                      inventoryCount={getInventoryCount(boost.type)}
                      coins={coins}
                      onPurchase={() => handlePurchase(boost)}
                      onInspect={() => {
                        console.log(
                          "[BoostShopModal] Setting selectedBoostForInspect:",
                          boost.type,
                        );
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
                        console.log(
                          "[BoostShopModal] Setting selectedBoostForInspect:",
                          boost.type,
                        );
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
                  <p className="text-sm">{t("boostShop.sections.empty")}</p>
                </div>
              )}
            </TabsContent>

            {/* Coins Tab */}
            <TabsContent
              value="coins"
              className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 m-0 data-[state=inactive]:hidden outline-none scrollbar-hide min-h-0"
            >
              <div className="space-y-4">
                {/* CRYPTO MINER V2 - Advanced Edition с анимациями и частицами */}
                {!isPremium && (
                  <div className="px-1">
                    <CryptoMinerAdvanced />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:gap-4 gap-2 md:gap-3 px-1">
                  {coinPacks.map((pack, idx) => {
                    // Выделяем пак 500 монет как "Best Value" (лучшее соотношение цена/количество)
                    const isBestValue = pack.amount === 500;
                    const isHighlighted = Boolean((pack as any).highlight);
                    const pricePerCoin =
                      pack.priceValue && pack.priceCoins
                        ? pack.priceValue / pack.priceCoins
                        : null;
                    const description = t(
                      pack.descriptionKey ?? "boostShop.coins.purpose",
                    );
                    const helperText = t(
                      pack.helperKey ?? "boostShop.coins.deliveryHint",
                    );
                    return (
                      <Card
                        key={idx}
                        className={`group relative overflow-visible rounded-3xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between ${isBestValue
                          ? "border-violet-500/50 shadow-[0_8px_20px_rgba(139,92,246,0.15)] dark:shadow-[0_8px_20px_rgba(139,92,246,0.25)] ring-1 ring-violet-500/30"
                          : isHighlighted
                            ? "border-yellow-400/50 shadow-[0_5px_15px_rgba(251,191,36,0.1)] dark:shadow-[0_8px_20px_rgba(251,191,36,0.15)]"
                            : "border-border hover:border-violet-500/30"
                          }`}
                      >
                        {/* Best Value бейдж */}
                        {isBestValue && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
                            <Badge className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white border-0 shadow-sm text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full">
                              🔥 ХИТ
                            </Badge>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex flex-col items-center text-center gap-2">
                            <div
                              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isBestValue
                                ? "bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                                : isHighlighted
                                  ? "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-slate-900 shadow-md shadow-amber-500/20"
                                  : "bg-gradient-to-br from-yellow-500/10 via-amber-500/20 to-orange-500/10 border border-yellow-500/20"
                                }`}
                            >
                              <Coins
                                className={`relative w-6 h-6 z-10 ${isBestValue || isHighlighted
                                  ? "drop-shadow-sm"
                                  : "text-yellow-500 drop-shadow-sm"
                                  }`}
                              />
                            </div>

                            <div className="w-full space-y-0.5 px-1">
                              <p className="text-sm sm:text-base font-black text-foreground tracking-tight truncate">
                                {t("boostShop.coins.packLabel", {
                                  amount: pack.amount,
                                })}
                              </p>
                              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight line-clamp-2 min-h-[2.2em]">
                                {description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-0 pt-1">
                            <span className="text-base sm:text-lg font-black text-foreground drop-shadow-sm leading-none tabular-nums mt-2">
                              {pack.price}
                            </span>
                            {pricePerCoin && (
                              <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground/80 lowercase">
                                ≈{" "}
                                {t("boostShop.coins.perCoin", {
                                  price: pricePerCoin.toFixed(2),
                                })}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-auto pt-4 space-y-3">
                          {/* Главная кнопка покупки */}
                          <div className="flex flex-col gap-1.5 mt-2">
                            {showStarsPayment && (
                              <StarsPaymentButton
                                packageKey={pack.packageKey}
                                priceCoins={pack.priceCoins}
                                onSuccess={() => {
                                  loadData();
                                  toast({
                                    title: t("boostShop.coins.successTitle"),
                                    description: t(
                                      "boostShop.coins.successDescription",
                                      { amount: pack.amount },
                                    ),
                                    duration: 5000,
                                  });
                                }}
                                variant="default"
                                size="sm"
                                className={cn(
                                  "w-full h-8 font-semibold text-xs transition-all duration-200",
                                  isBestValue || isHighlighted
                                    ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-black shadow-sm font-bold"
                                    : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                                )}
                              />
                            )}

                            {!showStarsPayment && showPaddlePayment && (
                              <Button
                                size="sm"
                                aria-label={t("boostShop.coins.buyPackAria", {
                                  amount: pack.amount,
                                })}
                                onClick={() =>
                                  handleCoinPurchase(pack.catalogKey)
                                }
                                className={cn(
                                  "w-full h-10 font-bold text-sm sm:h-11 sm:text-base border-0 transition-all duration-200 hover:scale-[1.01]",
                                  isBestValue || isHighlighted
                                    ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-black hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                    : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50",
                                  isBestValue && "ring-2 ring-amber-400/50",
                                )}
                                disabled={
                                  !profileId ||
                                  purchaseLoading === pack.catalogKey ||
                                  paddleLoading
                                }
                              >
                                {purchaseLoading === pack.catalogKey ? (
                                  <>
                                    <div className="w-4 h-4 mr-1.5 sm:w-5 sm:h-5 sm:mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    <span className="truncate">
                                      {t("boostShop.coins.loading").includes("boostShop")
                                        ? "Загрузка..."
                                        : t("boostShop.coins.loading")}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-4 h-4 mr-1.5 sm:w-5 sm:h-5 sm:mr-2 shrink-0" />
                                    <span className="truncate">Купить за {pack.price}</span>
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
                                      title: t("boostShop.toasts.errorTitle"),
                                      description: t(
                                        "boostShop.toasts.needLogin",
                                      ),
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  try {
                                    const { data, error } =
                                      await supabaseClient.functions.invoke(
                                        "cryptomus-payment",
                                        {
                                          body: {
                                            user_id: profileId,
                                            catalog_key: pack.catalogKey,
                                          },
                                        },
                                      );

                                    if (error) {
                                      console.error(
                                        "[BoostShop] Cryptomus error:",
                                        error,
                                      );
                                      toast({
                                        title: t("boostShop.toasts.errorTitle"),
                                        description:
                                          error.message ||
                                          t(
                                            "boostShop.toasts.purchaseErrorDescription",
                                          ),
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    if (data?.error) {
                                      toast({
                                        title: t("boostShop.toasts.errorTitle"),
                                        description:
                                          data.error ||
                                          t(
                                            "boostShop.toasts.purchaseErrorDescription",
                                          ),
                                        variant: "destructive",
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
                                        currency: "EUR",
                                        itemName: `${pack.amount} монет`,
                                      });
                                    } else {
                                      toast({
                                        title: t("boostShop.toasts.errorTitle"),
                                        description: t(
                                          "boostShop.toasts.sessionError",
                                        ),
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (err: any) {
                                    console.error(
                                      "[BoostShop] Cryptomus error:",
                                      err,
                                    );
                                    toast({
                                      title: t("boostShop.toasts.errorTitle"),
                                      description:
                                        err?.message ||
                                        t(
                                          "boostShop.toasts.purchaseErrorDescription",
                                        ),
                                      variant: "destructive",
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
                          {!showStarsPayment &&
                            !showCryptomusPayment &&
                            !showPaddlePayment && (
                              <div className="text-sm text-muted-foreground text-center py-2 w-full">
                                Используйте Telegram Mini App для оплаты через
                                Stars
                              </div>
                            )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  <p>{t("boostShop.coins.premiumHint")}</p>
                </div>
              </div>
            </TabsContent>

            {/* Premium & Duel Pass Tab */}
            <TabsContent
              value="premium"
              className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 m-0 data-[state=inactive]:hidden outline-none scrollbar-hide min-h-0"
            >
              <div className="space-y-6">
                {/* HERO BANNER: Ultra-Premium Lava Lamp Style */}
                <div className="relative overflow-hidden rounded-[24px] bg-[#0F121E] border border-white/5 shadow-2xl">
                  {/* Animated Background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                        x: [0, 20, 0],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600 rounded-full blur-[100px] mix-blend-screen"
                    />
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.5, 0.2],
                        x: [0, -30, 0],
                      }}
                      transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1,
                      }}
                      className="absolute top-1/2 -right-24 w-80 h-80 bg-indigo-500 rounded-full blur-[80px] mix-blend-screen"
                    />
                  </div>

                  <div className="relative z-10 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                      <div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="inline-flex items-center gap-2 mb-3 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20"
                        >
                          <Crown className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                          <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                            Premium Status
                          </span>
                        </motion.div>
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight">
                          Premium{" "}
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                            подписка
                          </span>
                        </h3>
                        <p className="text-slate-300 text-sm max-w-md leading-relaxed">
                          Максимальное ускорение обучения. AI-наставник,
                          отключение рекламы и доступ ко всем тестам.
                        </p>
                      </div>

                      {/* Features Grid inside Banner */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
                        {[
                          {
                            icon: Zap,
                            text: "X2 Монеты",
                            color: "text-amber-400",
                          },
                          {
                            icon: Crown,
                            text: "Duel Pass+",
                            color: "text-fuchsia-400",
                          },
                          {
                            icon: Sparkles,
                            text: "Без рекламы",
                            color: "text-sky-400",
                          },
                          {
                            icon: Trophy,
                            text: "Турниры",
                            color: "text-emerald-400",
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-lg backdrop-blur-sm"
                          >
                            <item.icon className={cn("w-4 h-4", item.color)} />
                            <span className="text-xs font-bold text-slate-200">
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PRICING GRID: The Shiny New Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PRICING_PLANS.map((plan) => {
                    const isPopular = plan.popular;
                    const isBestValue = plan.savings === "50%";
                    const catalogKey = PLAN_TO_CATALOG[plan.id];

                    return (
                      <motion.div
                        key={plan.id}
                        whileHover={{ y: -5, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative"
                      >
                        {/* Shadow Glow */}
                        <div
                          className={cn(
                            "absolute inset-0 rounded-[20px] blur-xl transition-opacity duration-500 -z-10",
                            isPopular
                              ? "bg-violet-600/30 opacity-60 group-hover:opacity-100"
                              : "bg-black/5 opacity-0 group-hover:opacity-100 dark:bg-black/40",
                          )}
                        />

                        <div
                          className={cn(
                            "relative h-full p-5 rounded-[20px] border flex flex-col transition-all duration-300 overflow-hidden",
                            isPopular
                              ? "bg-[#1E1B2E] border-violet-500/30 text-white"
                              : "bg-card border-border hover:border-violet-300 dark:hover:border-violet-700",
                          )}
                        >
                          {/* Shimmer for Popular */}
                          {isPopular && (
                            <div className="absolute inset-0 overflow-hidden rounded-[20px] pointer-events-none mix-blend-overlay">
                              <motion.div
                                animate={{ x: ["-100%", "200%"] }}
                                transition={{
                                  duration: 4,
                                  repeat: Infinity,
                                  ease: "linear",
                                  repeatDelay: 0.5,
                                }}
                                className="absolute top-0 bottom-0 w-[40%] -skew-x-[25deg] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-md"
                              />
                            </div>
                          )}

                          {/* Header */}
                          <div className="flex justify-between items-start mb-4">
                            {isPopular ? (
                              <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 text-[10px] font-bold px-2.5 py-0.5 animate-pulse shadow-lg shadow-violet-500/20">
                                🔥 POPULAR
                              </Badge>
                            ) : isBestValue ? (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-0 font-bold text-[10px] px-2.5 py-0.5"
                              >
                                👑 BEST VALUE
                              </Badge>
                            ) : (
                              <div />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <h4
                              className={cn(
                                "text-xs font-bold uppercase tracking-widest mb-1",
                                isPopular
                                  ? "text-violet-200"
                                  : "text-muted-foreground",
                              )}
                            >
                              {plan.title}
                            </h4>
                            <div className="flex items-baseline gap-1 mb-1">
                              <span
                                className={cn(
                                  "text-3xl font-black",
                                  isPopular ? "text-white" : "text-foreground",
                                )}
                              >
                                {plan.price}
                              </span>
                            </div>
                            <p
                              className={cn(
                                "text-[10px] font-semibold",
                                isPopular
                                  ? "text-violet-300"
                                  : "text-violet-600 dark:text-violet-400",
                              )}
                            >
                              {plan.pricePerMonth} / месяц
                            </p>
                          </div>

                          {/* Action - Кнопки прямой оплаты */}
                          <div className="mt-4 pt-4 border-t border-dashed border-white/10 dark:border-slate-800 space-y-2">
                            {isPremium ? (
                              <Button
                                variant="ghost"
                                disabled
                                className="w-full font-bold h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              >
                                {t("boostShop.premium.activeLink") || "Активен"}
                              </Button>
                            ) : (
                              <>
                                {showStarsPayment && (
                                  <StarsPaymentButton
                                    packageKey={catalogKey}
                                    priceCoins={0} // Внутренняя цена из БД по ключе
                                    variant="default"
                                    className={cn(
                                      "w-full font-bold h-11 rounded-xl shadow-lg",
                                      isPopular
                                        ? "bg-white text-slate-900 hover:bg-slate-50"
                                        : "bg-slate-900 text-white hover:bg-slate-800",
                                    )}
                                    onSuccess={() => {
                                      loadData();
                                      toast({
                                        title: "🎉 Premium активирован!",
                                        description:
                                          "Наслаждайтесь всеми преимуществами.",
                                        duration: 5000,
                                      });
                                    }}
                                  />
                                )}

                                <Button
                                  variant={isPopular ? "default" : "outline"}
                                  onClick={() => handleCoinPurchase(catalogKey)}
                                  disabled={
                                    purchaseLoading === catalogKey ||
                                    paddleLoading
                                  }
                                  className={cn(
                                    "w-full font-bold h-11 rounded-xl transition-all",
                                    isPopular && !showStarsPayment
                                      ? "bg-white text-slate-900 hover:bg-slate-50 shadow-xl"
                                      : !showStarsPayment
                                        ? "bg-slate-100 text-slate-900 border-0 hover:bg-slate-200"
                                        : "bg-transparent border-white/10 text-white hover:bg-white/5 text-[10px] h-8",
                                  )}
                                >
                                  {purchaseLoading === catalogKey ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : showStarsPayment ? (
                                    "Оплатить картой"
                                  ) : (
                                    "Оплатить картой"
                                  )}
                                </Button>

                                {showCryptomusPayment && (
                                  <button
                                    onClick={async () => {
                                      if (!profileId) {
                                        toast({
                                          title: t(
                                            "boostShop.toasts.errorTitle",
                                          ),
                                          description: t(
                                            "boostShop.toasts.needLogin",
                                          ),
                                          variant: "destructive",
                                        });
                                        return;
                                      }
                                      try {
                                        const { data, error } =
                                          await supabaseClient.functions.invoke(
                                            "cryptomus-payment",
                                            {
                                              body: {
                                                user_id: profileId,
                                                catalog_key: catalogKey,
                                              },
                                            },
                                          );
                                        if (error || data?.error)
                                          throw new Error(
                                            error?.message || data?.error,
                                          );
                                        if (data?.url && data?.orderId) {
                                          setCryptomusPreview({
                                            open: true,
                                            paymentUrl: data.url,
                                            orderId: data.orderId,
                                            amount: plan.priceValue,
                                            currency: "EUR",
                                            itemName: `Premium: ${plan.title}`,
                                          });
                                        }
                                      } catch (err: any) {
                                        toast({
                                          title: t(
                                            "boostShop.toasts.errorTitle",
                                          ),
                                          description:
                                            err.message ||
                                            t(
                                              "boostShop.toasts.purchaseErrorDescription",
                                            ),
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="w-full text-[9px] text-muted-foreground hover:text-white transition-colors uppercase tracking-widest font-black text-center py-1"
                                  >
                                    Оплатить криптовалютой (BTC/USDT)
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* DUEL PASS CARD: Matching Aesthetic */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#064e3b] to-[#042f2e] border border-emerald-500/30 p-1"
                >
                  {/* Background Shine */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-transparent" />

                  <div className="relative bg-[#022c22]/80 backdrop-blur-xl rounded-[20px] p-5 flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 shrink-0">
                      <Trophy className="w-7 h-7 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-black text-white">
                        Duel Pass
                      </h3>
                      <p className="text-xs text-emerald-200/80 mt-1 max-w-sm mx-auto sm:mx-0">
                        Открывайте сундуки, получайте эксклюзивные скины и
                        соревнуйтесь в сезоне.
                      </p>
                    </div>

                    <Button
                      className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold border-0 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] w-full sm:w-auto px-6 h-10 rounded-xl"
                      onClick={() => {
                        onOpenChange(false);
                        setTimeout(
                          () => useModalStore.getState().openModal("DUEL_PASS"),
                          150,
                        );
                      }}
                    >
                      Открыть
                    </Button>
                  </div>
                </motion.div>
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
                    {t("boostShop.history.operationsCount", {
                      count: transactions.length,
                    })}
                  </span>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    variant={filterCategory === "all" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory("all")}
                  >
                    {t("boostShop.history.filters.all")}
                  </Button>
                  <Button
                    variant={filterCategory === "earn" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory("earn")}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {t("boostShop.history.filters.earn")}
                  </Button>
                  <Button
                    variant={filterCategory === "spend" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory("spend")}
                  >
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {t("boostShop.history.filters.spend")}
                  </Button>
                  <Button
                    variant={
                      filterCategory === "purchase" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory("purchase")}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    {t("boostShop.history.filters.purchase")}
                  </Button>
                  <Button
                    variant={
                      filterCategory === "reward" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterCategory("reward")}
                  >
                    <Gift className="h-3 w-3 mr-1" />
                    {t("boostShop.history.filters.reward")}
                  </Button>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4"
                data-vaul-no-drag
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {loadingHistory ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="relative flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/30 overflow-hidden"
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                        <div className="w-10 h-10 bg-muted/40 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted/40 rounded w-2/3" />
                          <div className="h-2 bg-muted/30 rounded w-1/3" />
                        </div>
                        <div className="h-4 bg-muted/40 rounded w-12" />
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    const filtered =
                      filterCategory === "all"
                        ? transactions
                        : transactions.filter(
                          (tx) => tx.category === filterCategory,
                        );

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground">
                          <div className="space-y-3">
                            {filterCategory === "all" ? (
                              <>
                                <Coins className="h-12 w-12 mx-auto opacity-30" />
                                <div>
                                  <p className="text-sm font-medium mb-1">
                                    {t("boostShop.history.empty.all.title")}
                                  </p>
                                  <p className="text-xs">
                                    {t(
                                      "boostShop.history.empty.all.description",
                                    )}
                                  </p>
                                </div>
                                {!isPremium && (
                                  <div className="pt-2">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {t(
                                        "boostShop.history.empty.all.premiumHint",
                                      )}
                                    </Badge>
                                  </div>
                                )}
                              </>
                            ) : filterCategory === "earn" ? (
                              <>
                                <TrendingUp className="h-12 w-12 mx-auto opacity-30" />
                                <div>
                                  <p className="text-sm font-medium mb-1">
                                    {t("boostShop.history.empty.earn.title")}
                                  </p>
                                  <p className="text-xs">
                                    {t(
                                      "boostShop.history.empty.earn.description",
                                    )}
                                  </p>
                                </div>
                              </>
                            ) : filterCategory === "spend" ? (
                              <>
                                <TrendingDown className="h-12 w-12 mx-auto opacity-30" />
                                <div>
                                  <p className="text-sm font-medium mb-1">
                                    {t("boostShop.history.empty.spend.title")}
                                  </p>
                                  <p className="text-xs">
                                    {t(
                                      "boostShop.history.empty.spend.description",
                                    )}
                                  </p>
                                </div>
                              </>
                            ) : filterCategory === "purchase" ? (
                              <>
                                <CreditCard className="h-12 w-12 mx-auto opacity-30" />
                                <div>
                                  <p className="text-sm font-medium mb-1">
                                    {t(
                                      "boostShop.history.empty.purchase.title",
                                    )}
                                  </p>
                                  <p className="text-xs">
                                    {t(
                                      "boostShop.history.empty.purchase.description",
                                    )}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Gift className="h-12 w-12 mx-auto opacity-30" />
                                <div>
                                  <p className="text-sm font-medium mb-1">
                                    {t("boostShop.history.empty.reward.title")}
                                  </p>
                                  <p className="text-xs">
                                    {t(
                                      "boostShop.history.empty.reward.description",
                                    )}
                                  </p>
                                </div>
                              </>
                            )}
                            {filterCategory !== "all" && (
                              <p className="text-xs mt-2 pt-2 border-t border-border/50">
                                {t("boostShop.history.tryOtherFilter")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2 pb-4">
                        {filtered.map((tx, idx) => {
                          const IconComponent =
                            tx.icon ||
                            (tx.amount > 0 ? TrendingUp : TrendingDown);
                          const isPositive = tx.amount > 0;
                          const isPurchase = tx.category === "purchase";
                          const isReward = tx.category === "reward";

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
                                  <div
                                    className={`flex-shrink-0 ${isPositive
                                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                      : isPurchase
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : isReward
                                          ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                                      } p-2 rounded-lg`}
                                  >
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
                                      {tx.category &&
                                        (isPurchase || isReward) && (
                                          <Badge
                                            variant="secondary"
                                            className={`text-xs h-4 px-1.5 ${isPurchase
                                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                              }`}
                                          >
                                            {isPurchase
                                              ? t(
                                                "boostShop.history.badges.purchase",
                                              )
                                              : t(
                                                "boostShop.history.badges.reward",
                                              )}
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
                                    <span
                                      className={`text-sm font-bold ${isPositive
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400"
                                        }`}
                                    >
                                      {isPositive ? "+" : ""}
                                      {tx.amount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
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

          {/* Right: Coin balance + Close button */}
          <div className="flex items-center gap-2 shrink-0">
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
        className="max-w-5xl h-[85vh] max-h-[85vh] min-h-[600px] md:h-[85vh] md:max-h-[85vh] md:min-h-[700px] flex flex-col"
        contentClassName="scrollbar-none"
        hideCloseButton={true}
        snapPoints={[0.92, 1]}
        activeSnapPoint={modalSnapPoint}
        onSnapPointChange={(val) => setModalSnapPoint(val as number | string)}
      >
        {loading ? <ModalSkeleton rows={4} /> : <ModalContent />}
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
    </>
  );
}
