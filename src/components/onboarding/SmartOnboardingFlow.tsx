import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    Globe,
    ShieldCheck,
    ArrowRight,
    ChevronLeft,
    Monitor,
    Languages,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountry } from '@/contexts/CountryContext';
import { useUserContext } from '@/contexts/UserContext';
import { COUNTRIES } from '@/config/countries';
import { detectUserCountry } from './utils';
import { CategoryCard } from './CategoryCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Step = 'welcome' | 'category' | 'language' | 'finish';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
    exit: { opacity: 0, scale: 0.99, transition: { duration: 0.2 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } }
};

export const SmartOnboardingFlow: React.FC = () => {
    const { profileId } = useUserContext();
    const { setSelectedCountry, selectedCountry } = useCountry();

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

            if (forceOnboarding) {
                if (!autoDetectDone) {
                    const detected = detectUserCountry();
                    setSelectedCountry(detected);
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

                if (hasCountry && hasCategory) {
                    setIsVisible(false);
                } else {
                    if (!autoDetectDone) {
                        const detected = detectUserCountry();
                        setSelectedCountry(detected);
                        const isRussian = navigator.language.startsWith('ru');
                        setSmartTranslator(detected.code === 'ES' && isRussian);
                        if (detected.examLanguages.length > 0) setSelectedLang(detected.examLanguages[0]);
                        setIsVisible(true);
                        setAutoDetectDone(true);
                    }
                }
            }
        };
        checkStatus();
    }, [profileId, setSelectedCountry, autoDetectDone]);

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
        setSelectedCountry(activeCountries[nextIdx]);
    };

    const saveOnboardingData = async () => {
        if (!profileId) return;
        setIsSaving(true);

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
                    preferred_country: selectedCountry.code,
                    preferred_license_category: selectedCategory,
                    settings: settingsUpdate
                })
                .eq('id', profileId);

            if (error) throw error;
            setIsVisible(false);
            toast.success('Настройка завершена');
        } catch (err) {
            toast.error('Ошибка сохранения');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isVisible) return null;

    const currentStepIndex = ['welcome', 'category', 'language'].indexOf(currentStep);

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center overflow-x-hidden overflow-y-auto scrollbar-none selection:bg-blue-500/30">
            {/* Minimalist Background Aura */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent_60%)] pointer-events-none" />

            {/* Top Navigation Bar */}
            <header className="relative z-[110] w-full max-w-lg px-8 py-10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo/skily-logo-current.svg"
                        alt="Skily"
                        className="h-9 w-auto opacity-100"
                    />
                </div>

                <div className="flex gap-2 p-1.5 px-3 rounded-full bg-white/[0.04] border border-white/[0.05] backdrop-blur-xl">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-700",
                                currentStepIndex === i ? "w-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "w-1.5 bg-white/10"
                            )}
                        />
                    ))}
                </div>
            </header>

            <main className="relative z-10 w-full flex-grow flex flex-col items-center px-6 pt-4 pb-20">
                <AnimatePresence mode="wait">
                    {currentStep === 'welcome' && (
                        <motion.div
                            key="welcome"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="flex flex-col items-center text-center max-w-xl"
                        >
                            <motion.div variants={itemVariants} className="mb-6">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5">
                                    Система инициализирована
                                </span>
                            </motion.div>

                            <motion.h1
                                variants={itemVariants}
                                className="text-3xl sm:text-4xl font-black mb-6 tracking-tight text-white leading-tight"
                            >
                                ЦИФРОВОЙ СТАНДАРТ <br />
                                <span className="text-zinc-500">ОБУЧЕНИЯ ПДД</span>
                            </motion.h1>

                            <motion.p variants={itemVariants} className="text-zinc-500 text-sm font-medium mb-12 max-w-[280px] leading-relaxed">
                                Персонализированная подготовка на основе официальных тестов вашего региона.
                            </motion.p>

                            <motion.div variants={itemVariants} className="w-full max-w-sm p-10 rounded-[3rem] bg-zinc-900/30 border border-white/[0.03] backdrop-blur-2xl relative shadow-2xl">
                                <div className="flex flex-col items-center gap-8">
                                    <div className="text-8xl select-none">
                                        {selectedCountry.flag}
                                    </div>

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

                    {currentStep === 'category' && (
                        <motion.div
                            key="category"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="flex flex-col items-center text-center w-full"
                        >
                            <motion.h1 variants={itemVariants} className="text-3xl font-black mb-3">
                                ВЫБЕРИТЕ <span className="text-blue-500 uppercase">КАТЕГОРИЮ</span>
                            </motion.h1>

                            <motion.p variants={itemVariants} className="text-zinc-500 text-sm font-medium mb-10 max-w-sm">
                                На платформе доступны все официальные вопросы для выбранного типа транспорта.
                            </motion.p>

                            <motion.div variants={itemVariants} className="w-full relative px-6">
                                <div className="flex justify-start sm:justify-center gap-6 overflow-x-auto py-16 scrollbar-none snap-x mask-fade-edges">
                                    {selectedCountry.availableCategories.map((cat) => (
                                        <div key={cat} className="snap-center">
                                            <CategoryCard
                                                category={cat}
                                                isSelected={selectedCategory === cat}
                                                title={cat === 'B' ? "TURISMO" : cat === 'A' ? "MOTO" : cat === 'C' ? "TRUCK" : "BUS"}
                                                description={
                                                    cat === 'B' ? "Легковые автомобили и малые фургоны." :
                                                        cat === 'A' ? "Мотоциклы, скутеры и трициклы." :
                                                            cat === 'C' ? "Грузовой транспорт от 3.5т." : "Пассажирские автобусы."
                                                }
                                                onClick={() => {
                                                    if (selectedCountry.availableCategories.length > 1) {
                                                        setSelectedCategory(cat);
                                                    }
                                                }}
                                                isDisabled={selectedCountry.availableCategories.length === 1 && selectedCategory !== cat}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {currentStep === 'language' && (
                        <motion.div
                            key="language"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-col items-center text-center w-full max-w-md"
                        >
                            <motion.h1 variants={itemVariants} className="text-3xl font-black mb-3">
                                <span className="text-blue-500 uppercase">ЯЗЫК</span> ОБУЧЕНИЯ
                            </motion.h1>

                            <motion.p variants={itemVariants} className="text-zinc-500 text-sm font-medium mb-12">
                                Выберите язык интерфейса и вопросов
                            </motion.p>

                            <div className="w-full space-y-3 mb-12">
                                {selectedCountry.examLanguages.map((lang) => (
                                    <motion.button
                                        key={lang}
                                        variants={itemVariants}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedLang(lang)}
                                        className={cn(
                                            "w-full p-6 rounded-[2rem] bg-zinc-900/40 border transition-all duration-300 flex items-center justify-between",
                                            selectedLang === lang
                                                ? "border-blue-500/50 bg-blue-500/5"
                                                : "border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black uppercase transition-all",
                                                selectedLang === lang ? "bg-blue-500 text-white" : "bg-white/5 text-zinc-500"
                                            )}>
                                                {lang}
                                            </div>
                                            <div className="text-left font-bold text-zinc-100">
                                                {lang === 'es' ? "ESPAÑOL" : lang === 'en' ? "ENGLISH" : "РУССКИЙ"}
                                            </div>
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
                                    className="w-full p-8 rounded-[3rem] bg-indigo-500/[0.03] border border-indigo-500/20 backdrop-blur-xl relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">AI Interpreter</h3>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed text-left mb-8">
                                        Система будет автоматически переводить экзаменационные вопросы на русский язык в реальном времени.
                                    </p>
                                    <button
                                        onClick={() => setSmartTranslator(!smartTranslator)}
                                        className={cn(
                                            "w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] transition-all duration-300 uppercase tracking-widest",
                                            smartTranslator
                                                ? "bg-indigo-500 text-white shadow-xl shadow-indigo-500/20"
                                                : "bg-white/5 text-zinc-500"
                                        )}
                                    >
                                        {smartTranslator ? "Active" : "Disabled"}
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Primary Action */}
            <footer className="relative z-[110] w-full max-w-sm px-8 pb-16 flex items-center gap-4 shrink-0">
                <AnimatePresence>
                    {currentStepIndex > 0 && (
                        <motion.button
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 56 }}
                            exit={{ opacity: 0, width: 0 }}
                            onClick={handleBack}
                            className="h-14 aspect-square flex items-center justify-center rounded-2xl bg-zinc-900/50 border border-white/5 text-zinc-500 active:scale-90 transition-all"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </motion.button>
                    )}
                </AnimatePresence>

                <button
                    disabled={isSaving}
                    onClick={handleNext}
                    className={cn(
                        "flex-1 h-16 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em] transition-all",
                        isSaving
                            ? "bg-zinc-800 text-zinc-600"
                            : "bg-white text-zinc-950 shadow-2xl active:scale-[0.98]"
                    )}
                >
                    {isSaving ? "Загрузка..." : (
                        <>
                            <span>
                                {currentStep === 'welcome' && "Начать обучение"}
                                {currentStep === 'category' && "Подтвердить категорию"}
                                {currentStep === 'language' && "Завершить настройку"}
                            </span>
                            <ArrowRight className="w-4 h-4 stroke-[3px]" />
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
};
