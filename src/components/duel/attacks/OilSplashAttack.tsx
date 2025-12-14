import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Skull } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

type SpillPhase = 'warning' | 'cracking' | 'spilling' | 'cleaning' | 'completed';

interface OilSplashAttackProps {
  isActive: boolean;
  onCleaned: () => void;
  expiresAt?: number; // Время истечения атаки (timestamp в миллисекундах)
}

export const OilSplashAttack: React.FC<OilSplashAttackProps> = ({ isActive, onCleaned, expiresAt }) => {
  // FAILSAFE: Проверка поддержки WebGL для старых устройств
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglSupported(!!gl);
    } catch (e) {
      setWebglSupported(false);
    }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [cursorPos, setCursorPos] = useState<Position>({ x: -100, y: -100 });
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanPercent, setCleanPercent] = useState(0);
  const [phase, setPhase] = useState<SpillPhase>('warning'); 
  const [shake, setShake] = useState(0);

  // --- Configuration ---
  const SPONGE_SIZE = 160; 
  const REQUIRED_CLEAN_PERCENTAGE = 97;
  
  // Fluid Physics Config
  const COLUMN_WIDTH = 15;
  const GRAVITY = 3.0; // Увеличено с 1.5 для более быстрого падения
  const VISCOSITY = 0.5; 
  const TERMINAL_VELOCITY = 120; // Увеличено с 60 для более быстрого движения

  // Refs for physics/animation
  const columnsRef = useRef<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const timeRef = useRef<number>(0);
  const crackCenterRef = useRef<Position>({ x: 0, y: 0 });
  const crackPathsRef = useRef<Position[][]>([]);

  // КРИТИЧНО: Автоматическое завершение по истечении времени
  useEffect(() => {
    if (!isActive || !expiresAt) return;

    const now = Date.now();
    const remainingTime = expiresAt - now;

    // Если время уже истекло - завершаем сразу
    if (remainingTime <= 0) {
      console.log('[OilSplashAttack] ⏰ Attack expired, cleaning up immediately');
      onCleaned();
      return;
    }

    // Если осталось мало времени (< 1 секунды) - завершаем быстро
    if (remainingTime < 1000) {
      console.log('[OilSplashAttack] ⏰ Attack expires soon, cleaning up in', remainingTime, 'ms');
      expireTimeoutRef.current = setTimeout(() => {
        onCleaned();
      }, remainingTime);
      return () => {
        if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current);
      };
    }

    // Устанавливаем таймер на оставшееся время
    console.log('[OilSplashAttack] ⏰ Attack will expire in', Math.round(remainingTime / 1000), 'seconds');
    expireTimeoutRef.current = setTimeout(() => {
      console.log('[OilSplashAttack] ⏰ Attack expired, cleaning up');
      onCleaned();
    }, remainingTime);

    return () => {
      if (expireTimeoutRef.current) {
        clearTimeout(expireTimeoutRef.current);
        expireTimeoutRef.current = null;
      }
    };
  }, [isActive, expiresAt, onCleaned]);

  // --- 1. Canvas Setup (Run Once & Resize) ---
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => {
        if (canvasRef.current) {
            if (canvasRef.current.width !== window.innerWidth || canvasRef.current.height !== window.innerHeight) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 

    return () => {
        window.removeEventListener('resize', handleResize);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
        if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current);
    };
  }, [isActive]);

  // --- 2. Phase Logic ---
  
  // WARNING PHASE
  useEffect(() => {
    if (!isActive || phase !== 'warning') return;

    let shakeInterval = setInterval(() => {
        setShake(Math.random() * 8);
    }, 50);

    setTimeout(() => {
        clearInterval(shakeInterval);
        setPhase('cracking');
    }, 2200);

    return () => clearInterval(shakeInterval);
  }, [phase, isActive]);

  // ANIMATION LOOPS
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // --- CRACKING (GLASS SMASH) ---
    if (phase === 'cracking') {
        const centerX = w * (0.3 + Math.random() * 0.4); 
        const centerY = h * (0.2 + Math.random() * 0.2); 
        crackCenterRef.current = { x: centerX, y: centerY };

        const numCracks = 6 + Math.floor(Math.random() * 4);
        const paths: Position[][] = [];

        for (let i = 0; i < numCracks; i++) {
            const angle = (i / numCracks) * Math.PI * 2 + (Math.random() - 0.5);
            const path: Position[] = [{x: centerX, y: centerY}];
            let currX = centerX;
            let currY = centerY;
            const len = Math.max(w, h); 

            let dist = 0;
            while (dist < len) {
                dist += 15 + Math.random() * 40;
                const jitter = (Math.random() - 0.5) * 0.5;
                currX += Math.cos(angle + jitter) * dist;
                currY += Math.sin(angle + jitter) * dist;
                path.push({ x: currX, y: currY });
                currX = path[path.length-1].x;
                currY = path[path.length-1].y;
            }
            paths.push(path);
        }
        crackPathsRef.current = paths;

        let crackProgress = 0;
        
        const animateCrack = () => {
            ctx.clearRect(0,0,w,h);
            
            // Red Flash Background
            ctx.fillStyle = `rgba(200, 0, 0, ${0.1 + Math.random() * 0.1})`;
            ctx.fillRect(0,0,w,h);

            // Draw Cracks
            ctx.strokeStyle = '#e0f2fe'; 
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;

            paths.forEach(path => {
                ctx.beginPath();
                ctx.moveTo(path[0].x, path[0].y);
                const limit = Math.floor(path.length * crackProgress) + 1;
                for(let i=1; i < Math.min(limit, path.length); i++) {
                    ctx.lineTo(path[i].x, path[i].y);
                }
                ctx.stroke();
            });
            ctx.shadowBlur = 0;

            if (crackProgress > 0.1) {
                ctx.beginPath();
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                for(let i=0; i<5; i++) {
                     ctx.beginPath();
                     ctx.arc(centerX + (Math.random()-0.5)*20, centerY + (Math.random()-0.5)*20, Math.random()*4, 0, Math.PI*2);
                     ctx.fill();
                }
            }

            if (crackProgress < 1) {
                crackProgress += 0.08;
                setShake(Math.random() * 20); 
                requestRef.current = requestAnimationFrame(animateCrack);
            } else {
                setShake(0);
                initializeFluid(w, h);
                ctx.fillStyle = 'white';
                ctx.fillRect(0,0,w,h);
                setTimeout(() => setPhase('spilling'), 50);
            }
        };
        animateCrack();
    }

    // --- SPILLING ---
    if (phase === 'spilling') {
        const animateSpill = () => {
            timeRef.current += 0.05;
            ctx.clearRect(0, 0, w, h);
            
            drawStaticCracks(ctx, crackPathsRef.current);

            let allFilled = true;
            const numColumns = columnsRef.current.length;

            for (let i = 0; i < numColumns; i++) {
                const noise = Math.sin(i * 0.8 + timeRef.current); 
                // Увеличено ускорение со временем с 0.2 до 0.5 для более быстрого заполнения
                let acc = GRAVITY + (timeRef.current * 0.5) + (noise > 0 ? 0.3 : 0);
                
                velocitiesRef.current[i] += acc;
                velocitiesRef.current[i] = Math.min(velocitiesRef.current[i], TERMINAL_VELOCITY);
                
                columnsRef.current[i] += velocitiesRef.current[i];

                if (i > 0 && i < numColumns - 1) {
                    const prev = columnsRef.current[i - 1];
                    const next = columnsRef.current[i + 1];
                    const curr = columnsRef.current[i];
                    velocitiesRef.current[i] += ((prev + next + curr)/3 - curr) * VISCOSITY;
                }

                if (columnsRef.current[i] < h + 50) {
                    allFilled = false;
                }
            }

            drawOil(ctx, w, h);

            if (allFilled) {
                cancelAnimationFrame(requestRef.current);
                generateStaticTexture(ctx, w, h);
                setPhase('cleaning');
            } else {
                requestRef.current = requestAnimationFrame(animateSpill);
            }
        };
        animateSpill();
    }

  }, [phase, isActive]);

  // --- Helper Functions ---

  const initializeFluid = (w: number, h: number) => {
      const numColumns = Math.ceil(w / COLUMN_WIDTH) + 2;
      const cy = crackCenterRef.current.y;
      const cx = crackCenterRef.current.x;

      columnsRef.current = new Array(numColumns).fill(0).map((_, i) => {
          const x = i * COLUMN_WIDTH;
          const dist = Math.abs(x - cx);
          // Уменьшен коэффициент наклона с 0.15 до 0.05 для более плоской формы на широких экранах
          // Уменьшен случайный разброс с 50 до 25 для более предсказуемой высоты
          return cy - dist * 0.05 - Math.random() * 25; 
      });
      velocitiesRef.current = new Array(numColumns).fill(0).map(() => Math.random() * 8 + 2); // Увеличена начальная скорость
  };

  const drawStaticCracks = (ctx: CanvasRenderingContext2D, paths: Position[][]) => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      paths.forEach(path => {
          if (path.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for(const p of path) ctx.lineTo(p.x, p.y);
          ctx.stroke();
      });
  };

  const drawOil = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const numColumns = columnsRef.current.length;
      ctx.beginPath();
      ctx.moveTo(0, 0); 
      
      for (let i = 0; i < numColumns; i++) {
          const x = i * COLUMN_WIDTH;
          const y = columnsRef.current[i];
          if (i === 0) ctx.lineTo(x, y);
          else {
             const prevX = (i - 1) * COLUMN_WIDTH;
             const prevY = columnsRef.current[i - 1];
             const midX = (prevX + x) / 2;
             const midY = (prevY + y) / 2;
             ctx.quadraticCurveTo(prevX, prevY, midX, midY);
          }
      }
      ctx.lineTo(w, 0);
      ctx.closePath();

      ctx.fillStyle = '#0a0a0a';
      ctx.fill();

      // Iridescence
      ctx.save();
      ctx.clip();
      
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(20, 0, 0, 0.5)'); 
      grad.addColorStop(0.4, 'rgba(0, 50, 50, 0.5)');
      grad.addColorStop(0.6, 'rgba(50, 0, 100, 0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0.8)');
      
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 4; i < numColumns - 4; i+=8) {
          const y = columnsRef.current[i];
          if (y < h + 50 && y > 0) {
            ctx.beginPath();
            ctx.ellipse(i * COLUMN_WIDTH, y - 20, 3, 12, 0, 0, Math.PI*2);
            ctx.fill();
          }
      }
      ctx.restore();
  };

  const generateStaticTexture = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0a0a0a'; 
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-atop';
    
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(20, 0, 0, 0.5)'); 
    grad.addColorStop(0.4, 'rgba(0, 50, 50, 0.5)');
    grad.addColorStop(0.6, 'rgba(50, 0, 100, 0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; 
    
    for(let i=0; i<20; i++) {
         const x = Math.random() * w;
         const y = Math.random() * h;
         const height = 50 + Math.random() * 150;
         ctx.beginPath();
         ctx.ellipse(x, y, 2 + Math.random(), height, 0, 0, Math.PI*2);
         ctx.fill();
    }
  };

  // --- 3. Cleaning Logic ---
  const checkProgress = useCallback(() => {
    if (phase !== 'cleaning' || !isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const stride = 60; 
    
    try {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        let cleanedPoints = 0;
        let totalPoints = 0;

        for (let y = 0; y < h; y += stride) {
            for (let x = 0; x < w; x += stride) {
                const index = (y * w + x) * 4;
                if (data[index + 3] < 50) { 
                    cleanedPoints++;
                }
                totalPoints++;
            }
        }
        
        if (totalPoints === 0) return;

        const percent = (cleanedPoints / totalPoints) * 100;
        setCleanPercent(percent);

        if (percent > REQUIRED_CLEAN_PERCENTAGE) {
             setPhase('completed');
             onCleaned();
        }
    } catch (e) { 
        console.error('[OilSplashAttack] Error checking progress:', e); 
    }
  }, [phase, onCleaned, isActive]);

  useEffect(() => {
    if (phase === 'cleaning' && isActive) {
        const delayStart = setTimeout(() => {
             checkIntervalRef.current = setInterval(checkProgress, 500);
        }, 1000);
        
        return () => {
            clearTimeout(delayStart);
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
        };
    }
  }, [phase, checkProgress, isActive]);

  // --- Input ---
  const clean = (x: number, y: number) => {
    if (phase !== 'cleaning' || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'destination-out';
    const radius = SPONGE_SIZE / 2;
    
    // Scrubbing
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0, Math.PI*2);
    for(let i=0; i<6; i++) {
        const a = Math.random() * Math.PI*2;
        const d = Math.random() * radius * 0.4;
        ctx.arc(x + Math.cos(a)*d, y + Math.sin(a)*d, radius*0.6, 0, Math.PI*2);
    }
    ctx.fill();
  };

  const handleInput = (clientX: number, clientY: number) => {
      setCursorPos({ x: clientX, y: clientY });
      if (isCleaning) clean(clientX, clientY);
  };

  if (!isActive) return null;

  // FAILSAFE: Если WebGL не поддерживается - показываем простую заглушку
  if (webglSupported === false) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95">
        <div className="text-center space-y-4">
          <h1 className="text-red-500 font-mono text-4xl font-black animate-pulse" style={{ textShadow: '0 0 20px rgba(255,0,0,0.8)' }}>
            VISOR BREACH
          </h1>
          <p className="text-red-400 font-mono text-sm uppercase tracking-widest">
            SYSTEM COMPROMISED
          </p>
          <div className="mt-8">
            <button
              onClick={onCleaned}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-mono font-bold rounded-lg transition-colors"
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Если проверка еще не завершена - показываем загрузку
  if (webglSupported === null) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95">
        <div className="text-red-500 font-mono text-xl animate-pulse">INITIALIZING...</div>
      </div>
    );
  }

  return (
    <div 
        ref={containerRef}
        className={`fixed inset-0 z-[9999] touch-none overflow-hidden ${phase === 'cleaning' ? 'cursor-none' : ''}`}
        style={{
             transform: `translate(${(Math.random()-0.5) * shake}px, ${(Math.random()-0.5) * shake}px)`
        }}
        onMouseMove={(e) => handleInput(e.clientX, e.clientY)}
        onMouseDown={() => setIsCleaning(true)}
        onMouseUp={() => setIsCleaning(false)}
        onTouchMove={(e) => handleInput(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchStart={() => setIsCleaning(true)}
        onTouchEnd={() => setIsCleaning(false)}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* GLITCH WARNING OVERLAY */}
      {phase === 'warning' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 backdrop-blur-sm z-30">
              <div className="relative overflow-hidden bg-zinc-950 border-4 border-red-600 p-12 max-w-2xl w-full text-center shadow-[0_0_100px_rgba(255,0,0,0.6)]">
                  {/* Glitch Scanlines */}
                  <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50"></div>
                  <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
                  
                  <div className="relative z-10 flex flex-col items-center gap-6">
                      <div className="relative">
                          <Skull className="w-24 h-24 text-red-500 animate-bounce" />
                          <AlertTriangle className="w-12 h-12 text-yellow-400 absolute -top-2 -right-2 animate-ping" />
                      </div>
                      
                      <div className="space-y-2">
                        <h1 className="text-6xl font-black text-white tracking-widest" style={{ textShadow: '4px 4px 0px red' }}>
                            САБОТАЖ
                        </h1>
                        <h2 className="text-3xl font-bold text-red-500 font-mono typing-effect">
                            СБОЙ СИСТЕМЫ
                        </h2>
                      </div>
                      
                      <div className="bg-red-900/50 p-4 w-full border border-red-500/50">
                          <p className="text-red-200 font-mono text-sm uppercase animate-pulse">
                              {'>'} ВНЕДРЕНИЕ ВРЕДОНОСНОГО КОДА...<br/>
                              {'>'} УТЕЧКА ГИДРАВЛИКИ...<br/>
                              {'>'} ОТКАЗ СИСТЕМЫ НЕИЗБЕЖЕН
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* SPONGE & HUD */}
      {phase === 'cleaning' && (
        <>
            {/* Custom Interactive Sponge */}
            <div 
                className="pointer-events-none fixed z-20"
                style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    transform: `translate(-50%, -50%) rotate(${isCleaning ? '-12deg' : '0deg'}) scale(${isCleaning ? 0.9 : 1})`,
                    transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                <div className="relative group">
                    {/* Sponge Body with 3D Depth */}
                    <div className="w-48 h-32 relative">
                        {/* Side (Depth) */}
                        <div className="absolute inset-x-0 bottom-0 h-full bg-yellow-600 rounded-3xl translate-y-3 shadow-2xl" />
                        
                        {/* Top Face */}
                        <div 
                            className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-3xl border-2 border-yellow-200 overflow-hidden"
                            style={{
                                filter: `brightness(${Math.max(0.4, 1 - cleanPercent/150)}) sepia(${cleanPercent/200})`
                            }}
                        >
                             {/* Texture Pores */}
                             {[...Array(20)].map((_, i) => (
                                <div key={i} className="absolute bg-yellow-600/30 rounded-full mix-blend-multiply" 
                                    style={{
                                        width: Math.random() * 15 + 8 + 'px',
                                        height: Math.random() * 15 + 8 + 'px',
                                        top: Math.random() * 100 + '%',
                                        left: Math.random() * 100 + '%',
                                        boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.2)'
                                    }} 
                                />
                             ))}
                             
                             {/* Oil Stains */}
                             <div 
                                className="absolute inset-0 bg-black mix-blend-overlay transition-opacity duration-500"
                                style={{ 
                                    opacity: cleanPercent / 100, 
                                    backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 20%, black 120%)' 
                                }}
                             />
                        </div>

                        {/* Interactive Elements (Only when cleaning) */}
                        {isCleaning && (
                            <>
                                {/* Soap Bubbles */}
                                <div className="absolute -top-6 -left-6 w-8 h-8 bg-white/80 rounded-full animate-[ping_1s_infinite] blur-[1px]" />
                                <div className="absolute -bottom-2 -right-4 w-6 h-6 bg-white/60 rounded-full animate-[ping_1.5s_infinite] delay-100 blur-[1px]" />
                                <div className="absolute top-1/2 -left-8 w-4 h-4 bg-white/70 rounded-full animate-[ping_0.8s_infinite] delay-75" />
                                
                                {/* Dirt Particles */}
                                <div className="absolute top-0 right-1/2 w-2 h-2 bg-black/80 rounded-full animate-[bounce_0.6s_infinite]" />
                                <div className="absolute bottom-0 left-1/3 w-3 h-3 bg-black/60 rounded-full animate-[bounce_0.7s_infinite] delay-100" />
                                
                                {/* Squeeze Highlight */}
                                <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse" />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute top-10 left-0 right-0 flex justify-center pointer-events-none z-30">
                <div className="bg-zinc-950/80 backdrop-blur-md border border-red-500/30 px-8 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-2">
                    <div className="flex justify-between w-full text-xs font-mono text-red-400 mb-1">
                        <span>ВИДИМОСТЬ</span>
                        <span>КРИТИЧЕСКАЯ</span>
                    </div>
                    <div className="flex items-center gap-4 w-80">
                        <div className="flex-1 h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                            <div 
                                className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 transition-all duration-300 relative"
                                style={{ width: `${100 - cleanPercent}%` }} 
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[pulse_1s_infinite]"></div>
                            </div>
                        </div>
                        <span className="text-white font-mono font-bold text-lg">{Math.round(100 - cleanPercent)}%</span>
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};
