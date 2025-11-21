import { motion } from "framer-motion";
import { Gauge, Thermometer, Droplets, Battery } from "lucide-react";
import { cn } from "@/lib/utils";

interface TelemetryItem {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color: "blue" | "orange" | "green" | "yellow";
}

interface TelemetryPanelProps {
  items: TelemetryItem[];
  className?: string;
}

export function TelemetryPanel({ items, className }: TelemetryPanelProps) {
  const colorClasses = {
    blue: {
      bg: "from-blue-500/10 to-blue-600/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      glow: "drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]",
    },
    orange: {
      bg: "from-orange-500/10 to-orange-600/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
      glow: "drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]",
    },
    green: {
      bg: "from-green-500/10 to-green-600/10",
      border: "border-green-500/30",
      text: "text-green-400",
      glow: "drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]",
    },
    yellow: {
      bg: "from-yellow-500/10 to-yellow-600/10",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      glow: "drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]",
    },
  };

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {items.map((item, idx) => {
        const colors = colorClasses[item.color];
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className={cn(
              "relative p-4 rounded-lg border-2 bg-gradient-to-br backdrop-blur-sm",
              colors.bg,
              colors.border,
              "font-mono"
            )}
          >
            {/* Icon */}
            <div className={cn("mb-3", colors.text, colors.glow)}>
              {item.icon}
            </div>

            {/* Value */}
            <div className={cn("text-2xl font-bold mb-1", colors.text)}>
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              {item.unit && <span className="text-sm ml-1">{item.unit}</span>}
            </div>

            {/* Label */}
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              {item.label}
            </div>

            {/* Corner accent */}
            <div className={cn("absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2", colors.border)} />
          </motion.div>
        );
      })}
    </div>
  );
}

