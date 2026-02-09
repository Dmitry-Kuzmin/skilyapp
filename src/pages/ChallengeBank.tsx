import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Target, TrendingUp, Play, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePDDContext } from "@/contexts/PDDContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChallengeQuestion = {
  id: string;
  question_ru: string;
  question_es: string;
  question_en: string;
  image_url: string | null;
  times_wrong: number;
  times_reviewed: number;
  last_wrong_at: string;
  mastered: boolean;
  topic_title_ru: string | null;
  topic_title_es: string | null;
};

type Stats = {
  total_questions: number;
  mastered_questions: number;
  needs_practice: number;
  avg_wrong_count: number;
};

const ChallengeBank = () => {
  const navigate = useNavigate();
  const { profileId, isAuthenticated } = useUserContext();
  const { selectedCountry, selectedCategory } = usePDDContext();
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needs_practice' | 'mastered'>('needs_practice');

  useEffect(() => {
    if (isAuthenticated && profileId) {
      loadChallengeBank();
    }
  }, [isAuthenticated, profileId, filter, selectedCountry, selectedCategory]);

  // Нормализация страны для БД
  const dbCountry = selectedCountry === 'russia' ? 'ru' : selectedCountry === 'spain' ? 'es' : selectedCountry;

  const loadChallengeBank = async () => {
    if (!profileId) return;

    try {
      setLoading(true);

      // 1. Загружаем ВСЕ вопросы для этого пользователя и страны, чтобы рассчитать статистику
      let query = supabase
        .from('user_challenge_questions')
        .select(`
          mastered,
          times_wrong,
          times_reviewed,
          last_wrong_at,
          question_id,
          questions_new!inner(
            id, 
            question_ru, 
            question_es, 
            question_en, 
            image_url, 
            metadata,
            topics(title_ru, title_es)
          )
        `)
        .eq('user_id', profileId)
        .eq('questions_new.country', dbCountry);

      // Фильтр по категории ТОЛЬКО для России (у Испании нет ticket_category)
      if (selectedCategory && selectedCountry === 'russia') {
        query = query.filter('questions_new.metadata->>ticket_category', 'ilike', `%${selectedCategory}%`);
      }

      const { data: rawData, error: loadError } = await query;

      if (loadError) throw loadError;

      const allData = rawData || [];

      // 2. Рассчитываем статистику на клиенте
      const total_questions = allData.length;
      const mastered_questions = allData.filter(q => q.mastered).length;
      const needs_practice = total_questions - mastered_questions;
      const avg_wrong_count = total_questions > 0
        ? Number((allData.reduce((acc, q) => acc + (q.times_wrong || 0), 0) / total_questions).toFixed(2))
        : 0;

      setStats({
        total_questions,
        mastered_questions,
        needs_practice,
        avg_wrong_count
      });

      // 3. Мапим и фильтруем вопросы для отображения
      let filteredData = allData;
      if (filter === 'needs_practice') {
        filteredData = allData.filter(q => !q.mastered);
      } else if (filter === 'mastered') {
        filteredData = allData.filter(q => q.mastered);
      }

      const mappedQuestions: ChallengeQuestion[] = filteredData.map(q => ({
        id: q.questions_new.id,
        question_ru: q.questions_new.question_ru,
        question_es: q.questions_new.question_es,
        question_en: q.questions_new.question_en,
        image_url: q.questions_new.image_url,
        times_wrong: q.times_wrong,
        times_reviewed: q.times_reviewed,
        last_wrong_at: q.last_wrong_at,
        mastered: q.mastered,
        topic_title_ru: q.questions_new.topics?.title_ru || null,
        topic_title_es: q.questions_new.topics?.title_es || null,
      }));

      // Сортировка по свежести
      setQuestions(mappedQuestions.sort((a, b) =>
        new Date(b.last_wrong_at).getTime() - new Date(a.last_wrong_at).getTime()
      ).slice(0, 100));
    } catch (error) {
      console.error('Error loading Challenge Bank:', error);
      toast.error("Не удалось загрузить вопросы");
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = () => {
    if (questions.length === 0) {
      toast.error("Нет вопросов для практики");
      return;
    }
    // Перенаправляем на специальный режим теста с вопросами Challenge Bank
    navigate('/test/challenge-bank');
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!profileId) return;

    try {
      const { data: existing } = await supabase
        .from('user_challenge_questions')
        .select('is_favorite')
        .eq('user_id', profileId)
        .eq('question_id', questionId)
        .single();

      if (existing?.is_favorite) {
        const { error } = await supabase
          .from('user_challenge_questions')
          .update({ mastered: true })
          .eq('user_id', profileId)
          .eq('question_id', questionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_challenge_questions')
          .delete()
          .eq('user_id', profileId)
          .eq('question_id', questionId);
        if (error) throw error;
      }

      toast.success("Вопрос убран из списка ошибок");
      loadChallengeBank();
    } catch (error) {
      console.error('Error removing question:', error);
      toast.error("Не удалось удалить вопрос");
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Войдите, чтобы увидеть свои сложные вопросы</p>
          <Button onClick={() => navigate("/dashboard")}>
            На главную
          </Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            💡 Банк Сложных Вопросов™
          </h1>
          <p className="text-muted-foreground">
            Все вопросы, на которые ты ответил неправильно, здесь для дополнительной практики
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-2 border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_questions}</p>
                  <p className="text-xs text-muted-foreground">Всего вопросов</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-2 border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.needs_practice}</p>
                  <p className="text-xs text-muted-foreground">Требуют практики</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-2 border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.mastered_questions}</p>
                  <p className="text-xs text-muted-foreground">Освоено</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-2 border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avg_wrong_count}</p>
                  <p className="text-xs text-muted-foreground">Средняя ошибочность</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Practice Button */}
        {questions.length > 0 && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">Готов к практике?</h3>
                <p className="text-sm text-muted-foreground">
                  Пройди тест из {filter === 'needs_practice' ? stats?.needs_practice : questions.length} сложных вопросов
                </p>
              </div>
              <Button
                onClick={handleStartPractice}
                size="lg"
                className="shadow-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Начать практику
              </Button>
            </div>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === 'needs_practice' ? 'default' : 'outline'}
            onClick={() => setFilter('needs_practice')}
          >
            Требуют практики ({stats?.needs_practice || 0})
          </Button>
          <Button
            variant={filter === 'mastered' ? 'default' : 'outline'}
            onClick={() => setFilter('mastered')}
          >
            Освоено ({stats?.mastered_questions || 0})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Все ({stats?.total_questions || 0})
          </Button>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <Card className="p-8 text-center">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">
              {filter === 'needs_practice' ? 'Отлично! Нет вопросов для практики' : 'Здесь пока ничего нет'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'needs_practice'
                ? 'Все сложные вопросы освоены! Продолжай в том же духе!'
                : 'Вопросы, на которые ты ответишь неправильно, появятся здесь автоматически'}
            </p>
            <Button onClick={() => navigate('/tests')}>
              Перейти к тестам
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {questions.map((question) => (
              <Card
                key={question.id}
                className={`p-4 hover:shadow-lg transition-all cursor-pointer ${question.mastered ? 'border-green-500/30 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {question.mastered ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      )}
                      {question.topic_title_ru && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {question.topic_title_ru}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Ошибок: {question.times_wrong}
                      </span>
                      {question.times_reviewed > 0 && (
                        <span className="text-xs text-muted-foreground">
                          • Повторений: {question.times_reviewed}
                        </span>
                      )}
                    </div>
                    <p className="font-medium mb-1">
                      {selectedCountry === 'russia' ? question.question_ru : question.question_es}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(question.last_wrong_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveQuestion(question.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChallengeBank;











