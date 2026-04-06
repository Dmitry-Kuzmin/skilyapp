import { useState } from "react";
import { Copy, Check, ExternalLink, Code2, Eye } from "lucide-react";
import { toast } from "sonner";

interface BannerConfig {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  previewUrl: string;
  color: string;
  badgeColor: string;
  emoji: string;
  getEmbedCode: (partnerCode: string) => string;
}

const BANNERS: BannerConfig[] = [
  {
    id: "course",
    title: "Баннер курса",
    subtitle: "Автоматические даты потоков",
    description: "Подтягивает ближайшие открытые потоки из Skily в реальном времени. Идеально для анонсов.",
    previewUrl: "/banners/course-banner.html",
    color: "from-indigo-500/20 to-violet-500/10",
    badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
    emoji: "🚗",
    getEmbedCode: (code) =>
      `<!-- Skily Course Banner -->
<div style="max-width:560px">
  <script>var SKILY_REF = "${code}";</script>
  <iframe
    src="https://skilyapp.com/banners/course-banner.html"
    width="560"
    height="170"
    frameborder="0"
    scrolling="no"
    style="border-radius:20px;overflow:hidden;display:block;width:100%;height:170px"
    loading="lazy"
    title="Skily — Курс подготовки к DGT"
  ></iframe>
</div>`,
  },
  {
    id: "platform",
    title: "Баннер платформы",
    subtitle: "Живой счётчик студентов",
    description: "Показывает актуальное число студентов на платформе. Универсальный формат для любого контента.",
    previewUrl: "/banners/platform-banner.html",
    color: "from-emerald-500/20 to-teal-500/10",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    emoji: "⚡",
    getEmbedCode: (code) =>
      `<!-- Skily Platform Banner -->
<div style="max-width:560px">
  <script>var SKILY_REF = "${code}";</script>
  <iframe
    src="https://skilyapp.com/banners/platform-banner.html"
    width="560"
    height="155"
    frameborder="0"
    scrolling="no"
    style="border-radius:20px;overflow:hidden;display:block;width:100%;height:155px"
    loading="lazy"
    title="Skily — Тренажёр DGT"
  ></iframe>
</div>`,
  },
];

interface Props {
  partnerCode: string;
}

export function PartnerBanners({ partnerCode }: Props) {
  const [copied, setCopied]     = useState<string | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);

  function handleCopy(bannerId: string, code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(bannerId);
      toast.success("Код скопирован в буфер обмена");
      setTimeout(() => setCopied(null), 2500);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Рекламные баннеры</h3>
          <p className="text-zinc-500 text-xs mt-0.5">
            Вставь HTML-код на свой сайт — баннер обновляется автоматически
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 font-mono">
          ref: {partnerCode}
        </div>
      </div>

      {BANNERS.map((banner) => {
        const embedCode = banner.getEmbedCode(partnerCode);
        const isCopied = copied === banner.id;
        const isPreviewing = preview === banner.id;

        return (
          <div
            key={banner.id}
            className={`rounded-xl border border-zinc-800 bg-gradient-to-br ${banner.color} overflow-hidden`}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl leading-none mt-0.5">{banner.emoji}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{banner.title}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${banner.badgeColor}`}>
                      {banner.subtitle}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">{banner.description}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setPreview(isPreviewing ? null : banner.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    isPreviewing
                      ? "bg-zinc-700 border-zinc-600 text-white"
                      : "bg-zinc-800/70 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  {isPreviewing ? "Скрыть" : "Превью"}
                </button>
                <a
                  href={banner.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-zinc-800/70 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-medium transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Открыть
                </a>
              </div>
            </div>

            {/* Preview iframe */}
            {isPreviewing && (
              <div className="px-5 pb-4">
                <div className="rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-950">
                  <iframe
                    src={banner.previewUrl}
                    className="w-full"
                    style={{ height: 170, border: "none", display: "block" }}
                    title={banner.title}
                  />
                </div>
                <p className="text-zinc-600 text-[10px] mt-2 text-center">
                  Реальное отображение — даты и счётчик загружаются из базы
                </p>
              </div>
            )}

            {/* Code block */}
            <div className="mx-5 mb-5 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Code2 className="w-3.5 h-3.5" />
                  HTML-код для вставки
                </div>
                <button
                  onClick={() => handleCopy(banner.id, embedCode)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    isCopied
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-zinc-700"
                  }`}
                >
                  {isCopied ? (
                    <><Check className="w-3 h-3" />Скопировано</>
                  ) : (
                    <><Copy className="w-3 h-3" />Скопировать</>
                  )}
                </button>
              </div>
              <pre className="px-4 py-3.5 text-[11px] text-zinc-400 font-mono overflow-x-auto leading-relaxed">
                {embedCode}
              </pre>
            </div>
          </div>
        );
      })}

      {/* Note */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
        <p className="text-zinc-500 text-xs leading-relaxed">
          <span className="text-zinc-300 font-medium">Как это работает:</span>{" "}
          Каждый баннер содержит твой реферальный код <code className="text-indigo-400 font-mono">{partnerCode}</code>.
          Когда пользователь кликает и покупает — комиссия начисляется тебе автоматически.
          Баннер работает на любом сайте, блоге или лендинге.
        </p>
      </div>
    </div>
  );
}
