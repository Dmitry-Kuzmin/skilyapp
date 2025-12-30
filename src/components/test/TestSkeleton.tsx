/**
 * Красивый скелетон загрузки теста
 * Показывается пока грузятся вопросы
 */

import { motion } from '@/components/optimized/Motion';
import { Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestSkeletonProps {
    mode?: 'exam-russia' | 'exam' | 'practice' | 'blitz';
}

export const TestSkeleton = ({ mode = 'practice' }: TestSkeletonProps) => {
    const isExamRussia = mode === 'exam-russia';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Header Skeleton */}
            <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="h-10 w-24 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-xl animate-pulse" />
                    <div className="h-10 flex-1 max-w-md bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-xl animate-pulse" />
                    <div className="h-10 w-32 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
                {/* Loading Animation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <motion.div
                        animate={{
                            rotateY: [0, 360],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl shadow-blue-500/50 mb-4"
                    >
                        <Brain className="w-10 h-10 text-white" />
                    </motion.div>

                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        {isExamRussia ? 'Подготовка экзамена...' : 'Загрузка вопросов...'}
                    </h3>

                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {isExamRussia
                            ? 'Формируем билет из 20 вопросов + резерв для штрафных'
                            : 'Секундочку, собираем всё самое интересное'}
                    </p>
                </motion.div>

                {/* Question Card Skeleton */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden"
                >
                    {/* Image Skeleton */}
                    <div className="relative w-full aspect-video bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 overflow-hidden">
                        <motion.div
                            animate={{
                                x: ['-100%', '100%'],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
                        />
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Question Text Skeleton */}
                        <div className="space-y-3">
                            <div className="h-6 w-3/4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse" />
                            <div className="h-6 w-full bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse" />
                            <div className="h-6 w-2/3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse" />
                        </div>

                        {/* Answer Options Skeleton */}
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className={cn(
                                        "h-16 bg-gradient-to-r rounded-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden relative",
                                        i === 1 && "from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10",
                                        i === 2 && "from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10",
                                        i === 3 && "from-pink-50 to-pink-100/50 dark:from-pink-900/20 dark:to-pink-800/10",
                                        i === 4 && "from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10"
                                    )}
                                >
                                    <motion.div
                                        animate={{
                                            x: ['-100%', '100%'],
                                        }}
                                        transition={{
                                            duration: 1.5,
                                            repeat: Infinity,
                                            ease: "linear",
                                            delay: i * 0.2
                                        }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent"
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Button Skeleton */}
                    <div className="p-6 pt-0">
                        <div className="h-14 w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-600/30 dark:to-purple-600/30 rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/20 animate-pulse" />
                    </div>
                </motion.div>

                {/* Progress Indicators */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 flex items-center justify-center gap-2"
                >
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                            className="w-2 h-2 rounded-full bg-blue-500"
                        />
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
