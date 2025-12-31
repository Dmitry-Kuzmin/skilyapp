/**
 * Technology Slide
 * 
 * Слайд 2: Lumi AI Engine - автоматическая локализация за 72 часа
 */

import React from 'react';
import { Brain, Globe, Languages, Sparkles, Zap, ArrowRight } from 'lucide-react';

export const TechnologySlide: React.FC = () => {
    return (
        <div className="p-8 min-h-[500px] flex flex-col">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/50 mb-4">
                    <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-black text-white mb-2">
                    Lumi AI Engine
                </h3>
                <p className="text-lg text-slate-300">
                    Ваша локальная база ПДД + Наш интеллект = <span className="text-violet-400 font-bold">Безупречный продукт</span> за 72 часа
                </p>
            </div>

            {/* AI Process Visualization */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="relative">
                    {/* Process Flow */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Step 1: Input */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-indigo-600/0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                            <div className="relative bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-300">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-500/30 mb-4">
                                    <span className="text-xl font-black text-white">1</span>
                                </div>
                                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-indigo-400" />
                                    Ваша база ПДД
                                </h4>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Вы предоставляете официальные вопросы экзамена вашей страны
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] text-slate-400">DGT</span>
                                    <span className="px-2 py-1 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] text-slate-400">DVLA</span>
                                    <span className="px-2 py-1 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] text-slate-400">TÜV</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="hidden md:flex items-center justify-center -mx-3">
                            <ArrowRight className="w-8 h-8 text-violet-400 animate-pulse" />
                        </div>

                        {/* Step 2: Processing */}
                        <div className="group relative md:col-start-2">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-violet-600/0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                            <div className="relative bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/50 transition-all duration-300">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/30 mb-4 animate-pulse">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-violet-400" />
                                    AI-обработка
                                </h4>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Нейросеть анализирует, переводит и создаёт умные объяснения
                                </p>
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Перевод на 15+ языков
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                                        Генерация объяснений
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                                        Адаптация контекста
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="hidden md:flex items-center justify-center -mx-3 md:col-start-2">
                            <ArrowRight className="w-8 h-8 text-emerald-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                        </div>

                        {/* Step 3: Output */}
                        <div className="group relative md:col-start-3">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-emerald-600/0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                            <div className="relative bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 shadow-lg shadow-emerald-500/30 mb-4">
                                    <Zap className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                                    <Languages className="w-4 h-4 text-emerald-400" />
                                    Готовый продукт
                                </h4>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Полностью локализованная платформа готова к запуску
                                </p>
                                <div className="mt-4 bg-gradient-to-r from-emerald-600/20 to-green-600/20 border border-emerald-500/30 rounded-lg px-3 py-2">
                                    <div className="text-2xl font-black text-white">72ч</div>
                                    <div className="text-[10px] text-emerald-400">от базы до запуска</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Connection Lines (Desktop only) */}
                    <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 opacity-30 -z-10" />
                </div>

                {/* Languages Showcase */}
                <div className="mt-8 bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Languages className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-bold text-white">Поддерживаемые языки экспатов</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['🇬🇧 English', '🇷🇺 Русский', '🇪🇸 Español', '🇩🇪 Deutsch', '🇫🇷 Français', '🇵🇱 Polski', '🇺🇦 Українська', '🇨🇳 中文', '🇦🇪 العربية', '🇮🇳 हिन्दी', '🇧🇷 Português', '🇮🇹 Italiano', '🇹🇷 Türkçe', '🇯🇵 日本語', '🇰🇷 한국어'].map((lang, index) => (
                            <span
                                key={index}
                                className="px-3 py-1.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 hover:border-indigo-500/50 transition-all duration-200"
                            >
                                {lang}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
