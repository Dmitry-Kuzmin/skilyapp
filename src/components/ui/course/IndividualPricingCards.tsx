"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { MessageCircle, Users, User, Zap, FileText, Globe, CheckCircle2, Clock } from "lucide-react";

// ─── Animated price counter ───────────────────────────────────────────────────

function AnimatedPrice({ value, isDark }: { value: number; isDark?: boolean }) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (v) => `€${Math.round(v)}`);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.span className={`text-4xl font-black tracking-tight tabular-nums ${isDark ? "text-white" : "text-zinc-900"}`}>
      {rounded}
    </motion.span>
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

// ─── Main component ───────────────────────────────────────────────────────────

export function IndividualPricingCards({ onBooking }: { onBooking?: () => void }) {
  // Mini-group addons
  const [mgSpanish, setMgSpanish] = useState(false);
  const [mgDocs, setMgDocs] = useState(false);
  const [mgUrgent, setMgUrgent] = useState(false);

  // Individual addons
  const [indSpanish, setIndSpanish] = useState(false);
  const [indDocs, setIndDocs] = useState(false);
  const [indUrgent, setIndUrgent] = useState(false);

  const mgBase = 499;
  const indBase = 799;

  const mgTotal = mgBase + (mgSpanish ? 60 : 0) + (mgDocs ? 50 : 0) + (mgUrgent ? 40 : 0);
  const indTotal = indBase + (indSpanish ? 80 : 0) + (indDocs ? 50 : 0) + (indUrgent ? 60 : 0);

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
              <button
                onClick={onBooking}
                className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Записаться
              </button>
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

            {/* Addons */}
            <div className="px-7 pt-2 pb-6 mt-auto">
              <Addon
                icon={Globe}
                label="Испанский для водителей"
                price="€60"
                enabled={mgSpanish}
                onChange={setMgSpanish}
              />
              <Addon
                icon={FileText}
                label="Помощь с документами"
                price="€50"
                enabled={mgDocs}
                onChange={setMgDocs}
              />
              <Addon
                icon={Zap}
                label="Дополнительная сессия"
                price="€40"
                enabled={mgUrgent}
                onChange={setMgUrgent}
              />
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
                <motion.span
                  key={indTotal}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-black text-white tracking-tight"
                >
                  €{indTotal}
                </motion.span>
                <span className="text-zinc-500 text-base mb-1">/разово</span>
              </div>
              <p className="text-xs text-zinc-600 mb-6">Полная оплата при бронировании</p>

              {/* CTA */}
              <button
                onClick={onBooking}
                className="w-full py-3.5 rounded-xl bg-white text-zinc-900 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-4 h-4" />
                Записаться
              </button>
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

            {/* Addons */}
            <div className="px-7 pt-2 pb-6 mt-auto">
              <Addon
                icon={Globe}
                label="Испанский для водителей"
                price="€80"
                enabled={indSpanish}
                onChange={setIndSpanish}
                isDark
              />
              <Addon
                icon={FileText}
                label="Помощь с документами"
                price="€50"
                enabled={indDocs}
                onChange={setIndDocs}
                isDark
              />
              <Addon
                icon={Zap}
                label="Дополнительная сессия"
                price="€60"
                enabled={indUrgent}
                onChange={setIndUrgent}
                isDark
              />
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
