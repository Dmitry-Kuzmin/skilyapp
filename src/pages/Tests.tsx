import { useState, useEffect, Fragment, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Target, BookOpen, TrendingUp, CheckCircle2, XCircle, Award,
  ListOrdered, AlertTriangle, Shuffle, Star, Clock, Flag,
  Trophy, Layers, ArrowRight, Lock, Unlock, Play, Eye, Zap,
  Sparkles, Flame, Brain, GraduationCap, History, LayoutDashboard, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremium } from "@/hooks/usePremium";
import { useCoins } from "@/hooks/useCoins";
import { cn } from "@/lib/utils";
import { dispatchUserEvent } from "@/lib/notification-events";
import { TestCategoryCard } from "@/components/tests/TestCategoryCard";
import { TestModeSelector } from "@/components/tests/TestModeSelector";
import { DashboardTestCard } from "@/components/tests/DashboardTestCard";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// --- Types ---
type Test = {
  id: string;
  test_number: number;
  title_ru: string;
  questions_count: number;
  topic_id: string;
  progress: {
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed' | 'passed' | 'failed';
    score: number | null;
    best_score: number | null;
    attempts_count: number;
    correct_answers: number | null;
    total_questions: number | null;
  } | null;
};

type Topic = {
  id: string;
  number: number;
  name: string;
  questions: number;
  cover_image?: string;
  gradient_from?: string;
  gradient_to?: string;
  is_premium?: boolean;
};

