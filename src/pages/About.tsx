import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Gamepad2, Sparkles, Heart, Shield, CheckCircle,
  Users, Trophy, Clock, ArrowRight, Star, Quote,
  Globe, FileText, MapPin, Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { landingTranslations } from "@/translations/landing";

// Lazy load AuthModal
const AuthModalNew = lazy(() => import("@/components/AuthModalNew").then(m => ({ default: m.AuthModalNew })));

// ... (previous code)

const FinalCTA = React.memo(({ onRequestAccess }: { onRequestAccess: () => void }) => {
  const { language } = useLanguage();

  return (
    <div className="mb-40 mx-4 relative z-20 max-w-4xl mx-auto">
      <div className="relative rounded-3xl py-12 px-8 md:px-16 text-center shadow-2xl shadow-indigo-900/40 overflow-hidden group border-t border-white/20">

        {/* Liquid Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900 animate-gradient-x" />

        {/* Animated Blur Blobs - Scaled Down */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/30 blur-[80px] rounded-full mix-blend-overlay animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/30 blur-[80px] rounded-full mix-blend-overlay animate-pulse" style={{ animationDuration: '6s' }} />

        {/* Noise Texture */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        }} />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest mb-6 backdrop-blur-md shadow-lg">
            <Sparkles size={12} className="text-yellow-300" />
            <span>{language === 'ru' ? 'Твой путь к правам' : 'Your Road to License'}</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-2xl tracking-tighter leading-tight">
            {language === 'ru' ? 'Готов сдать экзамен?' : 'Ready to pass the exam?'}
          </h2>

          <p className="text-white/80 text-lg font-light mb-8 max-w-xl mx-auto leading-relaxed">
            {language === 'ru'
              ? 'Присоединяйся к тысячам учеников, которые уже получили права с Skily.'
              : 'Join thousands of students who got their license with Skily.'}
          </p>

          <button
            onClick={onRequestAccess}
            className="group/btn relative px-8 py-3.5 bg-white text-slate-900 rounded-xl font-black text-base hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]"
          >
            <span>{language === 'ru' ? 'Начать бесплатно' : 'Start for Free'}</span>
            <div className="bg-slate-900 text-white rounded-full p-1 group-hover/btn:translate-x-1 transition-transform">
              <ArrowRight size={14} />
            </div>
          </button>

          <p className="mt-4 text-white/40 text-xs font-medium">
            {language === 'ru' ? 'Карта не требуется' : 'No credit card required'}
          </p>
        </div>
      </div>
    </div>
  );
});

FinalCTA.displayName = 'FinalCTA';
const highlightText = (text: string, keywords: string[], highlightClass: string = "text-blue-200") => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const lowerText = text.toLowerCase();

  keywords.forEach(keyword => {
    const index = lowerText.indexOf(keyword.toLowerCase(), lastIndex);
    if (index !== -1) {
      parts.push(text.substring(lastIndex, index));
      parts.push(<span key={index} className={highlightClass}>{text.substring(index, index + keyword.length)}</span>);
      lastIndex = index + keyword.length;
    }
  });
  parts.push(text.substring(lastIndex));

  return <>{parts}</>;
};



// --- Components ---

const Navbar = React.memo(({ onRequestAccess }: { onRequestAccess: () => void }) => {
  const { language } = useLanguage();

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-[1400px] mx-auto">
      <Link to="/" className="hover:opacity-80 transition-opacity">
        <LandingLogo theme="dark" variant="bold" />
      </Link>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-300 mr-4">
          <Link to="/features" className="hover:text-white transition-colors">Features</Link>
          <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <a href="https://t.me/skilyapp_bot" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Support</a>
        </div>

        <button
          onClick={onRequestAccess}
          className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10"
        >
          {language === 'ru' ? 'Войти' : 'Login'}
        </button>
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

const AnimatedCounter = ({ value, suffix = '', decimals = 0, duration = 2000 }: { value: number, suffix?: string, decimals?: number, duration?: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "200px" // Start triggering earlier
      }
    );

    if (nodeRef.current) {
      observer.observe(nodeRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !nodeRef.current) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function: easeOutExpo
      const easeOut = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);

      const currentVal = value * easeOut;

      if (nodeRef.current) {
        nodeRef.current.textContent = currentVal.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      }

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        if (nodeRef.current) {
          nodeRef.current.textContent = value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
        }
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, isVisible, decimals]);

  return (
    <span ref={nodeRef} className="tabular-nums tracking-tighter">
      0
    </span>
  );
};

