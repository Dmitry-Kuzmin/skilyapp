import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, FileText, Languages, CheckCircle2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { MaterialViewer, Material } from "@/components/learning-map/MaterialViewer";
import { LanguageTermCard } from "@/components/LanguageTermCard";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadStaticMaterialBySubtopicId, loadStaticMaterialByStaticId } from "@/utils/staticMaterials";

const SubtopicDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [subtopic, setSubtopic] = useState<any>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [test, setTest] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [allSubtopics, setAllSubtopics] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (id) {
      loadSubtopicData();
    }
  }, [id, profileId]);

  const loadSubtopicData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const staticMatch = id.match(/^static-topic-(\d+)-subtopic-([\d-]+)$/);
      if (staticMatch) {
        await loadStaticContent(staticMatch);
        return;
      }

      const { data: subtopicData, error: subtopicError } = await supabase
        .from("subtopics")
        .select("*, topics(number)")
        .eq("id", id)
        .single();

      if (subtopicError || !subtopicData) throw subtopicError || new Error("Subtopic not found");

      setSubtopic(subtopicData);

      const [allSubtopicsData, contentPayload, progressRow] = await Promise.all([
        subtopicData.topic_id ? fetchSiblingSubtopics(subtopicData.topic_id) : Promise.resolve(null),
        resolveSubtopicContent(subtopicData),
        profileId ? fetchSubtopicProgress(profileId, id) : Promise.resolve(null),
      ]);

      if (allSubtopicsData) {
        setAllSubtopics(allSubtopicsData);
        const currentIdx = allSubtopicsData.findIndex((s: any) => s.id === id);
        setCurrentIndex(currentIdx >= 0 ? currentIdx : 0);
      }

      if (contentPayload?.material) {
        setMaterial(contentPayload.material);
      }
      if (contentPayload?.terms) {
        setTerms(contentPayload.terms);
      }
      if (contentPayload?.test) {
        setTest(contentPayload.test);
      }

      if (typeof progressRow?.completed === "boolean") {
        setIsCompleted(progressRow.completed);
      }
    } catch (error) {
      console.error("Error loading subtopic data:", error);
      toast.error("Ошибка загрузки подтемы");
    } finally {
      setLoading(false);
    }
  };

  const loadStaticContent = async (staticMatch: RegExpMatchArray) => {
    const topicNumber = parseInt(staticMatch[1], 10);
    const subtopicCode = staticMatch[2].replace("-", ".");
    const staticMaterial = await loadStaticMaterialByStaticId(id!);

    if (!staticMaterial) {
      throw new Error("Статический материал не найден");
    }

    const virtualSubtopic = {
      id,
      code: subtopicCode,
      title_ru: staticMaterial.title_ru,
      title_es: staticMaterial.title_es,
      title_en: staticMaterial.title_en,
      type: "material" as const,
      topic_id: `topic-${topicNumber}`,
      order_index: staticMaterial.order,
    };

    setSubtopic(virtualSubtopic);
    setMaterial(mapStaticMaterial(staticMaterial, id!));
    setAllSubtopics([virtualSubtopic]);
    setCurrentIndex(0);
  };

  const fetchSiblingSubtopics = async (topicId: string) => {
    const { data, error } = await supabase
      .from("subtopics")
      .select("id, title_ru, title_es, title_en, type, order_index")
      .eq("topic_id", topicId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error loading sibling subtopics:", error);
      return null;
    }
    return data;
  };

  const fetchSubtopicProgress = async (userId: string, subtopicId: string) => {
    const { data, error } = await supabase
      .from("user_topic_progress")
      .select("completed")
      .eq("user_id", userId)
      .eq("subtopic_id", subtopicId)
      .maybeSingle();

    if (error) {
      console.error("Error loading subtopic progress:", error);
      return null;
    }
    return data as { completed: boolean } | null;
  };

  const resolveSubtopicContent = async (currentSubtopic: any) => {
    if (currentSubtopic?.type === "material") {
      const materialContent = await loadMaterialContent(currentSubtopic);
      return { material: materialContent || undefined };
    }

    if (currentSubtopic?.type === "terms") {
      const { data, error } = await supabase
        .from("language_terms")
        .select("*")
        .eq("topic_id", currentSubtopic.topic_id)
        .order("term_es");

      if (error) {
        console.error("Error loading terms:", error);
        return {};
      }
      return { terms: data || [] };
    }

    if (currentSubtopic?.type === "test") {
      const { data, error } = await supabase
        .from("topic_tests")
        .select("*")
        .eq("subtopic_id", currentSubtopic.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading test:", error);
        return {};
      }
      return { test: data || null };
    }

    return {};
  };

  const loadMaterialContent = async (currentSubtopic: any) => {
    if (!id) return null;

    const staticMaterial = await loadStaticMaterialBySubtopicId(id, currentSubtopic.topics?.number);
    if (staticMaterial) {
      return mapStaticMaterial(staticMaterial, id);
    }

    const materialRecord = await fetchMaterialRecord(currentSubtopic);
    if (!materialRecord) {
      return null;
    }

    const contentHtml = await extractMaterialHtml(materialRecord);

    return {
      id: materialRecord.id,
      subtopic_id: materialRecord.subtopic_id ?? id,
      title_ru: materialRecord.title_ru,
      title_es: materialRecord.title_es,
      title_en: materialRecord.title_en,
      content_ru: contentHtml,
      content_es: materialRecord.content_es || contentHtml,
      content_en: materialRecord.content_en || contentHtml,
      source_pdf: materialRecord.source_pdf,
      images: normalizeImages(materialRecord.images),
    } as Material;
  };

  const fetchMaterialRecord = async (currentSubtopic: any) => {
    if (currentSubtopic?.content_id) {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("id", currentSubtopic.content_id)
        .maybeSingle();
      if (!error && data) {
        return data;
      }
    }

    const { data } = await supabase
      .from("materials")
      .select("*")
      .eq("subtopic_id", currentSubtopic.id)
      .maybeSingle();

    return data;
  };

  const extractMaterialHtml = async (materialData: any) => {
    if (materialData.html_preview) {
      return materialData.html_preview;
    }

    if (materialData.content) {
      if (typeof materialData.content === "string") {
        return materialData.content;
      }

      if (typeof materialData.content === "object") {
        if (materialData.content.html) {
          return materialData.content.html;
        }

        const { generateHTMLPreview } = await import("@/utils/editor");
        return generateHTMLPreview(materialData.content);
      }
    }

    if (materialData.content_ru) {
      return materialData.content_ru;
    }

    return "";
  };

  const mapStaticMaterial = (staticMaterial: any, subtopicId: string): Material => ({
    id: staticMaterial.id,
    subtopic_id: subtopicId,
    title_ru: staticMaterial.title_ru,
    title_es: staticMaterial.title_es,
    title_en: staticMaterial.title_en,
    content_ru: staticMaterial.content_ru,
    content_es: staticMaterial.content_es ?? staticMaterial.content_ru,
    content_en: staticMaterial.content_en ?? staticMaterial.content_ru,
    source_pdf: staticMaterial.source_pdf,
    images: normalizeImages(staticMaterial.images),
  });

  const normalizeImages = (images: any): string[] => {
    if (!Array.isArray(images)) {
      return [];
    }

    if (images.every((img) => typeof img === "string")) {
      return images as string[];
    }

    return images
      .map((img: any) => {
        if (typeof img === "string") return img;
        if (img?.url) return img.url;
        return null;
      })
      .filter((url): url is string => Boolean(url));
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
    return <SubtopicSkeleton />;
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
            <Button onClick={() => navigate("/")} variant="outline">
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
      <div className="min-h-screen bg-background">
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

const SubtopicSkeleton = () => (
  <Layout>
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-6 w-64 rounded-full" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4 space-y-4">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-3/4 rounded-full" />
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 bg-primary/50 animate-pulse" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-36 rounded-xl" />
        <Skeleton className="h-11 w-28 rounded-xl" />
        <Skeleton className="h-11 w-28 rounded-xl" />
      </div>
    </div>
  </Layout>
);

