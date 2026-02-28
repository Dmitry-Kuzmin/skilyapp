import { useEffect, useRef, useState } from 'react';
import { useSpring, useTransform } from 'framer-motion';
import { motion } from '@/components/optimized/Motion';
import { cn } from '@/lib/utils';

interface NumberTickerProps {
  value: number;
  className?: string;
  shouldFlash?: boolean; // Флаг для красного мигания при уменьшении
  useSeparator?: boolean; // Добавлено: флаг для использования разделителя тысяч
}

export function NumberTicker({ value, className, shouldFlash = false, useSeparator = true }: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlashing, setIsFlashing] = useState(false);
  const previousValueRef = useRef(value);
  const springRef = useRef(useSpring(value, { damping: 30, stiffness: 200 }));

  useEffect(() => {
    // Проверяем, уменьшилось ли значение
    const isDecreasing = value < previousValueRef.current;

    if (isDecreasing && shouldFlash) {
      setIsFlashing(true);
      // Сбрасываем флаг мигания через 400ms
      setTimeout(() => setIsFlashing(false), 400);
    }

    // Обновляем spring значение
    springRef.current.set(value);
    previousValueRef.current = value;
  }, [value, shouldFlash]);

  // Преобразуем spring значение в целое число
  const animatedValue = useTransform(springRef.current, (latest) => Math.round(latest));

  useEffect(() => {
    // Подписываемся на изменения animatedValue
    const unsubscribe = animatedValue.on('change', (latest) => {
      setDisplayValue(latest);
    });

    return () => {
      unsubscribe();
    };
  }, [animatedValue]);

  return (
    <motion.span
      className={cn(
        "font-mono tabular-nums",
        className
      )}
      animate={{
        color: isFlashing
          ? ['#ef4444', '#ef4444', '#eab308', '#eab308']
          : undefined,
      }}
      transition={{
        duration: 0.4,
        ease: 'easeOut',
        times: [0, 0.3, 0.7, 1]
      }}
    >
      {useSeparator ? displayValue.toLocaleString() : displayValue}
    </motion.span>
  );
}

