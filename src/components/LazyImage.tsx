/**
 * Компонент для lazy loading изображений
 * Оптимизирует загрузку изображений - загружает только когда они в viewport
 * Использует современные оптимизации: decoding="async", fetchpriority, Intersection Observer
 */

import { useState, useEffect, useRef, ImgHTMLAttributes, memo } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // Для критических изображений выше fold
  // КРИТИЧНО: width/height для предотвращения CLS
  // Если не указаны, используем aspect-ratio через CSS
  width?: number;
  height?: number;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
  className,
  onLoad,
  onError,
  priority = false,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(priority ? src : placeholder);
  const [isLoaded, setIsLoaded] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!src) return;

    // Если изображение критическое (priority), загружаем сразу
    if (priority) {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;

      img.onload = () => {
        setIsLoaded(true);
        onLoad?.();
      };

      img.onerror = () => {
        setHasError(true);
        onError?.();
      };
      return;
    }

    // Используем Intersection Observer для lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Изображение в viewport - начинаем загрузку
            const img = new Image();
            img.decoding = 'async'; // Асинхронное декодирование для неблокирующей загрузки
            img.src = src;

            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
              onLoad?.();
            };

            img.onerror = () => {
              setHasError(true);
              onError?.();
            };

            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Начинаем загрузку за 50px до появления в viewport
        threshold: 0.01, // Минимальный порог видимости
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, onLoad, onError, priority]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      {...({ fetchpriority: priority ? 'high' : 'auto' } as any)}
      // КРИТИЧНО: width/height для предотвращения CLS
      // Если не указаны в props, используем aspect-ratio через CSS
      width={props.width}
      height={props.height}
      style={{
        ...(props.width && props.height ? {} : { aspectRatio: 'auto' }),
        ...props.style,
      }}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0',
        hasError && 'opacity-50',
        className
      )}
      {...props}
    />
  );
});


