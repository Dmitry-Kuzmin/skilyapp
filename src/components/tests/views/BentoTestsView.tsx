import { memo, useCallback, useMemo } from "react";
import { motion } from "@/components/optimized/Motion";
import {
    BookOpen, Shuffle, Zap, Flame,
    History, AlertTriangle, Clock,
    ChevronRight, Trophy, Sparkles, Target, BarChart3, Play, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePremium } from "@/hooks/usePremium";
import { useTheme } from "next-themes";
import { useState } from "react";
import { getImageUrl } from "@/utils/imageUtils";
import { useLanguage } from "@/contexts/LanguageContext";

interface BentoTestsViewProps {
    topics: Array<{
        id: string;
        number: number;
        name: string;
        questions: number;
        cover_image?: string | null;
        gradient_from?: string;
        gradient_to?: string;
        is_premium?: boolean;
    }>;
    stats: any;
    challengeBankCount: number;
    randomQuestionCount: number;
    setRandomQuestionCount: (val: number) => void;
    handleStartTest: (path: string) => void;
    handleTopicClick: (id: string) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
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
    const { resolvedTheme } = useTheme();
    // Используем ту же логику, что и в Dashboard для определения темной темы
    const isDark = (resolvedTheme ?? 'dark') !== 'light';

    return (
        <motion.div
            onClick={onClick}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "group relative overflow-hidden rounded-3xl border transition-all duration-300",
                isDark
                    ? "bg-gradient-to-br from-[#1a1a1d] to-[#1f1f23] border-white/10 hover:border-white/30 shadow-xl hover:shadow-2xl"
                    : "bg-white border-gray-200 hover:border-gray-400 shadow-lg hover:shadow-2xl",
                onClick && "cursor-pointer",
                className
            )}
            style={{ willChange: 'transform' }}
        >
            {/* Animated gradient overlay */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                accentColor
            )} />
            
            {/* Glow effect on hover */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl",
                accentColor.replace('/20', '/40')
            )} />

            {/* Content */}
            <div className="relative z-10 h-full">
                {children}
            </div>
        </motion.div>
    );
};

