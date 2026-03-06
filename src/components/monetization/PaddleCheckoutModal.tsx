import { useEffect, useRef, useState, useCallback } from "react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { getPaddleInstance, getPaddleInstanceSync } from "@/lib/paddle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";
import type { Paddle } from "@paddle/paddle-js";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaddleCheckoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transactionId: string | null;
    onSuccess?: () => void;
}

export function PaddleCheckoutModal({
    open,
    onOpenChange,
    transactionId,
    onSuccess
}: PaddleCheckoutModalProps) {
    const { language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timedOut, setTimedOut] = useState(false);
    const paddleRef = useRef<Paddle | null>(null);
    const initializedRef = useRef<string | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const locale = language === 'ru' ? 'ru' : language === 'es' ? 'es' : 'en';
    const successUrl = `${window.location.origin}/purchase/success?transaction_id={transaction_id}`;

    const clearLoadTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    useEffect(() => {
        if (open && transactionId && initializedRef.current !== transactionId) {
            setLoading(true);
            setError(null);
            setTimedOut(false);
            // Ждём 300мс чтобы модалка отрисовала контейнер в DOM
            const timer = setTimeout(() => { initCheckout(); }, 300);
            return () => clearTimeout(timer);
        }
    }, [open, transactionId]);

    // Очищаем таймаут при закрытии
    useEffect(() => {
        if (!open) clearLoadTimeout();
    }, [open]);

    const tryOverlay = useCallback(async () => {
        if (!transactionId) return;
        try {
            let paddle = paddleRef.current || getPaddleInstanceSync();
            if (!paddle) paddle = await getPaddleInstance();
            if (!paddle) throw new Error("Paddle SDK unavailable");

            paddle.Checkout.open({
                transactionId,
                settings: {
                    displayMode: "overlay",
                    theme: "dark",
                    locale,
                    successUrl,
                },
            });
            // Overlay открылся — закрываем нашу оболочку
            onOpenChange(false);
        } catch {
            setError("Не удалось открыть форму оплаты. Попробуйте обновить страницу.");
            setLoading(false);
        }
    }, [transactionId, locale, successUrl, onOpenChange]);

    const initCheckout = useCallback(async () => {
        try {
            console.log("[PaddleCheckoutModal] Initializing for transaction:", transactionId);

            let paddle = getPaddleInstanceSync();
            if (!paddle) paddle = await getPaddleInstance();

            if (!paddle || !transactionId) {
                throw new Error("Paddle SDK not initialized or transaction missing");
            }

            paddleRef.current = paddle;
            initializedRef.current = transactionId;

            // Очищаем контейнер
            const container = document.getElementsByClassName("paddle-checkout-container")[0] as HTMLElement | undefined;
            if (container) container.innerHTML = "";

            // Если контейнер не найден — сразу переходим на overlay
            if (!container) {
                console.warn("[PaddleCheckoutModal] Container not found, falling back to overlay");
                await tryOverlay();
                return;
            }

            // Таймаут: если inline не загрузился за 8 сек — переходим на overlay
            timeoutRef.current = setTimeout(async () => {
                console.warn("[PaddleCheckoutModal] Inline checkout timed out, falling back to overlay");
                setTimedOut(true);
                setLoading(false);
            }, 8000);

            (paddle.Checkout.open as (opts: any) => void)({
                transactionId,
                settings: {
                    displayMode: "inline",
                    frameTarget: "paddle-checkout-container",
                    frameInitialHeight: 450,
                    frameStyle: "width: 100%; border: none; background: transparent; min-height: 450px;",
                    theme: "dark",
                    locale,
                    successUrl,
                },
                eventCallback: (event: any) => {
                    console.log("[PaddleCheckoutModal] Event:", event.name);
                    if (event.name === "checkout.loaded") {
                        clearLoadTimeout();
                        setLoading(false);
                        setTimedOut(false);
                    }
                    if (event.name === "checkout.completed") {
                        toast.success("Оплата прошла успешно! 🎉");
                        onSuccess?.();
                        setTimeout(() => onOpenChange(false), 1500);
                    }
                    if (event.name === "checkout.error") {
                        clearLoadTimeout();
                        setError("Ошибка: " + (event.data?.error?.message || "Неизвестная ошибка"));
                        setLoading(false);
                    }
                }
            });

        } catch (err: any) {
            console.error("[PaddleCheckoutModal] Error:", err);
            setError(err.message || "Ошибка загрузки оплаты");
            setLoading(false);
        }
    }, [transactionId, locale, successUrl, onSuccess, onOpenChange, tryOverlay]);

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={(val) => {
                if (!val) {
                    clearLoadTimeout();
                    initializedRef.current = null;
                }
                onOpenChange(val);
            }}
            className="max-w-2xl"
            contentClassName="p-0 overflow-hidden bg-[#0A0D14]"
        >
            <div className="relative min-h-[500px] w-full bg-[#0A0D14] flex flex-col items-center justify-center">
                {/* Лоадер */}
                {loading && !error && !timedOut && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0D14] z-10 space-y-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-zinc-400 text-sm font-medium animate-pulse">
                            {locale === 'ru' ? 'Загрузка безопасной оплаты...' : 'Loading secure checkout...'}
                        </p>
                    </div>
                )}

                {/* Таймаут — предлагаем открыть через overlay */}
                {timedOut && !error && (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-5 z-20">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                            <ExternalLink className="w-8 h-8 text-amber-400" />
                        </div>
                        <h3 className="text-xl font-black text-white">Форма оплаты готова</h3>
                        <p className="text-zinc-400 text-sm max-w-xs">
                            Встроенная оплата недоступна в этой среде. Нажмите кнопку ниже чтобы открыть форму.
                        </p>
                        <button
                            onClick={tryOverlay}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all duration-200 text-sm font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
                        >
                            Открыть форму оплаты
                        </button>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                        >
                            Отмена
                        </button>
                    </div>
                )}

                {/* Ошибка */}
                {error && (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 z-20">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Упс! Что-то пошло не так</h3>
                        <p className="text-zinc-400 text-sm max-w-xs">{error}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    initializedRef.current = null;
                                    setError(null);
                                    initCheckout();
                                }}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors text-sm font-bold"
                            >
                                Повторить
                            </button>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors text-sm font-bold"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                )}

                {/* Контейнер Paddle ВСЕГДА в DOM с реальными размерами */}
                <div
                    className={cn(
                        "paddle-checkout-container w-full transition-opacity duration-500",
                        (loading || error || timedOut) ? "opacity-0" : "opacity-100"
                    )}
                    style={{ minHeight: 450 }}
                />

                {!error && !timedOut && (
                    <div className="pb-4 px-6 text-center shrink-0">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                            Secure processing by Paddle
                        </p>
                    </div>
                )}
            </div>
        </ResponsiveModal>
    );
}
