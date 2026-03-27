import React, { useEffect, useState, lazy, Suspense, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Brain, Zap, Swords, Gamepad2, BookOpen, Smartphone,
    Globe, Shield, Target, Trophy, Crown, Clock,
    Sparkles, ArrowRight, Heart, CheckCircle2, Users,
    MessageCircle, Shuffle, Flame, CreditCard, AlertTriangle,
    Star, BarChart3, Wifi, FileText, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LandingLogo } from "@/components/landing/LandingLogo";

const AuthModalNew = lazy(() => import("@/components/AuthModalNew").then(m => ({ default: m.AuthModalNew })));

/* ─────────────────── i18n ─────────────────── */
const content = {
    ru: {
        badge: "Возможности Skily",
        heroTitle: "Всё для сдачи\nс первого раза",
        heroSub: "AI-репетитор, 8 игровых режимов, PvP-дуэли и адаптивные тесты — в одном приложении. Испания и Россия.",
        cta: "Попробовать бесплатно",
        ctaSub: "Карта не нужна • Бесплатный доступ навсегда",
        sections: {
            ai: { title: "Skily AI", sub: "Искусственный интеллект, который объясняет ПДД как лучший инструктор" },
            tests: { title: "Умные тесты", sub: "9 режимов тестирования для каждого стиля обучения" },
            games: { title: "Игровая зона", sub: "Учёба через вовлечение, а не зубрёжку" },
            duels: { title: "PvP Дуэли", sub: "Сражайся с реальными игроками за рейтинг и награды" },
            learning: { title: "Обучение", sub: "Полная база знаков, терминов и правил" },
            platform: { title: "Платформа", sub: "Работает везде — браузер, Telegram, мобильный" },
        },
        finalCta: "Готов сдать экзамен?",
        finalCtaSub: "Присоединяйся к тысячам учеников, которые уже получили права с Skily.",
        startFree: "Начать бесплатно",
        noCard: "Карта не требуется",
    },
    es: {
        badge: "Funciones de Skily",
        heroTitle: "Todo para aprobar\na la primera",
        heroSub: "Tutor IA, 8 modos de juego, duelos PvP y tests adaptativos — en una sola app. España y Rusia.",
        cta: "Probar gratis",
        ctaSub: "Sin tarjeta • Acceso gratuito para siempre",
        sections: {
            ai: { title: "Skily AI", sub: "IA que explica las normas como el mejor instructor" },
            tests: { title: "Tests inteligentes", sub: "9 modos de test para cada estilo de aprendizaje" },
            games: { title: "Zona de juego", sub: "Aprender jugando, no memorizando" },
            duels: { title: "Duelos PvP", sub: "Lucha contra jugadores reales por ranking y premios" },
            learning: { title: "Aprendizaje", sub: "Base completa de señales, términos y reglas" },
            platform: { title: "Plataforma", sub: "Funciona en cualquier lugar — navegador, Telegram, móvil" },
        },
        finalCta: "¿Listo para aprobar?",
        finalCtaSub: "Únete a miles de alumnos que ya tienen su carnet con Skily.",
        startFree: "Empezar gratis",
        noCard: "Sin tarjeta de crédito",
    },
    en: {
        badge: "Skily Features",
        heroTitle: "Everything to pass\non the first try",
        heroSub: "AI tutor, 8 game modes, PvP duels and adaptive tests — all in one app. Spain and Russia.",
        cta: "Try for free",
        ctaSub: "No card needed • Free access forever",
        sections: {
            ai: { title: "Skily AI", sub: "Artificial intelligence that explains traffic rules like the best instructor" },
            tests: { title: "Smart Tests", sub: "9 test modes for every learning style" },
            games: { title: "Game Zone", sub: "Learning through engagement, not memorization" },
            duels: { title: "PvP Duels", sub: "Fight real players for ranking and rewards" },
            learning: { title: "Learning", sub: "Complete database of signs, terms and rules" },
            platform: { title: "Platform", sub: "Works anywhere — browser, Telegram, mobile" },
        },
        finalCta: "Ready to pass the exam?",
        finalCtaSub: "Join thousands of students who already got their license with Skily.",
        startFree: "Start for free",
        noCard: "No credit card required",
    },
};

