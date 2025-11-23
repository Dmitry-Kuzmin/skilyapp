import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen, Brain, GraduationCap, Shuffle, Zap, Flame,
    History, AlertTriangle, Clock, CheckCircle2, Flag, Layers
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestCategoryCard } from "../TestCategoryCard";
import { TestModeSelector } from "../TestModeSelector";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";

interface ClassicTestsViewProps {
    topics: any[];
    stats: any;
    challengeBankCount: number;
    randomQuestionCount: number;
    setRandomQuestionCount: (val: number) => void;
    handleStartTest: (path: string) => void;
    handleTopicClick: (id: string) => void;
    activeTab: string;
    setActiveTab: (val: string) => void;
}

export const ClassicTestsView = ({
    topics,
    stats,
    challengeBankCount,
    randomQuestionCount,
    setRandomQuestionCount,
    handleStartTest,
    handleTopicClick,
    activeTab,
    setActiveTab
}: ClassicTestsViewProps) => {
    const { isPremium } = usePremium();

    return (
        <div className="container px-4 mx-auto max-w-[1370px] -mt-8 relative z-20 pb-20">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="w-full justify-start h-auto p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-x-auto flex-nowrap">
                    <TabsTrigger
                        value="learning"
                        className="flex-1 min-w-[120px] py-3 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                    >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Обучение
                    </TabsTrigger>
                    <TabsTrigger
                        value="practice"
                        className="flex-1 min-w-[120px] py-3 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                    >
                        <Brain className="w-4 h-4 mr-2" />
                        Практика
                    </TabsTrigger>
                    <TabsTrigger
                        value="exam"
                        className="flex-1 min-w-[120px] py-3 text-sm md:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                    >
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Экзамен
                    </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                    {/* LEARNING TAB */}
                    <TabsContent value="learning" className="space-y-6 focus-visible:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Темы курса</h2>
                                <Badge variant="outline" className="px-3 py-1 border-white/20 text-white">
                                    {topics.length} тем
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {topics.map((topic) => (
                                    <TestCategoryCard
                                        key={topic.id}
                                        title={topic.name}
                                        description={`${topic.questions} вопросов`}
                                        icon={BookOpen}
                                        variant={topic.is_premium && !isPremium ? "locked" : "default"}
                                        number={topic.number}
                                        image={topic.cover_image}
                                        gradient={topic.gradient_from && topic.gradient_to
                                            ? `linear-gradient(135deg, ${topic.gradient_from}dd, ${topic.gradient_to}dd)`
                                            : undefined}
                                        progress={{ current: 0, total: topic.questions }}
                                        onClick={() => handleTopicClick(topic.id)}
                                        className="h-full border-white/10 hover:border-white/30"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </TabsContent>

                    {/* PRACTICE TAB */}
                    <TabsContent value="practice" className="space-y-6 focus-visible:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Random Test - Improved Card */}
                                <div className="lg:col-span-4">
                                    <Card className="h-full p-8 border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 shadow-xl flex flex-col">
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="p-4 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                                <Shuffle className="w-10 h-10" />
                                            </div>
                                            <Badge className="bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border-teal-500/20 px-3 py-1">
                                                Популярное
                                            </Badge>
                                        </div>
                                        <h3 className="text-3xl font-bold mb-3 text-white">Случайный тест</h3>
                                        <p className="text-slate-400 mb-8 text-lg leading-relaxed flex-1">
                                            Подборка случайных вопросов из всех тем. Идеально для регулярной тренировки и проверки знаний.
                                        </p>

                                        <div className="space-y-8">
                                            <TestModeSelector
                                                options={[10, 20, 30, 40]}
                                                selected={randomQuestionCount}
                                                onSelect={setRandomQuestionCount}
                                                label="Количество вопросов:"
                                            />
                                            <Button
                                                className="w-full bg-teal-600 hover:bg-teal-500 text-white h-14 text-lg font-semibold rounded-xl shadow-lg shadow-teal-900/20"
                                                onClick={() => handleStartTest(`/test/practice?count=${randomQuestionCount}`)}
                                            >
                                                Начать тест
                                            </Button>
                                        </div>
                                    </Card>
                                </div>

                                {/* New Modes Grid - Consistent Heights */}
                                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <TestCategoryCard
                                        title="Блиц-спринт"
                                        description="20 вопросов, 5 минут"
                                        icon={Zap}
                                        gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                                        onClick={() => handleStartTest("/test/practice?mode=blitz&count=20&timer=300")}
                                        className="h-full min-h-[180px]"
                                    />

                                    <TestCategoryCard
                                        title="Марафон"
                                        description="До первой ошибки"
                                        icon={Flame}
                                        gradient="linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)"
                                        onClick={() => handleStartTest("/test/practice?mode=marathon")}
                                        className="h-full min-h-[180px]"
                                    />

                                    <TestCategoryCard
                                        title="Работа над ошибками"
                                        description={`${challengeBankCount} вопросов`}
                                        icon={History}
                                        variant={challengeBankCount > 0 ? "default" : "locked"}
                                        gradient="linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)"
                                        onClick={() => handleStartTest("/test/challenge-bank")}
                                        className="h-full min-h-[180px]"
                                    />

                                    <TestCategoryCard
                                        title="Сложные вопросы"
                                        description="ТОП-50 сложных"
                                        icon={AlertTriangle}
                                        gradient="linear-gradient(135deg, #64748B 0%, #475569 100%)"
                                        onClick={() => handleStartTest("/test/hardest")}
                                        className="h-full min-h-[180px]"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </TabsContent>

                    {/* EXAM TAB */}
                    <TabsContent value="exam" className="space-y-6 focus-visible:outline-none">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="p-8 border-white/10 bg-gradient-to-br from-blue-950 to-slate-950 relative overflow-hidden group cursor-pointer hover:border-blue-500/30 transition-all"
                                    onClick={() => handleStartTest("/test/exam")}
                                >
                                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mb-6 text-blue-400 border border-blue-500/20">
                                            <Clock className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-3xl font-bold text-white mb-3">Симулятор экзамена</h3>
                                        <p className="text-slate-300 mb-6 text-lg">
                                            Полная имитация реального экзамена DGT.
                                        </p>
                                        <ul className="space-y-4 mb-8 text-slate-400">
                                            <li className="flex items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                                <span>30 вопросов, 30 минут</span>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                                <span>Максимум 3 ошибки</span>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                                <span>Официальный формат</span>
                                            </li>
                                        </ul>
                                        <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20">
                                            Начать экзамен
                                        </Button>
                                    </div>
                                </Card>

                                <div className="space-y-4">
                                    <TestCategoryCard
                                        title="Финальный тест"
                                        description="Проверка знаний по всему курсу"
                                        icon={Flag}
                                        gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                                        onClick={() => handleStartTest("/test/final")}
                                        className="h-[calc(50%-0.5rem)]"
                                    />
                                    <TestCategoryCard
                                        title="Модульный тест"
                                        description="Тестирование по блокам тем"
                                        icon={Layers}
                                        gradient="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
                                        onClick={() => handleStartTest("/tests/sequential")}
                                        className="h-[calc(50%-0.5rem)]"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </TabsContent>
                </AnimatePresence>
            </Tabs>
        </div>
    );
};
