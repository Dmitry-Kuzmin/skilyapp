import { motion } from "framer-motion";
import {
    BookOpen, Shuffle, Zap, Flame,
    History, AlertTriangle, Clock,
    ChevronRight, Trophy, Sparkles, Target, BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePremium } from "@/hooks/usePremium";
import { useTheme } from "next-themes";
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
    accentColor = "from-blue-500/20 to-purple-500/20"
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    accentColor?: string;
}) => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-3xl border transition-all duration-300",
                isDark
                    ? "bg-[#1a1a1d] border-white/10 hover:border-white/20"
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md",
                onClick && "cursor-pointer",
                className
            )}
            style={{ willChange: 'transform' }}
        >
            {/* Gradient overlay on hover */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                accentColor
            )} />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

const StatBadge = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className={cn(
            "flex items-center gap-3 rounded-xl p-3 border backdrop-blur-sm",
            isDark ? "bg-white/[0.08] border-white/10" : "bg-gray-50 border-gray-200"
        )}>
            <div className={cn("p-2 rounded-lg", color)}>
                <Icon className={cn("w-4 h-4", isDark ? "text-white" : "text-gray-700")} />
            </div>
            <div>
                <div className={cn("text-[10px] uppercase font-bold tracking-wider", isDark ? "text-white/50" : "text-gray-500")}>
                    {label}
                </div>
                <div className={cn("text-xl font-bold leading-none mt-1", isDark ? "text-white" : "text-gray-900")}>
                    {value}
                </div>
            </div>
        </div>
    );
};

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
    const { theme } = useTheme();
    const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

    const isDark = theme === "dark";

    return (
        <div className={cn(
            "w-full flex justify-center pt-8 pb-20 min-h-screen",
            isDark ? "bg-[#09090b]" : "bg-gray-50"
        )}>
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                className="w-full max-w-[1370px] px-4 md:px-6 space-y-8"
            >
                {/* Header & Stats */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className={cn("text-3xl sm:text-4xl md:text-5xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-gray-900")}>
                            Центр тестирования
                        </h1>
                        <p className={cn("text-sm sm:text-base md:text-lg", isDark ? "text-white/60" : "text-gray-600")}>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">

                    {/* Hero Card - Random Test */}
                    <div className="lg:col-span-5 order-1">
                        <BentoCard
                            onClick={() => handleStartTest(`/test/practice?count=${randomQuestionCount}`)}
                            accentColor="from-indigo-500/20 to-purple-500/20"
                            className="h-full min-h-[340px] p-6 md:p-8"
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div className="flex items-start justify-between mb-6">
                                    <div className={cn(
                                        "p-3 md:p-4 rounded-2xl backdrop-blur-md",
                                        isDark ? "bg-white/10" : "bg-gray-100"
                                    )}>
                                        <Shuffle className={cn("w-6 h-6 md:w-7 md:h-7", isDark ? "text-white" : "text-gray-700")} />
                                    </div>
                                    <Badge className={cn(
                                        "font-bold px-3 py-1",
                                        isDark ? "bg-white/10 text-white border-white/20" : "bg-gray-900 text-white"
                                    )}>
                                        HOT
                                    </Badge>
                                </div>

                                <div className="space-y-4 md:space-y-6">
                                    <div>
                                        <h2 className={cn("text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight", isDark ? "text-white" : "text-gray-900")}>
                                            Случайный тест
                                        </h2>
                                        <p className={cn("text-sm md:text-base", isDark ? "text-white/70" : "text-gray-600")}>
                                            Быстрая проверка знаний на случайных вопросах из всех тем
                                        </p>
                                    </div>

                                    <div className="flex gap-2 md:gap-3">
                                        {[10, 20, 30].map((count) => (
                                            <button
                                                key={count}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRandomQuestionCount(count);
                                                }}
                                                className={cn(
                                                    "px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold text-sm md:text-lg transition-all",
                                                    randomQuestionCount === count
                                                        ? (isDark ? "bg-white text-black shadow-lg" : "bg-gray-900 text-white shadow-lg")
                                                        : (isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                                                )}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </BentoCard>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-7 space-y-4 md:space-y-6 order-2">
                        {/* Exam Card */}
                        <BentoCard
                            onClick={() => handleStartTest("/test/exam")}
                            accentColor="from-emerald-500/20 to-teal-500/20"
                            className="p-5 md:p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn(
                                    "p-3 rounded-xl backdrop-blur-sm",
                                    isDark ? "bg-white/10" : "bg-gray-100"
                                )}>
                                    <Clock className={cn("w-5 h-5 md:w-6 md:h-6", isDark ? "text-white" : "text-gray-700")} />
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className={cn(
                                        isDark ? "border-white/20 bg-white/5 text-white" : "border-gray-300 bg-gray-50 text-gray-700"
                                    )}>30 мин</Badge>
                                    <Badge variant="outline" className={cn(
                                        isDark ? "border-white/20 bg-white/5 text-white" : "border-gray-300 bg-gray-50 text-gray-700"
                                    )}>Hard</Badge>
                                </div>
                            </div>
                            <h3 className={cn("text-xl md:text-2xl font-bold mb-2", isDark ? "text-white" : "text-gray-900")}>
                                Экзамен DGT
                            </h3>
                            <p className={cn("text-sm", isDark ? "text-white/70" : "text-gray-600")}>
                                Полная симуляция официального экзамена
                            </p>
                        </BentoCard>

                        {/* Quick Modes Grid */}
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <BentoCard
                                onClick={() => handleStartTest("/test/practice?mode=blitz&count=20&timer=300")}
                                accentColor="from-orange-500/20 to-amber-500/20"
                                className="aspect-square p-4 md:p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <Zap className={cn("w-6 h-6 md:w-7 md:h-7", isDark ? "text-white" : "text-gray-700")} />
                                    <div>
                                        <div className={cn("text-lg md:text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Блиц</div>
                                        <div className={cn("text-xs mt-1", isDark ? "text-white/60" : "text-gray-600")}>5 минут</div>
                                    </div>
                                </div>
                            </BentoCard>

                            <BentoCard
                                onClick={() => handleStartTest("/test/practice?mode=marathon")}
                                accentColor="from-pink-500/20 to-rose-500/20"
                                className="aspect-square p-4 md:p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <Flame className={cn("w-6 h-6 md:w-7 md:h-7", isDark ? "text-white" : "text-gray-700")} />
                                    <div>
                                        <div className={cn("text-lg md:text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Марафон</div>
                                        <div className={cn("text-xs mt-1", isDark ? "text-white/60" : "text-gray-600")}>До ошибки</div>
                                    </div>
                                </div>
                            </BentoCard>

                            <BentoCard
                                onClick={() => handleStartTest("/test/challenge-bank")}
                                accentColor="from-purple-500/20 to-violet-500/20"
                                className="aspect-square p-4 md:p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <History className={cn("w-6 h-6 md:w-7 md:h-7", isDark ? "text-white" : "text-gray-700")} />
                                    <div>
                                        <div className={cn("text-lg md:text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Ошибки</div>
                                        <div className={cn("text-xs mt-1", isDark ? "text-white/60" : "text-gray-600")}>{challengeBankCount}</div>
                                    </div>
                                </div>
                            </BentoCard>

                            <BentoCard
                                onClick={() => handleStartTest("/test/hardest")}
                                accentColor="from-slate-500/20 to-gray-500/20"
                                className="aspect-square p-4 md:p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <AlertTriangle className={cn("w-6 h-6 md:w-7 md:h-7", isDark ? "text-white" : "text-gray-700")} />
                                    <div>
                                        <div className={cn("text-lg md:text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Сложные</div>
                                        <div className={cn("text-xs mt-1", isDark ? "text-white/60" : "text-gray-600")}>ТОП-50</div>
                                    </div>
                                </div>
                            </BentoCard>
                        </div>
                    </div>
                </div>

                {/* Topics Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <h3 className={cn("text-2xl md:text-3xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                            Темы курса
                        </h3>
                        <Badge className={cn(
                            "text-sm md:text-base px-3 md:px-4 py-1 md:py-2 font-bold",
                            isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900"
                        )}>
                            {topics.length}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                        {topics.map((topic, i) => (
                            <motion.div
                                key={topic.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => handleTopicClick(topic.id)}
                                className={cn(
                                    "group relative overflow-hidden rounded-2xl p-4 md:p-5 cursor-pointer border transition-all",
                                    hoveredTopic === topic.id
                                        ? (isDark ? "bg-white/10 border-white/20" : "bg-gray-100 border-gray-300")
                                        : (isDark ? "bg-[#1a1a1d] border-white/10 hover:bg-white/5" : "bg-white border-gray-200 hover:border-gray-300")
                                )}
                                onMouseEnter={() => setHoveredTopic(topic.id)}
                                onMouseLeave={() => setHoveredTopic(null)}
                            >
                                {/* Gradient on hover */}
                                <div className={cn(
                                    "absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 transition-all duration-500",
                                    hoveredTopic === topic.id && "from-blue-500/10 to-purple-500/10"
                                )} />

                                <div className="relative z-10 space-y-3">
                                    <div className={cn(
                                        "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-bold text-base md:text-lg transition-all",
                                        hoveredTopic === topic.id
                                            ? (isDark ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white" : "bg-gradient-to-br from-blue-500 to-purple-600 text-white")
                                            : (isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700")
                                    )}>
                                        {topic.number}
                                    </div>
                                    <div className={cn(
                                        "font-semibold text-sm line-clamp-2",
                                        hoveredTopic === topic.id
                                            ? (isDark ? "text-white" : "text-gray-900")
                                            : (isDark ? "text-white/80" : "text-gray-700")
                                    )}>
                                        {topic.name}
                                    </div>
                                    {topic.is_premium && !isPremium && (
                                        <div className="absolute top-3 right-3">
                                            <Sparkles className={cn("w-4 h-4", isDark ? "text-amber-400" : "text-amber-500")} />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};