/* ─────────────────── Бенто-фичи ─────────────────── */
const FEATURES_DATA = {
    ru: {
        ai: {
            pills: [
                { icon: Zap, label: "Мгновенный ответ" },
                { icon: Clock, label: "Доступен 24/7" },
                { icon: Globe, label: "Перевод на родной язык" },
                { icon: MessageCircle, label: "Объясняет как репетитор" },
            ],
            highlights: [
                "Объясняет каждый вопрос простым языком",
                "Переводит бюрократический язык DGT",
                "Подсказывает слабые места",
                "Работает мгновенно — без ожидания",
            ],
        },
        tests: [
            { icon: Shuffle, label: "Случайный тест", desc: "Адаптивная подборка вопросов" },
            { icon: Clock, label: "Экзамен DGT / ПДД", desc: "Полная симуляция реального экзамена" },
            { icon: Zap, label: "Блиц", desc: "20 вопросов за 5 минут" },
            { icon: Flame, label: "Марафон", desc: "Все вопросы базы подряд" },
            { icon: Target, label: "Нон-стоп", desc: "800 вопросов с сохранением" },
            { icon: AlertTriangle, label: "Топ-50 ловушек", desc: "Самые сложные вопросы" },
            { icon: BookOpen, label: "По темам", desc: "Выбери главу и прорешай" },
            { icon: Star, label: "Банк ошибок", desc: "Повтори то, что завалил" },
            { icon: Heart, label: "Избранное", desc: "Вопросы для повторения" },
        ],
        games: [
            { icon: Swords, label: "Дуэль", gradient: "from-violet-600 to-purple-600" },
            { icon: Zap, label: "Гонка", gradient: "from-cyan-600 to-blue-600" },
            { icon: CreditCard, label: "Флэш-карточки", gradient: "from-emerald-600 to-teal-600" },
            { icon: AlertTriangle, label: "Перекрёстки", gradient: "from-orange-600 to-red-600" },
            { icon: Brain, label: "Лексикон", gradient: "from-indigo-600 to-pink-600" },
            { icon: Shield, label: "Угадай Знак", gradient: "from-rose-600 to-red-600" },
        ],
        duel: {
            features: [
                "Случайный или друг",
                "Ставки монетами",
                "Глобальный рейтинг",
                "Сезонный Duel Pass",
                "Эксклюзивные бусты и скины",
                "Комбо-стрики за серии побед",
            ],
        },
        learning: [
            { icon: Shield, label: "Дорожные знаки", desc: "Полная база с категориями" },
            { icon: Globe, label: "Словарь ДМВ", desc: "Все термины экзамена" },
            { icon: BookOpen, label: "Учебник ПДД", desc: "Интерактивные главы" },
            { icon: BarChart3, label: "Аналитика прогресса", desc: "Трекинг обучения" },
        ],
        platform: [
            { icon: Smartphone, label: "PWA", desc: "Устанавливается как нативное приложение" },
            { icon: MessageCircle, label: "Telegram Mini App", desc: "Учись прямо в мессенджере" },
            { icon: Wifi, label: "Оффлайн-режим", desc: "Работает без интернета" },
            { icon: Globe, label: "3 языка", desc: "Русский • Español • English" },
            { icon: Users, label: "Испания + Россия", desc: "Адаптация под страну" },
            { icon: Crown, label: "Геймификация", desc: "XP, бонусы, награды, ачивки" },
        ],
    },
};

/* ── Duplicating for es/en (use ru as fallback) ── */
(FEATURES_DATA as any).es = FEATURES_DATA.ru;
(FEATURES_DATA as any).en = FEATURES_DATA.ru;

