import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, Globe, ArrowRight, ChevronLeft, Monitor,
    Car, Bike, Truck, Bus, Bell,
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

type Step = 'language' | 'country' | 'category' | 'notifications';

// ── UI text (bootstrapped here — not via useLanguage since language isn't set yet) ─
const OB_TEXT = {
    es: {
        langTitle: '¡HOLA!',
        langSubtitle: '¿En qué idioma quieres estudiar?',
        expatTitle: 'MODO EXPAT ACTIVADO',
        expatFeatures: [
            'Duelos PvP con jugadores rusohablantes',
            'Curso "Términos DGT" en ruso',
            'Traducción de preguntas en los tests',
        ],
        countryTitle: 'TU PAÍS',
        countryDesc: 'Define el banco de preguntas y las reglas del examen',
        changeCountry: 'Cambiar',
        categoryTitle: 'CATEGORÍA',
        categoryDesc: 'Tipo de vehículo',
        notifTitle: 'RECORDATORIOS',
        notifDesc: 'Recibe recordatorios diarios de estudio',
        enableNotif: 'Activar notificaciones',
        later: 'Ahora no',
        saving: 'Guardando...',
        next: 'Continuar',
        finish: 'Empezar',
        done: '¡Todo listo! Empecemos 🚗',
        questions: 'Preguntas',
        duration: 'Duración',
        passing: 'Aprobado',
    },
    ru: {
        langTitle: 'ПРИВЕТ!',
        langSubtitle: 'На каком языке хочешь учиться?',
        expatTitle: 'РЕЖИМ ЭКСПАТА',
        expatFeatures: [
            'PvP дуэли с русскими игроками',
            'Курс «Термины DGT» на русском',
            'Перевод вопросов прямо в тестах',
        ],
        countryTitle: 'ТВОЯ СТРАНА',
        countryDesc: 'Определяет базу вопросов и правила экзамена',
        changeCountry: 'Сменить',
        categoryTitle: 'КАТЕГОРИЯ ПРАВ',
        categoryDesc: 'Тип транспортного средства',
        notifTitle: 'НАПОМИНАНИЯ',
        notifDesc: 'Ежедневные напоминания об учёбе',
        enableNotif: 'Включить уведомления',
        later: 'Позже',
        saving: 'Сохранение...',
        next: 'Продолжить',
        finish: 'Начать',
        done: 'Готово! Начинаем подготовку 🚗',
        questions: 'Вопросов',
        duration: 'На экзамен',
        passing: 'Для сдачи',
    },
    en: {
        langTitle: 'HELLO!',
        langSubtitle: 'What language do you want to study in?',
        expatTitle: 'EXPAT MODE ON',
        expatFeatures: [
            'PvP duels with Russian-speaking players',
            'DGT Terms course in Russian',
            'Question translations inside tests',
        ],
        countryTitle: 'YOUR COUNTRY',
        countryDesc: 'Determines question bank and exam rules',
        changeCountry: 'Change',
        categoryTitle: 'LICENSE CATEGORY',
        categoryDesc: 'Type of vehicle',
        notifTitle: 'REMINDERS',
        notifDesc: 'Daily study reminders',
        enableNotif: 'Enable notifications',
        later: 'Later',
        saving: 'Saving...',
        next: 'Continue',
        finish: 'Get started',
        done: "All set! Let's go 🚗",
        questions: 'Questions',
        duration: 'Duration',
        passing: 'To pass',
    },
} as const;
type OBLang = keyof typeof OB_TEXT;

const LANG_OPTIONS: { code: OBLang; flag: string; label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'ru', flag: '🇷🇺', label: 'Русский' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
];

const EXPAT_ICONS = ['🎮', '📚', '🔤'];

// ── Category metadata ────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<OBLang, Record<string, { title: string; desc: string }>> = {
    es: {
        B: { title: 'CAT B', desc: 'Turismos y\nfurgonetas pequeñas' },
        A: { title: 'CAT A', desc: 'Motos\ny scooters' },
        C: { title: 'CAT C', desc: 'Transporte\nde mercancías' },
        D: { title: 'CAT D', desc: 'Autobuses\nde pasajeros' },
    },
    en: {
        B: { title: 'CAT B', desc: 'Cars &\nsmall vans' },
        A: { title: 'CAT A', desc: 'Motorcycles\n& scooters' },
        C: { title: 'CAT C', desc: 'Goods\ntransport' },
        D: { title: 'CAT D', desc: 'Passenger\nbuses' },
    },
    ru: {
        B: { title: 'CAT B', desc: 'Легковые авто\nи малые фургоны' },
        A: { title: 'CAT A', desc: 'Мотоциклы\nи скутеры' },
        C: { title: 'CAT C', desc: 'Грузовой\nтранспорт' },
        D: { title: 'CAT D', desc: 'Пассажирские\nавтобусы' },
    },
};

