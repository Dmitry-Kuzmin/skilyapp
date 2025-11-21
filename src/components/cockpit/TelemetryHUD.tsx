import { motion } from "framer-motion";
import { useMemo } from "react";

interface TelemetryHUDProps {
  readinessPercent: number;
  accuracy: number;
  testsCompleted: number;
  streak: number;
  coins: number;
}

export function TelemetryHUD({
  readinessPercent,
  accuracy,
  testsCompleted,
  streak,
  coins,
}: TelemetryHUDProps) {
  const size = 280;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (readinessPercent / 100) * circumference;

  const speedometerColor = useMemo(() => {
    if (readinessPercent >= 80) return "from-green-500 via-emerald-400 to-green-500";
    if (readinessPercent >= 60) return "from-yellow-500 via-orange-400 to-yellow-500";
    return "from-red-500 via-orange-500 to-red-500";
  }, [readinessPercent]);

  const getSpeedometerGlow = () => {
    if (readinessPercent >= 80) return "shadow-[0_0_40px_rgba(34,197,94,0.6)]";
    if (readinessPercent >= 60) return "shadow-[0_0_40px_rgba(234,179,8,0.6)]";
    return "shadow-[0_0_40px_rgba(239,68,68,0.6)]";
  };

  // Calculate angle for needle (0% = -135deg, 100% = 135deg)
  const needleAngle = -135 + (readinessPercent / 100) * 270;

  return (
    <div className="relative flex items-center justify-center">
      {/* Main Speedometer */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG Circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="speedometer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={readinessPercent >= 80 ? "#22c55e" : readinessPercent >= 60 ? "#eab308" : "#ef4444"} />
              <stop offset="50%" stopColor={readinessPercent >= 80 ? "#4ade80" : readinessPercent >= 60 ? "#f59e0b" : "#f97316"} />
              <stop offset="100%" stopColor={readinessPercent >= 80 ? "#22c55e" : readinessPercent >= 60 ? "#eab308" : "#ef4444"} />
            </linearGradient>
            {/* Glow filter */}
            <filter id="glow-speedometer">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-800/50"
          />

          {/* Gradient segments for visual effect */}
          {[0, 20, 40, 60, 80, 100].map((percent, idx) => {
            const segmentOffset = circumference - (percent / 100) * circumference;
            const isActive = readinessPercent >= percent;
            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={isActive ? `url(#speedometer-gradient)` : "currentColor"}
                strokeWidth={isActive ? strokeWidth : strokeWidth * 0.7}
                fill="none"
                strokeDasharray={circumference * 0.15}
                strokeDashoffset={segmentOffset}
                strokeLinecap="round"
                className={isActive ? "opacity-100" : "opacity-30 text-slate-700"}
                style={{ filter: isActive ? `url(#glow-speedometer)` : "none" }}
              />
            );
          })}

          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#speedometer-gradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={getSpeedometerGlow()}
            style={{ filter: "url(#glow-speedometer)" }}
          />

          {/* Needle (center indicator) */}
          <motion.g
            initial={{ rotate: -135 }}
            animate={{ rotate: needleAngle }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            transform={`rotate(${needleAngle} ${size / 2} ${size / 2})`}
          >
            <line
              x1={size / 2}
              y1={size / 2}
              x2={size / 2}
              y2={size / 2 - radius + 20}
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              className="drop-shadow-lg"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r="8"
              fill="white"
              className="drop-shadow-lg"
            />
          </motion.g>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-mono text-slate-400 mb-1">READINESS</div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              className={`text-5xl md:text-6xl font-bold font-mono mb-1 ${
                readinessPercent >= 80
                  ? "text-green-500"
                  : readinessPercent >= 60
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
              style={{
                textShadow: `0 0 20px ${
                  readinessPercent >= 80
                    ? "rgba(34, 197, 94, 0.8)"
                    : readinessPercent >= 60
                    ? "rgba(234, 179, 8, 0.8)"
                    : "rgba(239, 68, 68, 0.8)"
                }`,
              }}
            >
              {Math.round(readinessPercent)}%
            </motion.div>
            <div className="text-xs font-mono text-slate-500">
              {readinessPercent >= 80
                ? "READY"
                : readinessPercent >= 60
                ? "PREPARING"
                : "TRAINING"}
            </div>
          </div>
        </div>
      </div>

      {/* Mini metrics around speedometer */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { label: "ACCURACY", value: `${accuracy}%`, angle: 0, position: "top" },
          { label: "TESTS", value: `${testsCompleted}`, angle: 90, position: "right" },
          { label: "STREAK", value: `${streak}d`, angle: 180, position: "bottom" },
          { label: "COINS", value: `${coins}`, angle: 270, position: "left" },
        ].map((metric, idx) => {
          const angleRad = (metric.angle * Math.PI) / 180;
          const distance = size / 2 + 60;
          const x = size / 2 + Math.cos(angleRad) * distance;
          const y = size / 2 + Math.sin(angleRad) * distance;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + idx * 0.1, type: "spring", stiffness: 200 }}
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg p-2 min-w-[70px] text-center">
                <div className="text-[8px] font-mono text-slate-400 mb-0.5">
                  {metric.label}
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {metric.value}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

