import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, Globe, ArrowRight, ChevronLeft, Monitor,
    Car, Bike, Truck, Bus, Bell,
    Languages, GraduationCap, Sparkles,
    Brain, Swords, ClipboardList, BookOpen,
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
        langLabel: 'Idioma',
        langTitle: 'Elige el idioma',
        langSubtitle: 'De tu elección dependen las funciones disponibles. Puedes cambiarlo después en ajustes',
        expatTitle: 'Disponible en ruso',
        expatFeatures: [
            'Traducción de preguntas en los tests',
            'Curso «Términos DGT» en ruso',
            'Modos y juegos especiales',
        ],
        countryLabel: 'País',
        countryTitle: 'Tu país',
        countryDesc: 'Define el banco de preguntas y las reglas del examen',
        changeCountry: 'Cambiar',
        categoryLabel: 'Categoría',
        categoryTitle: 'Categoría de carné',
        categoryDesc: 'Tipo de vehículo',
        notifTitle: 'Recordatorios',
        notifDesc: 'Recibe recordatorios diarios de estudio',
        enableNotif: 'Activar notificaciones',
        later: 'Ahora no',
        saving: 'Guardando...',
        next: 'Continuar',
        finish: 'Empezar',
        skip: 'Omitir',
        done: '¡Todo listo!',
        questions: 'Preguntas',
        duration: 'Duración',
        passing: 'Aprobado',
    },
    ru: {
        langLabel: 'Язык',
        langTitle: 'Выбери язык',
        langSubtitle: 'От выбора зависят возможности приложения. Поменять можно позже в настройках',
        expatTitle: 'Доступно на русском',
        expatFeatures: [
            'Перевод вопросов прямо в тестах',
            'Курс «Термины DGT» на русском',
            'Специальные режимы и игры',
        ],
        countryLabel: 'Страна',
        countryTitle: 'Твоя страна',
        countryDesc: 'Определяет базу вопросов и правила экзамена',
        changeCountry: 'Сменить',
        categoryLabel: 'Категория',
        categoryTitle: 'Категория прав',
        categoryDesc: 'Тип транспортного средства',
        notifTitle: 'Напоминания',
        notifDesc: 'Ежедневные напоминания об учёбе',
        enableNotif: 'Включить уведомления',
        later: 'Позже',
        saving: 'Сохранение...',
        next: 'Продолжить',
        finish: 'Начать',
        skip: 'Пропустить',
        done: 'Готово!',
        questions: 'Вопросов',
        duration: 'На экзамен',
        passing: 'Для сдачи',
    },
    en: {
        langLabel: 'Language',
        langTitle: 'Choose language',
        langSubtitle: 'Your choice unlocks app features. You can change it later in settings',
        expatTitle: 'Available in Russian',
        expatFeatures: [
            'Question translations in tests',
            'DGT Terms course in Russian',
            'Special modes and games',
        ],
        countryLabel: 'Country',
        countryTitle: 'Your country',
        countryDesc: 'Determines question bank and exam rules',
        changeCountry: 'Change',
        categoryLabel: 'Category',
        categoryTitle: 'License category',
        categoryDesc: 'Type of vehicle',
        notifTitle: 'Reminders',
        notifDesc: 'Daily study reminders',
        enableNotif: 'Enable notifications',
        later: 'Later',
        saving: 'Saving...',
        next: 'Continue',
        finish: 'Get started',
        skip: 'Skip',
        done: 'All set!',
        questions: 'Questions',
        duration: 'Duration',
        passing: 'To pass',
    },
} as const;
type OBLang = keyof typeof OB_TEXT;

const LANG_OPTIONS: { code: OBLang; badge: string; label: string }[] = [
    { code: 'es', badge: 'ES', label: 'Español' },
    { code: 'ru', badge: 'РУ', label: 'Русский' },
    { code: 'en', badge: 'EN', label: 'English' },
];

const EXPAT_FEATURE_ICONS = [Languages, GraduationCap, Sparkles];

// ── Feature tour ─────────────────────────────────────────────────────────────
type TourSlideData = {
    iconBg: string;
    glow: string;
    Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    desc: string;
};

