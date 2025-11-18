import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { Topic, TopicProgress } from "@/components/learning-map/TopicCard";
import {
  CurriculumMatrix,
  StructuredCurriculumTopic,
  ItemStatus,
} from "@/components/learning-map/CurriculumMatrix";
import { Subtopic } from "@/utils/materialApi";
import {
  curriculumBlueprint,
  CurriculumBlueprintTopic,
} from "@/data/curriculumBlueprint";
import { calculateTopicProgress } from "@/utils/learningMap";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasStaticMaterial } from "@/utils/staticMaterials";

interface TopicWithSubtopics extends Topic {
  subtopics: Subtopic[];
}

const LearningMap = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
  const { language } = useLanguage();
  const isEs = language === "es";
  const isEn = language === "en";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicWithSubtopics[]>([]);
  const [topicsProgress, setTopicsProgress] = useState<Map<string, TopicProgress>>(new Map());
  const [userProfile, setUserProfile] = useState<{ rank?: string; xp?: number; streak?: number } | null>(null);

  useEffect(() => {
    console.log('[LearningMap] Loading map, language:', language);
    setLoading(true);
    loadLearningMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    console.log('[LearningMap] Topics effect triggered:', { topicsLength: topics.length, isAuthenticated, profileId });
    if (topics.length === 0) {
      console.log('[LearningMap] No topics yet, waiting...');
      return;
    }

    if (isAuthenticated && profileId) {
      console.log('[LearningMap] Loading user profile and progress...');
      Promise.all([loadUserProfile(), loadProgress()]).catch((error) => {
        console.error("[LearningMap] Error loading data:", error);
      });
    } else {
      console.log('[LearningMap] Not authenticated, setting default progress');
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
      console.log('[LearningMap] Default progress set, loading:', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics.length, isAuthenticated, profileId]);

  const loadUserProfile = async () => {
    if (!profileId) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('rank, xp, streak_days')
        .eq('id', profileId)
        .single();

      if (error) {
        console.error('[LearningMap] Error loading user profile:', error);
        return;
      }

      setUserProfile({
        rank: profile?.rank || undefined,
        xp: profile?.xp || 0,
        streak: profile?.streak_days || 0,
      });
    } catch (error) {
      console.error('[LearningMap] Error loading user profile:', error);
    }
  };

  const loadLearningMap = async () => {
    try {
      console.log('[LearningMap] Starting to load topics from Supabase...');
      setError(null);
      setLoading(true);
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("*, subtopics(*)")
        .order("order_index", { ascending: true })
        .limit(50);

      console.log('[LearningMap] Topics loaded:', topicsData?.length || 0, 'Error:', topicsError);

      if (topicsError) throw topicsError;

      const topicsList: Topic[] = (topicsData || []).map((t: any) => ({
        id: t.id,
        number: t.number,
        order_index: t.order_index || t.number,
        // Локализуем отображаемый заголовок и описание на основе выбранного языка
        title_ru: language === "es" ? t.title_es : language === "en" ? t.title_en : t.title_ru,
        title_es: t.title_es,
        title_en: t.title_en,
        description_ru:
          language === "es"
            ? t.description_es
            : language === "en"
            ? t.description_en
            : t.description_ru,
        description_es: t.description_es,
        description_en: t.description_en,
        cover_image: t.cover_image,
        is_premium: t.is_premium || false,
        gradient_from: t.gradient_from || "#00BFFF",
        gradient_to: t.gradient_to || "#39FF14",
        unlock_condition: t.unlock_condition as any,
        subtopics: (t.subtopics || []).sort(
          (a: Subtopic, b: Subtopic) => (a.order_index || 0) - (b.order_index || 0)
        ),
      })) as TopicWithSubtopics[];

      console.log('[LearningMap] Topics processed:', topicsList.length);
      setTopics(topicsList);
      setLoading(false);
      console.log('[LearningMap] Loading complete, loading state:', false);
    } catch (error: any) {
      console.error("[LearningMap] Error loading learning map:", error);
      setError(error.message || "Не удалось загрузить карту обучения. Попробуйте обновить страницу.");
      setLoading(false);
      console.log('[LearningMap] Error state set, loading:', false);
    }
  };

  const loadProgress = async () => {
    if (topics.length === 0) {
      setLoading(false);
      return;
    }

    try {
      if (!profileId) {
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
        return;
      }

      const topicIds = topics.map(t => t.id);
      const { data: progressData, error: progressError } = await supabase.rpc(
        'get_user_topics_progress_batch',
        {
          p_user_id: profileId,
          p_topic_ids: topicIds
        }
      );

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

        topics.slice(20).forEach((topic, index) => {
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
            totalSubtopicCount: row.total_subtopic_count || topics.find(t => t.id === row.topic_id)?.subtopics.length || 0,
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

  const handleTopicClick = (topicId: string) => {
    navigate(`/topic/${topicId}`);
  };

  const handleSubtopicClick = (subtopicId: string) => {
    navigate(`/subtopic/${subtopicId}`);
  };

  const structuredCurriculum = useMemo<StructuredCurriculumTopic[]>(() => {
    if (topics.length === 0) return [];
    return buildStructuredCurriculum(curriculumBlueprint, topics, topicsProgress, language);
  }, [topics, topicsProgress, language]);

  const globalProgress = useMemo(() => {
    if (topics.length === 0) return 0;
    let sum = 0;
    topics.forEach((topic) => {
      const progress = topicsProgress.get(topic.id);
      sum += progress?.progressPercent ?? 0;
    });
    return sum / topics.length;
  }, [topics, topicsProgress]);

  const completedTopicsCount = useMemo(() => {
    let count = 0;
    topics.forEach((topic) => {
      if (topicsProgress.get(topic.id)?.completed) {
        count++;
      }
    });
    return count;
  }, [topics, topicsProgress]);

  const totalSubtopics = useMemo(() => {
    let total = 0;
    let completed = 0;
    topics.forEach((topic) => {
      const progress = topicsProgress.get(topic.id);
      total += progress?.totalSubtopicCount ?? topic.subtopics.length;
      completed += progress?.completedSubtopicCount ?? 0;
    });
    return { total, completed };
  }, [topics, topicsProgress]);

  const nextAction = useMemo(() => {
    for (const topic of structuredCurriculum) {
      for (const section of topic.sections) {
        for (const item of section.items) {
          if (item.status === "active" && item.subtopicId) {
            return {
              topicId: topic.topicId,
              subtopicId: item.subtopicId,
              subtopicTitle: item.title,
            };
          }
        }
      }
    }
    return null;
  }, [structuredCurriculum]);

  const heroStats = [
    {
      label: isEs ? "Progreso total" : isEn ? "Overall progress" : "Общий прогресс",
      value: `${Math.round(globalProgress)}%`,
    },
    {
      label: isEs ? "Temas completados" : isEn ? "Completed topics" : "Тем завершено",
      value: `${completedTopicsCount}/${topics.length}`,
    },
    {
      label: isEs ? "Subtemas" : isEn ? "Subtopics" : "Подтемы",
      value:
        totalSubtopics.total > 0
          ? `${totalSubtopics.completed}/${totalSubtopics.total}`
          : "0/0",
    },
  ];

  console.log('[LearningMap] Render state:', { loading, error, topicsLength: topics.length, topicsProgressSize: topicsProgress.size });

  if (loading) {
    console.log('[LearningMap] Rendering loading state');
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">
              {isEs
                ? "Cargando mapa de aprendizaje..."
                : isEn
                ? "Loading learning map..."
                : "Загрузка карты обучения..."}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    console.log('[LearningMap] Rendering error state:', error);
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">
              {isEs ? "Error de carga" : isEn ? "Loading error" : "Ошибка загрузки"}
            </h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => {
              console.log('[LearningMap] Retry button clicked');
              setError(null);
              setLoading(true);
              loadLearningMap();
            }}>
              {isEs ? "Intentar de nuevo" : isEn ? "Try again" : "Попробовать снова"}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-4 pb-8 lg:pt-6 lg:pb-10 space-y-8">
          <section className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3 md:max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 w-fit">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  {isEs
                    ? "Mapa estructurada del curso de tráfico"
                    : isEn
                    ? "Structured traffic course map"
                    : "Структурированная карта курса ПДД"}
                </span>
              </div>
            </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  {isEs ? "Mapa de aprendizaje" : isEn ? "Learning map" : "Карта обучения"}
                </h1>
                <p className="text-base text-muted-foreground">
                  {isEs
                    ? "Todos los temas y subtemas en un solo lugar. Comience con el primer subtema incompleto o seleccione cualquier módulo."
                    : isEn
                    ? "All topics and subtopics in one place. Start with the first incomplete subtopic or select any module."
                    : "Все темы и подтемы в одном месте. Начните с первой незавершённой подтемы или выберите любой модуль."}
                </p>
              </div>

              <div className="w-full md:max-w-md lg:max-w-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3 gap-3">
                  {heroStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl bg-card border border-border px-4 py-3 flex flex-col gap-1"
                    >
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <Button
                  size="lg"
                  className="w-full rounded-2xl justify-between"
                  onClick={() => {
                    if (nextAction) {
                      handleSubtopicClick(nextAction.subtopicId);
                    } else if (structuredCurriculum[0]?.topicId) {
                      handleTopicClick(structuredCurriculum[0].topicId!);
                    }
                  }}
                >
                  <span className="text-left">
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
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          {structuredCurriculum.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 border border-border mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {isEs
                  ? "Temas aún no añadidas"
                  : isEn
                  ? "Topics not added yet"
                  : "Темы пока не добавлены"}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {isEs
                  ? "Estamos recopilando contenido. Vuelve más tarde para ver la ruta completa."
                  : isEn
                  ? "We are collecting content. Check back later to see the full route."
                  : "Мы уже собираем контент. Зайдите позже, чтобы увидеть полный маршрут."}
              </p>
            </div>
          ) : (
            <CurriculumMatrix
              topics={structuredCurriculum}
              onSubtopicClick={handleSubtopicClick}
              onTopicClick={handleTopicClick}
              onTrainingTestClick={(topicId) => navigate(`/tests?topic=${topicId}`)}
              onFinalTestClick={(topicId) => navigate(`/test/module/${topicId}`)}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LearningMap;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingSubtopic(
  blueprintTitle: string,
  code: string | undefined,
  subtopics: Subtopic[],
  normalizedMap: Map<string, Subtopic>
): Subtopic | undefined {
  // 1. Сначала по коду, если он есть и можно однозначно сопоставить по order_index
  if (code) {
    const numericCode = parseFloat(code);
    if (!Number.isNaN(numericCode)) {
      const byOrder = subtopics.find(
        (s) => s.order_index === numericCode || s.order_index === Number(code)
      );
      if (byOrder) return byOrder;
    }
  }

  // 2. Затем по нормализованному заголовку
  const normalizedTitle = normalizeTitle(blueprintTitle);
  const directMatch = normalizedMap.get(normalizedTitle);
  if (directMatch) return directMatch;

  // 3. Мягкий поиск: содержит/начинается с
  const looseMatch = subtopics.find((s) => {
    const dbTitle = normalizeTitle(s.title_ru);
    return dbTitle.includes(normalizedTitle) || normalizedTitle.includes(dbTitle);
  });

  return looseMatch;
}

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
    topicSubtopics.forEach((subtopic) =>
      normalizedMap.set(normalizeTitle(subtopic.title_ru), subtopic)
    );

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
      title:
        language === "es"
          ? section.title_es || section.title
          : language === "en"
          ? section.title_en || section.title
          : section.title,
      items: section.items.map((item) => {
        const matched = findMatchingSubtopic(
          item.title,
          item.code,
          topicSubtopics,
          normalizedMap
        );
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
          kind: "subtopic",
        };
      }),
    }));

    const leftoverSubtopics = topicSubtopics.filter((subtopic) => !matchedIds.has(subtopic.id));
    if (leftoverSubtopics.length > 0) {
      sections.push({
        title:
          language === "es"
            ? "Material adicional"
            : language === "en"
            ? "Additional material"
            : "Дополнительные материалы",
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
            kind: "subtopic",
          };
        }),
      });
    }

    // Добавляем секцию с тестами по модулю, если тема существует в базе
    if (dbTopic) {
      const canAccessTests = (progressMap.get(dbTopic.id)?.isUnlocked ?? true) || !progress;

      const testsSectionTitle =
        language === "es"
          ? "Pruebas del módulo"
          : language === "en"
          ? "Module tests"
          : "Тесты по модулю";

      const trainingTestTitle =
        language === "es"
          ? "Test de entrenamiento por tema"
          : language === "en"
          ? "Training test by topic"
          : "Тренировочный тест по теме";

      const finalTestTitle =
        language === "es"
          ? "Test final del módulo"
          : language === "en"
          ? "Final module test"
          : "Итоговый тест по модулю";

      sections.push({
        title: testsSectionTitle,
        items: [
          {
            code: "T1",
            title: trainingTestTitle,
            status: canAccessTests ? "active" : "locked",
            kind: "training_test",
          },
          {
            code: "T2",
            title: finalTestTitle,
            status: progress?.completed ? "completed" : canAccessTests ? "active" : "locked",
            kind: "final_test",
          },
        ],
      });
    }

    const localizedTopicTitle =
      language === "es"
        ? dbTopic?.title_es || topicBlueprint.title_es || topicBlueprint.title
        : language === "en"
        ? dbTopic?.title_en || topicBlueprint.title_en || topicBlueprint.title
        : dbTopic?.title_ru || topicBlueprint.title;

    const localizedTopicDescription =
      language === "es"
        ? dbTopic?.description_es || topicBlueprint.description_es || topicBlueprint.description
        : language === "en"
        ? dbTopic?.description_en || topicBlueprint.description_en || topicBlueprint.description
        : dbTopic?.description_ru || topicBlueprint.description;

    return {
      ...topicBlueprint,
      title: localizedTopicTitle,
      description: localizedTopicDescription,
      // передаём визуальные поля темы в карточку модуля
      cover_image: dbTopic?.cover_image,
      gradient_from: dbTopic?.gradient_from,
      gradient_to: dbTopic?.gradient_to,
      topicId: dbTopic?.id,
      progressPercent: progress?.progressPercent ?? 0,
      isCompleted: progress?.completed ?? false,
      sections,
    };
  });
}

