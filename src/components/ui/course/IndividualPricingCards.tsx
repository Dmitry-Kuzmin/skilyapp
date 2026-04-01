"use client";

import { useState, useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { MessageCircle, Users, User, Zap, FileText, Globe, CheckCircle2, Clock } from "lucide-react";
import { Analytics } from "@/lib/posthog";

// ─── Animated price counter ───────────────────────────────────────────────────
// animate(from, to, { onUpdate }) — framer-motion independent value animation.
// React state drives the display — no rAF tricks, no DOM bypassing.

function AnimatedPrice({ value, isDark }: { value: number; isDark?: boolean }) {
  const [displayed, setDisplayed] = useState(value);
  const currentRef = useRef(value); // tracks last visual value for chained animations

  useEffect(() => {
    const from = currentRef.current;
    const to = value;

    const controls = animate(from, to, {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        const rounded = Math.round(v);
        currentRef.current = rounded;
        setDisplayed(rounded);
      },
      onComplete() {
        currentRef.current = to;
        setDisplayed(to);
      },
    });

    return controls.stop;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={`text-4xl font-black tracking-tight tabular-nums ${isDark ? "text-white" : "text-zinc-900"}`}>
      €{displayed}
    </span>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onChange,
  isDark = false,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  isDark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={[
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0",
        enabled
          ? isDark
            ? "bg-white/90"
            : "bg-zinc-800"
          : isDark
          ? "bg-white/10"
          : "bg-zinc-200",
      ].join(" ")}
      aria-pressed={enabled}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 shadow-sm",
          enabled ? "translate-x-[18px]" : "translate-x-[3px]",
          isDark ? (enabled ? "bg-zinc-900" : "bg-zinc-500") : "bg-white",
        ].join(" ")}
      />
    </button>
  );
}

// ─── Check icon ───────────────────────────────────────────────────────────────

