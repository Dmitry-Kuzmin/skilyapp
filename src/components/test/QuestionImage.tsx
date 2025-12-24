/**
 * Универсальный компонент изображения вопроса
 * Переиспользуется везде
 */

import { useState, useEffect, memo } from 'react';
import { getImageUrl, getCachedImageAspectRatio } from '@/utils/imageUtils';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ZoomIn, X } from 'lucide-react';

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
  const [isZoomed, setIsZoomed] = useState(false);

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

        const cachedAspectRatio = getCachedImageAspectRatio(imageUrl);
        if (cachedAspectRatio !== null) {
          setImageAspectRatio(cachedAspectRatio);
          setImageSrc(url);
          setIsLoading(false);
          return;
        }

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
    <>
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <div className={cn(
          "relative rounded-2xl shadow-md overflow-hidden group/img",
          compact ? 'w-full' : 'mb-4 sm:mb-6',
          className
        )}>
          <DialogTrigger asChild>
            <div
              className="relative w-full cursor-zoom-in overflow-hidden"
              style={{
                minHeight: compact ? '200px' : 'auto',
                maxHeight: compact ? '500px' : 'none',
              }}
            >
              <img
                src={imageSrc}
                alt={alt}
                className="w-full h-auto object-contain block transition-transform duration-500 group-hover/img:scale-[1.02]"
                loading="lazy"
                decoding="async"
                width={imageAspectRatio ? Math.round((compact ? 500 : 800) * imageAspectRatio) : (compact ? 500 : 800)}
                height={imageAspectRatio ? (compact ? 500 : 800) : Math.round((compact ? 500 : 800) / (imageAspectRatio || 1.5))}
                style={{
                  aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : 'auto',
                  minHeight: compact ? '200px' : '180px',
                  maxHeight: imageAspectRatio && imageAspectRatio > 1.2
                    ? (compact ? '600px' : '500px')
                    : (compact ? '500px' : '400px'),
                }}
              />

              {/* Overlay with Zoom Icon */}
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 dark:bg-black/80 p-2 rounded-full opacity-0 group-hover/img:opacity-100 transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-300">
                  <ZoomIn className="w-5 h-5 text-foreground" />
                </div>
              </div>
            </div>
          </DialogTrigger>
        </div>

        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95 border-none dark:bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={imageSrc}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain animate-in zoom-in-95 duration-300"
            />
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white/60 text-xs sm:text-sm">Нажмите в любое место, чтобы закрыть</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});


