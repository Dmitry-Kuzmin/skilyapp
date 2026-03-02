/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Percent, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";

interface PromoCodeInputProps {
  userId: string;
  basePrice: number; // в центах (999 = €9.99)
  onPromoApplied: (data: {
    finalPrice: number;
    discountAmount: number;
    discountPercent: number;
    partnerId: string;
    partnerCode: string;
    commissionRate: number;
  }) => void;
  onPromoRemoved: () => void;
}

export function PromoCodeInput({ 
  userId, 
  basePrice, 
  onPromoApplied, 
  onPromoRemoved 
}: PromoCodeInputProps) {
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
    finalPrice: number;
    partnerName?: string;
  } | null>(null);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error("Введите промокод");
      return;
    }

    try {
      setLoading(true);

      // Вызвать RPC функцию для проверки промокода
      // @ts-expect-error - новая RPC функция из миграции
      const { data, error } = await supabase.rpc('apply_partner_promo_code', {
        p_user_id: userId,
        p_promo_code: promoCode.trim().toUpperCase(),
        p_base_price: basePrice / 100 // конвертируем центы в евро
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        // Успешно применен
        const finalPriceCents = Math.round(result.final_price * 100);
        const discountCents = Math.round(result.discount_amount * 100);

        setAppliedPromo({
          code: promoCode.trim().toUpperCase(),
          discountPercent: result.discount_percent,
          finalPrice: finalPriceCents,
        });

        onPromoApplied({
          finalPrice: finalPriceCents,
          discountAmount: discountCents,
          discountPercent: result.discount_percent,
          partnerId: result.partner_id,
          partnerCode: result.partner_code,
          commissionRate: result.commission_rate,
        });

        toast.success(`Промокод применен! Скидка ${result.discount_percent}%`, {
          description: `Новая цена: €${result.final_price.toFixed(2)}`,
          icon: <Sparkles className="h-4 w-4" />,
        });
      }
    } catch (error: any) {
      console.error('[PromoCodeInput] Error:', error);
      toast.error("Ошибка применения промокода", {
        description: error.message || "Попробуйте позже",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    onPromoRemoved();
    toast.info("Промокод удален");
  };

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {!appliedPromo ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <Input
                placeholder="Введите промокод"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyPromo();
                  }
                }}
                className="bg-slate-800/50 border-slate-700 uppercase placeholder:normal-case"
                disabled={loading}
              />
              <Button
                onClick={handleApplyPromo}
                disabled={loading || !promoCode.trim()}
                variant="outline"
                className="border-primary/50 hover:bg-primary/20"
              >
                {loading ? "Проверка..." : "Применить"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Есть промокод от партнера? Введите его для получения скидки
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="applied"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative overflow-hidden"
          >
            <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border-2 border-green-500/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-green-400">
                        Промокод активирован!
                      </p>
                      <Badge variant="outline" className="border-green-500/50 text-green-400">
                        {appliedPromo.code}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Percent className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-300">
                        Скидка: <span className="font-bold text-green-400">
                          {appliedPromo.discountPercent}%
                        </span>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">
                        Итого: <span className="font-bold text-primary">
                          €{(appliedPromo.finalPrice / 100).toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePromo}
                  className="h-8 w-8 p-0 hover:bg-red-500/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

