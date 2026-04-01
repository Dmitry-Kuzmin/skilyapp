"use client";

import React from "react";
import { Send } from "lucide-react";
import { PulseBeams } from "@/components/ui/pulse-beams";
import { cn } from "@/lib/utils";

const beams = [
  {
    path: "M129 220.5H16.5C10.9772 220.5 6.5 224.977 6.5 230.5V398.5",
    gradientConfig: {
      initial: { x1: "0%", x2: "0%", y1: "80%", y2: "100%" },
      animate: { x1: ["0%", "0%", "200%"], x2: ["0%", "0%", "180%"], y1: ["80%", "0%", "0%"], y2: ["100%", "20%", "20%"] },
      transition: { duration: 7, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 0.5 },
    },
    connectionPoints: [{ cx: 6.5, cy: 398.5, r: 6 }, { cx: 129, cy: 220.5, r: 6 }]
  },
  {
    path: "M708 200H841C846.523 200 851 195.523 851 190V40",
    gradientConfig: {
      initial: { x1: "0%", x2: "0%", y1: "80%", y2: "100%" },
      animate: { x1: ["20%", "100%", "100%"], x2: ["0%", "90%", "90%"], y1: ["80%", "80%", "-20%"], y2: ["100%", "100%", "0%"] },
      transition: { duration: 7, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 3, delay: 1.2 },
    },
    connectionPoints: [{ cx: 851, cy: 34, r: 6.5 }, { cx: 708, cy: 200, r: 6 }]
  },
  {
    path: "M285.5 274V333C285.5 338.523 281.023 343 275.5 343H152C146.477 343 142 347.477 142 353V426.5",
    gradientConfig: {
      initial: { x1: "0%", x2: "0%", y1: "80%", y2: "100%" },
      animate: { x1: ["20%", "100%", "100%"], x2: ["0%", "90%", "90%"], y1: ["80%", "80%", "-20%"], y2: ["100%", "100%", "0%"] },
      transition: { duration: 6, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 4, delay: 0.1 },
    },
    connectionPoints: [{ cx: 142, cy: 427, r: 6.5 }, { cx: 285.5, cy: 274, r: 6 }]
  },
  {
    path: "M633 274V333.226C633 338.749 637.477 343.226 643 343.226H760C765.523 343.226 770 347.703 770 353.226V427",
    gradientConfig: {
      initial: { x1: "40%", x2: "50%", y1: "160%", y2: "180%" },
      animate: { x1: "0%", x2: "10%", y1: "-40%", y2: "-20%" },
      transition: { duration: 6, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 3, delay: 0.8 },
    },
    connectionPoints: [{ cx: 770, cy: 427, r: 6.5 }, { cx: 633, cy: 274, r: 6 }]
  },
  {
    path: "M429 168V17C429 11.4772 433.477 7 439 7H414",
    gradientConfig: {
      initial: { x1: "-40%", x2: "-10%", y1: "0%", y2: "20%" },
      animate: { x1: ["40%", "0%", "0%"], x2: ["10%", "0%", "0%"], y1: ["0%", "0%", "180%"], y2: ["20%", "20%", "200%"] },
      transition: { duration: 8, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 2, delay: 1.5 },
    },
    connectionPoints: [{ cx: 420.5, cy: 6.5, r: 6 }, { cx: 429, cy: 168, r: 6 }]
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
      className={cn("relative w-screen min-h-[80vh] flex flex-col items-center justify-between bg-[#050B14] text-foreground font-sans antialiased overflow-hidden", className)}
      {...props}
    >
      {/* 1. TEXT SECTION (Above beams) */}
      <div className="flex flex-col items-center justify-center relative px-4 text-center z-20 w-full pt-24 sm:pt-32 pb-8">
        {/* Badge (Chip) */}
        <div className="inline-flex items-center text-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] sm:text-xs font-medium tracking-wide mb-8 max-w-lg shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          🌟 Присоединяйся к сотням студентов, сдавших с первой попытки
        </div>

        <h2 className="text-4xl md:text-5xl lg:text-7xl font-black mb-6 tracking-tight text-white drop-shadow-lg px-2">
          {ctaHeading}
        </h2>

        <p className="text-zinc-400 text-sm md:text-base max-w-md mx-auto font-light leading-relaxed">
          {ctaDescription}
        </p>
      </div>

      {/* 2. BUTTONS & BEAMS SECTION */}
      <div className="relative w-full flex-1 flex flex-col items-center justify-center min-h-[450px]">
        <PulseBeams
          beams={beams}
          gradientColors={gradientColors}
          className="bg-transparent !h-[450px]"
        >
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 w-full max-w-[650px] px-4 justify-center z-30">
            {/* Primary Shiny Button: Занять место */}
            <a
              href="https://t.me/skilyapp_bot?start=course"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).gtag) {
                  (window as any).gtag("event", "conversion", {
                    send_to: "AW-18034090184/LGu7CMTx0pMcEMjBqZdD",
                  });
                }
              }}
              className="bg-slate-800 w-full sm:w-[320px] max-w-[320px] h-[90px] no-underline group cursor-pointer relative shadow-[0_0_30px_rgba(99,68,245,0.2)] rounded-[45px] p-px text-xs font-semibold leading-6 text-white inline-block transition-transform hover:scale-105 active:scale-95"
            >
              <span className="absolute inset-0 overflow-hidden rounded-[45px]">
                <span className="absolute inset-0 rounded-[45px] bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </span>
              <div className="relative flex flex-col justify-center w-full text-center space-x-2 h-full items-center z-10 rounded-[45px] bg-zinc-950 py-0.5 px-4 ring-1 ring-white/10 ">
                <span className="text-[26px] sm:text-[30px] inline-block bg-clip-text text-transparent bg-gradient-to-r from-neutral-200 via-white to-neutral-200 font-black tracking-tight mb-1 leading-none pt-2">
                  Занять место
                </span>
                <span className="text-zinc-500 text-[10px] sm:text-[11px] tracking-widest uppercase font-semibold flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity pb-2">
                  <Send className="w-[11px] h-[11px] text-sky-400" /> Открыть в Telegram
                </span>
              </div>
            </a>

            {/* Secondary Stylish Button: Задать вопрос */}
            <a
              href="https://t.me/skilyapp_bot?start=support"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).gtag) {
                  (window as any).gtag("event", "conversion", {
                    send_to: "AW-18034090184/LGu7CMTx0pMcEMjBqZdD",
                  });
                }
              }}
              className="group flex flex-col justify-center w-full sm:w-[260px] max-w-[320px] h-[90px] items-center rounded-[45px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative z-40 backdrop-blur-sm"
            >
              <span className="text-xl sm:text-[22px] font-bold text-zinc-300 group-hover:text-white transition-colors leading-none mb-1">
                Задать вопрос
              </span>
              <span className="text-zinc-600 text-[10px] sm:text-[11px] tracking-widest uppercase font-medium mt-1 group-hover:text-zinc-400 transition-colors">
                Поддержка в чате
              </span>
            </a>
          </div>

          <div className="absolute -bottom-8 w-full flex justify-center z-30">
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
        </PulseBeams>
      </div>
      
      {/* 3. INTEGRATED FOOTER LINKS */}
      <div className="w-full px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 bg-[#050B14]/40 z-20 mt-auto backdrop-blur-sm">
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
    </div>
  );
}
