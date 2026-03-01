import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Car, Bike, Truck, Bus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
    category: string;
    isSelected: boolean;
    isDisabled?: boolean;
    onClick?: () => void;
    title: string;
    description: string;
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'A': return <Bike className="w-9 h-9" />;
        case 'C': return <Truck className="w-9 h-9" />;
        case 'D': return <Bus className="w-9 h-9" />;
        default: return <Car className="w-9 h-9" />;
    }
};

export const CategoryCard: React.FC<CategoryCardProps> = ({
    category,
    isSelected,
    isDisabled,
    onClick,
    title,
    description
}) => {
    return (
        <motion.div
            whileHover={!isDisabled ? { y: -12, scale: 1.02 } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            onClick={!isDisabled ? onClick : undefined}
            className={cn(
                "relative group flex flex-col items-center justify-between p-10 rounded-[4rem] border transition-all duration-500 cursor-pointer snap-center",
                "w-[280px] h-[360px] shrink-0",
                isSelected
                    ? "border-blue-500 bg-blue-500/[0.04] shadow-[0_40px_80px_-20px_rgba(59,130,246,0.25)]"
                    : "border-white/[0.04] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]",
                isDisabled && "opacity-20 grayscale cursor-not-allowed border-dashed"
            )}
        >
            {/* Selection Radial Bloom */}
            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none"
                    />
                )}
            </AnimatePresence>

            {/* Icon Container */}
            <div className="relative z-10 flex flex-col items-center gap-6 w-full mt-2">
                <div className={cn(
                    "w-20 h-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 shadow-2xl backdrop-blur-3xl",
                    isSelected
                        ? "bg-blue-500 text-white shadow-blue-500/30"
                        : "bg-white/[0.03] text-zinc-600 group-hover:text-zinc-400 group-hover:scale-105"
                )}>
                    {getCategoryIcon(category)}
                </div>

                <div className="text-center space-y-1">
                    <div className={cn(
                        "text-3xl font-black tracking-tighter transition-all duration-500",
                        isSelected ? "text-white scale-105" : "text-zinc-500"
                    )}>
                        CAT {category}
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className={cn(
                "relative z-10 text-[12px] text-center font-bold leading-relaxed px-4 transition-colors duration-500",
                isSelected ? "text-zinc-300" : "text-zinc-600"
            )}>
                {description}
            </div>

            {/* Minimalist Selection Mark */}
            <div className="relative z-10">
                <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                    isSelected
                        ? "bg-blue-500 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                        : "bg-white/5 border-white/5 text-transparent"
                )}>
                    <Check className={cn("w-5 h-5 stroke-[4px] transition-all", isSelected ? "scale-100" : "scale-0")} />
                </div>
            </div>
        </motion.div>
    );
};
