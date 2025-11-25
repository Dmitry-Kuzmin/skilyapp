import React from "react";
import { Power } from "lucide-react";

interface StartEngineButtonProps {
  onClick: () => void;
  isIgniting: boolean;
  className?: string;
}

export const StartEngineButton: React.FC<StartEngineButtonProps> = ({
  onClick,
  isIgniting,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`group relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 transform-gpu ${
        isIgniting ? "animate-shake" : "hover:scale-105"
      } ${className}`}
    >
      <div
        className={`absolute inset-[-50%] rounded-full transition-all duration-500 pointer-events-none ${
          isIgniting ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-60"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0) 70%)",
        }}
      ></div>

      <div className="absolute inset-0 rounded-full metal-ring shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_5px_rgba(255,255,255,0.5)] p-3 z-10">
        <div className="w-full h-full rounded-full bg-[#111] shadow-[inset_0_5px_15px_rgba(0,0,0,0.9)] p-1.5">
          <div
            className={`w-full h-full rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#050505] border-t border-white/10 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 ${
              isIgniting ? "border-indigo-500/50" : ""
            }`}
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>

            <div className="w-16 h-2 rounded-full bg-black/80 mb-4 overflow-hidden border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,1)]">
              <div
                className={`h-full bg-gradient-to-r from-indigo-600 to-purple-400 shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-[1500ms] ease-out ${
                  isIgniting ? "w-full" : "w-0"
                }`}
              ></div>
            </div>

            <div className="flex flex-col items-center relative z-10">
              <Power
                size={32}
                className={`mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] transition-colors duration-300 ${
                  isIgniting ? "text-white" : "text-slate-400 group-hover:text-white"
                }`}
              />
              <span
                className={`text-xs font-bold tracking-[0.25em] uppercase transition-colors duration-300 ${
                  isIgniting
                    ? "text-indigo-400"
                    : "text-slate-500 group-hover:text-indigo-400"
                }`}
              >
                Engine
              </span>
              <span className="text-[10px] text-slate-700 font-bold tracking-widest uppercase mt-1">
                Start/Stop
              </span>
            </div>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-8 bg-white/5 blur-md rounded-t-full opacity-50"></div>
          </div>
        </div>
      </div>
    </button>
  );
};




