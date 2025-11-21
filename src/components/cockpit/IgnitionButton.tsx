import { motion } from "framer-motion";
import { Play, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface IgnitionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isRunning?: boolean;
  className?: string;
}

export function IgnitionButton({
  onClick,
  disabled = false,
  isRunning = false,
  className,
}: IgnitionButtonProps) {
  const playClickSound = () => {
    try {
      const clickSound = new Audio("/sounds/click.mp3");
      clickSound.volume = 0.3;
      clickSound.play().catch(() => {
        // Audio autoplay blocked or file not found - ignore
      });
    } catch (error) {
      // Audio creation failed - ignore
    }
  };

  const handleClick = () => {
    playClickSound();
    onClick();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn("relative", className)}
    >
      {/* Outer glow ring */}
      <motion.div
        animate={{
          boxShadow: isRunning
            ? [
                "0 0 30px rgba(59, 130, 246, 0.6)",
                "0 0 50px rgba(59, 130, 246, 0.8)",
                "0 0 30px rgba(59, 130, 246, 0.6)",
              ]
            : "0 0 20px rgba(59, 130, 246, 0.3)",
        }}
        transition={{ duration: 2, repeat: isRunning ? Infinity : 0 }}
        className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl"
      />

      {/* Button */}
      <Button
        onClick={handleClick}
        disabled={disabled}
        size="lg"
        className={cn(
          "relative w-full h-24 md:h-28 rounded-full border-2",
          "bg-gradient-to-br from-gray-900 via-gray-800 to-black",
          "border-blue-500/50 hover:border-blue-400",
          "font-mono font-bold text-xl md:text-2xl",
          "shadow-2xl",
          isRunning
            ? "text-green-400 border-green-500/50 hover:border-green-400"
            : "text-blue-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Scan line effect */}
        <motion.div
          animate={{
            y: ["-100%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent rounded-full"
        />

        {/* Inner content */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
          {isRunning ? (
            <>
              <Power className="w-8 h-8 md:w-10 md:h-10 animate-pulse" />
              <span>ENGINE RUNNING</span>
            </>
          ) : (
            <>
              <Play className="w-8 h-8 md:w-10 md:h-10" />
              <span>START ENGINE</span>
              <span className="text-xs text-blue-400/70">PRESS TO BEGIN TEST</span>
            </>
          )}
        </div>

        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-blue-500/50" />
        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-blue-500/50" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-blue-500/50" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-blue-500/50" />
      </Button>
    </motion.div>
  );
}

