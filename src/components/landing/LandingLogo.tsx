import { Car } from "lucide-react";

interface LandingLogoProps {
  className?: string;
  showText?: boolean;
  theme?: "light" | "dark";
  variant?: "default" | "minimal" | "bold" | "elegant";
}

export const LandingLogo: React.FC<LandingLogoProps> = ({
  className = "",
  showText = true,
  theme = "dark",
  variant = "default",
}) => {
  const isDark = theme === "dark";
  const textColor = isDark ? "text-white" : "text-zinc-900";

  // Вариант 1: Минималистичный (простая иконка без фона)
  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <Car 
          className={`w-6 h-6 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} 
          strokeWidth={2}
        />
        {showText && (
          <span className={`text-xl font-semibold tracking-tight ${textColor}`}>
            Skily<span className="text-indigo-400">App</span>
          </span>
        )}
      </div>
    );
  }

  // Вариант 2: Жирный (крупная иконка с контрастным фоном)
  if (variant === "bold") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={`w-12 h-12 rounded-2xl ${isDark ? "bg-indigo-500" : "bg-indigo-600"} flex items-center justify-center shadow-xl ${isDark ? "shadow-indigo-500/30" : "shadow-indigo-600/40"}`}>
          <Car className="w-6 h-6 text-white" strokeWidth={2.5} fill="white" fillOpacity={0.2} />
        </div>
        {showText && (
          <span className={`text-2xl font-bold tracking-tight ${textColor}`}>
            Skily<span className={isDark ? "text-indigo-400" : "text-indigo-600"}>App</span>
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
          <Car className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} strokeWidth={2} />
        </div>
        {showText && (
          <span className={`text-xl font-bold tracking-tight bg-gradient-to-r ${isDark ? "from-white to-indigo-200" : "from-zinc-900 to-indigo-700"} bg-clip-text text-transparent`}>
            SkilyApp
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
          <Car className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        {/* Декоративное свечение */}
        <div className={`absolute inset-0 rounded-full ${isDark ? "bg-indigo-400/20" : "bg-indigo-500/20"} blur-xl -z-10`}></div>
      </div>

      {showText && (
        <div className="flex items-center">
          <span className={`text-2xl font-bold tracking-tight leading-none ${textColor}`}>
            Skily<span className={isDark ? "text-indigo-400" : "text-indigo-600"}>App</span>
          </span>
        </div>
      )}
    </div>
  );
};



