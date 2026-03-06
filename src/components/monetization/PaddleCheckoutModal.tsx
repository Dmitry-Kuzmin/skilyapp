import { useEffect, useRef, useState } from "react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { getPaddleInstance, getPaddleInstanceSync } from "@/lib/paddle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, AlertCircle } from "lucide-react";
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
    const paddleRef = useRef<Paddle | null>(null);
    const initializedRef = useRef<string | null>(null);

    useEffect(() => {
        if (open && transactionId && initializedRef.current !== transactionId) {
            setLoading(true);
            setError(null);
            // Небольшая задержка, чтобы модалка успела отрендерить контейнер в DOM
            const timer = setTimeout(() => {
                initCheckout();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [open, transactionId]);

    const initCheckout = async () => {
        try {
            console.log("[PaddleCheckoutModal] Initializing for transaction:", transactionId);

            let paddle = getPaddleInstanceSync();
            if (!paddle) {
                paddle = await getPaddleInstance();
            }

            if (!paddle || !transactionId) {
                throw new Error("Paddle SDK not initialized or transaction missing");
            }

            paddleRef.current = paddle;
            initializedRef.current = transactionId;

            // Очищаем контейнер перед вставкой (на всякий случай)
            const container = document.getElementById("paddle-checkout-container");
            if (container) container.innerHTML = "";

            paddle.Checkout.open({
                transactionId: transactionId,
                settings: {
                    displayMode: "inline",
                    frameTarget: "paddle-checkout-container",
                    frameInitialHeight: 450,
                    frameStyle: "width: 100%; border: none; background: transparent; min-height: 450px;",
                    theme: "dark",
                    locale: language === 'ru' ? 'ru' : language === 'es' ? 'es' : 'en',
                    successUrl: `${window.location.origin}/purchase/success?transaction_id={transaction_id}`,
                },
                eventCallback: (event: any) => {
                    console.log("[PaddleCheckoutModal] Event:", event.name);
                    if (event.name === "checkout.loaded") {
                        setLoading(false);
                    }
                    if (event.name === "checkout.completed") {
                        toast.success("Оплата прошла успешно!");
                        onSuccess?.();
                        setTimeout(() => onOpenChange(false), 1500);
                    }
                    if (event.name === "checkout.error") {
                        setError("Ошибка Paddle: " + (event.data?.error?.message || "Неизвестная ошибка"));
                        setLoading(false);
                    }
                }
            });

        } catch (err: any) {
            console.error("[PaddleCheckoutModal] Error:", err);
            setError(err.message || "Ошибка загрузки оплаты");
            setLoading(false);
        }
    };

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={(val) => {
                if (!val) initializedRef.current = null;
                onOpenChange(val);
            }}
            className="max-w-2xl"
            contentClassName="p-0 overflow-hidden bg-[#0A0D14]"
        >
            <div className="relative min-h-[500px] w-full bg-[#0A0D14] flex flex-col items-center justify-center">
                {loading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0D14] z-10 space-y-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-zinc-400 text-sm font-medium animate-pulse">
                            {language === 'ru' ? 'Загрузка безопасной оплаты...' : 'Loading secure checkout...'}
                        </p>
                    </div>
                )}

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

                <div
                    id="paddle-checkout-container"
                    className={cn(
                        "w-full min-h-[450px] transition-opacity duration-500",
                        (loading || error) ? "opacity-0 h-0" : "opacity-100 h-auto"
                    )}
                />

                {!error && (
                    <div className="mt-4 pb-6 px-6 text-center shrink-0">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono opacity-50">
                            Secure Cloud processing by Paddle
                        </p>
                    </div>
                )}
            </div>
        </ResponsiveModal>
    );
}
