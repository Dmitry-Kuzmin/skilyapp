import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Copy, Check, Loader2, ExternalLink, X, TrendingUp, Monitor, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthModalNew } from "@/components/AuthModalNew";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "telegram",  label: "Telegram",  emoji: "✈️" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "youtube",   label: "YouTube",   emoji: "▶️" },
  { id: "tiktok",    label: "TikTok",    emoji: "🎵" },
  { id: "blog",      label: "Блог/Сайт", emoji: "🌐" },
  { id: "other",     label: "Другое",    emoji: "💡" },
];

type Step = "check_auth" | "auth" | "form" | "success";

interface Props {
  onClose: () => void;
}

export function PartnerWebSignup({ onClose }: Props) {
  const navigate = useNavigate();
  const [step, setStep]               = useState<Step>("check_auth");
  const [name, setName]               = useState("");
  const [platforms, setPlatforms]     = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [copied, setCopied]           = useState(false);
  const [showAuth, setShowAuth]       = useState(false);

  // Check auth on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata;
        const displayName = meta?.full_name || meta?.name || meta?.first_name || "";
        if (displayName) setName(displayName);
        setStep("form");
      } else {
        setStep("auth");
        setShowAuth(true);
      }
    });
  }, []);

  // After auth modal closes, recheck
  function handleAuthClose() {
    setShowAuth(false);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata;
        const displayName = meta?.full_name || meta?.name || meta?.first_name || "";
        if (displayName) setName(displayName);
        setStep("form");
      } else {
        onClose(); // User dismissed auth — close the whole flow
      }
    });
  }

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Введи своё имя или название канала"); return; }
    if (platforms.length === 0) { toast.error("Выбери хотя бы одну платформу"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("self_register_blogger", {
        p_name:      name.trim(),
        p_platforms: platforms,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) throw new Error(row?.message ?? "Ошибка регистрации");

      setPartnerCode(row.partner_code);
      setStep("success");
    } catch (err: any) {
      toast.error(err.message ?? "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(partnerCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // While checking auth — show nothing special
  if (step === "check_auth") return null;

  // Auth step — open existing modal, keep backdrop
  if (step === "auth") {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <AuthModalNew open={showAuth} onClose={handleAuthClose} />
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        {/* Panel */}
        <div className="relative z-10 w-full max-w-md bg-[#0d1426] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="font-bold text-white text-lg">
                {step === "success" ? "Вы в программе! 🎉" : "Стать партнёром"}
              </h3>
              <p className="text-white/40 text-xs mt-0.5">
                {step === "success" ? "Добро пожаловать в партнёрскую программу Skily" : "Займёт 30 секунд"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Success screen ── */}
          {step === "success" && (
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                Ты в партнёрской программе Skily. Твой реферальный код готов к использованию прямо сейчас.
              </p>

              <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-4 mb-6">
                <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-2">Твой код партнёра</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-black tracking-widest text-white">{partnerCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      copied
                        ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
                        : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {copied ? <><Check className="w-3 h-3" />Скопирован</> : <><Copy className="w-3 h-3" />Скопировать</>}
                  </button>
                </div>
                <p className="text-white/30 text-[10px] mt-2">
                  Реф. ссылка: skilyapp.com/r/{partnerCode.toLowerCase()}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Desktop option */}
                <button
                  onClick={() => { onClose(); navigate("/partner/dashboard"); }}
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all"
                >
                  <Monitor className="w-4 h-4" />
                  Открыть кабинет здесь
                </button>
                {/* Telegram option */}
                <a
                  href="https://t.me/skilyapp_bot/skilyapp?startapp=partner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl border border-white/15 bg-white/[0.04] text-white font-semibold text-sm hover:bg-white/[0.08] transition-all"
                >
                  <Send className="w-4 h-4" />
                  Открыть в Telegram
                </a>
                <button onClick={onClose} className="text-white/35 text-xs hover:text-white/60 transition-colors">
                  Закрыть
                </button>
              </div>
            </div>
          )}

          {/* ── Registration form ── */}
          {step === "form" && (
            <div className="px-6 py-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Имя или название канала
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: @migration_spain"
                  maxLength={60}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                />
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Где размещаешь контент?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => {
                    const active = platforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                          active
                            ? "border-indigo-500/50 bg-indigo-500/15 text-white"
                            : "border-white/[0.07] bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/15"
                        }`}
                      >
                        <span className="text-base">{p.emoji}</span>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commission note */}
              <div className="flex gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <TrendingUp className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/40 text-xs leading-relaxed">
                  30% с платформы (€12) · 20% с курса (€60) · Промокод 15% для аудитории
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-60"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Подождите…</>
                  : <>Получить партнёрский код — бесплатно</>
                }
              </button>

              <p className="text-center text-white/20 text-[10px]">
                Нажимая кнопку, ты принимаешь{" "}
                <a href="#rules" className="text-white/35 hover:text-white/60" onClick={onClose}>
                  правила партнёрства
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
