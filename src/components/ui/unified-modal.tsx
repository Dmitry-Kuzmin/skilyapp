import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer } from "vaul";
import { ModalSkeleton, type ModalSkeletonVariant } from "@/components/ui/modal-skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModalRoute } from "@/hooks/useModalRoute";
import { useModalStack } from "@/hooks/useModalStack";
import { getModalConfig, type ModalType } from "@/lib/modal-config";
import { X } from "lucide-react";

interface UnifiedModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void; // Сделали опциональным для безопасности
  children: React.ReactNode;
  title?: string;
  modalType?: ModalType; // Тип модалки для определения размеров (small, shop, profile, duelPass, admin, default)
  hideCloseButton?: boolean;
  snapPoints?: string[];
  initialSnap?: number;
  showTitleBar?: boolean;
  loading?: boolean;
  skeletonVariant?: ModalSkeletonVariant;
  skeleton?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showHandle?: boolean;
  modalRouteKey?: string;
  fullscreen?: boolean; // Полноэкранный режим с залитым фоном
  preventClose?: boolean; // Предотвратить закрытие (клик вне, ESC) - полезно для форм с несохраненными данными
  zIndex?: number; // Z-index для управления наложением модалок (используется глобальным менеджером)
  nested?: boolean; // Вложенная модалка (для модалок внутри модалок)
  handleOnly?: boolean; // Свайп только по handle (контент не реагирует)
  closeThreshold?: number; // Порог для закрытия (0.1-0.9, по умолчанию 0.25)
  onDrag?: (event: React.PointerEvent, percentageDragged: number) => void; // Callback при свайпе
  setBackgroundColorOnScale?: boolean; // Изменять цвет фона при масштабировании
}

/**
 * Instagram-подобная модалка с bottom sheet поведением
 * 
 * Особенности:
 * - На мобильных: открывается снизу с начальной высотой 55%, расширяется до 95% при скролле
 * - На десктопе: центрированная модалка
 * - Поддержка свайпа для закрытия (через Vaul)
 * - Плавное расширение при скролле контента
 * - Оптимизировано для быстрого открытия и плавных анимаций
 */
