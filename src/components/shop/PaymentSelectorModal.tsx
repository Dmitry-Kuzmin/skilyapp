import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from "@/lib/utils";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { StarsPaymentButton } from "@/components/monetization/StarsPaymentButton";
import { CreditCard, Sparkles, Wallet, Bitcoin, ChevronRight, ArrowLeft, X, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { getTelegramWebApp } from "@/lib/telegram";

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
  const [starsLoading, setStarsLoading] = useState(false);
  const [cryptomusData, setCryptomusData] = useState<CryptomusData | null>(null);

  // Price states
  const [starsPrice, setStarsPrice] = useState<number | null>(null);
  const [tonPrice, setTonPrice] = useState<number | null>(null);

  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'completed' | 'failed'>('pending');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load actual prices from DB
  useEffect(() => {
    if (!open || !pack) return;

    const loadPrices = async () => {
      try {
        const finalKey = pack.packageKey.startsWith('coins_pack_') 
          ? pack.packageKey.replace('coins_pack_', 'coins_') 
          : pack.packageKey;

        const { data, error } = await supabase
          .from('pricing_packages')
          .select('price_stars, price_coins')
          .eq('package_key', finalKey)
          .maybeSingle();

        if (data && !error) {
          const pricing = data as any;
          if (pricing.price_stars) {
            setStarsPrice(pricing.price_stars);
          } else {
            // Fallback to heuristic
            setStarsPrice(Math.round(pack.priceCoins! * 1.98));
          }
        } else {
          // Heuristic fallback
          setStarsPrice(Math.round(pack.priceCoins! * 1.98));
        }
      } catch (err) {
        console.error('[PaymentSelector] Price load error:', err);
      }
    };

    loadPrices();
  }, [open, pack?.packageKey, pack?.priceCoins]);

  // Reset when modal closes or opens
  useEffect(() => {
    if (!open) {
      // Slight delay to avoid visual flash during close animation
      const timer = setTimeout(() => {
        setStep('select');
        setCryptomusData(null);
        setCryptoLoading(false);
        setStarsLoading(false);
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
          .maybeSingle(); // Kept maybeSingle as it correctly handles cases where the purchase might not be found yet or is still processing.

        const purchaseData = data as any;
        console.log('[PaymentSelector] Cloud check:', { data: purchaseData, error });

        if (error) {
          console.error('[PaymentSelector] Status check error:', error);
          setPaymentStatus('pending');
          return;
        }

        if (purchaseData?.status === 'completed') {
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
        } else if (purchaseData?.status === 'failed' || purchaseData?.status === 'cancelled') {
          setPaymentStatus('failed');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          setPaymentStatus('pending');
        }
      } catch (err) {
        console.error('[PaymentSelector] Status check catch:', err);
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

  // Telegram BackButton support for fullscreen overlays
  useEffect(() => {
    if (step !== 'cryptomus') return;
    const webApp = getTelegramWebApp();
    if (!webApp?.BackButton) return;

    const handleBack = () => {
      setStep('select');
      setPaymentStatus('pending');
    };
    webApp.BackButton.show();
    webApp.BackButton.onClick(handleBack);
    return () => {
      webApp.BackButton.offClick(handleBack);
    };
  }, [step]);

  if (!pack) return null;

  return (
    <>
      {/* Step 1: Payment method selector modal */}
      <ResponsiveModal
        open={open && step === 'select'}
        onOpenChange={onOpenChange}
        title={t('boostShop.payment.selectorTitle') || "Выберите способ оплаты"}
        description={pack.title ? `${pack.title} — ${pack.price}` : undefined}
        className="max-w-md"
      >
        <div className="flex flex-col gap-3 px-2 pb-4 pt-1">
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
                onLoadingChange={setStarsLoading}
                variant="ghost"
                className="absolute inset-0 w-full h-full opacity-0 disabled:opacity-0 z-10 cursor-pointer"
              />
              <PaymentItem
                icon={Sparkles}
                title="Telegram Stars"
                subtitle={t('boostShop.payment.starsSubtitle') || "Мгновенно через Telegram"}
                color="gold"
                loading={starsLoading}
                rightElement={
                  <span className="text-xs font-black text-amber-500">
                    ⭐ {starsPrice || '...'}
                  </span>
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
              className="relative z-20"
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
              className="relative z-20"
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
              className="relative z-20"
              onClick={onCardClick}
            />
          )}
        </div>
      </ResponsiveModal>

      {/* Step 2: Fullscreen Cryptomus overlay (no modal wrapper) */}
      {step === 'cryptomus' && cryptomusData && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black flex flex-col" style={{ paddingTop: 'var(--app-content-top, env(safe-area-inset-top))', paddingBottom: 'var(--app-safe-bottom, env(safe-area-inset-bottom))' }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/90 shrink-0">
            <button
              onClick={() => { setStep('select'); setPaymentStatus('pending'); }}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back') || 'Назад'}
            </button>

            {paymentStatus === 'completed' ? (
              <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('cryptomusPayment.paymentCompleted') || 'Оплачено!'}
              </div>
            ) : paymentStatus === 'checking' ? (
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {t('cryptomusPayment.checkingStatus') || 'Проверяем...'}
              </div>
            ) : null}

            <button
              onClick={() => { setStep('select'); setPaymentStatus('pending'); onOpenChange(false); }}
              className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fullscreen iframe */}
          <div className="flex-1 relative">
            <iframe
              src={cryptomusData.paymentUrl}
              className="absolute inset-0 w-full h-full border-0"
              allow="payment; clipboard-write"
              title="Cryptomus Payment"
            />
            {/* Left edge swipe-back zone */}
            <SwipeBackZone onSwipeBack={() => { setStep('select'); setPaymentStatus('pending'); }} />
          </div>
        </div>,
        document.body
      )}
    </>
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

/** Left-edge swipe zone for going back (works over iframes) */
function SwipeBackZone({ onSwipeBack }: { onSwipeBack: () => void }) {
  const startRef = useRef({ x: 0, y: 0, active: false });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 20,
        height: '100%',
        zIndex: 10,
        touchAction: 'pan-y',
        background: 'transparent',
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t.clientX <= 20) {
          startRef.current = { x: t.clientX, y: t.clientY, active: true };
        }
      }}
      onTouchMove={(e) => {
        if (!startRef.current.active) return;
        const t = e.touches[0];
        const dx = t.clientX - startRef.current.x;
        const dy = Math.abs(t.clientY - startRef.current.y);
        if (dx > 60 && dy < 50) {
          startRef.current.active = false;
          onSwipeBack();
        }
      }}
      onTouchEnd={() => { startRef.current.active = false; }}
      onTouchCancel={() => { startRef.current.active = false; }}
      aria-hidden="true"
    />
  );
}
