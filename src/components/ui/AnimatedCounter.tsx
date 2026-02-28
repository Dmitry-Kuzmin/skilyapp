import { useState, useEffect, useRef } from 'react';
import { motion, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
    value: number;
    className?: string;
    prefix?: string;
    suffix?: string;
}

export const AnimatedCounter = ({
    value,
    className,
    prefix = "",
    suffix = ""
}: AnimatedCounterProps) => {
    const [displayValue, setDisplayValue] = useState(value);
    const prevValue = useRef(value);
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        if (value !== prevValue.current) {
            // Пульсация при изменении (без filter — он ломает bg-clip-text)
            setPulse(true);
            const pulseTimer = setTimeout(() => setPulse(false), 500);

            // Плавная прокрутка числа
            const anim = animate(prevValue.current, value, {
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
                onUpdate(latest) {
                    setDisplayValue(Math.round(latest));
                }
            });

            prevValue.current = value;
            return () => {
                anim.stop();
                clearTimeout(pulseTimer);
            };
        }
    }, [value]);

    return (
        <motion.span
            animate={pulse ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn("inline-block tabular-nums tracking-tight", className)}
        >
            {prefix}
            {displayValue}
            {suffix}
        </motion.span>
    );
};
