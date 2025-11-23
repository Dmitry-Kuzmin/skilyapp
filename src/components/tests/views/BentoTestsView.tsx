import { motion } from "framer-motion";
import {
    BookOpen, Brain, GraduationCap, Shuffle, Zap, Flame,
    History, AlertTriangle, Clock, CheckCircle2, Flag, Layers,
    ChevronRight, Star, Trophy, Sparkles, Target, BarChart3
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

// --- Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
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
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "relative overflow-hidden rounded-[32px] border border-white/5 bg-[#121214] p-6 backdrop-blur-xl transition-all duration-300",
                onClick && "cursor-pointer hover:border-white/10 hover:shadow-2xl hover:shadow-black/50",
                className
            )}
        >
            {/* Dynamic Gradient Background */}
            {gradient && (
                <div
                    className="absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30"
                    style={{ background: gradient }}
                />
            )}

            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Content */}
            <div className="relative z-10 h-full">
                {children}
            </div>
        </motion.div>
    );
};

const StatBadge = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => (
    <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/5 backdrop-blur-md">
        <div className={cn("p-2 rounded-xl", color)}>
            <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{label}</div>
            <div className="text-lg font-bold text-white leading-none mt-0.5">{value}</div>
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
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-[1370px] px-6 space-y-8"
            >
                {/* Header & Stats */}
                <div className="flex flex-col lg:flex-row items-end justify-between gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight"
                        >
                            Центр тестирования
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-white/50 text-lg"
                        >
                            Выбирайте режим и улучшайте свои навыки
                        </motion.p>
                    </div>

                    <motion.div
                        variants={itemVariants}
                        className="flex flex-wrap gap-3"
                    >
                        <StatBadge icon={Target} label="Точность" value={`${stats.accuracy}%`} color="bg-blue-500/20" />
                        <StatBadge icon={CheckCircle2} label="Ответов" value={stats.totalAnswered} color="bg-green-500/20" />
                        <StatBadge icon={AlertTriangle} label="Ошибок" value={stats.errors} color="bg-red-500/20" />
                        <StatBadge icon={Trophy} label="Уровень" value="1" color="bg-amber-500/20" />
                    </motion.div>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-min">

                    {/* COLUMN 1: Main Actions (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Random Test - Hero Card */}
                        <BentoCard
                            className="group min-h-[320px] lg:h-[380px]"
                            onClick={() => handleStartTest(`/test/practice?count=${randomQuestionCount}`)}
                            gradient="linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)"
                        >
                            <div className="flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 text-white">
                                        <Shuffle className="w-8 h-8" />
                                    </div>
                                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
                                        POPULAR
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">Случайный тест</h3>
                                    <p className="text-white/70 mb-6 text-sm lg:text-base">
                                        Быстрая проверка знаний на случайных вопросах.
                                    </p>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {[10, 20, 30].map(count => (
                                            <button
                                                key={count}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRandomQuestionCount(count);
                                                }}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                                                    randomQuestionCount === count
                                                        ? "bg-white text-black border-white"
                                                        : "bg-black/20 text-white border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                    <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg">
                                        <ChevronRight className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </BentoCard>

                        {/* Exam Card */}
                        <BentoCard
                            className="min-h-[180px] lg:h-[200px] group bg-[#1c1c1e]"
                            onClick={() => handleStartTest("/test/exam")}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                    ))}
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">Экзамен</h3>
                            <p className="text-white/40 text-sm">Симуляция DGT</p>

                            <div className="mt-4 flex gap-2">
                                <Badge variant="outline" className="border-white/10 text-white/60 bg-white/5">30 мин</Badge>
                                <Badge variant="outline" className="border-white/10 text-white/60 bg-white/5">3 ошибки</Badge>
                            </div>
                        </BentoCard>
                    </div>

                    {/* COLUMN 2: Modes Grid (4 cols) */}
                    <div className="lg:col-span-4 grid grid-cols-2 gap-6 h-full content-start">
                        <BentoCard
                            className="bg-[#18181b] hover:bg-[#202023] aspect-square flex flex-col justify-between"
                            onClick={() => handleStartTest("/test/practice?mode=blitz&count=20&timer=300")}
                        >
                            <Zap className="w-8 h-8 text-amber-400" />
                            <div>
                                <div className="text-lg font-bold text-white">Блиц</div>
                                <div className="text-xs text-white/40 mt-1">20 вопросов • 5 мин</div>
                            </div>
                        </BentoCard>

                        <BentoCard
                            className="bg-[#18181b] hover:bg-[#202023] aspect-square flex flex-col justify-between"
                            onClick={() => handleStartTest("/test/practice?mode=marathon")}
                        >
                            <Flame className="w-8 h-8 text-red-500" />
                            <div>
                                <div className="text-lg font-bold text-white">Марафон</div>
                                <div className="text-xs text-white/40 mt-1">До первой ошибки</div>
                            </div>
                        </BentoCard>

                        <BentoCard
                            className="bg-[#18181b] hover:bg-[#202023] aspect-square flex flex-col justify-between"
                            onClick={() => handleStartTest("/test/challenge-bank")}
                        >
                            <History className="w-8 h-8 text-purple-400" />
                            <div>
                                <div className="text-lg font-bold text-white">Ошибки</div>
                                <div className="text-xs text-white/40 mt-1">{challengeBankCount} вопросов</div>
                            </div>
                        </BentoCard>

                        <BentoCard
                            className="bg-[#18181b] hover:bg-[#202023] aspect-square flex flex-col justify-between"
                            onClick={() => handleStartTest("/test/hardest")}
                        >
                            <AlertTriangle className="w-8 h-8 text-orange-400" />
                            <div>
                                <div className="text-lg font-bold text-white">Сложные</div>
                                <div className="text-xs text-white/40 mt-1">ТОП-50 трудных</div>
                            </div>
                        </BentoCard>
                    </div>

                    {/* COLUMN 3: Topics List (4 cols) */}
                    <div className="lg:col-span-4 h-full min-h-[500px] lg:h-[604px]">
                        <BentoCard className="h-full flex flex-col p-0 bg-[#121214] overflow-hidden">
                            <div className="p-6 pb-4 border-b border-white/5 bg-[#121214] z-20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-white text-lg">Темы курса</h3>
                                    </div>
                                    <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                                        {topics.length}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {topics.map((topic, i) => (
                                    <motion.div
                                        key={topic.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={cn(
                                            "group flex items-center gap-4 p-3 rounded-2xl transition-all cursor-pointer border border-transparent",
                                            hoveredTopic === topic.id ? "bg-white/10 border-white/10" : "hover:bg-white/5"
                                        )}
                                        onMouseEnter={() => setHoveredTopic(topic.id)}
                                        onMouseLeave={() => setHoveredTopic(null)}
                                        onClick={() => handleTopicClick(topic.id)}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-colors",
                                            hoveredTopic === topic.id ? "bg-white text-black" : "bg-[#1c1c1e] text-white/40"
                                        )}>
                                            {topic.number}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className={cn(
                                                "font-medium text-sm truncate transition-colors",
                                                hoveredTopic === topic.id ? "text-white" : "text-white/80"
                                            )}>
                                                {topic.name}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full w-0 bg-blue-500 rounded-full" />
                                                </div>
                                                <div className="text-[10px] text-white/30 font-medium">0%</div>
                                            </div>
                                        </div>

                                        {topic.is_premium && !isPremium ? (
                                            <div className="p-2 rounded-full bg-white/5 text-white/20">
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "p-2 rounded-full transition-all",
                                                hoveredTopic === topic.id ? "bg-white text-black" : "bg-white/5 text-white/20"
                                            )}>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </BentoCard>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};
