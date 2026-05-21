import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { Toaster as Sonner, toast } from "sonner";
import { useSafeArea } from "@/hooks/useSafeArea";
import { isTelegramMiniApp } from "@/lib/telegram";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const safeArea = useSafeArea();
  const isTelegram = isTelegramMiniApp();
  const isMobile = useIsMobile();

  const shouldCenter = isTelegram || isMobile;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2147483647,
      }}
    >
      <style>{`
        /* ── Base toast shell ── */
        [data-sonner-toaster] [data-sonner-toast] {
          background: rgba(15, 17, 23, 0.92) !important;
          border: 1px solid rgba(255, 255, 255, 0.07) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
          border-radius: 14px !important;
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.5),
            0 1px 0 rgba(255,255,255,0.04) inset !important;
          padding: 13px 16px !important;
          gap: 10px !important;
          min-width: 280px !important;
          max-width: 360px !important;
          pointer-events: auto !important;
        }

        /* ── Title text ── */
        [data-sonner-toaster] [data-sonner-toast] [data-title] {
          font-size: 13.5px !important;
          font-weight: 600 !important;
          letter-spacing: -0.01em !important;
          color: rgba(255,255,255,0.92) !important;
          line-height: 1.4 !important;
        }

        /* ── Description text ── */
        [data-sonner-toaster] [data-sonner-toast] [data-description] {
          font-size: 12px !important;
          color: rgba(255,255,255,0.45) !important;
          line-height: 1.5 !important;
          margin-top: 2px !important;
        }

        /* ── Icon container ── */
        [data-sonner-toaster] [data-sonner-toast] [data-icon] {
          width: 18px !important;
          height: 18px !important;
          flex-shrink: 0 !important;
          margin-top: 1px !important;
        }

        /* ── Success: subtle emerald accent ── */
        [data-sonner-toaster] [data-sonner-toast][data-type="success"] {
          border-left: 2px solid rgba(52, 211, 153, 0.7) !important;
          border-color: rgba(52, 211, 153, 0.15) rgba(255,255,255,0.07) rgba(255,255,255,0.07) rgba(52, 211, 153, 0.7) !important;
        }
        [data-sonner-toaster] [data-sonner-toast][data-type="success"] [data-icon] svg {
          color: #34d399 !important;
          stroke: #34d399 !important;
        }

        /* ── Error: subtle red accent ── */
        [data-sonner-toaster] [data-sonner-toast][data-type="error"] {
          border-left: 2px solid rgba(248, 113, 113, 0.7) !important;
          border-color: rgba(248, 113, 113, 0.15) rgba(255,255,255,0.07) rgba(255,255,255,0.07) rgba(248, 113, 113, 0.7) !important;
        }
        [data-sonner-toaster] [data-sonner-toast][data-type="error"] [data-icon] svg {
          color: #f87171 !important;
          stroke: #f87171 !important;
        }

        /* ── Info: subtle blue accent ── */
        [data-sonner-toaster] [data-sonner-toast][data-type="info"] {
          border-left: 2px solid rgba(96, 165, 250, 0.7) !important;
          border-color: rgba(96, 165, 250, 0.15) rgba(255,255,255,0.07) rgba(255,255,255,0.07) rgba(96, 165, 250, 0.7) !important;
        }
        [data-sonner-toaster] [data-sonner-toast][data-type="info"] [data-icon] svg {
          color: #60a5fa !important;
          stroke: #60a5fa !important;
        }

        /* ── Warning: subtle amber accent ── */
        [data-sonner-toaster] [data-sonner-toast][data-type="warning"] {
          border-left: 2px solid rgba(251, 191, 36, 0.7) !important;
          border-color: rgba(251, 191, 36, 0.15) rgba(255,255,255,0.07) rgba(255,255,255,0.07) rgba(251, 191, 36, 0.7) !important;
        }
        [data-sonner-toaster] [data-sonner-toast][data-type="warning"] [data-icon] svg {
          color: #fbbf24 !important;
          stroke: #fbbf24 !important;
        }

        /* ── Close button ── */
        [data-sonner-toaster] [data-sonner-toast] [data-close-button] {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 6px !important;
          color: rgba(255,255,255,0.4) !important;
          top: 10px !important;
          right: 10px !important;
          left: auto !important;
          width: 20px !important;
          height: 20px !important;
          transition: background 0.15s, color 0.15s !important;
        }
        [data-sonner-toaster] [data-sonner-toast] [data-close-button]:hover {
          background: rgba(255,255,255,0.12) !important;
          color: rgba(255,255,255,0.8) !important;
        }

        /* ── Gap between stacked toasts ── */
        [data-sonner-toaster] li {
          margin-top: 8px !important;
        }
        [data-sonner-toaster] li:first-child {
          margin-top: 0 !important;
        }

        /* ── Pointer events ── */
        [data-sonner-toaster] {
          pointer-events: auto !important;
        }

        /* ── Top offset (safe area aware) ── */
        [data-sonner-toaster][data-y-position="top"] {
          top: ${shouldCenter
            ? 'max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 48px), 48px)'
            : '24px'} !important;
        }
      `}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position="top-right"
        expand={false}
        visibleToasts={5}
        gap={8}
        closeButton
        offset={shouldCenter ? "16px" : "24px"}
        toastOptions={{
          classNames: {
            toast: "active:scale-95 transition-transform duration-150",
            description: "whitespace-pre-line",
          },
          duration: 4000,
        }}
        {...props}
      />
    </div>,
    document.body
  );
};

export { Toaster, toast };