/* ─────────────────── Navbar ─────────────────── */
const Navbar = React.memo(({ onRequestAccess }: { onRequestAccess: () => void }) => {
    const { language } = useLanguage();
    const c = content[language] || content.en;
    return (
        <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-[1400px] mx-auto">
            <Link to="/" className="hover:opacity-80 transition-opacity">
                <LandingLogo theme="dark" variant="bold" />
            </Link>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300 mr-4">
                    <Link to="/about" className="hover:text-white transition-colors">
                        {language === 'ru' ? 'О нас' : language === 'es' ? 'Nosotros' : 'About'}
                    </Link>
                    <Link to="/pricing" className="hover:text-white transition-colors">
                        {language === 'ru' ? 'Тарифы' : 'Pricing'}
                    </Link>
                    <a href="https://t.me/skilyapp_bot" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                        {language === 'ru' ? 'Поддержка' : 'Support'}
                    </a>
                </div>
                <button
                    onClick={onRequestAccess}
                    className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10"
                >
                    {language === 'ru' ? 'Войти' : language === 'es' ? 'Entrar' : 'Login'}
                </button>
            </div>
        </nav>
    );
});
Navbar.displayName = 'Navbar';

/* ─────────────────── Bento Card ─────────────────── */
const BentoCard = ({
    children,
    className,
    glowColor = "blue",
}: {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
}) => {
    const glowMap: Record<string, string> = {
        blue: "from-blue-500/20 via-indigo-500/20 to-cyan-500/20",
        purple: "from-purple-500/20 via-violet-500/20 to-pink-500/20",
        amber: "from-amber-500/20 via-orange-500/20 to-yellow-500/20",
        emerald: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
        rose: "from-rose-500/20 via-pink-500/20 to-fuchsia-500/20",
        indigo: "from-indigo-500/20 via-blue-500/20 to-violet-500/20",
    };

    return (
        <div className={cn("group relative", className)}>
            {/* Hover glow */}
            <div className={cn(
                "absolute -inset-1 bg-gradient-to-r rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none",
                glowMap[glowColor] || glowMap.blue,
            )} />
            <div className="relative bg-[#0B1120]/80 backdrop-blur-2xl border border-white/[0.06] rounded-[2rem] p-8 md:p-10 overflow-hidden h-full transition-all duration-500 group-hover:border-white/15">
                {/* Glossy top */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                {/* Noise */}
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
                }} />
                <div className="relative z-10">{children}</div>
            </div>
        </div>
    );
};

/* ─────────────────── Section Header ─────────────────── */
const SectionHeader = ({ icon: Icon, title, sub, color }: { icon: any; title: string; sub: string; color: string }) => (
    <div className="mb-10 md:mb-14 text-center relative">
        <div className={cn("inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg mb-6", color)}>
            <Icon className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">{title}</span>
        </div>
        <p className="text-slate-400 text-lg font-light max-w-xl mx-auto">{sub}</p>
    </div>
);

