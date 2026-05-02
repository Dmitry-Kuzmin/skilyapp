import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { articles, getLocalizedArticle } from "@/pages/Article";

export function BlogWidget() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const latestArticle = getLocalizedArticle(articles["ekzamen-dgt-2026"], language);

  if (!latestArticle) return null;

  return (
    <div
      onClick={() => navigate(`/article/${latestArticle.slug}`)}
      className={`group relative rounded-3xl xl:rounded-[2rem] p-4 md:p-5 overflow-hidden cursor-pointer border transition-all duration-300 shadow-lg ${
        isDark
          ? "bg-slate-800/60 border-slate-700/60 hover:border-blue-500/30"
          : "bg-white/95 border-slate-200/80 hover:border-blue-400/40 shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
      }`}
    >
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/8 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isDark ? "bg-blue-500/15 border border-blue-500/20" : "bg-blue-50 border border-blue-200/60"}`}>
              <BookOpen className={`w-3.5 h-3.5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {t("blogPage.title")}
            </span>
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isDark ? "text-blue-400 bg-blue-500/10" : "text-blue-600 bg-blue-50 border border-blue-200/60"}`}>
            {latestArticle.category}
          </span>
        </div>

        {/* Article title + desc */}
        <div>
          <p className={`text-sm font-bold leading-snug line-clamp-2 transition-colors ${isDark ? "text-white group-hover:text-blue-400" : "text-slate-900 group-hover:text-blue-600"}`}>
            {latestArticle.title}
          </p>
          <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {latestArticle.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-0.5">
          <div className={`flex items-center gap-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            <Clock className="w-3 h-3" />
            <span className="text-[11px]">{t("article.meta.readTime", { minutes: latestArticle.readTime })}</span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "text-blue-400" : "text-blue-600"}`}>
            {t("blogPage.read")}
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
