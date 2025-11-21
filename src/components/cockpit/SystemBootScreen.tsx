import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

interface SystemBootScreenProps {
  onComplete: () => void;
}

interface BootModule {
  name: string;
  status: "loading" | "success";
}

export function SystemBootScreen({ onComplete }: SystemBootScreenProps) {
  const [modules, setModules] = useState<BootModule[]>([
    { name: "Engine", status: "loading" },
    { name: "Sensors", status: "loading" },
    { name: "Navigation", status: "loading" },
    { name: "AI Assistant", status: "loading" },
  ]);
  const [currentModule, setCurrentModule] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Play startup sound
  useEffect(() => {
    const audio = new Audio("/sounds/startup.mp3").catch(() => {
      // Fallback if sound file doesn't exist
      console.log("Startup sound not found, skipping");
    });
    
    if (audio instanceof HTMLAudioElement) {
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }, []);

  // Boot sequence animation
  useEffect(() => {
    if (currentModule >= modules.length) {
      setProgress(100);
      setTimeout(() => {
        setCompleted(true);
        setTimeout(() => {
          onComplete();
        }, 500);
      }, 300);
      return;
    }

    const timer1 = setTimeout(() => {
      setModules((prev) => {
        const updated = [...prev];
        updated[currentModule].status = "success";
        return updated;
      });
      
      // Play click sound for each module
      const clickSound = new Audio("/sounds/click.mp3").catch(() => {});
      if (clickSound instanceof HTMLAudioElement) {
        clickSound.volume = 0.2;
        clickSound.play().catch(() => {});
      }
    }, 300 + currentModule * 200);

    const timer2 = setTimeout(() => {
      setCurrentModule((prev) => prev + 1);
      setProgress(((currentModule + 1) / modules.length) * 100);
    }, 500 + currentModule * 200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [currentModule, modules.length, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center"
      >
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Scanning lines effect */}
        <motion.div
          animate={{
            y: ["0%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 opacity-10"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.3), transparent)",
            height: "2px",
          }}
        />

        <div className="relative z-10 text-center space-y-8 px-8 max-w-md w-full">
          {/* Logo/Brand */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="space-y-4"
          >
            <div className="text-6xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              SKILY
            </div>
            <div className="text-sm text-cyan-400/80 font-mono tracking-wider">
              SYSTEM INITIALIZING...
            </div>
          </motion.div>

          {/* Boot modules */}
          <div className="space-y-3">
            {modules.map((module, idx) => (
              <motion.div
                key={module.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between font-mono text-sm"
              >
                <span className="text-gray-400">{module.name}...</span>
                <div className="flex items-center gap-2">
                  {module.status === "loading" && (
                    <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                  )}
                  {module.status === "success" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </motion.div>
                  )}
                  <span className="text-cyan-400">
                    {module.status === "success" ? "OK" : "..."}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
              />
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {Math.round(progress)}%
            </div>
          </div>

          {/* Ready message */}
          {completed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-bold text-green-400 font-mono tracking-wider"
            >
              READY TO DRIVE
            </motion.div>
          )}
        </div>

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cyan-500/30" />
        <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-cyan-500/30" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-cyan-500/30" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-cyan-500/30" />
      </motion.div>
    </AnimatePresence>
  );
}