const TOUR_SLIDES_DATA: Record<OBLang, TourSlideData[]> = {
    es: [
        {
            iconBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            glow: 'rgba(139,92,246,0.18)',
            Icon: Brain,
            title: 'Tu tutor con IA',
            desc: 'Explica cualquier pregunta, señal o norma. Chatea cuando quieras y recibe respuestas con imágenes.',
        },
        {
            iconBg: 'linear-gradient(135deg, #f97316, #d97706)',
            glow: 'rgba(249,115,22,0.15)',
            Icon: Swords,
            title: 'Duelos en tiempo real',
            desc: 'Reta a otros estudiantes en vivo. Gana monedas, sube posiciones y domina el ranking.',
        },
        {
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            glow: 'rgba(16,185,129,0.15)',
            Icon: ClipboardList,
            title: 'Tests oficiales DGT',
            desc: '800+ preguntas con explicaciones detalladas. Modo examen y análisis completo de tus errores.',
        },
        {
            iconBg: 'linear-gradient(135deg, #f43f5e, #be123c)',
            glow: 'rgba(244,63,94,0.15)',
            Icon: BookOpen,
            title: 'Señales y fichas',
            desc: 'Aprende señales con tarjetas interactivas. Rápido, visual e ideal para repasar en cualquier momento.',
        },
    ],
    ru: [
        {
            iconBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            glow: 'rgba(139,92,246,0.18)',
            Icon: Brain,
            title: 'AI-наставник',
            desc: 'Объясняет любой вопрос, знак и правило. Отвечает в чате с картинками и примерами.',
        },
        {
            iconBg: 'linear-gradient(135deg, #f97316, #d97706)',
            glow: 'rgba(249,115,22,0.15)',
            Icon: Swords,
            title: 'Дуэли вживую',
            desc: 'Соревнуйся с учениками в реальном времени. Зарабатывай монеты и попадай в топ рейтинга.',
        },
        {
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            glow: 'rgba(16,185,129,0.15)',
            Icon: ClipboardList,
            title: 'Тесты DGT',
            desc: '800+ вопросов с подробными объяснениями. Режим экзамена и детальный анализ ошибок.',
        },
        {
            iconBg: 'linear-gradient(135deg, #f43f5e, #be123c)',
            glow: 'rgba(244,63,94,0.15)',
            Icon: BookOpen,
            title: 'Знаки и флэшкарты',
            desc: 'Учи дорожные знаки с интерактивными карточками. Быстро, наглядно и в любом месте.',
        },
    ],
    en: [
        {
            iconBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            glow: 'rgba(139,92,246,0.18)',
            Icon: Brain,
            title: 'AI Tutor',
            desc: 'Explains any question, sign, or rule. Chat anytime and get answers with images and examples.',
        },
        {
            iconBg: 'linear-gradient(135deg, #f97316, #d97706)',
            glow: 'rgba(249,115,22,0.15)',
            Icon: Swords,
            title: 'Live Duels',
            desc: 'Compete with real students in real time. Earn coins and climb the global ranking.',
        },
        {
            iconBg: 'linear-gradient(135deg, #10b981, #059669)',
            glow: 'rgba(16,185,129,0.15)',
            Icon: ClipboardList,
            title: 'Official DGT Tests',
            desc: '800+ questions with detailed explanations. Exam mode and full error analysis.',
        },
        {
            iconBg: 'linear-gradient(135deg, #f43f5e, #be123c)',
            glow: 'rgba(244,63,94,0.15)',
            Icon: BookOpen,
            title: 'Signs & Flashcards',
            desc: 'Learn road signs with interactive cards. Fast, visual, and perfect for revision anywhere.',
        },
    ],
};

