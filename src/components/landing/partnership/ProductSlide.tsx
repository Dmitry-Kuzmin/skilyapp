/**
 * Product Slide
 * 
 * Слайд 1: Демонстрация продукта - самая современная EdTech платформа
 */

import React from 'react';
import { Swords, Trophy, Target, Zap } from 'lucide-react';

export const ProductSlide: React.FC = () => {
    return (
        <div className="p-8 min-h-[500px] flex flex-col">
            {/* Hero Visual */}
            <div className="relative mb-8">
                {/* Animated Phone Mockup */}
                <div className="relative mx-auto w-64 h-[520px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] shadow-2xl shadow-indigo-500/30 border-8 border-slate-700 overflow-hidden">
                    {/* Screen Content */}
                    <div className="absolute inset-0 bg-slate-950 m-2 rounded-[2.5rem] overflow-hidden">
                        {/* Duel Animation Mockup */}
                        <div className="relative h-full flex flex-col items-center justify-center gap-4 p-4">
                            {/* Player 1 */}
                            <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 border border-indigo-500/50 rounded-2xl px-4 py-3 w-full animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-sm font-black">
                                    😎
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-white">You</div>
                                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                                        <div className="h-full w-3/4 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <Zap className="w-5 h-5 text-yellow-400" />
                            </div>

                            {/* VS Icon */}
                            <div className="flex items-center justify-center">
                                <Swords className="w-8 h-8 text-red-500 animate-pulse" />
                            </div>

                            {/* Player 2 */}
                            <div className="flex items-center gap-3 bg-gradient-to-r from-red-600/30 to-red-600/10 border border-red-500/50 rounded-2xl px-4 py-3 w-full animate-pulse" style={{ animationDelay: '0.5s' }}>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-sm font-black">
                                    🤖
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-white">Opponent</div>
                                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                                        <div className="h-full w-1/2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <Trophy className="w-5 h-5 text-amber-400" />
                            </div>

                            {/* Question Preview */}
                            <div className="mt-4 w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                                <div className="text-[10px] text-slate-400 mb-2">Вопрос 5/10</div>
                                <div className="text-xs text-white leading-tight">
                                    Какая максимальная скорость на автомагистрали?
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phone Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-3xl z-10" />
                </div>

                {/* Floating Badges */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-lg shadow-green-500/50 animate-bounce">
                    98.4% Success
                </div>
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-br from-violet-500 to-purple-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-lg shadow-violet-500/50 animate-bounce" style={{ animationDelay: '0.5s' }}>
                    5x Retention
                </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
                <h3 className="text-3xl font-black text-white">
                    Самая современная EdTech платформа<br />
                    <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                        для водителей
                    </span>
                </h3>

                <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    Мы превращаем скучную зубрёжку ПДД в увлекательный киберспорт.
                    Геймификация, PvP-дуэли и AI-обучение — всё готово для масштабирования.
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/50 transition-all duration-300">
                        <Target className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                        <div className="text-xs font-bold text-white">PvP Дуэли</div>
                        <div className="text-[10px] text-slate-400 mt-1">Режим 1v1</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-violet-500/50 transition-all duration-300">
                        <Trophy className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                        <div className="text-xs font-bold text-white">Лиги</div>
                        <div className="text-[10px] text-slate-400 mt-1">Сезонная система</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/50 transition-all duration-300">
                        <Zap className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <div className="text-xs font-bold text-white">AI-объяснения</div>
                        <div className="text-[10px] text-slate-400 mt-1">Lumi AI</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
