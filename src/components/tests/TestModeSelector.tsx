import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "@/components/optimized/Motion";

interface TestModeSelectorProps {
    options: number[];
    selected: number;
    onSelect: (value: number) => void;
    label?: string;
}

export const TestModeSelector = ({
    options,
    selected,
    onSelect,
    label = "Количество вопросов"
}: TestModeSelectorProps) => {
    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <motion.button
                        key={option}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(option);
                        }}
                        className={cn(
                            "h-9 min-w-[3rem] rounded-lg px-3 text-sm font-semibold transition-all shadow-sm",
                            selected === option
                                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        )}
                    >
                        {option}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};