const StatsBlock = React.memo(() => {
  const { language } = useLanguage();

  const stats = [
    {
      value: 15242,
      label: language === 'ru' ? "Пройденных тестов" : "Tests Completed",
      sublabel: language === 'ru' ? "на основе реальных экзаменов" : "based on real exams",
      icon: CheckCircle,
      suffix: "+",
      color: "text-blue-400",
      glow: "bg-blue-500/20",
      decimals: 0
    },
    {
      value: 98.4,
      label: language === 'ru' ? "Успешная сдача" : "Success Rate",
      sublabel: language === 'ru' ? "среди активных пользователей" : "among active users",
      icon: Trophy,
      suffix: "%",
      color: "text-amber-400",
      glow: "bg-amber-500/20",
      decimals: 1
    },
    {
      value: 0,
      customDisplay: language === 'ru' ? "24/7" : "24/7",
      label: language === 'ru' ? "Доступность AI" : "AI Availability",
      sublabel: language === 'ru' ? "мгновенные ответы" : "instant answers",
      icon: Clock,
      suffix: "",
      color: "text-purple-400",
      glow: "bg-purple-500/20",
      decimals: 0,
      live: true
    },
  ];

  return (
    <div className="relative rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden mb-32 shadow-2xl animate-fade-in-up">
      {/* Glossy sheen top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

      <div className="grid grid-cols-1 md:grid-cols-3 relative z-10">
        {stats.map((stat, i) => (
          <div key={i} className={cn(
            "relative group p-10 flex flex-col items-center text-center transition-all duration-500 hover:bg-white/[0.02]",
            i !== stats.length - 1 ? "border-b md:border-b-0 md:border-r border-white/5" : ""
          )}>
            {/* Live Indicator */}
            {stat.live && (
              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Live</span>
              </div>
            )}

            {/* Hover Glow */}
            <div className={cn(
              "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-3xl",
              stat.glow
            )} />

            {/* Icon Pulse */}
            <div className={cn(
              "mb-4 p-3 rounded-2xl bg-white/5 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300 shadow-lg backdrop-blur-sm",
              stat.color
            )}>
              <stat.icon size={22} className={cn(i === 2 && "animate-spin-slow")} />
            </div>

            {/* Number with Superscript Suffix */}
            <div className={cn("text-5xl md:text-7xl font-black text-white font-mono tracking-tighter mb-3 flex items-start justify-center drop-shadow-2xl", stat.color)}>
              <div className="relative z-10">
                {stat.customDisplay ? (
                  stat.customDisplay
                ) : (
                  <AnimatedCounter value={stat.value} decimals={stat.decimals} />
                )}
              </div>
              {stat.suffix && (
                <span className="text-2xl md:text-3xl mt-2 opacity-60 font-medium ml-1.5">{stat.suffix}</span>
              )}
            </div>

            {/* Labels */}
            <div className="relative z-10 w-full">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto mb-4 group-hover:w-24 transition-all duration-500" />
              <div className="text-white font-bold text-sm uppercase tracking-[0.2em] mb-1.5">
                {stat.label}
              </div>
              <div className="text-slate-400 text-xs font-medium tracking-wide">
                {stat.sublabel}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(20px); }
        @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
});

StatsBlock.displayName = 'StatsBlock';

