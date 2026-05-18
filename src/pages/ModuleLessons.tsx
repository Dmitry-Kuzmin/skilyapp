import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { useLanguage } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";

interface Module {
  id: string;
  number: number;
  emoji: string;
  title_es: string;
  title_ru: string;
}

interface Lesson {
  id: string;
  code: string;
  title_es: string;
  title_ru: string;
  order_index: number;
  xp_reward: number;
  is_premium: boolean;
}

export default function ModuleLessons() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) return;
    loadData();
  }, [moduleId]);

  const loadData = async () => {
    const supabase = await getSupabaseClient();
    const [modRes, lessonsRes] = await Promise.all([
      supabase.from("course_modules").select("*").eq("id", moduleId).single(),
      supabase.from("course_lessons").select("*").eq("module_id", moduleId).order("order_index"),
    ]);
    if (modRes.data) setModule(modRes.data);
    if (lessonsRes.data) setLessons(lessonsRes.data);
    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!module) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-muted-foreground text-sm">Módulo no encontrado</p>
          <button onClick={() => navigate("/learning")} className="text-primary text-sm">← Volver</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-0 md:pt-6 pb-24 font-sans">
        <div className="max-w-2xl mx-auto">

          {/* Back */}
          <button
            onClick={() => navigate("/learning")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {isEs ? "Todos los módulos" : "Все модули"}
          </button>

          {/* Module header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{module.emoji}</span>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {isEs ? "Módulo" : "Модуль"} {module.number}
                </p>
                <h1 className="text-xl font-bold">{isEs ? module.title_es : module.title_ru}</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              {lessons.length} {isEs ? "lecciones" : "уроков"}
            </p>
          </div>

          {/* Lessons list */}
          {lessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-8 text-center space-y-2">
              <p className="text-sm font-semibold">{isEs ? "Contenido en desarrollo" : "Контент в разработке"}</p>
              <p className="text-xs text-muted-foreground">
                {isEs ? "Estamos preparando las lecciones de este módulo" : "Готовим уроки для этого модуля"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, idx) => {
                const isUnlocked = true; // All lessons unlocked while content is in development

                return (
                  <button
                    key={lesson.id}
                    onClick={() => isUnlocked && navigate(`/learning/lesson/${lesson.id}`)}
                    disabled={!isUnlocked}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                      isUnlocked
                        ? "bg-card border-border hover:border-primary/50 hover:shadow-md active:scale-[0.99]"
                        : "bg-card/40 border-border/40 opacity-50 cursor-not-allowed"
                    )}
                  >
                    {/* Number badge */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0",
                      isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {isUnlocked ? lesson.code : <Lock className="w-4 h-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{lesson.code}</p>
                      <p className="font-semibold text-sm truncate">
                        {isEs ? lesson.title_es : lesson.title_ru}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        +{lesson.xp_reward} XP
                      </p>
                    </div>

                    {isUnlocked && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
