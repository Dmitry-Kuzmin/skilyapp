/**
 * PaddleCheckoutModal — Модалка оплаты через Paddle
 *
 * Стратегия:
 * 1. Telegram Mini App → Telegram.WebApp.openLink() (100% надёжно)
 * 2. Мобильный браузер → Vaul Drawer c Inline чекаутом (современный UX)
 * 3. Десктоп → Overlay поверх нашего UI (не уходим со страницы)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { getPaddleInstance, getPaddleInstanceSync } from "@/lib/paddle";
import { useLanguage } from "@/contexts/LanguageContext";
import { isTelegramMiniApp, getTelegramWebApp } from "@/lib/telegram";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, AlertCircle, CreditCard, ShieldCheck } from "lucide-react";
import type { Paddle } from "@paddle/paddle-js";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaddleCheckoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transactionId: string | null;
    checkoutUrl?: string | null;
    onSuccess?: () => void;
}

const CONTAINER_CLASS = "paddle-checkout-frame";

export function PaddleCheckoutModal({
    open,
    onOpenChange,
    transactionId,
    checkoutUrl,
    onSuccess,
}: PaddleCheckoutModalProps) {
    const { language } = useLanguage();
    const isMobile = useIsMobile();
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const paddleRef = useRef<Paddle | null>(null);
    const initDoneRef = useRef<string | null>(null);
    const locale = language === "ru" ? "ru" : language === "es" ? "es" : "en";
    const successUrl = `${window.location.origin}/purchase/success?transaction_id={transaction_id}`;

    // Открытие Overlay на десктопе (не уходим со страницы)
    const openOverlay = useCallback(async () => {
        if (!transactionId) return;
        try {
            let paddle = paddleRef.current || getPaddleInstanceSync();
            if (!paddle) paddle = await getPaddleInstance();
            if (!paddle) throw new Error("Paddle SDK not available");

            paddle.Checkout.open({
                transactionId,
                settings: {
                    displayMode: "overlay",
                    theme: "dark",
                    locale,
                    successUrl,
                },
                // @ts-expect-error eventCallback not in types but works per docs
                eventCallback: (event: any) => {
                    if (event.name === "checkout.completed") {
                        toast.success("Оплата прошла успешно! 🎉");
                        onSuccess?.();
                        onOpenChange(false);
                    }
                    if (event.name === "checkout.closed") {
                        onOpenChange(false);
                    }
                },
            });
            // Закрываем нашу оболочку — overlay отрисован поверх
            onOpenChange(false);
        } catch (err: any) {
            setErrorMsg(err.message || "Не удалось открыть форму оплаты");
            setStatus("error");
        }
    }, [transactionId, locale, successUrl, onSuccess, onOpenChange]);

    // Открытие Inline внутри Drawer (мобилка)
    const openInline = useCallback(async () => {
        if (!transactionId) return;
        setStatus("loading");
        setErrorMsg(null);
        try {
            let paddle = paddleRef.current || getPaddleInstanceSync();
            if (!paddle) paddle = await getPaddleInstance();
            if (!paddle) throw new Error("Paddle SDK not initialized");

            paddleRef.current = paddle;

            // Небольшая задержка чтобы Drawer успел отрисоваться в DOM
            await new Promise((r) => setTimeout(r, 400));

            const containers = document.getElementsByClassName(CONTAINER_CLASS);
            const container = containers[0] as HTMLElement | undefined;

            if (!container) {
                console.warn("[PaddleCheckoutModal] Container not found, falling back to overlay");
                onOpenChange(false); // Закрываем Drawer перед overlay
                await new Promise((r) => setTimeout(r, 300));
                await openOverlay();
                return;
            }

            // Очищаем контейнер от старого iframe
            container.innerHTML = "";

            (paddle.Checkout.open as (opts: any) => void)({
                transactionId,
                settings: {
                    displayMode: "inline",
                    frameTarget: CONTAINER_CLASS,
                    frameInitialHeight: 450,
                    frameStyle: "width: 100%; border: none; background: transparent;",
                    theme: "dark",
                    locale,
                    successUrl,
                },
                eventCallback: (event: any) => {
                    console.log("[PaddleCheckoutModal] Event:", event.name, event.data);
                    switch (event.name) {
                        case "checkout.loaded":
                            setStatus("ready");
                            break;
                        case "checkout.completed":
                            toast.success("Оплата прошла успешно! 🎉");
                            onSuccess?.();
                            setTimeout(() => onOpenChange(false), 1500);
                            break;
                        case "checkout.error":
                            setErrorMsg(event.data?.error?.message || event.data?.message || "Ошибка оплаты");
                            setStatus("error");
                            break;
                        default:
                            break;
                    }
                },
            });
        } catch (err: any) {
            console.error("[PaddleCheckoutModal] Error:", err);
            setErrorMsg(err.message || "Не удалось загрузить форму оплаты");
            setStatus("error");
        }
    }, [transactionId, locale, successUrl, onSuccess, onOpenChange, openOverlay]);

    useEffect(() => {
        if (!open || !transactionId) return;
        // Уже инициализировали для этой транзакции
        if (initDoneRef.current === transactionId) return;
        initDoneRef.current = transactionId;

        // 1. Telegram Mini App → openLink
        if (isTelegramMiniApp()) {
            const webApp = getTelegramWebApp();
            const url = checkoutUrl || null;
            if (url && webApp?.openLink) {
                webApp.openLink(url);
            } else if (url) {
                window.open(url, "_blank");
            }
            onOpenChange(false);
            return;
        }

        // 2. Мобилка → Inline в Drawer (уже открылся)
        if (isMobile) {
            openInline();
            return;
        }

        // 3. Десктоп → Overlay (закрываем Drawer и открываем overlay)
        openOverlay();
    }, [open, transactionId, isMobile, checkoutUrl, openInline, openOverlay, onOpenChange]);

    // Сброс состояния при закрытии
    const handleClose = useCallback(() => {
        initDoneRef.current = null;
        setStatus("idle");
        setErrorMsg(null);
        onOpenChange(false);
    }, [onOpenChange]);

    // На десктопе или Telegram — не рендерим Drawer вообще (openOverlay/openLink сам справится)
    if (!isMobile || isTelegramMiniApp()) return null;

    return (
        <Drawer
            open={open}
            onOpenChange={(val) => { if (!val) handleClose(); }}
            dismissible={status !== "loading"}
            snapPoints={[0.92, 1]}
        >
            <DrawerContent className="bg-[#0A0D14] border-none rounded-t-[28px] overflow-hidden focus:outline-none">
                {/* Шапка */}
                <DrawerHeader className="px-6 pt-6 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <DrawerTitle className="text-white font-black text-lg leading-tight">
                                Безопасная оплата
                            </DrawerTitle>
                            <DrawerDescription className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                Защищено Paddle
                            </DrawerDescription>
                        </div>
                    </div>
                </DrawerHeader>

                {/* Контент */}
                <div className="relative flex-1 overflow-y-auto">
                    {/* Лоадер */}
                    {status === "loading" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0A0D14] z-20">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-indigo-600/10 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                </div>
                                <div className="absolute inset-0 rounded-full animate-ping bg-indigo-600/10" />
                            </div>
                            <p className="text-zinc-400 text-sm font-medium">
                                {locale === "ru" ? "Загрузка безопасной оплаты..." : "Loading secure checkout..."}
                            </p>
                        </div>
                    )}

                    {/* Ошибка */}
                    {status === "error" && (
                        <div className="flex flex-col items-center justify-center p-8 gap-5 min-h-[300px]">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-white font-bold text-base">Упс! Что-то пошло не так</p>
                                <p className="text-zinc-500 text-sm">{errorMsg}</p>
                            </div>
                            <div className="flex gap-3 w-full max-w-xs">
                                <button
                                    onClick={() => { initDoneRef.current = null; setStatus("idle"); openInline(); }}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold transition-all active:scale-95"
                                >
                                    Повторить
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-sm font-bold transition-all active:scale-95"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Контейнер Paddle Inline — ВСЕГДА в DOM */}
                    <div
                        className={cn(
                            CONTAINER_CLASS,
                            "w-full transition-opacity duration-500",
                            status === "ready" ? "opacity-100" : "opacity-0 pointer-events-none",
                        )}
                        style={{ minHeight: 450 }}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 shrink-0 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-[11px] text-zinc-600 font-mono uppercase tracking-widest">
                        Secure checkout by Paddle
                    </p>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