const Tests = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, profileId } = useUserContext();
  const { t } = useLanguage();
  const { isPremium } = usePremium();
  const { balance } = useCoins();

  // State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState({
    accuracy: 0,
    completed: 0,
    correct: 0,
    errors: 0,
    totalAnswered: 0,
    averageScore: 0
  });
  const [challengeBankCount, setChallengeBankCount] = useState(0);
  const [randomQuestionCount, setRandomQuestionCount] = useState(20);
  const [activeTab, setActiveTab] = useState("learning");
  const [loading, setLoading] = useState(true);

  // Style variant state
  const [styleVariant, setStyleVariant] = useState<"classic" | "dashboard">("dashboard");

  // Load data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        loadTopics(),
        isAuthenticated && profileId ? loadStats() : Promise.resolve(),
        isAuthenticated && profileId ? loadChallengeBankCount() : Promise.resolve()
      ]);
      setLoading(false);
    };
    init();
  }, [isAuthenticated, profileId]);

  // Set active tab from URL if present
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["learning", "practice", "exam"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadTopics = async () => {
    try {
      const { data: dbTopics, error } = await supabase
        .from("topics")
        .select(`
          id, number, title_ru, cover_image, 
          gradient_from, gradient_to, is_premium
        `)
        .order('number');

      if (error) throw error;

      // Mock questions count for now to save requests
      // In real app, this should be a view or RPC
      const topicsWithCounts = (dbTopics || []).map(topic => ({
        id: topic.id,
        number: topic.number,
        name: topic.title_ru || `Тема ${topic.number}`,
        questions: 40, // Placeholder
        cover_image: topic.cover_image,
        gradient_from: topic.gradient_from,
        gradient_to: topic.gradient_to,
        is_premium: topic.is_premium || false,
      }));

      setTopics(topicsWithCounts);
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  };

  const loadStats = async () => {
    if (!profileId) return;
    try {
      const { data } = await supabase
        .from("user_progress")
        .select("is_correct")
        .eq("user_id", profileId);

      const totalAnswered = data?.length || 0;
      const correct = data?.filter((item) => item.is_correct).length || 0;
      const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;

      setStats(prev => ({ ...prev, totalAnswered, correct, accuracy }));
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadChallengeBankCount = async () => {
    if (!profileId) return;
    try {
      // @ts-ignore
      const { count } = await supabase
        .from('user_challenge_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('mastered', false);

      setChallengeBankCount(count || 0);
    } catch (error) {
      console.error("Error loading challenge bank:", error);
    }
  };

  const handleStartTest = (path: string) => {
    navigate(path);
  };

  const handleTopicClick = (topicId: string) => {
    navigate(`/tests/topic/${topicId}`);
  };

  // --- DASHBOARD STYLE RENDER ---
  const renderDashboardStyle = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardTestCard
            title="Случайный тест"
            subtitle="Подборка случайных вопросов из всех тем. Отлично подходит для быстрой проверки знаний."
            icon={Shuffle}
            variant="hero"
            gradient="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
            onClick={() => handleStartTest(`/test/practice?count=${randomQuestionCount}`)}
            className="h-full"
          />
        </div>
        <div className="space-y-6">
          <DashboardTestCard
            title="Блиц-спринт"
            subtitle="20 вопросов, 5 минут"
            icon={Zap}
            variant="standard"
            accentColor="text-amber-500"
            onClick={() => handleStartTest("/test/practice?mode=blitz&count=20&timer=300")}
          />
          <DashboardTestCard
            title="Марафон"
            subtitle="До первой ошибки"
            icon={Flame}
            variant="standard"
            accentColor="text-red-500"
            onClick={() => handleStartTest("/test/practice?mode=marathon")}
          />
        </div>
      </div>

      {/* Topics Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Темы курса</h2>
          <Badge variant="outline" className="border-white/10 text-white/60">
            {topics.length} тем
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {topics.map((topic) => (
            <DashboardTestCard
              key={topic.id}
              title={topic.name}
              subtitle={`${topic.questions} вопросов`}
              icon={BookOpen}
              variant={topic.is_premium && !isPremium ? "locked" : "standard"}
              accentColor="text-blue-500"
              progress={{ current: 0, total: topic.questions }}
              onClick={() => handleTopicClick(topic.id)}
            />
          ))}
        </div>
      </div>

      {/* Exam Section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Экзамен</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardTestCard
            title="Симулятор экзамена"
            subtitle="Полная имитация: 30 вопросов, 30 минут"
            icon={Clock}
            variant="standard"
            accentColor="text-green-500"
            onClick={() => handleStartTest("/test/exam")}
          />
          <DashboardTestCard
            title="Работа над ошибками"
            subtitle={`${challengeBankCount} вопросов требуют повторения`}
            icon={History}
            variant={challengeBankCount > 0 ? "standard" : "locked"}
            accentColor="text-purple-500"
            onClick={() => handleStartTest("/test/challenge-bank")}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className={cn(
        "min-h-screen pb-20 transition-colors duration-500",
        styleVariant === "dashboard"
          ? "bg-[#0B1120]" // Deep dark blue for dashboard style
          : "bg-gradient-to-b from-background via-background/95 to-background/90"
      )}>

        {/* Style Toggle */}
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10">
          <LayoutGrid className={cn("w-4 h-4", styleVariant === "classic" ? "text-white" : "text-white/40")} />
          <Switch
            checked={styleVariant === "dashboard"}
            onCheckedChange={(checked) => setStyleVariant(checked ? "dashboard" : "classic")}
          />
          <LayoutDashboard className={cn("w-4 h-4", styleVariant === "dashboard" ? "text-white" : "text-white/40")} />
        </div>

        {styleVariant === "classic" ? (
          /* CLASSIC STYLE (Previous Implementation) */
          <>
            {/* Header Section */}
            <div className="relative overflow-hidden bg-slate-950 pt-8 pb-12 md:pt-12 md:pb-16">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />

              <div className="container relative z-10 px-4 mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10 mb-4"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>DGT Подготовка</span>
                    </motion.div>
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight"
                    >
                      Центр тестирования
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-slate-400 max-w-xl text-lg"
                    >
                      Проходите тесты, улучшайте навыки и готовьтесь к экзамену в удобном формате.
                    </motion.p>
                  </div>

                  {/* User Stats Mini-Card */}
                  {isAuthenticated && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10"
                    >
                      <div className="text-center px-2">
                        <div className="text-2xl font-bold text-white">{stats.accuracy}%</div>
                        <div className="text-xs text-slate-400">Точность</div>
                      </div>
                      <div className="h-8 w-px bg-white/10" />
                      <div className="text-center px-2">
                        <div className="text-2xl font-bold text-white">{stats.totalAnswered}</div>
                        <div className="text-xs text-slate-400">Ответов</div>
                      </div>
                      <div className="h-8 w-px bg-white/10" />
                      <div className="text-center px-2">
                        <div className="text-2xl font-bold text-amber-400">{1}</div>
                        <div className="text-xs text-slate-400">Уровень</div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="container px-4 mx-auto max-w-6xl -mt-8 relative z-20">
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
                        <h2 className="text-2xl font-bold">Темы курса</h2>
                        <Badge variant="outline" className="px-3 py-1">
                          {topics.length} тем
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {topics.map((topic, index) => (
                          <TestCategoryCard
                            key={topic.id}
                            title={topic.name}
                            description={`${topic.questions} вопросов`}
                            icon={BookOpen}
                            variant={topic.is_premium && !isPremium ? "locked" : "default"}
                            number={topic.number}
                            image={topic.cover_image}
                            gradient={topic.gradient_from && topic.gradient_to
                              ? `linear-gradient(135deg, ${topic.gradient_from}, ${topic.gradient_to})`
                              : undefined}
                            progress={{ current: 0, total: topic.questions }} // Placeholder progress
                            onClick={() => handleTopicClick(topic.id)}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Random Test */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-1">
                          <Card className="h-full p-6 border-white/10 bg-gradient-to-br from-slate-900 to-slate-950">
                            <div className="flex items-start justify-between mb-6">
                              <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400">
                                <Shuffle className="w-8 h-8" />
                              </div>
                              <Badge className="bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border-teal-500/20">
                                Популярное
                              </Badge>
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-white">Случайный тест</h3>
                            <p className="text-slate-400 mb-6">
                              Подборка случайных вопросов из всех тем. Отлично подходит для быстрой проверки знаний.
                            </p>

                            <div className="space-y-6">
                              <TestModeSelector
                                options={[10, 20, 30, 40]}
                                selected={randomQuestionCount}
                                onSelect={setRandomQuestionCount}
                              />
                              <Button
                                className="w-full bg-teal-600 hover:bg-teal-500 text-white h-12 text-lg"
                                onClick={() => handleStartTest(`/test/practice?count=${randomQuestionCount}`)}
                              >
                                Начать тест
                              </Button>
                            </div>
                          </Card>
                        </div>

                        {/* New Modes Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-1 md:col-span-2 lg:col-span-1">
                          {/* Blitz */}
                          <TestCategoryCard
                            title="Блиц-спринт"
                            description="20 вопросов на скорость. У вас всего 5 минут!"
                            icon={Zap}
                            gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                            onClick={() => handleStartTest("/test/practice?mode=blitz&count=20&timer=300")}
                          />

                          {/* Marathon */}
                          <TestCategoryCard
                            title="Марафон"
                            description="Игра до первой ошибки. Как далеко вы сможете зайти?"
                            icon={Flame}
                            gradient="linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)"
                            onClick={() => handleStartTest("/test/practice?mode=marathon")}
                          />

                          {/* Challenge Bank */}
                          <TestCategoryCard
                            title="Работа над ошибками"
                            description={`${challengeBankCount} вопросов требуют повторения`}
                            icon={History}
                            variant={challengeBankCount > 0 ? "default" : "locked"}
                            gradient="linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)"
                            onClick={() => handleStartTest("/test/challenge-bank")}
                          />

                          {/* Hardest */}
                          <TestCategoryCard
                            title="Сложные вопросы"
                            description="ТОП-50 самых сложных вопросов по статистике"
                            icon={AlertTriangle}
                            gradient="linear-gradient(135deg, #64748B 0%, #475569 100%)"
                            onClick={() => handleStartTest("/test/hardest")}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-8 border-white/10 bg-gradient-to-br from-blue-950 to-slate-950 relative overflow-hidden group cursor-pointer"
                          onClick={() => handleStartTest("/test/exam")}
                        >
                          <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mb-6 text-blue-400">
                              <Clock className="w-8 h-8" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-3">Симулятор экзамена</h3>
                            <p className="text-slate-300 mb-6 text-lg">
                              Полная имитация реального экзамена DGT. 30 вопросов, 30 минут, макс. 3 ошибки.
                            </p>
                            <ul className="space-y-3 mb-8 text-slate-400">
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                Официальная структура
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                Таймер 30 минут
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                Сертификат при сдаче
                              </li>
                            </ul>
                            <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-500">
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
                          />
                          <TestCategoryCard
                            title="Модульный тест"
                            description="Тестирование по блокам тем"
                            icon={Layers}
                            gradient="linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
                            onClick={() => handleStartTest("/tests/sequential")}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            </div>
          </>
        ) : (
          /* DASHBOARD STYLE (New Implementation) */
          <div className="container px-4 mx-auto max-w-7xl pt-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Центр тестирования</h1>
                  <p className="text-white/60">Ваш прогресс и доступные тесты</p>
                </div>
                {isAuthenticated && (
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm text-white/60">Уровень</div>
                      <div className="text-xl font-bold text-white">1</div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/20">
                      D
                    </div>
                  </div>
                )}
              </div>

              {renderDashboardStyle()}
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Tests;
