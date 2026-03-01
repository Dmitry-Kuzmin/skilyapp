import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    ChevronLeft,
    Check,
    Globe,
    Zap,
    Sparkles,
    ShieldCheck,
    Languages,
    Car,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountry } from '@/contexts/CountryContext';
import { useUserContext } from '@/contexts/UserContext';
import { COUNTRIES, CountryConfig, COUNTRY_CONFIG } from '@/config/countries';
import { detectUserCountry } from './utils';
import { CategoryCard } from './CategoryCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Step = 'welcome' | 'category' | 'language' | 'finish';

export const SmartOnboardingFlow: React.FC = () => {
    const { profileId, user } = useUserContext();
    const { setSelectedCountry, selectedCountry } = useCountry();

    const [currentStep, setCurrentStep] = useState<Step>('welcome');
    const [detectedCountry, setDetectedCountry] = useState<CountryConfig | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('B');
    const [selectedLang, setSelectedLang] = useState<string>('es');
    const [smartTranslator, setSmartTranslator] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Хаптики
    const triggerHaptic = (type: 'impact' | 'notification' | 'selection' = 'selection') => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
            const haptic = window.Telegram.WebApp.HapticFeedback;
            if (type === 'impact') haptic.impactOccurred('medium');
            else if (type === 'notification') haptic.notificationOccurred('success');
            else haptic.selectionChanged();
        }
    };

    // Проверка, нужно ли показывать онбординг
    useEffect(() => {
        const checkStatus = async () => {
            if (!profileId) return;

            const { data, error } = await (supabase as any)
                .from('profiles')
                .select('active_country, settings')
                .eq('id', profileId)
                .single();

            if (!error && data) {
                const profileData = data as { active_country: string | null; settings: any };
                const settings = profileData.settings || {};
                // Если страна уже выбрана И категория есть в настройках, скрываем онбординг
                if (profileData.active_country && settings.license_category) {
                    setIsVisible(false);
                } else {
                    // Инициализация автодетектом
                    const detected = detectUserCountry();
                    setDetectedCountry(detected);
                    setSelectedCountry(detected);

                    // Если Испания и язык браузера русский, включаем переводчик по умолчанию
                    const isRussian = navigator.language.startsWith('ru');
                    setSmartTranslator(detected.code === 'ES' && isRussian);

                    if (detected.examLanguages.length > 0) {
                        setSelectedLang(detected.examLanguages[0]);
                    }

                    setIsVisible(true);
                }
            }
        };

        checkStatus();
    }, [profileId, setSelectedCountry]);

    const handleNext = () => {
        triggerHaptic('impact');
        if (currentStep === 'welcome') {
            // Если для страны только 1 категория, можно пропустить шаг выбора категории?
            // Дим просил: "Если определили Испанию -> Экран выбора категории пропускаем (или показываем 'Выбрана B')"
            // Мы покажем, но задизейблим выбор, чтобы пользователь видел контекст.
            setCurrentStep('category');
        } else if (currentStep === 'category') {
            if (selectedCountry.code === 'ES') {
                setCurrentStep('language');
            } else {
                saveOnboardingData();
            }
        } else if (currentStep === 'language') {
            saveOnboardingData();
        }
    };

    const handleBack = () => {
        triggerHaptic('selection');
        if (currentStep === 'category') setCurrentStep('welcome');
        else if (currentStep === 'language') setCurrentStep('category');
    };

    const saveOnboardingData = async () => {
        if (!profileId) return;
        setIsSaving(true);
        triggerHaptic('notification');

        try {
            const settingsUpdate = {
                license_category: selectedCategory,
                exam_language: selectedLang,
                smart_translator: smartTranslator,
                onboarding_completed_at: new Date().toISOString()
            };

            const { error } = await (supabase as any)
                .from('profiles')
                .update({
                    active_country: selectedCountry.code,
                    settings: settingsUpdate
                })
                .eq('id', profileId);

            if (error) throw error;

            toast.success('Настройки сохранены! 🚀');
            setIsVisible(false);
        } catch (err) {
            console.error('[Onboarding] Save error:', err);
            toast.error('Не удалось сохранить настройки');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 overflow-hidden flex flex-col items-center justify-between p-6 pb-12 sm:pb-6 font-sans text-white">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-500 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-amber-500 rounded-full blur-[120px]" />
            </div>

            {/* Header / Progress */}
            <header className="w-full flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center p-2">
                        <img src="/logo.png" alt="Sdadim" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = "/favicon.ico")} />
                    </div>
                </div>
                <div className="flex gap-1.5">
                    {['welcome', 'category', 'language'].map((s, i) => (
                        <div
                            key={s}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-500",
                                currentStep === s ? "w-8 bg-amber-500" : "w-1.5 bg-white/10",
                                (i === 0 && currentStep !== 'welcome') || (i === 1 && currentStep === 'language') ? "bg-amber-500/40" : ""
                            )}
                        />
                    ))}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center z-10 mt-4 overflow-y-auto hide-scrollbar">
                <AnimatePresence mode="wait">
                    {currentStep === 'welcome' && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.05, y: -20 }}
                            className="flex flex-col items-center text-center gap-10"
                        >
                            <div className="space-y-4">
                                <motion.h1
                                    className="text-4xl sm:text-5xl font-black italic tracking-tighter leading-none"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                >
                                    ОСЕДЛАЙ <span className="text-amber-500 underline decoration-4 underline-offset-8">СВОЮ</span> МОЛНИЮ
                                </motion.h1>
                                <p className="text-zinc-400 text-lg font-medium px-4">
                                    Мы автоматически определили ваш регион. Все тесты соответствуют местным законам {new Date().getFullYear()} года.
                                </p>
                            </div>

                            {/* Detected Region Card */}
                            <div className="w-full p-8 rounded-[2.5rem] bg-zinc-900/60 border-2 border-zinc-800 backdrop-blur-xl relative group">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                                    АВТОДЕТЕКТ
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <span className="text-7xl drop-shadow-2xl">{selectedCountry.flag}</span>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black uppercase">{selectedCountry.nameRu}</h2>
                                        <span className="text-sm font-bold text-zinc-500 tracking-wider flex items-center justify-center gap-1">
                                            <Globe className="w-3.5 h-3.5" />
                                            {selectedCountry.authority} OFFICIAL
                                        </span>
                                    </div>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    className="mt-8 text-sm font-bold text-zinc-400 hover:text-white underline underline-offset-4 decoration-zinc-700"
                                    onClick={() => {
                                        triggerHaptic('selection');
                                        // Переключение на следующую страну в списке для теста или просто ротация
                                        const nextIdx = (COUNTRIES.indexOf(selectedCountry) + 1) % COUNTRIES.filter(c => c.isActive).length;
                                        setSelectedCountry(COUNTRIES.filter(c => c.isActive)[nextIdx]);
                                    }}
                                >
                                    Это не я, сменить страну
                                </motion.button>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-400">
                                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                    БЕЗ ЛИШНИХ КЛИКОВ
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-400">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                                    ОФИЦИАЛЬНАЯ ПДД
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 'category' && (
                        <motion.div
                            key="category"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="flex flex-col items-center text-center gap-8 w-full"
                        >
                            <div className="space-y-3">
                                <h1 className="text-3xl font-black italic tracking-tight">ВЫБЕРИТЕ <span className="text-amber-500">ПРАВА</span></h1>
                                <p className="text-zinc-500 text-sm font-medium px-8 leading-relaxed">
                                    {selectedCountry.code === 'ES'
                                        ? "В Испании временно доступна только категория B (Легковые авто)"
                                        : "Выберите категорию, которую планируете получить"}
                                </p>
                            </div>

                            {/* Dynamic Categories List */}
                            <div className="w-full flex justify-center gap-4 py-4 overflow-x-auto pb-8 hide-scrollbar px-4 snap-x">
                                {selectedCountry.availableCategories.map((cat) => (
                                    <div key={cat} className="snap-center">
                                        <CategoryCard
                                            category={cat}
                                            isSelected={selectedCategory === cat}
                                            icon={cat === 'A' ? "🏍" : cat === 'C' ? "🚛" : cat === 'D' ? "🚌" : "🚗"}
                                            title={cat === 'B' ? "TURISMO" : cat === 'A' ? "MOTO" : "HEAVY"}
                                            description={
                                                cat === 'B' ? "Легковые автомобили до 3.5т и до 9 мест." :
                                                    cat === 'A' ? "Мотоциклы и легкие трициклы." :
                                                        "Грузовой транспорт и автобусы."
                                            }
                                            onClick={() => {
                                                if (selectedCountry.availableCategories.length > 1) {
                                                    setSelectedCategory(cat);
                                                    triggerHaptic('selection');
                                                }
                                            }}
                                            isDisabled={selectedCountry.availableCategories.length === 1 && selectedCategory !== cat}
                                        />
                                    </div>
                                ))}
                            </div>

                            {selectedCountry.code === 'ES' && (
                                <p className="text-xs font-black text-amber-500/50 uppercase tracking-widest bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/10">
                                    Испанская база DGT актуальна
                                </p>
                            )}
                        </motion.div>
                    )}

                    {currentStep === 'language' && (
                        <motion.div
                            key="language"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex flex-col items-center text-center gap-10 w-full"
                        >
                            <div className="space-y-4">
                                <h1 className="text-3xl font-black italic tracking-tight">ЯЗЫК <span className="text-amber-500 uppercase">ЭКЗАМЕНА</span></h1>
                                <p className="text-zinc-400 text-sm font-medium px-4">
                                    На каком языке вы планируете сдавать экзамен в {selectedCountry.nameRu}?
                                </p>
                            </div>

                            <div className="w-full space-y-3">
                                {selectedCountry.examLanguages.map((lang) => (
                                    <motion.button
                                        key={lang}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setSelectedLang(lang);
                                            triggerHaptic('selection');
                                        }}
                                        className={cn(
                                            "w-full p-6 rounded-[1.5rem] border-2 flex items-center justify-between transition-all duration-300",
                                            selectedLang === lang
                                                ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10"
                                                : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center text-xl",
                                                selectedLang === lang ? "bg-amber-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                                            )}>
                                                {lang.toUpperCase()}
                                            </div>
                                            <div className="text-left font-bold">
                                                {lang === 'es' ? "Español" : lang === 'en' ? "English" : "Русский"}
                                            </div>
                                        </div>
                                        {selectedLang === lang && <Check className="w-6 h-6 text-amber-500 stroke-[3px]" />}
                                    </motion.button>
                                ))}
                            </div>

                            {/* Smart Translator Suggestion */}
                            {selectedCountry.smartTranslatorAvailable && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                    className="p-6 rounded-[2rem] bg-indigo-500/10 border-2 border-indigo-500/20 flex flex-col items-center gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-6 h-6 text-indigo-400 fill-indigo-400/20" />
                                        <h3 className="text-sm font-black text-indigo-400 uppercase tracking-tight">Умный перевод на русский</h3>
                                    </div>
                                    <p className="text-xs text-zinc-400 font-medium">
                                        Мы можем показывать перевод каждого вопроса на русский язык рядом с оригиналом. Это идеально помогает учить термины.
                                    </p>
                                    <div
                                        onClick={() => {
                                            setSmartTranslator(!smartTranslator);
                                            triggerHaptic('selection');
                                        }}
                                        className={cn(
                                            "w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-black text-xs transition-all cursor-pointer",
                                            smartTranslator ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-800 text-zinc-500"
                                        )}
                                    >
                                        {smartTranslator ? <><Check className="w-4 h-4" /> ВКЛЮЧЕНО</> : "ОТКЛЮЧЕНО"}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer Navigation */}
            <footer className="w-full max-w-md flex flex-col gap-4 z-10">
                <div className="flex gap-4">
                    {currentStep !== 'welcome' && (
                        <motion.button
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'autp' }}
                            onClick={handleBack}
                            className="h-16 px-6 rounded-[1.5rem] bg-zinc-900/60 border border-zinc-800 text-zinc-400 flex items-center justify-center"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </motion.button>
                    )}

                    <motion.button
                        disabled={isSaving}
                        onClick={handleNext}
                        className={cn(
                            "flex-1 h-16 rounded-[1.5rem] flex items-center justify-center gap-2 font-black transition-all duration-300",
                            isSaving
                                ? "bg-zinc-800 text-zinc-600 grayscale animate-pulse cursor-wait"
                                : "bg-white text-zinc-950 shadow-[0_8px_30px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.4)] active:scale-95"
                        )}
                    >
                        {isSaving ? (
                            "ЗАПУСКАЕМ ДВИГАТЕЛЬ..."
                        ) : (
                            <>
                                {currentStep === 'welcome' && "ПОГНАЛИ"}
                                {currentStep === 'category' && (selectedCountry.code === 'ES' ? "ДАЛЕЕ" : "ЭТО МОЙ ВЫБОР")}
                                {currentStep === 'language' && "START ENGINE 🚀"}
                                <ChevronRight className="w-6 h-6 stroke-[3px]" />
                            </>
                        )}
                    </motion.button>
                </div>

                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center mt-2 group cursor-help transition-colors hover:text-zinc-500">
                    Нажимая кнопку, вы соглашаетесь с тем, что станете <span className="text-amber-500/50">лучшим водителем</span> в {selectedCountry.nameRu} ⚡️
                </p>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};
