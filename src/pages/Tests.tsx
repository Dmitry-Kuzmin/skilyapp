import { useState, useEffect, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Target, BookOpen, TrendingUp, CheckCircle2, XCircle, Award, ListOrdered, AlertTriangle, Shuffle, Star, Clock, Flag, Trophy, Layers, ArrowRight, Lock, Unlock, Play, Eye, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExamReadinessCard } from "@/components/ExamReadinessCard";
import { usePremium } from "@/hooks/usePremium";
import { PaywallModal } from "@/components/monetization/PaywallModal";
import { TestUpsellBanner } from "@/components/monetization/TestUpsellBanner";
import { useCoins } from "@/hooks/useCoins";
import { cn } from "@/lib/utils";

const ACCENT_GRADIENTS = [
  { from: "#111827", via: "#4338CA", to: "#C084FC", glow: "#C084FC55" },
  { from: "#0F172A", via: "#2563EB", to: "#38BDF8", glow: "#38BDF855" },
  { from: "#18181B", via: "#EC4899", to: "#F97316", glow: "#F9731655" },
  { from: "#020617", via: "#14B8A6", to: "#86EFAC", glow: "#14B8A655" },
  { from: "#111827", via: "#FACC15", to: "#F97316", glow: "#FACC1555" },
];

const getTopicGradient = (topicIndex: number, topic?: { gradient_from?: string; gradient_to?: string }) => {
  if (topic?.gradient_from && topic?.gradient_to) {
    return {
      background: `linear-gradient(135deg, ${topic.gradient_from} 0%, ${topic.gradient_to} 100%)`,
      glow: `${topic.gradient_to || topic.gradient_from}33`,
    };
  }
  const accent = ACCENT_GRADIENTS[topicIndex % ACCENT_GRADIENTS.length];
  return {
    background: `linear-gradient(135deg, ${accent.from} 0%, ${accent.via} 50%, ${accent.to} 100%)`,
    glow: accent.glow,
  };
};

const getQuestionLabel = (count: number) => {
  if (count === 1) return "вопрос";
  if (count >= 2 && count <= 4) return "вопроса";
  return "вопросов";
};

