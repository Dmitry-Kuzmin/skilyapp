/**
 * Monetization Slide
 * 
 * Слайд 3: Экономика и интерактивный калькулятор прибыли
 */

import React, { useState } from 'react';
import { TrendingUp, DollarSign, Users, ArrowUpRight, Calculator } from 'lucide-react';

export const MonetizationSlide: React.FC = () => {
    const [students, setStudents] = useState(500);

    // Расчёты (примерные данные на основе испанского рынка)
    const avgLTV = 35; // Средняя LTV пользователя в евро
    const conversionRate = 0.38; // 38% конверсия в платную подписку
    const revenueShare = 0.80; // 80% партнёру

    const totalRevenue = students * avgLTV * conversionRate;
    const partnerRevenue = totalRevenue * revenueShare;
    const monthlyStudents = students;

    return (
        <div className="p-8 min-h-[500px] flex flex-col">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 shadow-lg shadow-emerald-500/50 mb-4">
                    <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-black text-white mb-2">
                    Экономика партнёрства
                </h3>
                <p className="text-lg text-slate-300">
                    Готовая воронка продаж с <span className="text-emerald-400 font-bold">конверсией 38%</span>
                </p>
            </div>

            <div className="flex-1 grid md:grid-cols-2 gap-6">
                {/* Left: Stats & Deal */}
                <div className="space-y-6">
                    {/* Success Metrics */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            Испанский кейс (Q4 2024)
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Средняя LTV</span>
                                <span className="text-lg font-black text-white">€{avgLTV}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Конверсия FREE → PRO</span>
                                <span className="text-lg font-black text-emerald-400">{(conversionRate * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Retention (30 дней)</span>
                                <span className="text-lg font-black text-violet-400">72%</span>
                            </div>
                        </div>
                    </div>

                    {/* Deal Structure */}
                    <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-2xl p-6">
                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-indigo-400" />
                            Условия партнёрства
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                                    <span className="text-emerald-400 text-xs font-bold">✓</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Revenue Share</div>
                                    <div className="text-xs text-slate-400">80% партнёру / 20% Skily</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                                    <span className="text-emerald-400 text-xs font-bold">✓</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Территориальный эксклюзив</div>
                                    <div className="text-xs text-slate-400">1 партнёр = 1 страна</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                                    <span className="text-emerald-400 text-xs font-bold">✓</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Zero Infrastructure</div>
                                    <div className="text-xs text-slate-400">0€ на разработку и поддержку</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Revenue Calculator */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-violet-400" />
                        Калькулятор прибыли
                    </h4>

                    {/* Input Slider */}
                    <div className="mb-6">
                        <label className="text-sm text-slate-400 mb-2 block flex items-center justify-between">
                            <span>Студентов в месяц</span>
                            <span className="text-white font-bold flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {monthlyStudents}
                            </span>
                        </label>
                        <input
                            type="range"
                            min="100"
                            max="5000"
                            step="100"
                            value={students}
                            onChange={(e) => setStudents(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer slider-thumb"
                            style={{
                                background: `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${((students - 100) / 4900) * 100}%, rgb(51, 65, 85) ${((students - 100) / 4900) * 100}%, rgb(51, 65, 85) 100%)`
                            }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>100</span>
                            <span>5 000</span>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-4">
                        {/* Total Revenue */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">Общая выручка</div>
                            <div className="text-2xl font-black text-white">
                                €{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">в месяц</div>
                        </div>

                        {/* Partner Revenue */}
                        <div className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 border border-emerald-500/30 rounded-xl p-4">
                            <div className="text-xs text-emerald-400 mb-1 flex items-center gap-1">
                                Ваш доход
                                <ArrowUpRight className="w-3 h-3" />
                            </div>
                            <div className="text-3xl font-black text-white">
                                €{partnerRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-[10px] text-emerald-400/70 mt-1">80% Revenue Share</div>
                        </div>

                        {/* Annual Projection */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">Годовой прогноз</div>
                            <div className="text-xl font-black text-violet-400">
                                €{(partnerRevenue * 12).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">при стабильном трафике</div>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="mt-4 text-[10px] text-slate-500 text-center">
                        * Расчёт основан на данных испанского рынка (Q4 2024)
                    </div>
                </div>
            </div>
        </div>
    );
};
