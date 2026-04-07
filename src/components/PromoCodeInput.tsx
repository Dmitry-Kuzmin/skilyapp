import { useState } from "react";
import { Tag, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface PromoResult {
  valid: boolean;
  partner_name: string | null;
  discount_pct: number;
  partner_code: string | null;
}

interface Props {
  /** Called when a valid code is entered (or cleared) */
  onValidCode: (result: PromoResult | null) => void;
  /** Pre-fill value (e.g. from URL ?promo=XXX) */
  defaultValue?: string;
  className?: string;
}

export function PromoCodeInput({ onValidCode, defaultValue = "", className = "" }: Props) {
  const [code, setCode]         = useState(defaultValue.toUpperCase());
  const [status, setStatus]     = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [result, setResult]     = useState<PromoResult | null>(null);

  async function checkCode(value: string) {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      setStatus("idle");
      setResult(null);
      onValidCode(null);
      return;
    }
    setStatus("checking");
    try {
      const { data, error } = await supabase.rpc("validate_promo_code", { p_code: trimmed });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.valid) {
        setStatus("valid");
        const r: PromoResult = {
          valid: true,
          partner_name: row.partner_name,
          discount_pct: row.discount_pct,
          partner_code: row.partner_code,
        };
        setResult(r);
        onValidCode(r);
      } else {
        setStatus("invalid");
        setResult(null);
        onValidCode(null);
      }
    } catch {
      setStatus("invalid");
      setResult(null);
      onValidCode(null);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setCode(val);
    setStatus("idle");
    setResult(null);
    onValidCode(null);
  }

  function handleBlur() {
    if (code.trim()) checkCode(code);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") checkCode(code);
  }

  return (
    <div className={className}>
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={code}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Промокод партнёра (необязательно)"
          maxLength={20}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-all uppercase tracking-wider"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
          {status === "valid"    && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {status === "invalid"  && <XCircle className="w-4 h-4 text-red-400" />}
        </div>
      </div>

      {status === "valid" && result && (
        <p className="mt-1.5 text-xs text-emerald-400">
          ✓ Промокод от <span className="font-semibold">{result.partner_name}</span> —{" "}
          скидка <span className="font-semibold">{result.discount_pct}%</span> на покупку
        </p>
      )}
      {status === "invalid" && (
        <p className="mt-1.5 text-xs text-red-400">Промокод не найден</p>
      )}
    </div>
  );
}