type Test = {
  id: string;
  test_number: number;
  title_ru: string;
  title_es: string;
  title_en: string;
  description_ru: string | null;
  description_es: string | null;
  description_en: string | null;
  questions_count: number;
  min_pass_percent: number;
  order_index: number;
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

const Tests = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, profileId } = useUserContext();
  const { t } = useLanguage(); // Используем существующий LanguageContext!
  const { isPremium } = usePremium();
  const { balance } = useCoins();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [testAttempts, setTestAttempts] = useState(0);
  const [failedTestsCount, setFailedTestsCount] = useState(0);
  const handleStartPath = (path: string) => {
    if (!isPremium) {
      setTestAttempts((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setPaywallOpen(true);
          return 0;
        }
        return next;
      });
    }
    navigate(path);
  };
  const [topics, setTopics] = useState<{ 
    id: string;
    number: number;
    name: string; 
    questions: number;
    cover_image?: string;
    gradient_from?: string;
    gradient_to?: string;
    is_premium?: boolean;
  }[]>([]);
  const [stats, setStats] = useState({ 
    accuracy: 0, 
    completed: 0, 
    correct: 0, 
    errors: 0,
    totalAnswered: 0,
    averageScore: 0
  });
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [challengeBankCount, setChallengeBankCount] = useState(0);
  const [randomQuestionCount, setRandomQuestionCount] = useState(10);
  
  // States for topic tests modal
  const [selectedTopicForModal, setSelectedTopicForModal] = useState<{ id: string; name: string; number: number } | null>(null);
  const [topicTests, setTopicTests] = useState<Test[]>([]);
  const [loadingTopicTests, setLoadingTopicTests] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);

  useEffect(() => {
    loadTopics();
    if (isAuthenticated && profileId) {
      loadStats();
      loadChallengeBankCount();
      initializeUserProgress();
    }
  }, [isAuthenticated, profileId]);

  const initializeUserProgress = async () => {
    if (!profileId) return;
    
    try {
      const { error } = await supabase.rpc('initialize_user_test_progress', {
        p_user_id: profileId
      });
      
      if (error) {
        console.error('Error initializing user progress:', error);
      }
    } catch (error) {
      console.error('Error initializing user progress:', error);
    }
  };

  const handleTopicCardClick = async (topic: { id: string; name: string; number: number }) => {
    console.log('[Tests] Opening modal for topic:', topic);
    setSelectedTopicForModal(topic);
    setIsTopicModalOpen(true);
    await loadTopicTests(topic.id);
  };

  const loadTopicTests = async (topicId: string) => {
    try {
      setLoadingTopicTests(true);
      console.log('[Tests] Loading tests for topic:', topicId);
      
      // Загружаем тесты для выбранной темы
      const { data: testsData, error: testsError } = await supabase
        .from("tests")
        .select("*")
        .eq("topic_id", topicId)
        .order("order_index");

      if (testsError) throw testsError;
      console.log('[Tests] Loaded tests:', testsData?.length || 0, testsData);

      // Загружаем прогресс пользователя, если авторизован
      let progressMap = new Map<string, Test['progress']>();
      
      if (isAuthenticated && profileId) {
        const { data: progressData, error: progressError } = await supabase
          .from("user_test_progress")
          .select("*")
          .eq("user_id", profileId)
          .in("test_id", (testsData || []).map(t => t.id));

        if (!progressError && progressData) {
          progressData.forEach(p => {
            progressMap.set(p.test_id, {
              status: p.status,
              score: p.score,
              best_score: p.best_score,
              attempts_count: p.attempts_count,
              correct_answers: p.correct_answers,
              total_questions: p.total_questions,
            });
          });
        }
      }

      // Объединяем тесты с прогрессом
      const testsWithProgress = (testsData || []).map(test => ({
        ...test,
        progress: progressMap.get(test.id) || null,
      }));

      console.log('[Tests] Tests with progress:', testsWithProgress.length, testsWithProgress);
      setTopicTests(testsWithProgress);
    } catch (error) {
      console.error("Error loading topic tests:", error);
      toast.error("Ошибка загрузки тестов");
    } finally {
      setLoadingTopicTests(false);
    }
  };

  const handleStartTest = (test: Test) => {
    if (test.progress?.status === 'locked') {
      toast.error("Этот тест заблокирован. Пройдите предыдущие тесты.");
      return;
    }
    setIsTopicModalOpen(false);
    navigate(`/test/sequential/${test.id}`);
  };

  const getStatusIcon = (test: Test) => {
    if (!test.progress || test.progress.status === 'locked') {
      return <Lock className="h-4 w-4 text-muted-foreground" />;
    }
    if (test.progress.status === 'passed') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (test.progress.status === 'failed') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (test.progress.status === 'unlocked') {
      return <Unlock className="h-4 w-4 text-blue-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (test: Test) => {
    if (!test.progress || test.progress.status === 'locked') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Заблокирован
        </Badge>
      );
    }
    if (test.progress.status === 'passed') {
      return (
        <Badge variant="default" className="bg-green-500 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Пройден
        </Badge>
      );
    }
    if (test.progress.status === 'failed') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Не пройден
        </Badge>
      );
    }
    if (test.progress.status === 'unlocked') {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-500 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Доступен
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        В процессе
      </Badge>
    );
  };

  const getProgressPercentage = (test: Test) => {
    if (!test.progress || test.progress.status === 'locked') {
      return 0;
    }
    if (test.progress.total_questions && test.progress.total_questions > 0) {
      return Math.round((test.progress.correct_answers || 0) / test.progress.total_questions * 100);
    }
    return 0;
  };

  // Если пришли с карты обучения с параметром ?topic=ID, выбираем эту тему по умолчанию
  useEffect(() => {
    const fromTopic = searchParams.get("topic");
    if (fromTopic) {
      setSelectedTopic(fromTopic);
    }
  }, [searchParams]);

  const loadChallengeBankCount = async () => {
    if (!profileId) return;
    
    try {
      // @ts-ignore - user_challenge_questions not in generated types yet
      const { count, error } = await (supabase as any)
        .from('user_challenge_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('mastered', false);

      if (error) throw error;
      setChallengeBankCount(count || 0);
    } catch (error) {
      console.error('Error loading Challenge Bank count:', error);
    }
  };

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const loadTopics = async () => {
    try {
      // Загружаем темы из Google Sheets
      const sheetsId = '10TQX3YzteSx-nHFJZMnMejM167fqjAvz6hq-j7dZrUE';
      const topicsUrl = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=Topics`;
      
      const response = await fetch(topicsUrl);
      if (!response.ok) {
        // Fallback: загружаем из базы данных, если Google Sheets недоступен
        const { data: dbTopics, error: dbError } = await supabase
        .from("topics")
        .select(`
          id,
          number,
          title_ru,
          cover_image,
          gradient_from,
          gradient_to,
          is_premium
        `)
        .order('number');

        if (dbError) throw dbError;

      const topicsWithCounts = await Promise.all(
          (dbTopics || []).map(async (topic) => {
          const { count } = await supabase
            .from("questions_new")
            .select("*", { count: 'exact', head: true })
            .eq('topic_id', topic.id);

          return {
            id: topic.id,
            number: topic.number,
            name: topic.title_ru,
            questions: count || 0,
            cover_image: topic.cover_image,
            gradient_from: topic.gradient_from,
            gradient_to: topic.gradient_to,
            is_premium: topic.is_premium,
            };
          })
        );
        setTopics(topicsWithCounts);
        return;
      }
      
      const csvText = await response.text();
      const allRows = csvText.split('\n').filter(row => row.trim());
      
      // Пропускаем заголовок (первую строку)
      const rows = allRows.slice(1);
      
      // Получаем все темы из базы для сопоставления ID и cover_image
      const { data: dbTopics } = await supabase
        .from("topics")
        .select("id, number, cover_image, gradient_from, gradient_to, is_premium")
        .order('number');
      
      const topicIdMap = new Map((dbTopics || []).map(t => [t.number, t]));
      
      const parseBool = (val?: string): boolean => {
        if (!val) return false;
        return val.toLowerCase() === 'true' || val === '✔' || val === '1' || val.toLowerCase() === 'yes';
      };
      
      const topicsFromSheets = await Promise.all(
        rows.map(async (row) => {
          const columns = parseCSVRow(row);
          
          const number = parseInt(columns[0]) || 0;
          const name = columns[1] || `Тема ${number}`;
          const gradientFrom = columns[3] || undefined;
          const gradientTo = columns[4] || undefined;
          const isPremium = parseBool(columns[5]);
          
          const dbTopic = topicIdMap.get(number);
          const topicId = dbTopic?.id || `topic-${number}`;
          
          // Используем cover_image из базы данных (приоритет), если нет - из Google Sheets
          const coverImage = dbTopic?.cover_image || columns[2] || undefined;
          
          // Используем градиенты из базы данных, если нет - из Google Sheets
          const finalGradientFrom = dbTopic?.gradient_from || gradientFrom;
          const finalGradientTo = dbTopic?.gradient_to || gradientTo;
          const finalIsPremium = dbTopic?.is_premium || isPremium;
          
          // Загружаем количество вопросов для темы
            const { count } = await supabase
              .from("questions_new")
              .select("*", { count: 'exact', head: true })
              .eq('topic_id', topicId);
          
          return {
            id: topicId,
            number,
            name,
            questions: count || 0,
            cover_image: coverImage,
            gradient_from: finalGradientFrom,
            gradient_to: finalGradientTo,
            is_premium: finalIsPremium,
          };
        })
      );

      setTopics(topicsFromSheets);
    } catch (error) {
      console.error("Error loading topics:", error);
      toast.error("Не удалось загрузить темы");
    }
  };

  const loadStats = async () => {
    if (!profileId) return;
    
    try {
      // Load user progress statistics
      const { data, error } = await supabase
        .from("user_progress")
        .select("is_correct")
        .eq("user_id", profileId);

      if (error) throw error;

      const totalAnswered = data?.length || 0;
      const correct = data?.filter((item) => item.is_correct).length || 0;
      const errors = totalAnswered - correct;
      const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;

        setStats({
        ...stats,
        totalAnswered,
        correct,
        errors,
          accuracy,
        });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handlePracticeStart = () => {
    if (selectedTopic === "all") {
      navigate("/test/practice");
    } else {
      navigate(`/tests/${selectedTopic}`);
    }
  };

  return (
    <Fragment>
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 pb-20 md:pb-4 max-w-[1370px]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('practiceTests')}</h1>
          <p className="text-muted-foreground">
            Выбери режим и начни подготовку к экзамену
          </p>
        </div>

        {/* Inline Upsell Banners - только при триггерах */}
        {!isPremium && (
          <>
            {balance < 50 && (
              <TestUpsellBanner trigger="low_coins" coins={balance} />
            )}
            {failedTestsCount >= 2 && (
              <TestUpsellBanner trigger="failed_tests" failedCount={failedTestsCount} />
            )}
            {testAttempts >= 3 && (
              <TestUpsellBanner trigger="attempt_limit" />
            )}
          </>
        )}

        {/* Practice Mode Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">{t('practiceMode')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Random - с выбором количества */}
            <Card
              className="p-5 hover:shadow-lg transition-all group"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
                  <Shuffle className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t('random')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('selectQuestionCount')}
                  </p>
                </div>

                {/* Кнопки выбора количества */}
                <div className="grid grid-cols-4 gap-2 w-full">
                  {[10, 20, 30, 40].map((count) => (
                    <button
                      key={count}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRandomQuestionCount(count);
                      }}
                      className={`
                        py-2 px-3 rounded-lg text-sm font-semibold transition-all
                        ${randomQuestionCount === count 
                          ? 'bg-teal-500 text-white shadow-md scale-105' 
                          : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20'
                        }
                      `}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                {/* Кнопка запуска */}
                <Button
                  onClick={() => handleStartPath(`/test/practice?count=${randomQuestionCount}`)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  size="sm"
                >
                  {t('startTest')}
                </Button>
            </div>
          </Card>

            {/* Incorrectly answered - ТЕСТ из Challenge Bank */}
            {challengeBankCount > 0 && (
            <Card 
              className="p-5 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
              onClick={() => handleStartPath("/test/challenge-bank")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors relative">
                    <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
                    {challengeBankCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {challengeBankCount}
                      </span>
                    )}
                  </div>
                <h3 className="font-semibold">{t('incorrectlyAnswered')} ({challengeBankCount})</h3>
                <p className="text-xs text-muted-foreground">
                  {t('incorrectlyAnsweredDesc')}
                </p>
                </div>
              </Card>
            )}

            {/* Saved Questions - показываем только если есть сохранённые */}
            {challengeBankCount > 0 && (
            <Card 
              className="p-5 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
              onClick={() => handleStartPath("/test/challenge-bank")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors relative">
                    <Star className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {challengeBankCount}
                </span>
              </div>
                  <h3 className="font-semibold">{t('savedQuestions')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('savedQuestionsDesc')}
                  </p>
                </div>
              </Card>
            )}

            {/* Mastery Mode - повтор пока всё правильно */}
            <Card 
              className="p-5 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
              onClick={() => handleStartPath("/test/mastery")}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <Trophy className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">{t('masteryMode')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('masteryModeDesc')}
                </p>
              </div>
            </Card>

            {/* Hardest questions - самые сложные */}
            <Card 
              className="p-5 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
              onClick={() => handleStartPath("/test/hardest")}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-gray-500/20 flex items-center justify-center group-hover:bg-gray-500/30 transition-colors">
                  <AlertTriangle className="w-7 h-7 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="font-semibold">{t('hardestQuestions')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('hardestQuestionsDesc')}
                </p>
              </div>
            </Card>
            </div>
        </div>

        {/* Topics Section - Updated Design v2 */}
        {topics.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 sm:mb-5">Тесты по темам</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4 lg:gap-5">
              {topics.map((topic) => (
                <Card
                  key={topic.id}
                  className="group cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl border border-border/40 bg-white/90 dark:bg-slate-950/50 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]"
                  onClick={() => handleTopicCardClick({ id: topic.id, name: topic.name, number: topic.number })}
                >
                  {/* Visual */}
                  <div className="relative h-40 sm:h-36 lg:h-40 w-full overflow-hidden bg-slate-900/5">
                    {topic.cover_image ? (
                      <img
                        src={topic.cover_image}
                        alt={topic.name}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.05]"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-4xl sm:text-5xl font-black text-white/25"
                        style={{
                          background: topic.gradient_from && topic.gradient_to
                            ? `linear-gradient(135deg, ${topic.gradient_from} 0%, ${topic.gradient_to} 100%)`
                            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        }}
                      >
                        {topic.number}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />

                    <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-start justify-end">
                      <span className="rounded-full bg-black/30 px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                        Тема {topic.number}
                      </span>
                    </div>

                    {topic.is_premium && (
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                        <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-amber-100/90 px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-semibold text-amber-800 shadow-lg">
                          <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          Premium
                        </span>
                      </div>
                    )}

                  </div>

                  {/* Content */}
                  <div className="flex items-center justify-between border-t border-border/40 px-3 py-2 sm:px-4 sm:py-2.5 lg:py-3">
                    <span className="inline-flex items-center gap-1 text-foreground font-medium line-clamp-1 pr-2 text-[11px] sm:text-[12px] flex-1 min-w-0">
                      <ListOrdered className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary/70 flex-shrink-0" />
                      <span className="truncate">{topic.number}. {topic.name}</span>
                    </span>
                    <span className="font-semibold text-muted-foreground text-[10px] sm:text-[11px] lg:text-[12px] flex-shrink-0 ml-2">
                      {topic.questions} {getQuestionLabel(topic.questions)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Exam Mode Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">{t('examMode')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Exam simulator */}
            <Card 
              className="p-5 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
              onClick={() => handleStartPath("/test/exam")}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold">{t('examSimulator')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('examSimulatorDesc')}
                  </p>
              </div>
            </Card>

            {/* Module test */}
            <Card 
              className="p-5 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
              onClick={() => handleStartPath("/tests/sequential")}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                  <Layers className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold">{t('moduleTest')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('moduleTestDesc')}
                </p>
              </div>
            </Card>

            {/* Final test */}
            <Card 
              className="p-5 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
              onClick={() => handleStartPath("/test/exam")}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
                  <Flag className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="font-semibold">{t('finalTest')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('finalTestDesc')}
                  </p>
              </div>
            </Card>
          </div>
              </div>

        {/* User Stats Card */}
        {isAuthenticated && (
          <Card className="p-6 mb-6">
            <div className="space-y-6">
              {/* Header with Level and Points */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    Д
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('level')} {1}</h3>
                    <p className="text-sm text-muted-foreground">{t('points')} {0}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t('lessons')}</p>
                  <p className="font-bold">{0}/47</p>
                </div>
              </div>

              {/* Correct on 1st try */}
              <div>
                <h4 className="font-semibold mb-3">{t('correctOnFirstTry')}</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('answeredQuestions')}</span>
                    <span className="font-semibold">{stats.totalAnswered}/563</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('correctAnswers')}</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{stats.correct}</span>
                </div>
          </div>
        </div>

              <Button className="w-full" variant="outline">
                {t('moreStatistics')}
              </Button>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        {isAuthenticated && (
          <Card className="p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">{t('leaderboard')}</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  Д
            </div>
                <span className="font-semibold">{t('you')}</span>
                <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl">🚗</div>
                <span className="font-bold">0</span>
            </div>
          </div>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              {t('inviteFriends')}
            </Button>
        </Card>
        )}

        {/* Exam Readiness Card */}
        {isAuthenticated && profileId && (
          <ExamReadinessCard />
        )}
      </div>
    </Layout>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
      
      {/* Topic Tests Modal */}
      <Dialog 
        open={isTopicModalOpen} 
        onOpenChange={(open) => {
          console.log('[Tests] Modal open change:', open);
          setIsTopicModalOpen(open);
          if (!open) {
            // Сбрасываем состояние при закрытии
            setSelectedTopicForModal(null);
            setTopicTests([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedTopicForModal && `Тема ${selectedTopicForModal.number}: ${selectedTopicForModal.name}`}
            </DialogTitle>
            <DialogDescription className="text-base">
              Выберите тест для прохождения
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {loadingTopicTests ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <div className="text-muted-foreground">Загрузка тестов...</div>
              </div>
            ) : topicTests.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-semibold mb-2">Тесты пока не добавлены</p>
                <p className="text-muted-foreground">
                  Тесты появятся здесь после синхронизации с базой данных
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {topicTests.map((test) => (
                  <Card
                    key={test.id}
                    className={cn(
                      "p-4 transition-all duration-300 cursor-pointer",
                      "border-2 hover:border-primary/50",
                      test.progress?.status === 'locked' 
                        ? "opacity-60 bg-muted/30 border-dashed" 
                        : "hover:shadow-lg",
                      test.progress?.status === 'passed' && "border-green-500/30 bg-green-500/5",
                      test.progress?.status === 'unlocked' && "border-blue-500/30 bg-blue-500/5",
                      test.progress?.status === 'in_progress' && "border-yellow-500/30 bg-yellow-500/5"
                    )}
                    onClick={() => handleStartTest(test)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg flex-shrink-0",
                          test.progress?.status === 'locked' && "bg-muted border-2 border-dashed",
                          test.progress?.status === 'passed' && "bg-green-500 text-white",
                          test.progress?.status === 'unlocked' && "bg-blue-500 text-white",
                          test.progress?.status === 'failed' && "bg-red-500 text-white",
                          !test.progress && "bg-primary text-primary-foreground"
                        )}>
                          {test.test_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base mb-1 line-clamp-2">{test.title_ru}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusIcon(test)}
                            {getStatusBadge(test)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center gap-1 mb-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Вопросов</span>
                        </div>
                        <span className="text-base font-bold">{test.questions_count}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center gap-1 mb-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Минимум</span>
                        </div>
                        <span className="text-base font-bold">{test.min_pass_percent}%</span>
                      </div>
                    </div>
                    
                    {test.progress && test.progress.status !== 'locked' && (
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        {test.progress.best_score !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Лучший результат
                            </span>
                            <span className={cn(
                              "font-bold text-xs",
                              test.progress.best_score >= test.min_pass_percent
                                ? "text-green-500"
                                : "text-orange-500"
                            )}>
                              {test.progress.best_score}%
                            </span>
                          </div>
                        )}
                        {test.progress.attempts_count > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Попыток
                            </span>
                            <span className="font-bold text-xs">{test.progress.attempts_count}</span>
                          </div>
                        )}
                        {test.progress.total_questions && test.progress.total_questions > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Прогресс</span>
                              <span className="text-xs font-bold">{getProgressPercentage(test)}%</span>
                            </div>
                            <Progress 
                              value={getProgressPercentage(test)} 
                              className="h-1.5"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      size="sm"
                      className={cn(
                        "w-full mt-3",
                        test.progress?.status === 'unlocked' && "bg-blue-500 hover:bg-blue-600",
                        test.progress?.status === 'passed' && "bg-green-500 hover:bg-green-600",
                        test.progress?.status === 'failed' && "bg-orange-500 hover:bg-orange-600"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTest(test);
                      }}
                      disabled={test.progress?.status === 'locked'}
                    >
                      {test.progress?.status === 'passed' ? (
                        <>
                          <Trophy className="h-4 w-4 mr-2" />
                          Повторить
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Начать
                        </>
                      )}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsTopicModalOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
};

export default Tests;
