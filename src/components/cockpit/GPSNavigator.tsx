import { motion } from "framer-motion";
import { MapPin, Navigation, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface GPSNavigatorProps {
  currentDay: number;
  maxDays: number;
  completedDays: number[];
  rewards?: Array<{ day: number; xp?: number; coins?: number }>;
  className?: string;
}

export function GPSNavigator({
  currentDay,
  maxDays,
  completedDays,
  rewards = [],
  className,
}: GPSNavigatorProps) {
  const progress = (currentDay / maxDays) * 100;

  return (
    <div
      className={cn(
        "relative p-6 rounded-lg border-2 border-cyan-500/30 bg-gradient-to-br from-black/80 via-gray-900/80 to-black/80 backdrop-blur-xl",
        "font-mono",
        className
      )}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10 rounded-lg"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
            <Navigation className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm text-cyan-400 uppercase tracking-wider">GPS Navigator</div>
            <div className="text-xs text-gray-400">Путь водителя</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-cyan-400">{currentDay}</div>
          <div className="text-xs text-gray-400">из {maxDays}</div>
        </div>
      </div>

      {/* Road map */}
      <div className="relative z-10 mb-4">
        <div className="relative h-32 overflow-hidden rounded-lg bg-black/50 border border-cyan-500/20">
          {/* Road line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent transform -translate-y-1/2">
            {/* Dashed line effect */}
            <div
              className="h-full bg-cyan-500/30"
              style={{
                backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 10px, cyan 10px, cyan 20px)",
                width: `${progress}%`,
              }}
            />
          </div>

          {/* Day markers */}
          <div className="absolute inset-0 flex items-center justify-between px-4">
            {Array.from({ length: Math.min(7, maxDays) }, (_, i) => {
              const day = Math.floor((i / Math.min(6, maxDays - 1)) * maxDays) + 1;
              const isCompleted = completedDays.includes(day);
              const isCurrent = day === currentDay;
              const isUpcoming = day > currentDay;

              return (
                <motion.div
                  key={day}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    isCompleted
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : isCurrent
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse"
                      : isUpcoming
                      ? "bg-gray-800/50 border-gray-600 text-gray-500"
                      : "bg-gray-800/50 border-gray-600 text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{day}</span>
                  )}
                  {/* Day label */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] text-gray-400">
                    Д{day}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Current position indicator */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative">
              <div className="w-4 h-4 bg-cyan-500 rounded-full border-2 border-black animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 bg-cyan-500 rounded-full animate-ping opacity-75" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Прогресс маршрута</span>
          <span className="font-bold text-cyan-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
          />
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-cyan-500/50" />
      <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-cyan-500/50" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-cyan-500/50" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-cyan-500/50" />
    </div>
  );
}

