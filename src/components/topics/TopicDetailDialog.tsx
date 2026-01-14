import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Play,
    CheckCircle2,
    AlertCircle,
    Lock,
    Trophy,
    FileText,
    ChevronRight,
    RefreshCcw
} from 'lucide-react';
import { motion } from '@/components/optimized/Motion';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface TopicLevel {
    id: string;
    level: number;
    label: string;
    questionRange: string;
    questionIds: string[];
    status: 'locked' | 'available' | 'in-progress' | 'completed' | 'has-errors';
    progress?: number;
    errorCount?: number;
    accuracy?: number;
}

interface TopicDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    topicId: string;
    topicName: string;
    topicCount: number;
    allQuestionIds: string[];
    userProgress?: {
        completedQuestionIds: string[];
        errorQuestionIds: string[];
    };
    country: string;
}

const QUESTIONS_PER_TICKET = 30; // Билеты по 30 вопросов

export function TopicDetailDialog({
    open,
    onOpenChange,
    topicId,
    topicName,
    topicCount,
    allQuestionIds,
    userProgress,
    country
}: TopicDetailDialogProps) {
    const navigate = useNavigate();
    const isDesktop = useMediaQuery('(min-width: 768px)');

    // Генерируем виртуальные билеты по 30 вопросов
    const tickets = useMemo((): TopicLevel[] => {
        const totalTickets = Math.ceil(topicCount / QUESTIONS_PER_TICKET);

        return Array.from({ length: totalTickets }).map((_, index) => {
            const start = index * QUESTIONS_PER_TICKET;
            const end = Math.min(start + QUESTIONS_PER_TICKET, topicCount);
            const ticketQuestionIds = allQuestionIds.slice(start, end);

            // Вычисляем статус билета
            const completedCount = ticketQuestionIds.filter(qId =>
                userProgress?.completedQuestionIds.includes(qId)
            ).length;
            const errorCount = ticketQuestionIds.filter(qId =>
                userProgress?.errorQuestionIds.includes(qId)
            ).length;

            const progress = (completedCount / ticketQuestionIds.length) * 100;
            const accuracy = completedCount > 0 ? ((completedCount - errorCount) / completedCount) * 100 : 0;

            let status: TopicLevel['status'] = 'available';
            // НЕ блокируем билеты - все доступны сразу

            if (progress === 100) {
                status = errorCount > 0 ? 'has-errors' : 'completed';
            } else if (progress > 0) {
                status = 'in-progress';
            }

            return {
                id: `${topicId}-ticket-${index + 1}`,
                level: index + 1,
                label: `Билет ${index + 1}`,
                questionRange: `${start + 1}—${end}`,
                questionIds: ticketQuestionIds,
                status,
                progress,
                errorCount,
                accuracy
            };
        });
    }, [topicCount, allQuestionIds, userProgress, topicId]);

    // Общий прогресс
    const overallProgress = useMemo(() => {
        const totalQuestions = topicCount;
        const completedQuestions = userProgress?.completedQuestionIds.length || 0;
        return (completedQuestions / totalQuestions) * 100;
    }, [topicCount, userProgress]);

    const handleStartTicket = (ticket: TopicLevel) => {
        // Переходим к тесту с фильтрацией по вопросам этого билета
        navigate(`/test/practice?topicId=${topicId}&topic=${encodeURIComponent(topicName)}&count=${QUESTIONS_PER_TICKET}&level=${ticket.level}&country=${country}`);
        onOpenChange(false);
    };

    const getLevelIcon = (status: TopicLevel['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'has-errors':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'in-progress':
                return <Play className="w-5 h-5 text-blue-500" />;
            case 'locked':
                return <Lock className="w-5 h-5 text-zinc-400" />;
            default:
                return <FileText className="w-5 h-5 text-zinc-400" />;
        }
    };

    const getLevelBadgeText = (level: TopicLevel) => {
        switch (level.status) {
            case 'completed':
                return level.errorCount === 0 ? '✓ Идеально' : `${level.errorCount} ошибок`;
            case 'has-errors':
                return `${level.errorCount} ошибок`;
            case 'in-progress':
                return `${Math.round(level.progress || 0)}%`;
            case 'locked':
                return 'Заблокирован';
            default:
                return 'Доступен';
        }
    };

    const getLevelButtonText = (level: TopicLevel) => {
        switch (level.status) {
            case 'completed':
                return level.errorCount === 0 ? 'Повторить' : 'Улучшить результат';
            case 'has-errors':
                return 'Улучшить результат';
            case 'in-progress':
                return 'Продолжить';
            default:
                return 'Начать';
        }
    };

    const content = (
        <div className="space-y-6">
            {/* Прогресс темы */}
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Общий прогресс</p>
                        <p className="text-2xl font-bold">{Math.round(overallProgress)}%</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-500/10">
                        <Trophy className="w-6 h-6 text-blue-500" />
                    </div>
                </div>
                <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>
            </Card>

            {/* GRID билетов (как в РФ версии) */}
            <div className="space-y-2 sm:space-y-4">
                <div className="relative py-1.5 sm:py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-background px-3 sm:px-4 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400 dark:text-slate-500">
                            Выбор билета
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                    {tickets.map((ticket, i) => {
                        const isCompleted = ticket.status === 'completed';
                        const hasErrors = ticket.status === 'has-errors';
                        const isInProgress = ticket.status === 'in-progress';

                        let status: 'idle' | 'charging' | 'charged' | 'damaged' = 'idle';
                        const progress = ticket.progress || 0;

                        if (isCompleted) {
                            status = 'charged';
                        } else if (hasErrors && isInProgress) {
                            status = 'damaged';
                        } else if (isInProgress || progress > 0) {
                            status = 'charging';
                        }

                        const radius = 28; // Уменьшен для мобильных
                        const circumference = 2 * Math.PI * radius;
                        const offset = circumference - (progress / 100) * circumference;

                        return (
                            <motion.div
                                key={ticket.id}
                                layout
                                whileHover={{ y: -5, scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleStartTicket(ticket)}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className={cn(
                                    "relative aspect-square rounded-xl sm:rounded-[1.5rem] overflow-hidden cursor-pointer group transition-all duration-500",
                                    "border shadow-md sm:shadow-lg",
                                    status === 'idle' && "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600",
                                    status === 'charging' && "bg-orange-100 dark:bg-orange-900/40 border-orange-400 dark:border-orange-500 shadow-orange-500/30",
                                    status === 'charged' && "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-500 shadow-emerald-500/30",
                                    status === 'damaged' && "bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-500 shadow-red-500/30"
                                )}
                            >
                                {/* Cyber pattern */}
                                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08] pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />

                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3">
                                    {/* Top Label */}
                                    <span className={cn(
                                        "text-[8px] sm:text-[10px] font-black tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-colors duration-500 mb-1 sm:mb-2",
                                        status === 'idle' ? "text-slate-500 dark:text-slate-400" : "text-slate-600 dark:text-slate-300"
                                    )}>
                                        Билет
                                    </span>

                                    <div className="relative flex items-center justify-center">
                                        {/* Progress Ring */}
                                        {status !== 'idle' && progress > 0 && (
                                            <svg className="absolute w-16 h-16 sm:w-20 sm:h-20 -rotate-90 pointer-events-none">
                                                <circle
                                                    cx="50%"
                                                    cy="50%"
                                                    r={radius}
                                                    fill="transparent"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    className="text-slate-200/20 dark:text-white/5"
                                                />
                                                <motion.circle
                                                    cx="50%"
                                                    cy="50%"
                                                    r={radius}
                                                    fill="transparent"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    strokeDasharray={circumference}
                                                    initial={{ strokeDashoffset: circumference }}
                                                    animate={{ strokeDashoffset: offset }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    strokeLinecap="round"
                                                    className={cn(
                                                        status === 'charged' ? "text-emerald-500" :
                                                            status === 'damaged' ? "text-red-500" :
                                                                "text-orange-500",
                                                        "drop-shadow-[0_0_8px_currentColor]"
                                                    )}
                                                />
                                            </svg>
                                        )}

                                        <span className={cn(
                                            "text-2xl sm:text-3xl md:text-4xl font-black transition-all duration-500 font-display",
                                            status === 'idle'
                                                ? "text-slate-300 dark:text-slate-700 group-hover:text-slate-900 dark:group-hover:text-slate-400"
                                                : "text-slate-900 dark:text-white drop-shadow-sm",
                                            status === 'charged' && "text-emerald-500 dark:text-emerald-400",
                                            status === 'damaged' && "text-red-500 dark:text-red-400"
                                        )}>
                                            {ticket.level}
                                        </span>
                                    </div>

                                    {/* Status Indicator */}
                                    <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col items-center justify-center gap-0.5 sm:gap-1">
                                        {status === 'charged' && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-black uppercase text-emerald-500 tracking-wide sm:tracking-wider"
                                            >
                                                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                Пройден
                                            </motion.div>
                                        )}
                                        {ticket.errorCount > 0 && status !== 'idle' && (
                                            <div className="text-[9px] sm:text-[10px] font-black text-red-500/80 tracking-wide">
                                                {ticket.errorCount} ош.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden bg-background">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{topicName}</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            {topicCount} вопросов · {tickets.length} билетов
                        </p>
                    </DialogHeader>
                    <div className="overflow-y-auto pr-2 bg-background">
                        {content}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[90vh] bg-background">
                <DrawerHeader className="border-b border-border">
                    <DrawerTitle className="text-xl font-bold">{topicName}</DrawerTitle>
                    <p className="text-sm text-muted-foreground">
                        {topicCount} вопросов · {tickets.length} билетов
                    </p>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto bg-background">
                    {content}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
