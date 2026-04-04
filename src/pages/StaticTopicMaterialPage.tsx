import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, CheckCircle2, Library, ListTodo } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MaterialViewer, Material } from "@/components/learning-map/MaterialViewer";
import { PageLoader } from "@/components/PageLoader";
import { loadBestStaticMaterialForTopic, loadStaticTopicMaterials } from "@/utils/staticMaterials";
import { COURSE_TOPIC_INVENTORY } from "@/data/courseInventory";
import { supabase } from "@/integrations/supabase/client";
import { LanguageTermCard } from "@/components/LanguageTermCard";
import { cn } from "@/lib/utils";

interface LanguageTerm {
  id: string;
  term_es: string;
  term_ru: string;
  description_es: string;
  description_ru: string;
  difficulty: string;
  image_url: string | null;
  audio_url: string | null;
}

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getRelatedTerms = (material: Material | null, terms: LanguageTerm[]) => {
  if (!material || terms.length === 0) return [];

  const corpus = stripHtml(
    `${material.title_ru} ${material.title_es} ${material.title_en} ${material.content_ru} ${material.content_es} ${material.content_en}`
  );

  return terms
    .map((term) => {
      const es = (term.term_es || "").toLowerCase();
      const ru = (term.term_ru || "").toLowerCase();
      let score = 0;
      if (es && corpus.includes(es)) score += 10;
      if (ru && corpus.includes(ru)) score += 8;
      return { term, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.term);
};

const buildInlineTermTranslations = (terms: LanguageTerm[]) =>
  terms.reduce<Record<string, string>>((acc, term) => {
    if (term.term_es && term.term_ru) {
      acc[term.term_es] = term.term_ru;
    }
    return acc;
  }, {});

export default function StaticTopicMaterialPage() {
  const { topicNumber } = useParams<{ topicNumber: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<Material | null>(null);
  const [topicMaterials, setTopicMaterials] = useState<Material[]>([]);
  const [terms, setTerms] = useState<LanguageTerm[]>([]);

  const topic = useMemo(
    () => COURSE_TOPIC_INVENTORY.find((item) => String(item.topicNumber) === String(topicNumber)) ?? null,
    [topicNumber]
  );

  const relatedTerms = useMemo(() => getRelatedTerms(material, terms), [material, terms]);
  const inlineTermTranslations = useMemo(() => buildInlineTermTranslations(terms), [terms]);

  useEffect(() => {
    const load = async () => {
      if (!topic) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [bestMaterial, allMaterials] = await Promise.all([
          loadBestStaticMaterialForTopic(topic.topicNumber),
          loadStaticTopicMaterials(topic.topicNumber),
        ]);

        const normalizedMaterials = allMaterials.map(({ material }) => ({
          id: material.id,
          subtopic_id: material.id,
          title_ru: material.title_ru,
          title_es: material.title_es,
          title_en: material.title_en,
          content_ru: material.content_ru,
          content_es: material.content_es,
          content_en: material.content_en,
          source_pdf: material.source_pdf,
          images: material.images.map((img) => img.url),
        }));

        setTopicMaterials(normalizedMaterials);

        if (!bestMaterial) {
          setMaterial(null);
          setLoading(false);
          return;
        }

        setMaterial({
          id: bestMaterial.id,
          subtopic_id: bestMaterial.id,
          title_ru: bestMaterial.title_ru,
          title_es: bestMaterial.title_es,
          title_en: bestMaterial.title_en,
          content_ru: bestMaterial.content_ru,
          content_es: bestMaterial.content_es,
          content_en: bestMaterial.content_en,
          source_pdf: bestMaterial.source_pdf,
          images: bestMaterial.images.map((img) => img.url),
        });

        const { data: termsData, error: termsError } = await supabase
          .from("language_terms")
          .select("id, term_es, term_ru, description_es, description_ru, difficulty, image_url, audio_url")
          .eq("topic_id", topic.topicId)
          .order("term_es");

        if (!termsError && termsData) {
          setTerms((termsData || []) as LanguageTerm[]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [topic]);

  if (loading) {
    return <PageLoader />;
  }

  if (!topic || !material) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Материал темы не найден</h2>
            <p className="text-muted-foreground mb-4">
              Не удалось открыть стартовый материал для этой темы
            </p>
            <Button onClick={() => navigate("/lingo")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к курсу
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-transparent">
        <div className="border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/lingo")}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                  Тема {topic.topicNumber}
                </div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{topic.shortTitle}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  Здесь собраны все материалы темы. Слева или сверху выбираете нужный блок, а по умолчанию открывается самый содержательный материал, чтобы тема не выглядела пустой.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="h-fit border-border/60 bg-background/70 p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    <ListTodo className="h-3.5 w-3.5" />
                    Содержание темы
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Все материалы по теме</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topicMaterials.length} {topicMaterials.length === 1 ? "материал" : "материала"} доступны уже сейчас
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right">
                  <div className="text-xs uppercase tracking-[0.16em] text-primary/70">Тема</div>
                  <div className="text-lg font-bold text-primary">{topic.topicNumber}</div>
                </div>
              </div>

              <div className="space-y-3">
                {topicMaterials.map((item, index) => {
                  const isActive = item.id === material.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMaterial(item)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        isActive
                          ? "border-primary/50 bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-foreground px-2 text-xs font-bold text-background">
                          {index + 1}
                        </div>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Открыто сейчас
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold leading-5 text-foreground sm:text-base">
                        {item.title_ru}
                      </h3>
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-6">
              <MaterialViewer
                material={material}
                onComplete={() => undefined}
                isCompleted={false}
                inlineTermTranslations={inlineTermTranslations}
              />

              {relatedTerms.length > 0 && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        <Brain className="h-3.5 w-3.5" />
                        Ключевые термины темы
                      </div>
                      <h2 className="text-xl font-bold text-foreground">Что стоит закрепить сразу после чтения</h2>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/dictionary")}>
                      <Library className="mr-2 h-4 w-4" />
                      Общий словарь
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {relatedTerms.map((term) => (
                      <LanguageTermCard key={term.id} term={term} />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
