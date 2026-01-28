import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-[2147483646] bg-black/80",
      // Instagram-подобная анимация: синхронизированная с контентом для мобильных
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      // Единая длительность для синхронизации (200ms)
      "data-[state=open]:duration-200 data-[state=closed]:duration-200",
      className,
    )}
    style={{
      willChange: "opacity",
      // Плавный easing как в Instagram
      transition: "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)",
    }}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-[2147483647] gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-200",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
  VariantProps<typeof sheetVariants> {
  hideCloseButton?: boolean;
  onOpenChange?: (open: boolean) => void; // Явная передача onOpenChange для закрытия через свайп
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "bottom", className, children, hideCloseButton = false, onOpenChange, ...props }, ref) => {
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [startY, setStartY] = React.useState<number | null>(null);
    const [currentY, setCurrentY] = React.useState<number | null>(null);
    // Для горизонтального свайпа (right sheet)
    const [startX, setStartX] = React.useState<number | null>(null);
    const [currentX, setCurrentX] = React.useState<number | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    // Защита от множественных вызовов закрытия
    const isClosingRef = React.useRef(false);
    // Отслеживание скорости для инерции (Instagram-стиль)
    const velocityRef = React.useRef(0);
    const lastYRef = React.useRef<number | null>(null);
    const lastXRef = React.useRef<number | null>(null);
    const lastTimeRef = React.useRef<number | null>(null);
    // Высота/ширина модалки для динамического порога
    const modalHeightRef = React.useRef<number | null>(null);
    const modalWidthRef = React.useRef<number | null>(null);

    // Пытаемся получить доступ к родительскому Sheet Root через контекст
    // Radix UI Dialog использует внутренний контекст, но мы можем попробовать найти его через DOM
    const getSheetRoot = React.useCallback(() => {
      if (!contentRef.current) return null;

      // Ищем родительский элемент с data-radix-dialog-root
      let element: HTMLElement | null = contentRef.current;
      while (element && element !== document.body) {
        if (element.hasAttribute('data-radix-dialog-root') ||
          element.getAttribute('role') === 'dialog') {
          return element;
        }
        element = element.parentElement;
      }
      return null;
    }, []);

    // Объединяем refs
    React.useImperativeHandle(ref, () => contentRef.current as any);

    // Сбрасываем состояния свайпа при закрытии модалки другими способами (кнопка, клик вне, ESC)
    React.useEffect(() => {
      // Отслеживаем изменения через MutationObserver для data-state
      if (!contentRef.current || (side !== "bottom" && side !== "right")) return;

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
            const newState = contentRef.current?.getAttribute('data-state');

            // Если модалка открылась, сбрасываем все состояния для нового сеанса
            if (newState === 'open') {
              // КРИТИЧНО: Сбрасываем флаг закрытия СИНХРОННО
              isClosingRef.current = false;

              // Сбрасываем все состояния свайпа
              setStartY(null);
              setCurrentY(null);
              setStartX(null);
              setCurrentX(null);
              setIsDragging(false);

              // Сбрасываем все refs
              velocityRef.current = 0;
              lastYRef.current = null;
              lastXRef.current = null;
              lastTimeRef.current = null;
              modalHeightRef.current = null;
              modalWidthRef.current = null;

              // Убираем все кастомные стили через requestAnimationFrame для гарантии
              requestAnimationFrame(() => {
                if (contentRef.current) {
                  contentRef.current.style.transform = '';
                  contentRef.current.style.transition = '';
                  contentRef.current.style.touchAction = '';
                  contentRef.current.style.opacity = '';
                  contentRef.current.style.height = '';
                  contentRef.current.style.maxHeight = '';
                }
              });

              if (process.env.NODE_ENV === 'development') {
                console.log('[Sheet] Modal opened - all states reset, isClosingRef:', isClosingRef.current);
              }
            }

            // Если модалка закрылась, сбрасываем все состояния свайпа и кастомные стили
            if (newState === 'closed') {
              // Сбрасываем флаг закрытия
              isClosingRef.current = false;

              // КРИТИЧНО: Убираем ВСЕ кастомные стили принудительно
              requestAnimationFrame(() => {
                if (contentRef.current) {
                  contentRef.current.style.transform = '';
                  contentRef.current.style.transition = '';
                  contentRef.current.style.touchAction = '';
                  // Убираем любые другие возможные стили
                  contentRef.current.style.opacity = '';
                  contentRef.current.style.height = '';
                  contentRef.current.style.maxHeight = '';
                }

                // Принудительно скрываем overlay если он остался
                const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
                if (overlay) {
                  overlay.style.opacity = '';
                  overlay.style.transition = '';
                  overlay.style.pointerEvents = '';
                  // Если overlay все еще видим, принудительно скрываем
                  if (overlay.offsetParent !== null) {
                    overlay.style.display = 'none';
                    // Восстанавливаем через небольшую задержку для следующего открытия
                    setTimeout(() => {
                      overlay.style.display = '';
                    }, 100);
                  }
                }
              });

              // Сбрасываем состояния свайпа
              setStartY(null);
              setCurrentY(null);
              setStartX(null);
              setCurrentX(null);
              setIsDragging(false);

              // Сбрасываем все refs
              velocityRef.current = 0;
              lastYRef.current = null;
              lastXRef.current = null;
              lastTimeRef.current = null;
              modalHeightRef.current = null;
              modalWidthRef.current = null;

              if (process.env.NODE_ENV === 'development') {
                console.log('[Sheet] Modal closed - all states reset');
              }
            }
          }
        });
      });

      observer.observe(contentRef.current, {
        attributes: true,
        attributeFilter: ['data-state'],
      });

      return () => {
        observer.disconnect();
      };
    }, [side]);

    // Обработка свайпа для закрытия (bottom и right sheet) - Instagram-стиль
    const handleTouchStart = (e: React.TouchEvent) => {
      if (side !== "bottom" && side !== "right") return;

      // КРИТИЧНО: Проверяем, что модалка открыта и не закрывается
      if (!contentRef.current) return;

      const currentState = contentRef.current.getAttribute('data-state');
      if (currentState !== 'open') {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Sheet] handleTouchStart: Modal not open, state:', currentState);
        }
        return;
      }

      // Если модалка закрывается, не начинаем новый свайп
      if (isClosingRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Sheet] handleTouchStart: Modal is closing, ignoring');
        }
        return;
      }

      // КРИТИЧНО: Проверяем, что touch не начинается на интерактивном элементе
      const target = e.target as HTMLElement;
      const interactiveElements = ['button', 'a', 'input', 'select', 'textarea', '[role="tab"]', '[role="button"]', '[role="link"]'];
      const isInteractive = interactiveElements.some(selector => {
        if (selector.startsWith('[')) {
          return target.closest(selector) !== null;
        }
        return target.closest(selector) !== null || target.tagName.toLowerCase() === selector;
      });

      // Если touch начинается на интерактивном элементе - игнорируем
      if (isInteractive) {
        return;
      }

      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const rect = contentRef.current?.getBoundingClientRect();

      if (!rect) return;

      if (side === "bottom") {
        // Сохраняем высоту модалки для динамического порога
        modalHeightRef.current = rect.height;

        // КРИТИЧНО: Свайп для закрытия только из очень узкой зоны вверху (индикатор + 40px)
        // Это предотвращает случайное закрытие при взаимодействии с контентом
        const dragZoneHeight = 50; // Узкая зона только для индикатора и небольшой области вокруг
        const isInDragZone = touchY - rect.top < dragZoneHeight;

        if (!isInDragZone) {
          // Touch не в зоне для drag - игнорируем
          return;
        }
      } else if (side === "right") {
        // Сохраняем ширину модалки для динамического порога
        modalWidthRef.current = rect.width;

        // Для right sheet разрешаем свайп вправо из любой точки левого края (50px зона)
        const dragZoneWidth = 50;
        const isInDragZone = touchX - rect.left < dragZoneWidth;

        if (!isInDragZone) {
          return;
        }
      }

      if (side === "bottom") {
        // Instagram-стиль: "липкая" прокрутка - проверяем, можно ли скроллить контент
        const scrollableElement = e.currentTarget.querySelector('[data-scrollable]') ||
          e.currentTarget.querySelector('.overflow-y-auto') ||
          e.currentTarget;

        const isScrollable = scrollableElement &&
          (scrollableElement.scrollHeight > scrollableElement.clientHeight);
        const scrollTop = isScrollable ? (scrollableElement as HTMLElement).scrollTop : 0;

        // Если контент скроллится и мы не в самом верху - не начинаем свайп для закрытия
        if (isScrollable && scrollTop > 10) {
          // Если есть скролл, разрешаем свайп только если мы точно в зоне индикатора
          if (touchY - rect.top < 30) {
            setStartY(touchY);
            setIsDragging(true);
            velocityRef.current = 0;
            lastYRef.current = touchY;
            lastTimeRef.current = Date.now();

            if (contentRef.current) {
              contentRef.current.style.touchAction = 'pan-y';
            }
          }
        } else {
          // Если контент не скроллится или мы вверху - разрешаем свайп только из зоны индикатора
          setStartY(touchY);
          setIsDragging(true);
          velocityRef.current = 0;
          lastYRef.current = touchY;
          lastTimeRef.current = Date.now();

          if (contentRef.current) {
            contentRef.current.style.touchAction = 'pan-y';
          }
        }
      } else if (side === "right") {
        // Для right sheet начинаем горизонтальный свайп
        setStartX(touchX);
        setIsDragging(true);
        velocityRef.current = 0;
        lastXRef.current = touchX;
        lastTimeRef.current = Date.now();

        if (contentRef.current) {
          contentRef.current.style.touchAction = 'pan-x';
        }
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (side === "bottom" && (startY === null || !isDragging)) return;
      if (side === "right" && (startX === null || !isDragging)) return;
      if (side !== "bottom" && side !== "right") return;

      // КРИТИЧНО: Проверяем, что модалка еще открыта и не закрывается
      if (!contentRef.current) {
        setStartY(null);
        setCurrentY(null);
        setIsDragging(false);
        return;
      }

      const currentState = contentRef.current.getAttribute('data-state');
      if (currentState !== 'open' || isClosingRef.current) {
        // Если модалка уже закрыта или закрывается, прекращаем обработку
        setStartY(null);
        setCurrentY(null);
        setStartX(null);
        setCurrentX(null);
        setIsDragging(false);
        return;
      }

      if (side === "bottom" && startY !== null) {
        const currentYPos = e.touches[0].clientY;
        const diff = currentYPos - startY;

        // Разрешаем свайп только вниз (Instagram-стиль: модалка следует за пальцем)
        if (diff > 0 && contentRef.current) {
          e.preventDefault(); // Предотвращаем скролл страницы только при свайпе вниз

          // Вычисляем скорость для инерции (Instagram-стиль)
          const now = Date.now();
          if (lastYRef.current !== null && lastTimeRef.current !== null) {
            const deltaY = currentYPos - lastYRef.current;
            const deltaTime = now - lastTimeRef.current;
            if (deltaTime > 0) {
              // Скорость в px/ms
              velocityRef.current = deltaY / deltaTime;
            }
          }
          lastYRef.current = currentYPos;
          lastTimeRef.current = now;

          // Модалка следует за пальцем (Instagram-стиль)
          const maxDrag = modalHeightRef.current ? modalHeightRef.current * 1.2 : 600;
          setCurrentY(diff);
          contentRef.current.style.transform = `translateY(${Math.min(diff, maxDrag)}px)`;
          contentRef.current.style.transition = 'none';

          // Overlay становится прозрачным пропорционально движению (Instagram-стиль)
          const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
          if (overlay && modalHeightRef.current) {
            // Прозрачность уменьшается пропорционально движению (25-30% высоты = полное закрытие)
            const threshold = modalHeightRef.current * 0.3;
            const opacity = Math.max(0, 0.8 * (1 - diff / threshold));
            overlay.style.opacity = opacity.toString();
            overlay.style.transition = 'none';
          }
        }
      } else if (side === "right" && startX !== null) {
        const currentXPos = e.touches[0].clientX;
        const diff = currentXPos - startX;

        // Разрешаем свайп только вправо (модалка следует за пальцем)
        if (diff > 0 && contentRef.current) {
          e.preventDefault(); // Предотвращаем скролл страницы

          // Вычисляем скорость для инерции
          const now = Date.now();
          if (lastXRef.current !== null && lastTimeRef.current !== null) {
            const deltaX = currentXPos - lastXRef.current;
            const deltaTime = now - lastTimeRef.current;
            if (deltaTime > 0) {
              velocityRef.current = deltaX / deltaTime;
            }
          }
          lastXRef.current = currentXPos;
          lastTimeRef.current = now;

          // Модалка следует за пальцем
          const maxDrag = modalWidthRef.current ? modalWidthRef.current * 1.2 : 400;
          setCurrentX(diff);
          contentRef.current.style.transform = `translateX(${Math.min(diff, maxDrag)}px)`;
          contentRef.current.style.transition = 'none';

          // Overlay становится прозрачным пропорционально движению
          const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
          if (overlay && modalWidthRef.current) {
            const threshold = modalWidthRef.current * 0.3;
            const opacity = Math.max(0, 0.8 * (1 - diff / threshold));
            overlay.style.opacity = opacity.toString();
            overlay.style.transition = 'none';
          }
        }
      }
    };

    const handleTouchEnd = (e?: React.TouchEvent) => {
      if (side === "bottom" && (startY === null || !isDragging)) return;
      if (side === "right" && (startX === null || !isDragging)) return;
      if (side !== "bottom" && side !== "right") return;

      if (!contentRef.current) return;

      // КРИТИЧНО: Проверяем, что модалка еще открыта
      const currentState = contentRef.current.getAttribute('data-state');
      if (currentState !== 'open') {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Sheet] handleTouchEnd: Modal not open, state:', currentState);
        }
        // Сбрасываем состояния
        setStartY(null);
        setCurrentY(null);
        setStartX(null);
        setCurrentX(null);
        setIsDragging(false);
        return;
      }

      // Если модалка уже закрывается, не обрабатываем
      if (isClosingRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Sheet] handleTouchEnd: Modal is closing, ignoring');
        }
        return;
      }

      // Вычисляем расстояние свайпа напрямую из последней позиции пальца
      let dragDistance = 0;

      if (side === "bottom") {
        dragDistance = currentY || 0;
        // Если есть событие touchEnd, вычисляем расстояние из него
        if (e && e.changedTouches && e.changedTouches.length > 0 && startY !== null) {
          const endY = e.changedTouches[0].clientY;
          dragDistance = endY - startY;
        }
      } else if (side === "right") {
        dragDistance = currentX || 0;
        // Если есть событие touchEnd, вычисляем расстояние из него
        if (e && e.changedTouches && e.changedTouches.length > 0 && startX !== null) {
          const endX = e.changedTouches[0].clientX;
          dragDistance = endX - startX;
        }
      }

      // Очень простой порог - если свайпнули больше 50px, закрываем
      const shouldClose = dragDistance > 50;

      // Отладочная информация
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sheet] TouchEnd:', {
          side,
          dragDistance,
          shouldClose,
          hasOnOpenChange: !!onOpenChange,
          currentY,
          currentX,
          startY,
          startX
        });
      }

      if (shouldClose) {
        // Предотвращаем множественные вызовы закрытия
        if (isClosingRef.current) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Sheet] Already closing, ignoring duplicate close attempt');
          }
          return;
        }
        isClosingRef.current = true;

        // КРИТИЧНО: Убираем ВСЕ кастомные стили СИНХРОННО перед закрытием
        // Это нужно сделать до вызова onOpenChange, чтобы Radix UI мог управлять анимацией
        requestAnimationFrame(() => {
          if (contentRef.current) {
            // Убираем все inline стили, которые могут конфликтовать с Radix UI
            contentRef.current.style.transform = '';
            contentRef.current.style.transition = '';
            contentRef.current.style.touchAction = '';
          }

          // Плавно гасим overlay из текущего состояния
          const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement | null;
          if (overlay) {
            const currentOpacity = window.getComputedStyle(overlay).opacity;
            overlay.style.transition = 'opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)';
            overlay.style.opacity = currentOpacity;
            requestAnimationFrame(() => {
              overlay.style.opacity = '0';
            });
          }

          // Теперь вызываем закрытие после того, как стили убраны
          // Способ 1: Через onOpenChange (приоритетный способ)
          if (onOpenChange) {
            try {
              onOpenChange(false);
              if (process.env.NODE_ENV === 'development') {
                console.log('[Sheet] Method 1: onOpenChange(false) called after style cleanup');
              }
            } catch (error) {
              console.error('[Sheet] Error calling onOpenChange:', error);
              // Если ошибка, сбрасываем флаг
              isClosingRef.current = false;
            }
          } else {
            // Если нет onOpenChange, пробуем другие способы
            try {
              const closeButton = contentRef.current?.querySelector('button[data-radix-dialog-close]') as HTMLElement;
              if (closeButton) {
                closeButton.click();
                if (process.env.NODE_ENV === 'development') {
                  console.log('[Sheet] Method 2: Close button clicked');
                }
              } else {
                console.warn('[Sheet] No way to close modal - onOpenChange not provided and no close button found!');
                isClosingRef.current = false;
              }
            } catch (error) {
              console.error('[Sheet] Error closing modal:', error);
              isClosingRef.current = false;
            }
          }

          // Принудительный сброс флага через 500ms на случай, если закрытие не произошло
          setTimeout(() => {
            if (isClosingRef.current) {
              const isStillOpen = contentRef.current?.getAttribute('data-state') === 'open';
              if (isStillOpen) {
                console.warn('[Sheet] Modal still open after 500ms, forcing state reset');
                // Принудительно убираем все стили и скрываем overlay
                if (contentRef.current) {
                  contentRef.current.style.transform = '';
                  contentRef.current.style.transition = '';
                  contentRef.current.style.touchAction = '';
                }
                const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
                if (overlay) {
                  overlay.style.opacity = '0';
                  overlay.style.pointerEvents = 'none';
                }
              }
              isClosingRef.current = false;
            }
          }, 500);
        });
      } else {
        // Instagram-стиль: возврат на место с spring animation
        const isStillOpen = contentRef.current.getAttribute('data-state') === 'open';

        if (isStillOpen) {
          // Плавный возврат с easing (spring-like)
          requestAnimationFrame(() => {
            if (contentRef.current) {
              contentRef.current.style.transform = '';
              // Используем spring-like easing для естественного возврата
              contentRef.current.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }

            const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
            if (overlay) {
              overlay.style.opacity = '0.8';
              overlay.style.transition = 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }
          });
        } else {
          // Если модалка уже закрыта, просто сбрасываем стили
          if (contentRef.current) {
            contentRef.current.style.transform = '';
            contentRef.current.style.transition = '';
          }
        }

        // Восстанавливаем touchAction после небольшой задержки
        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.style.touchAction = '';
          }
        }, 50);
      }

      // Сбрасываем состояния
      setStartY(null);
      setCurrentY(null);
      setIsDragging(false);
      velocityRef.current = 0;
      lastYRef.current = null;
      lastTimeRef.current = null;
      modalHeightRef.current = null;
    };

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={contentRef}
          className={cn(sheetVariants({ side }), className)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => handleTouchEnd(e)}
          onInteractOutside={(e) => {
            // КРИТИЧНО: Предотвращаем закрытие модалки при клике на контент
            // Radix UI закрывает модалку при клике вне контента (на overlay), но мы не хотим закрывать при клике на сам контент
            const target = e.target as HTMLElement;

            // Если клик внутри контента модалки - предотвращаем закрытие
            if (contentRef.current && contentRef.current.contains(target)) {
              e.preventDefault();
              return;
            }

            // Если клик на интерактивный элемент внутри контента - предотвращаем закрытие
            const interactiveElements = ['button', 'a', 'input', 'select', 'textarea', '[role="tab"]', '[role="button"]', '[role="link"]'];
            const isInteractive = interactiveElements.some(selector => {
              if (selector.startsWith('[')) {
                return target.closest(selector) !== null;
              }
              return target.closest(selector) !== null || target.tagName.toLowerCase() === selector;
            });

            // Если клик на интерактивный элемент - предотвращаем закрытие
            if (isInteractive && contentRef.current && contentRef.current.contains(target)) {
              e.preventDefault();
              return;
            }

            // Вызываем оригинальный обработчик, если он был передан
            props.onInteractOutside?.(e);
          }}
          onPointerDownOutside={(e) => {
            // КРИТИЧНО: Предотвращаем закрытие при клике на контент
            const target = e.target as HTMLElement;

            // Если клик внутри контента модалки - предотвращаем закрытие
            if (contentRef.current && contentRef.current.contains(target)) {
              e.preventDefault();
              return;
            }

            // Вызываем оригинальный обработчик, если он был передан
            props.onPointerDownOutside?.(e);
          }}
          onOpenAutoFocus={(e) => {
            // Предотвращаем автофокус на первый элемент при открытии (может мешать свайпу)
            e.preventDefault();
            props.onOpenAutoFocus?.(e);
          }}
          style={{
            // GPU ускорение для плавных анимаций (только когда не перетаскиваем)
            willChange: isDragging ? "transform" : "auto",
            // Плавный easing для анимаций закрытия/открытия (только когда не перетаскиваем)
            transition: isDragging ? undefined : "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
            ...(side === "bottom"
              ? {
                borderTopLeftRadius: props.style?.borderTopLeftRadius ?? "28px",
                borderTopRightRadius: props.style?.borderTopRightRadius ?? "28px",
                boxShadow:
                  props.style?.boxShadow ??
                  "0 -20px 45px rgba(6, 10, 25, 0.35)",
              }
              : {}),
          }}
          {...props}
        >
          {/* Скрытые элементы доступности для Radix */}
          <SheetPrimitive.Title className="sr-only">Модальное окно</SheetPrimitive.Title>
          <SheetPrimitive.Description className="sr-only">Содержимое модального окна</SheetPrimitive.Description>

          {/* Индикатор для свайпа вниз (только для bottom sheet) - Instagram-стиль */}
          {side === "bottom" && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/30 rounded-full z-10 transition-opacity duration-200"
              style={{
                opacity: isDragging ? 0.5 : 1,
              }}
            />
          )}
          {children}
          {!hideCloseButton && (
            <SheetPrimitive.Close className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left select-none", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground select-none", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
