/**
 * Универсальный компонент изображения вопроса
 * Переиспользуется везде
 */

import { useState, useEffect, memo } from 'react';
import { getImageUrl, getCachedImageAspectRatio } from '@/utils/imageUtils';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ZoomIn, X, Bot } from 'lucide-react';
import { ThreeDImageViewer } from '@/components/ui/ThreeDImageViewer';

interface QuestionImageProps {
  imageUrl: string | null;
  aspectRatio?: number | null;
  compact?: boolean;
  className?: string;
  alt?: string;
}

export const QuestionImage = memo(function QuestionImage({
  imageUrl,
  aspectRatio: initialAspectRatio = null,
  compact = false,
  className,
  alt = "Вопрос",
}: QuestionImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(initialAspectRatio);
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
        className
      )}>
        <div
          className="w-full flex items-center justify-center transition-all duration-300"
          style={{
            aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : 'auto',
            minHeight: imageAspectRatio ? 'auto' : (compact ? '240px' : '200px')
          }}
        >
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-50">Cargando...</div>
        </div>
      </div>
    );
  }

  if (hasError || !imageSrc) {
    return (
      <div className={cn(
        "rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center p-8 min-h-[200px]",
        className
      )}>
        <div className="opacity-20 grayscale mb-2 scale-75">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-slate-400" />
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
          {imageUrl?.toLowerCase().includes('no_image') ? 'Без изображения' : 'Изображение недоступно'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative rounded-xl overflow-hidden group/img ring-1 ring-white/5",
          className
        )}
        onClick={() => setIsZoomed(true)}
      >
        <div className="relative w-full cursor-zoom-in overflow-hidden">
          <img
            src={imageSrc}
            alt={alt}
            className="w-full h-auto object-contain block transition-transform duration-500 group-hover/img:scale-[1.02]"
            loading="lazy"
            decoding="async"
            width={imageAspectRatio ? Math.round(800 * imageAspectRatio) : 800}
            height={imageAspectRatio ? 800 : Math.round(800 / (imageAspectRatio || 1.5))}
            style={{
              aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : 'auto',
            }}
          />

          {/* Dark Gradient Overlay at bottom to blend with text */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

          {/* Overlay with Zoom Icon */}
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 dark:bg-black/80 p-2 rounded-full opacity-0 group-hover/img:opacity-100 transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-300">
              <ZoomIn className="w-5 h-5 text-foreground" />
            </div>
          </div>
        </div>
      </div>

      <ThreeDImageViewer
        src={imageSrc}
        alt={alt}
        isOpen={isZoomed}
        onClose={() => setIsZoomed(false)}
      />
    </>
  );
});