const getCategoryMeta = (lang: string, cat: string) => {
    const l = (lang in CATEGORY_LABELS ? lang : 'es') as OBLang;
    return CATEGORY_LABELS[l][cat] || { title: `CAT ${cat}`, desc: '' };
};

const getCategoryIcon = (category: string) => {
    const cls = 'w-7 h-7';
    switch (category) {
        case 'A': return <Bike className={cls} />;
        case 'C': return <Truck className={cls} />;
        case 'D': return <Bus className={cls} />;
        default:  return <Car className={cls} />;
    }
};

const detectInitialLang = (): OBLang => {
    if (typeof navigator === 'undefined') return 'es';
    const lang = navigator.language?.split('-')[0]?.toLowerCase();
    if (lang === 'ru') return 'ru';
    if (lang === 'en') return 'en';
    return 'es';
};

// ── Animation variants ───────────────────────────────────────────────────────
const pageVariants = {
    enter:  { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] } },
    exit:   { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.07, duration: 0.3, ease: [0.25, 1, 0.5, 1] },
    }),
};

// ── Main component ───────────────────────────────────────────────────────────
export const SmartOnboardingFlow: React.FC = () => {
    const { profileId } = useUserContext();
    const { setLanguage } = useLanguage();
    const { setSelectedCountry: setLandingCountry, selectedCountry } = useCountry();
    const { setSelectedCountry: setAppCountry, setSelectedCategory: setAppCategory } = usePDDContext();

    const [currentStep, setCurrentStep] = useState<Step>('language');
    const [direction, setDirection] = useState<1 | -1>(1);
    const [selectedLang, setSelectedLang] = useState<OBLang>(detectInitialLang());
    const [selectedCategory, setSelectedCategory] = useState<string>('B');
    const [isSaving, setIsSaving] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [autoDetectDone, setAutoDetectDone] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
        () => typeof window !== 'undefined' && 'Notification' in window
            ? Notification.permission
            : 'granted',
    );
    const existingSettingsRef = useRef<Record<string, any>>({});

    const ui = OB_TEXT[selectedLang];

    const steps: Step[] = ['language', 'country', 'category'];
    if (!isTelegramMiniApp() && typeof window !== 'undefined' && 'Notification' in window && notifPermission !== 'granted') {
        steps.push('notifications');
    }
    const currentStepIndex = steps.indexOf(currentStep);
    const isLastStep = currentStepIndex === steps.length - 1;

    // ── Show/hide logic ──────────────────────────────────────────────────────
    useEffect(() => {
        const checkStatus = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const forceOnboarding = urlParams.get('onboarding') === 'true';

            if (!forceOnboarding) {
                const localDone = localStorage.getItem('pdd_onboarding_completed') === 'true';
                if (localDone) { setIsVisible(false); return; }
            }

            if (!profileId && !forceOnboarding) return;

            if (forceOnboarding) {
                if (!autoDetectDone) {
                    const detected = await detectUserCountry();
                    setLandingCountry(detected);
                    setSelectedCategory(detected.availableCategories[0] || 'B');
                    setIsVisible(true);
                    setAutoDetectDone(true);
                }
                return;
            }

            if (!profileId) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('preferred_country, preferred_license_category, settings')
                .eq('id', profileId)
                .single();

            if (!error && data) {
                existingSettingsRef.current = data.settings || {};

                // BUG FIX: do NOT use data.preferred_license_category here —
                // it has DB default 'B' so every new user already has it set,
                // which caused onboarding to be silently skipped for all new users.
                // Only trust the explicit completion flag or settings.license_category
                // (which is written during onboarding saveOnboardingData).
                const completedAt = data.settings?.onboarding_completed_at;
                const licenseFromSettings = data.settings?.license_category;

                if (completedAt || licenseFromSettings) {
                    localStorage.setItem('pdd_selected_country', data.preferred_country ?? 'spain');
                    if (data.preferred_license_category) {
                        localStorage.setItem('pdd_selected_category', data.preferred_license_category);
                    }
                    localStorage.setItem('pdd_onboarding_completed', 'true');
                    setIsVisible(false);
                } else if (!autoDetectDone) {
                    const detected = await detectUserCountry();
                    setLandingCountry(detected);
                    setSelectedCategory(detected.availableCategories[0] || 'B');
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
        const currentIdx = activeCountries.findIndex(c => c.code === selectedCountry?.code);
        const next = activeCountries[(currentIdx + 1) % activeCountries.length];
        setLandingCountry(next);
        setSelectedCategory(next.availableCategories[0] || 'B');
    };

    const requestNotifications = async () => {
        haptic('medium');
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setNotifPermission(result);
        if (result === 'granted') {
            setTimeout(() => saveOnboardingData(), 600);
        }
    };

    const saveOnboardingData = async () => {
        setIsSaving(true);
        try {
            const countryMap: Record<string, string> = { ES: 'spain', RU: 'russia' };
            const mappedCountry = selectedCountry ? (countryMap[selectedCountry.code] || 'spain') : 'spain';

            setLanguage(selectedLang as Language);
            setAppCountry(mappedCountry as CountryCode);
            setAppCategory(selectedCategory);

            localStorage.setItem('pdd_selected_country', mappedCountry);
            localStorage.setItem('pdd_selected_category', selectedCategory);
            localStorage.setItem('app_language', selectedLang);
            localStorage.setItem('pdd_onboarding_completed', 'true');

            if (profileId) {
                const mergedSettings = {
                    ...existingSettingsRef.current,
                    license_category: selectedCategory,
                    exam_language: selectedLang,
                    smart_translator: selectedLang === 'ru',
                    language: selectedLang,
                    onboarding_completed_at: new Date().toISOString(),
                };
                await supabase
                    .from('profiles')
                    .update({
                        preferred_country: mappedCountry,
                        preferred_license_category: selectedCategory,
                        settings: mergedSettings,
                    })
                    .eq('id', profileId);
            }

            setIsVisible(false);
            toast.success(ui.done);
        } catch (err) {
            console.error('[Onboarding] save failed:', err);
            setIsVisible(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isVisible || !selectedCountry) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.07),transparent_55%)] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-8 pb-3 shrink-0">
                <img src="/logo/skily-logo-current.svg" alt="Skily" className="h-7 w-auto" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.05]">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                'h-1.5 rounded-full transition-all duration-500',
                                i === currentStepIndex ? 'w-6 bg-blue-500'
                                    : i < currentStepIndex ? 'w-1.5 bg-blue-500/40'
                                    : 'w-1.5 bg-white/10',
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>

                    {/* ── STEP 1: Language ── */}
                    {currentStep === 'language' && (
                        <motion.div
                            key="language"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center px-6 pt-6 pb-4 overflow-y-auto"
                        >
                            <motion.h1
                                custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-1 text-white text-center"
                            >
                                {ui.langTitle}
                            </motion.h1>
                            <motion.p
                                custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-6 text-center"
                            >
                                {ui.langSubtitle}
                            </motion.p>

                            <div className="w-full max-w-xs space-y-2.5">
                                {LANG_OPTIONS.map((opt, i) => {
                                    const isSelected = selectedLang === opt.code;
                                    return (
                                        <motion.div
                                            key={opt.code}
                                            custom={i + 2} variants={itemVariants} initial="hidden" animate="visible"
                                        >
                                            <motion.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => { haptic(); setSelectedLang(opt.code); }}
                                                className={cn(
                                                    'w-full h-16 rounded-2xl border transition-all flex items-center justify-between px-5',
                                                    isSelected
                                                        ? 'border-blue-500/50 bg-blue-500/[0.06]'
                                                        : 'border-white/[0.06] bg-zinc-900/40 active:border-white/10',
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="text-2xl">{opt.flag}</span>
                                                    <span className="font-bold text-sm text-zinc-100">{opt.label}</span>
                                                </div>
                                                <div className={cn(
                                                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                                                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/10',
                                                )}>
                                                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                                                </div>
                                            </motion.button>

                                            {/* RU expat unlock block */}
                                            <AnimatePresence>
                                                {isSelected && opt.code === 'ru' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06] p-4">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                                                    <Check className="w-3 h-3 text-white stroke-[3px]" />
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                                                                    {ui.expatTitle}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {ui.expatFeatures.map((feat, fi) => (
                                                                    <div key={fi} className="flex items-center gap-2.5 text-zinc-300 text-xs">
                                                                        <span className="text-base shrink-0">{EXPAT_ICONS[fi]}</span>
                                                                        <span>{feat}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 2: Country ── */}
                    {currentStep === 'country' && (
                        <motion.div
                            key="country"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                        >
                            <motion.h1
                                custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-2 tracking-tight text-white"
                            >
                                {ui.countryTitle}
                            </motion.h1>
                            <motion.p
                                custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-8 max-w-[240px] leading-relaxed"
                            >
                                {ui.countryDesc}
                            </motion.p>

                            <motion.div
                                custom={2} variants={itemVariants} initial="hidden" animate="visible"
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
                                        {ui.changeCountry}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ── STEP 3: Category ── */}
                    {currentStep === 'category' && (
                        <motion.div
                            key="category"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center px-6 pt-4 pb-2"
                        >
                            <motion.h1
                                custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-1 text-white text-center"
                            >
                                {ui.categoryTitle}
                            </motion.h1>
                            <motion.p
                                custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-6 text-center"
                            >
                                {ui.categoryDesc}
                            </motion.p>

                            <motion.div
                                custom={2} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-full max-w-xs"
                            >
                                {selectedCountry.availableCategories.length === 1 ? (
                                    <SingleCategoryCard
                                        cat={selectedCountry.availableCategories[0]}
                                        meta={getCategoryMeta(selectedLang, selectedCountry.availableCategories[0])}
                                        country={selectedCountry}
                                        ui={ui}
                                    />
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedCountry.availableCategories.map((cat) => {
                                            const meta = getCategoryMeta(selectedLang, cat);
                                            const isSelected = selectedCategory === cat;
                                            return (
                                                <motion.button
                                                    key={cat}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => { haptic(); setSelectedCategory(cat); }}
                                                    className={cn(
                                                        'relative flex flex-col items-center justify-between p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer aspect-square',
                                                        isSelected
                                                            ? 'border-blue-500 bg-blue-500/[0.07] shadow-[0_20px_40px_-10px_rgba(59,130,246,0.25)]'
                                                            : 'border-white/[0.06] bg-white/[0.02] active:border-white/10',
                                                    )}
                                                >
                                                    <div className={cn(
                                                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-all',
                                                        isSelected ? 'bg-blue-500 text-white' : 'bg-white/[0.05] text-zinc-500',
                                                    )}>
                                                        {getCategoryIcon(cat)}
                                                    </div>
                                                    <div className="text-center">
                                                        <div className={cn('text-base font-black tracking-tight', isSelected ? 'text-white' : 'text-zinc-400')}>
                                                            {meta.title}
                                                        </div>
                                                        <div className={cn('text-[10px] font-medium leading-tight mt-0.5 whitespace-pre-line', isSelected ? 'text-zinc-300' : 'text-zinc-600')}>
                                                            {meta.desc}
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
                                                        isSelected ? 'bg-blue-500 border-blue-400 text-white' : 'border-white/10',
                                                    )}>
                                                        <Check className={cn('w-3.5 h-3.5 stroke-[3px] transition-all', isSelected ? 'opacity-100' : 'opacity-0')} />
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ── STEP 4: Notifications ── */}
                    {currentStep === 'notifications' && (
                        <motion.div
                            key="notifications"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                        >
                            <motion.div
                                custom={0} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-20 h-20 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6"
                            >
                                <Bell className="w-9 h-9 text-blue-400" />
                            </motion.div>
                            <motion.h1
                                custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-2xl font-black mb-2 text-white"
                            >
                                {ui.notifTitle}
                            </motion.h1>
                            <motion.p
                                custom={2} variants={itemVariants} initial="hidden" animate="visible"
                                className="text-zinc-500 text-sm mb-8 max-w-[240px] leading-relaxed"
                            >
                                {ui.notifDesc}
                            </motion.p>
                            <motion.div
                                custom={3} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-full max-w-xs space-y-3"
                            >
                                <button
                                    onClick={requestNotifications}
                                    className="w-full h-14 rounded-2xl bg-blue-500 text-white font-black text-[11px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20"
                                >
                                    <Bell className="w-4 h-4" />
                                    {ui.enableNotif}
                                </button>
                                <button
                                    onClick={saveOnboardingData}
                                    className="w-full h-12 text-zinc-500 text-xs font-semibold active:text-zinc-300 transition-colors"
                                >
                                    {ui.later}
                                </button>
                            </motion.div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="relative z-10 px-6 pb-10 pt-4 shrink-0 w-full max-w-lg mx-auto">
                <div className="flex items-center gap-3">
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

                    {currentStep !== 'notifications' && (
                        <button
                            onClick={goNext}
                            disabled={isSaving}
                            className={cn(
                                'flex-1 h-14 rounded-2xl flex items-center justify-center gap-2.5 font-black text-[11px] uppercase tracking-[0.15em] transition-all active:scale-[0.98]',
                                isSaving
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-white text-zinc-950 shadow-xl shadow-white/10',
                            )}
                        >
                            {isSaving ? (
                                <span>{ui.saving}</span>
                            ) : (
                                <>
                                    <span>{isLastStep ? ui.finish : ui.next}</span>
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

// ── Helper component ─────────────────────────────────────────────────────────
function SingleCategoryCard({ cat, meta, country, ui }: {
    cat: string;
    meta: { title: string; desc: string };
    country: { authority: string; metadata?: { totalQuestions?: number; examDuration?: number; passingScore?: number } };
    ui: typeof OB_TEXT[OBLang];
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
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{ui.questions}</div>
                        </div>
                    )}
                    {country.metadata.examDuration && (
                        <div className="flex-1 text-center p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                            <div className="text-lg font-black text-white">{country.metadata.examDuration}m</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{ui.duration}</div>
                        </div>
                    )}
                    {country.metadata.passingScore && (
                        <div className="flex-1 text-center p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                            <div className="text-lg font-black text-white">{country.metadata.passingScore}%</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{ui.passing}</div>
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
