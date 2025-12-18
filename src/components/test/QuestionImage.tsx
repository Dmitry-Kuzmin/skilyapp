/**
 * Универсальный компонент изображения вопроса
 * Переиспользуется везде
 */

import { useState, useEffect, memo } from 'react';
import { getImageUrl, getCachedImageAspectRatio } from '@/utils/imageUtils';
import { cn } from '@/lib/utils';

interface QuestionImageProps {
  imageUrl: string | null;
  compact?: boolean;
  className?: string;
  alt?: string;
}

export const QuestionImage = memo(function QuestionImage({
  imageUrl,
  compact = false,
  className,
  alt = "Вопрос",
}: QuestionImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        const url = getImageUrl(imageUrl);
        if (!url) {
          setHasError(true);
          setIsLoading(false);
          return;
        }

        // Проверяем кэш
        const cachedAspectRatio = getCachedImageAspectRatio(imageUrl);
        if (cachedAspectRatio !== null) {
          setImageAspectRatio(cachedAspectRatio);
          setImageSrc(url);
          setIsLoading(false);
          return;
        }

        // Загружаем изображение
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          setImageAspectRatio(aspectRatio);
          setImageSrc(url);
          setIsLoading(false);
        };
        img.onerror = () => {
          setHasError(true);
          setIsLoading(false);
        };
        img.src = url;
      } catch (error) {
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl]);

  if (isLoading) {
    return (
      <div className={cn(
        "rounded-xl sm:rounded-2xl overflow-hidden border-2 border-border/30 shadow-lg bg-gradient-to-br from-muted/30 to-muted/10 animate-pulse",
        compact ? 'w-full' : 'mb-4 sm:mb-6',
        className
      )}>
        <div className={cn(
          "w-full flex items-center justify-center",
          compact ? 'h-full min-h-[300px] md:min-h-[400px]' : 'h-48 sm:h-64 md:h-72'
        )}>
          <div className="text-muted-foreground text-sm">Загрузка изображения...</div>
        </div>
      </div>
    );
  }

  if (hasError || !imageSrc) {
    return null;
  }

  return (
    <div className={cn(
      "relative rounded-2xl shadow-md overflow-hidden",
      compact ? 'w-full' : 'mb-4 sm:mb-6',
      className
    )}>
      <div 
        className="relative w-full group"
        style={{
          minHeight: compact ? '200px' : 'auto',
          maxHeight: compact ? '500px' : 'none',
        }}
      >
        <img 
          src={imageSrc} 
          alt={alt}
          className="w-full h-auto object-cover block"
          loading="lazy"
          decoding="async"
          fetchPriority={compact ? 'auto' : 'high'}
          width={imageAspectRatio ? Math.round((compact ? 500 : 800) * imageAspectRatio) : (compact ? 500 : 800)}
          height={imageAspectRatio ? (compact ? 500 : 800) : Math.round((compact ? 500 : 800) / (imageAspectRatio || 1.5))}
          style={{
            aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : 'auto',
            minHeight: compact ? '200px' : '180px',
            maxHeight: compact ? '500px' : '288px',
          }}
          onError={() => {
            setHasError(true);
          }}
        />
      </div>
    </div>
  );
});

