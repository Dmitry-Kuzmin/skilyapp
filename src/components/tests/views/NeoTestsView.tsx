import { motion, useMotionValue, useTransform } from "framer-motion";
import {
    BookOpen, Shuffle, Zap, Flame,
    History, AlertTriangle, Clock,
    ChevronRight, Trophy, Sparkles, Target, TrendingUp, Award
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePremium } from "@/hooks/usePremium";
import { useTheme } from "next-themes";
import { useState, useRef } from "react";

interface NeoTestsViewProps {
    topics: any[];
    stats: any;
    challengeBankCount: number;
    randomQuestionCount: number;
    setRandomQuestionCount: (val: number) => void;
    handleStartTest: (path: string) => void;
    handleTopicClick: (id: string) => void;
}

// --- 3D Card Component ---
const NeoCard3D = ({
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
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateXValue = ((y - centerY) / centerY) * -10;
        const rotateYValue = ((x - centerX) / centerX) * 10;
        setRotateX(rotateXValue);
        setRotateY(rotateYValue);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
    };

    return (
        <motion.div
            ref={cardRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{
                rotateX,
                rotateY,
                scale: onClick ? (rotateX !== 0 || rotateY !== 0 ? 1.02 : 1) : 1
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{
                transformStyle: "preserve-3d",
                perspective: 1000,
            }}
            className={cn(
                "relative overflow-hidden rounded-[28px] border border-white/10 backdrop-blur-2xl",
                onClick && "cursor-pointer",
                className
            )}
        >
            {/* Animated Gradient Background */}
            {gradient && (
                <motion.div
                    animate={{
                        background: [
                            gradient,
                            gradient.replace(/deg/g, (match, offset) => `${parseInt(gradient.match(/\d+/)?.[0] || '0') + 30}deg`),
                            gradient,
                        ],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 opacity-90"
                />
            )}

            {/* Glass overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

            {/* Content */}
            <div className="relative z-10" style={{ transform: "translateZ(50px)" }}>
                {children}
            </div>
        </motion.div>
    );
};

// --- Floating Badge ---
const FloatingBadge = ({ icon: Icon, label, value, delay = 0 }: { icon: any, label: string, value: string | number, delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, type: "spring", stiffness: 100 }}
        whileHover={{ y: -5, scale: 1.05 }}
        className="relative group"
    >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative flex items-center gap-3 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="p-2.5 rounded-xl bg-white/20">
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider">{label}</div>
                <div className="text-2xl font-bold text-white leading-none mt-1">{value}</div>
            </div>
        </div>
    </motion.div>
);

export const NeoTestsView = ({
    topics,
    stats,
    challengeBankCount,
    randomQuestionCount,
    setRandomQuestionCount,
    handleStartTest,
    handleTopicClick
}: NeoTestsViewProps) => {
    const { isPremium } = usePremium();
    const { theme } = useTheme();
    const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

    const isDark = theme === "dark";

    return (
        <div className={cn(
            "w-full flex justify-center pt-12 pb-20 relative overflow-hidden",
            isDark ? "bg-[#0a0a0f]" : "bg-gradient-to-br from-gray-50 to-blue-50"
        )}>
            {/* Animated Background Orbs */}
            {isDark && (
                <>
                    <motion.div
                        animate={{
                            x: [0, 100, 0],
                            y: [0, -50, 0],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-3xl opacity-20"
                    />
                    <motion.div
                        animate={{
                            x: [0, -100, 0],
                            y: [0, 50, 0],
                            scale: [1, 1.3, 1],
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-gradient-to-r from-pink-600 to-orange-600 rounded-full blur-3xl opacity-20"
                    />
                </>
            )}

            <div className="w-full max-w-[1370px] px-6 space-y-10 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="text-center space-y-4"
                >
                    <motion.div
                        animate={{
                            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                        }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                        style={{ backgroundSize: "200% 200%" }}
                        className={cn(
                            "inline-block text-5xl md:text-7xl font-black tracking-tight bg-clip-text text-transparent",
                            isDark
                                ? "bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
                                : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
                        )}
                    >
                        Тестирование
                    </motion.div>
                    <p className={cn("text-lg md:text-xl font-medium", isDark ? "text-white/60" : "text-gray-600")}>
                        Выберите свой путь к совершенству
                    </p>
                </motion.div>

                {/* Stats - Floating Badges */}
                <div className="flex flex-wrap justify-center gap-4">
                    <FloatingBadge icon={Target} label="Точность" value={`${stats.accuracy}%`} delay={0.1} />
                    <FloatingBadge icon={TrendingUp} label="Прогресс" value={stats.totalAnswered} delay={0.2} />
                    <FloatingBadge icon={AlertTriangle} label="Ошибок" value={stats.errors} delay={0.3} />
                    <FloatingBadge icon={Award} label="Уровень" value="1" delay={0.4} />
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">

                    {/* Hero Card - Random Test */}
                    <div className="lg:col-span-7">
                        <NeoCard3D
                            onClick={() => handleStartTest(`/test/practice?count=${randomQuestionCount}`)}
                            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)"
                            className="h-full min-h-[400px] p-8"
                        >
                            <div className="h-full flex flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <motion.div
                                        whileHover={{ rotate: 180, scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 200 }}
                                        className="p-4 bg-white/20 rounded-2xl backdrop-blur-md"
                                    >
                                        <Shuffle className="w-8 h-8 text-white" />
                                    </motion.div>
                                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none font-bold px-4 py-2 shadow-lg">
                                        #1 ПОПУЛЯРНОЕ
                                    </Badge>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
                                            Случайный <br />тест
                                        </h2>
                                        <p className="text-white/90 text-lg">
                                            Проверьте знания на случайных вопросах из всех тем
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        {[10, 20, 30].map((count, i) => (
                                            <motion.button
                                                key={count}
                                                whileHover={{ scale: 1.1, y: -5 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRandomQuestionCount(count);
                                                }}
                                                className={cn(
                                                    "px-6 py-3 rounded-2xl font-bold text-lg transition-all",
                                                    randomQuestionCount === count
                                                        ? "bg-white text-purple-600 shadow-2xl shadow-white/50"
                                                        : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                                                )}
                                            >
                                                {count}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                <motion.div
                                    className="flex items-center gap-3 text-white/80 group-hover:text-white transition-colors"
                                    whileHover={{ x: 10 }}
                                >
                                    <span className="font-semibold">Начать сейчас</span>
                                    <ChevronRight className="w-5 h-5" />
                                </motion.div>
                            </div>
                        </NeoCard3D>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Exam Card */}
                        <NeoCard3D
                            onClick={() => handleStartTest("/test/exam")}
                            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                            className="p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Clock className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex gap-2">
                                    <Badge className="bg-white/30 text-white border-none backdrop-blur-sm">30 мин</Badge>
                                    <Badge className="bg-white/30 text-white border-none backdrop-blur-sm">Hard</Badge>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">Экзамен DGT</h3>
                            <p className="text-white/90 text-sm">
                                Полная симуляция официального экзамена
                            </p>
                        </NeoCard3D>

                        {/* Quick Modes Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <NeoCard3D
                                onClick={() => handleStartTest("/test/practice?mode=blitz&count=20&timer=300")}
                                gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                                className="aspect-square p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <Zap className="w-7 h-7 text-white" />
                                    <div>
                                        <div className="text-xl font-bold text-white">Блиц</div>
                                        <div className="text-xs text-white/80 mt-1">5 минут</div>
                                    </div>
                                </div>
                            </NeoCard3D>

                            <NeoCard3D
                                onClick={() => handleStartTest("/test/practice?mode=marathon")}
                                gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                                className="aspect-square p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <Flame className="w-7 h-7 text-white" />
                                    <div>
                                        <div className="text-xl font-bold text-white">Марафон</div>
                                        <div className="text-xs text-white/80 mt-1">До ошибки</div>
                                    </div>
                                </div>
                            </NeoCard3D>

                            <NeoCard3D
                                onClick={() => handleStartTest("/test/challenge-bank")}
                                gradient="linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
                                className="aspect-square p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <History className="w-7 h-7 text-purple-700" />
                                    <div>
                                        <div className="text-xl font-bold text-purple-900">Ошибки</div>
                                        <div className="text-xs text-purple-700 mt-1">{challengeBankCount}</div>
                                    </div>
                                </div>
                            </NeoCard3D>

                            <NeoCard3D
                                onClick={() => handleStartTest("/test/hardest")}
                                gradient="linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
                                className="aspect-square p-5"
                            >
                                <div className="h-full flex flex-col justify-between">
                                    <AlertTriangle className="w-7 h-7 text-orange-800" />
                                    <div>
                                        <div className="text-xl font-bold text-orange-900">Сложные</div>
                                        <div className="text-xs text-orange-700 mt-1">ТОП-50</div>
                                    </div>
                                </div>
                            </NeoCard3D>
                        </div>
                    </div>
                </div>

                {/* Topics Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={cn("text-3xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                            Темы курса
                        </h3>
                        <Badge className={cn(
                            "text-lg px-4 py-2 font-bold",
                            isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900"
                        )}>
                            {topics.length}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {topics.map((topic, i) => (
                            <motion.div
                                key={topic.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ scale: 1.05, y: -8 }}
                                onClick={() => handleTopicClick(topic.id)}
                                className={cn(
                                    "group relative overflow-hidden rounded-2xl p-5 cursor-pointer border transition-all",
                                    isDark
                                        ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                        : "bg-white border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-xl"
                                )}
                            >
                                {/* Gradient on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all duration-500" />

                                <div className="relative z-10 space-y-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all",
                                        isDark
                                            ? "bg-white/10 text-white group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-600"
                                            : "bg-gray-100 text-gray-700 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-600 group-hover:text-white"
                                    )}>
                                        {topic.number}
                                    </div>
                                    <div className={cn(
                                        "font-semibold text-sm line-clamp-2",
                                        isDark ? "text-white/80 group-hover:text-white" : "text-gray-700 group-hover:text-gray-900"
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
            </div>
        </div>
    );
};
