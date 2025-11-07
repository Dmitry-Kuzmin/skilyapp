import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, ArrowLeft, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Topic, TopicProgress } from "@/components/learning-map/TopicCard";
import { ModernTopicCard } from "@/components/learning-map/ModernTopicCard";
import { ModuleSection } from "@/components/learning-map/ModuleSection";
import { CompactSidebar } from "@/components/learning-map/CompactSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { calculateTopicProgress } from "@/utils/learningMap";
import { cn } from "@/lib/utils";
import Landing from "./Landing";

const LearningMap = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsProgress, setTopicsProgress] = useState<Map<string, TopicProgress>>(new Map());
  const [userProfile, setUserProfile] = useState<{ rank?: string; xp?: number; streak?: number } | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  useEffect(() => {
    // Загружаем темы сразу, если пользователь авторизован
    // Не ждем profileId - прогресс можно загрузить позже
    if (isAuthenticated) {
      loadLearningMap();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Загружаем прогресс и профиль отдельно, когда profileId готов
  useEffect(() => {
    if (isAuthenticated && profileId) {
      loadUserProfile();
      if (topics.length > 0) {
        loadProgress();
      }
    }
  }, [isAuthenticated, profileId, topics.length]);

  const loadUserProfile = async () => {
    if (!profileId) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('rank, xp, streak')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      setUserProfile({
        rank: profile?.rank || undefined,
        xp: profile?.xp || 0,
        streak: profile?.streak || 0,
      });
    } catch (error) {
      console.error('[LearningMap] Error loading user profile:', error);
    }
  };

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

      // Определяем активную тему (первая незавершенная и разблокированная)
      const activeTopic = topics.find((topic) => {
        const prog = progressMap.get(topic.id);
        return prog?.isUnlocked && !prog?.completed;
      });
      
      setActiveTopicId(activeTopic?.id || null);
    } catch (error) {
      console.error('[LearningMap] Error loading progress:', error);
      // Продолжаем без прогресса - показываем темы без прогресса
    }
  };

  // Группируем темы по модулям (каждые 5 тем = 1 модуль)
  const topicsByModule = useMemo(() => {
    const modules: { [key: number]: Topic[] } = {};
    topics.forEach((topic) => {
      const moduleNumber = Math.floor((topic.order_index - 1) / 5) + 1;
      if (!modules[moduleNumber]) {
        modules[moduleNumber] = [];
      }
      modules[moduleNumber].push(topic);
    });
    return modules;
  }, [topics]);

  // Рассчитываем прогресс для каждого модуля
  const moduleProgress = useMemo(() => {
    const progress: { [key: number]: { completed: number; total: number } } = {};
    Object.keys(topicsByModule).forEach((moduleKey) => {
      const moduleNumber = parseInt(moduleKey);
      const moduleTopics = topicsByModule[moduleNumber];
      const completed = moduleTopics.filter((topic) => {
        const prog = topicsProgress.get(topic.id);
        return prog?.completed;
      }).length;
      progress[moduleNumber] = {
        completed,
        total: moduleTopics.length,
      };
    });
    return progress;
  }, [topicsByModule, topicsProgress]);

  // Общий прогресс
  const overallProgress = useMemo(() => {
    const completed = Array.from(topicsProgress.values()).filter((p) => p.completed).length;
    return {
      completed,
      total: topics.length,
    };
  }, [topicsProgress, topics.length]);

  const handleTopicClick = (topic: Topic) => {
    navigate(`/topic/${topic.id}`);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Основной контент */}
            <div className="flex-1 min-w-0 space-y-12">
              {/* Шапка страницы */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                      Карта обучения
                    </h1>
                    <p className="text-sm md:text-base text-gray-600">
                      Изучайте темы последовательно и готовьтесь к экзамену DGT
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden md:flex self-start sm:self-auto"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Общий прогресс
                  </Button>
                </div>

                {/* Общий прогресс */}
                {topics.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Общий прогресс
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {overallProgress.completed}/{overallProgress.total} тем
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${
                            overallProgress.total > 0
                              ? Math.round(
                                  (overallProgress.completed / overallProgress.total) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Модули */}
              {topics.length === 0 ? (
                <div className="text-center py-20">
                  <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    Темы пока не добавлены
                  </h3>
                  <p className="text-gray-600">
                    Администратор добавит темы в ближайшее время
                  </p>
                </div>
              ) : (
                Object.keys(topicsByModule)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((moduleKey) => {
                    const moduleNumber = parseInt(moduleKey);
                    const moduleTopics = topicsByModule[moduleNumber];
                    const progress = moduleProgress[moduleNumber];

                    return (
                      <ModuleSection
                        key={moduleNumber}
                        moduleNumber={moduleNumber}
                        progress={progress}
                      >
                        {moduleTopics.map((topic) => {
                          const progress = topicsProgress.get(topic.id);
                          const isLocked = progress
                            ? !progress.isUnlocked
                            : topic.order_index > 1;
                          const isActive = topic.id === activeTopicId;

                          return (
                            <ModernTopicCard
                              key={topic.id}
                              topic={topic}
                              progress={progress}
                              isLocked={isLocked}
                              isActive={isActive}
                              onClick={() => handleTopicClick(topic)}
                            />
                          );
                        })}
                      </ModuleSection>
                    );
                  })
              )}
            </div>

            {/* Правая боковая панель */}
            {profileId && (
              <CompactSidebar
                profileId={profileId}
                rank={userProfile?.rank}
                xp={userProfile?.xp}
                completedTopics={overallProgress.completed}
                totalTopics={overallProgress.total}
                streak={userProfile?.streak}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LearningMap;

