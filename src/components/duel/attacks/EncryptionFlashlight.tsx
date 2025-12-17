import React, { useRef, useEffect, useCallback, useState, createContext, useContext } from 'react';
import { ScrambleContext } from '@/utils/scramble';

// Глобальный контекст для координат фонарика
const FlashlightContext = createContext<{
  x: number;
  y: number;
  radius: number;
  isActive: boolean;
}>({ x: 50, y: 50, radius: 140, isActive: false });

// Провайдер фонарика - должен быть один на весь контент
interface EncryptionFlashlightProviderProps {
  isActive: boolean;
  children: React.ReactNode;
  flashlightRadius?: number;
}

export const EncryptionFlashlightProvider: React.FC<EncryptionFlashlightProviderProps> = ({ 
  isActive, 
  children, 
  flashlightRadius = 140 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flashlightPos, setFlashlightPos] = useState({ x: 50, y: 50 });
  const [isTouch, setIsTouch] = useState(false);

  // Offset the flashlight above the finger on touch devices
  const TOUCH_Y_OFFSET = 100;

  const handleMove = useCallback((clientX: number, clientY: number, isTouchInput: boolean) => {
    if (!containerRef.current || !isActive) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Вычисляем координаты в процентах относительно контейнера
    const x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    if (isTouchInput) {
        // Компенсируем смещение для touch (фонарик выше пальца)
        const touchOffsetPx = TOUCH_Y_OFFSET;
        const touchOffsetPercent = (touchOffsetPx / rect.height) * 100;
        y = Math.max(5, Math.min(95, y - touchOffsetPercent)); // Ограничиваем границами
        setIsTouch(true);
    } else {
        setIsTouch(false);
    }

    // Ограничиваем координаты границами контейнера
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));
    
    setFlashlightPos({ x: clampedX, y: clampedY });
  }, [isActive]);

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY, false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Предотвращаем скролл
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX, touch.clientY, true);
    }
  };

  useEffect(() => {
    // Initialize center position
    if (containerRef.current && isActive) {
      setFlashlightPos({ x: 50, y: 50 });
    }
  }, [isActive]);

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <FlashlightContext.Provider value={{ 
      x: flashlightPos.x, 
      y: flashlightPos.y, 
      radius: flashlightRadius,
      isActive: true 
    }}>
      <div 
        ref={containerRef}
        className="relative w-full select-none touch-none"
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        style={{ cursor: 'none' }}
      >
        {children}
      </div>
    </FlashlightContext.Provider>
  );
};

// Компонент для обертки текста с эффектом шифрования
interface EncryptedTextProps {
  children: React.ReactNode;
  className?: string;
}

export const EncryptedText: React.FC<EncryptedTextProps> = ({ children, className = '' }) => {
  const flashlight = useContext(FlashlightContext);
  
  if (!flashlight.isActive) {
    return <div className={className}>{children}</div>;
  }

  // Создаем радиальный градиент для мягкого края фонарика (feather edge)
  const radiusPx = flashlight.radius;
  const centerX = flashlight.x;
  const centerY = flashlight.y;
  
  // Мягкий край: от 70% радиуса начинается прозрачность, до 100% полностью прозрачно
  // Используем более плавный переход для feather edge эффекта
  const innerRadius = radiusPx * 0.7;
  const outerRadius = radiusPx;
  
  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: `radial-gradient(circle ${outerRadius}px at ${centerX}% ${centerY}%, black ${innerRadius}px, rgba(0,0,0,0.3) ${innerRadius + (outerRadius - innerRadius) * 0.3}px, transparent ${outerRadius}px)`,
    maskImage: `radial-gradient(circle ${outerRadius}px at ${centerX}% ${centerY}%, black ${innerRadius}px, rgba(0,0,0,0.3) ${innerRadius + (outerRadius - innerRadius) * 0.3}px, transparent ${outerRadius}px)`,
  };

  return (
    <div className={`relative ${className}`} style={{ position: 'relative' }}>
      {/* LAYER 1: Зашифрованный текст (иероглифы) - всегда виден */}
      <div className="relative text-emerald-500/70 font-mono" style={{ visibility: 'visible' }}>
        <ScrambleContext.Provider value={true}>
          {children}
        </ScrambleContext.Provider>
      </div>

      {/* LAYER 2: Расшифрованный текст - виден только в области фонарика с мягким краем */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          ...maskStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <div className="text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.9),0_0_6px_rgba(255,255,255,0.4)]">
          <ScrambleContext.Provider value={false}>
            {children}
          </ScrambleContext.Provider>
        </div>
      </div>

      {/* LAYER 3: HUD Overlay - только в области фонарика */}
      <div 
        className="absolute pointer-events-none z-10"
        style={{
          left: `calc(${centerX}% - ${radiusPx}px)`,
          top: `calc(${centerY}% - ${radiusPx}px)`,
          width: `${radiusPx * 2}px`,
          height: `${radiusPx * 2}px`,
          transform: 'translateZ(0)', // GPU acceleration
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full text-emerald-400/50" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`crypto-hud-grad-${centerX}-${centerY}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Outer Ring */}
          <circle 
            cx="100" 
            cy="100" 
            r="95" 
            fill="none" 
            stroke={`url(#crypto-hud-grad-${centerX}-${centerY})`}
            strokeWidth="1" 
            strokeDasharray="8 12" 
            opacity="0.4"
            className="animate-[spin_8s_linear_infinite]"
            style={{ transformOrigin: '100px 100px' }}
          />

          {/* Inner Ring */}
          <circle 
            cx="100" 
            cy="100" 
            r="75" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.5" 
            strokeDasharray="4 8" 
            opacity="0.25" 
          />

          {/* Corner Brackets */}
          <path d="M 70 50 L 50 50 L 50 70" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          <path d="M 130 50 L 150 50 L 150 70" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          <path d="M 70 150 L 50 150 L 50 130" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          <path d="M 130 150 L 150 150 L 150 130" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />

          {/* Center Reticle */}
          <circle cx="100" cy="100" r="2.5" fill="currentColor" opacity="0.7" className="animate-pulse" />
          <line x1="85" y1="100" x2="115" y2="100" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
          <line x1="100" y1="85" x2="100" y2="115" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
        </svg>
      </div>
    </div>
  );
};

// Обратная совместимость - старый компонент теперь использует новый подход
interface EncryptionFlashlightProps {
  isActive: boolean;
  children: React.ReactNode;
  flashlightRadius?: number;
}

export const EncryptionFlashlight: React.FC<EncryptionFlashlightProps> = ({ 
  isActive, 
  children, 
  flashlightRadius = 140 
}) => {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <EncryptedText>
      {children}
    </EncryptedText>
  );
};

