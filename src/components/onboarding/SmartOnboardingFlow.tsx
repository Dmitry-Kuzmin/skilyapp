import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, Globe, ArrowRight, ChevronLeft, Monitor,
    Sparkles, CheckCircle2, Car, Bike, Truck, Bus,
    Calendar, MapPin, Bell
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
import { isTelegramMiniApp } from '@/lib/telegram';

type Step = 'welcome' | 'category' | 'details' | 'language' | 'notifications';

const pageVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.07, duration: 0.3, ease: [0.25, 1, 0.5, 1] }
    })
};

const getCategoryIcon = (category: string) => {
    const cls = "w-7 h-7";
    switch (category) {
        case 'A': return <Bike className={cls} />;
        case 'C': return <Truck className={cls} />;
        case 'D': return <Bus className={cls} />;
        default: return <Car className={cls} />;
    }
};

const CATEGORY_META: Record<string, { title: string; desc: string }> = {
    'B': { title: 'CAT B', desc: 'Легковые авто\nи малые фургоны' },
    'A': { title: 'CAT A', desc: 'Мотоциклы\nи скутеры' },
    'C': { title: 'CAT C', desc: 'Грузовой\nтранспорт' },
    'D': { title: 'CAT D', desc: 'Пассажирские\nавтобусы' },
};

