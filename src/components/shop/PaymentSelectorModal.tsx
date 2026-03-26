import React from 'react';
import { cn } from "@/lib/utils";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { StarsPaymentButton } from "@/components/monetization/StarsPaymentButton";
import { TonPaymentWidget } from "@/components/monetization/TonPaymentWidget";
import { CreditCard, Sparkles, Wallet, Bitcoin, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "@/components/optimized/Motion";

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
  onCryptoClick: () => void;
  onCardClick: () => void;
  availability: {
    stars: boolean;
    ton: boolean;
    crypto: boolean;
    card: boolean;
  };
}

export function PaymentSelectorModal({
  open,
  onOpenChange,
  pack,
  onSuccess,
  onCryptoClick,
  onCardClick,
  availability
}: PaymentSelectorModalProps) {
  const { t } = useLanguage();

  if (!pack) return null;

  const PaymentItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onClick, 
    className,
    rightElement,
    color = "blue"
  }: any) => (
    <motion.button
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.05)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full p-4 rounded-[20px] border border-white/5 bg-white/5 transition-all text-left group",
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
        <Icon className="w-6 h-6" />
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

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('boostShop.payment.selectorTitle') || "Выберите способ оплаты"}
      description={pack.title ? `${pack.title} — ${pack.price}` : undefined}
      className="max-w-md"
    >
      <div className="flex flex-col gap-3 p-1">
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
          <div className="relative">
            <PaymentItem
              icon={Wallet}
              title="TON Wallet"
              subtitle={t('boostShop.payment.tonSubtitle') || "Через Tonkeeper или Wallet"}
              color="blue"
              className="relative"
              rightElement={
                <div className="scale-75 origin-right">
                   <TonPaymentWidget
                      packageKey={pack.packageKey || pack.catalogKey}
                      mode="compact"
                      amountTon={pack.priceValue / 5}
                      description={pack.title}
                      className="!bg-transparent !p-0 shadow-none border-none"
                    />
                </div>
              }
            />
          </div>
        )}

        {/* Cryptocurrency (Cryptomus) */}
        {availability.crypto && (
          <PaymentItem
            icon={Bitcoin}
            title="Cryptocurrency"
            subtitle={t('boostShop.payment.cryptoSubtitle') || "BTC, USDT, ETH и другие"}
            color="orange"
            onClick={onCryptoClick}
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
      </div>
    </ResponsiveModal>
  );
}
