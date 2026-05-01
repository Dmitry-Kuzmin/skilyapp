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

// Encode special chars in wikimedia URLs (ñ, á, etc.) that cause 400 errors
function encodeWikimediaUrl(url: string): string {
  if (!url.includes('wikimedia.org')) return url;
  try {
    const u = new URL(url);
    // Re-encode each path segment individually, preserving slashes
    u.pathname = u.pathname.split('/').map((seg) => {
      // Already encoded segments won't double-encode
      try { decodeURIComponent(seg); } catch { return seg; }
      return encodeURIComponent(decodeURIComponent(seg));
    }).join('/');
    return u.toString();
  } catch {
    return url;
  }
}

// SVG placeholder shown when image fails to load
const SIGN_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="8" fill="%23334155" opacity="0.4"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="32" fill="%2394a3b8">🚧</text></svg>')}`;

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  placeholder = SIGN_PLACEHOLDER,
  className,
  onLoad,
  onError,
  priority = false,
  ...props
}: LazyImageProps) {
  const encodedSrc = encodeWikimediaUrl(src);
  const [imageSrc, setImageSrc] = useState<string>(priority ? encodedSrc : placeholder);
  const [isLoaded, setIsLoaded] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!encodedSrc) return;

    if (priority) {
      const img = new Image();
      img.decoding = 'async';
      img.src = encodedSrc;
      img.onload = () => { setIsLoaded(true); onLoad?.(); };
      img.onerror = () => { setHasError(true); setImageSrc(SIGN_PLACEHOLDER); onError?.(); };
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.decoding = 'async';
            img.src = encodedSrc;
            img.onload = () => { setImageSrc(encodedSrc); setIsLoaded(true); onLoad?.(); };
            img.onerror = () => { setHasError(true); setImageSrc(SIGN_PLACEHOLDER); onError?.(); };
            observerRef.current?.disconnect();
          }
        });
      },
      { rootMargin: '50px', threshold: 0.01 }
    );

    if (imgRef.current) observerRef.current.observe(imgRef.current);
    return () => { observerRef.current?.disconnect(); };
  }, [encodedSrc, onLoad, onError, priority]);

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
      onError={() => {
        setHasError(true);
        setImageSrc(SIGN_PLACEHOLDER);
        onError?.();
      }}
      style={{
        ...(props.width && props.height ? {} : { aspectRatio: 'auto' }),
        ...props.style,
      }}
      className={cn(
        'transition-opacity duration-300',
        (isLoaded || hasError) ? 'opacity-100' : 'opacity-0',
        className
      )}
      {...props}
    />
  );
});


