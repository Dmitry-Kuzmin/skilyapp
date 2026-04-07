import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tag, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PromoCodeInput, type PromoResult } from "@/components/PromoCodeInput";
import { toast } from "sonner";

export default function PromoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const defaultCode = searchParams.get("code") ?? searchParams.get("promo") ?? "";

  async function handleApply() {
    if (!promoResult?.partner_code) return;

    setApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in — store in localStorage and redirect to pricing
        localStorage.setItem("pending_promo_code", promoResult.partner_code);
        toast.success(`Промокод сохранён. Скидка ${promoResult.discount_pct}% будет применена при оплате.`);
        navigate("/pricing");
        return;
      }

      // Logged in — apply to profile
      const { data, error } = await supabase.rpc("apply_promo_code", {
        p_code: promoResult.partner_code,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) throw new Error(row?.message ?? "Ошибка");

      setApplied(true);
      toast.success(row.message);
      // Store in localStorage too so checkout can pick it up
      localStorage.setItem("active_promo_code", promoResult.partner_code);
      localStorage.setItem("active_promo_discount", String(promoResult.discount_pct));
    } catch (err: any) {
      toast.error(err.message ?? "Что-то пошло не так");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060a14] flex items-center justify-center p-4">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white font-bold text-xl mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm">S</div>
            Skily
          </div>
          <p className="text-white/40 text-sm">Активация промокода</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
          {applied ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-semibold text-lg mb-1">Промокод активирован!</p>
              <p className="text-white/50 text-sm mb-5">
                Скидка <span className="text-emerald-400 font-bold">{promoResult?.discount_pct}%</span> будет применена при оплате
              </p>
              <button
                onClick={() => navigate("/pricing")}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
              >
                Перейти к покупке <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-white font-bold text-lg flex items-center gap-2 mb-1">
                  <Tag className="w-5 h-5 text-indigo-400" />
                  Введи промокод
                </h2>
                <p className="text-white/40 text-sm">
                  Если тебе дали промокод — введи его и получи скидку на подписку или курс
                </p>
              </div>

              <PromoCodeInput
                onValidCode={setPromoResult}
                defaultValue={defaultCode}
              />

              {promoResult?.valid && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                  <p className="font-semibold mb-0.5">Промокод подтверждён ✓</p>
                  <p className="text-emerald-400/80">
                    Скидка {promoResult.discount_pct}% на платформу (€{(40 * (1 - promoResult.discount_pct / 100)).toFixed(0)} вместо €40)
                    или курс (€{(300 * (1 - promoResult.discount_pct / 100)).toFixed(0)} вместо €300)
                  </p>
                </div>
              )}

              <button
                onClick={handleApply}
                disabled={!promoResult?.valid || applying}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {applying ? "Применяем..." : "Применить промокод"}
                {!applying && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="text-white/25 text-[11px] text-center">
                Промокод можно использовать один раз. Скидка применяется при оплате.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
