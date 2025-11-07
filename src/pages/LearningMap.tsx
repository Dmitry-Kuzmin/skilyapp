import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, Play, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Topic, TopicProgress } from "@/components/learning-map/TopicCard";
import { TopicNode } from "@/components/learning-map/TopicNode";
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
  const [userProfile, setUserProfile] = useState<{ rank?: string; xp?: number } | null>(null);
  const [activeTopicIndex, setActiveTopicIndex] = useState<number | null>(null);

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
        .select('rank, xp')
        .eq('id', profileId)
        .single();

      if (error) throw error;

      setUserProfile({
        rank: profile?.rank || undefined,
        xp: profile?.xp || 0,
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
      // Если все завершены, показываем последнюю завершенную
      let activeIndex = topics.findIndex((topic, idx) => {
        const prog = progressMap.get(topic.id);
        return prog?.isUnlocked && !prog?.completed;
      });
      
      // Если все темы завершены, активируем последнюю
      if (activeIndex < 0) {
        const lastCompletedIndex = topics.findLastIndex((topic) => {
          const prog = progressMap.get(topic.id);
          return prog?.completed;
        });
        activeIndex = lastCompletedIndex >= 0 ? lastCompletedIndex : 0;
      }
      
      setActiveTopicIndex(activeIndex >= 0 ? activeIndex : 0);
    } catch (error) {
      console.error('[LearningMap] Error loading progress:', error);
      // Продолжаем без прогресса - показываем темы без прогресса
    }
  };

  // Находим следующую доступную тему для кнопки "НАЧАТЬ"
  const getNextAvailableTopic = () => {
    if (activeTopicIndex !== null && activeTopicIndex < topics.length) {
      return topics[activeTopicIndex];
    }
    // Если нет активной, возвращаем первую разблокированную
    return topics.find((topic, idx) => {
      const progress = topicsProgress.get(topic.id);
      return progress?.isUnlocked || idx === 0;
    });
  };

  const handleTopicClick = (topic: Topic) => {
    navigate(`/topic/${topic.id}`);
  };

  const handleStartClick = () => {
    const nextTopic = getNextAvailableTopic();
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

  // Группируем темы по модулям (каждые 5 тем = 1 модуль)
  const getModuleAndSection = (index: number) => {
    const moduleNumber = Math.floor(index / 5) + 1;
    const sectionNumber = (index % 5) + 1;
    return { module: moduleNumber, section: sectionNumber };
  };

  const nextTopic = getNextAvailableTopic();
  const nextTopicIndex = nextTopic ? topics.findIndex(t => t.id === nextTopic.id) : -1;

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
          <div className="flex gap-6 lg:gap-8">
            {/* Основной контент - путь обучения */}
            <div className="flex-1 min-w-0">
              {/* Оранжевый баннер с модулем и разделом (Duolingo style) */}
              {topics.length > 0 && activeTopicIndex !== null && activeTopicIndex < topics.length && (
                <div className="mb-6">
                  <div className="bg-[#FF6B35] text-white rounded-lg px-6 py-4 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <ArrowLeft className="w-5 h-5" />
                      <span className="font-bold text-lg">
                        МОДУЛЬ {getModuleAndSection(activeTopicIndex).module}, РАЗДЕЛ {getModuleAndSection(activeTopicIndex).section}
                      </span>
                    </div>
                    {topics[activeTopicIndex] && (
                      <>
                        <span className="text-base font-medium hidden md:inline">
                          {topics[activeTopicIndex].title_ru}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          СПРАВОЧНИК
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Заголовок урока (большой текст) */}
              {nextTopic && (
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {nextTopic.title_ru}
                  </h1>
                </div>
              )}

              {/* Вертикальный путь обучения с персонажем */}
              <div className="flex justify-center relative">
                <div className="relative flex flex-col items-center py-8 min-h-[600px] w-full">
                  {topics.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Темы пока не добавлены</h3>
                      <p className="text-muted-foreground">
                        Администратор добавит темы в ближайшее время
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Персонаж на пути (позиционируется рядом с активным узлом) */}
                      {activeTopicIndex !== null && activeTopicIndex < topics.length && (
                        <div
                          className="absolute left-[-100px] md:left-[-120px] transition-all duration-500 z-20 hidden md:block"
                          style={{
                            top: `${activeTopicIndex * 140 + 36}px`,
                          }}
                        >
                          <div className="relative">
                            {/* Простой персонаж (можно заменить на SVG или изображение) */}
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-[#58CC02] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                              <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Путь обучения */}
                      <div className="relative flex flex-col items-center">
                        {topics.map((topic, index) => {
                          const progress = topicsProgress.get(topic.id);
                          const isLocked = progress ? !progress.isUnlocked : index > 0;
                          const isActive = index === activeTopicIndex;
                          const isCompleted = progress?.completed ?? false;
                          const isNext = index === nextTopicIndex;

                          return (
                            <div key={topic.id} className="relative flex flex-col items-center mb-8">
                              {/* Кнопка "ПЕРЕЙТИ СЮДА?" для следующего урока (Duolingo style) */}
                              {isNext && !isCompleted && (
                                <div className="mb-6">
                                  <Button
                                    size="lg"
                                    variant="outline"
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300 px-6 py-3 text-base font-semibold rounded-lg shadow-sm"
                                    onClick={handleStartClick}
                                  >
                                    <Play className="w-5 h-5 mr-2" />
                                    ПЕРЕЙТИ СЮДА?
                                  </Button>
                                </div>
                              )}

                              {/* Соединительная линия */}
                              {index < topics.length - 1 && (
                                <div
                                  className={cn(
                                    "w-1 transition-colors duration-300",
                                    isCompleted
                                      ? "bg-[#58CC02]"
                                      : progress?.isUnlocked
                                      ? "bg-[#8CD4FF]"
                                      : "bg-[#E5E5E5]"
                                  )}
                                  style={{ height: "100px", minHeight: "100px" }}
                                />
                              )}

                              {/* Узел темы */}
                              <TopicNode
                                topic={topic}
                                progress={progress}
                                isLocked={isLocked}
                                isActive={isActive}
                                onClick={() => handleTopicClick(topic)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
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

