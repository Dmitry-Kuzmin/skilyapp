import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    Globe,
    ArrowRight,
    ChevronLeft,
    Monitor,
    Sparkles,
    CheckCircle2,
    Car,
    Bike,
    Truck,
    Bus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountry } from '@/contexts/CountryContext';
import { useUserContext } from '@/contexts/UserContext';
import { COUNTRIES } from '@/config/countries';
import { detectUserCountry } from './utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePDDContext } from '@/contexts/PDDContext';
import { CountryCode } from '@/types/pdd';
import { useLanguage, Language } from '@/contexts/LanguageContext';

type Step = 'welcome' | 'category' | 'language' | 'finish';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
    exit: { opacity: 0, scale: 0.99, transition: { duration: 0.15 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] } }
};

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'A': return <Bike className="w-8 h-8" />;
        case 'C': return <Truck className="w-8 h-8" />;
        case 'D': return <Bus className="w-8 h-8" />;
        default: return <Car className="w-8 h-8" />;
    }
};

const CATEGORY_LABELS: Record<string, { title: string; desc: string }> = {
    'B': { title: 'TURISMO', desc: 'Легковые авто и малые фургоны' },
    'A': { title: 'MOTO', desc: 'Мотоциклы, скутеры, трициклы' },
    'C': { title: 'TRUCK', desc: 'Грузовой транспорт от 3.5т' },
    'D': { title: 'BUS', desc: 'Пассажирские автобусы' },
};

