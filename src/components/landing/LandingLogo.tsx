

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
  const textColor = isLight ? "text-white" : "text-slate-900";
  const bodyColor = isLight ? "#ffffff" : "#4f46e5";
  const accentColor = isLight ? "rgba(255,255,255,0.65)" : "#a5b4fc";
  const windowColor = isLight ? "rgba(15,23,42,0.2)" : "#0f172a";

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
              d="M33 24 C42 16 53 12 60 12 C67 12 77 16 83 24"
              stroke={accentColor}
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M38 26 H70 C78 26 83 30 87 36 L95 48"
              stroke={windowColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M24 44 L34 35 C37 32 40 31 44 31 H76 C81 31 85 33 88 37 L96 46"
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
              className={`text-[9px] font-bold uppercase tracking-[0.2em] ${
                theme === "light" ? "text-indigo-200" : "text-indigo-500"
              }`}
            >
              Global
            </span>
          </div>
        </div>
      )}
    </div>
  );
};



