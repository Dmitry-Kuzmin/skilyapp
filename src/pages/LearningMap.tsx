import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Topic, TopicProgress } from "@/components/learning-map/TopicCard";
import { Subtopic } from "@/utils/materialApi";
import {
  CurriculumMatrix,
  StructuredCurriculumTopic,
  ItemStatus,
} from "@/components/learning-map/CurriculumMatrix";
import { curriculumBlueprint, CurriculumBlueprintTopic } from "@/data/curriculumBlueprint";
import { calculateTopicProgress } from "@/utils/learningMap";

interface TopicWithSubtopics extends Topic {
  subtopics: Subtopic[];
}

const LearningMap = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicWithSubtopics[]>([]);
  const [topicsProgress, setTopicsProgress] = useState<Map<string, TopicProgress>>(new Map());
  const [userProfile, setUserProfile] = useState<{ rank?: string; xp?: number; streak?: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    loadLearningMap();
  }, []);

  useEffect(() => {
    if (topics.length === 0) return;

    if (isAuthenticated && profileId) {
      loadUserProfile();
      loadProgress();
    } else {
      const defaultProgress = new Map<string, TopicProgress>();
      topics.forEach((topic, index) => {
        defaultProgress.set(topic.id, {
          completed: false,
          progressPercent: 0,
          completedSubtopicCount: 0,
          totalSubtopicCount: topic.subtopics.length,
          isUnlocked: index === 0,
        });
      });
      setTopicsProgress(defaultProgress);
      setLoading(false);
    }
  }, [topics.length, isAuthenticated, profileId]);

  const loadUserProfile = async () => {
    if (!profileId) return;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("rank, xp, streak_days")
        .eq("id", profileId)
        .single();

      if (error) {
        console.error("[LearningMap] Error loading user profile:", error);
        return;
      }

      setUserProfile({
        rank: profile?.rank || undefined,
        xp: profile?.xp || 0,
        streak: profile?.streak_days || 0,
      });
    } catch (error) {
      console.error("[LearningMap] Error loading user profile:", error);
    }
  };

  const loadLearningMap = async () => {
    try {
      setError(null);

      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("*, subtopics(*)")
        .order("order_index", { ascending: true })
        .limit(50);

      if (topicsError) throw topicsError;

      const topicsList: TopicWithSubtopics[] = (topicsData || []).map((t: any) => {
        const sortedSubtopics: Subtopic[] = (t.subtopics || []).sort(
          (a: Subtopic, b: Subtopic) => (a.order_index || 0) - (b.order_index || 0)
        );

        const title =
          language === "es" ? t.title_es : language === "en" ? t.title_en : t.title_ru;
        const description =
          language === "es" ? t.description_es : language === "en" ? t.description_en : t.description_ru;

        return {
          id: t.id,
          number: t.number,
          order_index: t.order_index || t.number,
          title_ru: title, // используем локализованный заголовок для отображения
          title_es: t.title_es,
          title_en: t.title_en,
          description_ru: description,
          description_es: t.description_es,
          description_en: t.description_en,
          cover_image: t.cover_image,
          is_premium: t.is_premium || false,
          gradient_from: t.gradient_from || "#00BFFF",
          gradient_to: t.gradient_to || "#39FF14",
          unlock_condition: t.unlock_condition as any,
          subtopics: sortedSubtopics,
        };
      });

      setTopics(topicsList);
    } catch (error: any) {
      console.error("Error loading learning map:", error);
      setError(error.message || "Не удалось загрузить карту обучения. Попробуйте обновить страницу.");
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (topics.length === 0 || !profileId) {
      setLoading(false);
      return;
    }

    try {
      const topicIds = topics.map((t) => t.id);

      const { data: progressData, error: progressError } = await supabase.rpc("get_user_topics_progress_batch", {
        p_user_id: profileId,
        p_topic_ids: topicIds,
      });

      if (progressError) {
        console.error("[LearningMap] Error loading progress batch:", progressError);
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
              totalSubtopicCount: topic.subtopics.length,
              isUnlocked: topic.order_index === 1,
            });
          }
        }

        topics.slice(20).forEach((topic) => {
          fallbackProgress.set(topic.id, {
            completed: false,
            progressPercent: 0,
            completedSubtopicCount: 0,
            totalSubtopicCount: topic.subtopics.length,
            isUnlocked: false,
          });
        });

        setTopicsProgress(fallbackProgress);
        setLoading(false);
        return;
      }

      const progressMap = new Map<string, TopicProgress>();

      if (progressData && progressData.length > 0) {
        progressData.forEach((row: any) => {
          progressMap.set(row.topic_id, {
            completed: row.completed || false,
            progressPercent: Number(row.progress_percent) || 0,
            completedSubtopicCount: row.completed_subtopic_count || 0,
            totalSubtopicCount: row.total_subtopic_count || 0,
            isUnlocked: row.is_unlocked !== false,
          });
        });
      }

      topics.forEach((topic, index) => {
        if (!progressMap.has(topic.id)) {
          progressMap.set(topic.id, {
            completed: false,
            progressPercent: 0,
            completedSubtopicCount: 0,
            totalSubtopicCount: topic.subtopics.length,
            isUnlocked: index === 0,
          });
        }
      });

      setTopicsProgress(progressMap);
    } catch (error) {
      console.error("[LearningMap] Error loading progress:", error);
      const defaultProgress = new Map<string, TopicProgress>();
      topics.forEach((topic, index) => {
        defaultProgress.set(topic.id, {
          completed: false,
          progressPercent: 0,
          completedSubtopicCount: 0,
          totalSubtopicCount: topic.subtopics.length,
          isUnlocked: index === 0,
        });
      });
      setTopicsProgress(defaultProgress);
    } finally {
      setLoading(false);
    }
  };

  const structuredCurriculum = useMemo<StructuredCurriculumTopic[]>(() => {
    return buildStructuredCurriculum(curriculumBlueprint, topics, topicsProgress, language);
  }, [curriculumBlueprint, topics, topicsProgress, language]);

  const globalProgress =
    structuredCurriculum.length > 0
      ? structuredCurriculum.reduce((acc, topic) => acc + topic.progressPercent, 0) / structuredCurriculum.length
      : 0;

  const completedTopicsCount = structuredCurriculum.filter((topic) => topic.isCompleted).length;

  const nextAction = useMemo(() => {
    for (const topic of structuredCurriculum) {
      for (const section of topic.sections) {
        for (const item of section.items) {
          if (item.status === "active" && item.subtopicId) {
            return {
              topicTitle: topic.title,
              subtopicTitle: item.title,
              subtopicId: item.subtopicId,
            };
          }
        }
      }
    }
    return null;
  }, [structuredCurriculum]);

  const isEs = language === "es";
  const isEn = language === "en";

  const heroStats = [
    {
      label: isEs ? "Temas completados" : isEn ? "Topics completed" : "Тем завершено",
      value: `${completedTopicsCount}/${structuredCurriculum.length || 0}`,
    },
    {
      label: isEs ? "Progreso medio" : isEn ? "Average progress" : "Средний прогресс",
      value: `${Math.round(globalProgress)}%`,
    },
    {
      label: isEs ? "Racha" : isEn ? "Streak" : "Стрик",
      value: `${userProfile?.streak ?? 0} ${isEs ? "días" : isEn ? "days" : "дней"}`,
    },
  ];

  const handleTopicNavigate = (topicId: string) => navigate(`/topic/${topicId}`);
  const handleSubtopicNavigate = (subtopicId: string) => navigate(`/subtopic/${subtopicId}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Загрузка карты обучения...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold">Ошибка загрузки</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              setLoading(true);
              loadLearningMap();
            }}
          >
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 pt-4 pb-8 lg:pt-6 lg:pb-10 space-y-8">
          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-slate-600">
                  {isEs
                    ? "Mapa estructurada del curso de tráfico"
                    : isEn
                    ? "Structured traffic course map"
                    : "Структурированная карта курса ПДД"}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                {isEs ? "Mapa de aprendizaje" : isEn ? "Learning map" : "Карта обучения"}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                {isEs
                  ? "Todos los temas y subtemas en un solo lugar. Empieza por el primer subtema pendiente o elige cualquier módulo."
                  : isEn
                  ? "All topics and subtopics in one place. Start from the first unfinished subtopic or choose any module."
                  : "Все темы и подтемы в одном месте. Начните с первой незавершённой подтемы или выберите любой модуль."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 md:justify-end">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-white border border-slate-200 px-3 py-2 min-w-[120px]"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                  <p className="text-sm font-semibold mt-1 text-slate-900">{stat.value}</p>
                </div>
              ))}
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  if (nextAction) {
                    handleSubtopicNavigate(nextAction.subtopicId);
                  } else if (structuredCurriculum[0]?.topicId) {
                    handleTopicNavigate(structuredCurriculum[0].topicId);
                  }
                }}
              >
                {nextAction
                  ? isEs
                    ? `Continuar: ${nextAction.subtopicTitle}`
                    : isEn
                    ? `Continue: ${nextAction.subtopicTitle}`
                    : `Продолжить: ${nextAction.subtopicTitle}`
                  : isEs
                  ? "Empezar el aprendizaje"
                  : isEn
                  ? "Start learning"
                  : "Начать обучение"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </section>

          {structuredCurriculum.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-slate-200 mb-3">
                <BookOpen className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {isEs ? "Los temas aún no se han añadido" : isEn ? "Topics are not added yet" : "Темы пока не добавлены"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {isEs
                  ? "Cuando el administrador añada los temas, aquí aparecerá la estructura completa del curso."
                  : isEn
                  ? "As soon as the administrator adds topics, the full course structure will appear here."
                  : "Как только администратор добавит темы, здесь появится полная структура курса."}
              </p>
            </div>
          ) : (
            <CurriculumMatrix
              topics={structuredCurriculum}
              onSubtopicClick={handleSubtopicNavigate}
              onTopicClick={handleTopicNavigate}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LearningMap;

function buildStructuredCurriculum(
  blueprint: CurriculumBlueprintTopic[],
  topics: TopicWithSubtopics[],
  progressMap: Map<string, TopicProgress>,
  language: string
): StructuredCurriculumTopic[] {
  const topicByNumber = new Map<number, TopicWithSubtopics>();
  topics.forEach((topic) => topicByNumber.set(topic.number, topic));

  return blueprint.map((topicBlueprint) => {
    const dbTopic = topicByNumber.get(topicBlueprint.number);
    const progress = dbTopic ? progressMap.get(dbTopic.id) : undefined;
    const topicSubtopics = dbTopic?.subtopics ?? [];

    const normalizedMap = new Map<string, Subtopic>();
    topicSubtopics.forEach((subtopic) => normalizedMap.set(normalizeTitle(subtopic.title_ru), subtopic));

    const statusById = new Map<string, ItemStatus>();
    const completedCount = progress?.completedSubtopicCount ?? 0;

    topicSubtopics.forEach((subtopic, index) => {
      let status: ItemStatus = "locked";
      if (progress?.completed) {
        status = "completed";
      } else if (index < completedCount) {
        status = "completed";
      } else if (index === completedCount) {
        status = "active";
      }
      statusById.set(subtopic.id, status);
    });

    const matchedIds = new Set<string>();

    const sections = topicBlueprint.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        const matched = findMatchingSubtopic(item.title, item.code, topicSubtopics, normalizedMap);
        if (matched) {
          matchedIds.add(matched.id);
        }
        const status: ItemStatus = matched ? statusById.get(matched.id) ?? "locked" : "placeholder";

        const localizedTitle =
          matched && language === "es"
            ? matched.title_es || matched.title_ru || item.title
            : matched && language === "en"
            ? matched.title_en || matched.title_ru || item.title
            : matched?.title_ru || item.title;

        return {
          ...item,
          title: localizedTitle,
          subtopicId: matched?.id,
          status,
        };
      }),
    }));

    const leftoverSubtopics = topicSubtopics.filter((subtopic) => !matchedIds.has(subtopic.id));
    if (leftoverSubtopics.length > 0) {
      sections.push({
        title: language === "es" ? "Material adicional" : "Дополнительные материалы",
        items: leftoverSubtopics.map((subtopic) => {
          const localizedTitle =
            language === "es"
              ? subtopic.title_es || subtopic.title_ru
              : language === "en"
              ? subtopic.title_en || subtopic.title_ru
              : subtopic.title_ru;

          return {
            code: subtopic.order_index ? subtopic.order_index.toString() : undefined,
            title: localizedTitle,
            subtopicId: subtopic.id,
            status: statusById.get(subtopic.id) ?? "locked",
          };
        }),
      });
    }

    return {
      ...topicBlueprint,
      topicId: dbTopic?.id,
      description:
        language === "es"
          ? dbTopic?.description_es || topicBlueprint.description
          : language === "en"
          ? dbTopic?.description_en || topicBlueprint.description
          : dbTopic?.description_ru || topicBlueprint.description,
      progressPercent: progress?.progressPercent ?? 0,
      isCompleted: progress?.completed ?? false,
      sections,
    };
  });
}

function normalizeTitle(value?: string | null): string {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-zа-я0-9\s]/gi, "").replace(/\s+/g, " ").trim();
}

function findMatchingSubtopic(
  title: string,
  code: string | undefined,
  subtopics: Subtopic[],
  normalizedMap: Map<string, Subtopic>
): Subtopic | undefined {
  if (!subtopics.length) return undefined;

  if (code) {
    const trimmedCode = code.trim().toLowerCase();
    const byCode = subtopics.find((subtopic) =>
      subtopic.title_ru?.toLowerCase().startsWith(`${trimmedCode} `)
    );
    if (byCode) return byCode;
  }

  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) return undefined;

  const directMatch = normalizedMap.get(normalizedTitle);
  if (directMatch) return directMatch;

  return subtopics.find((subtopic) => {
    const candidate = normalizeTitle(subtopic.title_ru);
    return candidate.includes(normalizedTitle) || normalizedTitle.includes(candidate);
  });
}

