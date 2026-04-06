import { useState } from "react";
import { Send, CheckCircle2, Copy, Check, Loader2, ExternalLink, X } from "lucide-react";
import { getLazySupabaseClient } from "@/integrations/supabase/lazyClient";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "telegram",  label: "Telegram",  emoji: "✈️" },
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "youtube",   label: "YouTube",   emoji: "▶️" },
  { id: "tiktok",    label: "TikTok",    emoji: "🎵" },
  { id: "blog",      label: "Блог/Сайт", emoji: "🌐" },
  { id: "other",     label: "Другое",    emoji: "💡" },
];

type Step = "form" | "auth_wait" | "success";

interface Props {
  onClose: () => void;
}

export function PartnerWebSignup({ onClose }: Props) {
  const [step, setStep]               = useState<Step>("form");
  const [name, setName]               = useState("");
  const [platforms, setPlatforms]     = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [copied, setCopied]           = useState(false);

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
      const supabase = getLazySupabaseClient();

      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Open Telegram auth in a popup — user comes back after login
        setStep("auth_wait");
        setLoading(false);
        return;
      }

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

  async function handleTelegramLogin() {
    const supabase = getLazySupabaseClient();
    // Redirect-based OAuth — after return, user clicks submit again
    await supabase.auth.signInWithOAuth({
      provider: "telegram" as any,
      options: {
        redirectTo: `${window.location.origin}/partners?partner_signup=1`,
      },
    });
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(partnerCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[#0d1426] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="font-bold text-white text-lg">Стать партнёром</h3>
            <p className="text-white/40 text-xs mt-0.5">
              {step === "success" ? "Добро пожаловать в программу!" : "Займёт 30 секунд"}
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
            <h4 className="text-xl font-bold text-white mb-2">Поздравляем! 🎉</h4>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Ты в партнёрской программе Skily. Твой реферальный код готов к использованию прямо сейчас.
            </p>

            {/* Partner code */}
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
              <a
                href="https://t.me/skilyapp_bot/skilyapp?startapp=partner"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Открыть кабинет в Telegram
              </a>
              <button
                onClick={onClose}
                className="text-white/35 text-xs hover:text-white/60 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {/* ── Auth wait screen ── */}
        {step === "auth_wait" && (
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-blue-400" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Войди через Telegram</h4>
            <p className="text-white/45 text-sm mb-6 leading-relaxed">
              Авторизация нужна один раз — чтобы привязать статистику и выплаты к тебе лично.
            </p>
            <button
              onClick={handleTelegramLogin}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-[#229ED9] text-white font-semibold text-sm hover:bg-[#1a8abf] transition-all mb-3"
            >
              <Send className="w-4 h-4" />
              Войти через Telegram
            </button>
            <button
              onClick={() => setStep("form")}
              className="text-white/35 text-xs hover:text-white/60 transition-colors"
            >
              ← Назад
            </button>
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
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-white/40 text-xs leading-relaxed">
                30% с платформы (€12) · 20% с курса (€60) · Промокод со скидкой 15% для аудитории
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
                : <><Send className="w-4 h-4" />Стать партнёром — бесплатно</>
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
  );
}
