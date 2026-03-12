import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Ультрасовременные цвета с поддержкой динамики
const getGradientColors = (points: number) => {
    if (points <= 5) {
        return { stop1: "#ff4d4d", stop2: "#f43f5e", shadow: "rgba(244,63,94,0.6)", spark: "#fff" };
    } else if (points <= 10) {
        return { stop1: "#fbbf24", stop2: "#f97316", shadow: "rgba(249,115,22,0.6)", spark: "#fff" };
    } else {
        return { stop1: "#10b981", stop2: "#2dd4bf", shadow: "rgba(45,212,191,0.6)", spark: "#fff" };
    }
};

const PuntosIndicator3D = ({ currentPoints = 10, maxPoints = 15, isDarkTheme = true, isStatic = false }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    const segmentUnit = circumference / maxPoints;

    const fillPercentage = currentPoints / maxPoints;
    const targetOffset = circumference - (circumference * fillPercentage);

    const colors = getGradientColors(currentPoints);

    // Динамический цвет пустых сегментов
    const emptySegmentColor = isDarkTheme ? "rgba(2, 6, 23, 0.6)" : "rgba(0, 0, 0, 0.08)";

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 300);
        return () => clearTimeout(timer);
    }, []);

    // Генерируем больше углов для частиц, чтобы облако было плотнее
    const particleAngles = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);

    return (
        <motion.div
            className="relative w-64 h-64 flex items-center justify-center cursor-pointer transition-all duration-300 ease-out hover:scale-[1.03] active:scale-[0.97] group overflow-visible"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 1. ГЛУБОКОЕ АМБИЕНТНОЕ СВЕЧЕНИЕ */}
            <motion.div
                animate={{
                    scale: isHovered ? [1.1, 1.3, 1.1] : [1, 1.15, 1],
                    opacity: isHovered ? [0.2, 0.4, 0.2] : [0.15, 0.25, 0.15]
                }}
                transition={{ duration: isHovered ? 2 : 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-8 rounded-full blur-[40px] pointer-events-none"
                style={{ backgroundColor: colors.stop1 }}
            />

            <svg
                className="absolute inset-0 w-full h-full -rotate-90 transform overflow-visible"
                viewBox="0 0 200 200"
            >
                <defs>
                    <linearGradient id="cyberJuice" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor={colors.stop1} />
                        <stop offset="100%" stopColor={colors.stop2} />
                    </linearGradient>

                    <mask id="capsulesMask3D">
                        <circle
                            cx="100" cy="100" r={radius}
                            fill="transparent"
                            stroke="white"
                            strokeWidth="18"
                            strokeLinecap="round"
                            strokeDasharray={`8 ${segmentUnit - 8}`}
                        />
                    </mask>

                    <filter id="liquidGlass" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
                        <feSpecularLighting in="blur" surfaceScale="10" specularConstant="1.5" specularExponent="35" result="specular" lightingColor="#ffffff">
                            <fePointLight x="40" y="40" z="120" />
                        </feSpecularLighting>
                        <feComposite in="specular" in2="SourceAlpha" operator="in" result="specularMasked" />

                        {/* ПОЛИШ: Мягкое рассеивание блика для естественного вида стекла */}
                        <feGaussianBlur in="specularMasked" stdDeviation="0.8" result="specularBlurred" />

                        <feOffset in="SourceAlpha" dx="1" dy="1" result="offset" />
                        <feComposite in="SourceGraphic" in2="offset" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" result="innerShadow" />
                        <feMerge>
                            <feMergeNode in="innerShadow" />
                            <feMergeNode in="specularBlurred" />
                        </feMerge>
                    </filter>
                </defs>

                <circle
                    cx="100" cy="100" r={radius}
                    fill="transparent"
                    stroke={emptySegmentColor}
                    strokeWidth="18"
                    mask="url(#capsulesMask3D)"
                />

                <motion.circle
                    cx="100" cy="100" r={radius}
                    fill="transparent"
                    stroke="url(#cyberJuice)"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: (isLoaded || isStatic) ? targetOffset : circumference }}
                    transition={{
                        duration: isStatic ? 0 : 2.2,
                        ease: [0.34, 1.56, 0.64, 1]
                    }}
                    mask="url(#capsulesMask3D)"
                    filter={isStatic ? undefined : "url(#liquidGlass)"}
                    style={{
                        filter: `drop-shadow(0 0 ${isHovered ? '25px' : '15px'} ${colors.shadow})`
                    }}
                    className="group-hover:brightness-125 transition-all duration-300"
                />

                {(isLoaded || isStatic) && (
                    <motion.circle
                        cx="100" cy="100" r={radius}
                        fill="transparent"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="1 1000"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: targetOffset }}
                        transition={{ duration: isStatic ? 0 : 2.2, ease: [0.34, 1.56, 0.64, 1] }}
                        mask="url(#capsulesMask3D)"
                        className="opacity-80"
                    />
                )}
            </svg>

            {/* 4. ЦЕНТРАЛЬНЫЙ ТЕКСТ */}
            <div className="absolute flex flex-col items-center justify-center z-10">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={currentPoints}
                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={cn(
                            "text-6xl sm:text-7xl md:text-8xl font-black leading-none tracking-tighter",
                            isDarkTheme ? "text-white" : "text-black"
                        )}
                        style={{
                            textShadow: isDarkTheme
                                ? '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.1)'
                                : '0 4px 10px rgba(0,0,0,0.05)'
                        }}
                    >
                        {currentPoints}
                    </motion.span>
                </AnimatePresence>

                <div className="relative flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        className="flex items-center gap-2 mt-4"
                    >
                        <div className={cn("h-[1px] w-4", isDarkTheme ? "bg-slate-500" : "bg-slate-300")} />
                        <span className={cn(
                            "text-[10px] tracking-[0.5em] font-black uppercase font-mono transition-colors",
                            isDarkTheme ? "text-slate-300" : "text-slate-500"
                        )}>
                            Puntos
                        </span>
                        <div className={cn("h-[1px] w-4", isDarkTheme ? "bg-slate-500" : "bg-slate-300")} />
                    </motion.div>
                </div>
            </div>

            {/* 5. ХАОТИЧНЫЕ ИСКРЫ (Отключены в статичном режиме) */}
            {(isLoaded || isStatic) && !isStatic && particleAngles.map((angle, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                        opacity: isHovered ? [0, 1, 0] : [0, 0.8, 0],
                        scale: isHovered ? [0, 1.5, 0.5] : [0, 1, 0.5],
                        // Хаотичное движение: при наведении радиус вылета и разброс больше
                        x: isHovered
                            ? [0, Math.cos(angle * Math.PI / 180) * (130 + Math.random() * 40)]
                            : [0, Math.cos(angle * Math.PI / 180) * 110],
                        y: isHovered
                            ? [0, Math.sin(angle * Math.PI / 180) * (130 + Math.random() * 40)]
                            : [0, Math.sin(angle * Math.PI / 180) * 110],
                    }}
                    transition={{
                        duration: isHovered ? 1.5 + Math.random() : 3,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeOut"
                    }}
                    className={cn(
                        "absolute rounded-full blur-[1px] pointer-events-none",
                        isDarkTheme ? "bg-white" : "bg-orange-400"
                    )}
                    style={{
                        width: isHovered ? '3px' : '1.5px',
                        height: isHovered ? '3px' : '1.5px',
                        boxShadow: isHovered
                            ? (isDarkTheme ? `0 0 10px white` : `0 0 8px rgba(251, 146, 60, 0.8)`)
                            : 'none'
                    }}
                />
            ))}
        </motion.div>
    );
};

export default PuntosIndicator3D;
