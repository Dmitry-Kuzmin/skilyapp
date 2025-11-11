import React from "react";
import { cn } from "@/lib/utils";

export type LumiMood = "idle" | "happy" | "thinking" | "encouraging" | "celebrating";

interface LumiCharacterProps {
  size?: "sm" | "md" | "lg" | "xl";
  mood?: LumiMood;
  className?: string;
  animate?: boolean;
}

const sizeMap = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
};

export const LumiCharacter = ({ 
  size = "md", 
  mood = "idle", 
  className,
  animate = true 
}: LumiCharacterProps) => {
  const sizeClass = sizeMap[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center", sizeClass, className)}>
      {/* Glow effect */}
      {animate && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/30 via-orange-400/20 to-amber-400/30 blur-xl animate-pulse-slow" />
      )}
      
      {/* Main character SVG */}
      <svg
        viewBox="0 0 100 100"
        className={cn(
          "relative z-10 drop-shadow-lg",
          animate && mood === "idle" && "animate-lumi-float",
          animate && mood === "happy" && "animate-lumi-bounce",
          animate && mood === "celebrating" && "animate-lumi-bounce",
          animate && mood === "thinking" && "animate-lumi-sway"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body - glowing circle */}
        <defs>
          <radialGradient id="bodyGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="50%" stopColor="#FDB022" />
            <stop offset="100%" stopColor="#FF9500" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main body */}
        <circle 
          cx="50" 
          cy="55" 
          r="28" 
          fill="url(#bodyGradient)"
          filter="url(#glow)"
          className={animate ? "animate-pulse-slow" : ""}
        />

        {/* Left antenna */}
        <path
          d="M 35 30 Q 30 20 28 15"
          stroke="#FDB022"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={animate && mood === "happy" ? "animate-lumi-antenna-wave" : ""}
        />
        <circle 
          cx="28" 
          cy="15" 
          r="4" 
          fill="#FFE066"
          className={animate ? "animate-pulse" : ""}
        >
          {animate && (
            <animate 
              attributeName="opacity" 
              values="1;0.5;1" 
              dur="1.5s" 
              repeatCount="indefinite" 
            />
          )}
        </circle>

        {/* Right antenna */}
        <path
          d="M 65 30 Q 70 20 72 15"
          stroke="#FDB022"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={animate && mood === "happy" ? "animate-lumi-antenna-wave-reverse" : ""}
        />
        <circle 
          cx="72" 
          cy="15" 
          r="4" 
          fill="#FFE066"
          className={animate ? "animate-pulse" : ""}
        >
          {animate && (
            <animate 
              attributeName="opacity" 
              values="1;0.5;1" 
              dur="1.5s" 
              repeatCount="indefinite"
              begin="0.3s"
            />
          )}
        </circle>

        {/* Eyes */}
        {mood === "happy" || mood === "celebrating" ? (
          <>
            {/* Happy eyes - curved lines */}
            <path
              d="M 38 48 Q 41 52 44 48"
              stroke="#333"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 56 48 Q 59 52 62 48"
              stroke="#333"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : mood === "thinking" ? (
          <>
            {/* Thinking eyes - looking up */}
            <circle cx="40" cy="46" r="3" fill="#333" />
            <circle cx="60" cy="46" r="3" fill="#333" />
          </>
        ) : (
          <>
            {/* Normal eyes - large and friendly */}
            <circle cx="40" cy="50" r="4" fill="#333" />
            <circle cx="60" cy="50" r="4" fill="#333" />
            {/* Eye shine */}
            <circle cx="41.5" cy="48.5" r="1.5" fill="white" />
            <circle cx="61.5" cy="48.5" r="1.5" fill="white" />
          </>
        )}

        {/* Mouth */}
        {mood === "happy" || mood === "celebrating" ? (
          <path
            d="M 38 62 Q 50 70 62 62"
            stroke="#333"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === "encouraging" ? (
          <path
            d="M 38 64 Q 50 68 62 64"
            stroke="#333"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === "thinking" ? (
          <circle cx="50" cy="64" r="2" fill="#333" />
        ) : (
          <path
            d="M 42 64 L 58 64"
            stroke="#333"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Sparkles for celebrating */}
        {mood === "celebrating" && (
          <>
            <circle cx="20" cy="40" r="2" fill="#FFE066" className="animate-ping" />
            <circle cx="80" cy="45" r="2" fill="#FFE066" className="animate-ping" style={{ animationDelay: "0.2s" }} />
            <circle cx="30" cy="70" r="2" fill="#FFE066" className="animate-ping" style={{ animationDelay: "0.4s" }} />
            <circle cx="70" cy="75" r="2" fill="#FFE066" className="animate-ping" style={{ animationDelay: "0.6s" }} />
          </>
        )}
      </svg>
    </div>
  );
};


