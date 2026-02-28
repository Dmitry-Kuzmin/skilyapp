import { useState, useEffect, useRef } from 'react';
import { motion, animate, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
    value: number;
    className?: string;
    showPlus?: boolean;
    prefix?: string;
    suffix?: string;
}

export const AnimatedCounter = ({
    value,
    className,
    showPlus = false,
    prefix = "",
    suffix = ""
}: AnimatedCounterProps) => {
    const [displayValue, setDisplayValue] = useState(value);
    const prevValue = useRef(value);
    const controls = useAnimation();

    useEffect(() => {
        if (value !== prevValue.current) {
            // ПРЕМИУМ: Пульсация и свечение при изменении
            controls.start({
                scale: [1, 1.3, 1],
                filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
                transition: {
                    duration: 0.4,
                    ease: [0.34, 1.56, 0.64, 1], // Пружинистый эффект
                }
            });

            // ПЛАВНО: Текст увеличивается плавно "на глазах"
            const anim = animate(prevValue.current, value, {
                duration: 1.0,
                ease: [0.16, 1, 0.3, 1],
                onUpdate(latest) {
                    setDisplayValue(Math.round(latest));
                }
            });

            prevValue.current = value;
            return () => anim.stop();
        }
    }, [value, controls]);

    return (
        <motion.span
            animate={controls}
            className={cn("inline-block tabular-nums tracking-tight", className)}
        >
            {showPlus && value > prevValue.current && "+"}
            {prefix}
            {displayValue}
            {suffix}
        </motion.span>
    );
};
