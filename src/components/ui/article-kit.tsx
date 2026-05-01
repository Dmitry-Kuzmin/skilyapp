/**
 * Article UI Kit — Skilyapp
 *
 * Все компоненты для оформления статей. Импортируй нужные поштучно:
 *   import { ArticleAccordion, ArticleCallout, ArticleQuote } from "@/components/ui/article-kit"
 *
 * Адаптировано из sdadim-eu (без ArticleBanner — зависит от course_streams).
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  Lightbulb,
  Zap,
  CheckCircle2,
  XCircle,
  Quote,
  Play,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ACCORDION (аккордеон / спойлер)
// ─────────────────────────────────────────────────────────────────────────────

interface AccordionItem {
  question: string;
  answer: string;
}

interface ArticleAccordionProps {
  items: AccordionItem[];
  title?: string;
}

export function ArticleAccordion({ items, title }: ArticleAccordionProps) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="my-8 not-prose">
      {title && (
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">{title}</p>
      )}
      <div className="divide-y divide-white/5 rounded-2xl border border-white/5 overflow-hidden bg-zinc-900/40">
        {items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-sm font-semibold text-zinc-100 leading-snug">{item.question}</span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-300",
                  open === i && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                open === i ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <p className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{item.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CALLOUT (врезка / выделение)
// ─────────────────────────────────────────────────────────────────────────────

const calloutConfig = {
  info:    { icon: Info,         bg: "bg-blue-500/8",   border: "border-blue-500/20",   text: "text-blue-300",   label: "Примечание" },
  tip:     { icon: Lightbulb,    bg: "bg-emerald-500/8",border: "border-emerald-500/20",text: "text-emerald-300",label: "Совет" },
  warning: { icon: AlertCircle,  bg: "bg-amber-500/8",  border: "border-amber-500/20",  text: "text-amber-300",  label: "Важно" },
  danger:  { icon: XCircle,      bg: "bg-red-500/8",    border: "border-red-500/20",    text: "text-red-300",    label: "Внимание" },
  success: { icon: CheckCircle2, bg: "bg-emerald-500/8",border: "border-emerald-500/20",text: "text-emerald-300",label: "Хорошо знать" },
};

interface ArticleCalloutProps {
  type?: keyof typeof calloutConfig;
  title?: string;
  children: React.ReactNode;
}

export function ArticleCallout({ type = "info", title, children }: ArticleCalloutProps) {
  const { icon: Icon, bg, border, text, label } = calloutConfig[type];
  return (
    <div className={cn("my-8 not-prose rounded-2xl border p-5", bg, border)}>
      <div className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2", text)}>
        <Icon className="w-3.5 h-3.5" />
        {title ?? label}
      </div>
      <div className="text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. QUOTE (цитата)
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleQuoteProps {
  text: string;
  author?: string;
  role?: string;
}

export function ArticleQuote({ text, author, role }: ArticleQuoteProps) {
  return (
    <blockquote className="my-8 not-prose relative">
      <div className="pl-5 border-l-2 border-blue-500">
        <Quote className="w-6 h-6 text-blue-500/30 absolute right-0 top-0" />
        <p className="text-lg md:text-xl font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed italic">{text}</p>
        {author && (
          <footer className="mt-3 flex items-center gap-2">
            <div className="w-5 h-[1px] bg-zinc-400 dark:bg-zinc-600" />
            <span className="text-sm text-zinc-500">
              {author}
              {role && <span className="text-zinc-400 dark:text-zinc-600"> · {role}</span>}
            </span>
          </footer>
        )}
      </div>
    </blockquote>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TABLE (красивая таблица)
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleTableProps {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  caption?: string;
}

export function ArticleTable({ headers, rows, caption }: ArticleTableProps) {
  return (
    <div className="my-8 not-prose overflow-x-auto rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.03]">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "px-5 py-3.5 text-zinc-700 dark:text-zinc-300 leading-snug align-top",
                    ci === 0 && "font-medium text-zinc-900 dark:text-white"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && (
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-600 py-3 border-t border-zinc-200 dark:border-white/5">{caption}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LIST (стильный список с иконками)
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleListProps {
  items: (string | React.ReactNode)[];
  type?: "check" | "cross" | "arrow" | "number";
  title?: string;
}

const listIcons = {
  check: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
  cross: <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
  arrow: <ArrowRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
};

export function ArticleList({ items, type = "check", title }: ArticleListProps) {
  return (
    <div className="my-6 not-prose">
      {title && <p className="text-sm font-bold text-zinc-700 dark:text-zinc-400 mb-3">{title}</p>}
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px] text-zinc-700 dark:text-zinc-300 leading-snug">
            {type === "number" ? (
              <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 dark:text-blue-400 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
            ) : (
              listIcons[type]
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CARD GRID (карточки)
// ─────────────────────────────────────────────────────────────────────────────

interface CardItem {
  icon?: string;
  title: string;
  description: string;
  badge?: string;
}

interface ArticleCardGridProps {
  cards: CardItem[];
  cols?: 2 | 3;
}

export function ArticleCardGrid({ cards, cols = 2 }: ArticleCardGridProps) {
  return (
    <div
      className={cn(
        "my-8 not-prose grid gap-4",
        cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
      )}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          className="rounded-2xl bg-zinc-50 dark:bg-[#0c1523] border border-zinc-200 dark:border-transparent p-5 hover:bg-zinc-100 dark:hover:bg-[#0f1a2b] transition-all"
        >
          {card.icon && <div className="text-2xl mb-3">{card.icon}</div>}
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-bold text-zinc-900 dark:text-white text-sm leading-snug">{card.title}</p>
            {card.badge && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full shrink-0">
                {card.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{card.description}</p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DIVIDER (разделитель)
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleDividerProps {
  label?: string;
}

export function ArticleDivider({ label }: ArticleDividerProps) {
  if (!label) {
    return <div className="my-10 not-prose border-t border-zinc-200 dark:border-white/8" />;
  }
  return (
    <div className="my-10 not-prose flex items-center gap-4">
      <div className="flex-1 border-t border-zinc-200 dark:border-white/8" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-600">{label}</span>
      <div className="flex-1 border-t border-zinc-200 dark:border-white/8" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. STAT ROW (строка статистики)
// ─────────────────────────────────────────────────────────────────────────────

interface Stat {
  value: string;
  label: string;
  note?: string;
}

interface ArticleStatsProps {
  stats: Stat[];
}

export function ArticleStats({ stats }: ArticleStatsProps) {
  return (
    <div className="my-8 not-prose grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="rounded-2xl bg-zinc-50 dark:bg-[#0c1523] border border-zinc-200 dark:border-transparent p-5 text-center">
          <div className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight mb-1">{stat.value}</div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{stat.label}</div>
          {stat.note && <div className="text-[11px] text-zinc-500 dark:text-zinc-600 mt-1">{stat.note}</div>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. LINK CARD (карточка-ссылка)
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleLinkCardProps {
  href: string;
  title: string;
  description?: string;
  external?: boolean;
}

export function ArticleLinkCard({ href, title, description, external }: ArticleLinkCardProps) {
  const isExternal = external ?? href.startsWith("http");
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="my-6 not-prose flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#0c1523] border border-zinc-200 dark:border-transparent hover:bg-zinc-100 dark:hover:bg-[#0f1a2b] transition-all group no-underline"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{title}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      {isExternal ? (
        <ExternalLink className="w-4 h-4 text-zinc-500 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-400 shrink-0 transition-colors" />
      ) : (
        <ChevronRight className="w-4 h-4 text-zinc-500 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-400 shrink-0 transition-colors" />
      )}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. VIDEO EMBED (YouTube / iframe)
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleVideoProps {
  youtubeId?: string;
  src?: string;
  caption?: string;
}

export function ArticleVideo({ youtubeId, src, caption }: ArticleVideoProps) {
  const [playing, setPlaying] = useState(false);
  const url = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`
    : src;

  if (!url) return null;

  return (
    <figure className="my-8 not-prose">
      <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/8 bg-zinc-900" style={{ paddingBottom: "56.25%" }}>
        {youtubeId && !playing ? (
          <div className="absolute inset-0">
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
              alt="Video preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <button
                onClick={() => setPlaying(true)}
                className="w-16 h-16 rounded-full bg-white/90 hover:bg-white text-zinc-900 flex items-center justify-center transition-all hover:scale-110 shadow-2xl"
                aria-label="Воспроизвести видео"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>
            </div>
          </div>
        ) : (
          <iframe
            src={url}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            title={caption ?? "Video"}
          />
        )}
      </div>
      {caption && (
        <figcaption className="text-center text-xs text-zinc-500 dark:text-zinc-600 mt-3">{caption}</figcaption>
      )}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. COMPARISON TABLE (сравнительная таблица с ✓ ✗)
// ─────────────────────────────────────────────────────────────────────────────

interface ComparisonRow {
  feature: string;
  a: boolean | string;
  b: boolean | string;
}

interface ArticleComparisonProps {
  headerA: string;
  headerB: string;
  rows: ComparisonRow[];
}

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
    ) : (
      <XCircle className="w-5 h-5 text-red-400/70 mx-auto" />
    );
  }
  return <span className="text-zinc-700 dark:text-zinc-300 text-sm">{value}</span>;
}

export function ArticleComparison({ headerA, headerB, rows }: ArticleComparisonProps) {
  return (
    <div className="my-8 not-prose overflow-x-auto rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40">
      <table className="w-full min-w-[400px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-white/5">
            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-600 w-1/2">
              Параметр
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
              {headerA}
            </th>
            <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/5">
              {headerB}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-white/[0.015] transition-colors">
              <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-400 font-medium">{row.feature}</td>
              <td className="px-5 py-3.5 text-center">
                <ComparisonCell value={row.a} />
              </td>
              <td className="px-5 py-3.5 text-center bg-blue-500/[0.03]">
                <ComparisonCell value={row.b} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. CTA BANNER (баннер с призывом — для Skilyapp)
// ─────────────────────────────────────────────────────────────────────────────

interface ArticleCTAProps {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function ArticleCTA({
  title = "Готовьтесь к DGT 2026 на Skilyapp",
  description = "ИИ-наставник 24/7, симуляция нового экзамена с видео-вопросами, поддержка русского, испанского и английского.",
  primaryHref = "https://skilyapp.com",
  primaryLabel = "Начать бесплатно",
  secondaryHref = "https://t.me/skilyapp_bot",
  secondaryLabel = "Открыть в Telegram",
}: ArticleCTAProps) {
  return (
    <div className="my-10 not-prose relative rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 p-7 md:p-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-blue-300 text-xs font-bold mb-5">
          🚗 Skilyapp · DGT 2026
        </div>
        <h3 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white leading-tight mb-2">
          {title}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-5 max-w-md">
          {description}
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={primaryHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] no-underline"
          >
            {primaryLabel} <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={secondaryHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl border border-zinc-300 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-semibold text-sm transition-colors no-underline"
          >
            {secondaryLabel}
          </a>
        </div>
        <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-white/6 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs text-zinc-500">
            9 из 10 наших студентов сдают теорию DGT с первой попытки
          </span>
        </div>
      </div>
    </div>
  );
}
