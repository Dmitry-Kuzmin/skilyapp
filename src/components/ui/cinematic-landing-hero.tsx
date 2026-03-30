"use client";

import React from "react";
import { Send } from "lucide-react";
import { PulseBeams } from "@/components/ui/pulse-beams";
import { cn } from "@/lib/utils";

const beams = [
  {
    path: "M269 220.5H16.5C10.9772 220.5 6.5 224.977 6.5 230.5V398.5",
    gradientConfig: {
      initial: { x1: "0%", x2: "0%", y1: "80%", y2: "100%" },
      animate: { x1: ["0%", "0%", "200%"], x2: ["0%", "0%", "180%"], y1: ["80%", "0%", "0%"], y2: ["100%", "20%", "20%"] },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 0.5 },
    },
    connectionPoints: [{ cx: 6.5, cy: 398.5, r: 6 }, { cx: 269, cy: 220.5, r: 6 }]
  },
  {
    path: "M568 200H841C846.523 200 851 195.523 851 190V40",
    gradientConfig: {
      initial: { x1: "0%", x2: "0%", y1: "80%", y2: "100%" },
      animate: { x1: ["20%", "100%", "100%"], x2: ["0%", "90%", "90%"], y1: ["80%", "80%", "-20%"], y2: ["100%", "100%", "0%"] },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 1.2 },
    },
    connectionPoints: [{ cx: 851, cy: 34, r: 6.5 }, { cx: 568, cy: 200, r: 6 }]
  },
  {
    path: "M425.5 274V333C425.5 338.523 421.023 343 415.5 343H152C146.477 343 142 347.477 142 353V426.5",
    gradientConfig: {
      initial: { x1: "0%", x2: "0%", y1: "80%", y2: "100%" },
      animate: { x1: ["20%", "100%", "100%"], x2: ["0%", "90%", "90%"], y1: ["80%", "80%", "-20%"], y2: ["100%", "100%", "0%"] },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 0.1 },
    },
    connectionPoints: [{ cx: 142, cy: 427, r: 6.5 }, { cx: 425.5, cy: 274, r: 6 }]
  },
  {
    path: "M493 274V333.226C493 338.749 497.477 343.226 503 343.226H760C765.523 343.226 770 347.703 770 353.226V427",
    gradientConfig: {
      initial: { x1: "40%", x2: "50%", y1: "160%", y2: "180%" },
      animate: { x1: "0%", x2: "10%", y1: "-40%", y2: "-20%" },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 0.8 },
    },
    connectionPoints: [{ cx: 770, cy: 427, r: 6.5 }, { cx: 493, cy: 274, r: 6 }]
  },
  {
    path: "M380 168V17C380 11.4772 384.477 7 390 7H414",
    gradientConfig: {
      initial: { x1: "-40%", x2: "-10%", y1: "0%", y2: "20%" },
      animate: { x1: ["40%", "0%", "0%"], x2: ["10%", "0%", "0%"], y1: ["0%", "0%", "180%"], y2: ["20%", "20%", "200%"] },
      transition: { duration: 2, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 1.5 },
    },
    connectionPoints: [{ cx: 420.5, cy: 6.5, r: 6 }, { cx: 380, cy: 168, r: 6 }]
  }
];

const gradientColors = { start: "#18CCFC", middle: "#6344F5", end: "#AE48FF" };

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  ctaHeading?: string;
  ctaDescription?: string;
  onOpenForm?: () => void;
}

export function CinematicHero({ 
  ctaHeading = "Занять место в потоке",
  ctaDescription = "Запись через бот — займёт 30 секунд. Расскажем о курсе, ответим на вопросы и закрепим место.",
  onOpenForm,
  className, 
  ...props 
}: CinematicHeroProps) {
  
  return (
    <div
      className={cn("relative w-screen min-h-[80vh] flex items-center justify-center bg-[#09090b] text-foreground font-sans antialiased", className)}
      {...props}
    >
      <PulseBeams
        beams={beams}
        gradientColors={gradientColors}
        className="bg-[#050B14] min-h-[80vh]"
      >
        <div className="flex flex-col items-center justify-center h-full relative px-4 text-center z-10 w-full py-32">
          {/* Badge (Chip) */}
          <div className="inline-flex items-center text-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] sm:text-xs font-medium tracking-wide mb-8 max-w-lg shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            🌟 Присоединяйся к сотням студентов, сдавших с первой попытки
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-7xl font-black mb-6 tracking-tight text-white drop-shadow-lg px-2">
            {ctaHeading}
          </h2>

          <p className="text-zinc-400 text-sm md:text-base mb-12 max-w-md mx-auto font-light leading-relaxed">
            {ctaDescription}
          </p>

          {/* Glowing Telegram Button */}
          <a href="https://t.me/skilyapp_bot" target="_blank" rel="noopener noreferrer" className="bg-slate-800 w-[300px] sm:w-[320px] h-[80px] no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-[40px] p-px text-xs font-semibold leading-6 text-white inline-block mb-6">
            <span className="absolute inset-0 overflow-hidden rounded-[40px]">
              <span className="absolute inset-0 rounded-[40px] bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </span>
            <div className="relative flex justify-center w-full h-full text-center space-x-4 items-center z-10 rounded-[40px] bg-zinc-950 py-0.5 px-6 ring-1 ring-white/10">
              <div className="w-[42px] h-[42px] rounded-full bg-[#2EA5E0] flex items-center justify-center shadow-md">
                <Send className="w-5 h-5 text-white ml-[-2px] mt-[1px]" />
              </div>
              <div className="text-left flex flex-col justify-center">
                <div className="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase mb-[-1px]">Открыть в</div>
                <div className="text-[24px] font-black leading-none tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white">Telegram</div>
              </div>
            </div>
            <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-cyan-400/0 via-cyan-400/90 to-cyan-400/0 transition-opacity duration-500 group-hover:opacity-40" />
          </a>

          {/* Subtle fallback */}
          {onOpenForm && (
            <button
              onClick={onOpenForm}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-4"
            >
              Нет Telegram? Оставить заявку
            </button>
          )}
        </div>
        
        {/* Integrated Footer Links */}
        <div className="absolute bottom-0 left-0 w-full px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 bg-[#050B14]/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-400">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-black text-white">S</div>
            Skilyapp
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-zinc-500">
            <a href="/legal/terms" className="hover:text-white transition-colors">Оферта</a>
            <a href="/legal/privacy" className="hover:text-white transition-colors">Конфиденциальность</a>
          </div>
          <div className="text-[10px] sm:text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Skilyapp. Все права защищены.
          </div>
        </div>
      </PulseBeams>
    </div>
  );
}
