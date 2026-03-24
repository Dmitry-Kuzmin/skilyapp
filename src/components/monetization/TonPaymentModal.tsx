import React from 'react';
import { UnifiedModal } from "@/components/ui/unified-modal";
import { TonPaymentWidget } from "./TonPaymentWidget";
import { Wallet, Sparkles } from "lucide-react";

interface TonPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Deep link params (e.g. ?amount=1.5&desc=Premium)
  amount?: string;
  desc?: string;
  autoPay?: string;
}

export function TonPaymentModal({ open, onOpenChange, amount, desc, autoPay }: TonPaymentModalProps) {
  const amountNumber = amount ? parseFloat(amount) : 1.5;
  const description = desc ? decodeURIComponent(desc) : "Skily Premium Access";
  const shouldAutoPay = autoPay === "true";

  return (
    <UnifiedModal 
      open={open} 
      onOpenChange={onOpenChange}
      showTitleBar={false}
      className="max-w-sm border-0 p-0 overflow-hidden rounded-[28px] bg-[#0F121E]"
    >
      <div className="relative p-7 flex flex-col items-center text-center overflow-hidden">
        {/* ... Background ... */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] animate-pulse" />

        {/* Header Icon */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
          <Wallet className="w-8 h-8 text-white" />
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-2 mb-8">
          <h2 className="text-xl font-bold text-white tracking-tight">Подключи & Оплати</h2>
          <p className="text-sm text-slate-400 max-w-[240px] leading-relaxed">
            Разблокируй <span className="text-blue-400 font-semibold">Premium</span> на 1 месяц через TON
          </p>
        </div>

        {/* Payment Widget */}
        <div className="relative z-10 w-full">
          <TonPaymentWidget 
            mode="full" 
            amountTon={amountNumber} 
            description={description}
            autoPay={shouldAutoPay}
            onSuccess={() => {
                setTimeout(() => onOpenChange(false), 2000);
            }}
          />
        </div>

        {/* Guarantee Info */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/5 w-full">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
             🛡️ Мгновенная активация после транзакции
          </p>
        </div>
      </div>
    </UnifiedModal>
  );
}
