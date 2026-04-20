// Duel Pass Section - Интерактивная витрина режимов
// Lazy-loaded компонент для оптимизации Google Speed

import React, { useState } from 'react';
import { Coins, Trophy, Zap } from 'lucide-react';
import { LandingDuelDemo } from './LandingDuelDemo';
import { LandingBlitzDemo } from './LandingBlitzDemo';

interface LandingDuelPassSectionProps {
    language: 'ru' | 'en' | 'es' | string;
    copy: any;
}

export const LandingDuelPassSection: React.FC<LandingDuelPassSectionProps> = ({ language, copy }) => {
    const [activeMode, setActiveMode] = useState<'pvp' | 'blitz'>('pvp');
    const [winPot, setWinPot] = useState(200);
    const [showXpGain, setShowXpGain] = useState(false);
    const [xpProgress, setXpProgress] = useState(0);

    // Обработчики для интерактивных плашек
    const handleWinPotChange = (amount: number) => {
        setWinPot(amount);
    };

    const handleXpGain = (xp: number) => {
        setShowXpGain(true);
        setTimeout(() => setShowXpGain(false), 1000);
        setXpProgress(prev => Math.min(100, prev + 33.33));
    };

    // Переключение режимов
    const switchToPvP = () => {
        if (activeMode !== 'pvp') {
            setActiveMode('pvp');
        }
    };

    const switchToBlitz = () => {
        if (activeMode !== 'blitz') {
            setActiveMode('blitz');
        }
    };

    return (
        <section className="relative z-10 px-6 py-16 md:py-20 max-w-[1400px] mx-auto">
            <div className="mb-12 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-bold uppercase tracking-wider mb-6">
                    <Trophy className="w-3 h-3" />
                    {copy.arena.bannerLabel}
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                    {copy.arena.bannerTitle}
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    {copy.arena.bannerDescription}
                </p>
            </div>

            {/* Interactive Gameplay Showcase */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24 mb-24 relative mt-16 px-4">

                {/* LEFT CONTROLLER: PvP */}
                <div
                    className={`flex-1 text-center lg:text-right cursor-pointer group transition-all duration-500 relative ${activeMode === 'pvp' ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100 blur-[2px] hover:blur-0'
                        }`}
                    onMouseEnter={switchToPvP}
                >
                    {/* Guiding Line PvP */}
                    <div className={`hidden lg:block absolute top-1/2 -right-12 w-24 h-[2px] bg-gradient-to-r from-orange-500 to-transparent transition-all duration-700 origin-right ${activeMode === 'pvp' ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_10px_#f97316]"></div>
                    </div>

                    <div className="inline-flex items-center gap-2 mb-4 justify-center lg:justify-end">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${activeMode === 'pvp' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                            {language === 'ru' ? 'Мультиплеер' : language === 'es' ? 'Multijugador' : 'Multiplayer'}
                        </span>
                    </div>
                    <h3 className={`text-4xl lg:text-5xl font-black mb-6 leading-tight transition-colors duration-300 ${activeMode === 'pvp' ? 'text-orange-400 drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
                        PvP Arena
                    </h3>
                    <p className={`text-lg mb-8 lg:ml-auto max-w-sm transition-colors duration-300 ${activeMode === 'pvp' ? 'text-orange-100/80 font-medium' : 'text-slate-600'}`}>
                        {language === 'ru' ? 'Вызови соперника на дуэль. Кто быстрее и точнее — забирает банк.' : language === 'es' ? 'Reta a un rival. El más rápido y preciso se lleva el bote.' : 'Challenge an opponent. Fastest and most accurate takes the pot.'}
                    </p>

                    {/* Active Indicator Line */}
                    <div className="flex justify-center lg:justify-end">
                        <div className={`h-1 rounded-full bg-gradient-to-r from-transparent via-orange-500 to-transparent transition-all duration-700 ${activeMode === 'pvp' ? 'w-full opacity-100 shadow-[0_0_10px_#f97316]' : 'w-0 opacity-0'}`}></div>
                    </div>
                </div>

                {/* CENTER: PHONE MOCKUP */}
                <div className="relative z-10 shrink-0 transform transition-transform duration-700 hover:scale-[1.02]">

                    {/* Floating Badge 1 (Win Pot / Time Bonus) - DYNAMIC */}
                    <div className={`absolute top-16 -left-6 lg:-left-28 animate-[float_6s_ease-in-out_infinite] z-30 transition-all duration-300 ${winPot > 200 ? 'scale-110' : 'scale-100'}`}>
                        <div className="hidden lg:block absolute right-0 top-1/2 w-16 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/30 to-yellow-500/50 translate-x-full"></div>
                        <div className={`bg-slate-900/60 backdrop-blur-xl p-4 pr-6 rounded-2xl border shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 transition-all duration-500 ${activeMode === 'blitz'
                                ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                                : winPot > 200
                                    ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                                    : 'border-white/10 hover:border-yellow-500/30'
                            }`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-[inset_0_0_15px] relative overflow-hidden transition-all duration-500 ${activeMode === 'blitz'
                                    ? 'bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border-cyan-500/30 shadow-cyan-500/20'
                                    : 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-yellow-500/30 shadow-yellow-500/20'
                                }`}>
                                {activeMode === 'blitz' ? (
                                    <Zap className="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] animate-pulse" size={24} />
                                ) : (
                                    <Coins className={`text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)] transition-transform duration-500 ${winPot > 200 ? 'rotate-180' : 'rotate-0'
                                        }`} size={24} />
                                )}
                            </div>
                            <div>
                                <div className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 transition-colors duration-500 ${activeMode === 'blitz' ? 'text-cyan-400' : 'text-slate-400'
                                    }`}>
                                    {activeMode === 'blitz' ? 'Time Bonus' : 'Win Pot'}
                                </div>
                                <div className={`text-xl font-black px-0.5 drop-shadow-lg transition-all duration-500 ${activeMode === 'blitz'
                                        ? 'text-cyan-400 animate-pulse'
                                        : winPot > 200
                                            ? 'text-yellow-400 animate-pulse'
                                            : 'text-white'
                                    }`}>
                                    {activeMode === 'blitz' ? 'x2.5' : `+${winPot}`}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Badge 2 (Rank) + Connector - DYNAMIC */}
                    <div className={`absolute bottom-24 -right-6 lg:-right-28 animate-[float_5s_ease-in-out_infinite_1s] z-30 transition-all duration-300 ${showXpGain ? 'scale-110' : 'scale-100'
                        }`}>
                        <div className="hidden lg:block absolute left-0 top-1/2 w-16 h-[1px] bg-gradient-to-l from-transparent via-purple-500/30 to-purple-500/50 -translate-x-full"></div>
                        <div className={`bg-slate-900/60 backdrop-blur-xl p-4 pr-6 rounded-2xl border shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 transition-all duration-300 ${showXpGain
                                ? 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                                : 'border-white/10 hover:border-purple-500/30'
                            }`}>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/30 shadow-[inset_0_0_15px_rgba(168,85,247,0.2)]">
                                <Trophy className="text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                    {showXpGain ? 'Progress' : 'Season Rank'}
                                </div>
                                <div className={`text-xl font-black px-0.5 drop-shadow-lg transition-all duration-300 ${showXpGain ? 'text-purple-400 animate-pulse' : 'text-white'
                                    }`}>
                                    {showXpGain ? '+25 XP' : '#1 Champion'}
                                </div>
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-500"
                                        style={{ width: `${xpProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* THE DEVICE */}
                    <div className="w-[340px] h-[700px] bg-slate-950 rounded-[3.5rem] border-[14px] border-slate-900 shadow-[0_0_0_2px_rgba(255,255,255,0.1),0_20px_50px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden ring-1 ring-white/20">
                        {/* Dynamic Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-3xl z-40 flex items-center justify-center">
                            <div className="w-12 h-1 rounded-full bg-slate-800/50"></div>
                        </div>

                        {/* INTERACTIVE DEMO - Switches between PvP and Blitz */}
                        <React.Suspense fallback={
                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-black flex items-center justify-center">
                                <div className="text-white text-sm font-bold animate-pulse">Загрузка...</div>
                            </div>
                        }>
                            {activeMode === 'pvp' ? (
                                <LandingDuelDemo
                                    language={language}
                                    onDemoInteraction={(action) => {
                                        console.log('[Landing Demo]', action);
                                        if (typeof window !== 'undefined' && (window as any).gtag) {
                                            (window as any).gtag('event', 'demo_interaction', {
                                                event_category: 'landing',
                                                event_label: action,
                                            });
                                        }
                                    }}
                                    onWinPotChange={handleWinPotChange}
                                    onXpGain={handleXpGain}
                                />
                            ) : (
                                <LandingBlitzDemo language={language} />
                            )}
                        </React.Suspense>
                    </div>
                </div>

                {/* RIGHT CONTROLLER: Blitz */}
                <div
                    className={`flex-1 text-center lg:text-left cursor-pointer group transition-all duration-500 relative ${activeMode === 'blitz' ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100 blur-[2px] hover:blur-0'
                        }`}
                    onMouseEnter={switchToBlitz}
                >
                    {/* Guiding Line Blitz */}
                    <div className={`hidden lg:block absolute top-1/2 -left-12 w-24 h-[2px] bg-gradient-to-l from-cyan-500 to-transparent transition-all duration-700 origin-left ${activeMode === 'blitz' ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]"></div>
                    </div>

                    <div className="inline-flex items-center gap-2 mb-4 justify-center lg:justify-start">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${activeMode === 'blitz' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                            {language === 'ru' ? 'Блиц' : language === 'es' ? 'Velocidad' : 'Speed Run'}
                        </span>
                    </div>
                    <h3 className={`text-4xl lg:text-5xl font-black mb-6 leading-tight transition-colors duration-300 ${activeMode === 'blitz' ? 'text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]' : 'text-slate-700 group-hover:text-slate-500'}`}>
                        Blitz Mode
                    </h3>
                    <p className={`text-lg mb-8 max-w-sm transition-colors duration-300 ${activeMode === 'blitz' ? 'text-cyan-100/80 font-medium' : 'text-slate-600'}`}>
                        {language === 'ru' ? '5 секунд на вопрос. Никаких прав на ошибку. Только хардкор.' : '5 seconds per question. No room for error. Pure hardcore.'}
                    </p>

                    {/* Active Indicator Line - Pulsing for urgency */}
                    <div className="flex justify-center lg:justify-start">
                        <div className={`h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent transition-all duration-700 relative overflow-hidden ${activeMode === 'blitz' ? 'w-full opacity-100 shadow-[0_0_10px_#06b6d4]' : 'w-0 opacity-0'}`}>
                            {/* Animated shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite] -translate-x-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
