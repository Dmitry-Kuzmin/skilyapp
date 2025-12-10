import { Car } from "lucide-react";

interface LandingLogoProps {
  className?: string;
  showText?: boolean;
  theme?: "light" | "dark";
}

export const LandingLogo: React.FC<LandingLogoProps> = ({
  className = "",
  showText = true,
  theme = "dark",
}) => {
  const iconColor = theme === "light" ? "text-white" : "text-indigo-500";
  const textColor = theme === "light" ? "text-white" : "text-white";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
          <Car className={`w-5 h-5 ${iconColor} drop-shadow-sm`} strokeWidth={2.5} />
        </div>
      </div>

      {showText && (
        <div className="flex items-center">
          <span
            className={`text-2xl font-bold tracking-tight leading-none ${textColor} font-sans`}
          >
            Skily
            <span className="font-semibold text-indigo-400">App</span>
          </span>
        </div>
      )}
    </div>
  );
};



