import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Play, BookOpen, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubtopicList, Subtopic, SubtopicProgress } from "@/components/learning-map/SubtopicList";
import { ProgressTracker, ProgressStats } from "@/components/learning-map/ProgressTracker";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { calculateTopicProgress, calculateOverallProgress } from "@/utils/learningMap";
import { cn } from "@/lib/utils";
import { TopicDetailSkeleton } from "@/components/learning-map/TopicDetailSkeleton";

const TopicDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<any>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [subtopicsProgress, setSubtopicsProgress] = useState<SubtopicProgress[]>([]);
  const [topicProgress, setTopicProgress] = useState<any>(null);
  const [overallStats, setOverallStats] = useState<ProgressStats | null>(null);

  useEffect(() => {
    if (id) {
      loadTopicData();
    }
  }, [id, profileId]);

  const loadTopicData = async () => {
    try {
      setLoading(true);

      // Загружаем тему
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select("*")
        .eq("id", id)
        .single();

      if (topicError) throw topicError;
      setTopic(topicData);

      // Загружаем подтемы
      const { data: subtopicsData, error: subtopicsError } = await supabase
        .from("subtopics")
        .select("*")
        .eq("topic_id", id)
        .order("order_index", { ascending: true });

      if (subtopicsError) throw subtopicsError;
      setSubtopics(subtopicsData || []);

      // Загружаем прогресс по подтемам
      if (profileId) {
        const { data: progressData, error: progressError } = await supabase
          .from("user_topic_progress")
          .select("*")
          .eq("user_id", profileId)
          .eq("topic_id", id)
          .not("subtopic_id", "is", null);

        if (!progressError && progressData) {
          setSubtopicsProgress(
            progressData.map((p) => ({
              subtopic_id: p.subtopic_id!,
              completed: p.completed,
              score: p.score || undefined,
            }))
          );
        }

        // Рассчитываем прогресс темы
        const progress = await calculateTopicProgress(profileId, id);
        setTopicProgress(progress);

        // Рассчитываем общую статистику
        const stats = await calculateOverallProgress(profileId);
        setOverallStats({
          totalTopics: stats.totalTopics,
          completedTopics: stats.completedTopics,
          totalSubtopics: stats.totalSubtopics,
          completedSubtopics: stats.completedSubtopics,
          readinessScore: stats.readinessScore,
          avgAccuracy: stats.avgAccuracy,
          testSuccessRate: stats.testSuccessRate,
        });
      }
    } catch (error) {
      console.error("Error loading topic data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartLearning = () => {
    // Находим первую незавершенную подтему
    const firstIncomplete = subtopics.find((s) => {
      const progress = subtopicsProgress.find((p) => p.subtopic_id === s.id);
      return !progress?.completed;
    });

    if (firstIncomplete) {
      navigate(`/subtopic/${firstIncomplete.id}`);
    } else if (subtopics.length > 0) {
      // Если все завершены, переходим к первой
      navigate(`/subtopic/${subtopics[0].id}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <TopicDetailSkeleton />
      </Layout>
    );
  }

  if (!topic) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Тема не найдена</h2>
            <p className="text-muted-foreground mb-4">
              Тема с указанным ID не существует
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к карте
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  const isCompleted = topicProgress?.completed ?? false;
  const progressPercent = topicProgress?.progressPercent ?? 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${topic.gradient_from} 0%, ${topic.gradient_to} 100%)`,
                }}
              >
                {topic.number}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold truncate">{topic.title_ru}</h1>
            </div>
            {topic.description_ru && (
              <p className="text-muted-foreground">{topic.description_ru}</p>
            )}
          </div>
        </div>

        {/* Progress Card */}
        {topicProgress && (
          <Card className="p-6 gradient-card border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <BookOpen className="w-5 h-5 text-primary" />
                )}
                <h3 className="text-lg font-bold">Прогресс темы</h3>
              </div>
              {isCompleted && (
                <Badge className="bg-success/20 text-success border-success/50">
                  Завершено
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {topicProgress.completedSubtopicCount} / {topicProgress.totalSubtopicCount}{" "}
                  подтем изучено
                </span>
                <span className="font-semibold text-primary">{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted ? "bg-success" : "bg-gradient-to-r from-primary to-secondary"
                  )}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Overall Stats */}
        {overallStats && profileId && (
          <ProgressTracker stats={overallStats} />
        )}

        {/* Subtopics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Подтемы</h2>
            {subtopics.length > 0 && (
              <Button onClick={handleStartLearning} size="lg">
                <Play className="w-4 h-4 mr-2" />
                Начать обучение
              </Button>
            )}
          </div>

          <SubtopicList
            subtopics={subtopics}
            progress={subtopicsProgress}
            topicId={id!}
          />
        </div>
      </div>
    </Layout>
  );
};

export default TopicDetail;

