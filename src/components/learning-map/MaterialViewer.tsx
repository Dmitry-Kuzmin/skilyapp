import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, ExternalLink, Image as ImageIcon, Loader2, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
}

export const MaterialViewer = ({
  material,
  language: propLanguage,
  onComplete,
  isCompleted = false,
  className,
}: MaterialViewerProps) => {
  const { language: contextLanguage } = useLanguage();
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  
  // Используем язык из пропа, если передан, иначе из контекста
  const language = propLanguage || contextLanguage;
  
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
    const content = getContent();
    
    // If content is HTML, render it directly with enhanced styles
    if (content.includes("<") || content.includes("&lt;")) {
      return (
        <div
          className="material-content"
          dangerouslySetInnerHTML={{ __html: content }}
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
    <div className={cn("space-y-6", className)}>
      {/* Header Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">{getTitle()}</h1>
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

      {/* Images Gallery */}
      {material.images && material.images.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">
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
      <Card className="p-6 md:p-8 lg:p-10">
        <div className="prose prose-lg prose-slate max-w-none dark:prose-invert dark:prose-slate">
          <style>{`
            /* Общие стили для материала */
            .material-content,
            .material-content-wrapper {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              font-size: 1.125rem;
              line-height: 1.75;
              color: hsl(var(--foreground) / 0.95);
              letter-spacing: -0.01em;
            }
            
            /* Заголовок материала */
            .material-header {
              margin-bottom: 3rem;
              padding-bottom: 1.5rem;
              border-bottom: 2px solid hsl(var(--border) / 0.5);
            }
            .material-title {
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
              font-size: 2rem;
              font-weight: 800;
              line-height: 1.25;
              letter-spacing: -0.02em;
              color: hsl(var(--foreground));
              margin-top: 3rem;
              margin-bottom: 1.5rem;
              padding-bottom: 0.75rem;
              border-bottom: 2px solid hsl(var(--border) / 0.5);
            }
            
            .material-content h2,
            .material-content-wrapper h2,
            .section-heading {
              font-size: 1.625rem;
              font-weight: 700;
              line-height: 1.3;
              letter-spacing: -0.015em;
              color: hsl(var(--foreground));
              margin-top: 2.5rem;
              margin-bottom: 1.25rem;
            }
            
            .material-content h3,
            .material-content-wrapper h3,
            .subsection-heading {
              font-size: 1.375rem;
              font-weight: 600;
              line-height: 1.4;
              letter-spacing: -0.01em;
              color: hsl(var(--foreground) / 0.95);
              margin-top: 2rem;
              margin-bottom: 1rem;
            }
            
            .material-content h4,
            .material-content-wrapper h4 {
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
              margin-bottom: 1.5rem;
              line-height: 1.75;
              color: hsl(var(--foreground) / 0.95);
              font-size: 1.125rem;
              text-align: left;
              hyphens: auto;
              -webkit-hyphens: auto;
              -moz-hyphens: auto;
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
              margin: 1.75rem 0;
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
                padding: 1.25rem 1.5rem;
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

