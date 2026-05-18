/**
 * TestExitDialog — стильный выход из теста (по образцу ExitDuelModal).
 * Адаптировано под контекст тестирования: цвета, иконки, тексты
 * меняются в зависимости от режима (экзамен / тренировка / марафон).
 */

import { useEffect } from "react";
import { motion } from "@/components/optimized/Motion";
import { DoorOpen, Save, Award, Hourglass } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useIsMobile } from "@/hooks/use-mobile";

type Language = "ru" | "es" | "en";

interface TestExitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    language: Language;
    mode?: string;
}

type TextSet = {
    title: string;
    description: string;
    progressLabel: string;
    progressValue: string;
    rewardLabel: string;
    rewardValue: string;
    timeLabel: string;
    timeValue: string;
    stay: string;
    exit: string;
};

const buildTexts = (mode: string | undefined, language: Language): TextSet => {
    const isExam = mode === "exam" || mode === "exam-russia";
    const isMarathon = mode === "marathon";

    const dict: Record<Language, TextSet> = {
        ru: {
            title: isExam ? "Прервать экзамен?" : isMarathon ? "Покинуть марафон?" : "Выйти из теста?",
            description: isExam
                ? "Экзамен будет засчитан как несданный, попытка израсходуется."
                : isMarathon
                    ? "Серия сбросится — придётся начинать с первого раунда."
                    : "Прогресс не сохранится, ответы будут потеряны.",
            progressLabel: "Прогресс",
            progressValue: "Сбросится",
            rewardLabel: isExam ? "Попытка" : "Награды",
            rewardValue: isExam ? "Сгорит" : "Не получите",
            timeLabel: "Время",
            timeValue: "Потеряется",
            stay: isExam ? "Продолжить экзамен" : "Остаться",
            exit: "Выйти всё равно",
        },
        es: {
            title: isExam ? "¿Interrumpir el examen?" : isMarathon ? "¿Abandonar el maratón?" : "¿Salir del test?",
            description: isExam
                ? "El examen contará como no aprobado y se consumirá un intento."
                : isMarathon
                    ? "La racha se reiniciará y deberás empezar desde la ronda 1."
                    : "Tu progreso se perderá y las respuestas no se guardarán.",
            progressLabel: "Progreso",
            progressValue: "Se borrará",
            rewardLabel: isExam ? "Intento" : "Recompensas",
            rewardValue: isExam ? "Se gasta" : "No se obtienen",
            timeLabel: "Tiempo",
            timeValue: "Se pierde",
            stay: isExam ? "Seguir examen" : "Continuar",
            exit: "Salir de todos modos",
        },
        en: {
            title: isExam ? "Quit the exam?" : isMarathon ? "Leave the marathon?" : "Leave the test?",
            description: isExam
                ? "The exam will count as failed and one attempt will be used."
                : isMarathon
                    ? "Your streak will reset — you'll restart from round 1."
                    : "Your progress will be lost and answers won't be saved.",
            progressLabel: "Progress",
            progressValue: "Will reset",
            rewardLabel: isExam ? "Attempt" : "Rewards",
            rewardValue: isExam ? "Will burn" : "Forfeited",
            timeLabel: "Time",
            timeValue: "Wasted",
            stay: isExam ? "Continue exam" : "Stay",
            exit: "Leave anyway",
        },
    };

    return dict[language] ?? dict.ru;
};

export const TestExitDialog = ({ open, onOpenChange, language, mode }: TestExitDialogProps) => {
    const isMobile = useIsMobile();
    const t = buildTexts(mode, language);
    const isExam = mode === "exam" || mode === "exam-russia";

    useEffect(() => {
        if (open) haptics.warning();
    }, [open]);

    const handleExit = () => {
        onOpenChange(false);
        // Прямая навигация, чтобы обойти любые route-блокеры.
        window.location.href = "/tests";
    };

    const handleStay = () => {
        onOpenChange(false);
    };

    const accent = isExam ? "amber" : "blue";

    const Content = (
        <div className="relative flex flex-col h-full w-full">
            {isMobile && (
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
                </div>
            )}

            {/* Header icon with subtle animation */}
            <div className={cn("flex justify-center", isMobile ? "pt-4 pb-4" : "pt-2 pb-6")}>
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative"
                >
                    <motion.div
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <DoorOpen
                            className={cn(
                                "w-16 h-16",
                                accent === "amber"
                                    ? "text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                                    : "text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                            )}
                        />
                    </motion.div>
                    <motion.div
                        className={cn(
                            "absolute inset-0 -z-10 rounded-full blur-2xl",
                            accent === "amber" ? "bg-amber-500/20" : "bg-blue-500/15"
                        )}
                        animate={{ opacity: [0.3, 0.55, 0.3], scale: [1.1, 1.3, 1.1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                </motion.div>
            </div>

            {/* Title + description */}
            <div className="text-center px-6 pb-6 space-y-2">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{t.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                    {t.description}
                </p>
            </div>

            {/* Impact cards */}
            <div className="px-6 pb-8">
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { icon: Save, label: t.progressLabel, value: t.progressValue },
                        { icon: Award, label: t.rewardLabel, value: t.rewardValue },
                        { icon: Hourglass, label: t.timeLabel, value: t.timeValue },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="group flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-colors text-center"
                        >
                            <div className="p-2 rounded-full bg-background">
                                <item.icon
                                    className={cn(
                                        "w-4 h-4 transition-colors",
                                        accent === "amber"
                                            ? "text-muted-foreground group-hover:text-amber-500"
                                            : "text-muted-foreground group-hover:text-blue-500"
                                    )}
                                />
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                    {item.label}
                                </span>
                                <span
                                    className={cn(
                                        "text-xs font-bold",
                                        accent === "amber"
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-blue-600 dark:text-blue-400"
                                    )}
                                >
                                    {item.value}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className={cn("px-6 space-y-3", isMobile ? "pb-6" : "pb-2")}>
                <Button
                    onClick={handleStay}
                    className={cn(
                        "w-full h-14 text-base font-bold rounded-2xl border-0",
                        "text-white",
                        "transition-all duration-200 active:scale-[0.98]",
                        accent === "amber"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/20"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-500/20"
                    )}
                >
                    {t.stay}
                </Button>

                <Button
                    onClick={handleExit}
                    variant="ghost"
                    className={cn(
                        "w-full h-12 text-sm font-medium rounded-xl",
                        "text-muted-foreground hover:text-red-500",
                        "bg-transparent hover:bg-red-500/10",
                        "transition-all duration-200"
                    )}
                >
                    {t.exit}
                </Button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="bottom"
                    onOpenChange={onOpenChange}
                    className={cn(
                        "rounded-t-[32px] border-t-0",
                        "bg-background",
                        "p-0 pb-safe",
                        "max-h-[85vh]",
                        "overflow-hidden ring-1 ring-border"
                    )}
                    hideCloseButton
                >
                    {Content}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "max-w-[380px] p-0 border-0",
                    "bg-background/90 backdrop-blur-3xl",
                    "shadow-2xl shadow-black/10 dark:shadow-black/50",
                    "rounded-[32px]",
                    "ring-1 ring-border",
                    "overflow-hidden"
                )}
            >
                <div
                    className={cn(
                        "absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-[60px] pointer-events-none",
                        accent === "amber" ? "bg-amber-500/10" : "bg-blue-500/10"
                    )}
                />
                <div className="relative">{Content}</div>
            </DialogContent>
        </Dialog>
    );
};
