import React from 'react';
import { UnifiedModal } from "@/components/ui/unified-modal";
import { TonPaymentWidget } from "./LazyTonPaymentWidget";
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
      className="max-w-sm border-0 p-0 overflow-hidden rounded-[32px] bg-[#0F121E] shadow-2xl"
    >
      <div className="relative p-0 flex flex-col items-center text-center overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[60px]" />

        {/* Hero Section */}
        <div className="relative w-full pt-10 pb-8 px-8 bg-gradient-to-b from-blue-600/10 to-transparent">
          <div className="mx-auto w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-6 group transition-transform hover:scale-105 duration-500">
            <Wallet className="w-10 h-10 text-white" />
            <div className="absolute -top-2 -right-2">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400 blur-md opacity-50 animate-pulse" />
                <Sparkles className="relative w-7 h-7 text-amber-300 animate-spin-slow" />
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight mb-2 uppercase italic">
            Оформление заказа
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-300 tracking-widest uppercase">Safe TON Transaction</span>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="relative z-10 w-full px-8 pb-8">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-8 text-left space-y-4 shadow-inner">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Продукт</p>
                <h3 className="text-lg font-bold text-white leading-tight">Skily Premium</h3>
                <p className="text-xs text-blue-400/80 font-medium">Бесконечные тесты + AI</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Срок</p>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[11px] font-black rounded-md border border-blue-500/30">
                  30 ДНЕЙ
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-400">К оплате:</span>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-white flex items-center gap-1.5">
                  {amountNumber} <span className="text-blue-400">TON</span>
                </span>
                <span className="text-[10px] text-slate-500 font-bold line-through opacity-50 italic">≈ €9.99 (Card Price)</span>
              </div>
            </div>
          </div>

          {/* Payment Button Container */}
          <div className="w-full space-y-4">
            <TonPaymentWidget 
              mode="full" 
              amountTon={amountNumber} 
              description={description}
              autoPay={shouldAutoPay}
              onSuccess={() => {
                  setTimeout(() => onOpenChange(false), 2000);
              }}
            />
            
            <p className="text-[10px] text-slate-500/60 leading-tight italic max-w-[200px] mx-auto">
              Нажимая «Оплатить», вы подтверждаете транзакцию в экосистеме TON. Premium активируется мгновенно.
            </p>
          </div>
        </div>

        {/* Decorative Bottom Bar */}
        <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      </div>
    </UnifiedModal>
  );
}
