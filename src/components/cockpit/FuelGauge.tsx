import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface FuelGaugeProps {
  value: number; // 0-100 (current streak / 90)
  currentStreak: number;
  maxStreak: number;
  size?: number;
  className?: string;
}

export function FuelGauge({
  value,
  currentStreak,
  maxStreak,
  size = 180,
  className,
}: FuelGaugeProps) {
  const radius = (size - 40) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  // Color based on fuel level
  const getColor = () => {
    if (value < 20) return { gradient: ["#ef4444", "#f87171"], glow: "drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]", text: "text-red-400" };
    if (value < 50) return { gradient: ["#f59e0b", "#fbbf24"], glow: "drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]", text: "text-yellow-400" };
    return { gradient: ["#10b981", "#34d399"], glow: "drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]", text: "text-green-400" };
  };

  const colors = getColor();
  const gradientId = "fuel-gradient";

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size / 2 + 30 }}>
      <svg
        width={size}
        height={size / 2 + 30}
        viewBox={`0 0 ${size} ${size / 2 + 30}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
          <filter id="fuel-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={`M 20 ${size / 2 + 20} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2 + 20}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Fuel level arc */}
        <motion.path
          d={`M 20 ${size / 2 + 20} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2 + 20}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={colors.glow}
          filter="url(#fuel-glow)"
        />

        {/* Center icon and value */}
        <foreignObject x={size / 2 - 50} y={size / 2 - 30} width="100" height="80">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <Flame
                className={cn("w-8 h-8", colors.text, currentStreak >= 7 ? "animate-pulse" : "")}
                style={{ filter: `drop-shadow(0 0 10px ${colors.gradient[0]})` }}
              />
              <div className={cn("text-2xl font-bold font-mono", colors.text)}>
                {currentStreak}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                / {maxStreak} дней
              </div>
            </motion.div>
          </div>
        </foreignObject>

        {/* Label */}
        <foreignObject x={size / 2 - 60} y={size / 2 + 40} width="120" height="20">
          <div className="text-center">
            <div className="text-xs text-gray-400 font-mono uppercase tracking-wider">
              Серия
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