/* ─────────────────── Footer ─────────────────── */
const Footer = React.memo(() => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    return (
        <footer className="relative z-10 border-t border-slate-800 bg-[#0f172a]">
            <div className="px-6 py-16 max-w-[1400px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="scale-75 origin-top-left -ml-2">
                            <LandingLogo theme="dark" variant="bold" />
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                            {language === 'ru'
                                ? 'Первая в мире платформа подготовки водителей с AI, геймификацией и PvP-дуэлями.'
                                : 'The world\'s first driver training platform with AI, gamification and PvP duels.'}
                        </p>
                    </div>
                    <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
                        <div>
                            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                                <Globe size={16} className="text-blue-500" />
                                Product
                            </h4>
                            <ul className="space-y-4">
                                {[
                                    { label: language === 'ru' ? 'О нас' : 'About', href: '/about' },
                                    { label: language === 'ru' ? 'Тарифы' : 'Pricing', href: '/pricing' },
                                    { label: language === 'ru' ? 'Блог' : 'Blog', href: '/blog' },
                                ].map((item) => (
                                    <li key={item.label}>
                                        <button onClick={() => navigate(item.href)} className="text-slate-400 hover:text-white text-sm transition-colors text-left block">{item.label}</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                                <FileText size={16} className="text-slate-500" />
                                Legal
                            </h4>
                            <ul className="space-y-4">
                                {[
                                    { label: 'Terms', href: '/legal/terms' },
                                    { label: 'Privacy', href: '/legal/privacy' },
                                ].map((item) => (
                                    <li key={item.label}>
                                        <button onClick={() => navigate(item.href)} className="text-slate-400 hover:text-white text-sm transition-colors text-left block">{item.label}</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                                <MapPin size={16} className="text-amber-500" />
                                Office
                            </h4>
                            <address className="not-italic text-slate-400 text-sm space-y-4">
                                <p>Barcelona, Spain</p>
                                <a href="mailto:hello@skily.ai" className="text-indigo-400 hover:text-white transition-colors block">hello@skily.ai</a>
                            </address>
                        </div>
                    </div>
                </div>
                <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
                    <p>© {new Date().getFullYear()} Skily. All rights reserved.</p>
                    <div className="flex items-center gap-2">
                        {/* Made with text removed */}
                    </div>
                </div>
            </div>
        </footer>
    );
});
Footer.displayName = 'Footer';

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
export default function Features() {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const c = content[language] || content.en;
    const fd = FEATURES_DATA[language] || FEATURES_DATA.ru;

    useEffect(() => {
        const originalBg = document.body.style.backgroundColor;
        const originalColor = document.body.style.color;
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.color = '#ffffff';
        const bottomNav = document.querySelector('.app-bottom-nav') as HTMLElement;
        const originalDisplay = bottomNav?.style.display;
        if (bottomNav) bottomNav.style.display = 'none';
        return () => {
            document.body.style.backgroundColor = originalBg;
            document.body.style.color = originalColor;
            if (bottomNav) bottomNav.style.display = originalDisplay || '';
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-[#0f172a] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* ── Fixed Background ── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none opacity-60" />
            <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none opacity-40" />

            <Navbar onRequestAccess={() => setAuthModalOpen(true)} />

            <main className="relative z-10 pt-40 pb-20 flex-1">
                {/* ══════════ HERO ══════════ */}
                <div className="text-center mb-32 space-y-8 max-w-4xl mx-auto px-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/10"
                        style={{ animation: 'fadeInUp 0.6s ease-out forwards', opacity: 0, transform: 'translateY(20px)' }}>
                        <Sparkles size={14} className="animate-pulse" />
                        <span>{c.badge}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] bg-gradient-to-b from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent drop-shadow-2xl tracking-tight whitespace-pre-line"
                        style={{ animation: 'fadeInUp 0.8s ease-out 0.1s forwards', opacity: 0, transform: 'translateY(20px)' }}>
                        {c.heroTitle}
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light"
                        style={{ animation: 'fadeInUp 0.8s ease-out 0.2s forwards', opacity: 0, transform: 'translateY(20px)' }}>
                        {c.heroSub}
                    </p>

                    <div className="flex flex-col items-center gap-4 pt-4"
                        style={{ animation: 'fadeInUp 0.8s ease-out 0.3s forwards', opacity: 0, transform: 'translateY(20px)' }}>
                        <button
                            onClick={() => setAuthModalOpen(true)}
                            className="group relative px-10 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:scale-105 transition-all duration-300 flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] overflow-hidden"
                        >
                            <span>{c.cta}</span>
                            <div className="bg-slate-900 text-white rounded-full p-1.5 group-hover:translate-x-1 transition-transform">
                                <ArrowRight size={16} />
                            </div>
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-indigo-100/40 to-transparent" />
                        </button>
                        <p className="text-slate-500 text-xs font-medium">{c.ctaSub}</p>
                    </div>
                </div>

                {/* ══════════ 1. AI SECTION ══════════ */}
                <section className="max-w-6xl mx-auto px-6 mb-32">
                    <SectionHeader icon={Brain} title={c.sections.ai.title} sub={c.sections.ai.sub} color="text-blue-400" />

                    <BentoCard glowColor="blue" className="mb-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                            {/* Left: Visual */}
                            <div className="relative">
                                <div className="relative rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/10 p-8 md:p-10">
                                    <div className="absolute top-4 left-4 flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Online</span>
                                    </div>

                                    <div className="mt-8 space-y-4">
                                        {/* Simulated chat messages */}
                                        <div className="flex justify-end">
                                            <div className="bg-indigo-500/20 border border-indigo-500/20 rounded-2xl rounded-tr-md px-5 py-3 max-w-[280px]">
                                                <p className="text-sm text-white/90">
                                                    {language === 'ru' ? 'Почему нельзя обгонять на перекрёстке?' : 'Why can\'t I overtake at an intersection?'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex justify-start">
                                            <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-md px-5 py-3 max-w-[320px]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                                        <Sparkles className="w-3 h-3 text-white" />
                                                    </div>
                                                    <span className="text-xs font-bold text-blue-400">Skily AI</span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    {language === 'ru'
                                                        ? 'На нерегулируемых перекрёстках обгон запрещён, потому что видимость ограничена, а траектории машин пересекаются. Это правило Art. 88 RGC.'
                                                        : 'At unregulated intersections, overtaking is prohibited because visibility is limited and vehicle trajectories intersect. This rule is Art. 88 RGC.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Pills & Highlights */}
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-3">
                                    {fd.ai.pills.map((pill, i) => {
                                        const PillIcon = pill.icon;
                                        return (
                                            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors">
                                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                    <PillIcon className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <span className="text-sm font-bold text-white/80">{pill.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <ul className="space-y-3">
                                    {fd.ai.highlights.map((h, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                            </div>
                                            <span className="text-sm text-slate-300">{h}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </BentoCard>
                </section>

                {/* ══════════ 2. TESTS SECTION ══════════ */}
                <section className="max-w-6xl mx-auto px-6 mb-32">
                    <SectionHeader icon={Target} title={c.sections.tests.title} sub={c.sections.tests.sub} color="text-emerald-400" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fd.tests.map((test, i) => {
                            const TestIcon = test.icon;
                            return (
                                <div
                                    key={i}
                                    className="group relative rounded-2xl bg-white/[0.02] border border-white/5 p-6 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5"
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <TestIcon className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm mb-1">{test.label}</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed">{test.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ══════════ 3. GAMES SECTION ══════════ */}
                <section className="max-w-6xl mx-auto px-6 mb-32">
                    <SectionHeader icon={Gamepad2} title={c.sections.games.title} sub={c.sections.games.sub} color="text-purple-400" />

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {fd.games.map((game, i) => {
                            const GameIcon = game.icon;
                            return (
                                <div key={i} className="group relative">
                                    <div className={cn(
                                        "relative rounded-3xl p-6 flex flex-col items-center gap-4 text-center border border-white/5 bg-white/[0.02] overflow-hidden",
                                        "hover:border-white/15 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-1"
                                    )}>
                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500",
                                            game.gradient,
                                        )}>
                                            <GameIcon className="w-8 h-8 text-white" />
                                        </div>
                                        <span className="text-sm font-bold text-white/90">{game.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ══════════ 4. DUELS SECTION ══════════ */}
                <section className="max-w-6xl mx-auto px-6 mb-32">
                    <SectionHeader icon={Swords} title={c.sections.duels.title} sub={c.sections.duels.sub} color="text-amber-400" />

                    <BentoCard glowColor="amber" className="relative">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                            {/* Left: Visual */}
                            <div className="relative flex justify-center">
                                <div className="relative">
                                    <div className="w-64 h-64 md:w-80 md:h-80 rounded-[3rem] bg-gradient-to-br from-amber-400/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
                                        <Swords className="w-32 h-32 md:w-40 md:h-40 text-amber-300/60" />
                                    </div>
                                    {/* Floating elements */}
                                    <div className="absolute -top-6 -right-6 p-4 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-xl border border-yellow-400/30 shadow-xl animate-bounce"
                                        style={{ animationDuration: '3s' }}>
                                        <Trophy className="w-8 h-8 text-yellow-300" />
                                    </div>
                                    <div className="absolute -bottom-4 -left-4 p-4 rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-500/20 backdrop-blur-xl border border-violet-400/30 shadow-xl animate-bounce"
                                        style={{ animationDuration: '4s', animationDelay: '1s' }}>
                                        <Crown className="w-8 h-8 text-violet-300" />
                                    </div>
                                </div>
                            </div>

                            {/* Right: Features */}
                            <div className="space-y-4">
                                {fd.duel.features.map((feat, i) => (
                                    <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-amber-500/20 transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-amber-400" />
                                        </div>
                                        <span className="text-sm font-bold text-white/80">{feat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </BentoCard>
                </section>

                {/* ══════════ 5. LEARNING SECTION ══════════ */}
                <section className="max-w-6xl mx-auto px-6 mb-32">
                    <SectionHeader icon={BookOpen} title={c.sections.learning.title} sub={c.sections.learning.sub} color="text-teal-400" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {fd.learning.map((item, i) => {
                            const ItemIcon = item.icon;
                            return (
                                <BentoCard key={i} glowColor="emerald">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                                            <ItemIcon className="w-6 h-6 text-teal-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-base mb-1">{item.label}</h4>
                                            <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                </BentoCard>
                            );
                        })}
                    </div>
                </section>

                {/* ══════════ 6. PLATFORM SECTION ══════════ */}
                <section className="max-w-6xl mx-auto px-6 mb-32">
                    <SectionHeader icon={Smartphone} title={c.sections.platform.title} sub={c.sections.platform.sub} color="text-indigo-400" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fd.platform.map((item, i) => {
                            const PlatIcon = item.icon;
                            return (
                                <div key={i} className="group rounded-2xl bg-white/[0.02] border border-white/5 p-6 hover:border-indigo-500/20 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <PlatIcon className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm mb-1">{item.label}</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ══════════ FINAL CTA ══════════ */}
                <section className="max-w-4xl mx-auto px-6 relative">
                    <div className="absolute top-0 left-1/3 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-[120px] rounded-full pointer-events-none"
                        style={{ animation: 'float 8s ease-in-out infinite' }} />

                    <div className="relative rounded-3xl py-14 px-8 md:px-16 text-center shadow-2xl shadow-indigo-900/40 overflow-hidden group border-t border-white/20 mb-20">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900" />
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/30 blur-[80px] rounded-full mix-blend-overlay animate-pulse" style={{ animationDuration: '4s' }} />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/30 blur-[80px] rounded-full mix-blend-overlay animate-pulse" style={{ animationDuration: '6s' }} />

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest mb-6 backdrop-blur-md shadow-lg">
                                <Sparkles size={12} className="text-yellow-300" />
                                <span>{c.badge}</span>
                            </div>

                            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-2xl tracking-tighter leading-tight">
                                {c.finalCta}
                            </h2>

                            <p className="text-white/80 text-lg font-light mb-8 max-w-xl mx-auto leading-relaxed">
                                {c.finalCtaSub}
                            </p>

                            <button
                                onClick={() => setAuthModalOpen(true)}
                                className="group/btn relative px-8 py-3.5 bg-white text-slate-900 rounded-xl font-black text-base hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]"
                            >
                                <span>{c.startFree}</span>
                                <div className="bg-slate-900 text-white rounded-full p-1 group-hover/btn:translate-x-1 transition-transform">
                                    <ArrowRight size={14} />
                                </div>
                            </button>

                            <p className="mt-4 text-white/40 text-xs font-medium">{c.noCard}</p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />

            <Suspense fallback={null}>
                <AuthModalNew open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            </Suspense>

            <style>{`
        @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -30px) scale(1.1); } }
      `}</style>
        </div>
    );
}
