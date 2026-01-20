import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    RefreshCcw,
    Trash2,
    Archive
} from "lucide-react";

interface FloatingDockProps {
    onNext: () => void;
    onPrev: () => void;
    onApprove: () => void;
    onReject: () => void;
    onArchive?: () => void;
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
    onArchive,
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
                {/* Archive (Soft Delete) */}
                {onArchive && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20"
                        onClick={onArchive}
                        title="Archive (Move to Pool)"
                    >
                        <Archive className="w-4 h-4" />
                    </Button>
                )}

                {/* Trash (Hard Delete) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                    onClick={onReject}
                    title="Trash (Delete Forever)"
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
                    className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20"
                    onClick={onApprove}
                    title="Approve CURRENT & Next (Enter)"
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
