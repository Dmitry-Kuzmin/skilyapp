import * as React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useExternalOverlay } from "@/hooks/useExternalOverlay";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// MarqueeTitle — scrolls long text when it overflows the flex-1 container
// ---------------------------------------------------------------------------
function MarqueeTitle({ children }: { children: React.ReactNode }) {
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = React.useState(false);

  React.useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.offsetWidth + 1);
    check();
    const obs = new ResizeObserver(check);
    obs.observe(el);
    return () => obs.disconnect();
  }, [children]);

  if (!overflow) {
    return (
      <span ref={measureRef} className="block truncate">
        {children}
      </span>
    );
  }

  return (
    <span className="block overflow-hidden">
      <span
        className="inline-flex whitespace-nowrap"
        style={{ animation: "modal-marquee 10s linear infinite" }}
      >
        <span>{children}</span>
        {/* duplicate for seamless loop */}
        <span aria-hidden className="pl-16">{children}</span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Haptic helper — wraps the close callback with a light impact
// ---------------------------------------------------------------------------
function hapticImpact() {
  try {
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
  } catch {
    /* noop outside Telegram */
  }
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: string;
  className?: string;
  contentClassName?: string;
  hideCloseButton?: boolean;
  preventClose?: boolean;
  headerContent?: React.ReactNode;
  /** Right slot in mobile nav bar (e.g. info icon) */
  headerRight?: React.ReactNode;
  snapPoints?: (number | string)[];
  activeSnapPoint?: number | string | null;
  onSnapPointChange?: (snapPoint: number | string | null) => void;
  hideHandle?: boolean;
  fadeFromIndex?: number;
  fullscreen?: boolean;
  mobileFullscreen?: boolean;
  dismissible?: boolean;
}

// ---------------------------------------------------------------------------
// ResponsiveModal
// ---------------------------------------------------------------------------
/** Mobile: Vaul bottom-sheet with iOS-style nav bar. Desktop: centered Dialog. */
export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
  contentClassName,
  hideCloseButton = false,
  preventClose = false,
  headerContent,
  headerRight,
  snapPoints,
  activeSnapPoint,
  onSnapPointChange,
  hideHandle = false,
  fadeFromIndex,
  fullscreen = false,
  mobileFullscreen = false,
  dismissible,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();
  const isExternalOverlay = useExternalOverlay(open);

  // ── Scroll-hide header ────────────────────────────────────────────────────
  const lastScrollY = React.useRef(0);
  const [headerHidden, setHeaderHidden] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false); // > 0

  // Reset on open/close
  React.useEffect(() => {
    if (!open) {
      setHeaderHidden(false);
      setIsScrolled(false);
      lastScrollY.current = 0;
    }
  }, [open]);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    setIsScrolled(y > 4);
    // hide on scroll down past 40 px, reveal on any upward movement
    if (y > lastScrollY.current && y > 40) {
      setHeaderHidden(true);
    } else if (y < lastScrollY.current) {
      setHeaderHidden(false);
    }
    lastScrollY.current = y;
  }, []);

  // ── Fullscreen status-bar color ───────────────────────────────────────────
  React.useEffect(() => {
    if (!mobileFullscreen || !open) return;
    try {
      const tg = (window as any).Telegram?.WebApp;
      // Use Telegram's own bg_color preset so it always matches the sheet bg
      tg?.setHeaderColor?.("bg_color");
    } catch { /* noop */ }
    return () => {
      try {
        const tg = (window as any).Telegram?.WebApp;
        tg?.setHeaderColor?.("secondary_bg_color");
      } catch { /* noop */ }
    };
  }, [mobileFullscreen, open]);

  // ── Haptic close ──────────────────────────────────────────────────────────
  const closeWithHaptic = React.useCallback(() => {
    hapticImpact();
    onOpenChange(false);
  }, [onOpenChange]);

  const showCloseBtn = !hideCloseButton && !preventClose;

  // ── Mobile branch ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible={dismissible !== undefined ? dismissible : !preventClose}
        dismissibleThreshold={0.4}
        snapPoints={snapPoints}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={onSnapPointChange}
        {...(snapPoints ? { fadeFromIndex } as any : {})}
        modal={!isExternalOverlay}
        shouldScaleBackground={false}
        repositionInputs={true}
      >
        <DrawerContent
          className={cn(
            "flex flex-col fixed z-[99999] outline-none",
            mobileFullscreen
              ? "inset-x-0 bottom-0 top-0 h-[100dvh] max-h-[100dvh] rounded-none left-0 right-0"
              : "inset-x-2 w-auto max-h-[92dvh] h-auto !rounded-[28px] border border-white/[0.06]",
            // Hide vaul drag-handle when user has scrolled down (frees 14 px)
            "[&_[data-vaul-handle]]:transition-[opacity,transform] [&_[data-vaul-handle]]:duration-200 motion-reduce:[&_[data-vaul-handle]]:transition-none",
            isScrolled
              ? "[&_[data-vaul-handle]]:opacity-0 [&_[data-vaul-handle]]:scale-x-0 [&_[data-vaul-handle]]:pointer-events-none"
              : "[&_[data-vaul-handle]]:opacity-100 [&_[data-vaul-handle]]:scale-x-100",
            className
          )}
          style={
            mobileFullscreen
              ? undefined
              : { bottom: "max(8px, calc(env(safe-area-inset-bottom) + 4px))" }
          }
          hideHandle={hideHandle}
          onInteractOutside={(e) => {
            if (document.body.classList.contains("tc-disable-scroll") || isExternalOverlay) {
              e.preventDefault();
              return;
            }
            const isExternalPortal = (e.composedPath() as Element[]).some((el) => {
              if (!el?.tagName) return false;
              const id = (el instanceof HTMLElement ? el.id : "") || "";
              const cls =
                typeof el.className === "string"
                  ? el.className
                  : ((el as SVGElement).className?.baseVal ?? "");
              return /tc-|ton-|tonconnect|appkit|sonner|paddle|\bgo\d{4,}/.test(`${id} ${cls}`);
            });
            if (isExternalPortal || preventClose) e.preventDefault();
          }}
        >
          {/* Floating × when no title */}
          {!title && showCloseBtn && (
            <button
              onClick={closeWithHaptic}
              className="absolute top-3 left-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-foreground active:bg-white/20 transition-colors motion-reduce:transition-none"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!title && <DrawerTitle className="sr-only">Modal</DrawerTitle>}

          <div className="flex-1 flex flex-col w-full overflow-hidden min-h-0">

            {/* ── iOS nav bar: × | title | right-icon ── */}
            {title && (
              <div
                className={cn(
                  "flex items-center shrink-0 px-3 pt-2 pb-2",
                  "transition-[transform,opacity] duration-250 ease-out motion-reduce:transition-none",
                  headerHidden
                    ? "-translate-y-full opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100"
                )}
                // Negative margin follows the header out so scroll-zone doesn't jump
                style={{ marginBottom: headerHidden ? "-2.75rem" : 0 }}
              >
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  {showCloseBtn && (
                    <button
                      onClick={closeWithHaptic}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-foreground active:bg-white/20 transition-colors motion-reduce:transition-none"
                      aria-label="Закрыть"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <DrawerTitle className="flex-1 text-center text-base font-semibold text-foreground px-1 leading-tight overflow-hidden">
                  <MarqueeTitle>{title}</MarqueeTitle>
                </DrawerTitle>

                {description && (
                  <DrawerDescription className="sr-only">{description}</DrawerDescription>
                )}

                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  {headerRight}
                </div>
              </div>
            )}

            {/* Optional full-width section below nav bar */}
            {headerContent && (
              <div className="shrink-0">{headerContent}</div>
            )}

            {/* Scrollable content */}
            <div
              onScroll={handleScroll}
              className={cn(
                "flex-1 overflow-y-auto min-h-0 outline-none w-full",
                mobileFullscreen ? "px-4 pb-4" : "px-3",
                contentClassName
              )}
              style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
            >
              <div
                className={cn(
                  "flex flex-col min-h-full justify-start",
                  mobileFullscreen ? "pt-2 pb-6" : "pt-2"
                )}
                style={{
                  paddingBottom:
                    "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))",
                }}
              >
                {children}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop branch (unchanged) ────────────────────────────────────────────
  const hasMaxWidth = className?.includes("max-w");
  const defaultMaxWidth = fullscreen
    ? "max-w-none w-screen"
    : hasMaxWidth
    ? ""
    : "sm:max-w-[500px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!isExternalOverlay}>
      <DialogContent
        className={cn(
          defaultMaxWidth,
          fullscreen ? "h-screen rounded-none" : "max-h-[90vh]",
          "flex flex-col p-0",
          className
        )}
        hideCloseButton={hideCloseButton}
        preventClose={preventClose}
      >
        {title && (
          <DialogHeader
            className={cn(
              "shrink-0 px-8 pt-6 pr-16 relative flex flex-row items-center",
              !headerContent && "pb-4 border-b border-white/10"
            )}
          >
            <DialogTitle className="text-xl font-bold text-foreground flex-1">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        {headerContent && (
          <div className="shrink-0 relative z-10">{headerContent}</div>
        )}
        <div
          className={cn("flex-1 overflow-y-auto min-h-0", contentClassName)}
          data-scrollable
          style={{ scrollbarWidth: "none" }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ModalSkeleton
// ---------------------------------------------------------------------------
export function ModalSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-muted rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      ))}
    </div>
  );
}
