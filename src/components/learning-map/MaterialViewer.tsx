import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Languages,
  Layers3,
  Lightbulb,
  Loader2,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Material {
  id: string;
  subtopic_id: string;
  title_ru: string;
  title_es: string;
  title_en: string;
  content_ru: string;
  content_es: string;
  content_en: string;
  source_pdf?: string;
  images?: string[];
}

interface MaterialViewerProps {
  material: Material;
  language?: "ru" | "es" | "en"; // Опциональный проп для переопределения языка
  onComplete?: () => void;
  isCompleted?: boolean;
  className?: string;
  hideHeader?: boolean;
  hideIllustrations?: boolean;
  inlineTermTranslations?: Record<string, string>;
}

type InsightTone = "info" | "tip" | "warning";

interface MaterialSection {
  id: string;
  title: string;
}

interface MaterialInsight {
  title: string;
  text: string;
  tone: InsightTone;
}

interface MaterialPresentation {
  html: string;
  sections: MaterialSection[];
  insights: MaterialInsight[];
  readTime: number;
  questionCount: number;
  noteCount: number;
  tableCount: number;
}

const slugifyHeading = (value: string, index: number) => {
  const normalized = value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, "")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized ? `material-section-${normalized}-${index}` : `material-section-${index}`;
};

const buildMaterialPresentation = (content: string): MaterialPresentation | null => {
  if (!content || !(content.includes("<") || content.includes("&lt;")) || typeof DOMParser === "undefined") {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");
  const body = doc.body;

  const sections = Array.from(
    body.querySelectorAll(".section-title, h2, h3")
  )
    .map((node, index) => {
      const title = node.textContent?.trim() ?? "";
      if (!title) return null;

      const id = node.id || slugifyHeading(title, index);
      node.id = id;
      node.classList.add("scroll-mt-28");

      return { id, title };
    })
    .filter((section): section is MaterialSection => Boolean(section))
    .filter((section, index, arr) => arr.findIndex((item) => item.title === section.title) === index);

  const insightNodes = [
    ...Array.from(body.querySelectorAll(".info-box")).map((node) => ({ node, tone: "info" as const })),
    ...Array.from(body.querySelectorAll(".tip-box")).map((node) => ({ node, tone: "tip" as const })),
    ...Array.from(body.querySelectorAll(".warning-box")).map((node) => ({ node, tone: "warning" as const })),
  ];

  const insights = insightNodes
    .map(({ node, tone }, index) => {
      const title = node.querySelector("strong")?.textContent?.replace(":", "").trim();
      const text = (node.textContent ?? "")
        .replace(/\s+/g, " ")
        .replace(title ?? "", "")
        .trim();

      if (!text) return null;

      return {
        title: title || `Insight ${index + 1}`,
        text,
        tone,
      };
    })
    .filter((item): item is MaterialInsight => Boolean(item))
    .slice(0, 3);

  const plainText = (body.textContent ?? "").replace(/\s+/g, " ").trim();
  const wordCount = plainText ? plainText.split(" ").length : 0;

  return {
    html: body.innerHTML,
    sections: sections.slice(0, 8),
    insights,
    readTime: Math.max(1, Math.ceil(wordCount / 180)),
    questionCount: body.querySelectorAll(".question-block").length,
    noteCount: body.querySelectorAll(".info-box, .tip-box, .warning-box").length,
    tableCount: body.querySelectorAll("table").length,
  };
};

export const MaterialViewer = ({
  material,
  language: propLanguage,
  onComplete,
  isCompleted = false,
  className,
  hideHeader = false,
  hideIllustrations = false,
  inlineTermTranslations,
}: MaterialViewerProps) => {
  const { language: contextLanguage } = useLanguage();
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Используем язык из пропа, если передан, иначе из контекста
  const language = propLanguage || contextLanguage;

  // Accordion Logic
  const handleAccordionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest('.hb-accordion-trigger');
    const termTrigger = target.closest('.inline-term-translation-trigger');

    if (termTrigger) {
      const wrapper = termTrigger.closest('.inline-term-translation');
      if (wrapper) {
        wrapper.classList.toggle('is-open');
      }
      return;
    }

    if (trigger) {
      const item = trigger.closest('.hb-accordion-item');
      if (item) {
        item.classList.toggle('is-open');
      }
    }
  };

  // Определяем доступные переводы
  const hasRu = !!(material.content_ru && material.content_ru.trim());
  const hasEs = !!(material.content_es && material.content_es.trim());
  const hasEn = !!(material.content_en && material.content_en.trim());

  // Fallback логика: если перевода нет, используем испанский (оригинал) или русский
  const getContent = () => {
    switch (language) {
      case "ru":
        return material.content_ru || material.content_es || material.content_en || "";
      case "es":
        return material.content_es || material.content_ru || material.content_en || "";
      case "en":
        return material.content_en || material.content_es || material.content_ru || "";
      default:
        return material.content_ru || material.content_es || material.content_en || "";
    }
  };

  const getTitle = () => {
    switch (language) {
      case "ru":
        return material.title_ru || material.title_es || material.title_en || "";
      case "es":
        return material.title_es || material.title_ru || material.title_en || "";
      case "en":
        return material.title_en || material.title_es || material.title_ru || "";
      default:
        return material.title_ru || material.title_es || material.title_en || "";
    }
  };

  // Проверяем, есть ли перевод для текущего языка
  const hasTranslation = () => {
    switch (language) {
      case "ru":
        return hasRu;
      case "es":
        return hasEs;
      case "en":
        return hasEn;
      default:
        return false;
    }
  };

  // Определяем язык оригинала (fallback)
  const getOriginalLanguage = () => {
    if (hasEs) return "es";
    if (hasRu) return "ru";
    if (hasEn) return "en";
    return "es";
  };

  const isShowingFallback = !hasTranslation() && getOriginalLanguage() !== language;
  const content = getContent();
  const title = getTitle();

  const presentation = useMemo(() => buildMaterialPresentation(content), [content]);
  const availableTranslations = [hasRu, hasEs, hasEn].filter(Boolean).length;

  const enhancedContent = useMemo(() => {
    const html = presentation?.html || content;

    if (!html || !(html.includes("<") || html.includes("&lt;")) || typeof DOMParser === "undefined") {
      return html;
    }

    if (language !== "ru" || !inlineTermTranslations || Object.keys(inlineTermTranslations).length === 0) {
      return html;
    }

    const dictionary = Object.entries(inlineTermTranslations).reduce<Record<string, string>>(
      (acc, [term, translation]) => {
        acc[term.trim().toLowerCase()] = translation;
        return acc;
      },
      {}
    );

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    Array.from(doc.body.querySelectorAll("em")).forEach((node) => {
      const term = node.textContent?.trim();
      if (!term) return;

      const translation = dictionary[term.toLowerCase()];
      if (!translation) return;

      const wrapper = doc.createElement("span");
      wrapper.className = "inline-term-translation";

      const termSpan = doc.createElement("span");
      termSpan.className = "inline-term-translation-term";
      termSpan.textContent = term;

      const trigger = doc.createElement("button");
      trigger.type = "button";
      trigger.className = "inline-term-translation-trigger";
      trigger.setAttribute("aria-label", `Показать перевод термина ${term}`);
      trigger.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 8h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>';

      const translationSpan = doc.createElement("span");
      translationSpan.className = "inline-term-translation-label";
      translationSpan.textContent = translation;

      wrapper.appendChild(termSpan);
      wrapper.appendChild(trigger);
      wrapper.appendChild(translationSpan);

      node.replaceWith(wrapper);
    });

    return doc.body.innerHTML;
  }, [content, inlineTermTranslations, language, presentation?.html]);

  const copy = {
    ru: {
      lessonMap: "Карта урока",
      lessonMapHint: "Быстрый переход по ключевым разделам",
      takeaways: "Главное для студента",
      takeawaysHint: "Короткие акценты, чтобы легче запомнить материал и не ошибиться на экзамене",
      studyFormat: "Формат урока",
      readTime: "Минут чтения",
      sections: "Разделов",
      questions: "Проверок",
      notes: "Акцентов",
      tables: "Таблиц",
      languages: "Языков",
      fromSource: "Официальный источник",
      premiumLesson: "Premium lesson",
    },
    es: {
      lessonMap: "Mapa de la leccion",
      lessonMapHint: "Salto rapido por las partes clave",
      takeaways: "Lo esencial para el alumno",
      takeawaysHint: "Puntos clave para memorizar mejor y evitar errores de examen",
      studyFormat: "Formato de la leccion",
      readTime: "Min de lectura",
      sections: "Secciones",
      questions: "Checks",
      notes: "Claves",
      tables: "Tablas",
      languages: "Idiomas",
      fromSource: "Fuente oficial",
      premiumLesson: "Premium lesson",
    },
    en: {
      lessonMap: "Lesson map",
      lessonMapHint: "Quick jumps through the key sections",
      takeaways: "What matters most",
      takeawaysHint: "Short study cues to remember faster and avoid exam traps",
      studyFormat: "Lesson format",
      readTime: "Min read",
      sections: "Sections",
      questions: "Checks",
      notes: "Signals",
      tables: "Tables",
      languages: "Languages",
      fromSource: "Official source",
      premiumLesson: "Premium lesson",
    },
  }[language];

  const handleComplete = async () => {
    if (isCompleted || isMarkingComplete) return;

    setIsMarkingComplete(true);
    try {
      await onComplete?.();
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  // Render HTML content safely with enhanced styling
  const renderContent = () => {
    // If content is HTML, render it directly with enhanced styles
    if (content.includes("<") || content.includes("&lt;")) {
      return (
        <div
          className="material-content"
          dangerouslySetInnerHTML={{ __html: enhancedContent }}
          onClick={handleAccordionClick}
        />
      );
    }

    // Otherwise, treat as plain text with line breaks
    return (
      <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
        {content.split("\n").map((line, index) => {
          // Detect headings (lines that look like headings)
          const isHeading = line.trim().match(/^[А-ЯЁ0-9\s.]{5,}$/) && line.length < 100;
          const isSubheading = line.trim().match(/^\d+\.\s+[А-ЯЁ]/);

          if (isHeading) {
            return (
              <h2 key={index} className="text-2xl font-bold mt-8 mb-4 text-foreground">
                {line.trim()}
              </h2>
            );
          }
          if (isSubheading) {
            return (
              <h3 key={index} className="text-xl font-semibold mt-6 mb-3 text-foreground">
                {line.trim()}
              </h3>
            );
          }
          if (line.trim()) {
            return (
              <p key={index} className="mb-3 text-base leading-7">
                {line.trim()}
              </p>
            );
          }
          return <br key={index} />;
        })}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Card */}
      {!hideHeader && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
                      {copy.premiumLesson}
                    </Badge>
                    <Badge variant="outline" className="border-border/60 bg-background/70">
                      {copy.studyFormat}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold text-foreground">{title}</h1>
                  {isShowingFallback && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Languages className="w-3 h-3 mr-1" />
                        {language === "ru" ? "Перевод на русский недоступен" :
                          language === "en" ? "English translation unavailable" :
                            "Traducción al español no disponible"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getOriginalLanguage() === "es" ? "Показан оригинал (испанский)" :
                          getOriginalLanguage() === "ru" ? "Показан оригинал (русский)" :
                            "Показан оригинал (английский)"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {material.source_pdf && (
                <a
                  href={material.source_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  {language === "ru" ? "Открыть оригинальный PDF" :
                    language === "en" ? "Open original PDF" :
                      "Abrir PDF original"}
                </a>
              )}
            </div>
            {isCompleted && (
              <Badge className="bg-success/20 text-success border-success/50 px-3 py-1.5">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {language === "ru" ? "Изучено" :
                  language === "en" ? "Completed" :
                    "Completado"}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {presentation && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                  {copy.studyFormat}
                </p>
                <h2 className="text-2xl font-bold text-foreground">{copy.lessonMap}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {copy.lessonMapHint}
                </p>
              </div>
              {material.source_pdf && (
                <a
                  href={material.source_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  {copy.fromSource}
                </a>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">{copy.readTime}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{presentation.readTime}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <Layers3 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">{copy.sections}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{presentation.sections.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <ScrollText className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">{copy.questions}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{presentation.questionCount}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <Lightbulb className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">{copy.notes}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{presentation.noteCount}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">{copy.tables}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{presentation.tableCount}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <Languages className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">{copy.languages}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{availableTranslations}</p>
              </div>
            </div>
          </Card>

          <Card className="border-border/60 bg-card/80 p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              {copy.takeaways}
            </p>
            <h2 className="text-2xl font-bold text-foreground">{copy.takeaways}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.takeawaysHint}
            </p>
            <div className="mt-5 space-y-3">
              {presentation.insights.map((insight, index) => (
                <div
                  key={`${insight.title}-${index}`}
                  className={cn(
                    "rounded-2xl border p-4",
                    insight.tone === "warning" && "border-amber-300/50 bg-amber-500/10",
                    insight.tone === "tip" && "border-emerald-300/50 bg-emerald-500/10",
                    insight.tone === "info" && "border-primary/20 bg-primary/5"
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {insight.tone === "warning" ? (
                      <TriangleAlert className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Lightbulb className={cn("h-4 w-4", insight.tone === "tip" ? "text-emerald-600" : "text-primary")} />
                    )}
                    <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                  </div>
                  <p className="text-sm leading-6 text-foreground/80">{insight.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {presentation && presentation.sections.length > 0 && (
        <Card className="border-border/60 bg-card/80 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                {copy.lessonMap}
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground">{copy.lessonMap}</h2>
            </div>
            <Badge variant="outline" className="border-border/60 bg-background/70">
              {presentation.sections.length}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            {presentation.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                {section.title}
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Images Gallery */}
      {material.images && material.images.length > 0 && !hideIllustrations && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {language === "ru" ? "Иллюстрации" :
                language === "en" ? "Illustrations" :
                  "Ilustraciones"}
            </h2>
            <Badge variant="outline" className="ml-auto">
              {material.images.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {material.images.map((imageUrl, index) => (
              <div
                key={index}
                className={cn(
                  "group relative rounded-xl overflow-hidden border-2 transition-all",
                  imageErrors.has(index)
                    ? "border-destructive/20 bg-muted/50"
                    : "border-border/50 hover:border-primary/50 hover:shadow-lg"
                )}
              >
                {!imageErrors.has(index) ? (
                  <img
                    src={imageUrl}
                    alt={`${getTitle()} - Изображение ${index + 1}`}
                    className="w-full h-auto object-cover transition-transform group-hover:scale-105"
                    onError={() => handleImageError(index)}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-muted/50">
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {language === "ru" ? "Изображение не загружено" :
                          language === "en" ? "Image not loaded" :
                            "Imagen no cargada"}
                      </p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Content Card */}
      <Card className="p-4 md:p-6 lg:p-8">
        <div className="prose prose-lg prose-slate max-w-none dark:prose-invert dark:prose-slate">
          <style>{`
            /* Общие стили для материала */
            .material-content,
            .material-content-wrapper {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 1.125rem;
              line-height: 1.75;
              color: hsl(var(--foreground) / 0.95);
              letter-spacing: -0.01em;
            }
            
            /* Заголовок материала */
            .material-header {
              margin-bottom: 2rem;
              padding-bottom: 1rem;
              border-bottom: 2px solid hsl(var(--border) / 0.5);
            }
            .material-title {
              font-family: 'Outfit', sans-serif;
              font-size: 2.25rem;
              font-weight: 800;
              line-height: 1.2;
              letter-spacing: -0.02em;
              color: hsl(var(--foreground));
              margin-bottom: 0.75rem;
            }
            .material-meta {
              font-size: 0.9375rem;
              color: hsl(var(--muted-foreground));
              margin: 0;
              font-weight: 500;
            }
            
            /* Заголовки разделов */
            .material-content h1,
            .material-content-wrapper h1 {
              font-family: 'Outfit', sans-serif;
              font-size: 1.75rem;
              font-weight: 800;
              line-height: 1.25;
              letter-spacing: -0.02em;
              color: hsl(var(--foreground));
              margin-top: 1.5rem;
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 2px solid hsl(var(--border) / 0.5);
            }
            
            .material-content h2,
            .material-content-wrapper h2,
            .section-heading {
              font-family: 'Outfit', sans-serif;
              font-size: 1.625rem;
              font-weight: 700;
              line-height: 1.3;
              letter-spacing: -0.015em;
              color: hsl(var(--foreground));
              margin-top: 1.75rem;
              margin-bottom: 1rem;
            }
            
            .material-content h3,
            .material-content-wrapper h3,
            .subsection-heading {
              font-family: 'Outfit', sans-serif;
              font-size: 1.375rem;
              font-weight: 600;
              line-height: 1.4;
              letter-spacing: -0.01em;
              color: hsl(var(--foreground) / 0.95);
              margin-top: 1.5rem;
              margin-bottom: 0.75rem;
            }
            
            .material-content h4,
            .material-content-wrapper h4 {
              font-family: 'Outfit', sans-serif;
              font-size: 1.125rem;
              font-weight: 600;
              line-height: 1.5;
              color: hsl(var(--foreground) / 0.9);
              margin-top: 1.5rem;
              margin-bottom: 0.75rem;
            }
            
            /* Параграфы */
            .material-content p,
            .material-content-wrapper p,
            .content-paragraph {
              margin-bottom: 1.25rem;
              line-height: 1.8;
              color: hsl(var(--foreground) / 0.95);
              font-size: 1.125rem;
              text-align: left;
              hyphens: auto;
              -webkit-hyphens: auto;
              -moz-hyphens: auto;
            }
            /* --- PREMIUM TYPOGRAPHY --- */
            .hb-hero-title {
                font-family: 'Outfit', sans-serif;
                font-size: clamp(2.25rem, 6vw, 3.5rem);
                font-weight: 900;
                line-height: 1.1;
                letter-spacing: -0.04em;
                background: linear-gradient(to right, hsl(var(--foreground)), hsl(var(--foreground) / 0.7));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin: 2.5rem 0 1rem;
            }

            .hb-hero-subtitle {
                font-size: clamp(1.1rem, 2.5vw, 1.4rem);
                font-weight: 500;
                color: hsl(var(--muted-foreground));
                line-height: 1.5;
                margin-bottom: 3.5rem;
                max-width: 65ch;
            }

            .hb-tag {
                display: inline-flex;
                align-items: center;
                padding: 0.2rem 0.6rem;
                border-radius: 6px;
                font-size: 0.65rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.5rem;
                width: fit-content;
            }

            .hb-tag-new { background: hsl(var(--emerald-500) / 0.15); color: hsl(var(--emerald-600)); border: 1px solid hsl(var(--emerald-500) / 0.2); }
            .hb-tag-critical { background: hsl(var(--red-500) / 0.15); color: hsl(var(--red-600)); border: 1px solid hsl(var(--red-500) / 0.2); }

            /* --- PREMIUM ACCORDION UI --- */
            .hb-accordion {
                margin: 2rem 0;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .hb-category-label {
                font-family: 'Outfit', sans-serif;
                font-size: 0.7rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.2em;
                color: hsl(var(--muted-foreground));
                margin: 3rem 0 1rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .hb-category-label::after {
                content: '';
                flex: 1;
                height: 1px;
                background: linear-gradient(to right, hsl(var(--border)), transparent);
            }

            .hb-accordion-item {
                background: hsl(var(--card) / 0.4);
                border: 1px solid hsl(var(--border) / 0.5);
                border-radius: 0.75rem;
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .hb-accordion-item:hover {
                border-color: hsl(var(--primary) / 0.3);
                background: hsl(var(--card) / 0.6);
            }

            .hb-accordion-item.is-open {
                background: hsl(var(--card));
                border-color: hsl(var(--primary) / 0.4);
                box-shadow: 0 4px 20px -5px rgb(0 0 0 / 0.1);
            }

            .hb-accordion-trigger {
                padding: 1.1rem 1.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                user-select: none;
                width: 100%;
                background: transparent;
            }

            .hb-acc-term-wrapper {
                display: flex;
                align-items: center;
                gap: 1rem;
                flex: 1;
            }

            .hb-acc-term {
                font-family: 'Outfit', sans-serif;
                font-size: 1.05rem;
                font-weight: 600;
                color: hsl(var(--foreground));
                letter-spacing: -0.01em;
            }

            .hb-acc-icon {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: hsl(var(--muted-foreground));
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                font-size: 1.25rem;
            }

            .hb-accordion-item.is-open .hb-acc-icon {
                transform: rotate(45deg);
                color: hsl(var(--primary));
            }

            /* Stable Grid Animation */
            .hb-accordion-content {
                display: grid;
                grid-template-rows: 0fr;
                transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                background: hsl(var(--primary) / 0.02);
            }

            .hb-accordion-item.is-open .hb-accordion-content {
                grid-template-rows: 1fr;
                border-top: 1px solid hsl(var(--border) / 0.4);
            }

            .hb-desc {
                min-height: 0;
                overflow: hidden;
                padding: 0 1.5rem;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.4s ease;
                visibility: hidden;
            }

            .hb-accordion-item.is-open .hb-desc {
                padding: 1.25rem 1.5rem;
                opacity: 1;
                transform: translateY(0);
                visibility: visible;
            }

            .hb-tag-new.tiny, .hb-tag-critical.tiny {
                font-family: 'Outfit', sans-serif;
                font-weight: 700;
                font-size: 0.6rem;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                padding: 0.35rem 0.75rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                margin: 0 1rem 0 auto; /* Push to right */
                border-radius: 6px;
                backdrop-filter: blur(8px);
                transition: all 0.3s ease;
                min-width: 80px;
                text-align: center;
            }

            .hb-tag-new.tiny {
                border: 1px solid hsl(var(--emerald-500) / 0.3);
                color: hsl(var(--emerald-500));
                background: linear-gradient(to bottom, hsl(var(--emerald-500) / 0.05), transparent);
                box-shadow: inset 0 1px 0 0 hsl(var(--emerald-500) / 0.1);
            }

            .hb-tag-critical.tiny {
                border: 1px solid hsl(var(--red-500) / 0.3);
                color: hsl(var(--red-500));
                background: linear-gradient(to bottom, hsl(var(--red-500) / 0.05), transparent);
                box-shadow: inset 0 1px 0 0 hsl(var(--red-500) / 0.1);
            }

            /* Make accordion trigger layout handle the pushed tag */
            .hb-accordion-trigger {
                display: grid;
                grid-template-columns: 1fr auto auto; /* Text | Tag | Icon */
                gap: 1rem;
                align-items: center;
            }
            
            .hb-acc-term-wrapper {
                display: block; /* Override flex */
            }

            /* --- REFINED RULE CARDS --- */
            .hb-rule-card-v2 {
                padding: 1.75rem;
                margin: 2rem 0;
                border-radius: 1.25rem;
                background: linear-gradient(135deg, hsl(var(--card) / 0.5), transparent);
                border: 1px solid hsl(var(--border) / 0.6);
                display: grid;
                grid-template-columns: 56px 1fr;
                gap: 1.5rem;
                align-items: flex-start;
            }

            .hb-rule-num-v2 {
                font-family: 'Outfit', sans-serif;
                font-size: 1.25rem;
                font-weight: 800;
                color: hsl(var(--primary));
                background: hsl(var(--primary) / 0.1);
                width: 56px;
                height: 56px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 1rem;
                flex-shrink: 0;
            }
            
            .info-box-premium {
                padding: 1.5rem;
                border-radius: 1.25rem;
                background: hsl(var(--primary) / 0.05);
                border-left: 4px solid hsl(var(--primary));
                margin: 1.5rem 0;
                font-size: 1rem;
                color: hsl(var(--foreground));
            }
            
            /* Первый параграф после заголовка */
            .material-content h1 + p,
            .material-content-wrapper h1 + p,
            .material-content h2 + p,
            .material-content-wrapper h2 + p {
              margin-top: 0;
              font-size: 1.1875rem;
              line-height: 1.8;
            }
            
            /* Списки */
            .material-content ul,
            .material-content ol,
            .material-content-wrapper ul,
            .material-content-wrapper ol,
            .styled-list {
              margin: 1.25rem 0;
              padding-left: 1.75rem;
              line-height: 1.75;
            }
            
            .material-content ul,
            .material-content-wrapper ul,
            .styled-list {
              list-style-type: disc;
            }
            
            .material-content ol,
            .material-content-wrapper ol {
              list-style-type: decimal;
            }
            
            .material-content li,
            .material-content-wrapper li,
            .styled-list li {
              margin-bottom: 0.875rem;
              color: hsl(var(--foreground) / 0.95);
              padding-left: 0.5rem;
              font-size: 1.125rem;
            }
            
            .material-content li::marker,
            .material-content-wrapper li::marker {
              color: hsl(var(--primary) / 0.8);
              font-weight: 600;
            }
            
            /* Вложенные списки */
            .material-content li ul,
            .material-content-wrapper li ul,
            .material-content li ol,
            .material-content-wrapper li ol {
              margin-top: 0.75rem;
              margin-bottom: 0.75rem;
            }
            
            .styled-list li::marker {
              color: hsl(var(--primary));
            }
            
            /* Таблицы */
            .table-wrapper {
              overflow-x: auto;
              margin: 2.5rem 0;
              border-radius: 0.75rem;
              border: 1px solid hsl(var(--border) / 0.5);
              box-shadow: 0 1px 3px 0 hsl(var(--foreground) / 0.05);
            }
            
            .data-table,
            .material-content table,
            .material-content-wrapper table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              background: hsl(var(--background));
              font-size: 1rem;
            }
            
            .data-table th,
            .material-content table th,
            .material-content-wrapper table th {
              background: hsl(var(--muted) / 0.5);
              color: hsl(var(--foreground));
              font-weight: 600;
              font-size: 0.9375rem;
              padding: 1rem 1.25rem;
              text-align: left;
              border-bottom: 2px solid hsl(var(--border));
              letter-spacing: 0.01em;
              text-transform: none;
            }
            
            .data-table td,
            .material-content table td,
            .material-content-wrapper table td {
              padding: 1rem 1.25rem;
              border-bottom: 1px solid hsl(var(--border) / 0.5);
              color: hsl(var(--foreground) / 0.95);
              font-size: 1rem;
              line-height: 1.6;
            }
            
            .data-table tr:last-child td,
            .material-content table tr:last-child td,
            .material-content-wrapper table tr:last-child td {
              border-bottom: none;
            }
            
            .data-table tr:hover,
            .material-content table tr:hover,
            .material-content-wrapper table tr:hover {
              background: hsl(var(--muted) / 0.3);
            }
            
            .data-table tbody tr:first-child td {
              padding-top: 1.25rem;
            }
            
            /* Выделение важных элементов */
            .term {
              font-weight: 600;
              color: hsl(var(--primary));
            }
            .number {
              font-weight: 600;
              color: hsl(var(--primary));
              font-family: 'Courier New', monospace;
            }
            .quote {
              font-style: italic;
              color: hsl(var(--foreground) / 0.8);
              background: hsl(var(--muted) / 0.5);
              padding: 0.125rem 0.25rem;
              border-radius: 0.25rem;
            }
            .translation {
              color: hsl(var(--muted-foreground));
              font-size: 0.9em;
            }
            
            /* Блоки цитат */
            .material-content blockquote,
            .material-content-wrapper blockquote {
              border-left: 4px solid hsl(var(--primary));
              padding: 1.5rem 2rem;
              margin: 2rem 0;
              background: hsl(var(--primary) / 0.05);
              border-radius: 0 0.75rem 0.75rem 0;
              font-style: italic;
              font-size: 1.125rem;
              line-height: 1.75;
              color: hsl(var(--foreground) / 0.9);
            }
            
            .material-content blockquote p,
            .material-content-wrapper blockquote p {
              margin-bottom: 0.75rem;
            }
            
            .material-content blockquote p:last-child,
            .material-content-wrapper blockquote p:last-child {
              margin-bottom: 0;
            }
            
            /* Блоки вопросов */
            .question-block {
              background: hsl(var(--primary) / 0.05);
              border-left: 4px solid hsl(var(--primary));
              padding: 1.75rem 2rem;
              margin: 2.5rem 0;
              border-radius: 0 0.75rem 0.75rem 0;
              box-shadow: 0 1px 3px 0 hsl(var(--primary) / 0.1);
            }
            .question-title {
              font-size: 1.375rem;
              font-weight: 700;
              line-height: 1.4;
              color: hsl(var(--primary));
              margin: 0 0 1rem 0;
            }
            .question-block p {
              margin-bottom: 1rem;
              font-size: 1.0625rem;
            }
            .question-block p:last-child {
              margin-bottom: 0;
            }
            
            /* Info boxes */
            .info-box {
              background: hsl(var(--primary) / 0.05);
              border-left: 4px solid hsl(var(--primary));
              padding: 1.5rem 2rem;
              margin: 2rem 0;
              border-radius: 0 0.75rem 0.75rem 0;
              box-shadow: 0 1px 3px 0 hsl(var(--primary) / 0.1);
            }
            .info-box p {
              margin: 0 0 0.75rem 0;
              font-size: 1.0625rem;
              line-height: 1.7;
            }
            .info-box p:last-child {
              margin-bottom: 0;
            }
            .info-box strong {
              color: hsl(var(--primary));
              font-weight: 600;
            }
            
            .tip-box {
              background: hsl(var(--success) / 0.08);
              border-left: 4px solid hsl(var(--success));
              padding: 1.5rem 2rem;
              margin: 2rem 0;
              border-radius: 0 0.75rem 0.75rem 0;
              box-shadow: 0 1px 3px 0 hsl(var(--success) / 0.1);
            }
            .tip-box p {
              margin: 0 0 0.75rem 0;
              font-size: 1.0625rem;
              line-height: 1.7;
            }
            .tip-box p:last-child {
              margin-bottom: 0;
            }
            .tip-box strong {
              color: hsl(var(--success));
              font-weight: 600;
            }
            
            .warning-box {
              background: hsl(var(--warning) / 0.08);
              border-left: 4px solid hsl(var(--warning));
              padding: 1.5rem 2rem;
              margin: 2rem 0;
              border-radius: 0 0.75rem 0.75rem 0;
              box-shadow: 0 1px 3px 0 hsl(var(--warning) / 0.1);
            }
            .warning-box p {
              margin: 0 0 0.75rem 0;
              font-size: 1.0625rem;
              line-height: 1.7;
            }
            .warning-box p:last-child {
              margin-bottom: 0;
            }
            .warning-box ul {
              margin: 0.75rem 0 0 0;
              padding-left: 1.75rem;
            }
            .warning-box strong {
              color: hsl(var(--warning));
              font-weight: 600;
            }
            
            /* Image placeholders */
            .image-placeholder {
              margin: 2rem 0;
              text-align: center;
            }
            .image-placeholder-content {
              display: inline-block;
              padding: 2rem;
              background: hsl(var(--muted) / 0.5);
              border-radius: 0.75rem;
              border: 2px dashed hsl(var(--border));
            }
            .image-caption {
              margin-top: 0.5rem;
              font-size: 0.875rem;
              color: hsl(var(--muted-foreground));
              font-style: italic;
            }
            
            /* Signals grid */
            .signals-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 1.5rem;
              margin: 2rem 0;
            }
            .signal-card {
              background: hsl(var(--card));
              border: 1px solid hsl(var(--border));
              border-radius: 0.75rem;
              padding: 1.5rem;
              transition: all 0.2s;
            }
            .signal-card:hover {
              border-color: hsl(var(--primary));
              box-shadow: 0 4px 12px -2px hsl(var(--primary) / 0.2);
            }
            .signal-card h4 {
              font-size: 1.125rem;
              font-weight: 600;
              margin-bottom: 0.75rem;
              color: hsl(var(--foreground));
            }
            .signal-card ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .signal-card li {
              padding: 0.5rem 0;
              color: hsl(var(--foreground) / 0.9);
              position: relative;
              padding-left: 1.5rem;
            }
            .signal-card li::before {
              content: '→';
              position: absolute;
              left: 0;
              color: hsl(var(--primary));
            }
            
            /* Section header */
            .section-header {
              margin: 3rem 0 1.75rem 0;
            }
            
            .section-title {
              font-size: 1.625rem;
              font-weight: 700;
              line-height: 1.3;
              letter-spacing: -0.015em;
              color: hsl(var(--primary));
              margin-bottom: 1.25rem;
            }
            
            /* Intro section */
            .intro-section {
              background: hsl(var(--muted) / 0.3);
              padding: 2rem;
              border-radius: 0.75rem;
              margin: 2.5rem 0;
              border: 1px solid hsl(var(--border) / 0.5);
            }
            
            .intro-section p {
              font-size: 1.125rem;
              line-height: 1.8;
              margin-bottom: 1rem;
            }
            
            .intro-section p:last-child {
              margin-bottom: 0;
            }
            
            /* Material paragraph */
            .material-paragraph {
              margin-bottom: 1.5rem;
              line-height: 1.75;
              color: hsl(var(--foreground) / 0.95);
              font-size: 1.125rem;
            }
            
            /* Material list */
            .material-list {
              margin: 1.75rem 0;
              padding-left: 1.75rem;
              line-height: 1.75;
              list-style-type: disc;
            }
            
            .material-list li {
              margin-bottom: 0.875rem;
              color: hsl(var(--foreground) / 0.95);
              padding-left: 0.5rem;
              font-size: 1.125rem;
            }
            
            .material-list li::marker {
              color: hsl(var(--primary) / 0.8);
              font-weight: 600;
            }
            
            /* Изображения */
            .material-content img,
            .material-content-wrapper img,
            .material-image {
              max-width: 100%;
              height: auto;
              border-radius: 0.75rem;
              margin: 2rem auto;
              display: block;
              box-shadow: 0 4px 12px -2px rgb(0 0 0 / 0.15);
              border: 1px solid hsl(var(--border) / 0.5);
            }
            .image-container {
              margin: 2rem 0;
              text-align: center;
            }
            .image-container figcaption {
              margin-top: 0.5rem;
              font-size: 0.875rem;
              color: hsl(var(--muted-foreground));
              font-style: italic;
            }
            .images-gallery {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 1.5rem;
              margin: 2rem 0;
            }
            
            /* Код */
            .material-content code,
            .material-content-wrapper code {
              background: hsl(var(--muted));
              padding: 0.125rem 0.375rem;
              border-radius: 0.25rem;
              font-size: 0.875rem;
              font-family: 'Courier New', monospace;
            }
            .material-content pre,
            .material-content-wrapper pre {
              background: hsl(var(--muted));
              padding: 1rem;
              border-radius: 0.5rem;
              overflow-x: auto;
              margin: 1.5rem 0;
              border: 1px solid hsl(var(--border) / 0.5);
            }
            
            /* Ссылки */
            .material-content a,
            .material-content-wrapper a {
              color: hsl(var(--primary));
              text-decoration: none;
              border-bottom: 1px solid hsl(var(--primary) / 0.3);
              transition: all 0.2s;
            }
            .material-content a:hover,
            .material-content-wrapper a:hover {
              color: hsl(var(--primary));
              border-bottom-color: hsl(var(--primary));
            }
            
            /* Улучшенная типографика */
            .material-content-wrapper {
              font-size: 1.125rem;
            }
            
            /* Выделение текста */
            .material-content strong,
            .material-content-wrapper strong {
              font-weight: 600;
              color: hsl(var(--foreground));
            }
            
            .material-content em,
            .material-content-wrapper em {
              font-style: italic;
              color: hsl(var(--foreground) / 0.9);
            }

            .inline-term-translation {
              display: inline-flex;
              align-items: center;
              gap: 0.35rem;
              margin: 0 0.08rem;
              white-space: normal;
              vertical-align: baseline;
            }

            .inline-term-translation-term {
              display: inline;
              color: hsl(var(--primary));
              font-style: italic;
              font-weight: 700;
            }

            .inline-term-translation-trigger {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 1.6rem;
              height: 1.6rem;
              border-radius: 9999px;
              border: 1px solid hsl(var(--primary) / 0.25);
              background: hsl(var(--primary) / 0.08);
              color: hsl(var(--primary));
              cursor: pointer;
              transition: all 0.2s ease;
              flex-shrink: 0;
            }

            .inline-term-translation-trigger:hover {
              background: hsl(var(--primary) / 0.14);
              border-color: hsl(var(--primary) / 0.45);
              transform: translateY(-1px);
            }

            .inline-term-translation-trigger svg {
              width: 0.85rem;
              height: 0.85rem;
              fill: none;
              stroke: currentColor;
              stroke-width: 1.8;
              stroke-linecap: round;
              stroke-linejoin: round;
            }

            .inline-term-translation-label {
              display: none;
              align-items: center;
              border-radius: 9999px;
              border: 1px solid hsl(var(--primary) / 0.2);
              background: hsl(var(--primary) / 0.08);
              color: hsl(var(--foreground));
              padding: 0.2rem 0.7rem;
              font-size: 0.9rem;
              line-height: 1.2;
              font-weight: 600;
            }

            .inline-term-translation.is-open .inline-term-translation-label {
              display: inline-flex;
            }
            
            /* Ссылки */
            .material-content a,
            .material-content-wrapper a {
              color: hsl(var(--primary));
              text-decoration: none;
              border-bottom: 1px solid hsl(var(--primary) / 0.3);
              transition: all 0.2s ease;
              font-weight: 500;
            }
            
            .material-content a:hover,
            .material-content-wrapper a:hover {
              color: hsl(var(--primary));
              border-bottom-color: hsl(var(--primary));
            }
            
            /* Код */
            .material-content code,
            .material-content-wrapper code {
              background: hsl(var(--muted));
              padding: 0.1875rem 0.5rem;
              border-radius: 0.375rem;
              font-size: 0.9375rem;
              font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
              color: hsl(var(--foreground));
              border: 1px solid hsl(var(--border) / 0.5);
            }
            
            .material-content pre,
            .material-content-wrapper pre {
              background: hsl(var(--muted));
              padding: 1.5rem;
              border-radius: 0.75rem;
              overflow-x: auto;
              margin: 2rem 0;
              border: 1px solid hsl(var(--border) / 0.5);
              font-size: 0.9375rem;
              line-height: 1.6;
            }
            
            .material-content pre code,
            .material-content-wrapper pre code {
              background: transparent;
              padding: 0;
              border: none;
              font-size: inherit;
            }
            
            /* Адаптивность для мобильных */
            @media (max-width: 768px) {
              .material-content-wrapper,
              .material-content {
                font-size: 1rem;
              }
              
              .material-title {
                font-size: 1.75rem;
              }
              
              .material-content h1,
              .material-content-wrapper h1 {
                font-size: 1.625rem;
              }
              
              .material-content h2,
              .material-content-wrapper h2,
              .section-heading {
                font-size: 1.375rem;
              }
              
              .material-content h3,
              .material-content-wrapper h3,
              .subsection-heading {
                font-size: 1.25rem;
              }
              
              .material-content p,
              .material-content-wrapper p {
                font-size: 1rem;
                margin-bottom: 1.25rem;
              }
              
              .material-content li,
              .material-content-wrapper li {
                font-size: 1rem;
              }
              
              .table-wrapper {
                font-size: 0.875rem;
              }
              
              .data-table th,
              .data-table td,
              .material-content table th,
              .material-content table td,
              .material-content-wrapper table th,
              .material-content-wrapper table td {
                padding: 0.75rem 1rem;
              }
              
              .info-box,
              .tip-box,
              .warning-box,
              .question-block {
                padding: 1rem 1.25rem;
              }
            }
          `}</style>
          {renderContent()}
        </div>
      </Card>

      {/* Complete Button */}
      {!isCompleted && (
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <div className="flex justify-end">
            <Button
              onClick={handleComplete}
              disabled={isMarkingComplete}
              size="lg"
              className="min-w-[200px] shadow-lg"
            >
              {isMarkingComplete ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "ru" ? "Отмечаем..." :
                    language === "en" ? "Marking..." :
                      "Marcando..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {language === "ru" ? "Отметить как изученное" :
                    language === "en" ? "Mark as completed" :
                      "Marcar como completado"}
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
