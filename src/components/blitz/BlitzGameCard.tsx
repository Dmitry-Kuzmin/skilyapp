import { ReactNode, forwardRef } from 'react';
import { motion } from "@/components/optimized/Motion";
import { cn } from '@/lib/utils';

interface BlitzGameCardProps {
    children: ReactNode;
    isShaking?: boolean;
    className?: string;
}

/**
 * Glass Container для контента вопроса в Blitz режиме
 * Создаёт эффект "Floating HUD" - стеклянная карточка в центре экрана
 */
export const BlitzGameCard = forwardRef<HTMLDivElement, BlitzGameCardProps>(({
    children,
    isShaking = false,
    className
}, ref) => {
    return (
        <motion.div
            ref={ref}
            className={cn(
                "relative rounded-3xl overflow-hidden",
                "bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl",
                "border border-slate-200 dark:border-white/10",
                "shadow-2xl shadow-slate-200/50 dark:shadow-black/30",
                className
            )}
            animate={isShaking ? { x: [0, -6, 6, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.3 }}
        >
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 dark:from-white/5 via-transparent to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 p-4 sm:p-6">
                {children}
            </div>
        </motion.div>
    );
});

BlitzGameCard.displayName = 'BlitzGameCard';

export default BlitzGameCard;