function Check({ isDark }: { isDark?: boolean }) {
  return (
    <CheckCircle2
      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? "text-white/60" : "text-zinc-700"}`}
    />
  );
}

// ─── Add-on row ───────────────────────────────────────────────────────────────

function Addon({
  icon: Icon,
  label,
  price,
  enabled,
  onChange,
  isDark,
}: {
  icon: React.ElementType;
  label: string;
  price: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  isDark?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 border-t ${isDark ? "border-white/[0.07]" : "border-black/[0.06]"}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-white/40" : "text-zinc-400"}`} />
        <span className={`text-sm leading-snug ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
          {label}
        </span>
        <span className={`text-xs font-semibold shrink-0 ${enabled ? (isDark ? "text-white" : "text-zinc-800") : (isDark ? "text-zinc-500" : "text-zinc-400")}`}>
          +{price}
        </span>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} isDark={isDark} />
    </div>
  );
}

// ─── Addon type ───────────────────────────────────────────────────────────────

interface DbAddon {
  addon_key: string;
  label: string;
  price_group: number;
  price_individual: number;
}

// Fallback addons if DB is unavailable
const FALLBACK_ADDONS: DbAddon[] = [
  { addon_key: 'spanish',       label: 'Испанский для водителей', price_group: 60, price_individual: 80 },
  { addon_key: 'documents',     label: 'Помощь с документами',    price_group: 50, price_individual: 50 },
  { addon_key: 'extra_session', label: 'Дополнительная сессия',   price_group: 40, price_individual: 60 },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function IndividualPricingCards({
  onBooking,
  mgBasePrice = 499,
  indBasePrice = 799,
  addons: addonsFromDb,
}: {
  onBooking?: () => void;
  mgBasePrice?: number;
  indBasePrice?: number;
  addons?: DbAddon[];
}) {
  const addons = (addonsFromDb && addonsFromDb.length > 0) ? addonsFromDb : FALLBACK_ADDONS;

  // Toggle state per addon_key
  const [mgEnabled, setMgEnabled] = useState<Record<string, boolean>>({});
  const [indEnabled, setIndEnabled] = useState<Record<string, boolean>>({});

  const mgTotal = addons.reduce((sum, a) => sum + (mgEnabled[a.addon_key] ? a.price_group : 0), mgBasePrice);
  const indTotal = addons.reduce((sum, a) => sum + (indEnabled[a.addon_key] ? a.price_individual : 0), indBasePrice);

  const mgFeatures = [
    "8 живых сессий с преподавателем",
    "Группа 2–3 человека",
    "Платформа Skilyapp на 3 мес",
    "Чат группы с куратором",
    "Записи занятий",
  ];

  const indFeatures = [
    "8 сессий полностью под тебя",
    "Только ты и преподаватель",
    "Платформа Skilyapp на 6 мес",
    "Личный куратор 24/7",
    "Гибкое расписание — твои даты",
    "Записи навсегда",
  ];

  return (
    <div className="w-full max-w-[900px] mx-auto">
      {/* Info banner */}
      <div className="mb-8 text-center">
        <p className="text-sm text-zinc-500">
          Персональные форматы — меньше людей, больше внимания, быстрее результат.{" "}
          <span className="text-zinc-400">Запись через куратора — мы подберём удобное время.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Мини-группа (светлая карточка) ── */}
        <div className="rounded-2xl p-[1.5px] bg-gradient-to-b from-zinc-200 to-zinc-200/50 shadow-lg shadow-black/10">
          <div className="rounded-[14px] bg-white overflow-hidden flex flex-col h-full">

            {/* Top section */}
            <div className="p-7 pb-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-5">
                <Users className="w-3 h-3" />
                Мини-группа
              </div>

              <h3 className="text-2xl font-black text-zinc-900 tracking-tight mb-1">
                2–3 человека
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Как в группе, но с личным вниманием
              </p>

              {/* Price */}
              <div className="flex items-end gap-1 mb-1">
                <AnimatedPrice value={mgTotal} />
                <span className="text-zinc-400 text-base mb-1">/разово</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">За человека · полная оплата при бронировании</p>

              {/* CTA */}
              <a
                href="https://t.me/skilyapp_bot?start=buy_mini"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (typeof window !== "undefined" && (window as any).gtag) {
                    (window as any).gtag("event", "conversion", {
                      send_to: "AW-18034090184/LGu7CMTx0pMcEMjBqZdD",
                    });
                  }
                }}
                className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Записаться
              </a>
            </div>

            {/* Features */}
            <div className="px-7 pt-4 pb-1 border-t border-zinc-100">
              <ul className="space-y-2.5">
                {mgFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-600">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Addons — dynamic from DB */}
            <div className="px-7 pt-2 pb-6 mt-auto">
              {addons.map((a) => (
                <Addon
                  key={a.addon_key}
                  icon={a.addon_key === 'spanish' ? Globe : a.addon_key === 'documents' ? FileText : Zap}
                  label={a.label}
                  price={`€${a.price_group}`}
                  enabled={!!mgEnabled[a.addon_key]}
                  onChange={(v) => {
                    setMgEnabled((prev) => ({ ...prev, [a.addon_key]: v }));
                    Analytics.addonToggled(a.addon_key, v, "mini_group");
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Индивидуально (тёмная карточка) ── */}
        <div className="rounded-2xl p-[1.5px] bg-gradient-to-b from-white/15 to-white/5 shadow-2xl shadow-black/40">
          <div className="rounded-[14px] bg-zinc-900 overflow-hidden flex flex-col h-full">

            {/* Top section */}
            <div className="p-7 pb-5">
              {/* Badge */}
              <div className="flex items-center gap-2 mb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.07] border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                  <User className="w-3 h-3" />
                  Индивидуально
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold uppercase tracking-widest">
                  Макс. результат
                </div>
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight mb-1">
                Только ты
              </h3>
              <p className="text-sm text-zinc-400 mb-6">
                Полное внимание преподавателя — твой темп, твои даты
              </p>

              {/* Price */}
              <div className="flex items-end gap-1 mb-1">
                <AnimatedPrice value={indTotal} isDark />
                <span className="text-zinc-500 text-base mb-1">/разово</span>
              </div>
              <p className="text-xs text-zinc-600 mb-6">За человека · полная оплата при бронировании</p>

              {/* CTA */}
              <a
                href="https://t.me/skilyapp_bot?start=buy_individual"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (typeof window !== "undefined" && (window as any).gtag) {
                    (window as any).gtag("event", "conversion", {
                      send_to: "AW-18034090184/LGu7CMTx0pMcEMjBqZdD",
                    });
                  }
                }}
                className="w-full py-3.5 rounded-xl bg-white text-zinc-900 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-4 h-4" />
                Записаться
              </a>
            </div>

            {/* Features */}
            <div className="px-7 pt-4 pb-1 border-t border-white/[0.06]">
              <ul className="space-y-2.5">
                {indFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check isDark />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Addons — dynamic from DB */}
            <div className="px-7 pt-2 pb-6 mt-auto">
              {addons.map((a) => (
                <Addon
                  key={a.addon_key}
                  icon={a.addon_key === 'spanish' ? Globe : a.addon_key === 'documents' ? FileText : Zap}
                  label={a.label}
                  price={`€${a.price_individual}`}
                  enabled={!!indEnabled[a.addon_key]}
                  onChange={(v) => {
                    setIndEnabled((prev) => ({ ...prev, [a.addon_key]: v }));
                    Analytics.addonToggled(a.addon_key, v, "individual");
                  }}
                  isDark
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <div className="mt-6 flex items-start gap-2.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <Clock className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-600 leading-relaxed">
          Расписание согласуется индивидуально. Напишите нам — и мы подберём удобное время в течение 24 часов.
          Мини-группы формируются по мере набора участников.
        </p>
      </div>
    </div>
  );
}
