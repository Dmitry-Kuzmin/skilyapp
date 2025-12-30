import { cn } from "@/lib/utils";
import { motion } from "@/components/optimized/Motion";
import { LucideIcon, Lock, ChevronRight, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TestCategoryCardProps {
    title: string;
    description?: string;
    icon: LucideIcon;
    progress?: {
        current: number;
        total: number;
        label?: string;
    };
    onClick?: () => void;
    variant?: "default" | "premium" | "locked";
    className?: string;
    gradient?: string;
    image?: string;
    number?: number;
}

export const TestCategoryCard = ({
    title,
    description,
    icon: Icon,
    progress,
    onClick,
    variant = "default",
    className,
    gradient,
    image,
    number
}: TestCategoryCardProps) => {
    const isLocked = variant === "locked";
    const isPremium = variant === "premium";

    return (
        <motion.div
            whileHover={!isLocked ? { y: -4, scale: 1.01 } : {}}
            whileTap={!isLocked ? { scale: 0.98 } : {}}
            onClick={!isLocked ? onClick : undefined}
            className={cn(
                "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300",
                !isLocked && "cursor-pointer hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20",
                isLocked && "opacity-70 grayscale cursor-not-allowed",
                className
            )}
        >
            {/* Background Gradient/Image */}
            <div className="absolute inset-0 z-0">
                {image ? (
                    <>
                        <img
                            src={image}
                            alt={title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                    </>
                ) : (
                    <div
                        className="h-full w-full opacity-20 transition-opacity duration-500 group-hover:opacity-30"
                        style={{ background: gradient || "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)" }}
                    />
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex h-full flex-col p-5 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl backdrop-blur-xl shadow-lg transition-transform duration-300 group-hover:rotate-6",
                        isPremium ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white"
                    )}>
                        {isLocked ? <Lock className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>

                    {isPremium && (
                        <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400 backdrop-blur-md border border-amber-500/20">
                            <Star className="h-3 w-3 fill-amber-400" />
                            PREMIUM
                        </div>
                    )}

                    {number && !isPremium && (
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/5 text-xs font-bold text-white/50 border border-white/5">
                            {number}
                        </div>
                    )}
                </div>

                {/* Text */}
                <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-bold text-white leading-tight group-hover:text-primary-foreground transition-colors">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm text-white/60 line-clamp-2">
                            {description}
                        </p>
                    )}
                </div>

                {/* Footer / Progress */}
                <div className="mt-6">
                    {progress ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-white/70">
                                <span>{progress.label || "Прогресс"}</span>
                                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                            </div>
                            <Progress
                                value={(progress.current / progress.total) * 100}
                                className="h-2 bg-white/10"
                                indicatorClassName={cn(
                                    "transition-all duration-500",
                                    gradient ? "" : "bg-gradient-to-r from-blue-500 to-violet-500"
                                )}
                                style={gradient ? { background: gradient } : undefined}
                            />
                        </div>
                    ) : (
                        <div className={cn(
                            "flex items-center gap-2 text-sm font-medium transition-colors",
                            isLocked ? "text-white/40" : "text-white/80 group-hover:text-white"
                        )}>
                            <span>{isLocked ? "Недоступно" : "Начать"}</span>
                            {!isLocked && <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
