import { motion } from "framer-motion";
import { MapPin, Navigation, CheckCircle2, Circle } from "lucide-react";
import { Link } from "react-router-dom";

interface GPSRoadmapProps {
  progress: number; // 0-100
  currentTopic?: string;
  nextTopics?: Array<{ id: string; name: string; completed: boolean }>;
}

export function GPSRoadmap({
  progress,
  currentTopic,
  nextTopics = [],
}: GPSRoadmapProps) {
  // Simulate route points
  const routePoints = Array.from({ length: 8 }, (_, i) => ({
    id: `point-${i}`,
    completed: i < Math.floor((progress / 100) * 8),
    isCurrent: i === Math.floor((progress / 100) * 8),
    label: `Тема ${i + 1}`,
  }));

  return (
    <div className="relative h-full min-h-[300px] bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 overflow-hidden">
      {/* Map background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-500" />
            <h3 className="text-lg font-mono font-bold text-white">Navigation</h3>
          </div>
          <div className="text-xs font-mono text-slate-400">
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Route visualization */}
        <div className="relative mb-6">
          {/* Route line */}
          <svg className="absolute inset-0 w-full h-32" style={{ height: "200px" }}>
            <motion.path
              d={`M 20 100 Q 100 50, 180 60 T 340 40 T 500 60 T 660 80`}
              fill="none"
              stroke="rgba(34, 197, 94, 0.3)"
              strokeWidth="3"
              strokeDasharray="5 5"
            />
            <motion.path
              d={`M 20 100 Q 100 50, 180 60 T 340 40 T 500 60 T 660 80`}
              fill="none"
              stroke="rgba(34, 197, 94, 1)"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>

          {/* Route points */}
          <div className="relative flex items-center justify-between" style={{ height: "200px" }}>
            {routePoints.map((point, idx) => {
              const position = (idx / (routePoints.length - 1)) * 100;
              
              return (
                <motion.div
                  key={point.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative flex flex-col items-center"
                  style={{ position: "absolute", left: `${position}%`, transform: "translateX(-50%)" }}
                >
                  {point.completed ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle2 className="w-8 h-8 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    </motion.div>
                  ) : point.isCurrent ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <MapPin className="w-8 h-8 text-cyan-500 drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" fill="currentColor" />
                    </motion.div>
                  ) : (
                    <Circle className="w-6 h-6 text-slate-600" />
                  )}
                  <div className="mt-2 text-[10px] font-mono text-slate-400 text-center max-w-[60px] truncate">
                    {point.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Current destination */}
        {currentTopic && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-mono text-slate-400">Current Destination</span>
            </div>
            <div className="text-sm font-mono font-semibold text-white">{currentTopic}</div>
          </div>
        )}

        {/* Next destinations */}
        {nextTopics.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-mono text-slate-400 mb-2">Next Waypoints</div>
            {nextTopics.slice(0, 3).map((topic) => (
              <Link
                key={topic.id}
                to={`/topic/${topic.id}`}
                className="block p-2 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {topic.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  )}
                  <span className="text-xs font-mono text-slate-300 truncate">{topic.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

