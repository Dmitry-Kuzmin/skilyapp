import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, BookOpen, FileText, Languages, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MaterialViewer, Material } from "@/components/learning-map/MaterialViewer";
import { LanguageTermCard } from "@/components/LanguageTermCard";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadStaticMaterialBySubtopicId, loadStaticMaterialByStaticId } from "@/utils/staticMaterials";
import { PageLoader } from "@/components/PageLoader";
import { useSubtopic, useSubtopicsByTopic } from "@/hooks/useSubtopic";

const SubtopicDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<Material | null>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [test, setTest] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // ОПТИМИЗАЦИЯ: Используем React Query хуки для загрузки подтем
  const { data: subtopic, isLoading: subtopicLoading } = useSubtopic(id || null);
  const { data: allSubtopics = [] } = useSubtopicsByTopic(subtopic?.topic_id || null);

  // ОПТИМИЗАЦИЯ: Вычисляем currentIndex через useMemo
  const computedCurrentIndex = useMemo(() => {
    if (!id || allSubtopics.length === 0) return 0;
    const idx = allSubtopics.findIndex((s) => s.id === id);
    return idx >= 0 ? idx : 0;
  }, [id, allSubtopics]);

  useEffect(() => {
    setCurrentIndex(computedCurrentIndex);
  }, [computedCurrentIndex]);

  useEffect(() => {
    if (id && subtopic) {
      loadSubtopicContent();
    }
  }, [id, subtopic, profileId]);

  // ОПТИМИЗАЦИЯ: Обработка статических материалов
  useEffect(() => {
    if (!id) return;

    const staticMatch = id.match(/^static-topic-(\d+)-subtopic-([\d-]+)$/);
    if (staticMatch) {
      // Это статический материал - загружаем напрямую
      const loadStatic = async () => {
        try {
          setLoading(true);
          const staticMaterial = await loadStaticMaterialByStaticId(id);

          if (staticMaterial) {
            setMaterial({
              id: staticMaterial.id,
              subtopic_id: id,
              title_ru: staticMaterial.title_ru,
              title_es: staticMaterial.title_es,
              title_en: staticMaterial.title_en,
              content_ru: staticMaterial.content_ru,
              content_es: staticMaterial.content_es,
              content_en: staticMaterial.content_en,
              source_pdf: staticMaterial.source_pdf,
              images: staticMaterial.images.map(img => img.url),
            });

            setLoading(false);
          } else {
            throw new Error("Статический материал не найден");
          }
        } catch (error) {
          console.error("Error loading static material:", error);
          toast.error("Ошибка загрузки материала");
          setLoading(false);
        }
      };

      loadStatic();
    } else {
      // Обычная подтема - данные загружаются через React Query хуки
      setLoading(subtopicLoading);
    }
  }, [id, subtopicLoading]);

  const loadSubtopicContent = async () => {
    if (!subtopic || !id) return;

    try {
      setLoading(true);

      // Загружаем контент в зависимости от типа подтемы
      if (subtopic.type === "material") {
        // СНАЧАЛА пробуем загрузить статический материал
        console.log("[SubtopicDetail] Trying to load static material for subtopic:", id);
        const staticMaterial = await loadStaticMaterialBySubtopicId(id!, subtopic.topics?.number);

        if (staticMaterial) {
          console.log("[SubtopicDetail] Static material found:", staticMaterial.id);
          setMaterial({
            id: staticMaterial.id,
            subtopic_id: id,
            title_ru: staticMaterial.title_ru,
            title_es: staticMaterial.title_es,
            title_en: staticMaterial.title_en,
            content_ru: staticMaterial.content_ru,
            content_es: staticMaterial.content_es,
            content_en: staticMaterial.content_en,
            source_pdf: staticMaterial.source_pdf,
            images: staticMaterial.images.map(img => img.url),
          });
        } else {
          // Если статический материал не найден, загружаем из Supabase
          console.log("[SubtopicDetail] Static material not found, loading from Supabase");

          // Загружаем материал - проверяем связь через content_id или subtopic_id
          let materialData = null;
          let materialError = null;

          // Сначала пробуем загрузить по content_id (если указан в подтеме)
          if (subtopic?.content_id) {
            const { data, error } = await supabase
              .from("materials")
              .select("*")
              .eq("id", subtopic.content_id)
              .single();

            materialData = data;
            materialError = error;
          }

          // Если не нашли по content_id, пробуем по subtopic_id
          if (!materialData && !materialError) {
            console.log("[SubtopicDetail] Trying to load material by subtopic_id:", id);
            const { data, error } = await supabase
              .from("materials")
              .select("*")
              .eq("subtopic_id", id)
              .single();

            materialData = data;
            materialError = error;

            if (error) {
              console.warn("[SubtopicDetail] Error loading material by subtopic_id:", error);
            } else if (materialData) {
              console.log("[SubtopicDetail] Material loaded by subtopic_id:", materialData.id);
            }
          } else if (materialError) {
            console.warn("[SubtopicDetail] Error loading material by content_id:", materialError);
          }

          if (!materialError && materialData) {
            console.log("[SubtopicDetail] Material loaded:", {
              id: materialData.id,
              hasHtmlPreview: !!materialData.html_preview,
              hasContent: !!materialData.content,
              contentType: typeof materialData.content,
              hasContentRu: !!materialData.content_ru,
            });

            // Определяем контент: используем html_preview если есть, иначе content
            let contentHtml = "";

            if (materialData.html_preview) {
              // Используем готовый HTML preview
              contentHtml = materialData.html_preview;
              console.log("[SubtopicDetail] Using html_preview");
            } else if (materialData.content) {
              // Если content это объект с полем html
              if (typeof materialData.content === 'object' && materialData.content !== null) {
                if (materialData.content.html) {
                  contentHtml = materialData.content.html;
                  console.log("[SubtopicDetail] Using content.html");
                } else {
                  // Если content это JSON (старый формат TipTap), конвертируем
                  const { generateHTMLPreview } = await import("@/utils/editor");
                  contentHtml = generateHTMLPreview(materialData.content);
                  console.log("[SubtopicDetail] Converted TipTap JSON to HTML");
                }
              } else if (typeof materialData.content === 'string') {
                // Если content это строка (HTML)
                contentHtml = materialData.content;
                console.log("[SubtopicDetail] Using content as string");
              }
            } else if (materialData.content_ru) {
              // Fallback на старые поля для обратной совместимости
              contentHtml = materialData.content_ru;
              console.log("[SubtopicDetail] Using content_ru (legacy)");
            }

            if (!contentHtml) {
              console.warn("[SubtopicDetail] No content found for material:", materialData.id);
            }

            setMaterial({
              id: materialData.id,
              subtopic_id: materialData.subtopic_id,
              title_ru: materialData.title_ru,
              title_es: materialData.title_es,
              title_en: materialData.title_en,
              content_ru: contentHtml, // Используем HTML контент
              content_es: materialData.content_es || contentHtml,
              content_en: materialData.content_en || contentHtml,
              source_pdf: materialData.source_pdf,
              images: (materialData.images as any) || [],
            });
          }
        }
      } else if (subtopic?.type === "terms") {
        // Загружаем термины темы
        const { data: termsData, error: termsError } = await supabase
          .from("language_terms")
          .select("*")
          .eq("topic_id", subtopic.topic_id)
          .order("term_es");

        if (!termsError && termsData) {
          setTerms(termsData);
        }
      } else if (subtopic?.type === "test") {
        // Загружаем тест
        const { data: testData, error: testError } = await supabase
          .from("topic_tests")
          .select("*")
          .eq("subtopic_id", id!)
          .single();

        if (!testError && testData) {
          setTest(testData);
        }
      }

      // Проверяем, завершена ли подтема
      if (profileId && id) {
        const { data: progressData } = await supabase
          .from("user_topic_progress")
          .select("completed")
          .eq("user_id", profileId)
          .eq("subtopic_id", id)
          .single();

        setIsCompleted((progressData as any)?.completed ?? false);
      }
    } catch (error) {
      console.error("Error loading subtopic data:", error);
      toast.error("Ошибка загрузки подтемы");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!profileId || !subtopic) return;

    try {
      // Сохраняем прогресс
      const { error } = await (supabase.from("user_topic_progress").upsert({
        user_id: profileId,
        topic_id: (subtopic as any).topic_id,
        subtopic_id: (subtopic as any).id,
        completed: true,
        score: 100, // Для материалов и терминов - 100%
        last_activity: new Date().toISOString(),
      }) as any);

      if (error) throw error;

      setIsCompleted(true);
      toast.success("Подтема отмечена как изученная!");

      // Переходим к следующей подтеме
      if (currentIndex < allSubtopics.length - 1) {
        setTimeout(() => {
          navigate(`/subtopic/${allSubtopics[currentIndex + 1].id}`);
        }, 1000);
      }
    } catch (error) {
      console.error("Error completing subtopic:", error);
      toast.error("Ошибка сохранения прогресса");
    }
  };

  const handleStartTest = () => {
    if (test) {
      // Переходим к тесту через существующую систему TestSession
      navigate(`/test/practice/${subtopic.topic_id}`);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      navigate(`/subtopic/${allSubtopics[currentIndex - 1].id}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < allSubtopics.length - 1) {
      navigate(`/subtopic/${allSubtopics[currentIndex + 1].id}`);
    } else {
      // Возвращаемся к теме
      navigate(`/topic/${subtopic.topic_id}`);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!subtopic) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Подтема не найдена</h2>
            <p className="text-muted-foreground mb-4">
              Подтема с указанным ID не существует
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к карте
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  const progressPercent = allSubtopics.length > 0
    ? ((currentIndex + 1) / allSubtopics.length) * 100
    : 0;

  const getTypeConfig = () => {
    switch (subtopic.type) {
      case "material":
        return {
          icon: BookOpen,
          label: "Материал",
          color: "text-primary",
          bgGradient: "from-primary/10 to-primary/5",
          borderColor: "border-primary/20",
        };
      case "test":
        return {
          icon: FileText,
          label: "Тест",
          color: "text-secondary",
          bgGradient: "from-secondary/10 to-secondary/5",
          borderColor: "border-secondary/20",
        };
      case "terms":
        return {
          icon: Languages,
          label: "Термины",
          color: "text-emerald-500",
          bgGradient: "from-emerald-500/10 to-emerald-500/5",
          borderColor: "border-emerald-500/20",
        };
      default:
        return {
          icon: BookOpen,
          label: "Урок",
          color: "text-muted-foreground",
          bgGradient: "from-muted to-muted/50",
          borderColor: "border-border",
        };
    }
  };

  const typeConfig = getTypeConfig();
  const IconComponent = typeConfig.icon;

  return (
    <Layout>
      <div className="min-h-screen bg-transparent">
        {/* Современный Header с градиентом */}
        <div className={cn(
          "relative overflow-hidden border-b",
          `bg-gradient-to-br ${typeConfig.bgGradient}`,
          typeConfig.borderColor
        )}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_50%)]" />

          <div className="container mx-auto px-4 py-4 sm:py-6 relative z-10">
            {/* Навигация назад */}
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/topic/${subtopic.topic_id}`)}
                className="shrink-0 hover:bg-background/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent className={cn("w-4 h-4 sm:w-5 sm:h-5", typeConfig.color)} />
                  <span className={cn("text-xs sm:text-sm font-medium", typeConfig.color)}>
                    {typeConfig.label}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words">
                  {subtopic.title_ru}
                </h1>
              </div>
              {isCompleted && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Изучено
                  </span>
                </div>
              )}
            </div>

            {/* Прогресс и навигация */}
            {allSubtopics.length > 1 && (
              <div className="space-y-3">
                {/* Прогресс-бар */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      Подтема {currentIndex + 1} из {allSubtopics.length}
                    </span>
                    <span className="font-medium text-foreground">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Навигационные кнопки */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="flex-1 sm:flex-none"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Предыдущая</span>
                  </Button>

                  <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border">
                    <span className="text-sm font-semibold text-foreground">
                      {currentIndex + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">
                      {allSubtopics.length}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex === allSubtopics.length - 1}
                    className="flex-1 sm:flex-none"
                  >
                    <span className="hidden sm:inline">Следующая</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="container mx-auto px-4 py-6 sm:py-8 pb-20 md:pb-8">
          {subtopic.type === "material" && material && (
            <div className="space-y-6">
              <MaterialViewer
                material={material}
                onComplete={handleComplete}
                isCompleted={isCompleted}
              />
            </div>
          )}

          {subtopic.type === "terms" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Термины темы</h2>
                <p className="text-muted-foreground">
                  Изучи термины, связанные с этой темой
                </p>
              </div>

              {terms.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {terms.map((term) => (
                      <LanguageTermCard key={term.id} term={term} />
                    ))}
                  </div>

                  {!isCompleted && (
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleComplete}
                        size="lg"
                        className="rounded-xl shadow-lg"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Отметить как изученное
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-12 text-center border-dashed">
                  <Languages className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    Термины пока не добавлены
                  </h3>
                  <p className="text-muted-foreground">
                    Термины для этой темы будут добавлены в ближайшее время
                  </p>
                </Card>
              )}
            </div>
          )}

          {subtopic.type === "test" && test && (
            <Card className="p-6 sm:p-8 space-y-6 border-2">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-secondary/10">
                    <FileText className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {test.title_ru}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Вопросов:</span>
                        {test.question_count}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Минимальный балл:</span>
                        {test.min_pass_percent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartTest}
                size="lg"
                className="w-full rounded-xl shadow-lg h-12 text-base font-semibold"
              >
                <FileText className="w-5 h-5 mr-2" />
                Начать тест
              </Button>
            </Card>
          )}

          {/* Empty State для материалов */}
          {subtopic.type === "material" && !material && (
            <Card className="p-12 text-center border-dashed">
              <BookOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                Материал пока не добавлен
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Материал для этой подтемы будет добавлен в ближайшее время
              </p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SubtopicDetail;

