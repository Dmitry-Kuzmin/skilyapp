import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";
import { useSequentialTests } from "@/hooks/useSequentialTests";
import {
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Eye,
  ArrowRight,
  BookOpen,
  Trophy,
  Star,
  Sparkles,
  Target,
  Zap,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { PageLoader } from "@/components/PageLoader";

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
  topics: {
    title_ru: string;
    title_es: string;
    number: number;
  } | null;
  progress: {
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed' | 'passed' | 'failed';
    score: number | null;
    best_score: number | null;
    attempts_count: number;
    correct_answers: number | null;
    total_questions: number | null;
  } | null;
};

const SequentialTests = () => {
  const navigate = useNavigate();
  const { profileId, isAuthenticated } = useUserContext();
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ОПТИМИЗАЦИЯ: Используем React Query хук вместо прямых запросов
  const { data: tests = [], isLoading: loading } = useSequentialTests(profileId);

  useEffect(() => {
    if (isAuthenticated && profileId) {
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

  const handleStartTest = (test: Test) => {
    if (test.progress?.status === 'locked') {
      toast.error("Этот тест заблокирован. Пройдите предыдущие тесты.");
      return;
    }
    navigate(`/test/sequential/${test.id}`);
  };

  const handlePreviewTest = async (test: Test) => {
    setSelectedTest(test);
    setShowPreview(true);
    setLoadingPreview(true);

    try {
      const { data, error } = await supabase.rpc('get_test_questions', {
        p_test_id: test.id
      });

      if (error) throw error;

      // Преобразуем question_id в id для совместимости
      const questionsWithId = (data || []).map((q: any) => ({
        ...q,
        id: q.question_id || q.id
      }));

      setPreviewQuestions(questionsWithId);
    } catch (error) {
      console.error("Error loading preview questions:", error);
      toast.error("Ошибка загрузки вопросов");
    } finally {
      setLoadingPreview(false);
    }
  };

  const getStatusIcon = (test: Test) => {
    if (!test.progress || test.progress.status === 'locked') {
      return <Lock className="h-5 w-5 text-muted-foreground" />;
    }
    if (test.progress.status === 'passed') {
      return <CheckCircle2 className="h-5 w-5 text-green-500 animate-pulse" />;
    }
    if (test.progress.status === 'failed') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (test.progress.status === 'unlocked') {
      return <Unlock className="h-5 w-5 text-blue-500" />;
    }
    return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
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

  // Вычисляем прогресс по теме
  const getTopicProgress = (topicTests: Test[]) => {
    const totalTests = topicTests.length;
    const passedTests = topicTests.filter(t => t.progress?.status === 'passed').length;
    const unlockedTests = topicTests.filter(t =>
      t.progress && t.progress.status !== 'locked'
    ).length;

    return {
      total: totalTests,
      passed: passedTests,
      unlocked: unlockedTests,
      percentage: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
    };
  };

  // Группируем тесты по темам
  const testsByTopic = tests.reduce((acc, test) => {
    const topicNumber = test.topics?.number || 0;
    if (!acc[topicNumber]) {
      acc[topicNumber] = [];
    }
    acc[topicNumber].push(test);
    return acc;
  }, {} as Record<number, Test[]>);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Заголовок с улучшенным дизайном */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Последовательные тесты
              </h1>
              <p className="text-muted-foreground mt-1">
                Проходите тесты по порядку и достигайте новых вершин
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-10">
          <AnimatePresence>
            {Object.entries(testsByTopic)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([topicNumber, topicTests], topicIndex) => {
                const topicProgress = getTopicProgress(topicTests);
                const isTopicComplete = topicProgress.passed === topicProgress.total;

                return (
                  <motion.div
                    key={topicNumber}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: topicIndex * 0.1 }}
                    className="space-y-4"
                  >
                    {/* Заголовок темы с прогрессом */}
                    <Card className="p-4 bg-gradient-to-r from-background to-muted/30 border-2">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isTopicComplete
                              ? "bg-green-500/20 border-2 border-green-500/30"
                              : "bg-primary/20 border-2 border-primary/30"
                          )}>
                            <BookOpen className={cn(
                              "h-5 w-5",
                              isTopicComplete ? "text-green-500" : "text-primary"
                            )} />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                              {topicTests[0]?.topics?.title_ru || `Тема ${topicNumber}`}
                              {isTopicComplete && (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              )}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {topicProgress.passed} из {topicProgress.total} тестов пройдено
                            </p>
                          </div>
                        </div>

                        {/* Прогресс-бар темы */}
                        <div className="flex-1 max-w-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Прогресс темы</span>
                            <span className="text-sm font-bold text-primary">{topicProgress.percentage}%</span>
                          </div>
                          <Progress
                            value={topicProgress.percentage}
                            className="h-3"
                          />
                        </div>
                      </div>
                    </Card>

                    {/* Карточки тестов */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <AnimatePresence>
                        {topicTests.map((test, testIndex) => (
                          <motion.div
                            key={test.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (topicIndex * 0.1) + (testIndex * 0.05) }}
                            whileHover={{ scale: 1.02, y: -4 }}
                            className="h-full"
                          >
                            <Card
                              className={cn(
                                "p-5 h-full transition-all duration-300 cursor-pointer",
                                "border-2 hover:border-primary/50",
                                test.progress?.status === 'locked'
                                  ? "opacity-60 bg-muted/30 border-dashed"
                                  : "hover:shadow-xl shadow-md",
                                test.progress?.status === 'passed' && "border-green-500/30 bg-green-500/5",
                                test.progress?.status === 'unlocked' && "border-blue-500/30 bg-blue-500/5 ring-2 ring-blue-500/20",
                                test.progress?.status === 'in_progress' && "border-yellow-500/30 bg-yellow-500/5"
                              )}
                              onClick={() => {
                                if (test.progress?.status !== 'locked') {
                                  handleStartTest(test);
                                }
                              }}
                            >
                              {/* Номер теста с иконкой статуса */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg",
                                    test.progress?.status === 'locked' && "bg-muted border-2 border-dashed",
                                    test.progress?.status === 'passed' && "bg-green-500 text-white",
                                    test.progress?.status === 'unlocked' && "bg-blue-500 text-white",
                                    test.progress?.status === 'failed' && "bg-red-500 text-white",
                                    !test.progress && "bg-primary text-primary-foreground"
                                  )}>
                                    {test.test_number}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-bold text-lg mb-1">{test.title_ru}</h3>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(test)}
                                      {getStatusBadge(test)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Информация о тесте */}
                              <div className="space-y-3 mb-5">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Target className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Вопросов</span>
                                    </div>
                                    <span className="text-lg font-bold">{test.questions_count}</span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                                    <div className="flex items-center gap-2 mb-1">
                                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Минимум</span>
                                    </div>
                                    <span className="text-lg font-bold">{test.min_pass_percent}%</span>
                                  </div>
                                </div>

                                {/* Прогресс и статистика */}
                                {test.progress && test.progress.status !== 'locked' && (
                                  <div className="space-y-2 pt-2 border-t border-border/50">
                                    {test.progress.best_score !== null && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                          <Star className="h-3 w-3" />
                                          Лучший результат
                                        </span>
                                        <span className={cn(
                                          "font-bold text-sm",
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
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                          <Zap className="h-3 w-3" />
                                          Попыток
                                        </span>
                                        <span className="font-bold text-sm">{test.progress.attempts_count}</span>
                                      </div>
                                    )}
                                    {test.progress.total_questions && test.progress.total_questions > 0 && (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-muted-foreground">Прогресс прохождения</span>
                                          <span className="text-xs font-bold">{getProgressPercentage(test)}%</span>
                                        </div>
                                        <Progress
                                          value={getProgressPercentage(test)}
                                          className="h-2"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Кнопки действий */}
                              <div className="flex gap-2 mt-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviewTest(test);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Предпросмотр
                                </Button>
                                <Button
                                  size="sm"
                                  className={cn(
                                    "flex-1",
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
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>

        {tests.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="p-8 rounded-2xl bg-muted/30 border-2 border-dashed">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">Тесты пока не добавлены</p>
              <p className="text-muted-foreground">
                Тесты появятся здесь после синхронизации с базой данных
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Предпросмотр вопросов с улучшенным дизайном */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {selectedTest?.title_ru}
            </DialogTitle>
            <DialogDescription className="text-base">
              Предпросмотр вопросов теста
              <Badge variant="outline" className="ml-2">
                {previewQuestions.length} вопросов
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {loadingPreview ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <div className="text-muted-foreground">Загрузка вопросов...</div>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {previewQuestions.map((question, index) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 text-primary flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium mb-2 text-foreground">{question.question_ru}</p>
                            <div className="flex items-center gap-3 flex-wrap mt-2">
                              {question.image_url && (
                                <Badge variant="outline" className="text-xs">
                                  📷 Изображение
                                </Badge>
                              )}
                              {question.difficulty && (
                                <Badge variant="outline" className="text-xs">
                                  {question.difficulty === 'easy' && '🟢 Легко'}
                                  {question.difficulty === 'medium' && '🟡 Средне'}
                                  {question.difficulty === 'hard' && '🔴 Сложно'}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground font-mono">
                                {question.source_id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Закрыть
            </Button>
            {selectedTest && (
              <Button
                onClick={() => {
                  setShowPreview(false);
                  handleStartTest(selectedTest);
                }}
                disabled={selectedTest.progress?.status === 'locked'}
                className="min-w-[140px]"
              >
                <Play className="h-4 w-4 mr-2" />
                Начать тест
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default SequentialTests;

