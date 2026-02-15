import React, { useState } from 'react';
import {
    X,
    Rocket,
    Zap,
    Globe2,
    Sparkles,
    Download,
    Send,
    CheckCircle,
    TrendingUp,
    Clock,
    DollarSign,
    Brain,
    Swords,
    BarChart3,
    Target
} from 'lucide-react';
import { playClickSound } from '@/services/audioService';

interface PartnershipExpansionPortalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PartnershipExpansionPortal: React.FC<PartnershipExpansionPortalProps> = ({ isOpen, onClose }) => {
    const [students, setStudents] = useState(1000);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        country: '',
        telegram: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // Revenue calculations
    const avgLTV = 35;
    const conversionRate = 0.38;
    const monthlyRevenue = students * avgLTV * conversionRate;
    const partnerShare = monthlyRevenue * 0.8;
    const yearlyProjection = partnerShare * 12;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        playClickSound();

        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 overflow-y-auto overflow-x-hidden">
            {/* Background Pattern (same as landing) */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="fixed top-6 right-6 z-50 p-3 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-300"
            >
                <X size={20} />
            </button>

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">

                {/* HERO SECTION (Landing style) */}
                <section className="text-center mb-24">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-bold mb-8">
                        <Sparkles size={14} />
                        Эксклюзивное партнёрство
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                        Захватите рынок<br />
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            водительских прав
                        </span>
                    </h1>

                    <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Готовая EdTech-платформа с AI-локализацией за 72 часа. 80% прибыли партнёру. Эксклюзивная территория.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => {
                                playClickSound();
                                document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-8 py-4 rounded-full bg-white text-slate-900 font-bold hover:bg-slate-100 transition-all hover:scale-105 shadow-lg"
                        >
                            Подать заявку
                        </button>
                        <button
                            onClick={() => {
                                playClickSound();
                                alert('White Paper download will be implemented');
                            }}
                            className="px-8 py-4 rounded-full border-2 border-slate-700 text-white font-bold hover:bg-slate-800 transition-all"
                        >
                            <Download size={18} className="inline mr-2" />
                            Скачать презентацию
                        </button>
                    </div>
                </section>

                {/* STATS PANEL (Landing stats style) */}
                <section className="mb-24">
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: DollarSign, value: '80%', label: 'Прибыли партнёру', color: 'text-green-400' },
                            { icon: Clock, value: '72ч', label: 'До запуска', color: 'text-indigo-400' },
                            { icon: TrendingUp, value: '€35+', label: 'LTV студента', color: 'text-violet-400' }
                        ].map((stat, idx) => (
                            <div
                                key={idx}
                                className="relative p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-all group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative">
                                    <stat.icon className={`w-8 h-8 ${stat.color} mb-4`} />
                                    <div className={`text-4xl font-black ${stat.color} mb-2`}>{stat.value}</div>
                                    <div className="text-sm text-slate-400">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FEATURE GRID (About page style - Bento Grid) */}
                <section className="mb-24">
                    <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-12">
                        Что вы получаете
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            {
                                icon: Brain,
                                title: 'AI-локализация',
                                desc: 'Skily AI переводит и адаптирует любую базу ПДД на 15+ языков за 72 часа',
                                gradient: 'from-violet-500/10 to-purple-500/10',
                                border: 'border-violet-500/20'
                            },
                            {
                                icon: Swords,
                                title: 'PvP-движок',
                                desc: 'Уникальная система дуэлей, которая увеличивает retention в 5 раз',
                                gradient: 'from-red-500/10 to-orange-500/10',
                                border: 'border-red-500/20'
                            },
                            {
                                icon: BarChart3,
                                title: 'CRM и аналитика',
                                desc: 'Полная система управления студентами и отслеживания конверсий',
                                gradient: 'from-blue-500/10 to-cyan-500/10',
                                border: 'border-blue-500/20'
                            },
                            {
                                icon: Rocket,
                                title: 'Маркетинг-кит',
                                desc: 'Готовые креативы, landing pages и стратегия запуска для вашего рынка',
                                gradient: 'from-green-500/10 to-emerald-500/10',
                                border: 'border-green-500/20'
                            }
                        ].map((feature, idx) => (
                            <div
                                key={idx}
                                className={`relative p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} border ${feature.border} backdrop-blur-sm hover:scale-[1.02] transition-all group`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative">
                                    <feature.icon className="w-10 h-10 text-white mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CALCULATOR (Manifesto block style) */}
                <section className="mb-24">
                    <div className="relative p-10 md:p-12 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />

                        <div className="relative">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-8">
                                Рассчитайте свою прибыль
                            </h2>

                            <div className="mb-8">
                                <label className="block mb-4">
                                    <span className="text-sm font-bold text-slate-400 mb-2 block">Студентов в месяц</span>
                                    <input
                                        type="range"
                                        min="100"
                                        max="5000"
                                        step="100"
                                        value={students}
                                        onChange={(e) => setStudents(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:cursor-pointer"
                                    />
                                    <div className="flex justify-between mt-2 text-sm text-slate-500">
                                        <span>100</span>
                                        <span className="text-xl font-bold text-white">{students.toLocaleString()}</span>
                                        <span>5,000</span>
                                    </div>
                                </label>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="text-center p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-2">В месяц</div>
                                    <div className="text-3xl font-black text-green-400">€{Math.round(partnerShare).toLocaleString()}</div>
                                </div>
                                <div className="text-center p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-2">В год</div>
                                    <div className="text-3xl font-black text-green-400">€{Math.round(yearlyProjection / 1000)}k</div>
                                </div>
                                <div className="text-center p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-2">Ваша доля</div>
                                    <div className="text-3xl font-black text-white">80%</div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 mt-6 text-center">
                                * Расчёт основан на испанском рынке (Q4 2024): LTV €35, конверсия 38%
                            </p>
                        </div>
                    </div>
                </section>

                {/* FORM SECTION (CTA Banner style) */}
                <section id="form" className="mb-12">
                    {!isSubmitted ? (
                        <div className="relative p-10 md:p-12 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 overflow-hidden">
                            {/* Background pattern */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]" />

                            <div className="relative">
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                                        Забронируйте свою страну
                                    </h2>
                                    <p className="text-lg text-indigo-100">
                                        Один партнёр = Одна страна = Полный эксклюзив
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ваше имя *"
                                            className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40 backdrop-blur-sm"
                                        />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="Email *"
                                            className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40 backdrop-blur-sm"
                                        />
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <select
                                            required
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40 backdrop-blur-sm appearance-none cursor-pointer"
                                        >
                                            <option value="" className="bg-slate-900">Страна интереса *</option>
                                            <option value="poland" className="bg-slate-900">🇵🇱 Poland</option>
                                            <option value="germany" className="bg-slate-900">🇩🇪 Germany</option>
                                            <option value="france" className="bg-slate-900">🇫🇷 France</option>
                                            <option value="italy" className="bg-slate-900">🇮🇹 Italy</option>
                                            <option value="uk" className="bg-slate-900">🇬🇧 United Kingdom</option>
                                            <option value="other" className="bg-slate-900">🌍 Другая страна</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={formData.telegram}
                                            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                                            placeholder="Telegram (опционально)"
                                            className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40 backdrop-blur-sm"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full px-8 py-4 rounded-xl bg-white text-indigo-600 font-bold hover:bg-slate-100 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                                                Отправка...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Отправить заявку
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 border-4 border-green-500 rounded-full mb-6">
                                <CheckCircle size={40} className="text-green-500" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-3">Заявка отправлена! 🎉</h3>
                            <p className="text-lg text-slate-400">
                                Мы свяжемся с вами в течение 24 часов
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
