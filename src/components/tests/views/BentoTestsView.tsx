import { motion } from "framer-motion";
import {
    BookOpen, Shuffle, Zap, Flame,
    History, AlertTriangle, Clock,
    ChevronRight, Trophy, Sparkles, Target, BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePremium } from "@/hooks/usePremium";
import { useState } from "react";

interface BentoTestsViewProps {
    topics: any[];
    stats: any;
    challengeBankCount: number;
    randomQuestionCount: number;
    setRandomQuestionCount: (val: number) => void;
    handleStartTest: (path: string) => void;
    handleTopicClick: (id: string) => void;
}

// --- Simplified Animation Variants (Performance Optimized) ---
const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
};

// --- Components ---

const BentoCard = ({
    children,
    className,
    onClick,
    gradient
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    gradient?: string;
}) => {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#18181b] to-[#121214] p-6 transition-all duration-200",
                onClick && "cursor-pointer hover:border-white/20 hover:shadow-xl hover:shadow-black/20 active:scale-[0.98]",
                className
            )}
            style={{ willChange: 'transform' }}
        >
            {/* Gradient Background */}
            {gradient && (
                <div
                    className="absolute inset-0 opacity-30"
                    style={{ background: gradient }}
                />
            )}

            {/* Content */}
            <div className="relative z-10 h-full">
                {children}
            </div>
        </div>
    );
};

const StatBadge = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => (
    <div className="flex items-center gap-3 bg-white/[0.08] rounded-xl p-3 border border-white/10 backdrop-blur-sm">
        <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
            <div className="text-[10px] text-white/50 uppercase font-bold tracking-wider">{label}</div>
            <div className="text-xl font-bold text-white leading-none mt-0.5">{value}</div>
        </div>
    </div>
);

