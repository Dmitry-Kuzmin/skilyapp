import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { Toaster as Sonner, toast } from "sonner";
import { useSafeArea } from "@/hooks/useSafeArea";
import { isTelegramMiniApp } from "@/lib/telegram";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system", resolvedTheme } = useTheme();
  const safeArea = useSafeArea();
  const isTelegram = isTelegramMiniApp();
  const isMobile = useIsMobile();

  // Центрируем уведомления если это Telegram или мобильное устройство
  const shouldCenter = isTelegram || isMobile;

  // Вычисляем отступ сверху с учетом safe area - ИДЕНТИЧНО Page.tsx
  // Используем max() для выбора максимального значения из:
  // 1. --tg-content-safe-area-inset-top (UI Telegram: кнопка назад)
  // 2. --tg-safe-area-inset-top (системный отступ: notch/Dynamic Island)
  // 3. env(safe-area-inset-top) (iOS PWA)
  // 4. 16px минимальный отступ
  const marginTop = shouldCenter
    ? 'max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 16px)'
    : undefined;

  // Используем Portal чтобы избежать проблем с z-index и stacking context (transform, filter и т.д.)
  // Это гарантирует, что уведомления всегда будут поверх всего
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // КРИТИЧНО: пропускаем клики сквозь контейнер
        zIndex: 2147483647, // Максимальный Z-Index
      }}
    >
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-progress {
          position: relative;
        }
        .toast-progress::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: 100%;
          background-color: var(--primary, #3b82f6);
          opacity: 0.3;
          animation: toast-progress 4000ms linear forwards;
          transform-origin: left;
        }
        .group:hover .toast-progress::after {
          animation-play-state: paused;
        }
        
        /* КРИТИЧНО: Контроль отступов между уведомлениями */
        [data-sonner-toaster] li {
          margin-top: 8px !important;
        }
        [data-sonner-toaster] li:first-child {
          margin-top: 0 !important;
        }
      `}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position="top-right"
        expand={false} // Возвращаем режим стопки (stack) для компактности
        visibleToasts={5} // Показываем до 5 в стопке
        gap={14} // Комфортный отступ
        richColors
        closeButton
        offset={isMobile ? "calc(env(safe-area-inset-top) + 16px)" : "24px"} // Чуть больше отступ на десктопе
        toastOptions={{
          classNames: {
            toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:active:scale-95 transition-all duration-200",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            closeButton: "hover:bg-muted/50 focus:ring-0",
          },
          // Убрали marginTop, так как он ломал позиционирование. Отступ управляется offset.
        }}
        {...props}
      />
    </div>,
    document.body
  );
};

export { Toaster, toast };
