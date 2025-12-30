import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Brain, Sparkles, ArrowRight, Lightbulb, Lock, BookOpen, Eye, AlertTriangle, Target, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Flashcard {
    question_id: string;
    trap_alert: string;      // "Ловушка: ты спутал X и Y!"
    explanation: string;     // Тот самый инсайт
    visual_focus: string;    // "Посмотри на синий знак справа..."
    difficulty_rating: string; // "Hardcore (72% ошибок)"
    mnemonic: string;        // "Ушел = Стоянка. Сидишь = Остановка."
    article: string;         // Пункт ПДД
}

interface ReflectionOverlayProps {
    /** Текущий ID вопроса для поиска нужной карточки */
    currentQuestionId: string;
    /** Массив всех flashcards (генерируется при старте Redemption) */
    flashcards: Flashcard[];
    /** Fallback: общий summary если карточка не найдена */
    fallbackSummary?: string;
    onClose: () => void;
    isFirstTime?: boolean;
}

export const ReflectionOverlay: React.FC<ReflectionOverlayProps> = ({
    currentQuestionId,
    flashcards,
    fallbackSummary = "Разбор концепции",
    onClose,
    isFirstTime = true
}) => {
    const [countdown, setCountdown] = useState(1);
    const [isReady, setIsReady] = useState(false);

    // Находим карточку для текущего вопроса
    const card = flashcards.find(f => f.question_id === currentQuestionId);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setIsReady(true);
        }
    }, [countdown]);

    // Функция для очистки и проверки строки статьи
    const isValidArticle = (art?: string) => {
        if (!art) return false;
        const normalized = art.toLowerCase();
        // Убираем заглушки, которые может вернуть ИИ
        if (normalized.includes('[') || normalized.includes('нумеро') || normalized.includes('artículo')) {
            // Если в строке только "Articulo" без цифр - это заглушка
            if (!/\d/.test(art)) return false;
        }
        return art.length > 2;
    };

    // Если карточки нет — упрощенный вид
    if (!card) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-transparent"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-white/20"
                >
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative">
                        <div className="flex items-center gap-2 mb-4">
                            <Lightbulb className="text-yellow-300 w-6 h-6" />
                            <span className="text-sm font-bold uppercase tracking-widest opacity-80">Reflection Protocol</span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight">{isFirstTime ? "Разбор концепции" : "Повторный анализ"}</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{fallbackSummary}</p>
                        </div>
                        <Button onClick={onClose} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg">ПОНЯЛ, Я ГОТОВ</Button>
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-transparent"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-200/50 dark:border-white/10"
            >
                {/* Header: Trap Alert & Difficulty */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white relative">
                    <div className="absolute top-4 right-4 opacity-10">
                        <Brain size={140} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                    <AlertTriangle className="text-amber-300 w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                                    Analysis Protocol
                                </span>
                            </div>
                            {card.difficulty_rating && (
                                <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
                                    <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">
                                        {card.difficulty_rating}
                                    </span>
                                </div>
                            )}
                        </div>

                        <h2 className="text-2xl font-black leading-tight mb-2 tracking-tight">
                            {card.trap_alert || "АНАЛИЗ ЛОВУШКИ"}
                        </h2>
                    </div>
                </div>

                {/* Content: Main Insight, Visual focus, Mnemonic */}
                <div className="p-8 space-y-6">
                    {/* Main Explanation */}
                    <div className="relative">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-indigo-500 rounded-full opacity-30" />
                        <p className="text-slate-700 dark:text-slate-200 font-semibold leading-snug text-lg">
                            {card.explanation}
                        </p>
                    </div>

                    {/* Visual Anchor */}
                    {card.visual_focus && (
                        <div className="bg-blue-500/5 dark:bg-blue-400/5 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                                <Eye className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Куда смотреть</span>
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                    {card.visual_focus}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Mnemonic - The "Cheat Code" (Yellow/Gold version) */}
                    {card.mnemonic && (
                        <div className="bg-amber-500/5 dark:bg-amber-400/5 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                                <Target className="text-amber-600 dark:text-amber-400 w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Инсайт / Мнемоника</span>
                                <p className="text-sm text-slate-700 dark:text-slate-200 font-bold italic">
                                    "{card.mnemonic}"
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-4 pt-2">
                        {isValidArticle(card.article) && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    {card.article}
                                </span>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {!isReady ? (
                                <motion.div
                                    key="countdown"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-[0.15em] text-[10px]"
                                >
                                    <Lock size={12} className="animate-pulse" />
                                    <span>Анализ... {countdown}s</span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="button"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full"
                                >
                                    <Button
                                        onClick={onClose}
                                        className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-[0_12px_24px_-8px_rgba(79,70,229,0.5)] group transition-all active:scale-[0.98]"
                                    >
                                        <span>ПОНЯЛ, Я ГОТОВ</span>
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
