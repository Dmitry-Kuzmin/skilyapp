import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, XCircle, Zap, ArrowRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { playClickSound, playSuccessSound, playErrorSound } from '@/services/audioService';

interface Question {
    id: number;
    text: { ru: string; es: string };
    options: Array<{ ru: string; es: string; isCorrect: boolean }>;
}

const REHAB_QUESTIONS: Question[] = [
    {
        id: 1,
        text: {
            ru: "Что означает желтый мигающий сигнал светофора?",
            es: "¿Qué significa una luz amarilla intermitente en un semáforo?"
        },
        options: [
            { ru: "Обязательная остановка", es: "Parada obligatoria", isCorrect: false },
            { ru: "Разрешает движение, предупреждая об опасности", es: "Permite el paso con precaución", isCorrect: true },
            { ru: "Запрещает движение", es: "Prohíbe el paso", isCorrect: false }
        ]
    },
    {
        id: 2,
        text: {
            ru: "Какова максимальная скорость в городе по умолчанию (Испания)?",
            es: "¿Cuál es la velocidad máxima genérica en ciudad (España)?"
        },
        options: [
            { ru: "50 км/ч (или 30 км/ч на улицах с одной полосой)", es: "50 km/h (o 30 km/h en vías de un solo carril)", isCorrect: true },
            { ru: "60 км/ч", es: "60 km/h", isCorrect: false },
            { ru: "40 км/ч", es: "40 km/h", isCorrect: false }
        ]
    },
    {
        id: 3,
        text: {
            ru: "Можно ли использовать мобильный телефон без системы hands-free?",
            es: "¿Está permitido usar el móvil sin sistema manos libres?"
        },
        options: [
            { ru: "Только в пробке", es: "Solo en atascos", isCorrect: false },
            { ru: "Нет, никогда во время движения", es: "No, nunca durante la conducción", isCorrect: true },
            { ru: "Да, если разговор короткий", es: "Sí, si la llamada es corta", isCorrect: false }
        ]
    }
];

interface RehabilitationTestProps {
    language: 'ru' | 'es' | 'en';
    onComplete: () => void;
    onCancel: () => void;
}

export const RehabilitationTest: React.FC<RehabilitationTestProps> = ({
    language,
    onComplete,
    onCancel
}) => {
    const { t } = useLanguage();
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const lang = (language === 'ru' ? 'ru' : 'es') as 'ru' | 'es';
    const currentQuestion = REHAB_QUESTIONS[currentStep];

    const handleOptionSelect = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);

        const isCorrect = currentQuestion.options[index].isCorrect;
        if (isCorrect) {
            setScore(prev => prev + 1);
            playSuccessSound();
        } else {
            playErrorSound();
        }

        setTimeout(() => {
            if (currentStep < REHAB_QUESTIONS.length - 1) {
                setCurrentStep(prev => prev + 1);
                setSelectedOption(null);
                setIsAnswered(false);
            } else {
                setIsFinished(true);
            }
        }, 1200);
    };

    const isPassed = score === REHAB_QUESTIONS.length;

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 bg-zinc-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl">
            {!isFinished ? (
                <div className="w-full space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            {t('dashboard.rehab.title')} {currentStep + 1}/{REHAB_QUESTIONS.length}
                        </span>
                        <div className="h-1 flex-1 mx-4 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-indigo-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentStep + 1) / REHAB_QUESTIONS.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-tight">
                        {currentQuestion.text[lang]}
                    </h3>

                    <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = option.isCorrect;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionSelect(idx)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "w-full p-4 rounded-2xl text-left text-sm font-medium transition-all duration-200 border",
                                        !isAnswered && "bg-zinc-800/50 border-white/5 hover:border-white/20 hover:bg-zinc-800",
                                        isAnswered && isCorrect && "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
                                        isAnswered && isSelected && !isCorrect && "bg-red-500/20 border-red-500/50 text-red-400",
                                        isAnswered && !isSelected && "opacity-40"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{option[lang]}</span>
                                        {isAnswered && isCorrect && <CheckCircle2 size={16} />}
                                        {isAnswered && isSelected && !isCorrect && <XCircle size={16} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center text-center space-y-6"
                    >
                        {isPassed ? (
                            <>
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                                    <Trophy size={40} className="text-emerald-500 animate-bounce" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                        {t('dashboard.rehab.passed.title')}
                                    </h2>
                                    <p className="text-zinc-400 text-sm mt-2">
                                        {t('dashboard.rehab.passed.desc')}
                                    </p>
                                </div>
                                <button
                                    onClick={onComplete}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    {t('dashboard.rehab.passed.button')}
                                    <ArrowRight size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                                    <ShieldAlert size={40} className="text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                                        {t('dashboard.rehab.failed.title')}
                                    </h2>
                                    <p className="text-zinc-400 text-sm mt-2">
                                        {t('dashboard.rehab.failed.desc')}
                                    </p>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 border border-white/10"
                                >
                                    {t('dashboard.rehab.failed.button')}
                                </button>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
};
