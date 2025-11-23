import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sparkles, LayoutDashboard, LayoutGrid, List, Grid3X3
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremium } from "@/hooks/usePremium";
import { useCoins } from "@/hooks/useCoins";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

// Views
import { ClassicTestsView } from "@/components/tests/views/ClassicTestsView";
import { BentoTestsView } from "@/components/tests/views/BentoTestsView";
import { DashboardTestCard } from "@/components/tests/DashboardTestCard";
import { TestCategoryCard } from "@/components/tests/TestCategoryCard";
import { TestModeSelector } from "@/components/tests/TestModeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, GraduationCap, Shuffle, Zap, Flame, History, AlertTriangle, Clock, Flag, Layers } from "lucide-react";

// --- Types ---
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
  const { isPremium } = usePremium();
  const { theme } = useTheme();

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
  const [styleVariant, setStyleVariant] = useState<"classic" | "dashboard" | "bento">("bento");

  const isDark = theme === "dark";

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
      const errors = totalAnswered - correct;

      setStats(prev => ({ ...prev, totalAnswered, correct, accuracy, errors }));
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

  // --- DASHBOARD STYLE RENDER (Inline for now to keep context) ---
  const renderDashboardStyle = () => (
    <div className="container px-4 mx-auto max-w-7xl pt-8 pb-20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={cn("text-3xl font-bold mb-2", isDark ? "text-white" : "text-gray-900")}>
              Центр тестирования
            </h1>
            <p className={cn(isDark ? "text-white/60" : "text-gray-600")}>
              Ваш прогресс и доступные тесты
            </p>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className={cn("text-sm", isDark ? "text-white/60" : "text-gray-600")}>Уровень</div>
                <div className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>1</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/20">
                D
              </div>
            </div>
          )}
        </div>

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
              <h2 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>Темы курса</h2>
              <Badge variant="outline" className={cn("border-white/10", isDark ? "text-white/60" : "text-gray-600")}>
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
            <h2 className={cn("text-2xl font-bold mb-6", isDark ? "text-white" : "text-gray-900")}>Экзамен</h2>
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
      </motion.div>
    </div>
  );

  // Determine background based on theme and style variant
  const getBackgroundClass = () => {
    if (styleVariant === "bento") {
      return isDark ? "bg-[#09090b]" : "bg-gray-50";
    } else if (styleVariant === "dashboard") {
      return isDark ? "bg-[#0B1120]" : "bg-gray-100";
    } else {
      // classic
      return isDark
        ? "bg-gradient-to-b from-background via-background/95 to-background/90"
        : "bg-gradient-to-b from-gray-50 via-white to-gray-50";
    }
  };

  return (
    <Layout>
      <div className={cn(
        "min-h-screen w-full transition-colors duration-500 flex flex-col",
        getBackgroundClass()
      )}>

        {/* Style Toggle */}
        <div className={cn(
          "fixed top-20 right-4 z-50 flex items-center gap-1 backdrop-blur-md p-1.5 rounded-full border shadow-2xl",
          isDark ? "bg-black/40 border-white/10" : "bg-white/80 border-gray-200"
        )}>
          <button
            onClick={() => setStyleVariant("classic")}
            className={cn(
              "p-2 rounded-full transition-all",
              styleVariant === "classic"
                ? (isDark ? "bg-white/20 text-white" : "bg-gray-200 text-gray-900")
                : (isDark ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-900")
            )}
            title="Classic"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setStyleVariant("dashboard")}
            className={cn(
              "p-2 rounded-full transition-all",
              styleVariant === "dashboard"
                ? (isDark ? "bg-white/20 text-white" : "bg-gray-200 text-gray-900")
                : (isDark ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-900")
            )}
            title="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
          <button
            onClick={() => setStyleVariant("bento")}
            className={cn(
              "p-2 rounded-full transition-all",
              styleVariant === "bento"
                ? (isDark ? "bg-white/20 text-white" : "bg-gray-200 text-gray-900")
                : (isDark ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-900")
            )}
            title="Bento Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>

        {styleVariant === "classic" && (
          <>
            {/* Header Section */}
            <div className={cn(
              "relative overflow-hidden pt-8 pb-12 md:pt-12 md:pb-16",
              isDark ? "bg-slate-950" : "bg-gray-100"
            )}>
              {isDark && (
                <>
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
                </>
              )}

              <div className="container relative z-10 px-4 mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-md border mb-4",
                        isDark ? "bg-white/10 border-white/10 text-white" : "bg-white border-gray-200 text-gray-700"
                      )}
                    >
                      <Sparkles className={cn("h-3 w-3", isDark ? "text-amber-400" : "text-amber-500")} />
                      <span>DGT Подготовка</span>
                    </motion.div>
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className={cn("text-3xl md:text-5xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-gray-900")}
                    >
                      Центр тестирования
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className={cn("max-w-xl text-lg", isDark ? "text-slate-400" : "text-gray-600")}
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
                      className={cn(
                        "flex items-center gap-4 backdrop-blur-md rounded-2xl p-4 border",
                        isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
                      )}
                    >
                      <div className="text-center px-2">
                        <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{stats.accuracy}%</div>
                        <div className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-600")}>Точность</div>
                      </div>
                      <div className={cn("h-8 w-px", isDark ? "bg-white/10" : "bg-gray-200")} />
                      <div className="text-center px-2">
                        <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{stats.totalAnswered}</div>
                        <div className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-600")}>Ответов</div>
                      </div>
                      <div className={cn("h-8 w-px", isDark ? "bg-white/10" : "bg-gray-200")} />
                      <div className="text-center px-2">
                        <div className={cn("text-2xl font-bold", isDark ? "text-amber-400" : "text-amber-500")}>1</div>
                        <div className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-600")}>Уровень</div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            <ClassicTestsView
              topics={topics}
              stats={stats}
              challengeBankCount={challengeBankCount}
              randomQuestionCount={randomQuestionCount}
              setRandomQuestionCount={setRandomQuestionCount}
              handleStartTest={handleStartTest}
              handleTopicClick={handleTopicClick}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </>
        )}

        {styleVariant === "dashboard" && renderDashboardStyle()}

        {styleVariant === "bento" && (
          <BentoTestsView
            topics={topics}
            stats={stats}
            challengeBankCount={challengeBankCount}
            randomQuestionCount={randomQuestionCount}
            setRandomQuestionCount={setRandomQuestionCount}
            handleStartTest={handleStartTest}
            handleTopicClick={handleTopicClick}
          />
        )}
      </div>
    </Layout>
  );
};

export default Tests;
