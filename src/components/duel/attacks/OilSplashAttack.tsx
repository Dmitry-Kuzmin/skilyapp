import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OilSplashAttackProps {
  isActive: boolean; // Включена ли атака
  onCleaned: () => void; // Колбек, когда игрок стер масло
}

export const OilSplashAttack: React.FC<OilSplashAttackProps> = ({ isActive, onCleaned }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFading, setIsFading] = useState(false);
  const [progress, setProgress] = useState(0);

  // 1. Инициализация и рисование "Масла"
  useEffect(() => {
    if (!isActive || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размер канваса под экран
    const { width, height } = containerRef.current.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // --- РИСУЕМ ТЕКСТУРУ МАСЛА (Процедурная генерация) ---
    // В реальном проекте можно заменить на ctx.drawImage(img, ...)
    
    // 1. Черная основа
    ctx.fillStyle = '#020617'; // Очень темный синий/черный
    ctx.fillRect(0, 0, width, height);

    // 2. Бензиновые разводы (Iridescent Noise)
    // Рисуем много полупрозрачных градиентных пятен
    const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#3B82F6']; // Фиолетовый, Зеленый, Золотой, Синий
    
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 200 + 50;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, colors[Math.floor(Math.random() * colors.length)]);
      gradient.addColorStop(1, 'transparent');

      ctx.globalAlpha = 0.4; // Прозрачность
      ctx.fillStyle = gradient;
      ctx.globalCompositeOperation = 'screen'; // Режим наложения для свечения
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Сбрасываем настройки для ластика
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    
  }, [isActive]);

  // 2. Механика Стирания (Eraser Logic)
  const handleInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Включаем режим "Ластик"
    ctx.globalCompositeOperation = 'destination-out';
    
    // Параметры кисти
    const brushSize = 45; // Размер пальца
    
    // Рисуем круг, который стирает контент
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();

    // Добавляем "брызги" вокруг пальца для реализма (неровные края)
    for (let i = 0; i < 5; i++) {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
  };

  // 3. Проверка прогресса (Throttled Check)
  const checkProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Берем пиксели только с небольшого разрешения для скорости (шаг 10)
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;
    let transparentPixels = 0;

    // Проходим по альфа-каналу (каждый 4-й байт) с шагом 32 (оптимизация скорости x32)
    for (let i = 3; i < pixels.length; i += 32) {
      if (pixels[i] < 10) { // Если прозрачность почти 0
        transparentPixels++;
      }
    }

    // Т.к. мы шагаем через 32 пикселя, total нужно делить пропорционально
    const checkedPixels = pixels.length / 4 / 8; // Примерно
    const percent = (transparentPixels / checkedPixels) * 100;

    // Если стерто больше 55% - победа
    if (percent > 55 && !isFading) {
      finishEffect();
    }
  };

  const finishEffect = () => {
    setIsFading(true);
    // Вибрация успеха
    if (window.navigator.vibrate) window.navigator.vibrate([50, 50, 50]);
    setTimeout(() => {
      onCleaned();
    }, 500); // Ждем анимацию исчезновения
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      {!isFading && (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(20px)' }} // Красивое исчезновение
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] touch-none cursor-crosshair overflow-hidden"
        >
            {/* Текст поверх масла (не стирается) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <h2 className="text-4xl font-black text-red-500 tracking-tighter drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse">
                        SYSTEM BLINDED
                    </h2>
                    <p className="text-white/80 font-mono mt-2 text-lg bg-black/50 px-4 py-1 rounded backdrop-blur-sm border border-white/10">
                        WIPE SCREEN TO RESTORE
                    </p>
                    <div className="mt-8 text-4xl animate-bounce">
                        👆
                    </div>
                </motion.div>
            </div>

            {/* Канвас с маслом */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                onMouseMove={(e) => {
                    handleInteraction(e.clientX, e.clientY);
                }}
                onTouchMove={(e) => {
                    const touch = e.touches[0];
                    handleInteraction(touch.clientX, touch.clientY);
                }}
                onMouseUp={checkProgress}
                onTouchEnd={checkProgress}
            />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

