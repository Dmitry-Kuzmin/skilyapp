/**
 * ExamFailureModal — Robust Layout with AlertDialog
 */

import { ArrowRight, XOctagon } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ExamFailureModalProps {
    open: boolean;
    reason: string;
    onViewResults: () => void;
}

export function ExamFailureModal({
    open,
    reason,
    onViewResults,
}: ExamFailureModalProps) {
    return (
        <AlertDialog open={open} onOpenChange={() => { }}>
            <AlertDialogContent
                className={cn(
                    "max-w-[360px] p-5",
                    "bg-slate-900/95 backdrop-blur-xl",
                    "border border-white/10",
                    "rounded-3xl",
                    "overflow-visible"
                )}
            >
                <AlertDialogHeader className="space-y-4 text-center">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="p-4 rounded-full bg-gradient-to-b from-red-500 to-red-600 shadow-lg shadow-red-500/30">
                            <XOctagon className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <AlertDialogTitle className="text-xl font-bold text-white">
                        Экзамен завершён
                    </AlertDialogTitle>

                    {/* Reason */}
                    <div className="space-y-2">
                        <p className="text-red-300 font-medium text-sm leading-relaxed">
                            {reason}
                        </p>

                        <p className="text-slate-400 text-xs leading-relaxed">
                            К сожалению, вы допустили критическое количество ошибок.
                            Попробуйте ещё раз!
                        </p>
                    </div>
                </AlertDialogHeader>

                {/* Action Button */}
                <button
                    type="button"
                    onClick={() => {
                        console.log('ExamFailureModal: onViewResults clicked');
                        onViewResults();
                    }}
                    className={cn(
                        "w-full h-12 mt-4 rounded-xl",
                        "bg-gradient-to-b from-blue-500 to-blue-600",
                        "text-white font-semibold text-base",
                        "shadow-lg shadow-blue-500/25",
                        "hover:brightness-110",
                        "active:scale-[0.98]",
                        "transition-all duration-200",
                        "flex items-center justify-center gap-2",
                        "cursor-pointer"
                    )}
                >
                    К результатам <ArrowRight className="w-4 h-4" />
                </button>
            </AlertDialogContent>
        </AlertDialog>
    );
}
