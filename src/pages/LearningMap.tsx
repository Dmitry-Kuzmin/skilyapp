import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Topic, TopicProgress } from "@/components/learning-map/TopicCard";
import { DuolingoLearningPath } from "@/components/learning-map/DuolingoLearningPath";
import { ModuleBanner } from "@/components/learning-map/ModuleBanner";
import { RightSidebar } from "@/components/learning-map/RightSidebar";
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

      // Быстрая загрузка тем без таймаута
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("*")
        .order("order_index", { ascending: true })
        .limit(50);

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
    // Если нет тем, сразу выходим
    if (topics.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Если нет profileId, используем дефолтные значения (все темы разблокированы)
      if (!profileId) {
        const defaultProgress = new Map<string, TopicProgress>();
        topics.forEach((topic, index) => {
          defaultProgress.set(topic.id, {
            completed: false,
            progressPercent: 0,
            completedSubtopicCount: 0,
            totalSubtopicCount: 0,
            isUnlocked: true, // Все темы разблокированы для неавторизованных
          });
        });
        setTopicsProgress(defaultProgress);
        setActiveTopicId(topics[0]?.id || null);
        return;
      }

      console.log('[LearningMap] Loading progress for profileId:', profileId);
      
      // Быстрая проверка - есть ли вообще прогресс в базе
      const { data: progressCheck, error: checkError } = await supabase
        .from("user_topic_progress")
        .select("topic_id")
        .eq("user_id", profileId)
        .limit(1)
        .maybeSingle();

      // Если нет прогресса в базе, используем дефолтные значения
      if (checkError || !progressCheck) {
        const defaultProgress = new Map<string, TopicProgress>();
        topics.forEach((topic, index) => {
          defaultProgress.set(topic.id, {
            completed: false,
            progressPercent: 0,
            completedSubtopicCount: 0,
            totalSubtopicCount: 0,
            isUnlocked: index === 0, // Только первая тема разблокирована
          });
        });
        setTopicsProgress(defaultProgress);
        setActiveTopicId(topics[0]?.id || null);
        return;
      }

      // Загружаем прогресс батчами по 10 тем для оптимизации
      const progressMap = new Map<string, TopicProgress>();
      const BATCH_SIZE = 10;
      const topicsToLoad = topics.slice(0, 50); // Ограничиваем до 50 тем

      for (let i = 0; i < topicsToLoad.length; i += BATCH_SIZE) {
        const batch = topicsToLoad.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (topic) => {
          try {
            // Быстрая загрузка с коротким таймаутом
            const progress = await Promise.race([
              calculateTopicProgress(profileId, topic.id),
              new Promise<TopicProgress>((resolve) => {
                setTimeout(() => resolve({
                  completed: false,
                  progressPercent: 0,
                  completedSubtopicCount: 0,
                  totalSubtopicCount: 0,
                  isUnlocked: i === 0 || progressMap.has(topicsToLoad[i - 1]?.id),
                }), 2000); // Таймаут 2 секунды вместо 5
              })
            ]);
            return { topicId: topic.id, progress };
          } catch (error) {
            console.error(`[LearningMap] Error loading progress for topic ${topic.id}:`, error);
            // Возвращаем дефолтный прогресс при ошибке
            return {
              topicId: topic.id,
              progress: {
                completed: false,
                progressPercent: 0,
                completedSubtopicCount: 0,
                totalSubtopicCount: 0,
                isUnlocked: i === 0 || progressMap.has(topicsToLoad[i - 1]?.id),
              } as TopicProgress
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ topicId, progress }) => {
          progressMap.set(topicId, progress);
        });
      }

      // Для оставшихся тем используем дефолтные значения
      topics.slice(50).forEach((topic, index) => {
        if (!progressMap.has(topic.id)) {
          progressMap.set(topic.id, {
            completed: false,
            progressPercent: 0,
            completedSubtopicCount: 0,
            totalSubtopicCount: 0,
            isUnlocked: false,
          });
        }
      });

      setTopicsProgress(progressMap);

      // Определяем активную тему (первая незавершенная и разблокированная)
      const activeTopic = topics.find((topic) => {
        const prog = progressMap.get(topic.id);
        return prog?.isUnlocked && !prog?.completed;
      });
      
      setActiveTopicId(activeTopic?.id || topics[0]?.id || null);
    } catch (error) {
      console.error('[LearningMap] Error loading progress:', error);
      // Fallback: показываем первую тему как доступную
      const defaultProgress = new Map<string, TopicProgress>();
      topics.forEach((topic, index) => {
        defaultProgress.set(topic.id, {
          completed: false,
          progressPercent: 0,
          completedSubtopicCount: 0,
          totalSubtopicCount: 0,
          isUnlocked: index === 0,
        });
      });
      setTopicsProgress(defaultProgress);
      setActiveTopicId(topics[0]?.id || null);
    }
  };

  // Определяем следующую доступную тему
  const nextTopic = useMemo(() => {
    return topics.find((topic) => {
      const prog = topicsProgress.get(topic.id);
      return prog?.isUnlocked && !prog?.completed;
    });
  }, [topics, topicsProgress]);

  // Определяем модуль и раздел для активной темы
  const getModuleAndSection = (topicIndex: number) => {
    // Группируем темы: каждые 5 тем = 1 модуль, каждая тема = 1 раздел
    const moduleNumber = Math.floor(topicIndex / 5) + 1;
    const sectionNumber = (topicIndex % 5) + 1;
    return { module: moduleNumber, section: sectionNumber };
  };

  const activeTopicIndex = activeTopicId
    ? topics.findIndex((t) => t.id === activeTopicId)
    : nextTopic
    ? topics.findIndex((t) => t.id === nextTopic.id)
    : 0;

  const moduleInfo =
    activeTopicIndex >= 0
      ? getModuleAndSection(activeTopicIndex)
      : { module: 1, section: 1 };

  const handleTopicClick = (topic: Topic) => {
    navigate(`/topic/${topic.id}`);
  };

  const handleStartClick = () => {
    if (nextTopic) {
      navigate(`/topic/${nextTopic.id}`);
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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
          <div className="flex gap-6 lg:gap-8">
            {/* Основной контент - путь обучения */}
            <div className="flex-1 min-w-0">
              {/* Баннер модуля (Duolingo style) */}
              {topics.length > 0 && activeTopicIndex >= 0 && topics[activeTopicIndex] && (
                <div className="mb-6">
                  <ModuleBanner
                    moduleNumber={moduleInfo.module}
                    sectionNumber={moduleInfo.section}
                    topicTitle={topics[activeTopicIndex].title_ru}
                  />
                </div>
              )}

              {/* Заголовок урока */}
              {nextTopic && (
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    {nextTopic.title_ru}
                  </h1>
                </div>
              )}

              {/* Вертикальный путь обучения в стиле Duolingo */}
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
                <DuolingoLearningPath
                  topics={topics}
                  topicsProgress={topicsProgress}
                  activeTopicId={activeTopicId}
                  nextTopicId={nextTopic?.id || null}
                  onTopicClick={handleTopicClick}
                  onStartClick={handleStartClick}
                />
              )}
            </div>

            {/* Правая боковая панель */}
            {profileId && (
              <RightSidebar
                profileId={profileId}
                rank={userProfile?.rank}
                xp={userProfile?.xp}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LearningMap;

