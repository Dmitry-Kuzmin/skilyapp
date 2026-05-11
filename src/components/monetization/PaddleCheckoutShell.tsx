import { useEffect, useState, useRef } from "react";
import Confetti from "react-confetti";
import { Drawer as VaulDrawer } from "vaul";
import { ShieldCheck, ArrowLeft, X as XIcon, CheckCircle2 } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPaddleInstance, getPaddleInstanceSync } from "@/lib/paddle";
import { cn } from "@/lib/utils";
import type { Paddle } from "@paddle/paddle-js";

export const PADDLE_FRAME_CLASS = "paywall-paddle-frame";

interface PaddleCheckoutShellProps {
  transactionId?: string | null;
  onClose?: () => void;
  onCompleted?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SHELL_T: Record<string, { back: string; protected: string; success: string; successDesc: string; closing: string }> = {
  ru: { back: "Назад к планам", protected: "Защищено Paddle", success: "Оплата прошла!", successDesc: "Premium активирован 🎉", closing: "Закрытие через" },
  en: { back: "Back to plans", protected: "Secured by Paddle", success: "Payment successful!", successDesc: "Premium activated 🎉", closing: "Closing in" },
  es: { back: "Volver a los planes", protected: "Protegido por Paddle", success: "¡Pago realizado!", successDesc: "Premium activado 🎉", closing: "Cerrando en" },
};

function SuccessOverlay({ t, countdown, containerRef }: {
  t: typeof SHELL_T.en;
  countdown: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white overflow-hidden">
      {size.w > 0 && (
        <Confetti
          width={size.w}
          height={size.h}
          numberOfPieces={220}
          recycle={false}
          gravity={0.25}
          colors={["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"]}
        />
      )}
      <div className="relative flex flex-col items-center gap-5 px-8 text-center z-10">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center shadow-lg shadow-emerald-100">
            <CheckCircle2 className="w-13 h-13 text-emerald-500" strokeWidth={1.5} style={{ width: 52, height: 52 }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shadow-md">
            <span className="text-white text-base font-bold tabular-nums leading-none">{countdown}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{t.success}</p>
          <p className="text-base text-slate-500">{t.successDesc}</p>
        </div>
        <p className="text-xs text-slate-400 mt-1">{t.closing} {countdown}s...</p>
      </div>
    </div>
  );
}

export function PaddleCheckoutShell({ transactionId: txProp, onClose, onCompleted, open, onOpenChange }: PaddleCheckoutShellProps) {
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const t = SHELL_T[language] || SHELL_T.en;
  const paddleLocale = language === "ru" ? "ru" : language === "es" ? "es" : "en";
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCompletedRef = useRef(onCompleted);
  const onOpenChangeRef = useRef(onOpenChange);
  const onCloseRef = useRef(onClose);
  onCompletedRef.current = onCompleted;
  onOpenChangeRef.current = onOpenChange;
  onCloseRef.current = onClose;

  const transactionId = open === false ? null : (txProp ?? null);

  useEffect(() => {
    if (!transactionId) return;
    const existing = getPaddleInstanceSync();
    if (existing) { setPaddle(existing); return; }
    getPaddleInstance().then(inst => inst && setPaddle(inst)).catch(() => { });
  }, [transactionId]);

  // Countdown: 3 → 0 → close
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onCompletedRef.current?.();
      onOpenChangeRef.current?.(false);
      onCloseRef.current?.();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;

    const openCheckout = async () => {
      const instance = paddle ?? getPaddleInstanceSync() ?? await getPaddleInstance();
      if (cancelled || !instance) return;

      await new Promise(r => setTimeout(r, 500));
      if (cancelled) return;

      const container = document.getElementsByClassName(PADDLE_FRAME_CLASS)[0];
      if (!container) return;
      container.innerHTML = "";

      (instance.Checkout.open as (opts: unknown) => void)({
        transactionId,
        settings: {
          displayMode: "inline",
          frameTarget: PADDLE_FRAME_CLASS,
          frameInitialHeight: 450,
          frameStyle: "width: 100%; border: none;",
          theme: "light",
          locale: paddleLocale,
        },
        eventCallback: (event: { name: string }) => {
          if (event?.name === "checkout.completed") {
            setCountdown(3);
          }
        },
      });
    };

    openCheckout();
    return () => { cancelled = true; };
  }, [transactionId, paddle, paddleLocale]);

  const handleClose = () => {
    try { paddle?.Checkout.close(); } catch { /* noop */ }
    onOpenChange?.(false);
    onClose?.();
  };

  if (isMobile) {
    return (
      <VaulDrawer.Root
        open={!!transactionId}
        onOpenChange={(next) => { if (!next) handleClose(); }}
        closeThreshold={0.2}
        shouldScaleBackground={false}
        dismissible={countdown === null}
        modal={true}
        noBodyStyles={false}
      >
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-[8px]" />
          <VaulDrawer.Content
            className="fixed bottom-0 left-0 right-0 z-[99999] flex flex-col bg-white rounded-[40px] mx-2 mb-4 overflow-hidden outline-none shadow-[0_-12px_60px_rgba(0,0,0,0.35)] border border-slate-100"
            onContextMenu={e => e.stopPropagation()}
            onPointerOut={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing" data-vaul-drag-region>
              <div className="w-9 h-1.5 rounded-full bg-slate-200/80" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 shrink-0" data-vaul-drag-region>
              <button
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-900 active:scale-90 transition-all shadow-sm"
                aria-label={t.back}
                data-vaul-no-drag
              >
                <XIcon className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{t.protected}</span>
              </div>
            </div>
            {/* Success overlay covers entire drawer content */}
            <div ref={containerRef} className="relative">
              {countdown !== null && <SuccessOverlay t={t} countdown={countdown} containerRef={containerRef} />}
              <div
                className={cn(PADDLE_FRAME_CLASS, "px-2 pb-4 min-h-[320px]")}
                style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
              />
            </div>
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      </VaulDrawer.Root>
    );
  }

  return (
    <UnifiedModal
      open={!!transactionId}
      onOpenChange={(next) => { if (!next) handleClose(); }}
      showTitleBar={false}
      showHandle={false}
      hideCloseButton={true}
      className="p-0 border-0 bg-white sm:max-w-[560px] overflow-hidden rounded-3xl"
      contentClassName="p-0 bg-white border-0"
    >
      <div ref={containerRef} className="relative flex flex-col bg-white md:min-h-[640px]">
        {/* Success overlay covers entire modal */}
        {countdown !== null && <SuccessOverlay t={t} countdown={countdown} containerRef={containerRef} />}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
          <button
            onClick={handleClose}
            className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
            aria-label={t.back}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.protected}</span>
          </div>
        </div>
        <div
          className={cn(PADDLE_FRAME_CLASS, "px-4 pt-2 min-h-[450px] flex-1")}
          style={{ paddingBottom: "24px" }}
        />
      </div>
    </UnifiedModal>
  );
}
