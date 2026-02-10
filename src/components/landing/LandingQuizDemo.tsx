import React, { useState, useRef, useEffect } from 'react';
import { Trophy, CheckCircle2, XCircle, ArrowRight, CornerDownLeft, Sparkles, Zap, AlertTriangle, Car, Shield, Activity, Info, Headphones, BookOpen, Brain, Swords } from 'lucide-react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { playClickSound, playSuccessSound, playErrorSound, playLevelUpSound } from '@/services/audioService';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";

interface LandingQuizDemoProps {
    onRegisterClick: () => void;
    language: 'ru' | 'es' | 'en';
}

// Robust fallback illustrations instead of external images
const QuestionIllustration = ({ type, variant }: { type: string, variant: 'blue' | 'indigo' | 'orange' }) => {
    const gradients = {
        blue: "from-blue-600/20 to-cyan-500/20",
        indigo: "from-indigo-600/20 to-purple-500/20",
        orange: "from-orange-600/20 to-red-500/20"
    };

    const borders = {
        blue: "border-blue-500/30",
        indigo: "border-indigo-500/30",
        orange: "border-orange-500/30"
    };

    return (
        <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br relative overflow-hidden", gradients[variant])}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

            {/* Abstract Road Lines */}
            <div className="absolute top-1/2 left-0 right-0 h-20 -translate-y-1/2 bg-slate-900/40 -skew-x-12 transform origin-left md:scale-125"></div>
            <div className="absolute top-1/2 left-1/4 right-1/4 h-2 -translate-y-1/2 border-t-4 border-dashed border-white/20"></div>

            <div className={cn("relative z-10 w-24 h-24 rounded-3xl flex items-center justify-center backdrop-blur-md shadow-2xl border bg-slate-900/60", borders[variant])}>
                {type === 'speed' && <Activity size={48} className="text-blue-400" />}
                {type === 'roundabout' && <Car size={48} className="text-indigo-400" />}
                {type === 'horn' && <AlertTriangle size={48} className="text-orange-400" />}
            </div>
        </div>
    );
};

