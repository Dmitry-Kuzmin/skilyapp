/**
 * CTA Slide
 * 
 * Слайд 4: Финальный призыв к действию с формой заявки
 */

import React, { useState } from 'react';
import { Send, Download, Rocket, AlertCircle, CheckCircle, Globe2 } from 'lucide-react';
import { playClickSound } from '@/services/audioService';

interface CTASlideProps {
    onClose: () => void;
}

const AVAILABLE_COUNTRIES = [
    { code: 'pl', name: 'Poland 🇵🇱', status: 'available' },
    { code: 'de', name: 'Germany 🇩🇪', status: 'available' },
    { code: 'fr', name: 'France 🇫🇷', status: 'available' },
    { code: 'it', name: 'Italy 🇮🇹', status: 'available' },
    { code: 'uk', name: 'United Kingdom 🇬🇧', status: 'available' },
    { code: 'pt', name: 'Portugal 🇵🇹', status: 'available' },
    { code: 'nl', name: 'Netherlands 🇳🇱', status: 'available' },
    { code: 'be', name: 'Belgium 🇧🇪', status: 'available' },
    { code: 'other', name: 'Другая страна / Other', status: 'available' },
];

export const CTASlide: React.FC<CTASlideProps> = ({ onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        country: '',
        budget: '',
        email: '',
        telegram: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        playClickSound();

        setIsSubmitting(true);
        setSubmitStatus('idle');

        // Имитация отправки (здесь будет реальный API)
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitStatus('success');

            // Автоматическое закрытие через 3 секунды после успеха
            setTimeout(() => {
                onClose();
            }, 3000);
        }, 1500);
    };

    const handleDownloadWhitePaper = () => {
        playClickSound();
        // TODO: Генерация и скачивание White Paper PDF
        alert('White Paper будет доступен после финализации условий партнёрства');
    };

    if (submitStatus === 'success') {
        return (
            <div className="p-8 min-h-[500px] flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-600 to-green-600 shadow-lg shadow-emerald-500/50 mb-6 animate-bounce">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4">
                        Заявка отправлена! 🎉
                    </h3>
                    <p className="text-slate-300 mb-6 leading-relaxed">
                        Наша команда свяжется с вами в течение 24 часов для обсуждения деталей партнёрства.
                        Проверьте свою почту и Telegram.
                    </p>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <div className="text-sm text-slate-400">Следующий шаг:</div>
                        <div className="text-white font-bold mt-1">Подготовка Partnership Kit</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-[500px] flex flex-col">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/50 mb-4 animate-pulse">
                    <Rocket className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-black text-white mb-2">
                    Забронируйте эксклюзив
                </h3>
                <p className="text-lg text-slate-300">
                    Станьте первым и единственным владельцем Skily в своей стране
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Имя представителя *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Иван Иванов"
                            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Компания / Опыт *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            placeholder="Автошкола 'Драйв' / Инвестор"
                            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>

                    {/* Country */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Страна интереса *
                        </label>
                        <select
                            required
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Выберите страну</option>
                            {AVAILABLE_COUNTRIES.map((country) => (
                                <option key={country.code} value={country.code}>
                                    {country.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="partner@example.com"
                            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>

                    {/* Telegram */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Telegram (опционально)
                        </label>
                        <input
                            type="text"
                            value={formData.telegram}
                            onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                            placeholder="@username"
                            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>

                    {/* Budget */}
                    <div>
                        <label className="block text-sm font-bold text-white mb-2">
                            Бюджет на маркетинг *
                        </label>
                        <select
                            required
                            value={formData.budget}
                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Выберите диапазон</option>
                            <option value="5k-20k">€5k - €20k</option>
                            <option value="20k-50k">€20k - €50k</option>
                            <option value="50k-100k">€50k - €100k</option>
                            <option value="100k+">€100k+</option>
                        </select>
                    </div>
                </div>

                {/* Full Width: Info Box */}
                <div className="md:col-span-2 bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-slate-300 leading-relaxed">
                            <strong className="text-white">Что вы получаете:</strong> Готовую платформу с AI-локализацией за 72 часа, техническую поддержку 24/7, маркетинговые материалы и эксклюзивную территорию.
                        </div>
                    </div>
                </div>

                {/* Full Width: Actions */}
                <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
                    {/* Download White Paper */}
                    <button
                        type="button"
                        onClick={handleDownloadWhitePaper}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold hover:bg-slate-700 hover:scale-105 transition-all duration-200"
                    >
                        <Download className="w-5 h-5" />
                        <span>Скачать White Paper</span>
                    </button>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`
                            flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all duration-200
                            ${isSubmitting
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-105 shadow-lg shadow-indigo-500/30'
                            }
                        `}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Отправка...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                <span>Отправить заявку</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