const StatBadge = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => {
    const { resolvedTheme } = useTheme();
    const isDark = (resolvedTheme ?? 'dark') !== 'light';

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

export const BentoTestsView = memo(function BentoTestsView({
    topics,
    stats,
    challengeBankCount,
    randomQuestionCount,
    setRandomQuestionCount,
    handleStartTest,
    handleTopicClick,
    t
}: BentoTestsViewProps) {
    const { isPremium } = usePremium();
    const { resolvedTheme } = useTheme();
    const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);
    const [hasSelectedCount, setHasSelectedCount] = useState(false);

    // ОПТИМИЗАЦИЯ: Мемоизируем вычисления для предотвращения лишних ре-рендеров
    const isDark = useMemo(() => (resolvedTheme ?? 'dark') !== 'light', [resolvedTheme]);
    
    // ОПТИМИЗАЦИЯ: Мемоизируем обработчики для предотвращения лишних ре-рендеров
    const handleCountSelect = useCallback((count: number) => {
        setRandomQuestionCount(count);
        setHasSelectedCount(true);
    }, [setRandomQuestionCount]);
    
    const handleRandomTestStart = useCallback(() => {
        handleStartTest(`/test/practice?count=${randomQuestionCount}`);
    }, [handleStartTest, randomQuestionCount]);
    
    const handleTopicHover = useCallback((topicId: string | null) => {
        setHoveredTopic(topicId);
    }, []);
    
    const handleTopicClickMemo = useCallback((topicId: string) => {
        handleTopicClick(topicId);
    }, [handleTopicClick]);

    return (
        <div className="w-full flex justify-center pt-8 pb-20 min-h-screen bg-background">
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
                            {t('testsPage.title')}
                        </h1>
                        <p className={cn("text-sm sm:text-base md:text-lg", isDark ? "text-white/60" : "text-gray-600")}>
                            {t('testsPage.subtitle')}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <StatBadge icon={Target} label={t('testsPage.stats.accuracy')} value={`${stats.accuracy}%`} color="bg-blue-500/20" />
                        <StatBadge icon={BarChart3} label={t('testsPage.stats.answered')} value={stats.totalAnswered} color="bg-emerald-500/20" />
                        <StatBadge icon={AlertTriangle} label={t('testsPage.stats.errors')} value={stats.errors} color="bg-red-500/20" />
                        <StatBadge icon={Trophy} label={t('testsPage.stats.level')} value="1" color="bg-amber-500/20" />
                    </div>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">

                    {/* Hero Card - Random Test */}
                    <div className="lg:col-span-5 order-1">
                        <BentoCard
                            accentColor="from-indigo-500/20 via-purple-500/20 to-pink-500/20"
                            className="h-full min-h-[280px] max-h-[320px] p-5 md:p-7"
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div className="flex items-start justify-between mb-4">
                                    <motion.div 
                                        whileHover={{ rotate: 180, scale: 1.1 }}
                                        transition={{ duration: 0.3 }}
                                        className={cn(
                                            "p-3 md:p-4 rounded-2xl backdrop-blur-md shadow-lg",
                                            isDark ? "bg-gradient-to-br from-indigo-500/30 to-purple-500/30" : "bg-gradient-to-br from-indigo-100 to-purple-100"
                                        )}
                                    >
                                        <Shuffle className={cn("w-5 h-5 md:w-6 md:h-6", isDark ? "text-white" : "text-indigo-700")} />
                                    </motion.div>
                                    <Badge className={cn(
                                        "font-bold px-3 py-1.5 animate-pulse",
                                        isDark ? "bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-lg shadow-red-500/50" : "bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-lg"
                                    )}>
                                        HOT
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h2 className={cn("text-2xl sm:text-3xl md:text-3xl font-black mb-2 leading-tight bg-gradient-to-r bg-clip-text text-transparent", 
                                            isDark 
                                                ? "from-indigo-300 via-purple-300 to-pink-300" 
                                                : "from-indigo-600 via-purple-600 to-pink-600"
                                        )}>
                                            {t('testsPage.randomTest')}
                                        </h2>
                                        <p className={cn("text-xs md:text-sm leading-relaxed", isDark ? "text-white/70" : "text-gray-600")}>
                                            {t('testsPage.randomTestDesc')}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className={cn("text-xs mb-2 font-semibold", isDark ? "text-white/60" : "text-gray-500")}>
                                                {t('testsPage.questionCount')}
                                            </p>
                                            <div className="flex gap-2">
                                                {[10, 20, 30].map((count) => (
                                                    <motion.button
                                                        key={count}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCountSelect(count);
                                                        }}
                                                        className={cn(
                                                            "flex-1 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-bold text-sm md:text-base transition-all",
                                                            randomQuestionCount === count
                                                                ? (isDark 
                                                                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50" 
                                                                    : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg")
                                                                : (isDark 
                                                                    ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" 
                                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200")
                                                        )}
                                                    >
                                                        {count}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Start Button - показываем только после выбора */}
                                        {hasSelectedCount && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRandomTestStart();
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-center gap-2 px-4 py-3 md:py-3.5 rounded-xl font-bold text-sm md:text-base transition-all shadow-lg",
                                                        isDark
                                                            ? "bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white hover:shadow-xl hover:shadow-indigo-500/50"
                                                            : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:shadow-xl"
                                                    )}
                                                >
                                                    <Play className="w-4 h-4 md:w-5 md:h-5 fill-white" />
                                                    <span>{t('testsPage.startButton')}</span>
                                                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                                </motion.button>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </BentoCard>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-7 space-y-3 md:space-y-4 order-2">
                        {/* Exam Card */}
                        <BentoCard
                            onClick={() => handleStartTest("/test/exam")}
                            accentColor="from-emerald-500/20 via-teal-500/20 to-cyan-500/20"
                            className="h-[140px] md:h-[160px] p-4 md:p-5"
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <motion.div 
                                        whileHover={{ rotate: 12, scale: 1.1 }}
                                        className={cn(
                                            "p-2.5 md:p-3 rounded-xl backdrop-blur-sm shadow-md",
                                            isDark ? "bg-gradient-to-br from-emerald-500/30 to-teal-500/30" : "bg-gradient-to-br from-emerald-100 to-teal-100"
                                        )}
                                    >
                                        <Clock className={cn("w-4 h-4 md:w-5 md:h-5", isDark ? "text-white" : "text-emerald-700")} />
                                    </motion.div>
                                    <div className="flex gap-1.5 md:gap-2">
                                        <Badge variant="outline" className={cn(
                                            "text-xs px-2 py-0.5 font-semibold",
                                            isDark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-300 bg-emerald-50 text-emerald-700"
                                        )}>30 мин</Badge>
                                        <Badge variant="outline" className={cn(
                                            "text-xs px-2 py-0.5 font-semibold",
                                            isDark ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-red-300 bg-red-50 text-red-700"
                                        )}>Hard</Badge>
                                    </div>
                                </div>
                                <div>
                                    <h3 className={cn("text-lg md:text-xl font-black mb-1 bg-gradient-to-r bg-clip-text text-transparent", 
                                        isDark ? "from-emerald-300 to-teal-300" : "from-emerald-600 to-teal-600"
                                    )}>
                                        {t('testsPage.exam')} DGT
                                    </h3>
                                    <p className={cn("text-xs leading-tight", isDark ? "text-white/70" : "text-gray-600")}>
                                        {t('testsPage.examDesc')}
                                    </p>
                                </div>
                            </div>
                        </BentoCard>

                        {/* Quick Modes Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <BentoCard
                                onClick={() => handleStartTest("/test/blitz?count=20&timer=300")}
                                accentColor="from-orange-500/20 via-amber-500/20 to-yellow-500/20"
                                className="h-[140px] md:h-[160px] p-4 md:p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <motion.div
                                        whileHover={{ rotate: -12, scale: 1.1 }}
                                        className={cn(
                                            "p-2.5 md:p-3 rounded-xl w-fit shadow-md",
                                            isDark ? "bg-gradient-to-br from-orange-500/30 to-amber-500/30" : "bg-gradient-to-br from-orange-100 to-amber-100"
                                        )}
                                    >
                                        <Zap className={cn("w-5 h-5 md:w-6 md:h-6", isDark ? "text-white" : "text-orange-700")} />
                                    </motion.div>
                                    <div>
                                        <div className={cn("text-base md:text-lg font-black bg-gradient-to-r bg-clip-text text-transparent mb-1", 
                                            isDark ? "from-orange-300 to-amber-300" : "from-orange-600 to-amber-600"
                                        )}>{t('testsPage.blitz')}</div>
                                        <div className={cn("text-xs leading-tight", isDark ? "text-white/60" : "text-gray-600")}>{t('testsPage.blitzDesc')}</div>
                                    </div>
                                </div>
                            </BentoCard>

                            <BentoCard
                                onClick={() => handleStartTest("/test/mastery")}
                                accentColor="from-pink-500/20 via-rose-500/20 to-red-500/20"
                                className="h-[140px] md:h-[160px] p-4 md:p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <motion.div
                                        whileHover={{ rotate: 12, scale: 1.1 }}
                                        className={cn(
                                            "p-2.5 md:p-3 rounded-xl w-fit shadow-md",
                                            isDark ? "bg-gradient-to-br from-pink-500/30 to-rose-500/30" : "bg-gradient-to-br from-pink-100 to-rose-100"
                                        )}
                                    >
                                        <Flame className={cn("w-5 h-5 md:w-6 md:h-6", isDark ? "text-white" : "text-pink-700")} />
                                    </motion.div>
                                    <div>
                                        <div className={cn("text-base md:text-lg font-black bg-gradient-to-r bg-clip-text text-transparent mb-1", 
                                            isDark ? "from-pink-300 to-rose-300" : "from-pink-600 to-rose-600"
                                        )}>{t('testsPage.marathon')}</div>
                                        <div className={cn("text-xs leading-tight", isDark ? "text-white/60" : "text-gray-600")}>{t('testsPage.marathonDesc')}</div>
                                    </div>
                                </div>
                            </BentoCard>

                            <BentoCard
                                onClick={() => handleStartTest("/test/challenge-bank")}
                                accentColor="from-purple-500/20 via-violet-500/20 to-indigo-500/20"
                                className="h-[140px] md:h-[160px] p-4 md:p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <motion.div
                                        whileHover={{ rotate: -12, scale: 1.1 }}
                                        className={cn(
                                            "p-2.5 md:p-3 rounded-xl w-fit shadow-md",
                                            isDark ? "bg-gradient-to-br from-purple-500/30 to-violet-500/30" : "bg-gradient-to-br from-purple-100 to-violet-100"
                                        )}
                                    >
                                        <History className={cn("w-5 h-5 md:w-6 md:h-6", isDark ? "text-white" : "text-purple-700")} />
                                    </motion.div>
                                    <div>
                                        <div className={cn("text-base md:text-lg font-black bg-gradient-to-r bg-clip-text text-transparent mb-1", 
                                            isDark ? "from-purple-300 to-violet-300" : "from-purple-600 to-violet-600"
                                        )}>{t('testsPage.challengeBank')}</div>
                                        <div className={cn("text-xs leading-tight font-semibold", isDark ? "text-white/80" : "text-gray-700")}>{t('testsPage.challengeBankDesc', { count: challengeBankCount })}</div>
                                    </div>
                                </div>
                            </BentoCard>

                            <BentoCard
                                onClick={() => handleStartTest("/test/hardest")}
                                accentColor="from-slate-500/20 via-gray-500/20 to-zinc-500/20"
                                className="h-[140px] md:h-[160px] p-4 md:p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <motion.div
                                        whileHover={{ rotate: 12, scale: 1.1 }}
                                        className={cn(
                                            "p-2.5 md:p-3 rounded-xl w-fit shadow-md",
                                            isDark ? "bg-gradient-to-br from-slate-500/30 to-gray-500/30" : "bg-gradient-to-br from-slate-100 to-gray-100"
                                        )}
                                    >
                                        <AlertTriangle className={cn("w-5 h-5 md:w-6 md:h-6", isDark ? "text-white" : "text-slate-700")} />
                                    </motion.div>
                                    <div>
                                        <div className={cn("text-base md:text-lg font-black bg-gradient-to-r bg-clip-text text-transparent mb-1", 
                                            isDark ? "from-slate-300 to-gray-300" : "from-slate-600 to-gray-600"
                                        )}>{t('testsPage.hardest')}</div>
                                        <div className={cn("text-xs leading-tight font-semibold", isDark ? "text-white/80" : "text-gray-700")}>{t('testsPage.hardestDesc')}</div>
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
                            {t('testsPage.topicsTitle')}
                        </h3>
                        <Badge className={cn(
                            "text-sm md:text-base px-3 md:px-4 py-1 md:py-2 font-bold",
                            isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900"
                        )}>
                            {topics.length}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                        {topics.map((topic, i) => {
                            const coverImageUrl = topic.cover_image ? getImageUrl(topic.cover_image, 'test-covers') || topic.cover_image : null;
                            const hasCoverImage = !!coverImageUrl;
                            
                            return (
                                <motion.div
                                    key={topic.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleTopicClickMemo(topic.id)}
                                    className={cn(
                                        "group relative overflow-hidden rounded-2xl p-4 md:p-5 cursor-pointer border transition-all h-[160px] md:h-[180px]",
                                        hoveredTopic === topic.id
                                            ? (isDark ? "border-white/30 shadow-xl" : "border-gray-400 shadow-xl")
                                            : (isDark ? "border-white/10 hover:border-white/20" : "border-gray-200 hover:border-gray-300")
                                    )}
                                    onMouseEnter={() => handleTopicHover(topic.id)}
                                    onMouseLeave={() => handleTopicHover(null)}
                                    style={{
                                        backgroundImage: hasCoverImage ? `url(${coverImageUrl})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                    }}
                                >
                                    {/* Background gradient overlay for readability */}
                                    <div className={cn(
                                        "absolute inset-0 transition-all duration-500",
                                        hasCoverImage
                                            ? hoveredTopic === topic.id
                                                ? "bg-gradient-to-br from-black/70 via-black/60 to-black/70"
                                                : "bg-gradient-to-br from-black/60 via-black/50 to-black/60"
                                            : hoveredTopic === topic.id
                                                ? (isDark ? "bg-white/10" : "bg-gray-100")
                                                : (isDark ? "bg-[#1a1a1d]" : "bg-white")
                                    )} />

                                    {/* Accent gradient on hover */}
                                    {!hasCoverImage && (
                                        <div className={cn(
                                            "absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 transition-all duration-500",
                                            hoveredTopic === topic.id && "from-blue-500/20 to-purple-500/20"
                                        )} />
                                    )}

                                    {/* Glow effect on hover */}
                                    <div className={cn(
                                        "absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-xl",
                                        hasCoverImage 
                                            ? "bg-gradient-to-br from-white/20 to-white/10"
                                            : "bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                                    )} />

                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div className="flex items-start justify-between">
                                            <motion.div
                                                whileHover={{ rotate: 12, scale: 1.1 }}
                                                className={cn(
                                                    "w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-lg md:text-xl transition-all shadow-xl",
                                                    hoveredTopic === topic.id
                                                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white scale-110 ring-2 ring-white/50"
                                                        : hasCoverImage
                                                            ? "bg-white/25 backdrop-blur-lg text-white border-2 border-white/40 shadow-lg"
                                                            : (isDark ? "bg-gradient-to-br from-slate-700 to-slate-800 text-white border border-slate-600" : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 border border-gray-300")
                                                )}
                                            >
                                                {topic.number}
                                            </motion.div>
                                            {topic.is_premium && !isPremium && (
                                                <motion.div
                                                    animate={{ rotate: [0, 10, -10, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                                    className="relative"
                                                >
                                                    <Sparkles className={cn("w-5 h-5", "text-amber-400 drop-shadow-lg")} />
                                                    <div className="absolute inset-0 bg-amber-400/30 blur-md rounded-full" />
                                                </motion.div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <div className={cn(
                                                "font-black text-base md:text-lg line-clamp-2 leading-tight",
                                                hasCoverImage
                                                    ? "text-white drop-shadow-lg"
                                                    : hoveredTopic === topic.id
                                                        ? (isDark ? "text-white" : "text-gray-900")
                                                        : (isDark ? "text-white" : "text-gray-900")
                                            )}>
                                                {topic.name}
                                            </div>
                                            {topic.questions > 0 && (
                                                <div className={cn(
                                                    "text-xs md:text-sm font-bold flex items-center gap-1.5",
                                                    hasCoverImage
                                                        ? "text-white/90"
                                                        : (isDark ? "text-white/70" : "text-gray-600")
                                                )}>
                                                    <BookOpen className="w-3 h-3" />
                                                    <span>{topic.questions} {t('testsPage.questions')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
});
