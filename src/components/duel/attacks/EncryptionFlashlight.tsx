import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ScrambleContext } from '@/utils/scramble';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Offset the flashlight above the finger on touch devices
  const TOUCH_Y_OFFSET = 100;

  const handleMove = useCallback((clientX: number, clientY: number, isTouchInput: boolean) => {
    if (!containerRef.current || !isActive) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let y = clientY - rect.top;

    if (isTouchInput) {
        y -= TOUCH_Y_OFFSET;
        setIsTouch(true);
    } else {
        setIsTouch(false);
    }
    
    setIsHovering(true); 

    containerRef.current.style.setProperty('--x', `${x}px`);
    containerRef.current.style.setProperty('--y', `${y}px`);
  }, [isActive]);

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY, false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX, touch.clientY, true);
    }
  };

  useEffect(() => {
    // Initialize center position
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      containerRef.current.style.setProperty('--x', `${rect.width / 2}px`);
      containerRef.current.style.setProperty('--y', `${rect.height / 2}px`);
    }
  }, []);

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-visible select-none font-mono touch-none cursor-none"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        '--x': '50%',
        '--y': '50%',
        '--radius': `${flashlightRadius}px`
      } as React.CSSProperties}
    >
      {/* LAYER 1: Encrypted Background (Matrix Rain effect feel) */}
      <div 
        className="relative w-full h-full text-emerald-500/60 transition-all duration-500 opacity-50 blur-[1px]"
        aria-hidden="true"
      >
        <ScrambleContext.Provider value={true}>
            {children}
        </ScrambleContext.Provider>
      </div>

      {/* LAYER 2: Clean Foreground (Revealed by mask) - только текст, без затемнения */}
      <div 
        className="absolute top-0 left-0 w-full h-full z-10 transition-colors duration-300 pointer-events-none"
        style={{
            clipPath: 'circle(var(--radius) at var(--x) var(--y))',
            WebkitClipPath: 'circle(var(--radius) at var(--x) var(--y))',
        }}
      >
        {/* INNER SCANNER BEAM ANIMATION - более тонкий эффект */}
        <div 
            className="absolute w-full h-[200%] top-[-50%] left-0 bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent animate-scan-vertical pointer-events-none"
            style={{
                maskImage: 'radial-gradient(circle at var(--x) var(--y), black 0%, transparent 60%)',
                WebkitMaskImage: 'radial-gradient(circle var(--radius) at var(--x) var(--y), black 0%, transparent 100%)'
            }}
        />
        
        {/* The Clean Text - улучшенная читаемость с лучшим контрастом */}
        <div className="text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.9),0_0_8px_rgba(255,255,255,0.3)]">
            <ScrambleContext.Provider value={false}>
                {children}
            </ScrambleContext.Provider>
        </div>
      </div>

      {/* LAYER 3: Упрощенный HUD OVERLAY - более минималистичный */}
      <div 
          className="absolute top-0 left-0 pointer-events-none z-30 overflow-visible"
          style={{
              transform: 'translate(calc(var(--x) - var(--radius)), calc(var(--y) - var(--radius)))',
              width: 'calc(var(--radius) * 2)',
              height: 'calc(var(--radius) * 2)',
          }}
      >
          <svg viewBox="0 0 200 200" className="w-full h-full text-emerald-400/60 overflow-visible">
              <defs>
                  <linearGradient id="crypto-hud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0.6" />
                  </linearGradient>
                  {/* Glow effect */}
                  <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                  </filter>
              </defs>

              {/* Outer Ring - более тонкий */}
              <circle 
                  cx="100" 
                  cy="100" 
                  r="95" 
                  fill="none" 
                  stroke="url(#crypto-hud-grad)" 
                  strokeWidth="1" 
                  strokeDasharray="8 12" 
                  opacity="0.5"
                  className="animate-[spin_8s_linear_infinite] origin-center"
                  style={{ transformOrigin: '100px 100px' }}
              />

              {/* Inner Ring - статичный */}
              <circle 
                  cx="100" 
                  cy="100" 
                  r="75" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.5" 
                  strokeDasharray="4 8" 
                  opacity="0.3" 
              />

              {/* Corner Brackets - упрощенные */}
              <path d="M 70 50 L 50 50 L 50 70" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              <path d="M 130 50 L 150 50 L 150 70" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              <path d="M 70 150 L 50 150 L 50 130" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              <path d="M 130 150 L 150 150 L 150 130" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />

              {/* Center Reticle - упрощенный */}
              <circle cx="100" cy="100" r="2.5" fill="currentColor" opacity="0.8" className="animate-pulse" />
              <line x1="85" y1="100" x2="115" y2="100" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
              <line x1="100" y1="85" x2="100" y2="115" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
          </svg>
      </div>
    </div>
  );
};

