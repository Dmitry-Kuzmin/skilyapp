import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Target, BookOpen, TrendingUp, CheckCircle2, XCircle, Award, ListOrdered, AlertTriangle, Shuffle, Star, Clock, Flag, Trophy, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

const Tests = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    loadTopics();
    if (isAuthenticated && profileId) {
    loadStats();
      loadChallengeBankCount();
    }
  }, [isAuthenticated, profileId]);

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

        {/* Topics Section - Practice Tests by Topic */}
        {topics.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Тесты по темам</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {topics.map((topic) => (
                <Card
                  key={topic.id}
                  className="group relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                  onClick={() => handleStartPath(`/tests/${topic.id}`)}
                >
                  {/* Cover Image */}
                  {topic.cover_image ? (
                    <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                      <img
                        src={topic.cover_image}
                        alt={topic.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      {/* Gradient Overlay */}
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
                        style={{
                          background: topic.gradient_from && topic.gradient_to
                            ? `linear-gradient(to top, ${topic.gradient_from}80 0%, ${topic.gradient_to}40 50%, transparent 100%)`
                            : 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)'
                        }}
                      />
                      {/* Premium Badge */}
                      {topic.is_premium && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Premium
                          </div>
                        </div>
                      )}
                      {/* Question Count */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded">
                          {topic.questions} вопросов
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Fallback gradient if no cover image
                    <div
                      className="h-32 w-full relative overflow-hidden"
                      style={{
                        background: topic.gradient_from && topic.gradient_to
                          ? `linear-gradient(135deg, ${topic.gradient_from} 0%, ${topic.gradient_to} 100%)`
                          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                      }}
                    >
                      {/* Topic Number */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white text-4xl font-bold opacity-30">
                          {topic.number}
                        </div>
                      </div>
                      {/* Premium Badge */}
                      {topic.is_premium && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Premium
                          </div>
                        </div>
                      )}
                      {/* Question Count */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded">
                          {topic.questions} вопросов
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Card Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {topic.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Тема {topic.number}
                    </p>
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
    </Fragment>
  );
};

export default Tests;
