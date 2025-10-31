import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Target, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Tests = () => {
  const navigate = useNavigate();
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
  const [stats, setStats] = useState({ accuracy: 0, completed: 0, correct: 0, errors: 0 });

  useEffect(() => {
    loadTopics();
    loadStats();
  }, []);

  const loadTopics = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      // Count questions for each topic
      const topicsWithCounts = await Promise.all(
        (data || []).map(async (topic) => {
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
    } catch (error) {
      console.error("Error loading topics:", error);
      toast.error("Ошибка загрузки тем");
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from("game_sessions")
        .select("*")
        .or("game_type.eq.test_exam,game_type.eq.test_practice");

      if (error) throw error;

      if (data && data.length > 0) {
        const totalQuestions = data.reduce((sum, s) => sum + s.total_questions, 0);
        const totalCorrect = data.reduce((sum, s) => sum + Math.round((s.score / 100) * s.total_questions), 0);
        const totalErrors = totalQuestions - totalCorrect;
        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        setStats({
          accuracy,
          completed: data.length,
          correct: totalCorrect,
          errors: totalErrors,
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const testModes = [
    {
      id: 1,
      title: "Экзаменационный режим",
      description: "Полная симуляция реального экзамена DGT",
      icon: Target,
      features: ["30 вопросов", "30 минут", "Максимум 3 ошибки"],
      color: "primary",
      gradient: "gradient-primary",
      onClick: () => navigate("/test/exam"),
    },
    {
      id: 2,
      title: "Практический режим",
      description: "Учись в своём темпе с подсказками",
      icon: BookOpen,
      features: ["Без ограничений", "Объяснения", "Прогресс сохраняется"],
      color: "secondary",
      gradient: "bg-secondary",
      onClick: () => navigate("/test/practice"),
    },
  ];

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

        {/* Test Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testModes.map((mode) => (
            <Card
              key={mode.id}
              onClick={mode.onClick}
              className="p-8 gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex items-center justify-center w-16 h-16 rounded-xl ${mode.gradient} shadow-glow`}
                  >
                    <mode.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                    Популярно
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-2">{mode.title}</h3>
                  <p className="text-muted-foreground">{mode.description}</p>
                </div>

                <div className="space-y-2">
                  {mode.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full shadow-primary group-hover:shadow-glow"
                  size="lg"
                >
                  Начать тест
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Test Categories */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Тесты по темам</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <Card
                key={topic.id}
                onClick={() => navigate(`/test/practice/${topic.id}`)}
                className="relative overflow-hidden p-6 border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 cursor-pointer group"
                style={{
                  background: `linear-gradient(135deg, ${topic.gradient_from || '#00BFFF'} 0%, ${topic.gradient_to || '#39FF14'} 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-background/90 to-background/70 backdrop-blur-sm" />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm"
                        style={{
                          background: `linear-gradient(135deg, ${topic.gradient_from || '#00BFFF'}, ${topic.gradient_to || '#39FF14'})`,
                          color: 'white',
                        }}
                      >
                        {topic.number}
                      </div>
                      {topic.is_premium && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gold/20 text-gold border border-gold/30">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                      {topic.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {topic.questions} вопросов
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span>Тема {topic.number}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <Card className="p-6 gradient-card border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.accuracy}%</p>
              <p className="text-sm text-muted-foreground mt-1">Точность</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">{stats.completed}</p>
              <p className="text-sm text-muted-foreground mt-1">Пройдено</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gold">{stats.correct}</p>
              <p className="text-sm text-muted-foreground mt-1">Правильных</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{stats.errors}</p>
              <p className="text-sm text-muted-foreground mt-1">Ошибок</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Tests;
