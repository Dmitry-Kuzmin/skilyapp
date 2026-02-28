import { useRef } from 'react';
import React, { useRef, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const MarqueeCard = React.memo((props: {
    name: string;
    country: string;
    text: string;
    rating?: number;
    metric?: string;
    date?: string;
    size?: 'small' | 'medium' | 'large' | 'wide';
    badge?: string;
    archetype?: 'parent' | 'expat' | 'gamer' | 'anxious' | 'fast' | 'celebration';
}) => {
    const {
        name,
        country,
        text,
        rating = 5,
        metric,
        date,
        size = 'medium',
        badge,
        archetype
    } = props;

    const cardRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    const widthClass =
        size === 'small' ? 'w-[260px]' :
            size === 'large' ? 'w-[420px] md:w-[480px]' :
                size === 'wide' ? 'w-[500px] md:w-[600px]' :
                    'w-[320px] md:w-[380px]';

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
                rootMargin: "200px"
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
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700",
                hoverGlow
            )} />

            <div className="relative z-10">
                {badge && (
                    <div className="mb-4 inline-block">
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-yellow-200 text-xs font-bold uppercase tracking-wider shadow-lg shadow-yellow-500/10">
                            {badge}
                        </span>
                    </div>
                )}

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

                <div className="flex gap-1 mb-4">
                    {[...Array(rating)].map((_, i) => (
                        <Star key={i} size={13} className="fill-yellow-400 text-yellow-400" />
                    ))}
                </div>

                <p className="text-slate-200 text-sm leading-relaxed mb-5 font-light">
                    "{text}"
                </p>

                {metric && (
                    <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm group-hover:border-white/20 transition-colors">
                        <div className="text-xs text-white font-bold tracking-wide">{metric}</div>
                    </div>
                )}

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

export const InfiniteMarquee = React.memo(() => {
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
                ? "В автошколе Валенсии на меня смотрели как на инопланетянина, когда я не понимал разницу между 'detención' и 'parada'. Skily AI перевел всё на человеческий русский за секунду. Без него я бы до сих пор сидел над тем учебником."
                : "At Valencia driving school they looked at me like an alien when I didn't understand 'detención' vs 'parada'. Skily AI translated everything to human language in seconds. Without it I'd still be stuck with that textbook.",
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
                : "Thought studying traffic rules would be deadly boring. But when some guy from Barcelona started beating me in Duels, I got seriously competitive. Learned all signs in three evenings just to beat him. Best EdTech experience ever!",
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
