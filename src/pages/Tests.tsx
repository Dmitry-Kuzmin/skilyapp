import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Target, BookOpen, TrendingUp, CheckCircle2, XCircle, Award, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserContext } from "@/contexts/UserContext";
import { ExamReadinessCard } from "@/components/ExamReadinessCard";

const Tests = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
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

  useEffect(() => {
    loadTopics();
    if (isAuthenticated && profileId) {
      loadStats();
    }
  }, [isAuthenticated, profileId]);

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
      
      // Получаем все темы из базы для сопоставления ID
      const { data: dbTopics } = await supabase
        .from("topics")
        .select("id, number")
        .order('number');
      
      const topicIdMap = new Map((dbTopics || []).map(t => [t.number, t.id]));
      
      const parseBool = (val?: string): boolean => {
        if (!val) return false;
        return val.toLowerCase() === 'true' || val === '✔' || val === '1' || val.toLowerCase() === 'yes';
      };
      
      const topicsFromSheets = await Promise.all(
        rows.map(async (row) => {
          const columns = parseCSVRow(row);
          // Структура CSV: id, order, slug, category_ru, category_es, category_en, name_ru, name_es, name_en, ...
          // columns[0] = id
          // columns[1] = order (номер темы)
          // columns[6] = name_ru (название на русском)
          
          if (!columns[1] || !columns[6]) return null; // Skip empty rows
          
          const topicNumber = parseInt(columns[1]); // order - это номер темы
          if (isNaN(topicNumber)) return null;
          
          const topicId = topicIdMap.get(topicNumber);
          
          // Count questions for this topic from database
          let questionCount = 0;
          if (topicId) {
            const { count } = await supabase
              .from("questions_new")
              .select("*", { count: 'exact', head: true })
              .eq('topic_id', topicId);
            questionCount = count || 0;
          }
          
          return {
            id: topicId || `temp-${topicNumber}`,
            number: topicNumber,
            name: columns[6] || `Тема ${topicNumber}`, // name_ru из Google Sheets
            questions: questionCount,
            cover_image: null, // В CSV нет cover_image
            gradient_from: '#00BFFF', // Дефолтные значения
            gradient_to: '#39FF14',
            is_premium: false, // В CSV нет is_premium
          };
        })
      );
      
      setTopics(topicsFromSheets.filter(t => t !== null));
    } catch (error) {
      console.error("Error loading topics:", error);
      toast.error("Ошибка загрузки тем");
    }
  };

  const loadStats = async () => {
    if (!profileId) return;
    
    try {
      // Загружаем реальный прогресс пользователя из user_progress
      const { data: progressData, error: progressError } = await supabase
        .from("user_progress")
        .select("is_correct, is_answered")
        .eq("user_id", profileId)
        .eq("is_answered", true);

      if (progressError) throw progressError;

      // Загружаем сессии тестов для подсчета пройденных тестов и среднего балла
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("game_sessions")
        .select("score, total_questions")
        .eq("user_id", profileId)
        .or("game_type.eq.test_exam,game_type.eq.test_practice");

      if (sessionsError) throw sessionsError;

      // Подсчитываем статистику из user_progress (более точные данные)
      const totalAnswered = progressData?.length || 0;
      const correct = progressData?.filter(p => p.is_correct === true).length || 0;
      const errors = totalAnswered - correct;
      const accuracy = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;

      // Подсчитываем средний балл из сессий
      const completed = sessionsData?.length || 0;
      const averageScore = completed > 0 && sessionsData
        ? Math.round(sessionsData.reduce((sum, s) => sum + (s.score || 0), 0) / completed)
        : 0;

      setStats({
        accuracy,
        completed,
        correct,
        errors,
        totalAnswered,
        averageScore,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handlePracticeStart = () => {
    if (selectedTopic === "all") {
      navigate("/test/practice");
    } else {
      navigate(`/test/practice/${selectedTopic}`);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Тесты DGT</h1>
          <p className="text-muted-foreground text-lg">
            Выбери режим и начни подготовку к экзамену
          </p>
        </div>

        {/* Sequential Tests Card */}
        <Card
          onClick={() => navigate("/tests/sequential")}
          className="p-6 gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer group mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 shadow-glow">
                <ListOrdered className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Последовательные тесты</h3>
                <p className="text-sm text-muted-foreground">
                  Проходите тесты по порядку, ничего не пропуская. Каждый тест открывается после прохождения предыдущего.
                </p>
              </div>
            </div>
            <Button variant="ghost" className="group-hover:bg-primary/10">
              Перейти
            </Button>
          </div>
        </Card>

        {/* Test Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Экзаменационный режим */}
          <Card
            onClick={() => navigate("/test/exam")}
            className="p-8 gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
          >
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl gradient-primary shadow-glow">
                  <Target className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-2">Экзаменационный режим</h3>
                <p className="text-muted-foreground">Полная симуляция реального экзамена DGT</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>30 вопросов</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>30 минут</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Максимум 3 ошибки</span>
                </div>
              </div>

              <Button
                className="w-full shadow-primary group-hover:shadow-glow"
                size="lg"
              >
                Начать тест
              </Button>
            </div>
          </Card>

          {/* Практический режим с выбором темы */}
          <Card className="p-8 gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 group">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-secondary shadow-glow">
                  <BookOpen className="w-8 h-8 text-secondary-foreground" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                  Популярно
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-2">Практический режим</h3>
                <p className="text-muted-foreground">Учись в своём темпе с подсказками</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Без ограничений</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Объяснения</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Прогресс сохраняется</span>
                </div>
              </div>

              {/* Выбор темы */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Выберите вариант:</label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите тему" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все вопросы из базы</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        Тема {topic.number}: {topic.name} ({topic.questions} вопросов)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handlePracticeStart}
                className="w-full shadow-primary group-hover:shadow-glow"
                size="lg"
              >
                Начать тест
              </Button>
            </div>
          </Card>
        </div>


        {/* Stats Overview - Modern Design */}
        <Card className="p-6 gradient-card border-border/50 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Ваша статистика</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Точность */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">Точность</span>
                </div>
                <p className="text-3xl font-bold text-primary">{stats.accuracy}%</p>
                {stats.totalAnswered > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    из {stats.totalAnswered} ответов
                  </p>
                )}
              </div>

              {/* Пройдено тестов */}
              <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl p-4 border border-secondary/20">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                  <span className="text-xs font-semibold text-muted-foreground">Пройдено</span>
                </div>
                <p className="text-3xl font-bold text-secondary">{stats.completed}</p>
                <p className="text-xs text-muted-foreground mt-1">тестов</p>
              </div>

              {/* Правильных ответов */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-semibold text-muted-foreground">Правильных</span>
                </div>
                <p className="text-3xl font-bold text-emerald-500">{stats.correct}</p>
                {stats.totalAnswered > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((stats.correct / stats.totalAnswered) * 100)}% от всех
                  </p>
                )}
              </div>

              {/* Ошибок */}
              <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-xl p-4 border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="text-xs font-semibold text-muted-foreground">Ошибок</span>
                </div>
                <p className="text-3xl font-bold text-destructive">{stats.errors}</p>
                {stats.totalAnswered > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((stats.errors / stats.totalAnswered) * 100)}% от всех
                  </p>
                )}
              </div>

              {/* Средний балл */}
              {stats.completed > 0 && (
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-4 border border-amber-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-semibold text-muted-foreground">Средний балл</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-500">{stats.averageScore}%</p>
                  <p className="text-xs text-muted-foreground mt-1">по всем тестам</p>
                </div>
              )}

              {/* Всего ответов */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-semibold text-muted-foreground">Всего ответов</span>
                </div>
                <p className="text-3xl font-bold text-blue-500">{stats.totalAnswered}</p>
                <p className="text-xs text-muted-foreground mt-1">вопросов решено</p>
              </div>
            </div>

            {/* Прогресс-бар точности */}
            {stats.totalAnswered > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Прогресс точности</span>
                  <span className="text-sm text-muted-foreground">{stats.accuracy}%</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 rounded-full"
                    style={{ width: `${stats.accuracy}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Exam Readiness Card */}
        {isAuthenticated && profileId && (
          <ExamReadinessCard />
        )}
      </div>
    </Layout>
  );
};

export default Tests;
