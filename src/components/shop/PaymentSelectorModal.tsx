import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from "@/lib/utils";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { StarsPaymentButton } from "@/components/monetization/StarsPaymentButton";
import { CreditCard, Sparkles, Wallet, Bitcoin, ChevronRight, ArrowLeft, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useUserContext } from "@/contexts/UserContext";
// telegram imports removed — Cryptomus embedded in iframe
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

interface PaymentSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pack: {
    id: string;
    catalogKey: string;
    packageKey: string;
    title: string;
    price: string;
    priceValue: number;
    amount?: number;
    priceCoins?: number;
  } | null;
  onSuccess: () => void;
  onTonClick: () => void;
  onCryptoClick: () => Promise<{ paymentUrl: string; orderId: string; amount: number; currency: string; itemName: string }>;
  onCardClick: () => void;
  availability: {
    stars: boolean;
    ton: boolean;
    crypto: boolean;
    card: boolean;
  };
}

interface CryptomusData {
  paymentUrl: string;
  orderId: string;
  amount: number;
  currency: string;
  itemName: string;
}

export function PaymentSelectorModal({
  open,
  onOpenChange,
  pack,
  onSuccess,
  onTonClick,
  onCryptoClick,
  onCardClick,
  availability
}: PaymentSelectorModalProps) {
  const { t } = useLanguage();
  const { profileId } = useUserContext();

  // Step state
  const [step, setStep] = useState<'select' | 'cryptomus'>('select');
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptomusData, setCryptomusData] = useState<CryptomusData | null>(null);

  // Cryptomus payment status polling
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'completed' | 'failed'>('pending');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when modal closes or opens
  useEffect(() => {
    if (!open) {
      // Slight delay to avoid visual flash during close animation
      const timer = setTimeout(() => {
        setStep('select');
        setCryptomusData(null);
        setCryptoLoading(false);
        setPaymentStatus('pending');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Poll payment status when on cryptomus step
  useEffect(() => {
    if (step !== 'cryptomus' || !cryptomusData?.orderId || !profileId) return;

    const checkStatus = async () => {
      try {
        setPaymentStatus('checking');
        const { data, error } = await supabase
          .from('purchases')
          .select('status, cryptomus_order_id')
          .eq('user_id', profileId)
          .eq('cryptomus_order_id', cryptomusData.orderId)
          .maybeSingle();

        if (error) {
          console.error('[PaymentSelector] Status check error:', error);
          setPaymentStatus('pending');
          return;
        }

        if (data?.status === 'completed') {
          setPaymentStatus('completed');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          toast({ title: t('cryptomusPayment.paymentCompleted'), variant: "default" });
          setTimeout(() => {
            onSuccess();
            onOpenChange(false);
          }, 2000);
        } else if (data?.status === 'failed' || data?.status === 'cancelled') {
          setPaymentStatus('failed');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          setPaymentStatus('pending');
        }
      } catch {
        setPaymentStatus('pending');
      }
    };

    const startTimer = setTimeout(() => {
      checkStatus();
      intervalRef.current = setInterval(checkStatus, 10000);
    }, 5000);

    return () => {
      clearTimeout(startTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [step, cryptomusData?.orderId, profileId]);

  // Handle crypto click → call parent function → transition to step 2
  const handleCryptoClick = useCallback(async () => {
    setCryptoLoading(true);
    try {
      const result = await onCryptoClick();
      setCryptomusData(result);
      setStep('cryptomus');
    } catch {
      // Parent already shows toast
    } finally {
      setCryptoLoading(false);
    }
  }, [onCryptoClick]);

  // handleProceedToPayment removed — Cryptomus now embedded in iframe

  if (!pack) return null;

  // Dynamic title based on step
  const modalTitle = step === 'select'
    ? (t('boostShop.payment.selectorTitle') || "Выберите способ оплаты")
    : (t('cryptomusPayment.title') || "Оплата криптовалютой");

  const modalDescription = step === 'select'
    ? (pack.title ? `${pack.title} — ${pack.price}` : undefined)
    : (t('cryptomusPayment.description') || undefined);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle}
      description={modalDescription}
      className="max-w-md"
    >
      <AnimatePresence mode="wait">
        {step === 'select' ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3 p-1"
          >
            {/* Telegram Stars */}
            {availability.stars && (
              <div className="relative">
                <StarsPaymentButton
                  packageKey={pack.packageKey || pack.catalogKey}
                  priceCoins={pack.priceCoins || 0}
                  onSuccess={() => {
                    onSuccess();
                    onOpenChange(false);
                  }}
                  variant="ghost"
                  className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                />
                <PaymentItem
                  icon={Sparkles}
                  title="Telegram Stars"
                  subtitle={t('boostShop.payment.starsSubtitle') || "Мгновенно через Telegram"}
                  color="gold"
                  rightElement={
                    <span className="text-xs font-black text-amber-500">⭐ {pack.priceCoins || '...'}</span>
                  }
                />
              </div>
            )}

            {/* TON Wallet */}
            {availability.ton && (
              <PaymentItem
                icon={Wallet}
                title="TON Wallet"
                subtitle={t('boostShop.payment.tonSubtitle') || "Через Tonkeeper или Wallet"}
                color="blue"
                onClick={onTonClick}
                rightElement={
                  <span className="text-xs font-bold text-blue-400">{(pack.priceValue / 5).toFixed(1)} TON</span>
                }
              />
            )}

            {/* Cryptocurrency (Cryptomus) */}
            {availability.crypto && (
              <PaymentItem
                icon={Bitcoin}
                title="Cryptocurrency"
                subtitle={t('boostShop.payment.cryptoSubtitle') || "BTC, USDT, ETH и другие"}
                color="orange"
                onClick={handleCryptoClick}
                loading={cryptoLoading}
              />
            )}

            {/* Bank Card (Paddle) */}
            {availability.card && (
              <PaymentItem
                icon={CreditCard}
                title={t('boostShop.payment.cardTitle') || "Банковская карта"}
                subtitle={t('boostShop.payment.cardSubtitle') || "Visa, Mastercard, Stripe"}
                color="gray"
                onClick={onCardClick}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="cryptomus"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {/* Header with back button + status */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => { setStep('select'); setPaymentStatus('pending'); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.back') || 'Назад'}
              </button>

              {paymentStatus === 'checking' && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>{t('cryptomusPayment.checkingStatus') || 'Проверяем...'}</span>
                </div>
              )}
              {paymentStatus === 'completed' && (
                <div className="flex items-center gap-1.5 text-xs text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{t('cryptomusPayment.paymentCompleted') || 'Оплачено!'}</span>
                </div>
              )}
            </div>

            {/* Cryptomus iframe — embedded payment page */}
            {cryptomusData && (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black" style={{ height: '70vh', maxHeight: '600px' }}>
                <iframe
                  src={cryptomusData.paymentUrl}
                  className="w-full h-full border-0"
                  allow="payment; clipboard-write"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                  title="Cryptomus Payment"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveModal>
  );
}

/** Reusable payment method row */
function PaymentItem({
  icon: Icon,
  title,
  subtitle,
  onClick,
  className,
  rightElement,
  color = "blue",
  loading = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick?: () => void;
  className?: string;
  rightElement?: React.ReactNode;
  color?: 'gold' | 'blue' | 'orange' | 'gray';
  loading?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.05)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex items-center gap-4 w-full p-4 rounded-[20px] border border-white/5 bg-white/5 transition-all text-left group",
        loading && "opacity-60",
        className
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
        color === "gold" ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black" :
        color === "blue" ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white" :
        color === "orange" ? "bg-gradient-to-br from-orange-500 to-red-600 text-white" :
        "bg-white/10 text-white"
      )}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-6 h-6" />}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {subtitle}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        {rightElement}
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
    </motion.button>
  );
}
