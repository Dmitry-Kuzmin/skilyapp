/**
 * Light-mode lesson UI kit — adapted from landing/article-kit for lesson cards.
 * Components: Callout, Table, List, CardGrid, Stats
 */

import { AlertCircle, Info, Lightbulb, XCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Callout ───────────────────────────────────────────────────────────────────

const calloutConfig = {
  info:    { icon: Info,         bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    label: "Примечание" },
  tip:     { icon: Lightbulb,    bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Совет" },
  warning: { icon: AlertCircle,  bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   label: "Важно" },
  danger:  { icon: XCircle,      bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     label: "Внимание" },
};

export type CalloutVariant = keyof typeof calloutConfig;

interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  text: string;
}

export function LessonCallout({ variant = "info", title, text }: CalloutProps) {
  const { icon: Icon, bg, border, text: textColor, label } = calloutConfig[variant];
  return (
    <div className={cn("rounded-2xl border px-4 py-3.5 mx-5 my-2", bg, border)}>
      <div className={cn("flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5", textColor)}>
        <Icon className="w-3.5 h-3.5" />
        {title ?? label}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

interface TableProps {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export function LessonTable({ headers, rows, caption }: TableProps) {
  return (
    <div className="mx-5 my-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[320px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={cn("px-4 py-3 text-gray-700 leading-snug align-top", ci === 0 && "font-semibold text-gray-900")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && (
        <p className="text-center text-[11px] text-gray-400 py-2.5 border-t border-gray-100">{caption}</p>
      )}
    </div>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────

const listIcons = {
  check:  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
  cross:  <XCircle      className="w-4 h-4 text-red-400     shrink-0 mt-0.5" />,
  arrow:  <ArrowRight   className="w-4 h-4 text-teal-500    shrink-0 mt-0.5" />,
};

export type ListStyle = "check" | "cross" | "arrow" | "number";

interface ListProps {
  style?: ListStyle;
  title?: string;
  items: string[];
}

export function LessonList({ style = "check", title, items }: ListProps) {
  return (
    <div className="mx-5 my-2">
      {title && <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">{title}</p>}
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-snug">
            {style === "number" ? (
              <span className="w-5 h-5 rounded-full bg-teal-500/15 text-teal-600 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
            ) : listIcons[style]}
            <span className="break-words min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Card Grid ─────────────────────────────────────────────────────────────────

interface CardItem {
  icon?: string;
  title: string;
  description: string;
  badge?: string;
}

interface CardGridProps {
  cards: CardItem[];
  cols?: 2 | 3;
}

export function LessonCardGrid({ cards, cols = 2 }: CardGridProps) {
  return (
    <div className={cn("mx-5 my-2 grid gap-2.5", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {cards.map((card, i) => (
        <div key={i} className="rounded-2xl bg-gray-50 border border-gray-200 p-3.5">
          {card.icon && <div className="text-xl mb-2">{card.icon}</div>}
          <div className="flex items-start justify-between gap-1 mb-1">
            <p className="font-bold text-gray-900 text-xs leading-snug">{card.title}</p>
            {card.badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600 bg-teal-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                {card.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-snug">{card.description}</p>
        </div>
      ))}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

interface Stat {
  value: string;
  label: string;
  note?: string;
}

interface StatsProps {
  stats: Stat[];
}

export function LessonStats({ stats }: StatsProps) {
  return (
    <div className={cn("mx-5 my-2 grid gap-2.5", stats.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
      {stats.map((stat, i) => (
        <div key={i} className="rounded-2xl bg-teal-50 border border-teal-100 p-3.5 text-center">
          <div className="text-2xl font-black text-teal-700 tracking-tight mb-0.5">{stat.value}</div>
          <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">{stat.label}</div>
          {stat.note && <div className="text-[10px] text-gray-400 mt-0.5">{stat.note}</div>}
        </div>
      ))}
    </div>
  );
}