const DEMO_QUESTIONS_DATA = {
    ru: [
        {
            id: 'ru-q1',
            question: 'Разрешен ли обгон (опережение) на перекрестке с круговым движением?',
            imageUrl: '/images/demo/es/q1.png',
            illustrationType: 'roundabout',
            illustrationVariant: 'indigo',
            aiAnalysis: {
                title: 'Правило круга',
                text: 'Да! Круговое движение — это исключение. Хотя обычно обгон на перекрестках запрещен, на "кольце" можно опережать другие машины, если это безопасно. 🔄',
                mood: 'happy'
            },
            answers: [
                { id: '1', text: 'Нет.', isCorrect: false },
                { id: '2', text: 'Да.', isCorrect: true },
                { id: '3', text: 'Да, но только по правой полосе.', isCorrect: false },
            ]
        },
        {
            id: 'ru-q2',
            question: 'Может ли один мотоцикл обогнать другой в этом повороте с ограниченной видимостью?',
            imageUrl: '/images/demo/es/q2.png',
            illustrationType: 'speed',
            illustrationVariant: 'orange',
            aiAnalysis: {
                title: 'Точный маневр',
                text: 'Верно. Мотоциклы узкие, поэтому они могут разъехаться в пределах одной полосы. Главное — не зацепить встречную полосу ("стену смерти")! 🏍️',
                mood: 'thinking'
            },
            answers: [
                { id: '1', text: 'Нет, на поворотах с ограниченной видимостью обгон запрещен всегда.', isCorrect: false },
                { id: '2', text: 'Нет, так как нужно выезжать на встречку.', isCorrect: false },
                { id: '3', text: 'Да, если не выезжает на полосу встречного движения.', isCorrect: true },
            ]
        },
        {
            id: 'ru-q3',
            question: 'В данной ситуации может ли зеленый автомобиль обогнать белый?',
            imageUrl: '/images/demo/es/q3.png',
            illustrationType: 'speed',
            illustrationVariant: 'blue',
            aiAnalysis: {
                title: 'Встречная угроза',
                text: 'Стоп! Прерывистая линия разрешает, но встречная машина — нет. Безопасность важнее разметки. Нельзя обгонять, если "встречка" занята. 🚫',
                mood: 'concerned'
            },
            answers: [
                { id: '1', text: 'Нет, потому что смена полосы запрещена.', isCorrect: false },
                { id: '2', text: 'Нет, так как есть встречные транспортные средства.', isCorrect: true },
                { id: '3', text: 'Нет, потому что разметка запрещает.', isCorrect: false },
            ]
        }
    ],
    es: [
        {
            id: 'es-q1',
            question: '¿Está permitido adelantar en una glorieta?',
            imageUrl: '/images/demo/es/q1.png',
            illustrationType: 'roundabout',
            illustrationVariant: 'indigo',
            aiAnalysis: {
                title: 'Regla de Glorietas',
                text: '¡Sí! Las glorietas son una excepción. Aunque normalmente está prohibido adelantar en intersecciones, en las glorietas se permite adelantar a otros vehículos si es seguro. 🔄',
                mood: 'happy'
            },
            answers: [
                { id: '1', text: 'No.', isCorrect: false },
                { id: '2', text: 'Sí.', isCorrect: true },
                { id: '3', text: 'Sí, pero solo por el carril derecho.', isCorrect: false },
            ]
        },
        {
            id: 'es-q2',
            question: '¿Puede adelantar una motocicleta a otra en esta curva de visibilidad reducida?',
            imageUrl: '/images/demo/es/q2.png',
            illustrationType: 'speed',
            illustrationVariant: 'orange',
            aiAnalysis: {
                title: 'Adelantamiento Preciso',
                text: 'Correcto. Las motos pueden adelantarse en curvas de poca visibilidad SIEMPRE que no invadan el sentido contrario. Al ser pequeñas, caben en el carril. 🏍️',
                mood: 'thinking'
            },
            answers: [
                { id: '1', text: 'No, en curvas de visibilidad reducida está prohibido siempre.', isCorrect: false },
                { id: '2', text: 'No, porque debe invadir el sentido contrario.', isCorrect: false },
                { id: '3', text: 'Sí, cuando mantiene la separación lateral reglamentaria y no ocupa el sentido contrario.', isCorrect: true },
            ]
        },
        {
            id: 'es-q3',
            question: 'En las circunstancias que se dan en la imagen, el vehículo verde, ¿puede adelantar al vehículo blanco?',
            imageUrl: '/images/demo/es/q3.png',
            illustrationType: 'speed',
            illustrationVariant: 'blue',
            aiAnalysis: {
                title: 'Peligro Frontal',
                text: '¡Alto! Aunque la línea sea discontinua, viene un coche azul de frente. La seguridad es prioritaria sobre la pintura en el suelo. 🚫',
                mood: 'concerned'
            },
            answers: [
                { id: '1', text: 'No, porque está prohibido cambiar de carril.', isCorrect: false },
                { id: '2', text: 'No, porque vienen vehículos en sentido contrario.', isCorrect: true },
                { id: '3', text: 'No, porque la marca vial prohíbe adelantar.', isCorrect: false },
            ]
        }
    ],
    en: [
        {
            id: 'en-q1',
            question: 'Is overtaking permitted in a roundabout?',
            imageUrl: '/images/demo/es/q1.png',
            illustrationType: 'roundabout',
            illustrationVariant: 'indigo',
            aiAnalysis: {
                title: 'Roundabout Rule',
                text: 'Yes! Roundabouts are an exception. While generally overtaking is banned at intersections, inside the roundabout you CAN overtake if safe. 🔄',
                mood: 'happy'
            },
            answers: [
                { id: '1', text: 'No.', isCorrect: false },
                { id: '2', text: 'Yes.', isCorrect: true },
                { id: '3', text: 'Yes, but only on the right lane.', isCorrect: false },
            ]
        },
        {
            id: 'en-q2',
            question: 'Can a motorcycle overtake another motorcycle in this curve with reduced visibility?',
            imageUrl: '/images/demo/es/q2.png',
            illustrationType: 'speed',
            illustrationVariant: 'orange',
            aiAnalysis: {
                title: 'Precision Maneuver',
                text: 'Correct. Motorcycles are narrow, so they can pass each other within the lane. The key is NEVER invading the opposite lane (the "wall"). 🏍️',
                mood: 'thinking'
            },
            answers: [
                { id: '1', text: 'No, overtaking is always prohibited in blind curves.', isCorrect: false },
                { id: '2', text: 'No, because it requires invading the opposite lane.', isCorrect: false },
                { id: '3', text: 'Yes, if it does not invade the opposite direction.', isCorrect: true },
            ]
        },
        {
            id: 'en-q3',
            question: 'Under these circumstances, can the green vehicle overtake the white one?',
            imageUrl: '/images/demo/es/q3.png',
            illustrationType: 'speed',
            illustrationVariant: 'blue',
            aiAnalysis: {
                title: 'Oncoming Danger',
                text: 'Stop! The broken line permits it, but the oncoming car DOES NOT. Safety overrides paint. Do not overtake if the opposite lane is busy. 🚫',
                mood: 'concerned'
            },
            answers: [
                { id: '1', text: 'No, because changing lanes is prohibited.', isCorrect: false },
                { id: '2', text: 'No, because vehicles are approaching.', isCorrect: true },
                { id: '3', text: 'No, because the road marking prohibits it.', isCorrect: false },
            ]
        }
    ]
};



