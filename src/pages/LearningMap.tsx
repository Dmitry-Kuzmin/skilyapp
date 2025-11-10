import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topic, TopicProgress } from "@/components/learning-map/TopicCard";
import { DynamicLearningPath } from "@/components/learning-map/DynamicLearningPath";
import { PremiumDailyChallenges } from "@/components/learning-map/PremiumDailyChallenges";
import { PremiumLeagueInfo } from "@/components/learning-map/PremiumLeagueInfo";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
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
  const [currentSubtopicIndex, setCurrentSubtopicIndex] = useState<number>(0);

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
    if (isAuthenticated && profileId && topics.length > 0) {
      // Загружаем параллельно для ускорения
      Promise.all([
        loadUserProfile(),
        loadProgress()
      ]).catch(error => {
        console.error('[LearningMap] Error loading data:', error);
      });
    } else if (!isAuthenticated && topics.length > 0) {
      // Для неавторизованных пользователей сразу показываем дефолтный прогресс
      const defaultProgress = new Map<string, TopicProgress>();
      topics.forEach((topic, index) => {
        defaultProgress.set(topic.id, {
          completed: false,
          progressPercent: 0,
          completedSubtopicCount: 0,
          totalSubtopicCount: 0,
          isUnlocked: true,
        });
      });
      setTopicsProgress(defaultProgress);
      setActiveTopicId(topics[0]?.id || null);
      setLoading(false);
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
        setLoading(false);
        return;
      }

      console.log('[LearningMap] Loading progress for profileId:', profileId);
      
      // ОПТИМИЗАЦИЯ: Загружаем весь прогресс одним запросом через RPC функцию
      const topicIds = topics.map(t => t.id);
      
      const { data: progressData, error: progressError } = await supabase.rpc(
        'get_user_topics_progress_batch',
        {
          p_user_id: profileId,
          p_topic_ids: topicIds
        }
      );

      if (progressError) {
        console.error('[LearningMap] Error loading progress batch:', progressError);
        // Fallback на старый метод, но только для первых 20 тем
        const fallbackProgress = new Map<string, TopicProgress>();
        const firstTopics = topics.slice(0, 20);
        
        for (const topic of firstTopics) {
          try {
            const progress = await calculateTopicProgress(profileId, topic.id);
            fallbackProgress.set(topic.id, progress);
          } catch (error) {
            console.error(`[LearningMap] Error loading progress for topic ${topic.id}:`, error);
            fallbackProgress.set(topic.id, {
              completed: false,
              progressPercent: 0,
              completedSubtopicCount: 0,
              totalSubtopicCount: 0,
              isUnlocked: topic.order_index === 1,
            });
          }
        }
        
        // Для остальных тем используем дефолтные значения
        topics.slice(20).forEach((topic, index) => {
          fallbackProgress.set(topic.id, {
            completed: false,
            progressPercent: 0,
            completedSubtopicCount: 0,
            totalSubtopicCount: 0,
            isUnlocked: false,
          });
        });
        
        setTopicsProgress(fallbackProgress);
        const activeTopic = topics.find((topic) => {
          const prog = fallbackProgress.get(topic.id);
          return prog?.isUnlocked && !prog?.completed;
        });
        setActiveTopicId(activeTopic?.id || topics[0]?.id || null);
        setLoading(false);
        return;
      }

      // Преобразуем результат RPC в Map
      const progressMap = new Map<string, TopicProgress>();
      
      if (progressData && progressData.length > 0) {
        progressData.forEach((row: any) => {
          progressMap.set(row.topic_id, {
            completed: row.completed || false,
            progressPercent: Number(row.progress_percent) || 0,
            completedSubtopicCount: row.completed_subtopic_count || 0,
            totalSubtopicCount: row.total_subtopic_count || 0,
            isUnlocked: row.is_unlocked !== false, // По умолчанию true если не false
          });
        });
      }

      // Для тем, которых нет в результате (новые темы), используем дефолтные значения
      topics.forEach((topic, index) => {
        if (!progressMap.has(topic.id)) {
          progressMap.set(topic.id, {
            completed: false,
            progressPercent: 0,
            completedSubtopicCount: 0,
            totalSubtopicCount: 0,
            isUnlocked: index === 0, // Только первая тема разблокирована по умолчанию
          });
        }
      });

      setTopicsProgress(progressMap);

      // Определяем активную тему (первая незавершенная и разблокированная)
      const activeTopic = topics.find((topic) => {
        const prog = progressMap.get(topic.id);
        return prog?.isUnlocked && !prog?.completed;
      });
      
      const activeId = activeTopic?.id || topics[0]?.id || null;
      setActiveTopicId(activeId);

      // Определяем текущий индекс подтемы на основе прогресса
      if (activeId && profileId) {
        const activeProgress = progressMap.get(activeId);
        if (activeProgress) {
          // Устанавливаем индекс следующей незавершенной подтемы
          setCurrentSubtopicIndex(activeProgress.completedSubtopicCount || 0);
        }
      }
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
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topicId: string) => {
    navigate(`/topic/${topicId}`);
  };

  const handleSubtopicClick = (subtopicId: string) => {
    navigate(`/subtopic/${subtopicId}`);
  };

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <Landing />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Загрузка карты обучения...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
            {/* Main learning path */}
            <div>
              {topics.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Темы пока не добавлены
                  </h3>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Администратор добавит темы в ближайшее время
                  </p>
                </div>
              ) : (
              <DynamicLearningPath
                topics={topics}
                topicsProgress={topicsProgress}
                currentTopicId={activeTopicId}
                currentSubtopicIndex={currentSubtopicIndex}
                onSubtopicClick={handleSubtopicClick}
                onTopicClick={handleTopicClick}
              />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <PremiumLeagueInfo />
              <PremiumDailyChallenges />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LearningMap;