const MarqueeCard = React.memo(({
  name,
  country,
  text,
  rating = 5,
  metric,
  date,
  size = 'medium',
  badge,
  archetype
}: {
  name: string,
  country: string,
  text: string,
  rating?: number,
  metric?: string,
  date?: string,
  size?: 'small' | 'medium' | 'large' | 'wide',
  badge?: string,
  archetype?: 'parent' | 'expat' | 'gamer' | 'anxious' | 'fast' | 'celebration'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const widthClass =
    size === 'small' ? 'w-[260px]' :
      size === 'large' ? 'w-[420px] md:w-[480px]' :
        size === 'wide' ? 'w-[500px] md:w-[600px]' :
          'w-[320px] md:w-[380px]';

  // Country-themed hover colors & shadows
  const hoverGlow =
    archetype === 'gamer' ? 'from-purple-500/10 to-pink-500/10' :
      archetype === 'expat' ? 'from-blue-500/10 to-cyan-500/10' :
        archetype === 'parent' ? 'from-amber-500/10 to-orange-500/10' :
          archetype === 'anxious' ? 'from-emerald-500/10 to-green-500/10' :
            'from-blue-500/10 to-indigo-500/10';

  const hoverShadow =
    archetype === 'gamer' ? 'hover:shadow-[0_20px_50px_-12px_rgba(168,85,247,0.25)]' :
      archetype === 'expat' ? 'hover:shadow-[0_20px_50px_-12px_rgba(59,130,246,0.25)]' :
        archetype === 'parent' ? 'hover:shadow-[0_20px_50px_-12px_rgba(251,146,60,0.25)]' :
          archetype === 'anxious' ? 'hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)]' :
            'hover:shadow-[0_20px_50px_-12px_rgba(99,102,241,0.25)]';

  // Intersection Observer for entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "200px" // Load earlier
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        widthClass,
        "bg-slate-900/40 backdrop-blur-md border border-white/10 hover:border-white/30 p-6 rounded-2xl flex-shrink-0 mx-3 transition-all duration-700 group relative overflow-hidden",
        hoverShadow,
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      )}
    >
      {/* Removed per-card noise texture for seamless 60fps animation */}

      {/* Aurora Glow hover effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700",
        hoverGlow
      )} />

      <div className="relative z-10">
        {/* Badge at top */}
        {badge && (
          <div className="mb-4 inline-block">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-yellow-200 text-xs font-bold uppercase tracking-wider shadow-lg shadow-yellow-500/10">
              {badge}
            </span>
          </div>
        )}

        {/* User info - More prominent */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-base ring-2 ring-white/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
              {name[0]}
            </div>
            <div>
              <div className="text-white font-bold text-base">{name}</div>
              <div className="text-slate-400 text-xs font-medium">{country}</div>
            </div>
          </div>
          {date && (
            <span className="text-[10px] text-slate-500 opacity-50">{date}</span>
          )}
        </div>

        {/* Stars */}
        <div className="flex gap-1 mb-4">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} size={13} className="fill-yellow-400 text-yellow-400" />
          ))}
        </div>

        {/* Main text */}
        <p className="text-slate-200 text-sm leading-relaxed mb-5 font-light">
          "{text}"
        </p>

        {/* Success Metric - Central Block with enhanced styling */}
        {metric && (
          <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm group-hover:border-white/20 transition-colors">
            <div className="text-xs text-white font-bold tracking-wide">{metric}</div>
          </div>
        )}

        {/* Verified footer with pulsing dot */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] text-emerald-400/80 font-semibold uppercase tracking-widest">
            Verified via DGT ID
          </span>
        </div>
      </div>
    </div>
  );
});

MarqueeCard.displayName = 'MarqueeCard';