const TOUR_UI_TEXT: Record<OBLang, { skip: string; next: string; getStarted: string }> = {
    es: { skip: 'Omitir', next: 'Siguiente', getStarted: '¡Empezar!' },
    ru: { skip: 'Пропустить', next: 'Далее', getStarted: 'Поехали!' },
    en: { skip: 'Skip', next: 'Next', getStarted: "Let's go!" },
};

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
    const [showTour, setShowTour] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [tourDirection, setTourDirection] = useState<1 | -1>(1);
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

    const skipOnboarding = () => {
        haptic('light');
        // Save with auto-detected defaults so we never show this again
        saveOnboardingData();
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

            setShowTour(true);
            toast.success(ui.done);
        } catch (err) {
            console.error('[Onboarding] save failed:', err);
            setIsVisible(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isVisible || !selectedCountry) return null;

    // ── Feature tour (shown after config steps) ─────────────────────────────
    if (showTour) {
        const slides = TOUR_SLIDES_DATA[selectedLang];
        const tourUi = TOUR_UI_TEXT[selectedLang];
        const slide = slides[tourStep];
        const isLastTourSlide = tourStep === slides.length - 1;

        const nextTourSlide = () => {
            if (isLastTourSlide) {
                setIsVisible(false);
            } else {
                setTourDirection(1);
                setTourStep(s => s + 1);
            }
        };
        const prevTourSlide = () => {
            if (tourStep > 0) {
                setTourDirection(-1);
                setTourStep(s => s - 1);
            }
        };

        return (
            <div
                className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px))' }}
            >
                {/* Dynamic background glow — changes with slide */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={tourStep}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(ellipse at 50% 25%, ${slide.glow}, transparent 60%)`,
                        }}
                    />
                </AnimatePresence>

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 pt-6 pb-3 shrink-0 w-full max-w-md mx-auto">
                    <img src="/logo/skily-logo-current.svg" alt="Skily" className="h-9 w-auto" />
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        {tourUi.skip}
                    </button>
                </div>

                {/* Slide content */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto overflow-hidden px-8">
                    <AnimatePresence mode="wait" custom={tourDirection}>
                        <motion.div
                            key={tourStep}
                            custom={tourDirection}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.25}
                            onDragEnd={(_, info) => {
                                if (info.offset.x < -60 && !isLastTourSlide) nextTourSlide();
                                else if (info.offset.x > 60 && tourStep > 0) prevTourSlide();
                            }}
                            className="w-full flex flex-col items-center text-center select-none"
                            style={{ cursor: 'grab' }}
                        >
                            {/* Icon block */}
                            <motion.div
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.05, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                                className="w-[120px] h-[120px] rounded-[32px] flex items-center justify-center mb-9 shadow-2xl"
                                style={{ background: slide.iconBg }}
                            >
                                <slide.Icon className="w-[52px] h-[52px] text-white" strokeWidth={1.5} />
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.35 }}
                                className="text-[26px] font-bold text-white tracking-tight leading-tight mb-3"
                            >
                                {slide.title}
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.35 }}
                                className="text-zinc-400 text-[15px] leading-relaxed max-w-[280px]"
                            >
                                {slide.desc}
                            </motion.p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div
                    className="relative z-10 px-6 sm:px-8 pt-3 shrink-0 w-full max-w-md mx-auto"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}
                >
                    {/* Progress dots */}
                    <div className="flex justify-center gap-2 mb-5">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setTourDirection(i > tourStep ? 1 : -1);
                                    setTourStep(i);
                                }}
                                className={cn(
                                    'h-1.5 rounded-full transition-all duration-500',
                                    i === tourStep ? 'w-7 bg-white' : 'w-2 bg-white/20 hover:bg-white/35',
                                )}
                            />
                        ))}
                    </div>

                    <button
                        onClick={nextTourSlide}
                        className="w-full h-13 py-3.5 rounded-2xl bg-white text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                        <span>{isLastTourSlide ? tourUi.getStarted : tourUi.next}</span>
                        {!isLastTourSlide && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden"
            style={{
                paddingTop: 'max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px))',
            }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.06),transparent_55%)] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 pt-6 pb-3 shrink-0 w-full max-w-md mx-auto">
                <img src="/logo/skily-logo-current.svg" alt="Skily" className="h-9 w-auto" />
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    'h-1 rounded-full transition-all duration-500',
                                    i === currentStepIndex ? 'w-5 bg-white'
                                        : i < currentStepIndex ? 'w-1 bg-white/50'
                                        : 'w-1 bg-white/15',
                                )}
                            />
                        ))}
                    </div>
                    {currentStep !== 'notifications' && !isSaving && (
                        <button
                            onClick={skipOnboarding}
                            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 active:text-zinc-300 transition-colors"
                        >
                            {ui.skip}
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-hidden w-full max-w-md mx-auto">
                <AnimatePresence mode="wait" custom={direction}>

                    {/* ── STEP 1: Language ── */}
                    {currentStep === 'language' && (
                        <motion.div
                            key="language"
                            custom={direction}
                            variants={pageVariants}
                            initial="enter" animate="center" exit="exit"
                            className="absolute inset-0 flex flex-col px-6 sm:px-8 pt-8 pb-4 overflow-y-auto"
                        >
                            <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible">
                                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 mb-2">
                                    {ui.langLabel}
                                </div>
                                <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight mb-1.5">
                                    {ui.langTitle}
                                </h1>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    {ui.langSubtitle}
                                </p>
                            </motion.div>

                            <div className="w-full space-y-2 mt-8">
                                {LANG_OPTIONS.map((opt, i) => {
                                    const isSelected = selectedLang === opt.code;
                                    return (
                                        <motion.div
                                            key={opt.code}
                                            custom={i + 1} variants={itemVariants} initial="hidden" animate="visible"
                                        >
                                            <motion.button
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => { haptic(); setSelectedLang(opt.code); }}
                                                className={cn(
                                                    'w-full h-[60px] rounded-2xl border transition-all flex items-center justify-between px-4',
                                                    isSelected
                                                        ? 'border-white/20 bg-white/[0.04]'
                                                        : 'border-white/[0.06] bg-white/[0.015] hover:border-white/10 active:border-white/10',
                                                )}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={cn(
                                                        'w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold tracking-wider transition-all',
                                                        isSelected ? 'bg-white text-zinc-950' : 'bg-white/[0.06] text-zinc-400',
                                                    )}>
                                                        {opt.badge}
                                                    </div>
                                                    <span className={cn(
                                                        'font-medium text-[15px] transition-colors',
                                                        isSelected ? 'text-white' : 'text-zinc-300',
                                                    )}>
                                                        {opt.label}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    'w-5 h-5 rounded-full border flex items-center justify-center transition-all',
                                                    isSelected ? 'bg-white border-white' : 'border-white/20',
                                                )}>
                                                    {isSelected && <Check className="w-3 h-3 text-zinc-950 stroke-[3px]" />}
                                                </div>
                                            </motion.button>

                                            {/* RU unlock block */}
                                            <AnimatePresence>
                                                {isSelected && opt.code === 'ru' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] to-indigo-500/[0.02] p-4">
                                                            <div className="flex items-center gap-2 mb-3.5">
                                                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" strokeWidth={2.5} />
                                                                <span className="text-[11px] font-semibold tracking-wide text-indigo-300">
                                                                    {ui.expatTitle}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2.5">
                                                                {ui.expatFeatures.map((feat, fi) => {
                                                                    const Icon = EXPAT_FEATURE_ICONS[fi];
                                                                    return (
                                                                        <div key={fi} className="flex items-center gap-3 text-zinc-200 text-[13px]">
                                                                            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/15 flex items-center justify-center shrink-0">
                                                                                <Icon className="w-3.5 h-3.5 text-indigo-300" strokeWidth={2} />
                                                                            </div>
                                                                            <span>{feat}</span>
                                                                        </div>
                                                                    );
                                                                })}
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
                            className="absolute inset-0 flex flex-col px-6 sm:px-8 pt-8 pb-4 overflow-y-auto"
                        >
                            <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible">
                                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 mb-2">
                                    {ui.countryLabel}
                                </div>
                                <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight mb-1.5">
                                    {ui.countryTitle}
                                </h1>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    {ui.countryDesc}
                                </p>
                            </motion.div>

                            <motion.div
                                custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-full mt-8"
                            >
                                <div className="relative p-6 rounded-3xl bg-white/[0.025] border border-emerald-500/30 flex flex-col items-center gap-4">
                                    {/* Selected indicator */}
                                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                        <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                    </div>
                                    <div className="text-5xl select-none leading-none">{selectedCountry.flag}</div>
                                    <div className="text-center">
                                        <div className="text-xl font-semibold text-white mb-1 tracking-tight">{selectedCountry.nameRu}</div>
                                        <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-[10px] font-medium uppercase tracking-[0.18em]">
                                            <Monitor className="w-2.5 h-2.5" />
                                            {selectedCountry.authority}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSwitchCountry}
                                        className="text-xs h-9 px-4 rounded-full border border-white/10 text-zinc-300 hover:bg-white/[0.04] active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
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
                            className="absolute inset-0 flex flex-col px-6 sm:px-8 pt-8 pb-4 overflow-y-auto"
                        >
                            <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible">
                                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 mb-2">
                                    {ui.categoryLabel}
                                </div>
                                <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight mb-1.5">
                                    {ui.categoryTitle}
                                </h1>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    {ui.categoryDesc}
                                </p>
                            </motion.div>

                            <motion.div
                                custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-full mt-8"
                            >
                                {selectedCountry.availableCategories.length === 1 ? (
                                    <SingleCategoryCard
                                        cat={selectedCountry.availableCategories[0]}
                                        meta={getCategoryMeta(selectedLang, selectedCountry.availableCategories[0])}
                                        country={selectedCountry}
                                        ui={ui}
                                    />
                                ) : (
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {selectedCountry.availableCategories.map((cat) => {
                                            const meta = getCategoryMeta(selectedLang, cat);
                                            const isSelected = selectedCategory === cat;
                                            return (
                                                <motion.button
                                                    key={cat}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => { haptic(); setSelectedCategory(cat); }}
                                                    className={cn(
                                                        'relative flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all aspect-square text-left',
                                                        isSelected
                                                            ? 'border-white/25 bg-white/[0.04]'
                                                            : 'border-white/[0.06] bg-white/[0.015] hover:border-white/10',
                                                    )}
                                                >
                                                    <div className={cn(
                                                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                                                        isSelected ? 'bg-white text-zinc-950' : 'bg-white/[0.06] text-zinc-400',
                                                    )}>
                                                        {getCategoryIcon(cat)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className={cn('text-sm font-semibold tracking-tight', isSelected ? 'text-white' : 'text-zinc-300')}>
                                                            {meta.title}
                                                        </div>
                                                        <div className={cn('text-[11px] mt-0.5 whitespace-pre-line leading-snug', isSelected ? 'text-zinc-400' : 'text-zinc-600')}>
                                                            {meta.desc}
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        'absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-all',
                                                        isSelected ? 'bg-white border-white' : 'border-white/15',
                                                    )}>
                                                        <Check className={cn('w-3 h-3 stroke-[3px] transition-all text-zinc-950', isSelected ? 'opacity-100' : 'opacity-0')} />
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
                            className="absolute inset-0 flex flex-col px-6 sm:px-8 pt-8 pb-4 overflow-y-auto"
                        >
                            <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
                                    <Bell className="w-5 h-5 text-zinc-300" strokeWidth={2} />
                                </div>
                                <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight mb-1.5">
                                    {ui.notifTitle}
                                </h1>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    {ui.notifDesc}
                                </p>
                            </motion.div>
                            <motion.div
                                custom={1} variants={itemVariants} initial="hidden" animate="visible"
                                className="w-full mt-8 space-y-2.5"
                            >
                                <button
                                    onClick={requestNotifications}
                                    className="w-full h-13 py-3.5 rounded-2xl bg-white text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                >
                                    {ui.enableNotif}
                                </button>
                                <button
                                    onClick={saveOnboardingData}
                                    className="w-full h-11 text-zinc-500 text-sm font-medium hover:text-zinc-300 active:text-zinc-300 transition-colors"
                                >
                                    {ui.later}
                                </button>
                            </motion.div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Footer */}
            <div
                className="relative z-10 px-6 sm:px-8 pt-3 shrink-0 w-full max-w-md mx-auto"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}
            >
                <div className="flex items-center gap-2.5">
                    <AnimatePresence>
                        {currentStepIndex > 0 && currentStep !== 'notifications' && (
                            <motion.button
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 52 }}
                                exit={{ opacity: 0, width: 0 }}
                                onClick={goBack}
                                className="h-13 w-[52px] py-3.5 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] active:scale-95 transition-all shrink-0"
                            >
                                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {currentStep !== 'notifications' && (
                        <button
                            onClick={goNext}
                            disabled={isSaving}
                            className={cn(
                                'flex-1 h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]',
                                isSaving
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-white text-zinc-950',
                            )}
                        >
                            {isSaving ? (
                                <span>{ui.saving}</span>
                            ) : (
                                <>
                                    <span>{isLastStep ? ui.finish : ui.next}</span>
                                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
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
        <div className="w-full p-6 rounded-3xl bg-white/[0.025] border border-white/[0.06] flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-zinc-950 flex items-center justify-center">
                {getCategoryIcon(cat)}
            </div>
            <div className="text-center">
                <div className="text-xl font-semibold text-white tracking-tight mb-1">{meta.title}</div>
                <div className="text-sm text-zinc-400 whitespace-pre-line leading-snug">{meta.desc}</div>
            </div>
            {country.metadata && (
                <div className="flex gap-2 w-full">
                    {country.metadata.totalQuestions && (
                        <div className="flex-1 text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                            <div className="text-base font-semibold text-white">{country.metadata.totalQuestions}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{ui.questions}</div>
                        </div>
                    )}
                    {country.metadata.examDuration && (
                        <div className="flex-1 text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                            <div className="text-base font-semibold text-white">{country.metadata.examDuration}m</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{ui.duration}</div>
                        </div>
                    )}
                    {country.metadata.passingScore && (
                        <div className="flex-1 text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                            <div className="text-base font-semibold text-white">{country.metadata.passingScore}%</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{ui.passing}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
