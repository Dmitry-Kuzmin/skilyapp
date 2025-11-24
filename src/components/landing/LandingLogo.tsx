import React from "react";

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
  const textColor = theme === "light" ? "text-white" : "text-slate-900";
  const primaryFill = theme === "light" ? "#ffffff" : "#4f46e5";
  const secondaryFill = theme === "light" ? "rgba(255,255,255,0.5)" : "#818cf8";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-lg"
        >
          <path
            d="M 40 10 L 90 10 L 75 50 L 25 50 Z"
            fill={primaryFill}
            transform="skewX(-10)"
          />
          <path
            d="M 10 90 L 60 90 L 75 50 L 25 50 Z"
            fill={secondaryFill}
            transform="skewX(-10)"
          />
          <rect
            x="45"
            y="48"
            width="10"
            height="4"
            fill={theme === "light" ? "#4f46e5" : "#0f172a"}
            transform="skewX(-10)"
          />
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



