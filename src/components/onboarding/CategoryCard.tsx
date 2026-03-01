import React from 'react';
import { motion } from 'framer-motion';
import { Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
    category: string;
    isSelected: boolean;
    isDisabled?: boolean;
    onClick?: () => void;
    title: string;
    description: string;
    icon?: string; // Эмодзи или иконка
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
    category,
    isSelected,
    isDisabled,
    onClick,
    title,
    description,
    icon = "🚗"
}) => {
    return (
        <motion.div
            whileHover={!isDisabled ? { scale: 1.02, y: -4 } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            onClick={!isDisabled ? onClick : undefined}
            className={cn(
                "relative flex flex-col items-center justify-between p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer overflow-hidden",
                "w-[240px] h-[320px] shrink-0",
                isSelected
                    ? "border-amber-500 bg-zinc-900/80 shadow-[0_0_40px_rgba(234,179,8,0.25)] scale-105 z-10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
                isDisabled && "opacity-50 grayscale cursor-not-allowed"
            )}
        >
            {/* Background Glow */}
            {isSelected && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[50%] bg-amber-500/10 blur-[60px]" />
            )}

            {/* Top Section */}
            <div className="flex flex-col items-center gap-3">
                <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg",
                    isSelected ? "bg-amber-500/20 text-amber-500" : "bg-zinc-800 text-zinc-400"
                )}>
                    {icon}
                </div>
                <div className="text-center">
                    <h3 className={cn(
                        "text-2xl font-black uppercase tracking-tight leading-none",
                        isSelected ? "text-amber-500" : "text-zinc-200"
                    )}>
                        Категория {category}
                    </h3>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest mt-1 block">
                        {title}
                    </span>
                </div>
            </div>

            {/* Center Description */}
            <p className="text-sm text-center text-zinc-400 font-medium px-4">
                {description}
            </p>

            {/* Bottom Check / Label */}
            <div className={cn(
                "w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors",
                isSelected
                    ? "bg-amber-500 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
            )}>
                {isSelected ? (
                    <>
                        <Check className="w-5 h-5 stroke-[3px]" />
                        ВЫБРАНО
                    </>
                ) : (
                    "ВЫБРАТЬ"
                )}
            </div>

            {/* Floating Category Letter Backdrop */}
            <div className="absolute -bottom-8 -right-4 text-[120px] font-black opacity-[0.03] select-none pointer-events-none">
                {category}
            </div>
        </motion.div>
    );
};
