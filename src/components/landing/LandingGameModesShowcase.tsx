import React, { useState, useEffect } from "react";
import { Swords, Target, Coins, Trophy } from "lucide-react";
import { Language } from "@/contexts/LanguageContext";

interface Props {
  language: Language;
}

export const LandingGameModesShowcase: React.FC<Props> = ({ language }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [activeGameMode, setActiveGameMode] = useState<'pvp' | 'race'>('pvp');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 15));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveGameMode((prev) => (prev === 'pvp' ? 'race' : 'pvp'));
    }, 4000); // Switch every 4 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 relative max-w-5xl mx-auto w-full z-10 perspective-1000">

      {/* LEFT CONTROLLER: PvP */}
      <div
        className={`flex-1 text-center lg:text-right cursor-pointer group transition-all duration-500 ${activeGameMode === 'pvp' ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100 blur-[2px] hover:blur-0'}`}
        onClick={() => setActiveGameMode('pvp')}
      >
        <div className="inline-flex items-center gap-2 mb-4 justify-center lg:justify-end">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${activeGameMode === 'pvp' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
            Global Arena
          </span>
        </div>
        <h3 className={`text-4xl lg:text-5xl font-black mb-6 leading-tight transition-colors duration-300 ${activeGameMode === 'pvp' ? 'text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
          PvP Duels
        </h3>
        <p className={`text-lg mb-8 max-w-sm ml-auto transition-colors duration-300 ${activeGameMode === 'pvp' ? 'text-orange-200' : 'text-slate-600'}`}>
          {language === 'ru' ? 'Бросай вызов реальным игрокам. Ставь монеты, побеждай, забирай банк и поднимайся в Мировом Рейтинге.' : 'Challenge real players. Bet coins, win, take the pot and rise in the Global Ranking.'}
        </p>

        {/* Active Indicator Line */}
        <div className="flex justify-center lg:justify-end">
          <div className={`h-1 rounded-full bg-gradient-to-l from-transparent via-orange-500 to-transparent transition-all duration-700 ${activeGameMode === 'pvp' ? 'w-full opacity-100 shadow-[0_0_10px_#f97316]' : 'w-0 opacity-0'}`}></div>
        </div>
      </div>

      {/* CENTER: DEVICE SHOWCASE */}
      <div className="relative z-10 shrink-0 transform transition-transform duration-700 hover:scale-[1.02]">

        {/* THE DEVICE */}
        <div className="w-[340px] h-[700px] bg-slate-950 rounded-[3.5rem] border-[14px] border-slate-900 shadow-[0_0_0_2px_rgba(255,255,255,0.1),0_20px_50px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden ring-1 ring-white/20">
          {/* Dynamic Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-3xl z-40 flex items-center justify-center">
            <div className="w-12 h-1 rounded-full bg-slate-800/50"></div>
          </div>

          {/* GAME SCREEN CONTAINER */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-black flex flex-col">

            {/* --- PVP MODE SCREEN --- */}
            <div className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col ${activeGameMode === 'pvp' ? 'opacity-100 translate-x-0 bg-slate-950' : 'opacity-0 -translate-x-full bg-slate-950'}`}>
              {/* Top Bar with Neon Glow */}
              <div className="h-24 bg-gradient-to-b from-slate-900 to-transparent flex items-end justify-between px-6 pb-6 border-b border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-transparent opacity-50"></div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map(i => <div key={i} className="w-8 h-1.5 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]"></div>)}
                </div>
                <div className="text-white font-black font-mono tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">VS POPAL</div>
              </div>

              {/* 3D Arena */}
              <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-950 to-slate-950 perspective-1000">
                {/* Grid Floor */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [transform:perspective(600px)_rotateX(70deg)_translateY(-100px)] origin-bottom opacity-40 animate-[gridMove_20s_linear_infinite]"></div>

                {/* Avatars */}
                <div className="absolute top-[20%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-10 w-full">
                  {/* Opponent (Floating) */}
                  <div className="relative animate-[bounce_2s_infinite]">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-600 border-4 border-slate-900 shadow-[0_0_50px_rgba(239,68,68,0.6)] flex items-center justify-center z-10 relative">
                      <Swords className="text-white w-10 h-10 drop-shadow-lg" />
                    </div>
                    <div className="absolute -inset-4 bg-red-500/30 blur-xl rounded-full -z-10 animate-pulse"></div>
                  </div>

                  {/* VS Lightning */}
                  <div className="relative">
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 italic skew-x-[-10deg] animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">VS</div>
                  </div>

                  {/* You (Card) */}
                  <div className="w-64 h-32 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-4 p-4 transform perspective-1000 rotate-x-10 hover:rotate-x-0 transition-transform cursor-pointer group">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Target className="text-white w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Player</div>
                      <div className="text-xl font-bold text-white">YOU</div>
                      <div className="text-xs text-slate-400">Lvl 12</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- RACE MODE SCREEN --- */}
            <div className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col ${activeGameMode === 'race' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
              {/* Top Bar - Neon Timer */}
              <div className="pt-14 pb-6 text-center bg-gradient-to-b from-slate-950 to-transparent">
                <div className="inline-block px-6 py-2 rounded-full border border-blue-500/20 bg-blue-500/5 backdrop-blur-md">
                  <div className="text-5xl font-black font-mono text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-pulse tabular-nums">
                    00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                  </div>
                </div>
              </div>

              {/* Track & Speedometer */}
              <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-end pb-12">
                {/* Road Effect (Perspective) */}
                <div className="absolute inset-x-0 top-0 bottom-0 bg-gradient-to-b from-indigo-950/50 via-slate-950 to-slate-950 flex justify-center perspective-1000">
                  <div className="w-[120%] h-full bg-slate-900/50 [transform:perspective(500px)_rotateX(60deg)_scaleY(2)] border-x-[40px] border-slate-950 origin-bottom flex justify-center">
                    {/* Lane Markers */}
                    <div className="w-2 h-full bg-dashed border-l-2 border-dashed border-white/20 animate-[roadMove_1s_linear_infinite]"></div>
                  </div>
                </div>

                {/* Speedometer Gauge (CSS Art) */}
                <div className="relative z-10 mb-8">
                  <div className="w-40 h-40 rounded-full border-[6px] border-slate-800 border-t-cyan-500 border-r-cyan-500 rotate-[135deg] flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)] bg-slate-950/80 backdrop-blur-sm">
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-black text-white drop-shadow-md">124</span>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">km/h</span>
                  </div>
                </div>

                {/* Answer Buttons (Glass) */}
                <div className="w-full px-6 space-y-3 z-10">
                  <div className="w-full py-4 rounded-xl bg-cyan-500/20 border border-cyan-400/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer hover:bg-cyan-500/30 transition-colors">
                    <span className="text-cyan-100 font-bold text-lg">STOP</span>
                  </div>
                  <div className="w-full py-4 rounded-xl bg-slate-800/40 border border-white/5 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                    <span className="text-slate-400 font-bold text-lg">YIELD</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT CONTROLLER: Race */}
      <div
        className={`flex-1 text-center lg:text-left cursor-pointer group transition-all duration-500 ${activeGameMode === 'race' ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100 blur-[2px] hover:blur-0'}`}
        onClick={() => setActiveGameMode('race')}
      >
        <div className="inline-flex items-center gap-2 mb-4 justify-center lg:justify-start">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${activeGameMode === 'race' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
            Speed Run
          </span>
        </div>
        <h3 className={`text-4xl lg:text-5xl font-black mb-6 leading-tight transition-colors duration-300 ${activeGameMode === 'race' ? 'text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
          Blitz Mode
        </h3>
        <p className={`text-lg mb-8 max-w-sm transition-colors duration-300 ${activeGameMode === 'race' ? 'text-cyan-200' : 'text-slate-600'}`}>
          {language === 'ru' ? '15 секунд на вопрос. Никаких прав на ошибку. Только хардкор.' : '15 seconds per question. No room for error. Pure hardcore.'}
        </p>

        {/* Active Indicator Line */}
        <div className="flex justify-center lg:justify-start">
          <div className={`h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent transition-all duration-700 ${activeGameMode === 'race' ? 'w-full opacity-100 shadow-[0_0_10px_#06b6d4]' : 'w-0 opacity-0'}`}></div>
        </div>
      </div>
    </div>
  );
};
