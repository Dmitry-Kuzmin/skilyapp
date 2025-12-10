import React from 'react';

interface SkilyLogoProps {
  className?: string;
  showText?: boolean;
}

export const SkilyLogo: React.FC<SkilyLogoProps> = ({ 
  className = "h-8", 
  showText = true 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* ИКОНКА МАШИНЫ */}
      <svg
        viewBox="0 0 100 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
        aria-label="Skily Logo"
      >
        <defs>
          {/* Фирменный градиент: от фиолетового к голубому */}
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" /> {/* violet-500 */}
            <stop offset="100%" stopColor="#38BDF8" /> {/* sky-400 */}
          </linearGradient>
          
          {/* Эффект свечения (Neon Glow) */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Группа с применением фильтра свечения */}
        <g filter="url(#glow)">
          {/* Динамичный корпус машины */}
          <path
            d="M10 45 L5 45 L8 35 L25 25 L55 23 L85 30 L95 38 L95 45 L85 45"
            stroke="url(#neonGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Колеса (упрощенные, чтобы не перегружать) */}
          <circle cx="25" cy="45" r="7" stroke="url(#neonGradient)" strokeWidth="3" />
          <circle cx="80" cy="45" r="7" stroke="url(#neonGradient)" strokeWidth="3" />
          
          {/* Линии скорости (Speed Lines) - создают динамику */}
          <path 
            d="M-5 35 L0 35 M-10 42 L-2 42" 
            stroke="url(#neonGradient)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            opacity="0.6"
          />
        </g>
      </svg>

      {/* ТЕКСТОВАЯ ЧАСТЬ */}
      {showText && (
        <span className="font-bold text-2xl tracking-tight text-white select-none">
          Skily
        </span>
      )}
    </div>
  );
};

