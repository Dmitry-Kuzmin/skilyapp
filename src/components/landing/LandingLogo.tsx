

interface LandingLogoProps {
  className?: string;
  showText?: boolean;
  theme?: "light" | "dark";
}

export const LandingLogo: React.FC<LandingLogoProps> = ({
  className = "",
  showText = true,
  theme = "dark",
}) => {
  const isLight = theme === "light";
  const textColor = isLight ? "text-white" : "text-white";
  const bodyColor = isLight ? "#ffffff" : "#4f46e5";
  const accentColor = isLight ? "rgba(255,255,255,0.65)" : "#a5b4fc";
  const windowColor = isLight ? "rgba(15,23,42,0.2)" : "#0f172a";
  const accentTextColor = isLight ? "text-indigo-200" : "text-indigo-400";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg
          viewBox="0 0 120 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-lg"
        >
          <defs>
            <linearGradient id="logo-glow" x1="0" y1="0" x2="120" y2="70" gradientUnits="userSpaceOnUse">
              <stop stopColor={accentColor} stopOpacity="0.7" />
              <stop stopColor={bodyColor} stopOpacity="0.9" offset="1" />
            </linearGradient>
            <clipPath id="logo-clip">
              <rect x="0" y="0" width="120" height="70" rx="14" />
            </clipPath>
          </defs>
          <rect
            x="0"
            y="0"
            width="120"
            height="70"
            rx="14"
            fill={isLight ? "rgba(79,70,229,0.55)" : "rgba(15,23,42,0.9)"}
            stroke={isLight ? "rgba(255,255,255,0.6)" : "rgba(79,70,229,0.6)"}
            strokeWidth="1"
          />
          <g clipPath="url(#logo-clip)">
            <path
              d="M10 48 C14 32 22 24 36 24 L66 24 C72 24 77 22 82 19 C88 16 92 16 98 20 C106 26 110 36 112 46 L112 52 C112 54 111 55 109 55 L104 55 C103 60.5 98.5 65 92.5 65 C86.5 65 82.2 60.2 81.5 55 L44.5 55 C43.8 60.2 39.5 65 33.5 65 C27.5 65 22.8 60.5 22 55 L12 55 C10.9 55 10 54.1 10 53 L10 48 Z"
              fill="url(#logo-glow)"
            />
            <path
              d="M18 46 C22 30 38 16 60 15 C82 14 100 28 106 44"
              fill={accentColor}
              opacity="0.35"
            />
            <path
              d="M25 42 C30 29 42 20 60 20 C78 20 92 29 98 42"
              stroke={accentColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M36 28 H72 C80 28 86 32 90 38 L98 48"
              stroke={windowColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M26 44 L36 34 C39 31 43 30 47 30 H75 C81 30 85 32 88 35 L96 44"
              stroke={windowColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="33" cy="55" r="7" fill={windowColor} stroke={accentColor} strokeWidth="3" />
            <circle cx="92" cy="55" r="7" fill={windowColor} stroke={accentColor} strokeWidth="3" />
            <rect x="50" y="48" width="24" height="3" rx="1.5" fill={windowColor} opacity="0.7" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`text-xl font-extrabold tracking-tighter leading-none ${textColor} font-sans`}
          >
            Skily
          </span>
          <div className="flex items-center gap-1">
            <div
              className={`h-[2px] w-3 ${
                theme === "light" ? "bg-indigo-300" : "bg-indigo-500"
              }`}
            ></div>
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${accentTextColor}`}
            >
              Global
            </span>
          </div>
        </div>
      )}
    </div>
  );
};



