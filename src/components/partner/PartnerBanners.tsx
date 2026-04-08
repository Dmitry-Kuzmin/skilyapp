import { useState } from "react";
import {
  Copy, Check, Code2, Monitor, Smartphone, Layout,
  ChevronRight, Sliders, RefreshCw, ExternalLink, Sun, Moon,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BannerType {
  id: string;
  label: string;
  emoji: string;
  src: string;
  accent: string;
  description: string;
}

interface SizePreset {
  id: string;
  label: string;
  w: number;
  h: number;
  tag: string;
  icon: "desktop" | "mobile" | "square" | "vertical";
}

// ─── Data ────────────────────────────────────────────────────────────────────

const BANNER_TYPES: BannerType[] = [
  {
    id: "course",
    label: "Курс DGT",
    emoji: "🚗",
    src: "/banners/course-banner.html",
    accent: "indigo",
    description: "Ближайшие потоки курса в реальном времени",
  },
  {
    id: "platform",
    label: "Платформа",
    emoji: "⚡",
    src: "/banners/platform-banner.html",
    accent: "emerald",
    description: "Живой счётчик студентов на платформе",
  },
];

const SIZE_PRESETS: SizePreset[] = [
  { id: "wide",         label: "Стандартный",        w: 560,  h: 170, tag: "560×170",  icon: "desktop" },
  { id: "leaderboard",  label: "Лидерборд",          w: 728,  h: 90,  tag: "728×90",   icon: "desktop" },
  { id: "banner600",    label: "Широкий компакт",    w: 600,  h: 120, tag: "600×120",  icon: "desktop" },
  { id: "rectangle",    label: "Прямоугольник",      w: 300,  h: 250, tag: "300×250",  icon: "square"  },
  { id: "mobile-wide",  label: "Мобильный",          w: 320,  h: 100, tag: "320×100",  icon: "mobile"  },
  { id: "custom",       label: "Свой размер",        w: 400,  h: 200, tag: "Custom",   icon: "desktop" },
];

const PREVIEW_BG = {
  dark:  "bg-[#0f172a]",
  light: "bg-[#f8fafc]",
  gray:  "bg-[#e2e8f0]",
};

const RADIUS_OPTIONS = [0, 8, 12, 16, 20, 24];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function PresetIcon({ type }: { type: SizePreset["icon"] }) {
  if (type === "mobile")   return <Smartphone className="w-3.5 h-3.5" />;
  if (type === "vertical") return <Layout    className="w-3.5 h-3.5 rotate-90" />;
  if (type === "square")   return <Layout    className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

/**
 * Aspect-ratio box embed — the industry-standard approach (same as YouTube, AdSense responsive).
 * The outer div fills 100% of the partner's container width (up to max-width),
 * and padding-bottom maintains the correct aspect ratio so the height follows automatically.
 * The iframe is absolutely positioned to fill the div.
 * This makes the banner fully responsive to any container width.
 */
function buildEmbedCode(
  src: string, partnerCode: string,
  w: number, h: number, radius: number,
  bannerLabel: string,
) {
  const pct = ((h / w) * 100).toFixed(4); // aspect ratio as %
  const r = radius > 0 ? `border-radius:${radius}px;` : "";
  return `<!-- Skily Banner — ${bannerLabel} -->
<div style="position:relative;width:100%;max-width:${w}px;padding-bottom:${pct}%;${r}overflow:hidden;">
  <script>var SKILY_REF="${partnerCode}";<\/script>
  <iframe
    src="https://skilyapp.com${src}"
    frameborder="0" scrolling="no"
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
    loading="lazy"
    title="Skily — ${bannerLabel}"
  ></iframe>
</div>`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { partnerCode: string }

export function PartnerBanners({ partnerCode }: Props) {
  const [activeBanner, setActiveBanner] = useState<BannerType>(BANNER_TYPES[0]);
  const [preset,       setPreset]       = useState<SizePreset>(SIZE_PRESETS[1]); // "wide" default
  const [customW,      setCustomW]      = useState(400);
  const [customH,      setCustomH]      = useState(200);
  const [radius,       setRadius]       = useState(16);
  const [bg,           setBg]           = useState<keyof typeof PREVIEW_BG>("dark");
  const [copied,       setCopied]       = useState(false);
  const [iframeKey,    setIframeKey]    = useState(0);

  const width  = preset.id === "custom" ? customW : preset.w;
  const height = preset.id === "custom" ? customH : preset.h;

  const embedCode = buildEmbedCode(
    activeBanner.src, partnerCode, width, height, radius, activeBanner.label
  );

  function handleCopy() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      toast.success("Код скопирован в буфер обмена");
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handleRefresh() {
    setIframeKey(k => k + 1);
  }

  const accentMap: Record<string, string> = {
    indigo:  "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Конструктор баннеров</h3>
          <p className="text-zinc-500 text-xs mt-0.5">Настрой размер и вставь готовый код на свой сайт</p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 font-mono">
          ref: {partnerCode}
        </div>
      </div>

      {/* Main grid: controls left, preview right */}
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">

        {/* ── LEFT: Controls ─────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Banner type */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layout className="w-3 h-3" /> Тип баннера
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BANNER_TYPES.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setActiveBanner(b); setIframeKey(k => k + 1); }}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                    activeBanner.id === b.id
                      ? `border-white/20 bg-white/[0.07] ${accentMap[b.accent]}`
                      : "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="text-xl">{b.emoji}</span>
                  <span className="text-xs font-semibold">{b.label}</span>
                  <span className="text-[10px] opacity-60 leading-tight">{b.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size presets */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders className="w-3 h-3" /> Размер
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SIZE_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                    preset.id === p.id
                      ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                      : "border-zinc-800 bg-zinc-800/30 text-zinc-400 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  <PresetIcon type={p.icon} />
                  <div className="text-left min-w-0">
                    <div className="font-medium truncate">{p.label}</div>
                    <div className="text-[10px] opacity-50 font-mono">{p.tag}</div>
                  </div>
                  {preset.id === p.id && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>

            {/* Custom size inputs */}
            {preset.id === "custom" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="space-y-1">
                  <span className="text-[10px] text-zinc-500">Ширина (px)</span>
                  <input
                    type="number"
                    value={customW}
                    min={60} max={2000}
                    onChange={e => setCustomW(Math.max(60, Math.min(2000, +e.target.value)))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-zinc-500">Высота (px)</span>
                  <input
                    type="number"
                    value={customH}
                    min={30} max={2000}
                    onChange={e => setCustomH(Math.max(30, Math.min(2000, +e.target.value)))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Corner radius */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                Скругление углов
              </p>
              <span className="text-xs text-zinc-400 font-mono">{radius}px</span>
            </div>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`flex-1 h-8 text-xs font-mono transition-all border ${
                    radius === r
                      ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                      : "border-zinc-800 bg-zinc-800/30 text-zinc-500 hover:text-white hover:border-zinc-700"
                  }`}
                  style={{ borderRadius: Math.min(r, 8) }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Preview background */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
              Фон превью
            </p>
            <div className="flex gap-2">
              {(Object.keys(PREVIEW_BG) as (keyof typeof PREVIEW_BG)[]).map(key => (
                <button
                  key={key}
                  onClick={() => setBg(key)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                    bg === key
                      ? "border-white/20 text-white bg-white/[0.07]"
                      : "border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {key === "dark"  && <Moon className="w-3 h-3 inline mr-1" />}
                  {key === "light" && <Sun  className="w-3 h-3 inline mr-1" />}
                  {key === "gray"  && <Layout className="w-3 h-3 inline mr-1" />}
                  {key === "dark" ? "Тёмный" : key === "light" ? "Светлый" : "Серый"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Preview + code ──────────────────────────────── */}
        <div className="space-y-3 min-w-0">

          {/* Preview window */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-xs text-zinc-500 font-mono ml-1">
                  {activeBanner.label} — {width}×{height}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeBanner.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:text-white text-[11px] transition-all"
                >
                  <ExternalLink className="w-3 h-3" /> Открыть
                </a>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:text-white text-[11px] transition-all"
                >
                  <RefreshCw className="w-3 h-3" /> Обновить
                </button>
              </div>
            </div>

            {/* Preview area — uses the exact same aspect-ratio box as the real embed */}
            <div className={`${PREVIEW_BG[bg]} p-6 transition-colors`}>
              <div style={{ maxWidth: width, margin: "0 auto" }}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    paddingBottom: `${((height / width) * 100).toFixed(4)}%`,
                    borderRadius: radius,
                    overflow: "hidden",
                  }}
                >
                  <iframe
                    key={iframeKey}
                    src={activeBanner.src}
                    frameBorder={0}
                    scrolling="no"
                    style={{
                      position: "absolute",
                      top: 0, left: 0,
                      width: "100%", height: "100%",
                      border: "none",
                    }}
                    title={activeBanner.label}
                  />
                </div>
              </div>
            </div>

            {/* Size indicator */}
            <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="font-mono">{width} × {height} px</span>
                <span>•</span>
                <span>Скругление {radius}px</span>
                <span>•</span>
                <span>{width > height ? "Горизонтальный" : width < height ? "Вертикальный" : "Квадратный"}</span>
              </div>
              <span className="text-[11px] text-zinc-600 font-mono">
                {((height / width) * 100).toFixed(1)}% ratio
              </span>
            </div>
          </div>

          {/* Generated code */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Code2 className="w-3.5 h-3.5" />
                <span>HTML-код для вставки на сайт</span>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  copied
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                    : "bg-indigo-600 text-white border-transparent hover:bg-indigo-500"
                }`}
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5" /> Скопировано!</>
                  : <><Copy className="w-3.5 h-3.5" /> Скопировать код</>
                }
              </button>
            </div>
            <pre className="px-5 py-4 text-[11px] text-zinc-400 font-mono overflow-x-auto leading-relaxed whitespace-pre">
              {embedCode}
            </pre>
          </div>

          {/* Tip */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3.5 flex gap-3">
            <span className="text-base flex-shrink-0">💡</span>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Вставь код в любое место HTML-страницы. Реферальный код{" "}
              <code className="text-indigo-400 font-mono">{partnerCode}</code>{" "}
              уже вшит — каждый клик и покупка будут привязаны к тебе автоматически.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
