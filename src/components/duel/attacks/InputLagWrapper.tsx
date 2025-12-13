import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputLagProps {
  isActive: boolean; // Включен ли лаг
  delayMs: number;   // Задержка (например 1500)
  children: React.ReactNode; // Сюда передаем кнопку ответа
  onClick: () => void; // Реальный клик
  className?: string;
  disabled?: boolean;
}

export const InputLagWrapper: React.FC<InputLagProps> = ({ 
  isActive, 
  delayMs, 
  children, 
  onClick,
  className,
  disabled
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    // Если уже ждем или отключено - игнор
    if (disabled || isProcessing) return;

    if (isActive) {
      // 1. Включаем фейковую загрузку
      setIsProcessing(true);
      
      // 2. Ждем указанное время
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // 3. Выполняем реальный клик
      setIsProcessing(false);
      onClick();
    } else {
      // Без лага - мгновенно
      onClick();
    }
  };

  return (
    <div className="relative w-full">
      {/* Оверлей лага (визуальный глитч) при нажатии */}
      {isProcessing && (
        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center border border-red-500/50 animate-pulse">
           <div className="flex flex-col items-center gap-1">
             <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
             <span className="text-[10px] text-red-400 font-mono">LAG...</span>
           </div>
        </div>
      )}

      {/* Индикатор активного дебаффа (висит в углу кнопки) */}
      {isActive && !isProcessing && (
        <div className="absolute -top-1 -right-1 z-10">
           <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
        </div>
      )}

      <div 
        onClick={handleClick}
        className={cn(
          "transition-all duration-200",
          isActive ? "cursor-progress grayscale-[0.3]" : "", // Визуально чуть "портим" кнопку
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

