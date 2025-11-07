import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, BookOpen, FileText, Languages } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MaterialViewer, Material } from "@/components/learning-map/MaterialViewer";
import { LanguageTermCard } from "@/components/LanguageTermCard";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    try {
      setLoading(true);

      // Загружаем подтему
      const { data: subtopicData, error: subtopicError } = await supabase
        .from("subtopics")
        .select("*, topics(*)")
        .eq("id", id)
        .single();

      if (subtopicError) throw subtopicError;
      setSubtopic(subtopicData);

      // Загружаем все подтемы темы для навигации
      if (subtopicData.topic_id) {
        const { data: allSubtopicsData } = await supabase
          .from("subtopics")
          .select("*")
          .eq("topic_id", subtopicData.topic_id)
          .order("order_index", { ascending: true });

        if (allSubtopicsData) {
          setAllSubtopics(allSubtopicsData);
          const currentIdx = allSubtopicsData.findIndex((s) => s.id === id);
          setCurrentIndex(currentIdx >= 0 ? currentIdx : 0);
        }
      }

      // Загружаем контент в зависимости от типа подтемы
      if (subtopicData.type === "material") {
        // Загружаем материал
        const { data: materialData, error: materialError } = await supabase
          .from("materials")
          .select("*")
          .eq("subtopic_id", id)
          .single();

        if (!materialError && materialData) {
          setMaterial({
            id: materialData.id,
            subtopic_id: materialData.subtopic_id,
            title_ru: materialData.title_ru,
            title_es: materialData.title_es,
            title_en: materialData.title_en,
            content_ru: materialData.content_ru,
            content_es: materialData.content_es,
            content_en: materialData.content_en,
            source_pdf: materialData.source_pdf,
            images: (materialData.images as any) || [],
          });
        }
      } else if (subtopicData.type === "terms") {
        // Загружаем термины темы
        const { data: termsData, error: termsError } = await supabase
          .from("language_terms")
          .select("*")
          .eq("topic_id", subtopicData.topic_id)
          .order("term_es");

        if (!termsError && termsData) {
          setTerms(termsData);
        }
      } else if (subtopicData.type === "test") {
        // Загружаем тест
        const { data: testData, error: testError } = await supabase
          .from("topic_tests")
          .select("*")
          .eq("subtopic_id", id)
          .single();

        if (!testError && testData) {
          setTest(testData);
        }
      }

      // Проверяем, завершена ли подтема
      if (profileId) {
        const { data: progressData } = await supabase
          .from("user_topic_progress")
          .select("completed")
          .eq("user_id", profileId)
          .eq("subtopic_id", id)
          .single();

        setIsCompleted(progressData?.completed ?? false);
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
      const { error } = await supabase.from("user_topic_progress").upsert({
        user_id: profileId,
        topic_id: subtopic.topic_id,
        subtopic_id: subtopic.id,
        completed: true,
        score: 100, // Для материалов и терминов - 100%
        last_activity: new Date().toISOString(),
      });

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
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Загрузка подтемы...</p>
          </div>
        </div>
      </Layout>
    );
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/topic/${subtopic.topic_id}`)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {subtopic.type === "material" && <BookOpen className="w-5 h-5 text-primary" />}
              {subtopic.type === "test" && <FileText className="w-5 h-5 text-secondary" />}
              {subtopic.type === "terms" && <Languages className="w-5 h-5 text-success" />}
              <h1 className="text-2xl md:text-3xl font-bold truncate">{subtopic.title_ru}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Подтема {subtopic.order_index} из {allSubtopics.length}
            </p>
          </div>
        </div>

        {/* Navigation */}
        {allSubtopics.length > 1 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Предыдущая
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {allSubtopics.length}
              </span>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentIndex === allSubtopics.length - 1}
              >
                Следующая
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Content */}
        {subtopic.type === "material" && material && (
          <MaterialViewer
            material={material}
            onComplete={handleComplete}
            isCompleted={isCompleted}
          />
        )}

        {subtopic.type === "terms" && (
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Термины темы</h2>
              <p className="text-muted-foreground mb-4">
                Изучи термины, связанные с этой темой
              </p>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {terms.map((term) => (
                <LanguageTermCard key={term.id} term={term} />
              ))}
            </div>
            {terms.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Термины пока не добавлены</p>
              </Card>
            )}
            {terms.length > 0 && !isCompleted && (
              <div className="flex justify-end pt-4">
                <Button onClick={handleComplete} size="lg">
                  Отметить как изученное
                </Button>
              </div>
            )}
          </div>
        )}

        {subtopic.type === "test" && test && (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">{test.title_ru}</h2>
              <p className="text-muted-foreground">
                Вопросов: {test.question_count} | Минимальный балл: {test.min_pass_percent}%
              </p>
            </div>
            <Button onClick={handleStartTest} size="lg" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Начать тест
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {subtopic.type === "material" && !material && (
          <Card className="p-8 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Материал пока не добавлен</h3>
            <p className="text-muted-foreground">
              Материал для этой подтемы будет добавлен в ближайшее время
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SubtopicDetail;