export const SmartOnboardingFlow: React.FC = () => {
    const { profileId } = useUserContext();
    const { setLanguage } = useLanguage();
    const { setSelectedCountry: setLandingCountry, selectedCountry } = useCountry();
    const { setSelectedCountry: setAppCountry, setSelectedCategory: setAppCategory } = usePDDContext();

    const [currentStep, setCurrentStep] = useState<Step>('welcome');
    const [direction, setDirection] = useState<1 | -1>(1);
    const [selectedCategory, setSelectedCategory] = useState<string>('B');
    const [selectedLang, setSelectedLang] = useState<string>('es');
    const [smartTranslator, setSmartTranslator] = useState<boolean>(false);
    const [examDate, setExamDate] = useState<string>('');
    const [examCity, setExamCity] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [autoDetectDone, setAutoDetectDone] = useState(false);
    const existingSettingsRef = useRef<Record<string, any>>({});

    // Init notification permission state
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
        () => typeof window !== 'undefined' && 'Notification' in window
            ? Notification.permission
            : 'granted'
    );

    // Compute steps dynamically
    const steps = useMemo((): Step[] => {
        const s: Step[] = ['welcome', 'category', 'details'];
        if (selectedCountry?.code === 'ES') s.push('language');
        const notifSupported = typeof window !== 'undefined' && 'Notification' in window;
        if (!isTelegramMiniApp() && notifSupported && notifPermission !== 'granted') {
            s.push('notifications');
        }
        return s;
    }, [selectedCountry?.code, notifPermission]);

    const currentStepIndex = steps.indexOf(currentStep);

    // Check if should show onboarding
    useEffect(() => {
        const checkStatus = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const forceOnboarding = urlParams.get('onboarding') === 'true';

            // Fast check: localStorage flags
            if (!forceOnboarding) {
                const localDone = localStorage.getItem('pdd_onboarding_completed') === 'true';
                if (localDone) {
                    setIsVisible(false);
                    return;
                }
                // Also check legacy: both country + category saved
                const savedCountry = localStorage.getItem('pdd_selected_country');
                const savedCategory = localStorage.getItem('pdd_selected_category');
                if (savedCountry && savedCategory) {
                    localStorage.setItem('pdd_onboarding_completed', 'true');
                    setIsVisible(false);
                    return;
                }
            }

            if (!profileId && !forceOnboarding) return;

            // If force mode — show with detected country, never run DB check
            if (forceOnboarding) {
                if (!autoDetectDone) {
                    const detected = detectUserCountry();
                    setLandingCountry(detected);
                    if (detected.examLanguages?.length > 0) setSelectedLang(detected.examLanguages[0]);
                    setSmartTranslator(detected.code === 'ES' && navigator.language.startsWith('ru'));
                    setIsVisible(true);
                    setAutoDetectDone(true);
                }
                return; // Never reach DB check in force mode
            }

            if (!profileId) return;

            const { data, error } = await (supabase as any)
                .from('profiles')
                .select('preferred_country, preferred_license_category, settings')
                .eq('id', profileId)
                .single();

            if (!error && data) {
                // Save existing settings for later merge
                existingSettingsRef.current = data.settings || {};

                const hasCountry = data.preferred_country;
                const hasCategory = data.settings?.license_category || data.preferred_license_category;
                const completedAt = data.settings?.onboarding_completed_at;

                if (hasCountry && (hasCategory || completedAt)) {
                    // Existing user — sync to localStorage and skip
                    localStorage.setItem('pdd_selected_country', data.preferred_country);
                    if (hasCategory) localStorage.setItem('pdd_selected_category', hasCategory);
                    localStorage.setItem('pdd_onboarding_completed', 'true');
                    setIsVisible(false);
                } else if (!autoDetectDone) {
                    const detected = detectUserCountry();
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

    const haptic = (type: 'light' | 'medium' = 'light') => {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
    };

    const goNext = () => {
        haptic('light');
        const idx = steps.indexOf(currentStep);
        if (idx < steps.length - 1) {
            setDirection(1);
            setCurrentStep(steps[idx + 1]);
        } else {
            saveOnboardingData();
        }
    };

    const goBack = () => {
        haptic('light');
        const idx = steps.indexOf(currentStep);
        if (idx > 0) {
            setDirection(-1);
            setCurrentStep(steps[idx - 1]);
        }
    };

    const handleSwitchCountry = () => {
        haptic();
        const activeCountries = COUNTRIES.filter(c => c.isActive);
        const currentIdx = activeCountries.findIndex(c => c.code === selectedCountry.code);
        const next = activeCountries[(currentIdx + 1) % activeCountries.length];
        setLandingCountry(next);
        if (next.examLanguages.length > 0) setSelectedLang(next.examLanguages[0]);
        setSelectedCategory(next.availableCategories[0] || 'B');
    };

    const requestNotifications = async () => {
        haptic('medium');
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setNotifPermission(result);
        if (result === 'granted') {
            // Auto-proceed after grant
            setTimeout(() => saveOnboardingData(), 600);
        }
    };

    const saveOnboardingData = async () => {
        setIsSaving(true);
        try {
            const countryMap: Record<string, string> = { 'ES': 'spain', 'RU': 'russia' };
            const mappedCountry = countryMap[selectedCountry.code] || 'spain';

            // Apply locally first
            setLanguage(selectedLang as Language);
            setAppCountry(mappedCountry as CountryCode);
            setAppCategory(selectedCategory);

            // Save to localStorage
            localStorage.setItem('pdd_selected_country', mappedCountry);
            localStorage.setItem('pdd_selected_category', selectedCategory);
            localStorage.setItem('app_language', selectedLang);
            localStorage.setItem('pdd_onboarding_completed', 'true');

            if (profileId) {
                // Merge with existing settings — don't wipe other user settings
                const mergedSettings = {
                    ...existingSettingsRef.current,
                    license_category: selectedCategory,
                    exam_language: selectedLang,
                    smart_translator: smartTranslator,
                    language: selectedLang,
                    onboarding_completed_at: new Date().toISOString(),
                    ...(examDate ? { exam_date: examDate } : {}),
                    ...(examCity ? { exam_city: examCity } : {}),
                };

                await (supabase as any)
                    .from('profiles')
                    .update({
                        preferred_country: mappedCountry,
                        preferred_license_category: selectedCategory,
                        settings: mergedSettings
                    })
                    .eq('id', profileId);
            }

            setIsVisible(false);
            toast.success('Готово! Начинаем подготовку 🚗');
        } catch (err) {
            console.error('[Onboarding] save failed:', err);
            setIsVisible(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isVisible || !selectedCountry) return null;

    const isLastStep = currentStepIndex === steps.length - 1;

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden">
            {/* Ambient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.07),transparent_55%)] pointer-events-none" />

            {/* ── Header ── */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-8 pb-3 shrink-0">
                <img src="/logo/skily-logo-current.svg" alt="Skily" className="h-7 w-auto" />

                {/* Progress dots */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.05]">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-500",
                                i === currentStepIndex
                                    ? "w-6 bg-blue-500"
                                    : i < currentStepIndex
                                        ? "w-1.5 bg-blue-500/40"
                                        : "w-1.5 bg-white/10"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* ── Content ── */}
            <div className="relative z-10 flex-1 overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    {/* STEP 1: Welcome / Country */}
                    {currentStep === 'welcome' && (
                        <motion.div
                            key="welcome"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                        >
                            <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="mb-5"
                            >
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5">
                                    Настройка аккаунта
                                </span>
                            </motion.div>

                            <motion.h1 custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-2 tracking-tight text-white leading-tight"
                            >
                                ВЫБЕРИ СТРАНУ
                            </motion.h1>
                            <motion.p custom={2} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-8 max-w-[240px] leading-relaxed"
                            >
                                Определяет базу вопросов и правила экзамена
                            </motion.p>

                            <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-full max-w-[280px]"
                            >
                                <div className="p-7 rounded-[2.5rem] bg-zinc-900/50 border border-white/[0.05] flex flex-col items-center gap-5">
                                    <div className="text-6xl select-none">{selectedCountry.flag}</div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white mb-1">{selectedCountry.nameRu}</div>
                                        <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em]">
                                            <Monitor className="w-2.5 h-2.5 text-blue-500" />
                                            {selectedCountry.authority} OFFICIAL
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSwitchCountry}
                                        className="text-[10px] h-8 px-5 rounded-full border border-white/10 text-zinc-400 active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Globe className="w-3 h-3" />
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
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center px-6 pt-4 pb-2"
                        >
                            <motion.h1 custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-1 text-white text-center"
                            >
                                КАТЕГОРИЯ ПРАВ
                            </motion.h1>
                            <motion.p custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-6 text-center"
                            >
                                Тип транспортного средства
                            </motion.p>

                            <motion.div custom={2} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-full max-w-xs"
                            >
                                {selectedCountry.availableCategories.length === 1 ? (
                                    // Single category — show as confirmation card
                                    <SingleCategoryCard
                                        cat={selectedCountry.availableCategories[0]}
                                        meta={CATEGORY_META[selectedCountry.availableCategories[0]]}
                                        country={selectedCountry}
                                    />
                                ) : (
                                    // Multi-category grid
                                    <div className={cn(
                                        "grid gap-3",
                                        selectedCountry.availableCategories.length === 2 ? "grid-cols-2" : "grid-cols-2"
                                    )}>
                                        {selectedCountry.availableCategories.map((cat) => {
                                            const meta = CATEGORY_META[cat] || { title: `CAT ${cat}`, desc: '' };
                                            const isSelected = selectedCategory === cat;
                                            return (
                                                <motion.button
                                                    key={cat}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => { haptic(); setSelectedCategory(cat); }}
                                                    className={cn(
                                                        "relative flex flex-col items-center justify-between p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer",
                                                        "aspect-square",
                                                        isSelected
                                                            ? "border-blue-500 bg-blue-500/[0.07] shadow-[0_20px_40px_-10px_rgba(59,130,246,0.25)]"
                                                            : "border-white/[0.06] bg-white/[0.02] active:border-white/10"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                                        isSelected ? "bg-blue-500 text-white" : "bg-white/[0.05] text-zinc-500"
                                                    )}>
                                                        {getCategoryIcon(cat)}
                                                    </div>

                                                    <div className="text-center">
                                                        <div className={cn(
                                                            "text-base font-black tracking-tight",
                                                            isSelected ? "text-white" : "text-zinc-400"
                                                        )}>
                                                            {meta.title}
                                                        </div>
                                                        <div className={cn(
                                                            "text-[10px] font-medium leading-tight mt-0.5 whitespace-pre-line",
                                                            isSelected ? "text-zinc-300" : "text-zinc-600"
                                                        )}>
                                                            {meta.desc}
                                                        </div>
                                                    </div>

                                                    <div className={cn(
                                                        "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                                                        isSelected
                                                            ? "bg-blue-500 border-blue-400 text-white"
                                                            : "border-white/10"
                                                    )}>
                                                        <Check className={cn("w-3.5 h-3.5 stroke-[3px] transition-all", isSelected ? "opacity-100" : "opacity-0")} />
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}

                    {/* STEP 3: Exam Details */}
                    {currentStep === 'details' && (
                        <motion.div
                            key="details"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center px-6 pt-4"
                        >
                            <motion.h1 custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-1 text-white text-center"
                            >
                                ДЕТАЛИ ЭКЗАМЕНА
                            </motion.h1>
                            <motion.p custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-8 text-center"
                            >
                                Поможем подготовиться к дедлайну
                            </motion.p>

                            <div className="w-full max-w-xs space-y-3">
                                <motion.div custom={2} variants={itemVariants} initial="hidden" animate="visible">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block px-1">
                                        Дата экзамена
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                        <input
                                            type="date"
                                            value={examDate}
                                            onChange={e => setExamDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className={cn(
                                                "w-full h-14 pl-11 pr-4 rounded-2xl text-sm font-medium transition-all",
                                                "bg-zinc-900/60 border text-white outline-none",
                                                "focus:border-blue-500/50 focus:bg-zinc-900",
                                                examDate ? "border-blue-500/30" : "border-white/[0.06]",
                                                "[color-scheme:dark]"
                                            )}
                                            placeholder="Выбери дату"
                                        />
                                    </div>
                                </motion.div>

                                <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block px-1">
                                        Город сдачи
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={examCity}
                                            onChange={e => setExamCity(e.target.value)}
                                            className={cn(
                                                "w-full h-14 pl-11 pr-4 rounded-2xl text-sm font-medium transition-all",
                                                "bg-zinc-900/60 border text-white placeholder:text-zinc-600 outline-none",
                                                "focus:border-blue-500/50 focus:bg-zinc-900",
                                                examCity ? "border-blue-500/30" : "border-white/[0.06]"
                                            )}
                                            placeholder="Например, Мадрид"
                                        />
                                    </div>
                                </motion.div>

                                <motion.div custom={4} variants={itemVariants} initial="hidden" animate="visible"
                                    className="pt-2"
                                >
                                    {examDate && (
                                        <ExamCountdown date={examDate} />
                                    )}
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: Language (ES only) */}
                    {currentStep === 'language' && (
                        <motion.div
                            key="language"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center px-6 pt-4"
                        >
                            <motion.h1 custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-1 text-white text-center"
                            >
                                ЯЗЫК ОБУЧЕНИЯ
                            </motion.h1>
                            <motion.p custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-8 text-center"
                            >
                                Язык экзаменационных вопросов
                            </motion.p>

                            <div className="w-full max-w-xs space-y-2">
                                {selectedCountry.examLanguages.map((lang, i) => (
                                    <motion.button
                                        key={lang}
                                        custom={i + 2}
                                        variants={itemVariants}
                                        initial="hidden" animate="visible"
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => { haptic(); setSelectedLang(lang); }}
                                        className={cn(
                                            "w-full h-16 rounded-2xl border transition-all flex items-center justify-between px-5",
                                            selectedLang === lang
                                                ? "border-blue-500/50 bg-blue-500/[0.06]"
                                                : "border-white/[0.06] bg-zinc-900/40 active:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase transition-all",
                                                selectedLang === lang ? "bg-blue-500 text-white" : "bg-white/5 text-zinc-500"
                                            )}>
                                                {lang}
                                            </div>
                                            <span className="font-bold text-sm text-zinc-100">
                                                {lang === 'es' ? 'ESPAÑOL' : lang === 'en' ? 'ENGLISH' : 'РУССКИЙ'}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                            selectedLang === lang ? "bg-blue-500 border-blue-500" : "border-white/10"
                                        )}>
                                            {selectedLang === lang && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>

                            {selectedCountry.smartTranslatorAvailable && (
                                <motion.div
                                    custom={selectedCountry.examLanguages.length + 2}
                                    variants={itemVariants}
                                    initial="hidden" animate="visible"
                                    className="w-full max-w-xs mt-5"
                                >
                                    <button
                                        onClick={() => { haptic(); setSmartTranslator(!smartTranslator); }}
                                        className={cn(
                                            "w-full p-5 rounded-2xl border transition-all flex items-center justify-between",
                                            smartTranslator
                                                ? "border-indigo-500/30 bg-indigo-500/[0.05]"
                                                : "border-white/[0.06] bg-zinc-900/40"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Sparkles className={cn("w-4 h-4 transition-colors", smartTranslator ? "text-indigo-400" : "text-zinc-600")} />
                                            <div className="text-left">
                                                <div className={cn("text-xs font-black uppercase tracking-widest", smartTranslator ? "text-indigo-400" : "text-zinc-500")}>
                                                    AI Interpreter
                                                </div>
                                                <div className="text-[11px] text-zinc-500 mt-0.5">Перевод вопросов на русский</div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-11 h-6 rounded-full transition-all relative",
                                            smartTranslator ? "bg-indigo-500" : "bg-zinc-700"
                                        )}>
                                            <div className={cn(
                                                "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm",
                                                smartTranslator ? "left-[22px]" : "left-0.5"
                                            )} />
                                        </div>
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 5: Notifications (PWA/Desktop only) */}
                    {currentStep === 'notifications' && (
                        <motion.div
                            key="notifications"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                        >
                            <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-20 h-20 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6"
                            >
                                <Bell className="w-9 h-9 text-blue-400" />
                            </motion.div>

                            <motion.h1 custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-2 text-white"
                            >
                                НАПОМИНАНИЯ
                            </motion.h1>
                            <motion.p custom={2} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-8 max-w-[240px] leading-relaxed"
                            >
                                Присылать напоминания об учёбе и новые задания каждый день
                            </motion.p>

                            <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-full max-w-xs space-y-3"
                            >
                                <button
                                    onClick={requestNotifications}
                                    className="w-full h-14 rounded-2xl bg-blue-500 text-white font-black text-[11px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xl shadow-blue-500/20"
                                >
                                    <Bell className="w-4 h-4" />
                                    Включить уведомления
                                </button>
                                <button
                                    onClick={saveOnboardingData}
                                    className="w-full h-12 text-zinc-500 text-xs font-semibold active:text-zinc-300 transition-colors"
                                >
                                    Позже
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div className="relative z-10 px-6 pb-10 pt-4 shrink-0 w-full max-w-lg mx-auto">
                <div className="flex items-center gap-3">
                    {/* Back button */}
                    <AnimatePresence>
                        {currentStepIndex > 0 && currentStep !== 'notifications' && (
                            <motion.button
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 52 }}
                                exit={{ opacity: 0, width: 0 }}
                                onClick={goBack}
                                className="h-14 w-[52px] flex items-center justify-center rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-zinc-500 active:scale-90 transition-all shrink-0"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Next / Finish button (hidden on notifications step — handled inline) */}
                    {currentStep !== 'notifications' && (
                        <button
                            onClick={goNext}
                            disabled={isSaving}
                            className={cn(
                                "flex-1 h-14 rounded-2xl flex items-center justify-center gap-2.5 font-black text-[11px] uppercase tracking-[0.15em] transition-all active:scale-[0.98]",
                                isSaving
                                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                    : "bg-white text-zinc-950 shadow-xl shadow-white/10"
                            )}
                        >
                            {isSaving ? (
                                <span>Сохранение...</span>
                            ) : (
                                <>
                                    <span>
                                        {isLastStep ? 'Завершить' :
                                            currentStep === 'welcome' ? 'Продолжить' :
                                            currentStep === 'details' && !examDate ? 'Пропустить' :
                                            'Продолжить'}
                                    </span>
                                    <ArrowRight className="w-4 h-4 stroke-[3px]" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Helper Components ──────────────────────────────────────────────

function SingleCategoryCard({ cat, meta, country }: {
    cat: string;
    meta: { title: string; desc: string };
    country: { authority: string; metadata?: { totalQuestions?: number; examDuration?: number; passingScore?: number } };
}) {
    return (
        <div className="w-full p-7 rounded-[2.5rem] bg-zinc-900/50 border border-blue-500/20 flex flex-col items-center gap-5 shadow-[0_30px_60px_-15px_rgba(59,130,246,0.15)]">
            <div className="w-20 h-20 rounded-[2rem] bg-blue-500 flex items-center justify-center shadow-xl shadow-blue-500/30">
                {getCategoryIcon(cat)}
            </div>
            <div className="text-center">
                <div className="text-2xl font-black text-white mb-1">{meta.title}</div>
                <div className="text-sm text-zinc-400 whitespace-pre-line">{meta.desc}</div>
            </div>
            {country.metadata && (
                <div className="flex gap-4 w-full">
                    {country.metadata.totalQuestions && (
                        <div className="flex-1 text-center p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                            <div className="text-lg font-black text-white">{country.metadata.totalQuestions}</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Вопросов</div>
                        </div>
                    )}
                    {country.metadata.examDuration && (
                        <div className="flex-1 text-center p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                            <div className="text-lg font-black text-white">{country.metadata.examDuration}м</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">На экзамен</div>
                        </div>
                    )}
                    {country.metadata.passingScore && (
                        <div className="flex-1 text-center p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                            <div className="text-lg font-black text-white">{country.metadata.passingScore}%</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Для сдачи</div>
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-center gap-2 text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em]">
                <Monitor className="w-2.5 h-2.5 text-blue-500" />
                {country.authority} OFFICIAL
            </div>
        </div>
    );
}

function ExamCountdown({ date }: { date: string }) {
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return null;

    const color = days <= 7 ? 'text-red-400 border-red-500/20 bg-red-500/5'
        : days <= 30 ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
        : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';

    return (
        <div className={cn("w-full p-4 rounded-2xl border flex items-center gap-3", color)}>
            <Calendar className="w-4 h-4 shrink-0" />
            <div className="text-xs font-bold">
                До экзамена {days === 0 ? 'сегодня!' : `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`}
            </div>
        </div>
    );
}