export function UnifiedModal({
  open,
  onOpenChange,
  children,
  title,
  modalType = 'default',
  hideCloseButton = false,
  snapPoints = ['60vh', '92vh'],
  initialSnap = 1, // По умолчанию открываем на полную высоту (второй snapPoint)
  showTitleBar = true,
  loading = false,
  skeletonVariant = "default",
  skeleton,
  className,
  contentClassName,
  showHandle = true,
  modalRouteKey,
  fullscreen = false,
  preventClose = false,
  zIndex,
  nested = false,
  handleOnly = false,
  closeThreshold = 0.25,
  onDrag,
  setBackgroundColorOnScale = false,
}: UnifiedModalProps) {
  const isMobile = useIsMobile();
  
  // Получаем конфигурацию размеров для типа модалки
  const modalConfig = getModalConfig(modalType);
  const sizeConfig = isMobile ? modalConfig.mobile : modalConfig.desktop;
  
  // Используем URL только если modalRouteKey задан
  const route = modalRouteKey ? useModalRoute(modalRouteKey) : null;
  
  // Единый источник истины: open prop имеет приоритет
  // Если modalRouteKey задан, синхронизируем с URL, но open prop - главный
  const resolvedOpen = React.useMemo(() => {
    // open prop всегда имеет приоритет
    if (open !== undefined) {
      return open;
    }
    // Если open не задан, используем URL (для программного открытия через URL)
    if (modalRouteKey && route) {
      return route.isOpen;
    }
    return false;
  }, [modalRouteKey, open, route?.isOpen]);
  
  // Уникальный ID модалки для отслеживания в стеке
  const modalId = React.useMemo(() => modalRouteKey || `modal-${Date.now()}-${Math.random()}`, [modalRouteKey]);
  
  // Отслеживаем модалку в стеке для предотвращения вложенности
  const { isTopModal } = useModalStack(modalId, resolvedOpen, title || modalRouteKey);
  
  // ОПТИМИЗАЦИЯ: Не рендерим контент когда модалка закрыта
  // Мемоизация контента для оптимизации производительности
  const renderContent = React.useMemo(() => {
    // Если модалка закрыта - не рендерим детей (экономим ресурсы)
    if (!resolvedOpen) {
      return null;
    }
    
    if (loading) {
      return skeleton ?? <ModalSkeleton variant={skeletonVariant} />;
    }
    
    return children;
  }, [resolvedOpen, loading, skeleton, skeletonVariant, children]);
  
  // Ref для предотвращения множественных вызовов во время анимации
  const isAnimatingRef = React.useRef(false);
  const lastStateRef = React.useRef<boolean | null>(null);

  // КРИТИЧНО: Сбрасываем флаги при изменении resolvedOpen
  React.useEffect(() => {
    // При открытии модалки сбрасываем все флаги
    if (resolvedOpen) {
      isAnimatingRef.current = false;
      lastStateRef.current = null;
      if (process.env.NODE_ENV === 'development') {
        console.log('[UnifiedModal] Modal opened - flags reset');
      }
    }
  }, [resolvedOpen]);

  // Улучшенный обработчик: предотвращаем множественные вызовы во время анимации
  const handleOpenChange = React.useCallback(
    (state: boolean) => {
      // КРИТИЧНО: Если модалка открывается, сбрасываем флаги сразу
      if (state) {
        isAnimatingRef.current = false;
        lastStateRef.current = null;
      }

      // Предотвращаем повторные вызовы с тем же состоянием только если это закрытие
      // При открытии всегда разрешаем
      if (!state && lastStateRef.current === state) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[UnifiedModal] Ignoring duplicate close call');
        }
        return;
      }

      // Предотвращаем вызовы во время анимации только при закрытии
      // При открытии всегда разрешаем
      if (!state && isAnimatingRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[UnifiedModal] Ignoring close call during animation');
        }
        return;
      }

      // Устанавливаем флаг анимации только при закрытии
      if (!state) {
        isAnimatingRef.current = true;
      }
      lastStateRef.current = state;

      // Обновляем prop (основной источник истины)
      if (typeof onOpenChange === 'function') {
      onOpenChange(state);
      }
      
      // Синхронизируем URL (если используется)
      if (modalRouteKey && route) {
        if (state) {
          route.openModal();
        } else {
          route.closeModal();
        }
      }

      // Сбрасываем флаг после завершения анимации (200ms) только при закрытии
      if (!state) {
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 200);
      }
    },
    [modalRouteKey, route, onOpenChange]
  );

  // Синхронизация URL -> prop: если URL меняется извне (прямой переход), обновляем prop
  // Но только если open prop не был явно установлен (undefined)
  // Используем ref для предотвращения циклов
  const isSyncingRef = React.useRef(false);
  React.useEffect(() => {
    if (!modalRouteKey || !route || open !== undefined || isSyncingRef.current) return;
    
    // Синхронизируем prop с URL только если open не задан явно
    if (route.isOpen !== open) {
      isSyncingRef.current = true;
      // Проверяем, что onOpenChange является функцией перед вызовом
      if (typeof onOpenChange === 'function') {
      onOpenChange(route.isOpen);
      } else {
        console.warn('[UnifiedModal] onOpenChange is not a function:', typeof onOpenChange, onOpenChange);
      }
      // Сбрасываем флаг после следующего тика
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    }
  }, [modalRouteKey, route?.isOpen, onOpenChange, open]);

  // Vaul сам управляет высотой через snapPoints - убираем старую логику

  // ОПТИМИЗАЦИЯ: Early return если модалка закрыта
  // Не рендерим DOM вообще пока не открыта
  if (!resolvedOpen && !loading) {
    return null;
  }

  const shouldShowHandle = isMobile && showHandle;

  // ВАЖНО: Хуки ВСЕГДА должны вызываться в одинаковом порядке
  // Преобразуем snapPoints для Vaul (даже на десктопе, чтобы не нарушать порядок хуков)
  const vaulSnapPoints = React.useMemo(() => {
    return snapPoints.map(sp => {
      const num = parseFloat(sp);
      return num / 100; // Vaul expects 0-1 range (0.6 = 60%)
    });
  }, [snapPoints]);

  // Определяем начальную точку (clamp to valid index)
  const safeInitialSnap = React.useMemo(() => {
    return Math.min(Math.max(0, initialSnap), vaulSnapPoints.length - 1);
  }, [initialSnap, vaulSnapPoints.length]);

  if (isMobile) {

    return (
      <Drawer.Root 
        open={resolvedOpen} 
          onOpenChange={handleOpenChange}
        shouldScaleBackground={!nested}
        dismissible={!preventClose}
        modal={true} // Vaul автоматически блокирует body scroll
        nested={nested}
        snapPoints={vaulSnapPoints}
        activeSnapPoint={vaulSnapPoints[safeInitialSnap]}
        fadeFromIndex={0}
        closeThreshold={closeThreshold}
        handleOnly={handleOnly}
        onDrag={onDrag}
        setBackgroundColorOnScale={setBackgroundColorOnScale}
        preventScrollRestoration={true}
        noBodyStyles={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Drawer.Content
          className={cn(
              "bg-background flex flex-col rounded-t-[24px]",
              "fixed bottom-0 left-0 right-0 z-50",
              "border-t border-border/50",
              "shadow-[0_-16px_40px_rgba(15,23,42,0.25)]",
              "focus:outline-none",
              // Важно: max-h для контента
              "max-h-[96vh]",
            className
          )}
          >
            {/* Drawer Handle */}
          {shouldShowHandle && (
              <div className="sticky top-0 z-10 shrink-0 flex justify-center pt-3 pb-2 select-none" aria-hidden="true">
              <div className="h-1 w-12 rounded-full bg-white/70 dark:bg-white/60 shadow-[0_3px_12px_rgba(0,0,0,0.35)]" />
            </div>
          )}
            
            {/* Close Button */}
            {!hideCloseButton && (
              <button
                onClick={() => handleOpenChange(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-20"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Закрыть</span>
              </button>
            )}
            
            {/* Title */}
          {title && showTitleBar && (
            <div className="px-4 pb-2 pt-3 border-b border-border/50 sm:px-6 sm:pb-3 sm:pt-4">
                <h2 className="text-xl font-bold pr-8">{title}</h2>
            </div>
          )}

            {/* Scrollable Content */}
          <div
            data-scrollable
              data-vaul-no-drag
            className={cn(
                "flex-1 overflow-y-auto px-4 py-3 scrollbar-none sm:px-6 sm:py-4 overscroll-contain",
                // Минимальная высота чтобы контент был видим
                "min-h-[200px]",
                // Важно: touch-action для правильной работы скролла
                "touch-action-pan-y",
              contentClassName
            )}
              style={{
                // Принудительный скролл (важно для Vaul)
                WebkitOverflowScrolling: 'touch',
              }}
          >
            {renderContent}
          </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // На десктопе используем обычный Dialog (центрированный) или полноэкранный режим
  if (fullscreen) {
    const modalTitle = title || "Модальное окно";
    const modalDescription = title ? `Содержимое модального окна: ${title}` : "Содержимое модального окна";
    
    return (
      <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
        <DialogContent 
          fullscreen={true}
          className={cn(className)}
          autoAccessibility={false}
          preventClose={preventClose}
        >
          <DialogHeader className={showTitleBar ? "px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 border-b border-border/50" : "sr-only"}>
            <DialogTitle>
              {modalTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {modalDescription}
            </DialogDescription>
          </DialogHeader>
          <div
            data-scrollable
            className={cn(
              "flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4 scrollbar-none",
              contentClassName
            )}
          >
            {renderContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Всегда рендерим DialogTitle и DialogDescription для accessibility, даже если showTitleBar=false
  const modalTitle = title || "Модальное окно";
  const modalDescription = title ? `Содержимое модального окна: ${title}` : "Содержимое модального окна";

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        modalType={modalType}
        className={cn(
          // Используем стандартизированные размеры из modal-config
          sizeConfig.maxWidth || "max-w-[560px]",
          sizeConfig.maxHeight || "max-h-[80vh]",
          "p-0 flex flex-col",
          className
        )}
        autoAccessibility={false}
        preventClose={preventClose}
      >
        <DialogHeader className={showTitleBar && title ? "px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-border/50" : "sr-only"}>
          <DialogTitle>
            {modalTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {modalDescription}
          </DialogDescription>
        </DialogHeader>
        <div
          data-scrollable
          className={cn(
            "overflow-y-auto px-4 md:px-6 py-4 scrollbar-none flex-1 min-h-0",
            contentClassName
          )}
        >
          {renderContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
