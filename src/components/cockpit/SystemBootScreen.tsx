import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Scan } from "lucide-react";
import { sounds } from "@/lib/sounds";

interface SystemBootScreenProps {
  onComplete: () => void;
}

const modules = [
  { name: "Engine", delay: 0.3 },
  { name: "Sensors", delay: 0.6 },
  { name: "Navigation", delay: 0.9 },
  { name: "Telemetry", delay: 1.2 },
  { name: "System", delay: 1.5 },
];

export function SystemBootScreen({ onComplete }: SystemBootScreenProps) {
  const [currentModule, setCurrentModule] = useState(0);
  const [loadedModules, setLoadedModules] = useState<Set<number>>(new Set());
  const [showScan, setShowScan] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    // Play startup sound
    sounds.click(800, 0.15);
    
    // Scan animation
    const scanInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(scanInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Load modules sequentially
    const moduleInterval = setInterval(() => {
      if (currentModule < modules.length) {
        setLoadedModules((prev) => new Set([...prev, currentModule]));
        sounds.click(1000 + currentModule * 100, 0.1);
        setCurrentModule((prev) => prev + 1);
      }
    }, 300);

    // Complete after all modules loaded
    const completeTimer = setTimeout(() => {
      clearInterval(moduleInterval);
      sounds.click(1200, 0.2);
      setTimeout(() => {
        setShowScan(false);
        setTimeout(onComplete, 500);
      }, 300);
    }, 1800);

    return () => {
      clearInterval(scanInterval);
      clearInterval(moduleInterval);
      clearTimeout(completeTimer);
    };
  }, [currentModule, onComplete]);

  return (
    <AnimatePresence>
      {showScan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-gradient-to-br from-black via-slate-950 to-black flex items-center justify-center"
        >
          {/* Grid pattern background */}
          <div className="absolute inset-0 opacity-20">
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

          <div className="relative z-10 max-w-md w-full px-8">
            {/* Biometric Scan Animation */}
            <div className="mb-12 relative">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-full shadow-[0_0_10px_rgba(0,212,255,0.5)]"
                />
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4 text-cyan-500 animate-pulse" />
                  <span>Scanning biometrics...</span>
                </div>
                <span className="font-mono">{scanProgress}%</span>
              </div>
            </div>

            {/* System Modules Loading */}
            <div className="space-y-3">
              <div className="text-sm font-mono text-slate-400 mb-6">
                Initializing system modules...
              </div>
              {modules.map((module, index) => {
                const isLoaded = loadedModules.has(index);
                const isLoading = currentModule === index && !isLoaded;
                
                return (
                  <motion.div
                    key={module.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: module.delay }}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      {isLoaded ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                        >
                          <Check className="w-5 h-5 text-green-500" />
                        </motion.div>
                      ) : isLoading ? (
                        <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-700" />
                      )}
                      <span className="font-mono text-slate-300">{module.name}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      {isLoaded ? "OK" : isLoading ? "..." : ""}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* System Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-8 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-green-500">System Ready</span>
              </div>
            </motion.div>
          </div>

          {/* Neon glow effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
