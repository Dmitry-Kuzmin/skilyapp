import { motion } from "framer-motion";
import { Play, Power } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { useState } from "react";

interface IgnitionKeyProps {
  onStart: () => void;
  isReady?: boolean;
}

export function IgnitionKey({ onStart, isReady = true }: IgnitionKeyProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if (!isReady) return;
    
    setIsPressed(true);
    sounds.click(1000, 0.2);
    
    setTimeout(() => {
      setIsPressed(false);
      onStart();
    }, 200);
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={!isReady}
      className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 transition-all duration-300 ${
        isReady
          ? "bg-white border-white/50 shadow-2xl cursor-pointer hover:scale-110 active:scale-95"
          : "bg-slate-700 border-slate-600 cursor-not-allowed opacity-50"
      }`}
      whileHover={isReady ? { scale: 1.1 } : {}}
      whileTap={isReady ? { scale: 0.95 } : {}}
      animate={
        isReady && !isPressed
          ? {
              boxShadow: [
                "0 0 20px rgba(255, 255, 255, 0.3)",
                "0 0 40px rgba(0, 212, 255, 0.5)",
                "0 0 20px rgba(255, 255, 255, 0.3)",
              ],
            }
          : {}
      }
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
    >
      {/* Inner glow */}
      <div
        className={`absolute inset-4 rounded-full ${
          isReady
            ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
            : "bg-slate-800"
        }`}
      />

      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center h-full">
        {isReady ? (
          <motion.div
            animate={isPressed ? { scale: 0.9 } : { scale: 1 }}
            transition={{ duration: 0.1 }}
          >
            <Power className="w-12 h-12 md:w-16 md:h-16 text-slate-900" strokeWidth={2.5} />
          </motion.div>
        ) : (
          <Power className="w-12 h-12 md:w-16 md:h-16 text-slate-500" strokeWidth={2.5} />
        )}
      </div>

      {/* Label */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
        <div
          className={`text-xs md:text-sm font-mono font-bold ${
            isReady ? "text-white" : "text-slate-500"
          }`}
        >
          {isReady ? "START" : "STOP"}
        </div>
      </div>

      {/* Pulsing ring effect */}
      {isReady && (
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-cyan-500/50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.button>
  );
}