const InfiniteMarquee = React.memo(() => {
  const { language } = useLanguage();

  const reviewsRow1 = [
    {
      name: "María L.",
      country: "Barcelona 🇪🇸",
      text: language === 'ru'
        ? "Боялась, что с двумя детьми вообще не открою учебник. Проходила по 5 тестов, пока ждала дочку с гимнастики. AI-озвучка — спасение, слушала теорию как подкаст в машине. Сдала с первого раза, сама не верю!"
        : "Was scared I wouldn't even open the book with two kids. Did 5 tests while waiting for my daughter at gymnastics. AI voice-over is a lifesaver — listened to theory like a podcast in the car. Passed first try, can't believe it myself!",
      metric: language === 'ru' ? "⏱ 15 мин/день · 🎧 Аудио" : "⏱ 15 min/day · 🎧 Audio",
      badge: language === 'ru' ? "Экономия: 350€" : "Saved: 350€",
      date: language === 'ru' ? "неделю назад" : "week ago",
      size: 'wide' as const,
      archetype: 'parent' as const
    },
    {
      name: "Andrei K.",
      country: "Ukraine 🇺🇦 → Valencia",
      text: language === 'ru'
        ? "В автошколе Валенсии на меня смотрели как на инопланетянина, когда я не понимал разницу между 'detención' и 'parada'. Lumi AI перевел всё на человеческий русский за секунду. Без него я бы до сих пор сидел над тем учебником."
        : "At Valencia driving school they looked at me like an alien when I didn't understand 'detención' vs 'parada'. Lumi AI translated everything to human language in seconds. Without it I'd still be stuck with that textbook.",
      metric: language === 'ru' ? "🌍 Испанский: А2 · 🧠 100%" : "🌍 Spanish: A2 · 🧠 100%",
      badge: language === 'ru' ? "Языковой барьер сломан" : "Language barrier broken",
      date: language === 'ru' ? "5 дней назад" : "5 days ago",
      size: 'wide' as const,
      archetype: 'expat' as const
    },
    {
      name: "Elena S.",
      country: "Russia 🇷🇺",
      text: language === 'ru'
        ? "Просто ВАУ! Сдала теорию за 9 дней!"
        : "Just WOW! Passed theory in 9 days!",
      metric: language === 'ru' ? "🚀 Рекорд: 9 дней" : "🚀 Record: 9 days",
      badge: language === 'ru' ? "Быстрее автошколы" : "Faster than school",
      date: language === 'ru' ? "вчера" : "yesterday",
      size: 'small' as const,
      archetype: 'fast' as const
    },
  ];

  const reviewsRow2 = [
    {
      name: "Carlos M.",
      country: "Argentina 🇦🇷 → Madrid",
      text: language === 'ru'
        ? "Думал, что учить ПДД — это скука смертная. Но когда в Дуэлях меня начал обходить чувак из Барселоны, я реально закусился. Выучил все знаки за три вечера, просто чтобы его обставить. Лучший EdTech опыт!"
        : "Thought studying traffic rules would be deadly boring. But when some guy from Barcelona startedN/A - Reading file firstn Duels, I got seriously competitive. Learned all signs in three evenings just to beat him. Best EdTech experience ever!",
      metric: language === 'ru' ? "🏆 Топ-3 в лиге · ⚔️ 142 победы" : "🏆 Top-3 in league · ⚔️ 142 wins",
      badge: language === 'ru' ? "Геймер одобряет" : "Gamer approved",
      date: language === 'ru' ? "2 недели назад" : "2 weeks ago",
      size: 'wide' as const,
      archetype: 'gamer' as const
    },
    {
      name: "Sophie D.",
      country: "France 🇫🇷 → Sevilla",
      text: language === 'ru'
        ? "Боялась круговых перекрёстков до истерики. После 5 дуэлей с вопросами про rotondas всё встало на места. AI разложил по полочкам, что казалось космосом."
        : "Was terrified of roundabouts to the point of panic. After 5 duels with rotonda questions, everything clicked. AI broke down what seemed like rocket science.",
      metric: language === 'ru' ? "🎯 0 ошибок · Круговые" : "🎯 0 errors · Roundabouts",
      badge: language === 'ru' ? "Страх побеждён" : "Fear conquered",
      date: language === 'ru' ? "4 дня назад" : "4 days ago",
      size: 'large' as const,
      archetype: 'anxious' as const
    },
    {
      name: "John T.",
      country: "USA 🇺🇸 → BCN",
      text: language === 'ru'
        ? "APTO! 🎉"
        : "APTO! 🎉",
      metric: language === 'ru' ? "✅ Экзамен сдан!" : "✅ Exam passed!",
      badge: language === 'ru' ? "Сегодня" : "Today",
      date: language === 'ru' ? "сегодня" : "today",
      size: 'small' as const,
      archetype: 'celebration' as const
    },
  ];

  const reviewsRow3 = [
    {
      name: "Dmitry P.",
      country: "Russia 🇷🇺 → Málaga",
      text: language === 'ru'
        ? "Автошкола хотела 450€ за теорию. Я сказал 'не, спасибо' и купил Skily за 19€. Сэкономленные деньги пошли на дополнительные практические занятия. Это был мой лучший финансовый выбор года."
        : "Driving school wanted 450€ for theory. I said 'no thanks' and got Skily for 19€. Saved money went to extra practical lessons. Best financial decision of the year.",
      metric: language === 'ru' ? "💰 Сэкономил: 431€" : "💰 Saved: 431€",
      badge: language === 'ru' ? "Умная экономия" : "Smart savings",
      date: language === 'ru' ? "10 дней назад" : "10 days ago",
      size: 'wide' as const,
      archetype: 'parent' as const
    },
    {
      name: "Yuki M.",
      country: "Japan 🇯🇵 → Barcelona",
      text: language === 'ru'
        ? "Каждый термин переводился на японский. Это магия!"
        : "Every term translated to Japanese. It's magic!",
      metric: language === 'ru' ? "🇯🇵 Родной язык" : "🇯🇵 Native language",
      badge: language === 'ru' ? "15+ языков" : "15+ languages",
      date: language === 'ru' ? "3 дня назад" : "3 days ago",
      size: 'medium' as const,
      archetype: 'expat' as const
    },
    {
      name: "Laura B.",
      country: "Italy 🇮🇹 → Madrid",
      text: language === 'ru'
        ? "Сдала за 14 дней между работой и детьми. Невероятно!"
        : "Passed in 14 days between work and kids. Incredible!",
      metric: language === 'ru' ? "⚡ 14 дней" : "⚡ 14 days",
      badge: language === 'ru' ? "Работающая мама" : "Working mom",
      date: language === 'ru' ? "неделю назад" : "week ago",
      size: 'small' as const,
      archetype: 'parent' as const
    },
  ];

  return (
    <div className="mb-32 overflow-hidden relative">
      <div className="text-center mb-16">
        <h3 className="text-3xl md:text-4xl font-black text-white mb-3 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          {language === 'ru' ? 'Нас выбирают экспаты' : 'Chosen by Expats'}
        </h3>
        <p className="text-slate-400 text-base">
          {language === 'ru' ? 'Реальные истории успеха · Проверенные студенты' : 'Real success stories · Verified students'}
        </p>
      </div>

      {/* Fade Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#0f172a] via-[#0f172a]/80 to-transparent z-10 pointer-events-none" />

      {/* 3-speed parallax rows */}
      <div className="space-y-6">
        {/* Row 1 - Fast */}
        <div className="flex animate-marquee-fast w-max">
          {[...reviewsRow1, ...reviewsRow1, ...reviewsRow1].map((r, i) => (
            <MarqueeCard key={`row1-${i}`} {...r} />
          ))}
        </div>

        {/* Row 2 - Medium (opposite direction) */}
        <div className="flex animate-marquee-medium w-max">
          {[...reviewsRow2, ...reviewsRow2, ...reviewsRow2].map((r, i) => (
            <MarqueeCard key={`row2-${i}`} {...r} />
          ))}
        </div>

        {/* Row 3 - Slow */}
        <div className="flex animate-marquee-slow w-max">
          {[...reviewsRow3, ...reviewsRow3, ...reviewsRow3].map((r, i) => (
            <MarqueeCard key={`row3-${i}`} {...r} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee-fast {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marquee-medium {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        @keyframes marquee-slow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee-fast {
          animation: marquee-fast 30s linear infinite;
        }
        .animate-marquee-medium {
          animation: marquee-medium 40s linear infinite;
        }
        .animate-marquee-slow {
          animation: marquee-slow 50s linear infinite;
        }
        .animate-marquee-fast:hover,
        .animate-marquee-medium:hover,
        .animate-marquee-slow:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
});

InfiniteMarquee.displayName = 'InfiniteMarquee';



const Footer = React.memo(({ copy }: { copy: any }) => {
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
              {language === 'ru' ?
                'Первая в мире платформа подготовки водителей с искусственным интеллектом, геймификацией и PvP-дуэлями.' :
                language === 'es' ?
                  'La primera plataforma de formación vial del mundo con inteligencia artificial, gamificación y duelos PvP.' :
                  'The world\'s first driver training platform with artificial intelligence, gamification and PvP duels.'
              }
            </p>
            <div className="flex items-center gap-4 text-slate-500">
              {['Instagram', 'Twitter', 'LinkedIn'].map((social) => (
                <button key={social} className="hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
                  {social}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                <Globe size={16} className="text-blue-500" />
                Product
              </h4>
              <ul className="space-y-4">
                {copy.footer.menu.filter((i: any) => !i.href.includes('terms') && !i.href.includes('privacy')).map((item: any) => (
                  <li key={item.label}>
                    <button onClick={() => navigate(item.href)} className="text-slate-400 hover:text-white text-sm transition-colors text-left block">
                      {item.label}
                    </button>
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
                {copy.footer.menu.filter((i: any) => i.href.includes('terms') || i.href.includes('privacy')).map((item: any) => (
                  <li key={item.label}>
                    <button onClick={() => navigate(item.href)} className="text-slate-400 hover:text-white text-sm transition-colors text-left block">
                      {item.label}
                    </button>
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
                <p>Barcelona, Spain<br />Carrer de la Marina</p>
                <a href="mailto:hello@skily.ai" className="text-indigo-400 hover:text-white transition-colors block">hello@skily.ai</a>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Operational
                </div>
              </address>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
          <p>{copy.footer.note}</p>
          <div className="flex items-center gap-2">
            <span>Made with</span>
            <Heart size={12} className="text-red-500 fill-red-500/20" />
            <span>in Barcelona</span>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

// --- Main Page Component ---

export default function About() {
  const { language } = useLanguage();
  const copy = landingTranslations[language];
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Set dark background for body
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    const originalColor = document.body.style.color;
    document.body.style.backgroundColor = '#0f172a';
    document.body.style.color = '#ffffff';

    // Hide bottom navigation from Layout
    const bottomNav = document.querySelector('.app-bottom-nav') as HTMLElement;
    const originalDisplay = bottomNav?.style.display;
    if (bottomNav) {
      bottomNav.style.display = 'none';
    }

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.body.style.color = originalColor;
      if (bottomNav) {
        bottomNav.style.display = originalDisplay || '';
      }
    };
  }, []);

  const content = {
    ru: {
      hero: {
        title: "Права без стресса. Для каждого.",
        subtitle: "Мы верим, что подготовка к экзамену не должна быть скучной или пугающей. Мы создали инструмент, которого нам самим не хватало.",
      },
      story: {
        title: "Наша история",
        text: "Skily родился из боли. Устаревшие учебники, бюрократический язык, скучные лекции. В новой стране получение прав часто превращается в ад.\n\nМы — команда экспатов, которые прошли через это. Мы знаем, как страшно не понять вопрос на экзамене из-за одного слова. Мы решили исправить это с помощью технологий и геймификации. Мы здесь, чтобы вы сдали экзамен играючи, а не страдая.",
        keywords: ["Skily", "боли", "технологий"]
      },
      values: [
        {
          icon: Heart,
          title: "Эмпатия",
          text: "Мы понимаем страхи новичков и поддерживаем на каждом шагу.",
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          shadow: "shadow-red-500/20"
        },
        {
          icon: Sparkles,
          title: "Технологии",
          text: "Искусственный интеллект делает сложные законы простыми и понятными.",
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          shadow: "shadow-blue-500/20"
        },
        {
          icon: Gamepad2,
          title: "Драйв",
          text: "Учеба должна быть игрой. Скука — главный враг прогресса.",
          color: "text-purple-400",
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
          shadow: "shadow-purple-500/20"
        },
      ]
    },
    es: {
      hero: {
        title: "Tu carnet sin estrés. Para todos.",
        subtitle: "Creemos que prepararse para el examen no debe ser aburrido ni intimidante. Hemos creado la herramienta que nosotros mismos echábamos de menos.",
      },
      story: {
        title: "Nuestra historia",
        text: "Skily nació de la frustración. Manuales obsoletos, lenguaje burocrático, clases aburridas. Obtener el carnet puede ser una pesadilla.\n\nSomos un equipo que pasó por esto. Sabemos lo que es fallar por no entender una palabra. Decidimos arreglarlo con tecnología y gamificación. Estamos aquí para que apruebes jugando, no sufriendo.",
        keywords: ["Skily", "frustración", "tecnología"]
      },
      values: [
        {
          icon: Heart,
          title: "Empatía",
          text: "Entendemos los miedos de los principiantes y te apoyamos siempre.",
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          shadow: "shadow-red-500/20"
        },
        {
          icon: Sparkles,
          title: "Tecnología",
          text: "La IA hace que las leyes complejas sean simples y claras.",
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          shadow: "shadow-blue-500/20"
        },
        {
          icon: Gamepad2,
          title: "Diversión",
          text: "Aprender debe ser un juego. El aburrimiento es el enemigo.",
          color: "text-purple-400",
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
          shadow: "shadow-purple-500/20"
        },
      ]
    },
    en: {
      hero: {
        title: "License without stress. For everyone.",
        subtitle: "We believe exam preparation shouldn't be boring or scary. We built the tool we wished we had.",
      },
      story: {
        title: "Our Story",
        text: "Skily was born from pain. Outdated manuals, bureaucratic language, boring lectures. Getting a license can be a nightmare.\n\nWe are a team that went through this. We know the fear of failing because of one word. We decided to fix it with technology and gamification. We are here so you can pass by playing, not suffering.",
        keywords: ["Skily", "pain", "technology"]
      },
      values: [
        {
          icon: Heart,
          title: "Empathy",
          text: "We understand key fears and support every step.",
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          shadow: "shadow-red-500/20",
          colSpan: "col-span-1 md:col-span-1" // Standard
        },
        {
          icon: Sparkles,
          title: "Technology",
          text: "AI turns complex bureaucracy into simple games.",
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          shadow: "shadow-blue-500/20",
          colSpan: "col-span-1 md:col-span-2" // Wide
        },
        {
          icon: Gamepad2,
          title: "Drive",
          text: "Boredom is the enemy. Learning must be addictive.",
          color: "text-purple-400",
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
          shadow: "shadow-purple-500/20",
          colSpan: "col-span-1 md:col-span-1" // Standard
        },
        {
          icon: Shield,
          title: "Transparency",
          text: "Official data only. Direct sync with DGT & WORD databases.",
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          shadow: "shadow-emerald-500/20",
          colSpan: "col-span-1 md:col-span-2" // Wide
        },
        {
          icon: Users,
          title: "Community",
          text: "You are not alone. Thousands fight in duels daily.",
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          shadow: "shadow-amber-500/20",
          colSpan: "col-span-1 md:col-span-1" // Standard
        },
        {
          icon: Trophy,
          title: "Impact",
          text: "Our goal is your license in record time.",
          color: "text-pink-400",
          bg: "bg-pink-500/10",
          border: "border-pink-500/20",
          shadow: "shadow-pink-500/20",
          colSpan: "col-span-1 md:col-span-1" // Standard (could be wide if needed to fill row, but grid adjusts)
        }
      ]
    }
  };

  const pageContent = content[language] || content.en;
  const titleParts = pageContent.hero.title.split('. ');

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Enhanced Background with Noise + Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.01]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
          backgroundSize: '180px 180px'
        }}></div>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none opacity-60 mix-blend-screen" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none opacity-40 mix-blend-screen" />

      {/* Connecting Grid Lines - Visual Flow */}
      <div className="fixed inset-0 pointer-events-none max-w-6xl mx-auto px-6 z-0 hidden md:block">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
        <div className="absolute right-6 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-50"></div>
      </div>
      <Navbar onRequestAccess={() => setAuthModalOpen(true)} />

      <main className="relative z-10 pt-40 pb-20 flex-1">
        {/* Hero Section */}
        <div className="text-center mb-24 space-y-8 max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest animate-fade-in shadow-lg shadow-blue-500/10">
            <Sparkles size={14} className="animate-pulse" />
            <span>Our Mission</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight bg-gradient-to-b from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent drop-shadow-2xl tracking-tight">
            {titleParts[0]}.<br />
            <span className="text-4xl md:text-6xl text-indigo-200">{titleParts[1]}</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            {pageContent.hero.subtitle}
          </p>
        </div>

        {/* Manifesto Block (Story) */}
        <div className="max-w-4xl mx-auto px-6 mb-32 relative group">
          {/* Background Volume Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-[2.5rem] blur-3xl opacity-30 group-hover:opacity-50 transition duration-1000" />

          <div className="relative bg-[#0B1120]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-14 overflow-hidden shadow-2xl">
            {/* Spotlight / Top Highlight */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-50 blur-2xl pointer-events-none" />

            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
            }} />

            {/* Inner Border Top Highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <div className="relative z-10 flex flex-col gap-10">
              {/* Header */}
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-8 leading-tight tracking-tight drop-shadow-lg">
                  {language === 'ru' ? (
                    <>
                      Skily родился из <span className="text-blue-400 inline-block border-b-2 border-blue-500/30 pb-1">боли</span>.
                    </>
                  ) : (
                    <>
                      Skily was born from <span className="text-blue-400 inline-block border-b-2 border-blue-500/30 pb-1">pain</span>.
                    </>
                  )}
                </h2>

                {/* Body Text with Emotional Highlights */}
                <div className="space-y-6 text-lg md:text-xl text-slate-400 leading-relaxed font-light">
                  <p>
                    {language === 'ru' ?
                      <>Устаревшие учебники, бюрократический язык, скучные лекции. В новой стране получение прав часто превращается в <span className="text-blue-200 font-normal">ад</span>.</> :
                      "Outdated textbooks, bureaucratic language, boring lectures. In a new country, getting a license often turns into <span class='text-blue-200 font-normal'>hell</span>."}
                  </p>
                  <p>
                    {language === 'ru' ?
                      <>Мы — команда экспатов, которые прошли через это. Мы решили исправить это с помощью <span className="text-blue-200 font-normal">технологий</span> и <span className="text-blue-200 font-normal">геймификации</span>.</> :
                      "We are a team of expats who went through this. We decided to fix it with technology and gamification."}
                  </p>
                  <p className="text-white font-medium border-l-2 border-blue-500/50 pl-4 italic opacity-90">
                    {language === 'ru' ? "Мы здесь, чтобы вы сдали экзамен играючи, а не страдая." : "We are here to help you pass the exam playfully, not painfully."}
                  </p>
                </div>
              </div>

              {/* Footer / Sign-off */}
              <div className="flex items-end justify-between border-t border-white/5 pt-8 mt-2">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 ring-1 ring-white/5">
                    <Sparkles size={18} className="text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Que tengas suerte</span>
                    <span className="text-sm font-bold text-white">Est. 2025</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-white font-serif italic mb-1 opacity-80 text-lg">— {language === 'ru' ? 'Основатели Skily' : 'The Skily Founders'}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Barcelona</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Block with Glowing Background */}
        <div className="max-w-[1400px] mx-auto px-6 relative">
          {/* Blurred colored orbs behind stats */}
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2"></div>
          <StatsBlock />
        </div>

        {/* Values Grid - Glassmorphism Bento Grid */}
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-32 relative z-10">
          {pageContent.values.map((val: any, i: number) => (
            <div key={i} className={cn(
              "group p-8 rounded-3xl border bg-[#0B1120]/60 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 flex flex-col relative overflow-hidden",
              "border-white/5 hover:border-white/20",
              `hover:shadow-2xl hover:${val.shadow}`,
              val.colSpan || "col-span-1"
            )}>
              {/* Double border: inner top highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              {/* Aurora Inner Glow */}
              <div className={cn(
                "absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none",
                val.bg.replace('/10', '/20')
              )} />

              {/* Icon with Glassy Background */}
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 shadow-lg ring-1 ring-white/10 backdrop-blur-md relative z-10",
                val.bg, val.color
              )}>
                <val.icon size={28} strokeWidth={1.5} />
              </div>

              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all tracking-tight">
                  {val.title}
                </h3>
                <p className="text-slate-400 leading-relaxed text-base font-light group-hover:text-slate-300 transition-colors">
                  {val.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Marquee Social Proof */}
        <div className="max-w-[100vw] overflow-hidden">
          <InfiniteMarquee />
        </div>

        {/* Final CTA with Animated Blob */}
        <div className="max-w-4xl mx-auto px-6 relative">
          {/* Animated blur blob */}
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-[120px] rounded-full animate-[float_8s_ease-in-out_infinite] pointer-events-none"></div>
          <FinalCTA onRequestAccess={() => setAuthModalOpen(true)} />
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(30px, -30px) scale(1.1); }
          }
        `}</style>

      </main>

      <Footer copy={copy} />

      <Suspense fallback={null}>
        <AuthModalNew open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </Suspense>
    </div>
  );
}
