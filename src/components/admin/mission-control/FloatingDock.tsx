import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    RefreshCcw,
    Trash2
} from "lucide-react";

interface FloatingDockProps {
    onNext: () => void;
    onPrev: () => void;
    onApprove: () => void;
    onReject: () => void;
    onRegenerate: () => void;
    hasSelection: boolean;
    isGenerating?: boolean;
    className?: string;
}

export function FloatingDock({
    onNext,
    onPrev,
    onApprove,
    onReject,
    onRegenerate,
    hasSelection,
    isGenerating = false,
    className
}: FloatingDockProps) {
    if (!hasSelection) return null;

    return (
        <div className={cn(
            "flex items-center gap-2 p-2 rounded-2xl bg-zinc-950/40 backdrop-blur-xl border border-zinc-800/50 shadow-2xl transition-all hover:scale-[1.02]",
            className
        )}>
            {/* Prev */}
            <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white"
                onClick={onPrev}
                title="Previous (Left Arrow)"
            >
                <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="w-px h-6 bg-white/10 mx-1" />

            {/* Actions Group */}
            <div className="flex items-center gap-2">
                {/* Reject */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                    onClick={onReject}
                    title="Reject / Delete (Del)"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>

                {/* Regenerate */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-10 w-10 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20",
                        isGenerating && "animate-spin"
                    )}
                    onClick={onRegenerate}
                    title="Regenerate (R)"
                >
                    <RefreshCcw className="w-4 h-4" />
                </Button>

                {/* Approve */}
                <Button
                    className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20"
                    onClick={onApprove}
                    title="Approve & Next (Enter)"
                >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                </Button>
            </div>

            <div className="w-px h-6 bg-white/10 mx-1" />

            {/* Next */}
            <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white"
                onClick={onNext}
                title="Next (Right Arrow)"
            >
                <ChevronRight className="w-5 h-5" />
            </Button>
        </div>
    );
}
