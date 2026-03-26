import React from 'react';
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "@/components/optimized/Motion";
import { Coins, Crown, Zap, Star, Shield, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface UnifiedPricingCardProps {
  title: string;
  price: string;
  priceValue?: number;
  subtitle?: string;
  benefits?: string[];
  badge?: string;
  isPopular?: boolean;
  isVip?: boolean;
  accentColor?: 'violet' | 'amber' | 'cyan' | 'emerald' | 'blue';
  onBuy: () => void;
  icon?: 'coins' | 'premium' | 'zap' | 'shield';
  savings?: string;
  bonusCoins?: number;
  giftLabel?: string;
  pricePerDay?: string;
  pricePerUnit?: string;
  className?: string;
}

export function UnifiedPricingCard({
  title,
  price,
  subtitle,
  benefits = [],
  badge,
  isPopular,
  isVip,
  accentColor = 'blue',
  onBuy,
  icon = 'coins',
  savings,
  bonusCoins,
  giftLabel,
  pricePerDay,
  pricePerUnit,
  className
}: UnifiedPricingCardProps) {
  const { t } = useLanguage();
  
  const getAccentClasses = () => {
    switch (accentColor) {
      case 'violet': return "border-violet-500/30 text-violet-400 bg-violet-600/10 shadow-violet-500/20";
      case 'amber': return "border-amber-500/30 text-amber-400 bg-amber-600/10 shadow-amber-500/20 text-amber-500";
      case 'cyan': return "border-cyan-500/30 text-cyan-400 bg-cyan-600/10 shadow-cyan-500/20";
      case 'emerald': return "border-emerald-500/30 text-emerald-400 bg-emerald-600/10 shadow-emerald-500/20";
      default: return "border-blue-500/30 text-blue-400 bg-blue-600/10 shadow-blue-500/20";
    }
  };

  const getButtonClasses = () => {
    switch (accentColor) {
      case 'violet': return "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/30 hover:brightness-110";
      case 'amber': return "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-amber-500/30 hover:brightness-105";
      case 'cyan': return "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 hover:brightness-110";
      case 'emerald': return "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 hover:brightness-110";
      default: return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/30 hover:brightness-110";
    }
  };

  const IconComponent = () => {
    switch (icon) {
      case 'premium': return <Crown className="w-5 h-5 text-current shrink-0" />;
      case 'zap': return <Zap className="w-5 h-5 text-current shrink-0" />;
      case 'shield': return <Shield className="w-5 h-5 text-current shrink-0" />;
      default: return <Coins className="w-5 h-5 text-current shrink-0" />;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={cn("h-full group", className)}
    >
      <Card className={cn(
        "relative flex flex-col h-full overflow-hidden rounded-[24px] border bg-card/40 backdrop-blur-xl transition-all duration-300",
        isPopular ? "border-violet-500/40 shadow-2xl shadow-violet-500/10" : "border-white/10",
        isVip ? "border-amber-400/40 shadow-2xl shadow-amber-400/10" : ""
      )}>
        {/* Анимированный градиент на фоне для VIP/Popular */}
        {(isPopular || isVip) && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
            <motion.div
              animate={{
                background: [
                  "radial-gradient(circle at 0% 0%, var(--tw-gradient-from) 0%, transparent 50%)",
                  "radial-gradient(circle at 100% 100%, var(--tw-gradient-from) 0%, transparent 50%)",
                  "radial-gradient(circle at 0% 0%, var(--tw-gradient-from) 0%, transparent 50%)",
                ],
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className={cn(
                "absolute inset-0",
                isPopular ? "from-violet-600" : "from-amber-400"
              )}
            />
          </div>
        )}

        {/* Шиммер для популярных планов */}
        {isPopular && (
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-50" />
        )}

        {/* Бейдж */}
        {badge && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className={cn(
              "font-black text-[10px] tracking-widest px-2 py-0.5 border-0 shadow-lg",
              isPopular ? "bg-violet-600 text-white" : 
              isVip ? "bg-amber-400 text-black" : 
              "bg-muted/30 text-muted-foreground"
            )}>
              {badge}
            </Badge>
          </div>
        )}

        {/* Верхний отступ, чтобы не прижималось к бейджу */}
        <div className="pt-6 px-5 pb-5 flex-1 flex flex-col">
          {/* Иконка + Заголовок */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform duration-500 group-hover:rotate-6",
              getAccentClasses()
            )}>
              <IconComponent />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight tracking-tight">{title}</h3>
              {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>}
            </div>
          </div>

          {/* Цена */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter">
                {price}
              </span>
              {savings && (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                  {savings}
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-0.5 mt-1">
              {pricePerDay && (
                <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                  {pricePerDay}
                </div>
              )}
              {pricePerUnit && (
                <div className="text-[9px] font-bold text-indigo-400/70 uppercase tracking-widest">
                  {pricePerUnit}
                </div>
              )}
            </div>
            
            {/* Подарок / Бонусные монеты */}
            {(bonusCoins || giftLabel) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400/10 to-orange-400/10 border border-amber-400/20 text-amber-500"
              >
                <div className="flex items-center justify-center p-1 rounded-md bg-amber-400 text-black">
                   <Zap className="w-2.5 h-2.5 fill-current" />
                </div>
                <div className="flex flex-col">
                  {giftLabel && <span className="text-[8px] font-black uppercase tracking-tighter opacity-70 leading-none">{giftLabel}</span>}
                  <span className="text-[11px] font-black italic uppercase leading-none mt-0.5">
                    {bonusCoins ? t('boostShop.coins.bonusCoinsBenefit', { amount: bonusCoins }) : savings}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Фишки (Benefits) */}
          {benefits.length > 0 && (
            <div className="space-y-1.5 mb-6">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Кнопка (Прижата к низу) */}
          <div className="mt-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBuy}
              className={cn(
                "w-full h-11 rounded-xl font-black text-xs uppercase tracking-[0.1em] transition-all duration-300 shadow-xl",
                getButtonClasses()
              )}
            >
              Выбрать
            </motion.button>
          </div>
        </div>

        {/* Декоративный элемент внизу */}
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      </Card>
    </motion.div>
  );
}
