import { motion } from "@/components/optimized/Motion";
import { Target, Flame, Trophy, Coins } from "lucide-react";
import { TelemetryHUD } from "./TelemetryHUD";
import { IgnitionKey } from "./IgnitionKey";
import { GPSRoadmap } from "./GPSRoadmap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface DigitalCockpitProps {
  readinessPercent: number;
  accuracy: number;
  testsCompleted: number;
  streak: number;
  coins: number;
  dailyTasks: Array<{ id: string; title: string; completed: boolean; progress?: number }>;
  onStartTest: () => void;
  currentTopic?: string;
  progress: number;
  profileId?: string;
}

export function DigitalCockpit({
  readinessPercent,
  accuracy,
  testsCompleted,
  streak,
  coins,
  dailyTasks,
  onStartTest,
  currentTopic,
  progress,
  profileId,
}: DigitalCockpitProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white"
    >
      {/* Grid pattern background */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black font-mono mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            DIGITAL COCKPIT
          </h1>
          <p className="text-sm font-mono text-slate-400">• System Online • Ready</p>
        </motion.div>

        {/* Main Cockpit Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Display - Tasks & Stats */}
          <motion.div variants={itemVariants} className="space-y-4">
            {/* Daily Tasks */}
            <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-sm font-mono font-bold text-white">MISSIONS</h3>
                </div>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs font-mono">
                  {dailyTasks.filter((t) => t.completed).length}/{dailyTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {dailyTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className={`p-2 rounded-lg border ${
                      task.completed
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-slate-800/30 border-slate-700/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {task.completed ? (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-600" />
                      )}
                      <span className="text-xs font-mono text-slate-300 truncate">
                        {task.title}
                      </span>
                    </div>
                    {task.progress !== undefined && !task.completed && (
                      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {dailyTasks.length > 3 && (
                <Link
                  to="/tasks"
                  className="block mt-3 text-center text-xs font-mono text-cyan-500 hover:text-cyan-400 transition-colors"
                >
                  View All →
                </Link>
              )}
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-mono text-slate-400">STREAK</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">{streak}</div>
                <div className="text-[10px] font-mono text-slate-500">days</div>
              </Card>

              <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-mono text-slate-400">COINS</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">{coins}</div>
                <div className="text-[10px] font-mono text-slate-500">available</div>
              </Card>
            </div>
          </motion.div>

          {/* Center Console - Telemetry HUD */}
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center space-y-6">
            <TelemetryHUD
              readinessPercent={readinessPercent}
              accuracy={accuracy}
              testsCompleted={testsCompleted}
              streak={streak}
              coins={coins}
            />
            <IgnitionKey onStart={onStartTest} isReady={readinessPercent > 0} />
          </motion.div>

          {/* Right Display - GPS Navigation */}
          <motion.div variants={itemVariants}>
            <GPSRoadmap
              progress={progress}
              currentTopic={currentTopic}
              accuracy={accuracy}
              profileId={profileId}
            />
          </motion.div>
        </div>

        {/* Bottom Status Bar */}
        <motion.div
          variants={itemVariants}
          className="mt-8 p-4 bg-slate-900/30 backdrop-blur-sm border border-slate-700/50 rounded-lg"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-400">System Status: ONLINE</span>
              </div>
              <div className="text-xs font-mono text-slate-500">
                Accuracy: <span className="text-white">{accuracy}%</span>
              </div>
              <div className="text-xs font-mono text-slate-500">
                Tests: <span className="text-white">{testsCompleted}</span>
              </div>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Last update: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Neon glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </motion.div>
  );
}

