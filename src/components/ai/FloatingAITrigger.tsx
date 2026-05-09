import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkilyAICharacter } from '@/components/skily-ai/SkilyAICharacter';
import { useAIChat } from '@/hooks/useAIChat';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles } from 'lucide-react';

interface FloatingAITriggerProps {
    questionContext: {
        question: string;
        correctAnswer: string;
        userAnswer?: string;
        isCorrect: boolean;
        explanation?: string | null;
        explanationRu?: string | null;
        explanationEs?: string | null;
        explanationEn?: string | null;
        topic?: string;
        imageUrl?: string | null;
        testLanguage?: 'es' | 'en' | 'ru';
        country?: 'spain' | 'russia';
    };
    isVisible: boolean;
}

/**
 * FloatingAITrigger — Профессиональный плавающий триггер для Skily AI.
 * Появляется на планшетах и средних экранах, где сайдбар скрыт,
 * чтобы обеспечить быстрый доступ к помощи без ущерба для пространства контента.
 */
export const FloatingAITrigger: React.FC<FloatingAITriggerProps> = ({ questionContext, isVisible }) => {
    const { openWithQuestion } = useAIChat();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    className="fixed bottom-6 right-6 z-[60] xl:hidden"
                >
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => openWithQuestion(questionContext)}
                                    className="relative group p-1 active:scale-95 transition-transform"
                                >
                                    {/* Animated Glow Aura */}
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full group-hover:bg-indigo-600/40 transition-all duration-700 animate-pulse" />
                                    <div className="absolute inset-0 bg-purple-500/10 blur-xl rounded-full group-hover:bg-purple-600/30 transition-all duration-700 delay-75" />
                                    
                                    {/* Main Bubble Container */}
                                    <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-3 rounded-full border border-white/20 dark:border-white/5 shadow-2xl flex items-center justify-center">
                                        <SkilyAICharacter size="sm" />
                                        
                                        {/* Status Indicator / Pulse */}
                                        <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border-2 border-white dark:border-slate-900 items-center justify-center">
                                                <Sparkles className="w-2 h-2 text-white" />
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Label appearing on hover (Desktop only hint) */}
                                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-white/5 shadow-xl opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 pointer-events-none hidden sm:block">
                                        <p className="text-xs font-bold whitespace-nowrap text-slate-800 dark:text-white flex items-center gap-2">
                                            Skily AI <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase">Help</span>
                                        </p>
                                    </div>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="end" className="sm:hidden">
                                <p>Skily AI Помощник</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
