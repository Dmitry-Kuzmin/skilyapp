import { useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { Topic, TopicProgress } from "@/components/learning-map/TopicCard";
import {
  CurriculumMatrix,
  StructuredCurriculumTopic,
  StructuredCurriculumItem,
  StructuredCurriculumSection,
  ItemStatus,
} from "@/components/learning-map/CurriculumMatrix";
import { Subtopic } from "@/utils/materialApi";
import {
  curriculumBlueprint,
  CurriculumBlueprintTopic,
} from "@/data/curriculumBlueprint";
import { calculateTopicProgress } from "@/utils/learningMap";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { hasStaticMaterial } from "@/utils/staticMaterials";
import { LearningMapSkeleton } from "@/components/learning-map/LearningMapSkeleton";

const isLearningMapDebug =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_LEARNING_MAP === "true";
const logLearningMap = (...args: any[]) => {
  if (isLearningMapDebug) {
    console.debug(...args);
  }
};

interface TopicWithSubtopics extends Topic {
  subtopics: Subtopic[];
}

interface LearningMapProps {
  variant?: "full" | "embedded";
  className?: string;
}

const LearningMap = ({ variant = "full", className }: LearningMapProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicWithSubtopics[]>([]);
  const [topicsProgress, setTopicsProgress] = useState<Map<string, TopicProgress>>(new Map());
  const [, setUserProfile] = useState<{ rank?: string; xp?: number; streak?: number } | null>(null);
  const topicsCacheKey = useMemo(() => `learning_map_topics_${language}`, [language]);
  const isEmbedded = variant === "embedded";

  const renderWithLayout = (content: ReactNode) =>
    isEmbedded ? content : <Layout>{content}</Layout>;

  const wrapperClasses = cn(
    isEmbedded
      ? "bg-card/80 border border-border/40 rounded-3xl shadow-xl backdrop-blur-md"
      : "min-h-screen bg-background",
    className
  );

  const innerClasses = isEmbedded
    ? "px-2 sm:px-3 md:px-5 lg:px-6 py-4 space-y-6"
    : "container mx-auto px-4 pt-4 pb-8 lg:pt-6 lg:pb-10 space-y-8";

  useEffect(() => {
    logLearningMap("[LearningMap] Loading map, language:", language);
    let usedCache = false;
    if (typeof window !== "undefined") {
      const cached = window.localStorage.getItem(topicsCacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as TopicWithSubtopics[];
          if (parsed.length) {
            setTopics(parsed);
            // Не сбрасываем loading сразу - дадим skeleton показаться минимум 300ms для лучшего UX
            setTimeout(() => {
              setLoading(false);
            }, 300);
            usedCache = true;
            logLearningMap("[LearningMap] Applied cached topics:", parsed.length);
          }
        } catch (error) {
          console.warn("[LearningMap] Failed to parse cached topics:", error);
        }
      }
    }
    loadLearningMap({ silent: usedCache });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, topicsCacheKey]);

  useEffect(() => {
    logLearningMap("[LearningMap] Topics effect triggered:", {
      topicsLength: topics.length,
      isAuthenticated,
      profileId,
    });
    if (topics.length === 0) {
      logLearningMap("[LearningMap] No topics yet, waiting...");
      return;
    }

    if (isAuthenticated && profileId) {
      logLearningMap("[LearningMap] Loading user profile and progress...");
      Promise.all([loadUserProfile(), loadProgress()]).catch((error) => {
        console.error("[LearningMap] Error loading data:", error);
      });
    } else {
      logLearningMap("[LearningMap] Not authenticated, setting default progress");
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
      // Даём skeleton показаться минимум 300ms
      setTimeout(() => {
        setLoading(false);
      }, 300);
      logLearningMap("[LearningMap] Default progress set, loading:", false);
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

      if (profile) {
        setUserProfile({
          rank: (profile as any).rank || undefined,
          xp: (profile as any).xp || 0,
          streak: (profile as any).streak_days || 0,
        });
      }
    } catch (error) {
      console.error('[LearningMap] Error loading user profile:', error);
    }
  };

  const loadLearningMap = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      logLearningMap("[LearningMap] Starting to load topics from Supabase...");
      setError(null);
      if (!silent) {
        setLoading(true);
      }
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("*, subtopics(*)")
        .order("order_index", { ascending: true })
        .limit(50);

      logLearningMap(
        "[LearningMap] Topics loaded:",
        topicsData?.length || 0,
        "Error:",
        topicsError
      );

      if (topicsError) throw topicsError;

      const topicsList: TopicWithSubtopics[] = (topicsData || []).map((t: any) => ({
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
      }));

      logLearningMap("[LearningMap] Topics processed:", topicsList.length);
      setTopics(topicsList);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(topicsCacheKey, JSON.stringify(topicsList));
        } catch (error) {
          console.warn("[LearningMap] Failed to cache topics:", error);
        }
      }
      // Минимальная задержка для показа skeleton (если не silent режим)
      if (!silent) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      } else {
        setLoading(false);
      }
      logLearningMap("[LearningMap] Loading complete, loading state:", false);
    } catch (error: any) {
      console.error("[LearningMap] Error loading learning map:", error);
      setError(error.message || t("learningMap.errors.generic"));
      setLoading(false);
      logLearningMap("[LearningMap] Error state set, loading:", false);
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

      const topicIds = topics.map((t) => t.id);
      const { data: progressData, error: progressError } = await (supabase as any)
        .rpc("get_user_topics_progress_batch", {
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

      const typedProgressData =
        (progressData as {
          topic_id: string;
          completed: boolean;
          progress_percent: number;
          completed_subtopic_count: number;
          total_subtopic_count: number;
          is_unlocked: boolean;
        }[] | null) ?? null;

      const progressMap = new Map<string, TopicProgress>();
      if (typedProgressData && typedProgressData.length > 0) {
        typedProgressData.forEach((row) => {
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

  const [structuredCurriculum, setStructuredCurriculum] = useState<StructuredCurriculumTopic[]>([]);
  const [isBuildingCurriculum, setIsBuildingCurriculum] = useState(false);

  useEffect(() => {
    if (topics.length === 0) {
      setStructuredCurriculum([]);
      setIsBuildingCurriculum(false);
      return;
    }
    
    setIsBuildingCurriculum(true);
    // Асинхронно строим структуру с проверкой статических материалов
    buildStructuredCurriculumAsync(curriculumBlueprint, topics, topicsProgress, language)
      .then((result) => {
        setStructuredCurriculum(result);
        setIsBuildingCurriculum(false);
      })
      .catch((error) => {
        console.error("[LearningMap] Error building structured curriculum:", error);
        // Fallback на синхронную версию
        setStructuredCurriculum(buildStructuredCurriculum(curriculumBlueprint, topics, topicsProgress, language));
        setIsBuildingCurriculum(false);
      });
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

  const globalProgressPercent = Math.round(globalProgress);
  const clampedGlobalPercent = Math.min(Math.max(globalProgressPercent, 0), 100);
  const topicsCompletionPercent =
    topics.length > 0 ? Math.min((completedTopicsCount / topics.length) * 100, 100) : 0;
  const subtopicsPercent =
    totalSubtopics.total > 0 ? Math.min((totalSubtopics.completed / totalSubtopics.total) * 100, 100) : 0;
  const subtopicsSummary =
    totalSubtopics.total > 0 ? `${totalSubtopics.completed}/${totalSubtopics.total}` : "0/0";

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

  const nextActionLabel = useMemo(() => {
    if (nextAction) {
      return t("learningMap.actions.continue");
    }
    return t("learningMap.actions.start");
  }, [nextAction, t]);

  const nextActionDescription = useMemo(() => {
    if (nextAction) {
      return nextAction.subtopicTitle;
    }
    const firstItemTitle =
      structuredCurriculum[0]?.sections?.[0]?.items?.[0]?.title ??
      structuredCurriculum[0]?.sections?.[0]?.items?.find(Boolean)?.title;
    if (firstItemTitle) {
      return firstItemTitle;
    }
    return t("learningMap.actions.selectModule");
  }, [nextAction, structuredCurriculum, t]);

  logLearningMap("[LearningMap] Render state:", {
    loading,
    error,
    topicsLength: topics.length,
    topicsProgressSize: topicsProgress.size,
  });

  if (loading) {
    logLearningMap("[LearningMap] Rendering loading state");
    if (isEmbedded) {
      return (
        <div className={wrapperClasses}>
          <div className={cn(innerClasses, "space-y-4")}>
            <div className="h-12 rounded-2xl bg-muted/60 animate-pulse" />
            <div className="h-96 rounded-3xl bg-muted/30 border border-border/40 animate-pulse" />
          </div>
        </div>
      );
    }
    return renderWithLayout(<LearningMapSkeleton />);
  }

  if (error) {
    logLearningMap("[LearningMap] Rendering error state:", error);
    const errorContent = (
      <div className="flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md py-10">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">
            {t("learningMap.errors.title")}
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={() => {
              logLearningMap("[LearningMap] Retry button clicked");
              setError(null);
              setLoading(true);
              loadLearningMap();
            }}
          >
            {t("learningMap.errors.retry")}
          </Button>
        </div>
      </div>
    );

    if (isEmbedded) {
      return <div className={wrapperClasses}>{errorContent}</div>;
    }

    return renderWithLayout(
      <div className="min-h-screen bg-background">{errorContent}</div>
    );
  }

  const mapContent = (
    <div className={wrapperClasses}>
      <div className={innerClasses}>
          <section className="flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3 md:max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 w-fit">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("learningMap.hero.badge")}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  {t("learningMap.hero.title")}
                </h1>
                <p className="text-base text-muted-foreground">
                  {t("learningMap.hero.description")}
                </p>
              </div>

              <div className="w-full md:max-w-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-card px-4 py-5 flex items-center gap-4 shadow-sm">
                    <div className="relative w-20 h-20">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(#38bdf8 ${clampedGlobalPercent}%, rgba(148,163,184,0.2) ${clampedGlobalPercent}% 100%)`,
                        }}
                      />
                      <div className="absolute inset-[6px] rounded-full bg-background border border-white/30 dark:border-white/10" />
                      <div className="relative z-10 flex items-center justify-center h-full text-2xl font-semibold text-foreground">
                        {globalProgressPercent}%
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                        {t("learningMap.stats.overallTitle")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("learningMap.stats.overallAverage", { count: topics.length || 0 })}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card px-4 py-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                          {t("learningMap.stats.topicProgress")}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {Math.round(topicsCompletionPercent)}%
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
                        {completedTopicsCount}
                        <span className="text-muted-foreground">/ {topics.length || 0}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 transition-all"
                        style={{ width: `${topicsCompletionPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      <span>{t("learningMap.stats.subtopicsLabel")}</span>
                      <span className="text-muted-foreground tracking-normal font-semibold">
                        {subtopicsSummary}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-secondary transition-all"
                        style={{ width: `${subtopicsPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full rounded-2xl justify-between gap-4 py-4"
                  onClick={() => {
                    if (nextAction) {
                      handleSubtopicClick(nextAction.subtopicId);
                    } else if (structuredCurriculum[0]?.topicId) {
                      handleTopicClick(structuredCurriculum[0].topicId!);
                    }
                  }}
                >
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-sm font-semibold text-primary-foreground/80">
                      {nextActionLabel}
                    </span>
                    <span className="text-base font-semibold text-primary-foreground leading-snug line-clamp-2 break-words whitespace-normal">
                      {nextActionDescription}
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-primary-foreground shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Button>
              </div>
            </div>
          </section>

          {loading || isBuildingCurriculum || (topics.length > 0 && structuredCurriculum.length === 0) ? (
            (loading || isBuildingCurriculum) ? (
              <div className="space-y-10">
                {[1, 2, 3].map((i) => (
                  <Card
                    key={i}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card/80 dark:bg-card/90 backdrop-blur-sm px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5"
                  >
                    <div className="relative space-y-3 sm:space-y-4">
                      <div className="relative rounded-xl overflow-hidden p-2.5 sm:p-3 md:p-4 lg:p-5 flex flex-col gap-2.5 sm:gap-3 md:flex-row md:items-center md:justify-between min-h-[120px] sm:min-h-[140px] md:min-h-[160px]">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-5 w-full max-w-xs" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-full max-w-2xl" />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:items-center md:justify-end w-full sm:w-auto">
                          <Skeleton className="h-16 sm:h-14 w-full sm:w-32 rounded-lg sm:rounded-xl" />
                          <Skeleton className="h-10 w-full sm:w-24 rounded-lg sm:rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 border border-border mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t("learningMap.empty.title")}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t("learningMap.empty.description")}
                </p>
              </div>
            )
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
  );

  return renderWithLayout(mapContent);
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

async function buildStructuredCurriculumAsync(
  blueprint: CurriculumBlueprintTopic[],
  topics: TopicWithSubtopics[],
  progressMap: Map<string, TopicProgress>,
  language: string
): Promise<StructuredCurriculumTopic[]> {
  const topicByNumber = new Map<number, TopicWithSubtopics>();
  topics.forEach((topic) => topicByNumber.set(topic.number, topic));

  return Promise.all(blueprint.map(async (topicBlueprint) => {
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

    const sections: StructuredCurriculumSection[] = await Promise.all(
      topicBlueprint.sections.map(async (section) => ({
        title:
          language === "es"
            ? section.title_es || section.title
            : language === "en"
            ? section.title_en || section.title
            : section.title,
        items: await Promise.all(
          section.items.map(async (item) => {
            const matched = findMatchingSubtopic(
              item.title,
              item.code,
              topicSubtopics,
              normalizedMap
            );
            if (matched) {
              matchedIds.add(matched.id);
            }

            // Проверяем наличие статического материала, если подтема не найдена в БД
            let status: ItemStatus = matched ? statusById.get(matched.id) ?? "locked" : "placeholder";

            if (!matched && item.code && topicBlueprint.number) {
              const hasStatic = await hasStaticMaterial(topicBlueprint.number, item.code);
              if (hasStatic) {
                status = "active"; // Статический материал доступен
              }
            }

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
              kind: "subtopic" as const,
            };
          })
        ),
      }))
    );

    const leftoverSubtopics = topicSubtopics.filter((subtopic) => !matchedIds.has(subtopic.id));
    if (leftoverSubtopics.length > 0) {
      const additionalSection: StructuredCurriculumSection = {
        title: t("learningMap.additionalMaterials"),
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
            kind: "subtopic" as const,
          };
        }),
      };
      sections.push(additionalSection);
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

      const testsSection: StructuredCurriculumSection = {
        title: testsSectionTitle,
        items: [
          {
            code: "T1",
            title: trainingTestTitle,
            subtopicId: undefined,
            status: (canAccessTests ? "active" : "locked") as ItemStatus,
            kind: "training_test" as const,
          },
          {
            code: "T2",
            title: finalTestTitle,
            subtopicId: undefined,
            status: (progress?.completed ? "completed" : canAccessTests ? "active" : "locked") as ItemStatus,
            kind: "final_test" as const,
          },
        ] as StructuredCurriculumItem[],
      };
      sections.push(testsSection);
    }

    return {
      ...topicBlueprint,
      topicId: dbTopic?.id,
      progressPercent: progress?.progressPercent ?? 0,
      isCompleted: progress?.completed ?? false,
      cover_image: dbTopic?.cover_image,
      gradient_from: dbTopic?.gradient_from,
      gradient_to: dbTopic?.gradient_to,
      sections,
    };
  }));
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

    const sections: StructuredCurriculumSection[] = topicBlueprint.sections.map((section) => ({
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
          kind: "subtopic" as const,
        };
      }),
    }));

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

      const testsSection: StructuredCurriculumSection = {
        title: testsSectionTitle,
        items: [
          {
            code: "T1",
            title: trainingTestTitle,
            subtopicId: undefined,
            status: (canAccessTests ? "active" : "locked") as ItemStatus,
            kind: "training_test" as const,
          },
          {
            code: "T2",
            title: finalTestTitle,
            subtopicId: undefined,
            status: (progress?.completed ? "completed" : canAccessTests ? "active" : "locked") as ItemStatus,
            kind: "final_test" as const,
          },
        ] as StructuredCurriculumItem[],
      };
      sections.push(testsSection);
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

