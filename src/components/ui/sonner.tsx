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

  // Вычисляем отступ сверху с учетом safe area для Telegram
  // ИЛИ используем env(safe-area-inset-top) как базу
  // Добавляем небольшой отступ (16px) для красоты
  const marginTop = isTelegram
    ? 'calc(max(var(--tg-content-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px)) + 16px)'
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
          overflow: hidden;
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
      `}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position={shouldCenter ? "top-center" : "top-right"}
        richColors
        closeButton={true}
        visibleToasts={5}
        gap={8} // Чуть уменьшаем отступ для плотности
        offset={isMobile ? 16 : 24}
        containerAriaLabel="Уведомления"
        toastOptions={{
          duration: 4000,
          classNames: {
            toast:
              "group toast toast-progress group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg pointer-events-auto font-medium",
            description: "group-[.toast]:text-muted-foreground",
            actionButton:
              "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton:
              "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            closeButton:
              "group-[.toast]:absolute group-[.toast]:!right-3 group-[.toast]:!top-4 group-[.toast]:!transform-none group-[.toast]:rounded-full group-[.toast]:p-1.5 group-[.toast]:text-muted-foreground group-[.toast]:opacity-70 group-[.toast]:hover:opacity-100 group-[.toast]:hover:bg-accent group-[.toast]:transition-all pointer-events-auto z-[60]",
          },
        }}
        style={{
          marginTop,
        }}
        {...props}
      />
    </div>,
    document.body
  );
};

export { Toaster, toast };
