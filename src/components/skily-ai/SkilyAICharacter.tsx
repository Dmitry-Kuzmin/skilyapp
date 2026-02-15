import React from "react";
import { cn } from "@/lib/utils";
import { AISphere } from "@/components/ai/AISphere";

export type SkilyAIMood = "idle" | "happy" | "thinking" | "encouraging" | "celebrating";

interface SkilyAICharacterProps {
  size?: "sm" | "md" | "lg" | "xl";
  mood?: SkilyAIMood; // Остается для обратной совместимости, но не используется
  className?: string;
  animate?: boolean;
}

/**
 * SkilyAICharacter - теперь это современная AI сфера.
 * Старые состояния (mood) удалены как устаревшие.
 */
export const SkilyAICharacter = ({
  size = "md",
  className,
}: SkilyAICharacterProps) => {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <AISphere size={size} />
    </div>
  );
};


