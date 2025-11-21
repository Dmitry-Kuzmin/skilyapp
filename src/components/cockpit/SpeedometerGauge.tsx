import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpeedometerGaugeProps {
  value: number; // 0-100
  label: string;
  unit?: string;
  size?: number;
  color?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

export function SpeedometerGauge({
  value,
  label,
  unit = "%",
  size = 200,
  color = "primary",
  className,
}: SpeedometerGaugeProps) {
  const radius = (size - 40) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const colorClasses = {
    primary: {
      gradient: ["#3b82f6", "#60a5fa", "#93c5fd"],
      glow: "drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]",
      text: "text-blue-400",
    },
    success: {
      gradient: ["#10b981", "#34d399", "#6ee7b7"],
      glow: "drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]",
      text: "text-green-400",
    },
    warning: {
      gradient: ["#f59e0b", "#fbbf24", "#fcd34d"],
      glow: "drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]",
      text: "text-yellow-400",
    },
    danger: {
      gradient: ["#ef4444", "#f87171", "#fca5a5"],
      glow: "drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]",
      text: "text-red-400",
    },
  };

  const colors = colorClasses[color];
  const gradientId = `speedometer-gradient-${color}`;

  // Calculate angle for needle (0-180 degrees for semicircle)
  const needleAngle = (value / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size / 2 + 20 }}>
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${size} ${size / 2 + 20}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="50%" stopColor={colors.gradient[1]} />
            <stop offset="100%" stopColor={colors.gradient[2]} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={`M 20 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2 + 10}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <motion.path
          d={`M 20 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2 + 10}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={colors.glow}
          filter="url(#glow)"
        />

        {/* Needle */}
        <g transform={`translate(${size / 2}, ${size / 2 + 10})`}>
          <motion.g
            initial={{ rotate: -90 }}
            animate={{ rotate: needleAngle }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={-radius + 10}
              stroke={colors.gradient[0]}
              strokeWidth="4"
              strokeLinecap="round"
              className={colors.glow}
              filter="url(#glow)"
            />
            {/* Needle center circle */}
            <circle cx="0" cy="0" r="6" fill={colors.gradient[0]} className={colors.glow} />
          </motion.g>
        </g>

        {/* Center value display */}
        <foreignObject x={size / 2 - 60} y={size / 2 - 20} width="120" height="60">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={cn("text-4xl font-bold font-mono", colors.text)}
              style={{ textShadow: `0 0 20px ${colors.gradient[1]}` }}
            >
              {Math.round(value)}
              <span className="text-xl ml-1">{unit}</span>
            </motion.div>
          </div>
        </foreignObject>

        {/* Label */}
        <foreignObject x={size / 2 - 80} y={size / 2 + 30} width="160" height="30">
          <div className="text-center">
            <div className="text-xs text-gray-400 font-mono uppercase tracking-wider">
              {label}
            </div>
          </div>
        </foreignObject>

        {/* Scale marks */}
        {[0, 25, 50, 75, 100].map((mark, idx) => {
          const angle = (mark / 100) * 180 - 90;
          const rad = (angle * Math.PI) / 180;
          const x1 = size / 2 + (radius - 15) * Math.cos(rad);
          const y1 = size / 2 + 10 + (radius - 15) * Math.sin(rad);
          const x2 = size / 2 + radius * Math.cos(rad);
          const y2 = size / 2 + 10 + radius * Math.sin(rad);

          return (
            <g key={mark}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <text
                x={size / 2 + (radius - 35) * Math.cos(rad)}
                y={size / 2 + 10 + (radius - 35) * Math.sin(rad) + 4}
                fill="rgba(255,255,255,0.5)"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {mark}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

