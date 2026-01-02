import { CarFront, Car } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LandingLogoProps {
  className?: string;
  showText?: boolean;
  theme?: "light" | "dark" | "auto";
  variant?: "default" | "minimal" | "bold" | "elegant" | "header" | "footer";
  onInteraction?: () => void;
}

export const LandingLogo: React.FC<LandingLogoProps> = ({
  className = "",
  showText = true,
  theme: themeProp = "auto",
  variant = "default",
  onInteraction,
}) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Определяем актуальную тему
  useEffect(() => {
    setMounted(true);
  }, []);

  let actualTheme: "light" | "dark" = "dark";
  if (themeProp === "auto") {
    // Автоматически определяем тему из системы
    actualTheme = resolvedTheme === "light" ? "light" : "dark";
  } else {
    actualTheme = themeProp;
  }

  // Если еще не загрузилось, проверяем системную тему
  const isDark = mounted
    ? actualTheme === "dark"
    : (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const textColor = isDark ? "text-white" : "text-zinc-900";

  // Определяем, является ли логотип интерактивным
  const isInteractive = variant !== "footer" || !!onInteraction;
  const cursorClass = isInteractive ? "cursor-pointer" : "cursor-default";

  // Вариант 1: Минималистичный (простая иконка без фона)
  if (variant === "minimal") {
    return (
      <div
        className={cn("flex items-center gap-2.5", cursorClass, className)}
        onClick={() => isInteractive && onInteraction?.()}
      >
        <CarFront
          className={`w-6 h-6 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
          strokeWidth={2}
        />
        {showText && (
          <span className={`text-xl font-semibold tracking-tight ${textColor}`}>
            Skily
          </span>
        )}
      </div>
    );
  }

  // Вариант 2, Header, Footer: Жирный премиум стиль (универсальный)
  if (variant === "bold" || variant === "header" || variant === "footer") {
    return (
      <div
        className={cn("flex items-center gap-2 p-2 -m-2", cursorClass, isInteractive ? "group" : "", className)}
        style={{ overflow: 'visible', position: 'relative' }}
        onClick={() => isInteractive && onInteraction?.()}
        onMouseEnter={() => isInteractive && onInteraction?.()}
      >
        <div className={`relative flex-shrink-0 transition-transform duration-500 ease-out transform-gpu will-change-transform ${isInteractive ? "group-hover:scale-105" : ""}`} style={{ overflow: 'visible' }}>
          {/* Градиентный фон с анимацией - синий акцентный цвет */}
          <div className={`w-10 h-10 rounded-2xl ${isDark ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700" : "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800"} flex items-center justify-center shadow-xl ${isDark ? "shadow-blue-500/40" : "shadow-blue-600/50"} relative overflow-hidden transform-gpu`}>
            {/* Дополнительное свечение внутри */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
            {/* Иконка */}
            <CarFront className="w-5 h-5 text-white relative z-10" strokeWidth={2.5} />

            {/* Headlight Flares (Beep-Beep Interaction - Only if Interactive) */}
            {isInteractive && (
              <>
                <div className="absolute top-[48%] left-[26%] w-1.5 h-1.5 bg-[#bae6fd] rounded-full blur-[1px] opacity-0 group-hover:animate-[beep-beep_0.6s_ease-out_forwards] z-30"></div>
                <div className="absolute top-[48%] right-[26%] w-1.5 h-1.5 bg-[#bae6fd] rounded-full blur-[1px] opacity-0 group-hover:animate-[beep-beep_0.6s_ease-out_forwards] z-30"></div>
              </>
            )}
          </div>
          {/* Внешнее свечение - Aurora Glow (Sync with Beep if Interactive, otherwise Steady) */}
          <div className={`absolute -inset-8 -z-10 opacity-80 pointer-events-none scale-125 blur-3xl ${isInteractive ? "group-hover:animate-[glow-jump_0.6s_ease-out_forwards]" : ""} ${isDark ? "bg-[radial-gradient(closest-side,rgba(59,130,246,0.6)_0%,transparent_100%)]" : "bg-[radial-gradient(closest-side,rgba(37,99,235,0.5)_0%,transparent_100%)]"}`}></div>
        </div>
        {showText && (
          <span className="relative inline-block" aria-label="Skily">
            {/* Base Layer (Standard) */}
            <span className={`text-xl font-black tracking-tight inline-block relative z-10 ${isDark
              ? "bg-[linear-gradient(110deg,rgba(255,255,255,0.7)_45%,#ffffff_50%,rgba(255,255,255,0.7)_55%)] bg-clip-text text-transparent animate-text-shimmer bg-[length:250%_100%]"
              : "text-zinc-900"
              }`}>
              Skily
            </span>

            {/* Hover Layer (Masked Wipe Effect - Only if Interactive) */}
            {isInteractive && (
              <span className="absolute inset-0 z-20 overflow-hidden w-0 group-hover:w-full transition-[width] duration-300 ease-out" aria-hidden="true">
                {/* Inner Text (Maintains gradient stability) */}
                <span className={`text-xl font-black tracking-tight inline-block whitespace-nowrap ${isDark
                  ? "bg-[linear-gradient(110deg,#60a5fa_45%,#ffffff_50%,#60a5fa_55%)] bg-clip-text text-transparent group-hover:animate-[shimmer-once_1.2s_ease-out_forwards] bg-[length:250%_100%]"
                  : "text-blue-600"
                  }`}>
                  Skily
                </span>
              </span>
            )}
          </span>
        )}
      </div>
    );
  }

  // Вариант 3: Элегантный (тонкая рамка, градиентный текст)
  if (variant === "elegant") {
    return (
      <div
        className={cn("flex items-center gap-3", cursorClass, className)}
        onClick={() => isInteractive && onInteraction?.()}
      >
        <div className={`w-11 h-11 rounded-xl border-2 ${isDark ? "border-indigo-400/40 bg-indigo-500/10" : "border-indigo-500/50 bg-indigo-50"} flex items-center justify-center backdrop-blur-sm`}>
          <CarFront className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} strokeWidth={2} />
        </div>
        {showText && (
          <span className={`text-xl font-bold tracking-tight bg-gradient-to-r ${isDark ? "from-white to-indigo-200" : "from-zinc-900 to-indigo-700"} bg-clip-text text-transparent`}>
            Skily
          </span>
        )}
      </div>
    );
  }

  // Вариант по умолчанию: Современный (иконка в круге с градиентом)
  return (
    <div
      className={cn("flex items-center gap-3", cursorClass, className)}
      onClick={() => isInteractive && onInteraction?.()}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-11 h-11 rounded-full ${isDark ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600" : "bg-gradient-to-br from-indigo-600 to-violet-700"} flex items-center justify-center shadow-lg ${isDark ? "shadow-indigo-500/25" : "shadow-indigo-600/30"}`}>
          <CarFront className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        {/* Декоративное свечение */}
        <div className={`absolute inset-0 rounded-full ${isDark ? "bg-indigo-400/20" : "bg-indigo-500/20"} blur-xl -z-10`}></div>
      </div>

      {showText && (
        <div className="flex items-center">
          <span className={`text-2xl font-bold tracking-tight leading-none ${textColor}`}>
            Skily
          </span>
        </div>
      )}
    </div>
  );
};



