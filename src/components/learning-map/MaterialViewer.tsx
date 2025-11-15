import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  language?: "ru" | "es" | "en";
  onComplete?: () => void;
  isCompleted?: boolean;
  className?: string;
}

export const MaterialViewer = ({
  material,
  language = "ru",
  onComplete,
  isCompleted = false,
  className,
}: MaterialViewerProps) => {
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const getContent = () => {
    switch (language) {
      case "es":
        return material.content_es;
      case "en":
        return material.content_en;
      default:
        return material.content_ru;
    }
  };

  const getTitle = () => {
    switch (language) {
      case "es":
        return material.title_es;
      case "en":
        return material.title_en;
      default:
        return material.title_ru;
    }
  };

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
              <h1 className="text-3xl font-bold text-foreground">{getTitle()}</h1>
            </div>
            {material.source_pdf && (
              <a
                href={material.source_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                Открыть оригинальный PDF
              </a>
            )}
          </div>
          {isCompleted && (
            <Badge className="bg-success/20 text-success border-success/50 px-3 py-1.5">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Изучено
            </Badge>
          )}
        </div>
      </Card>

      {/* Images Gallery */}
      {material.images && material.images.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Иллюстрации</h2>
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
                      <p className="text-sm">Изображение не загружено</p>
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
      <Card className="p-6 md:p-8">
        <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground/90 prose-p:leading-relaxed prose-strong:text-foreground prose-strong:font-semibold prose-ul:text-foreground/90 prose-ol:text-foreground/90 prose-li:text-foreground/90 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg prose-img:rounded-lg prose-img:border prose-img:border-border/50 prose-img:shadow-md prose-table:border-collapse prose-th:border prose-th:border-border/50 prose-th:bg-muted/50 prose-th:p-3 prose-th:font-semibold prose-td:border prose-td:border-border/50 prose-td:p-3">
          <style>{`
            /* Общие стили для материала */
            .material-content,
            .material-content-wrapper {
              line-height: 1.8;
              color: hsl(var(--foreground) / 0.9);
            }
            
            /* Заголовок материала */
            .material-header {
              margin-bottom: 2rem;
              padding-bottom: 1rem;
              border-bottom: 2px solid hsl(var(--primary) / 0.2);
            }
            .material-title {
              font-size: 2rem;
              font-weight: 700;
              color: hsl(var(--foreground));
              margin-bottom: 0.5rem;
            }
            .material-meta {
              font-size: 0.875rem;
              color: hsl(var(--muted-foreground));
              margin: 0;
            }
            
            /* Заголовки разделов */
            .material-content h1,
            .material-content h2,
            .material-content h3,
            .material-content-wrapper h1,
            .material-content-wrapper h2,
            .material-content-wrapper h3,
            .section-heading,
            .subsection-heading {
              margin-top: 2.5rem;
              margin-bottom: 1rem;
              font-weight: 700;
              color: hsl(var(--foreground));
              line-height: 1.3;
            }
            .material-content h1,
            .material-content-wrapper h1 {
              font-size: 2rem;
              border-bottom: 2px solid hsl(var(--primary) / 0.2);
              padding-bottom: 0.5rem;
            }
            .material-content h2,
            .material-content-wrapper h2,
            .section-heading {
              font-size: 1.5rem;
              color: hsl(var(--primary));
              margin-top: 2rem;
            }
            .material-content h3,
            .material-content-wrapper h3,
            .subsection-heading {
              font-size: 1.25rem;
              color: hsl(var(--foreground));
              margin-top: 1.5rem;
            }
            
            /* Параграфы */
            .material-content p,
            .material-content-wrapper p,
            .content-paragraph {
              margin-bottom: 1.25rem;
              line-height: 1.8;
              color: hsl(var(--foreground) / 0.9);
              text-align: justify;
              hyphens: auto;
            }
            
            /* Списки */
            .material-content ul,
            .material-content ol,
            .material-content-wrapper ul,
            .material-content-wrapper ol,
            .styled-list {
              margin: 1.5rem 0;
              padding-left: 2rem;
              line-height: 1.8;
            }
            .material-content li,
            .material-content-wrapper li,
            .styled-list li {
              margin-bottom: 0.75rem;
              color: hsl(var(--foreground) / 0.9);
              padding-left: 0.5rem;
            }
            .styled-list li::marker {
              color: hsl(var(--primary));
            }
            
            /* Таблицы */
            .table-wrapper {
              overflow-x: auto;
              margin: 2rem 0;
              border-radius: 0.5rem;
              border: 1px solid hsl(var(--border) / 0.5);
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              background: hsl(var(--background));
            }
            .data-table th,
            .material-content table th,
            .material-content-wrapper table th {
              background: hsl(var(--primary) / 0.1);
              color: hsl(var(--foreground));
              font-weight: 600;
              padding: 1rem;
              text-align: left;
              border-bottom: 2px solid hsl(var(--primary) / 0.3);
              font-size: 0.9rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .data-table td,
            .material-content table td,
            .material-content-wrapper table td {
              padding: 0.875rem 1rem;
              border-bottom: 1px solid hsl(var(--border) / 0.5);
              color: hsl(var(--foreground) / 0.9);
            }
            .data-table tr:hover,
            .material-content table tr:hover,
            .material-content-wrapper table tr:hover {
              background: hsl(var(--muted) / 0.3);
            }
            .data-table tr:last-child td {
              border-bottom: none;
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
              padding: 1rem 1.5rem;
              margin: 1.5rem 0;
              background: hsl(var(--primary) / 0.05);
              border-radius: 0 0.5rem 0.5rem 0;
              font-style: italic;
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
              font-size: 1.0625rem;
            }
            
            /* Адаптивность для мобильных */
            @media (max-width: 768px) {
              .material-title {
                font-size: 1.5rem;
              }
              .section-heading {
                font-size: 1.25rem;
              }
              .subsection-heading {
                font-size: 1.125rem;
              }
              .table-wrapper {
                font-size: 0.875rem;
              }
              .data-table th,
              .data-table td {
                padding: 0.5rem;
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
                  Отмечаем...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Отметить как изученное
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