export const BentoTestsView = ({
    topics,
    stats,
    challengeBankCount,
    randomQuestionCount,
    setRandomQuestionCount,
    handleStartTest,
    handleTopicClick
}: BentoTestsViewProps) => {
    const { isPremium } = usePremium();
    const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

    return (
        <div className="w-full flex justify-center pt-8 pb-20">
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                className="w-full max-w-[1370px] px-6 space-y-8"
            >
                {/* Header & Stats */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                            Центр тестирования
                        </h1>
                        <p className="text-white/60 text-base md:text-lg">
                            Выбирайте режим и улучшайте свои навыки
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <StatBadge icon={Target} label="Точность" value={`${stats.accuracy}%`} color="bg-blue-500/20" />
                        <StatBadge icon={BarChart3} label="Ответов" value={stats.totalAnswered} color="bg-emerald-500/20" />
                        <StatBadge icon={AlertTriangle} label="Ошибок" value={stats.errors} color="bg-red-500/20" />
                        <StatBadge icon={Trophy} label="Уровень" value="1" color="bg-amber-500/20" />
                    </div>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

                    {/* COLUMN 1: Main Actions (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Random Test - Hero Card */}
                        <BentoCard
                            className="group min-h-[340px] bg-gradient-to-br from-indigo-600 to-purple-700 border-indigo-500/20"
                            onClick={() => handleStartTest(`/test/practice?count=${randomQuestionCount}`)}
                        >
                            <div className="flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 text-white">
                                        <Shuffle className="w-7 h-7" />
                                    </div>
                                    <Badge className="bg-white/30 hover:bg-white/40 text-white border-none backdrop-blur-md font-bold px-3 py-1">
                                        HOT
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-3 leading-tight">Случайный тест</h3>
                                    <p className="text-white/90 mb-6 text-sm">
                                        Быстрая проверка знаний на случайных вопросах из всех тем.
                                    </p>

                                    <div className="flex items-center gap-2.5">
                                        {[10, 20, 30].map(count => (
                                            <button
                                                key={count}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRandomQuestionCount(count);
                                                }}
                                                className={cn(
                                                    "px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                                                    randomQuestionCount === count
                                                        ? "bg-white text-indigo-600 shadow-lg"
                                                        : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                                                )}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 transition-all duration-300">
                                    <div className="w-12 h-12 bg-white/30 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-xl border border-white/40">
                                        <ChevronRight className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </BentoCard>

                        {/* Exam Card */}
                        <BentoCard
                            className="min-h-[200px] bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-500/20"
                            onClick={() => handleStartTest("/test/exam")}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 bg-white/20 rounded-xl text-white backdrop-blur-sm">
                                    <Clock className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Экзамен DGT</h3>
                            <p className="text-white/80 text-sm mb-4">Полная симуляция экзамена</p>

                            <div className="flex gap-2">
                                <Badge variant="outline" className="border-white/30 bg-white/10 text-white font-medium">30 мин</Badge>
                                <Badge variant="outline" className="border-white/30 bg-white/10 text-white font-medium">30 вопросов</Badge>
                            </div>
                        </BentoCard>
                    </div>

                    {/* COLUMN 2: Modes Grid (4 cols) */}
                    <div className="lg:col-span-4 grid grid-cols-2 gap-5">
                        <BentoCard
                            className="aspect-square bg-gradient-to-br from-amber-500 to-orange-600 border-amber-500/20 hover:from-amber-400 hover:to-orange-500"
                            onClick={() => handleStartTest("/test/practice?mode=blitz&count=20&timer=300")}
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div className="p-2 bg-white/20 rounded-lg w-fit backdrop-blur-sm">
                                    <Zap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">Блиц</div>
                                    <div className="text-xs text-white/80 mt-1 font-medium">20 вопросов • 5 мин</div>
                                </div>
                            </div>
                        </BentoCard>

                        <BentoCard
                            className="aspect-square bg-gradient-to-br from-red-500 to-pink-600 border-red-500/20 hover:from-red-400 hover:to-pink-500"
                            onClick={() => handleStartTest("/test/practice?mode=marathon")}
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div className="p-2 bg-white/20 rounded-lg w-fit backdrop-blur-sm">
                                    <Flame className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">Марафон</div>
                                    <div className="text-xs text-white/80 mt-1 font-medium">До первой ошибки</div>
                                </div>
                            </div>
                        </BentoCard>

                        <BentoCard
                            className="aspect-square bg-gradient-to-br from-purple-500 to-violet-600 border-purple-500/20 hover:from-purple-400 hover:to-violet-500"
                            onClick={() => handleStartTest("/test/challenge-bank")}
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div className="p-2 bg-white/20 rounded-lg w-fit backdrop-blur-sm">
                                    <History className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">Ошибки</div>
                                    <div className="text-xs text-white/80 mt-1 font-medium">{challengeBankCount} вопросов</div>
                                </div>
                            </div>
                        </BentoCard>

                        <BentoCard
                            className="aspect-square bg-gradient-to-br from-slate-600 to-slate-700 border-slate-500/20 hover:from-slate-500 hover:to-slate-600"
                            onClick={() => handleStartTest("/test/hardest")}
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div className="p-2 bg-white/20 rounded-lg w-fit backdrop-blur-sm">
                                    <AlertTriangle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-white">Сложные</div>
                                    <div className="text-xs text-white/80 mt-1 font-medium">ТОП-50</div>
                                </div>
                            </div>
                        </BentoCard>
                    </div>

                    {/* COLUMN 3: Topics List (4 cols) */}
                    <div className="lg:col-span-4 h-full min-h-[500px] lg:h-[564px]">
                        <BentoCard className="h-full flex flex-col p-0 bg-gradient-to-b from-[#1a1a1d] to-[#121214] border-white/10">
                            <div className="p-5 pb-4 border-b border-white/10 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/20">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-white text-lg">Темы курса</h3>
                                    </div>
                                    <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-bold">
                                        {topics.length}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                                {topics.map((topic) => (
                                    <div
                                        key={topic.id}
                                        className={cn(
                                            "group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border",
                                            hoveredTopic === topic.id
                                                ? "bg-white/10 border-white/20"
                                                : "border-transparent hover:bg-white/5 hover:border-white/10"
                                        )}
                                        onMouseEnter={() => setHoveredTopic(topic.id)}
                                        onMouseLeave={() => setHoveredTopic(null)}
                                        onClick={() => handleTopicClick(topic.id)}
                                    >
                                        <div className={cn(
                                            "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base transition-all shrink-0",
                                            hoveredTopic === topic.id
                                                ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg"
                                                : "bg-[#1c1c1e] text-white/50"
                                        )}>
                                            {topic.number}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className={cn(
                                                "font-semibold text-sm truncate transition-colors",
                                                hoveredTopic === topic.id ? "text-white" : "text-white/70"
                                            )}>
                                                {topic.name}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <div className="h-1.5 flex-1 bg-white/[0.08] rounded-full overflow-hidden">
                                                    <div className="h-full w-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
                                                </div>
                                                <div className="text-[10px] text-white/40 font-bold">0%</div>
                                            </div>
                                        </div>

                                        {topic.is_premium && !isPremium ? (
                                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "p-2 rounded-lg transition-all shrink-0",
                                                hoveredTopic === topic.id
                                                    ? "bg-white/20 text-white"
                                                    : "bg-white/5 text-white/30"
                                            )}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </BentoCard>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};