const COMPLETION_CONTENT = {
    ru: {
        title: 'Это был лишь 1% возможностей Skily.',
        subtitle: 'В полной версии тебя ждет целая экосистема для сдачи экзамена.',
        cards: [
            { icon: Brain, title: 'Умный анализ', desc: 'AI выявляет слабые темы', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { icon: Headphones, title: 'Фокус-режим', desc: 'Lo-Fi музыка и озвучка', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
            { icon: Trophy, title: 'PvP Дуэли', desc: 'Соревнуйся с игроками', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { icon: BookOpen, title: 'Банк Ошибок', desc: 'Авто-разбор промахов', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
        ],
        cta: 'Начать бесплатно'
    },
    es: {
        title: 'Esto fue solo el 1% del poder de Skily.',
        subtitle: 'En la versión completa te espera todo un ecosistema para aprobar.',
        cards: [
            { icon: Brain, title: 'Análisis Inteligente', desc: 'IA detecta temas débiles', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { icon: Headphones, title: 'Modo Enfoque', desc: 'Música Lo-Fi y voz', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
            { icon: Trophy, title: 'Duelos PvP', desc: 'Compite con jugadores', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { icon: BookOpen, title: 'Banco de Errores', desc: 'Repaso automático', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
        ],
        cta: 'Probar gratis'
    },
    en: {
        title: 'This was just 1% of Skily capabilities.',
        subtitle: 'The full version offers a complete ecosystem for passing your exam.',
        cards: [
            { icon: Brain, title: 'Smart Analysis', desc: 'AI spots weak topics', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { icon: Headphones, title: 'Focus Mode', desc: 'Lo-Fi music & voice', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
            { icon: Trophy, title: 'PvP Duels', desc: 'Compete with players', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { icon: BookOpen, title: 'Mistake Bank', desc: 'Auto-review errors', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
        ],
        cta: 'Try for free'
    }
};





// Typewriter Component
const TypewriterText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        setDisplayedText(''); // Reset initially
        let i = 0;

        const timer = setInterval(() => {
            i++;
            if (i <= text.length) {
                setDisplayedText(text.slice(0, i));
            } else {
                clearInterval(timer);
                onComplete?.();
            }
        }, 30); // Typing speed

        return () => clearInterval(timer);
    }, [text]);

    return <span>{displayedText}</span>;
};

const MockAIWidget = ({ language, message, isTyping, status }: { language: string, message: any | null, isTyping: boolean, status: 'idle' | 'analyzing' | 'speaking' }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (message || isTyping) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [message, isTyping]);

    const t = {
        ru: { header: 'Skily AI Copilot', idle: 'Ожидаю твой ответ...', analyzing: 'Анализирую ситуацию...' },
        es: { header: 'Skily AI Copilot', idle: 'Esperando respuesta...', analyzing: 'Analizando situación...' },
        en: { header: 'Skily AI Copilot', idle: 'Waiting for answer...', analyzing: 'Analyzing situation...' }
    }[language as 'ru' | 'es' | 'en'] || { header: 'Skily AI', idle: 'Ready', analyzing: 'Thinking...' };

    return (
        <Card className="flex flex-col h-[520px] overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 shadow-2xl relative">
            {/* Grid Background in Widget */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center shrink-0 gap-3 relative z-10 bg-slate-900/20">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <LumiCharacter
                        size="sm"
                        mood={status === 'analyzing' ? 'thinking' : message?.mood === 'warning' ? 'concerned' : 'happy'}
                        className="scale-100 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    />
                </div>
                <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        {t.header}
                        <span className="flex h-2 w-2 relative">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", status === 'idle' ? 'bg-emerald-400' : 'bg-indigo-400')}></span>
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", status === 'idle' ? 'bg-emerald-500' : 'bg-indigo-500')}></span>
                        </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">v2.4 Online</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 relative z-10 scrollbar-none">
                {/* Welcome / Idle State */}
                {!message && !isTyping && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4 opacity-40">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Sparkles className="text-indigo-300" />
                        </div>
                        <p className="text-sm text-slate-400">{t.idle}</p>
                    </div>
                )}

                {/* Active Message */}
                <AnimatePresence mode="wait">
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex gap-4 items-start"
                        >
                            <div className="flex-1">
                                <div className={cn(
                                    "text-sm leading-relaxed p-4 rounded-2xl rounded-tl-none border shadow-lg backdrop-blur-md",
                                    message.mood === 'warning'
                                        ? "bg-red-500/10 border-red-500/30 text-rose-100 shadow-red-900/10"
                                        : "bg-indigo-500/10 border-indigo-500/30 text-indigo-100 shadow-indigo-900/10"
                                )}>
                                    {/* Fake Typewriter Effect */}
                                    <TypewriterText text={message.content} />
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 pl-2">
                                    <span className="uppercase tracking-wider">AI Analysis</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                    <span>Just now</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Futuristic Status Bar (Replaces Input) */}
            <div className="p-4 border-t border-white/5 shrink-0 bg-slate-900/40 backdrop-blur-md relative z-10">
                <div className="h-10 rounded-xl bg-black/20 border border-white/5 flex items-center px-4 justify-between">
                    <div className="flex items-center gap-3">
                        {status === 'analyzing' || isTyping ? (
                            <>
                                <div className="flex gap-1" aria-label="Loading">
                                    <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-indigo-400 rounded-full" />
                                    <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 bg-indigo-400 rounded-full" />
                                    <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 bg-indigo-400 rounded-full" />
                                </div>
                                <span className="text-xs font-mono text-indigo-300 animate-pulse">{t.analyzing}</span>
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-xs font-mono text-slate-500">{t.idle}</span>
                            </>
                        )}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                        TOKEN_MODE: <span className="text-emerald-500">FREE</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export const LandingQuizDemo: React.FC<LandingQuizDemoProps> = ({ onRegisterClick, language }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [showResult, setShowResult] = useState(false);

    // AI Mock State
    const [aiMessage, setAiMessage] = useState<any | null>(null);
    const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'speaking'>('idle');
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [currentStep]);

    const questions = DEMO_QUESTIONS_DATA[language];
    const currentQuestion = questions[currentStep];

    const handleAnswerClick = (id: string, isCorrect: boolean) => {
        if (showResult) return;

        setSelectedAnswerId(id);
        setShowResult(true);
        playClickSound();

        // Start AI Sequence
        setAiStatus('analyzing');
        setAiMessage(null);

        // Always use the predefined analysis
        const analysis = currentQuestion.aiAnalysis || { text: 'Analyzing...', mood: 'thinking' };

        if (isCorrect) {
            playSuccessSound();
        } else {
            playErrorSound();
        }

        setTimeout(() => {
            setAiStatus('speaking');

            let messageText = analysis.text;

            // Add celebratory prefix for correct answers
            if (isCorrect) {
                const prefix = {
                    ru: 'Ве-ли-ко-леп-но! Правильный ответ. ',
                    es: '¡Magnífico! Respuesta correcta. ',
                    en: 'Great job! Correct answer. '
                }[language] || '';

                messageText = prefix + messageText;
            }

            setAiMessage({
                role: 'assistant',
                content: messageText,
                mood: isCorrect ? 'happy' : (analysis.mood as any)
            });
        }, 1000);
    };

    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(prev => prev + 1);
            setSelectedAnswerId(null);
            setShowResult(false);
            setAiMessage(null);
            setAiStatus('idle');
        } else {
            setIsCompleted(true);
            playLevelUpSound();
        }
    };

    if (isCompleted) {
        const content = COMPLETION_CONTENT[language];

        return (
            <div className="max-w-5xl mx-auto px-4 animate-fade-in">
                <div className="bg-slate-900/90 border border-slate-800 rounded-[3rem] p-8 md:p-12 text-center relative overflow-hidden shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
                    {/* Background Ambience */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="mb-8">
                            <h3 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
                                {content.title}
                            </h3>
                            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                                {content.subtitle}
                            </p>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                            {content.cards.map((card, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={cn(
                                        "p-3 md:p-6 rounded-3xl border flex flex-col items-center justify-center text-center gap-2 transition-all hover:scale-105 hover:shadow-xl",
                                        "bg-slate-800/40 backdrop-blur-sm",
                                        card.border
                                    )}
                                >
                                    <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-1 shadow-lg", card.bg, card.color)}>
                                        <card.icon className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <h4 className="font-bold text-white text-sm md:text-lg leading-none">{card.title}</h4>
                                    <p className="text-[10px] md:text-xs text-slate-400 font-medium leading-tight">{card.desc}</p>
                                </motion.div>
                            ))}
                        </div>

                        <button
                            onClick={onRegisterClick}
                            className="w-full sm:w-auto px-6 sm:px-12 py-4 sm:py-5 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] animate-gradient text-white font-black hover:scale-105 transition-all shadow-[0_0_40px_rgba(79,70,229,0.4)] text-sm sm:text-lg flex items-center justify-center gap-2 mx-auto border border-white/10 group relative overflow-hidden whitespace-nowrap"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full"></div>
                            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 animate-pulse" />
                            <span className="relative z-10">{content.cta}</span>
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1500px] mx-auto px-2 sm:px-4">
            {/* Desktop Grid Layout: Question Left, AI Right */}
            {/* Changed xl:grid-cols to lg:grid-cols to show AI on smaller desktops */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

                {/* Main Question Card */}
                <Card className="p-0 overflow-hidden border-slate-800 shadow-2xl shadow-black/20 rounded-3xl bg-slate-900/80 backdrop-blur-sm border border-white/5">
                    <div className="flex flex-col lg:flex-row h-full">
                        {/* Illustration Area */}
                        <div className="lg:w-[45%] bg-slate-950 relative min-h-[240px] lg:min-h-[500px] border-r border-white/5 overflow-hidden">
                            {currentQuestion.imageUrl && !imageError ? (
                                <img
                                    src={currentQuestion.imageUrl}
                                    alt={currentQuestion.question}
                                    className="w-full h-full object-cover"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <QuestionIllustration
                                    type={currentQuestion.illustrationType}
                                    variant={currentQuestion.illustrationVariant as any}
                                />
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 md:p-10 flex flex-col bg-slate-900/60">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-8">
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-700">
                                    Question {currentStep + 1} / {questions.length}
                                </span>
                                <div className="flex items-center gap-2 text-xs font-mono">
                                    <span className="text-slate-500 bg-slate-800/50 px-2 py-1 rounded">ID: {currentQuestion.id.split('-')[1]}</span>
                                </div>
                            </div>

                            {/* Question Text */}
                            <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug mb-10">
                                {currentQuestion.question}
                            </h2>

                            {/* Options */}
                            <div className="space-y-3 flex-1">
                                {currentQuestion.answers.map((answer) => {
                                    const isSelected = selectedAnswerId === answer.id;
                                    const showStatus = showResult;
                                    const isCorrect = answer.isCorrect;
                                    const isWrongSelection = showStatus && isSelected && !isCorrect;

                                    let bgClass = "bg-slate-800/50 border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800 transition-all";
                                    let textClass = "text-slate-300";
                                    let activeDot = "bg-slate-600";

                                    if (showStatus) {
                                        if (isCorrect) {
                                            bgClass = "bg-green-500/10 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]";
                                            textClass = "text-green-300 font-medium";
                                            activeDot = "bg-green-500";
                                        } else if (isWrongSelection) {
                                            bgClass = "bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]";
                                            textClass = "text-red-300 font-medium";
                                            activeDot = "bg-red-500";
                                        } else {
                                            bgClass = "bg-slate-900/50 border-slate-800 opacity-40";
                                        }
                                    } else if (isSelected) {
                                        bgClass = "bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-500/50";
                                        textClass = "text-indigo-200";
                                        activeDot = "bg-indigo-500";
                                    }

                                    return (
                                        <button
                                            key={answer.id}
                                            onClick={() => handleAnswerClick(answer.id, answer.isCorrect)}
                                            disabled={showResult}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group relative overflow-hidden",
                                                bgClass
                                            )}
                                        >
                                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-black/20 transition-colors", activeDot)}>
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            </div>
                                            <span className={cn("text-base", textClass)}>
                                                {answer.text}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Next Button / Helper */}
                            <div className="mt-8 h-12 flex items-center justify-end">
                                {showResult && (
                                    <button
                                        onClick={handleNext}
                                        className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all animate-fade-in shadow-lg shadow-indigo-600/20"
                                    >
                                        <span>
                                            {language === 'ru' ? 'Далее' : language === 'es' ? 'Siguiente' : 'Next'}
                                        </span>
                                        <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Right Column: AI Widget Dashboard */}
                {/* Changed to hidden lg:block from xl:block */}
                <div className="hidden lg:block w-full sticky top-6">
                    <MockAIWidget
                        language={language}
                        message={aiMessage}
                        isTyping={aiStatus === 'speaking'}
                        status={aiStatus}
                    />
                </div>
            </div>

            {/* Mobile AI Feedback (fallback) */}
            <div className="lg:hidden mt-6">
                <AnimatePresence>
                    {aiMessage && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/90 backdrop-blur rounded-2xl p-5 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-900 rounded-full border border-slate-700">
                                    <LumiCharacter size="sm" mood={aiMessage.mood} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-indigo-300 mb-1 uppercase tracking-wider">Skily AI</p>
                                    <div className="text-slate-200 text-sm leading-relaxed">
                                        <TypewriterText text={aiMessage.content} />
                                    </div>
                                    {/* Mobile Next Button on Error */}
                                    {showResult && aiMessage.mood === 'warning' && (
                                        <button
                                            onClick={handleNext}
                                            className="mt-3 text-xs font-bold text-indigo-400 flex items-center gap-1 uppercase tracking-wider"
                                        >
                                            {language === 'ru' ? 'Далее' : 'Next'} <ArrowRight size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
