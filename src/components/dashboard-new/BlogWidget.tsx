import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const LATEST_ARTICLE = {
  slug: "ekzamen-dgt-2026",
  title: "Новый экзамен DGT 2026",
  titleEs: "Nuevo examen DGT 2026",
  titleEn: "New DGT exam 2026",
  description: "Видео-вопросы, новые знаки, интервью с автошколой — всё о реформе.",
  descriptionEs: "Preguntas en vídeo, nuevas señales — todo sobre la reforma.",
  descriptionEn: "Video questions, new signs — everything about the reform.",
  readTime: 18,
  category: "DGT 2026",
};

export function BlogWidget() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const title = language === "es" ? LATEST_ARTICLE.titleEs : language === "en" ? LATEST_ARTICLE.titleEn : LATEST_ARTICLE.title;
  const description = language === "es" ? LATEST_ARTICLE.descriptionEs : language === "en" ? LATEST_ARTICLE.descriptionEn : LATEST_ARTICLE.description;

  return (
    <div
      onClick={() => navigate(`/article/${LATEST_ARTICLE.slug}`)}
      className="group h-full min-h-[140px] relative rounded-2xl border border-border/60 bg-gradient-to-br from-blue-500/8 via-indigo-500/5 to-transparent overflow-hidden cursor-pointer hover:border-blue-500/30 hover:shadow-lg transition-all duration-300"
    >
      {/* Accent glow */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 p-4 flex flex-col h-full gap-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/80">
              {language === "es" ? "Blog" : language === "en" ? "Blog" : "Блог"}
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
            {LATEST_ARTICLE.category}
          </span>
        </div>

        {/* Article title */}
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-blue-500 transition-colors">
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-[11px]">{LATEST_ARTICLE.readTime} мин</span>
          </div>
          <div className="flex items-center gap-1 text-blue-500 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            {language === "es" ? "Leer" : language === "en" ? "Read" : "Читать"}
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
