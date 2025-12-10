interface LandingLogoProps {
  className?: string;
  showText?: boolean;
  showSubtitle?: boolean;
  theme?: "light" | "dark";
}

export const LandingLogo: React.FC<LandingLogoProps> = ({
  className = "",
  showText = true,
  showSubtitle = false,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const glowColor = isDark ? "#6366f1" : "#4f46e5"; // indigo-500
  const accentColor = isDark ? "#818cf8" : "#6366f1"; // indigo-400
  const networkColor = isDark ? "#a5b4fc" : "#818cf8"; // indigo-300

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Логотип: Машина с нейросетью внутри */}
        <div className="relative flex-shrink-0">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-2xl"
          >
            <defs>
              {/* Градиент для свечения */}
              <linearGradient id="car-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={glowColor} stopOpacity="0.8" />
                <stop offset="50%" stopColor={accentColor} stopOpacity="0.9" />
                <stop offset="100%" stopColor={networkColor} stopOpacity="0.7" />
              </linearGradient>
              
              {/* Градиент для нейросети */}
              <linearGradient id="network-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={networkColor} stopOpacity="0.9" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.6" />
              </linearGradient>
              
              {/* Фильтр свечения */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Контур машины (спортивный автомобиль в профиль) */}
            <path
              d="M8 32 C10 20 16 14 24 14 L32 14 C36 14 39 12 41 10 C43 8 44 8 45 10 C46 12 46.5 16 46.5 20 L46.5 24 C46.5 26 45.5 27 44 27 L40 27 C39 30 36 32 32 32 C28 32 25 29.5 24 27 L20 27 C19 29.5 16 32 12 32 C8 32 5.5 30 5 27 L4 27 C2.5 27 1.5 26 1.5 24.5 L1.5 20 C1.5 18 2 16 3 14 L8 32 Z"
              stroke="url(#car-glow)"
              strokeWidth="1.5"
              fill="none"
              filter="url(#glow)"
              className="animate-pulse"
              style={{ animationDuration: '3s' }}
            />

            {/* Нейросеть внутри машины (соединенные точки и линии) */}
            <g opacity="0.9">
              {/* Узлы нейросети */}
              <circle cx="18" cy="20" r="2" fill="url(#network-glow)" filter="url(#glow)" />
              <circle cx="24" cy="18" r="2" fill="url(#network-glow)" filter="url(#glow)" />
              <circle cx="30" cy="20" r="2" fill="url(#network-glow)" filter="url(#glow)" />
              <circle cx="20" cy="24" r="1.5" fill="url(#network-glow)" filter="url(#glow)" />
              <circle cx="28" cy="24" r="1.5" fill="url(#network-glow)" filter="url(#glow)" />
              <circle cx="24" cy="22" r="2.5" fill="url(#network-glow)" filter="url(#glow)" />
              
              {/* Соединительные линии нейросети */}
              <line x1="18" y1="20" x2="24" y2="18" stroke="url(#network-glow)" strokeWidth="1" opacity="0.6" filter="url(#glow)" />
              <line x1="24" y1="18" x2="30" y2="20" stroke="url(#network-glow)" strokeWidth="1" opacity="0.6" filter="url(#glow)" />
              <line x1="18" y1="20" x2="20" y2="24" stroke="url(#network-glow)" strokeWidth="1" opacity="0.6" filter="url(#glow)" />
              <line x1="30" y1="20" x2="28" y2="24" stroke="url(#network-glow)" strokeWidth="1" opacity="0.6" filter="url(#glow)" />
              <line x1="20" y1="24" x2="24" y2="22" stroke="url(#network-glow)" strokeWidth="1" opacity="0.6" filter="url(#glow)" />
              <line x1="28" y1="24" x2="24" y2="22" stroke="url(#network-glow)" strokeWidth="1" opacity="0.6" filter="url(#glow)" />
              <line x1="24" y1="22" x2="24" y2="18" stroke="url(#network-glow)" strokeWidth="1" opacity="0.6" filter="url(#glow)" />
            </g>

            {/* Дополнительные детали машины (фары) */}
            <circle cx="44" cy="22" r="1.5" fill={accentColor} opacity="0.8" filter="url(#glow)" />
            <circle cx="44" cy="24" r="1.5" fill={accentColor} opacity="0.8" filter="url(#glow)" />
          </svg>
        </div>

        {/* Текст: Skily */}
        {showText && (
          <div className="flex flex-col">
            <span className={`text-3xl font-black tracking-tight leading-none ${isDark ? "text-white" : "text-zinc-900"} font-sans`}>
              Skily
            </span>
            {showSubtitle && (
              <span className={`text-xs font-semibold tracking-wider uppercase mt-0.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>
                AI-платформа для DGT
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};



