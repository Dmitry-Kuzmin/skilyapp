import { cn } from "@/lib/utils";
import { motion } from "@/components/optimized/Motion";
import { LucideIcon, Lock, ChevronRight, Star, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface DashboardTestCardProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    progress?: {
        current: number;
        total: number;
        label?: string;
    };
    onClick?: () => void;
    variant?: "hero" | "standard" | "compact" | "locked";
    className?: string;
    gradient?: string; // For hero cards
    image?: string;
    accentColor?: string; // For standard cards (icon color, glow)
}

export const DashboardTestCard = ({
    title,
    subtitle,
    icon: Icon,
    progress,
    onClick,
    variant = "standard",
    className,
    gradient,
    image,
    accentColor = "text-blue-500"
}: DashboardTestCardProps) => {
    const isLocked = variant === "locked";

    // Hero Card (Like "Hello Pilot")
    if (variant === "hero") {
        return (
            <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onClick}
                className={cn(
                    "relative overflow-hidden rounded-[32px] p-8 cursor-pointer transition-all duration-300 shadow-2xl",
                    className
                )}
                style={{
                    background: gradient || "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)"
                }}
            >
                {/* Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-4 text-center md:text-left flex-1">
                        {Icon && (
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-md">
                                <Icon className="h-4 w-4" />
                                <span>Рекомендуем</span>
                            </div>
                        )}
                        <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                            {title}
                        </h2>
                        <p className="text-white/80 text-lg max-w-md">
                            {subtitle}
                        </p>

                        {/* Stats Row */}
                        <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                            <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-2 backdrop-blur-sm">
                                <div className="p-1.5 bg-amber-500 rounded-lg">
                                    <Star className="h-4 w-4 text-white fill-white" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] text-white/60 uppercase font-bold">Опыт</div>
                                    <div className="text-sm font-bold text-white">55 XP</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-2 backdrop-blur-sm">
                                <div className="p-1.5 bg-blue-500 rounded-lg">
                                    <Play className="h-4 w-4 text-white fill-white" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] text-white/60 uppercase font-bold">Тестов</div>
                                    <div className="text-sm font-bold text-white">0</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Big Start Button */}
                    <div className="flex-shrink-0">
                        <div className="group relative flex items-center justify-center w-24 h-24 md:w-32 md:h-32 bg-white rounded-full shadow-lg transition-transform duration-300 hover:scale-105 active:scale-95">
                            <div className="absolute inset-0 rounded-full bg-white blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
                            <div className="relative flex flex-col items-center justify-center text-primary">
                                <Play className="h-8 w-8 md:h-10 md:w-10 fill-current ml-1" />
                                <span className="text-[10px] md:text-xs font-bold mt-1 tracking-widest uppercase">Start</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Standard Dashboard Card (Like "Daily Streak" or "AI Assistant")
    return (
        <motion.div
            whileHover={!isLocked ? { y: -4 } : {}}
            whileTap={!isLocked ? { scale: 0.98 } : {}}
            onClick={!isLocked ? onClick : undefined}
            className={cn(
                "group relative overflow-hidden rounded-[24px] bg-[#151921] border border-white/5 p-6 transition-all duration-300",
                !isLocked && "cursor-pointer hover:border-white/10 hover:shadow-xl hover:shadow-black/50",
                isLocked && "opacity-60 grayscale cursor-not-allowed",
                className
            )}
        >
            {/* Grid Pattern Background */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Glow Effect */}
            <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none",
                accentColor.replace('text-', 'bg-')
            )} />

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/5 transition-colors group-hover:bg-white/10",
                        accentColor
                    )}>
                        {Icon && <Icon className="w-6 h-6" />}
                    </div>
                    {isLocked && <Lock className="w-5 h-5 text-white/20" />}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-white/90 transition-colors">
                        {title}
                    </h3>
                    <p className="text-sm text-white/40 line-clamp-2">
                        {subtitle}
                    </p>
                </div>

                {/* Footer / Progress */}
                <div className="mt-6 pt-4 border-t border-white/5">
                    {progress ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-white/40 tracking-wider">
                                <span>{progress.label || "Прогресс"}</span>
                                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                            </div>
                            <Progress
                                value={(progress.current / progress.total) * 100}
                                className="h-1.5 bg-white/5"
                                indicatorClassName={cn("transition-all duration-500", accentColor.replace('text-', 'bg-'))}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white/30 group-hover:text-white/60 transition-colors">
                                {isLocked ? "Недоступно" : "Нажмите чтобы начать"}
                            </span>
                            {!isLocked && (
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <ChevronRight className="w-4 h-4 text-white/60" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
