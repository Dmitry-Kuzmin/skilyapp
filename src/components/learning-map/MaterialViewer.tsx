import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
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

  // Render HTML content safely
  const renderContent = () => {
    const content = getContent();
    // If content is HTML, render it directly
    if (content.includes("<") || content.includes("&lt;")) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    // Otherwise, treat as plain text with line breaks
    return (
      <div className="whitespace-pre-wrap">
        {content.split("\n").map((line, index) => (
          <p key={index} className="mb-2">
            {line}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{getTitle()}</h2>
          {material.source_pdf && (
            <a
              href={material.source_pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Открыть оригинальный PDF →
            </a>
          )}
        </div>
        {isCompleted && (
          <Badge className="bg-success/20 text-success border-success/50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Изучено
          </Badge>
        )}
      </div>

      {/* Images */}
      {material.images && material.images.length > 0 && (
        <div className="space-y-4">
          {material.images.map((imageUrl, index) => (
            <div key={index} className="rounded-lg overflow-hidden border border-border/50">
              <img
                src={imageUrl}
                alt={`${getTitle()} - Изображение ${index + 1}`}
                className="w-full h-auto"
              />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <div className="text-foreground/90 leading-relaxed">{renderContent()}</div>
      </div>

      {/* Complete Button */}
      {!isCompleted && (
        <div className="flex justify-end pt-4 border-t border-border/50">
          <Button
            onClick={handleComplete}
            disabled={isMarkingComplete}
            className="min-w-[150px]"
          >
            {isMarkingComplete ? (
              "Отмечаем..."
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Отметить как изученное
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};

