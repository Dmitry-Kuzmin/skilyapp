import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { TopicCard, Topic, TopicProgress } from "@/components/learning-map/TopicCard";
import { ProgressStats } from "@/components/learning-map/ProgressTracker";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { calculateTopicProgress, calculateOverallProgress } from "@/utils/learningMap";
import { cn } from "@/lib/utils";
import Landing from "./Landing";

// Динамическая загрузка ProgressTracker для предотвращения ошибок при загрузке модуля
const ProgressTracker = lazy(() => 
  import("@/components/learning-map/ProgressTracker").then(module => ({
    default: module.ProgressTracker
  }))
);

const LearningMap = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsProgress, setTopicsProgress] = useState<Map<string, TopicProgress>>(new Map());
  const [overallStats, setOverallStats] = useState<ProgressStats | null>(null);

  useEffect(() => {
    // Загружаем темы сразу, если пользователь авторизован
    // Не ждем profileId - прогресс можно загрузить позже
    if (isAuthenticated) {
      loadLearningMap();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Загружаем прогресс отдельно, когда profileId готов
  useEffect(() => {
    if (isAuthenticated && profileId && topics.length > 0) {
      loadProgress();
    }
  }, [isAuthenticated, profileId, topics.length]);

  const loadLearningMap = async () => {
    try {
      setLoading(true);
      setError(null);

      // Таймаут для загрузки тем (10 секунд)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут загрузки тем')), 10000);
      });

      // Загружаем все темы
      const topicsPromise = supabase
        .from("topics")
        .select("*")
        .order("order_index", { ascending: true });

      const { data: topicsData, error: topicsError } = await Promise.race([
        topicsPromise,
        timeoutPromise
      ]) as any;

      if (topicsError) throw topicsError;

      const topicsList: Topic[] = (topicsData || []).map((t: any) => ({
        id: t.id,
        number: t.number,
        order_index: t.order_index || t.number,
        title_ru: t.title_ru,
        title_es: t.title_es,
        title_en: t.title_en,
        description_ru: t.description_ru,
        description_es: t.description_es,
        description_en: t.description_en,
        cover_image: t.cover_image,
        is_premium: t.is_premium || false,
        gradient_from: t.gradient_from || "#00BFFF",
        gradient_to: t.gradient_to || "#39FF14",
        unlock_condition: t.unlock_condition as any,
      }));

      setTopics(topicsList);
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading learning map:", error);
      setError(error.message || "Не удалось загрузить карту обучения. Попробуйте обновить страницу.");
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!profileId || topics.length === 0) return;

    try {
      console.log('[LearningMap] Loading progress for profileId:', profileId);
      
      // Загружаем прогресс по каждой теме (с таймаутом)
      const progressMap = new Map<string, TopicProgress>();
      
      // Загружаем прогресс параллельно для всех тем (но с ограничением)
      const progressPromises = topics.slice(0, 20).map(async (topic) => {
        try {
          const progress = await Promise.race([
            calculateTopicProgress(profileId, topic.id),
            new Promise<TopicProgress>((resolve) => {
              setTimeout(() => resolve({
                completed: false,
                isUnlocked: true,
                progress: 0,
                subtopicsCompleted: 0,
                subtopicsTotal: 0
              }), 5000); // Таймаут 5 секунд на тему
            })
          ]);
          return { topicId: topic.id, progress };
        } catch (error) {
          console.error(`[LearningMap] Error loading progress for topic ${topic.id}:`, error);
          return {
            topicId: topic.id,
            progress: {
              completed: false,
              isUnlocked: true,
              progress: 0,
              subtopicsCompleted: 0,
              subtopicsTotal: 0
            } as TopicProgress
          };
        }
      });

      const progressResults = await Promise.all(progressPromises);
      progressResults.forEach(({ topicId, progress }) => {
        progressMap.set(topicId, progress);
      });
      
      setTopicsProgress(progressMap);

      // Рассчитываем общую статистику (с таймаутом)
      try {
        const stats = await Promise.race([
          calculateOverallProgress(profileId),
          new Promise<ProgressStats>((resolve) => {
            setTimeout(() => resolve({
              totalTopics: topics.length,
              completedTopics: 0,
              totalSubtopics: 0,
              completedSubtopics: 0,
              readinessScore: 0,
              avgAccuracy: 0,
              testSuccessRate: 0
            }), 5000);
          })
        ]);
        
        setOverallStats({
          totalTopics: stats.totalTopics,
          completedTopics: stats.completedTopics,
          totalSubtopics: stats.totalSubtopics,
          completedSubtopics: stats.completedSubtopics,
          readinessScore: stats.readinessScore,
          avgAccuracy: stats.avgAccuracy,
          testSuccessRate: stats.testSuccessRate,
        });
      } catch (error) {
        console.error('[LearningMap] Error loading overall stats:', error);
        // Продолжаем без статистики
      }
    } catch (error) {
      console.error('[LearningMap] Error loading progress:', error);
      // Продолжаем без прогресса - показываем темы без прогресса
    }
  };

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <Landing />;
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Загрузка карты обучения...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">Ошибка загрузки</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => {
              setError(null);
              setLoading(true);
              loadLearningMap();
            }}>
              Попробовать снова
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary mb-4 shadow-lg shadow-primary/20">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Карта обучения
          </h1>
          <p className="text-muted-foreground text-lg">
            Изучай темы последовательно и готовься к экзамену DGT
          </p>
        </div>

        {/* Progress Tracker */}
        {overallStats && profileId && (
          <Suspense fallback={
            <div className="p-4 rounded-lg border border-border/50 bg-card animate-pulse">
              <div className="h-20 bg-muted/20 rounded" />
            </div>
          }>
            <ProgressTracker stats={overallStats} />
          </Suspense>
        )}

        {/* Learning Map - Vertical Path */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Темы</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>
                {topicsProgress.size > 0
                  ? Array.from(topicsProgress.values()).filter((p) => p.completed).length
                  : 0}{" "}
                / {topics.length} завершено
              </span>
            </div>
          </div>

          {/* Topics Path */}
          <div className="relative space-y-4">
            {topics.map((topic, index) => {
              const progress = topicsProgress.get(topic.id);
              const isLocked = progress ? !progress.isUnlocked : index > 0;

              return (
                <div key={topic.id} className="relative">
                  {/* Connecting Line */}
                  {index < topics.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-8 top-20 w-0.5 h-8 z-0 transition-colors",
                        progress?.completed
                          ? "bg-success"
                          : progress?.isUnlocked
                          ? "bg-primary/30"
                          : "bg-muted/30"
                      )}
                    />
                  )}

                  {/* Topic Card */}
                  <div className="relative z-10">
                    <TopicCard
                      topic={topic}
                      progress={progress}
                      isLocked={isLocked}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {topics.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Темы пока не добавлены</h3>
              <p className="text-muted-foreground">
                Администратор добавит темы в ближайшее время
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LearningMap;