export const SmartOnboardingFlow: React.FC = () => {
    const { profileId } = useUserContext();
    const { setLanguage } = useLanguage();
    const { setSelectedCountry: setLandingCountry, selectedCountry } = useCountry();
    const { setSelectedCountry: setAppCountry, setSelectedCategory: setAppCategory } = usePDDContext();

    const [currentStep, setCurrentStep] = useState<Step>('welcome');
    const [selectedCategory, setSelectedCategory] = useState<string>('B');
    const [selectedLang, setSelectedLang] = useState<string>('es');
    const [smartTranslator, setSmartTranslator] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [autoDetectDone, setAutoDetectDone] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const forceOnboarding = urlParams.get('onboarding') === 'true';

            // Используем новый отдельный флаг, так как pdd_selected_country ставится автоматически
            const localCompleted = localStorage.getItem('pdd_onboarding_completed') === 'true';

            // Если уже пройден (флаг в localStorage) — не показываем снова
            if (!forceOnboarding && localCompleted) {
                setIsVisible(false);
                return;
            }

            if (forceOnboarding) {
                if (!autoDetectDone) {
                    const detected = await detectUserCountry();
                    setLandingCountry(detected);
                    if (detected.examLanguages.length > 0) setSelectedLang(detected.examLanguages[0]);
                    const isRussian = navigator.language.startsWith('ru');
                    setSmartTranslator(detected.code === 'ES' && isRussian);
                    setIsVisible(true);
                    setAutoDetectDone(true);
                }
                return;
            }

            if (!profileId) return;

            const { data, error } = await (supabase as any)
                .from('profiles')
                .select('preferred_country, settings, preferred_license_category')
                .eq('id', profileId)
                .single();

            if (!error && data) {
                const hasCountry = data.preferred_country;
                const hasCategory = data.settings?.license_category || data.preferred_license_category;
                const completedOnboarding = !!data.settings?.onboarding_completed_at;

                if (completedOnboarding || hasCountry) {
                    // Existing user — sync to localStorage and skip onboarding
                    localStorage.setItem('pdd_onboarding_completed', 'true');
                    if (hasCountry) localStorage.setItem('pdd_selected_country', data.preferred_country);
                    if (hasCategory) localStorage.setItem('pdd_selected_category', hasCategory);
                    setIsVisible(false);
                } else if (!autoDetectDone) {
                    const detected = await detectUserCountry();
                    setLandingCountry(detected);
                    const isRussian = navigator.language.startsWith('ru');
                    setSmartTranslator(detected.code === 'ES' && isRussian);
                    if (detected.examLanguages.length > 0) setSelectedLang(detected.examLanguages[0]);
                    setIsVisible(true);
                    setAutoDetectDone(true);
                }
            }
        };
        checkStatus();
    }, [profileId, setLandingCountry, autoDetectDone]);

    const handleNext = () => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
        if (currentStep === 'welcome') setCurrentStep('category');
        else if (currentStep === 'category') {
            if (selectedCountry.code === 'ES') setCurrentStep('language');
            else saveOnboardingData();
        } else if (currentStep === 'language') saveOnboardingData();
    };

    const handleBack = () => {
        if (currentStep === 'category') setCurrentStep('welcome');
        else if (currentStep === 'language') setCurrentStep('category');
    };

    const handleSwitchCountry = () => {
        const activeCountries = COUNTRIES.filter(c => c.isActive);
        const currentIdx = activeCountries.findIndex(c => c.code === selectedCountry.code);
        const nextIdx = (currentIdx + 1) % activeCountries.length;
        setLandingCountry(activeCountries[nextIdx]);
    };

    const saveOnboardingData = async () => {
        setIsSaving(true);
        try {
            const countryMap: Record<string, string> = { 'ES': 'spain', 'RU': 'russia' };
            const mappedCountry = countryMap[selectedCountry.code] || 'spain';

            // Сразу применяем локально (не ждём Supabase)
            setLanguage(selectedLang as Language);
            setAppCountry(mappedCountry as CountryCode);
            setAppCategory(selectedCategory);

            // Сохраняем в localStorage как fallback
            localStorage.setItem('pdd_selected_country', mappedCountry);
            localStorage.setItem('pdd_selected_category', selectedCategory);
            localStorage.setItem('app_language', selectedLang);
            localStorage.setItem('pdd_onboarding_completed', 'true');

            if (profileId) {
                const settingsUpdate = {
                    license_category: selectedCategory,
                    exam_language: selectedLang,
                    smart_translator: smartTranslator,
                    language: selectedLang,
                    onboarding_completed_at: new Date().toISOString(),
                };

                const { error } = await (supabase as any)
                    .from('profiles')
                    .update({
                        preferred_country: mappedCountry,
                        preferred_license_category: selectedCategory,
                        settings: settingsUpdate
                    })
                    .eq('id', profileId);

                if (error) {
                    console.error('[Onboarding] Supabase save error:', error);
                    // Не бросаем — данные уже в localStorage, закрываем онбординг
                }
            }

            setIsVisible(false);
            toast.success('Настройка завершена! 🎉');
        } catch (err) {
            console.error('[Onboarding] saveOnboardingData failed:', err);
            // Даже при ошибке закрываем — не блокируем пользователя
            setIsVisible(false);
            toast.error('Настройки сохранены локально');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isVisible) return null;

    const currentStepIndex = ['welcome', 'category', 'language'].indexOf(currentStep);

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center overflow-x-hidden overflow-y-auto scrollbar-none">
            {/* Background Aura */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.08),transparent_60%)] pointer-events-none" />

            {/* Header */}
            <header className="relative z-[110] w-full max-w-lg px-8 pt-10 pb-4 flex items-center justify-between shrink-0">
                <img src="/logo/skily-logo-current.svg" alt="Skily" className="h-8 w-auto" />

                {/* Step indicator dots */}
                <div className="flex gap-2 p-1.5 px-3 rounded-full bg-white/[0.04] border border-white/[0.05]">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-700",
                                currentStepIndex === i ? "w-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]" : "w-1.5 bg-white/10"
                            )}
                        />
                    ))}
                </div>
            </header>

            {/* Breadcrumb — показывает выбранные значения предыдущих шагов */}
            <AnimatePresence>
                {currentStepIndex > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-[110] w-full max-w-lg px-8 pb-2 flex items-center gap-2"
                    >
                        {/* Страна — всегда виден начиная с шага 2 */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/[0.06] backdrop-blur-xl">
                            <span className="text-base leading-none">{selectedCountry.flag}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{selectedCountry.nameRu}</span>
                        </div>

                        {/* Категория — показывается только на шаге language */}
                        <AnimatePresence>
                            {currentStepIndex > 1 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-blue-500/20 backdrop-blur-xl"
                                >
                                    <span className="text-blue-400">{getCategoryIcon(selectedCategory)}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">CAT {selectedCategory}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="relative z-10 w-full flex-grow flex flex-col items-center px-6 pt-4 pb-28">
                <AnimatePresence mode="wait">

                    {/* STEP 1: Welcome / Country */}
                    {currentStep === 'welcome' && (
                        <motion.div
                            key="welcome"
                            variants={containerVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="flex flex-col items-center text-center max-w-xl"
                        >
                            <motion.div variants={itemVariants} className="mb-6">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5">
                                    Система инициализирована
                                </span>
                            </motion.div>

                            <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl font-black mb-4 tracking-tight text-white leading-tight">
                                ЦИФРОВОЙ СТАНДАРТ<br />
                                <span className="text-zinc-500">ОБУЧЕНИЯ ПДД</span>
                            </motion.h1>

                            <motion.p variants={itemVariants} className="text-zinc-500 text-sm font-medium mb-10 max-w-[280px] leading-relaxed">
                                Персонализированная подготовка на основе официальных тестов вашего региона.
                            </motion.p>

                            <motion.div variants={itemVariants} className="w-full max-w-sm p-10 rounded-[3rem] bg-zinc-900/30 border border-white/[0.03] backdrop-blur-2xl shadow-2xl">
                                <div className="flex flex-col items-center gap-8">
                                    <div className="text-8xl select-none">{selectedCountry.flag}</div>
                                    <div className="space-y-1.5">
                                        <h2 className="text-3xl font-bold text-white tracking-tight">{selectedCountry.nameRu}</h2>
                                        <div className="flex items-center justify-center gap-2 text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em]">
                                            <Monitor className="w-3 h-3 text-blue-500" />
                                            {selectedCountry.authority} OFFICIAL
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSwitchCountry}
                                        className="text-[10px] h-10 px-6 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        Сменить страну
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* STEP 2: Category */}
                    {currentStep === 'category' && (
                        <motion.div
                            key="category"
                            variants={containerVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="flex flex-col items-center text-center w-full"
                        >
                            <motion.h1 variants={itemVariants} className="text-3xl font-black mb-3 text-white">
                                ВЫБЕРИТЕ <span className="text-blue-500">КАТЕГОРИЮ</span>
                            </motion.h1>
                            <motion.p variants={itemVariants} className="text-zinc-500 text-sm font-medium mb-8 max-w-sm">
                                Все официальные вопросы для выбранного типа транспорта.
                            </motion.p>

                            <motion.div variants={itemVariants} className="w-full">
                                <div className="flex justify-start sm:justify-center gap-5 overflow-x-auto py-10 px-6 scrollbar-none snap-x">
                                    {selectedCountry.availableCategories.map((cat) => {
                                        const label = CATEGORY_LABELS[cat] || { title: `CAT ${cat}`, desc: '' };
                                        const isSelected = selectedCategory === cat;
                                        return (
                                            <motion.div
                                                key={cat}
                                                whileHover={{ y: -10, scale: 1.02 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={cn(
                                                    "relative flex flex-col items-center justify-between p-8 rounded-[3rem] border transition-all duration-400 cursor-pointer snap-center shrink-0",
                                                    "w-[240px] h-[320px]",
                                                    isSelected
                                                        ? "border-blue-500 bg-blue-500/[0.06] shadow-[0_30px_70px_-15px_rgba(59,130,246,0.3)]"
                                                        : "border-white/[0.05] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                                                )}
                                            >
                                                {/* Bloom effect */}
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.12),transparent_60%)] pointer-events-none rounded-[3rem]" />
                                                )}

                                                {/* Icon */}
                                                <div className={cn(
                                                    "w-20 h-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-400 shadow-2xl",
                                                    isSelected
                                                        ? "bg-blue-500 text-white shadow-blue-500/30"
                                                        : "bg-white/[0.04] text-zinc-600"
                                                )}>
                                                    {getCategoryIcon(cat)}
                                                </div>

                                                {/* Label */}
                                                <div className="text-center space-y-1.5">
                                                    <div className={cn(
                                                        "text-2xl font-black tracking-tight transition-colors",
                                                        isSelected ? "text-white" : "text-zinc-500"
                                                    )}>
                                                        CAT {cat}
                                                    </div>
                                                    <div className={cn(
                                                        "text-[11px] font-medium leading-relaxed max-w-[140px]",
                                                        isSelected ? "text-zinc-300" : "text-zinc-600"
                                                    )}>
                                                        {label.desc}
                                                    </div>
                                                </div>

                                                {/* Check */}
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-400",
                                                    isSelected
                                                        ? "bg-blue-500 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                                                        : "border-white/10 bg-transparent"
                                                )}>
                                                    <Check className={cn("w-4 h-4 stroke-[3px] transition-all", isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* STEP 3: Language */}
                    {currentStep === 'language' && (
                        <motion.div
                            key="language"
                            variants={containerVariants}
                            initial="hidden" animate="visible"
                            className="flex flex-col items-center text-center w-full max-w-md"
                        >
                            <motion.h1 variants={itemVariants} className="text-3xl font-black mb-3 text-white">
                                <span className="text-blue-500">ЯЗЫК</span> ОБУЧЕНИЯ
                            </motion.h1>
                            <motion.p variants={itemVariants} className="text-zinc-500 text-sm font-medium mb-10">
                                Язык интерфейса и экзаменационных вопросов
                            </motion.p>

                            <div className="w-full space-y-3 mb-10">
                                {selectedCountry.examLanguages.map((lang) => (
                                    <motion.button
                                        key={lang}
                                        variants={itemVariants}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedLang(lang)}
                                        className={cn(
                                            "w-full p-5 rounded-[2rem] border transition-all duration-300 flex items-center justify-between",
                                            selectedLang === lang
                                                ? "border-blue-500/50 bg-blue-500/5"
                                                : "border-white/5 bg-white/[0.02] hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black uppercase transition-all",
                                                selectedLang === lang ? "bg-blue-500 text-white" : "bg-white/5 text-zinc-500"
                                            )}>
                                                {lang}
                                            </div>
                                            <span className="text-left font-bold text-zinc-100">
                                                {lang === 'es' ? "ESPAÑOL" : lang === 'en' ? "ENGLISH" : "РУССКИЙ"}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            selectedLang === lang ? "bg-blue-500 border-blue-500" : "border-white/10"
                                        )}>
                                            {selectedLang === lang && <CheckCircle2 className="w-5 h-5 text-zinc-950 fill-white stroke-none" />}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>

                            {selectedCountry.smartTranslatorAvailable && (
                                <motion.div
                                    variants={itemVariants}
                                    className="w-full p-7 rounded-[2.5rem] bg-indigo-500/[0.03] border border-indigo-500/20 backdrop-blur-xl"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">AI Interpreter</h3>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed text-left mb-6">
                                        Автоматический перевод экзаменационных вопросов на русский язык в реальном времени.
                                    </p>
                                    <button
                                        onClick={() => setSmartTranslator(!smartTranslator)}
                                        className={cn(
                                            "w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] transition-all duration-300 uppercase tracking-widest",
                                            smartTranslator
                                                ? "bg-indigo-500 text-white shadow-xl shadow-indigo-500/20"
                                                : "bg-white/5 text-zinc-500"
                                        )}
                                    >
                                        {smartTranslator ? "Активен" : "Отключён"}
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer Actions */}
            <footer className="relative z-[110] w-full max-w-lg px-8 pb-16 flex items-center gap-4 shrink-0">
                <AnimatePresence>
                    {currentStepIndex > 0 && (
                        <motion.button
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 56 }}
                            exit={{ opacity: 0, width: 0 }}
                            onClick={handleBack}
                            className="h-14 aspect-square flex items-center justify-center rounded-2xl bg-zinc-900/60 border border-white/5 text-zinc-500 active:scale-90 transition-all shrink-0"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </motion.button>
                    )}
                </AnimatePresence>

                <button
                    onClick={handleNext}
                    disabled={isSaving}
                    className={cn(
                        "flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-[0.98]",
                        isSaving
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            : "bg-white text-zinc-950 shadow-2xl shadow-white/10 hover:shadow-white/20"
                    )}
                >
                    {isSaving ? (
                        <span>Сохранение...</span>
                    ) : (
                        <>
                            <span>
                                {currentStep === 'welcome' && 'Начать настройку'}
                                {currentStep === 'category' && 'Подтвердить категорию'}
                                {currentStep === 'language' && 'Завершить настройку'}
                            </span>
                            <ArrowRight className="w-4 h-4 stroke-[3px]" />
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
};
