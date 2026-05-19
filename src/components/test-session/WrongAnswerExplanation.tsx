/**
 * WrongAnswerExplanation — модалка с объяснением после неверного ответа.
 *
 * Логика: в практических режимах (не экзамен/блиц) при неверном ответе
 * показываем оверлей с объяснением + кнопка "Понял", заблокированная на
 * minReadTimeMs (default 2.5s). Это заставляет пользователя ВСЁ-ТАКИ
 * прочесть, а не просто нажимать дальше на автомате.
 *
 * Pedagogy: ошибка — самый ценный момент в обучении, не пропускать его.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptics } from "@/lib/haptics";

type Language = "ru" | "es" | "en";

interface WrongAnswerExplanationProps {
    open: boolean;
    onAcknowledge: () => void;
    onSkip?: () => void; // опционально — для premium "skip explanation"
    explanation: string | null;
    correctAnswerText: string | null;
    language: Language;
    minReadTimeMs?: number;
}

const I18N = {
    ru: {
        title: "Разбираем ошибку",
        correctLabel: "Правильный ответ",
        button: "Понял",
        countdown: (s: number) => `Подожди ${s}с…`,
        skipHint: "Прочитай — это поможет запомнить",
    },
    es: {
        title: "Analicemos el error",
        correctLabel: "Respuesta correcta",
        button: "Entendido",
        countdown: (s: number) => `Espera ${s}s…`,
        skipHint: "Léelo — te ayudará a recordar",
    },
    en: {
        title: "Let's review",
        correctLabel: "Correct answer",
        button: "Got it",
        countdown: (s: number) => `Wait ${s}s…`,
        skipHint: "Read it — it helps you remember",
    },
};

export const WrongAnswerExplanation = ({
    open,
    onAcknowledge,
    onSkip,
    explanation,
    correctAnswerText,
    language,
    minReadTimeMs = 2500,
}: WrongAnswerExplanationProps) => {
    const isMobile = useIsMobile();
    const t = I18N[language] ?? I18N.ru;
    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(minReadTimeMs / 1000));

    useEffect(() => {
        if (!open) return;
        setSecondsLeft(Math.ceil(minReadTimeMs / 1000));
        haptics.warning();

        const start = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, Math.ceil((minReadTimeMs - elapsed) / 1000));
            setSecondsLeft(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 250);

        return () => clearInterval(interval);
    }, [open, minReadTimeMs]);

    const canAck = secondsLeft <= 0;

    const Body = (
        <div className="relative flex flex-col h-full w-full">
            {isMobile && (
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
                </div>
            )}

            {/* Icon */}
            <div className={cn("flex justify-center", isMobile ? "pt-3 pb-4" : "pt-2 pb-5")}>
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 240, damping: 16 }}
                    className="relative"
                >
                    <Lightbulb className="w-14 h-14 text-amber-500 drop-shadow-[0_0_22px_rgba(245,158,11,0.55)] fill-amber-500/15" />
                    <motion.div
                        className="absolute inset-0 -z-10 rounded-full bg-amber-500/20 blur-2xl"
                        animate={{ opacity: [0.3, 0.55, 0.3], scale: [1.1, 1.3, 1.1] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>
            </div>

            {/* Title */}
            <h2 className="text-center text-xl font-bold text-foreground tracking-tight px-6">
                {t.title}
            </h2>

            {/* Correct answer block */}
            {correctAnswerText && (
                <div className="mx-6 mt-4 rounded-2xl p-4 bg-emerald-500/8 border border-emerald-500/25">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center mt-0.5">
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 mb-1">
                                {t.correctLabel}
                            </p>
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200 leading-snug">
                                {correctAnswerText}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Explanation body */}
            {explanation && (
                <div className="mx-6 mt-4 rounded-2xl p-4 bg-muted/40 border border-border">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {explanation}
                    </p>
                </div>
            )}

            {!explanation && !correctAnswerText && (
                <p className="text-center text-sm text-muted-foreground mx-6 mt-2">
                    {t.skipHint}
                </p>
            )}

            {/* Actions */}
            <div className={cn("px-6 mt-6 space-y-2", isMobile ? "pb-6" : "pb-4")}>
                <Button
                    onClick={() => canAck && onAcknowledge()}
                    disabled={!canAck}
                    className={cn(
                        "w-full h-12 text-base font-bold rounded-2xl border-0 text-white",
                        "transition-all duration-200 active:scale-[0.98]",
                        canAck
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/20"
                            : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                    )}
                >
                    {canAck ? t.button : t.countdown(secondsLeft)}
                </Button>

                {onSkip && canAck && (
                    <button
                        onClick={onSkip}
                        className="w-full h-9 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <X className="w-3 h-3" />
                            {t.skipHint}
                        </span>
                    </button>
                )}
            </div>

            {/* Subtle countdown progress at top */}
            <AnimatePresence>
                {!canAck && (
                    <motion.div
                        key="countdown-bar"
                        initial={{ scaleX: 1 }}
                        animate={{ scaleX: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: minReadTimeMs / 1000, ease: "linear" }}
                        style={{ transformOrigin: "left" }}
                        className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                    />
                )}
            </AnimatePresence>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={() => { /* контролируется через onAcknowledge */ }}>
                <SheetContent
                    side="bottom"
                    onOpenChange={() => { /* */ }}
                    className={cn(
                        "rounded-t-[32px] border-t-0",
                        "bg-background p-0 pb-safe",
                        "max-h-[85vh] overflow-y-auto ring-1 ring-border"
                    )}
                    hideCloseButton
                >
                    {Body}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={() => { /* */ }}>
            <DialogContent
                className={cn(
                    "max-w-[440px] p-0 border-0",
                    "bg-background/95 backdrop-blur-3xl",
                    "shadow-2xl shadow-black/10 dark:shadow-black/50",
                    "rounded-[32px] ring-1 ring-border overflow-hidden"
                )}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-amber-500/10 blur-[60px] pointer-events-none" />
                <div className="relative">{Body}</div>
            </DialogContent>
        </Dialog>
    );
};
