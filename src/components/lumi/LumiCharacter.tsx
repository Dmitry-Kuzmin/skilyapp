import React from "react";
import { cn } from "@/lib/utils";
import { AISphere } from "@/components/ai/AISphere";

export type LumiMood = "idle" | "happy" | "thinking" | "encouraging" | "celebrating";

interface LumiCharacterProps {
  size?: "sm" | "md" | "lg" | "xl";
  mood?: LumiMood; // Остается для обратной совместимости, но не используется
  className?: string;
  animate?: boolean;
}

/**
 * LumiCharacter - теперь это современная AI сфера вместо старого Skily.
 * Старые состояния (mood) удалены как устаревшие.
 */
export const LumiCharacter = ({
  size = "md",
  className,
}: LumiCharacterProps) => {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <AISphere size={size} />
    </div>
  );
};


