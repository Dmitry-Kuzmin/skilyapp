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
  flashlightRadius = 120 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Offset the flashlight above the finger on touch devices
  const TOUCH_Y_OFFSET = 90;

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
      className="relative w-full overflow-hidden select-none font-mono touch-none rounded-lg bg-zinc-950 cursor-none"
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
        className="relative w-full h-full text-emerald-500/40 transition-all duration-500 opacity-30 blur-[2px]"
        aria-hidden="true"
      >
        <ScrambleContext.Provider value={true}>
            {children}
        </ScrambleContext.Provider>
      </div>

      {/* LAYER 2: Clean Foreground (Revealed by mask) */}
      <div 
        className="absolute top-0 left-0 w-full h-full z-10 transition-colors duration-300 pointer-events-none"
        style={{
            clipPath: 'circle(var(--radius) at var(--x) var(--y))',
            WebkitClipPath: 'circle(var(--radius) at var(--x) var(--y))',
            background: 'radial-gradient(circle at var(--x) var(--y), rgba(0, 24, 45, 0.95) 0%, rgba(0,0,0,0.4) 100%)',
        }}
      >
        {/* INNER SCANNER BEAM ANIMATION */}
        <div 
            className="absolute w-full h-[300%] top-[-100%] left-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-scan-vertical pointer-events-none"
            style={{
                maskImage: 'radial-gradient(circle at var(--x) var(--y), black 0%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle var(--radius) at var(--x) var(--y), black 0%, transparent 100%)'
            }}
        />
        
        {/* The Clean Text */}
        <div className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
            <ScrambleContext.Provider value={false}>
                {children}
            </ScrambleContext.Provider>
        </div>
      </div>

      {/* LAYER 3: PREMIUM HUD OVERLAY */}
      <div 
          className="absolute top-0 left-0 pointer-events-none z-30 overflow-visible"
          style={{
              transform: 'translate(calc(var(--x) - var(--radius)), calc(var(--y) - var(--radius)))',
              width: 'calc(var(--radius) * 2)',
              height: 'calc(var(--radius) * 2)',
          }}
      >
          <svg viewBox="0 0 200 200" className="w-full h-full text-cyan-400 overflow-visible drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]">
              <defs>
                  <linearGradient id="hud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#00ff41" stopOpacity="0.8" />
                  </linearGradient>
              </defs>

              {/* Outer Rotating Dashed Ring */}
              <g className="animate-[spin_10s_linear_infinite] origin-center">
                  <circle cx="100" cy="100" r="95" fill="none" stroke="url(#hud-grad)" strokeWidth="0.5" strokeDasharray="10 20" opacity="0.4" />
                  <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeWidth="0.2" strokeDasharray="50 150" opacity="0.6" />
              </g>

              {/* Inner Counter-Rotating Ring */}
              <g className="animate-[spin_15s_linear_infinite_reverse] origin-center">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 8" opacity="0.3" />
              </g>

              {/* Static Brackets */}
              <path d="M 60 40 L 40 40 L 40 60" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 140 40 L 160 40 L 160 60" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 60 160 L 40 160 L 40 140" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 140 160 L 160 160 L 160 140" fill="none" stroke="currentColor" strokeWidth="2" />

              {/* Center Reticle */}
              <circle cx="100" cy="100" r="3" fill="currentColor" className="animate-pulse" />
              <line x1="90" y1="100" x2="110" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="100" y1="90" x2="100" y2="110" stroke="currentColor" strokeWidth="1" opacity="0.5" />

              {/* Dynamic Data Text */}
              <text x="100" y="30" fontSize="8" fill="currentColor" textAnchor="middle" fontFamily="monospace" className="tracking-widest font-bold">
                  SCANNING...
              </text>
              
              {/* Tech Deco at bottom */}
              <rect x="70" y="175" width="60" height="2" fill="currentColor" opacity="0.5" />
              <rect x="70" y="178" width="20" height="2" fill="#00ff41" className="animate-[pulse_0.5s_ease-in-out_infinite]" />
              <text x="100" y="190" fontSize="6" fill="currentColor" textAnchor="middle" fontFamily="monospace" opacity="0.8">
                 {isTouch ? 'TOUCH_INPUT' : 'COORD: [X,Y]'}
              </text>
          </svg>
      </div>
    </div>
  );
};

