/**
 * TestExitDialog — Nuclear Option
 * Uses window.location.href to guarantee navigation
 */

import { DoorOpen, ArrowLeft } from "lucide-react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface TestExitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    language: "ru" | "es" | "en";
}

export const TestExitDialog = ({ open, onOpenChange, language }: TestExitDialogProps) => {

    const handleExit = (e: React.MouseEvent) => {
        e.preventDefault();

        console.log('TestExitDialog: NUCLEAR EXIT INITIATED');

        // 1. Force close logic
        onOpenChange(false);

        // 2. Direct Browser Navigation (Bypasses React Router blocks)
        window.location.href = '/tests';
    };

    const texts = {
        ru: {
            title: "Выйти из теста?",
            description: "Прогресс не будет сохранён, тест будет прерван.",
            stay: "Остаться",
            exit: "Выйти"
        },
        es: {
            title: "¿Abandonar el test?",
            description: "Tu progreso se perderá y el examen se cancelará.",
            stay: "Continuar",
            exit: "Salir"
        },
        en: {
            title: "Leave the test?",
            description: "Your progress won't be saved, the test will be cancelled.",
            stay: "Stay",
            exit: "Leave"
        }
    };

    const t = texts[language] || texts.ru;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className={cn(
                    "!fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]",
                    "max-w-[380px] p-0",
                    "bg-white dark:bg-slate-900 backdrop-blur-xl",
                    "border border-slate-200 dark:border-white/10",
                    "shadow-2xl dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)]",
                    "rounded-3xl"
                )}
            >
                <div className="p-6 text-center">
                    <AlertDialogHeader className="space-y-4">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="p-4 rounded-full bg-gradient-to-b from-slate-600 to-slate-700 shadow-[0_0_25px_rgba(100,116,139,0.3)]">
                                <DoorOpen className="w-8 h-8 text-white" />
                            </div>

                            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                {t.title}
                            </AlertDialogTitle>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {t.description}
                        </p>
                    </AlertDialogHeader>

                    <div className="mt-6 space-y-3">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className={cn(
                                "w-full h-12 rounded-2xl font-bold",
                                "bg-gradient-to-b from-blue-500 to-blue-600",
                                "text-white",
                                "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_25px_-5px_rgba(59,130,246,0.25)]",
                                "hover:brightness-110",
                                "active:scale-[0.98]",
                                "transition-all duration-200",
                                "flex items-center justify-center gap-2",
                                "cursor-pointer"
                            )}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t.stay}
                        </button>

                        <button
                            type="button"
                            onClick={handleExit}
                            className={cn(
                                "w-full h-12 rounded-2xl font-semibold",
                                "bg-white/5 hover:bg-white/10",
                                "text-red-400 hover:text-red-300",
                                "active:scale-[0.98]",
                                "transition-all duration-200",
                                "cursor-pointer"
                            )}
                        >
                            {t.exit}
                        </button>
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};
