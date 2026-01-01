import { CarFront, Car } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LandingLogoProps {
  className?: string;
  showText?: boolean;
  theme?: "light" | "dark" | "auto";
  variant?: "default" | "minimal" | "bold" | "elegant";
}

export const LandingLogo: React.FC<LandingLogoProps> = ({
  className = "",
  showText = true,
  theme: themeProp = "auto",
  variant = "default",
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

  // Вариант 1: Минималистичный (простая иконка без фона)
  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
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

  // Вариант 2: Жирный (крупная иконка с контрастным фоном) - улучшенный дизайн
  if (variant === "bold") {
    return (
      <div className={`flex items-center gap-2.5 p-2 -m-2 ${className}`} style={{ overflow: 'visible', position: 'relative' }}>
        <div className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
          {/* Градиентный фон с анимацией - синий акцентный цвет */}
          <div className={`w-10 h-10 rounded-2xl ${isDark ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700" : "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800"} flex items-center justify-center shadow-xl ${isDark ? "shadow-blue-500/40" : "shadow-blue-600/50"} relative overflow-hidden`}>
            {/* Дополнительное свечение внутри */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
            {/* Иконка */}
            <CarFront className="w-5 h-5 text-white relative z-10" strokeWidth={2.5} />
          </div>
          {/* Внешнее свечение - расширяем за пределы контейнера, чтобы тень не обрезалась и накладывалась на следующий блок */}
          <div className={`absolute -inset-4 rounded-2xl ${isDark ? "bg-blue-400/30" : "bg-blue-500/30"} blur-xl -z-10 animate-pulse`} style={{ animationDuration: '3s', pointerEvents: 'none' }}></div>
        </div>
        {showText && (
          <span className={`text-xl font-black tracking-tight ${isDark
              ? "bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent"
              : "text-zinc-900"
            }`}>
            Skily
          </span>
        )}
      </div>
    );
  }

  // Вариант 3: Элегантный (тонкая рамка, градиентный текст)
  if (variant === "elegant") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
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
    <div className={`flex items-center gap-3 ${className}`}>
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



