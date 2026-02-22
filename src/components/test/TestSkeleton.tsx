/**
 * Современный тёмный загрузочный экран (прелоадер)
 * Фокусируется на фишках Skily, а не на ПДД
 */

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { Sparkles, Zap, Shield, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestSkeletonProps {
    mode?: 'exam-russia' | 'exam' | 'practice' | 'blitz';
    language?: 'ru' | 'es' | 'en';
}

const TIPS_BY_LANG = {
    ru: [
        { text: "Бросайте вызов друзьям в Дуэлях! Победы приносят больше XP и поднимают в лиге.", icon: <Zap className="w-5 h-5 text-yellow-400" /> },
        { text: "Smart Review: Банк ошибок запоминает все слабые места для прицельной отработки.", icon: <Shield className="w-5 h-5 text-blue-400" /> },
        { text: "Не теряйте Streak! Заходите ежедневно, чтобы активировать множитель очков.", icon: <Zap className="w-5 h-5 text-orange-400" /> },
        { text: "Режим мастера: Пройдите тест без единой ошибки и получите уникальное достижение.", icon: <Trophy className="w-5 h-5 text-purple-400" /> },
        { text: "AI-Наставник всегда готов помочь. Разбирайте сложные перекрестки за секунды.", icon: <Sparkles className="w-5 h-5 text-cyan-400" /> },
        { text: "Обучение может быть веселым! Пробуйте наши мини-игры для быстрого запоминания знаков.", icon: <Sparkles className="w-5 h-5 text-emerald-400" /> }
    ],
    es: [
        { text: "¡Desafía a tus amigos en Duelos! Las victorias otorgan más XP.", icon: <Zap className="w-5 h-5 text-yellow-400" /> },
        { text: "Smart Review: El Banco de Errores recopila tus fallos para practicar mejor.", icon: <Shield className="w-5 h-5 text-blue-400" /> },
        { text: "¡Mantén tu racha! 3 días seguidos activan un multiplicador de puntos.", icon: <Zap className="w-5 h-5 text-orange-400" /> },
        { text: "Modo Maestro: Completa el test sin fallos para conseguir logros únicos.", icon: <Trophy className="w-5 h-5 text-purple-400" /> },
        { text: "El Asistente IA siempre está listo para explicarte temas difíciles al instante.", icon: <Sparkles className="w-5 h-5 text-cyan-400" /> },
        { text: "¡Aprender puede ser divertido! Prueba nuestros minijuegos para memorizar señales rápidamente.", icon: <Sparkles className="w-5 h-5 text-emerald-400" /> }
    ],
    en: [
        { text: "Challenge friends in Duels! Victories grant more XP and rank you up.", icon: <Zap className="w-5 h-5 text-yellow-400" /> },
        { text: "Smart Review: The Mistake Bank collects your flaws for targeted practice.", icon: <Shield className="w-5 h-5 text-blue-400" /> },
        { text: "Keep your Streak! Log in daily to activate the score multiplier.", icon: <Zap className="w-5 h-5 text-orange-400" /> },
        { text: "Master Mode: Complete the test flawless to get a unique achievement.", icon: <Trophy className="w-5 h-5 text-purple-400" /> },
        { text: "AI Mentor is always ready to explain difficult questions instantly.", icon: <Sparkles className="w-5 h-5 text-cyan-400" /> },
        { text: "Learning can be fun! Try our minigames to memorize traffic signs quickly.", icon: <Sparkles className="w-5 h-5 text-emerald-400" /> }
    ]
};

export const TestSkeleton = ({ mode = 'practice', language = 'es' }: TestSkeletonProps) => {
    const isExamRussia = mode === 'exam-russia';
    const effectiveLang = isExamRussia ? 'ru' : language;
    const tips = TIPS_BY_LANG[effectiveLang] || TIPS_BY_LANG.es;

    // Rotating tips dynamically every few seconds
    const [tipIndex, setTipIndex] = useState(Math.floor(Math.random() * tips.length));

    useEffect(() => {
        const interval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % tips.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [tips.length]);

    const currentTip = tips[tipIndex];

    return (
        <div className="fixed inset-0 z-50 bg-[#06080F] flex flex-col items-center justify-center overflow-hidden font-sans">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Central Loader Core */}
            <div className="relative flex flex-col items-center justify-center w-full max-w-2xl px-6">

                {/* Cyber-Ring Animation Container */}
                <div className="relative w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center mb-16">
                    {/* Ring 1 - Outer Slow */}
                    <div className="absolute inset-0 rounded-full border border-white/5 border-t-indigo-500 animate-[spin_4s_linear_infinite]" />

                    {/* Ring 2 - Inner Fast Reverse */}
                    <div className="absolute inset-6 md:inset-8 rounded-full border border-white/5 border-b-purple-500 animate-[spin_2.5s_linear_infinite_reverse] shadow-[0_0_15px_rgba(168,85,247,0.1)]" />

                    {/* Ring 3 - Dashed Core */}
                    <div className="absolute inset-12 md:inset-16 outline outline-1 outline-dashed outline-white/10 rounded-full animate-[spin_10s_linear_infinite]" />

                    {/* Logo & Status Text exactly in the middle */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-10"
                    >
                        <span className="text-white/40 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase mb-2">
                            Skily System
                        </span>
                        <div className="h-px w-12 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent mb-2" />
                        <span className="text-white/90 text-sm md:text-base font-medium tracking-[0.2em] uppercase blur-[0.3px]">
                            {effectiveLang === 'ru' ? 'Инициализация...' : (effectiveLang === 'en' ? 'Initializing...' : 'Inicializando...')}
                        </span>
                    </motion.div>
                </div>

                {/* Rotating Skily Feature Tips */}
                <div className="relative h-24 w-full flex items-center justify-center -mt-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tipIndex}
                            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
                        >
                            <div className="flex items-center gap-3 mb-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)]">
                                {currentTip.icon}
                                <span className="text-xs font-bold tracking-widest text-white/50 uppercase">
                                    {effectiveLang === 'ru' ? 'Секрет Skily' : (effectiveLang === 'en' ? 'Skily Secret' : 'Secreto Skily')}
                                </span>
                            </div>
                            <p className="text-sm md:text-base text-white/80 max-w-md font-medium leading-relaxed drop-shadow-md">
                                {currentTip.text}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

            </div>

            {/* Bottom Cyber Decoration */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30">
                <div className="flex gap-1 mb-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
                <div className="text-[9px] font-mono tracking-[0.5em] text-white/50">
                    S K I L Y  V 2 . 0
                </div>
            </div>
        </div>
    );
};

