import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Lock, CheckCircle2, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";

const CourseStudio = import.meta.env.DEV
  ? lazy(() => import("@/components/dev/CourseStudio").then(m => ({ default: m.CourseStudio })))
  : null;

interface CourseModule {
  id: string;
  number: number;
  emoji: string;
  title_es: string;
  title_ru: string;
  order_index: number;
  lesson_count?: number;
}

const FALLBACK_MODULES = [
  { id: "", number: 1,  emoji: "🛣️", title_es: "Definiciones y uso de las vías",        title_ru: "Определения и дороги",         order_index: 1,  lesson_count: 15 },
  { id: "", number: 2,  emoji: "🚗", title_es: "Maniobras",                              title_ru: "Манёвры",                      order_index: 2,  lesson_count: 10 },
  { id: "", number: 3,  emoji: "🚦", title_es: "Señales",                                title_ru: "Знаки и сигналы",              order_index: 3,  lesson_count: 15 },
  { id: "", number: 4,  emoji: "💡", title_es: "Alumbrado",                              title_ru: "Освещение",                    order_index: 4,  lesson_count: 20 },
  { id: "", number: 5,  emoji: "🪑", title_es: "El uso del vehículo",                   title_ru: "Использование ТС",             order_index: 5,  lesson_count: 8  },
  { id: "", number: 6,  emoji: "📄", title_es: "Documentación",                         title_ru: "Документация",                 order_index: 6,  lesson_count: 7  },
  { id: "", number: 7,  emoji: "⚠️", title_es: "Los accidentes",                        title_ru: "Аварии",                       order_index: 7,  lesson_count: 13 },
  { id: "", number: 8,  emoji: "🚑", title_es: "Comportamiento en caso de accidente",   title_ru: "Действия при аварии",          order_index: 8,  lesson_count: 7  },
  { id: "", number: 9,  emoji: "🔧", title_es: "Mecánica y mantenimiento del vehículo", title_ru: "Механика и обслуживание",      order_index: 9,  lesson_count: 13 },
  { id: "", number: 10, emoji: "🏎️", title_es: "Tipos y técnicas de conducción",        title_ru: "Техники вождения",             order_index: 10, lesson_count: 11 },
];

const Learning = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEs = language === "es";

  const [modules, setModules] = useState<CourseModule[]>(FALLBACK_MODULES);
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({});
  const [loadingModules, setLoadingModules] = useState(true);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const supabase = await getSupabaseClient();
      const { data: mods } = await supabase
        .from("course_modules")
        .select("id, number, emoji, title_es, title_ru, order_index")
        .order("order_index");

      if (mods && mods.length > 0) {
        const { data: lessons } = await supabase
          .from("course_lessons")
          .select("id, module_id");

        const counts: Record<string, number> = {};
        (lessons || []).forEach(l => {
          counts[l.module_id] = (counts[l.module_id] || 0) + 1;
        });

        setModules(mods);
        setLessonCounts(counts);
      }
    } catch {
      // use fallback
    } finally {
      setLoadingModules(false);
    }
  };

  const handleModuleClick = (mod: CourseModule) => {
    if (!mod.id) return;
    navigate(`/learning/module/${mod.id}`);
  };

  return (
    <Layout>
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-0 md:pt-6 pb-24 font-sans">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="w-3 h-3" />
              {isEs ? "Curso DGT" : "Курс DGT"}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEs ? "Tu ruta de aprendizaje" : "Твой путь обучения"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEs
                ? "Completa los módulos en orden y prepárate para el examen"
                : "Проходи модули по порядку и готовься к экзамену"}
            </p>
          </div>

          {/* Module path */}
          <div className="relative">
            <div className="absolute left-[2.375rem] top-16 bottom-16 w-0.5 bg-border/60 z-0" />

            <div className="space-y-4 relative z-10">
              {modules.map((mod, idx) => {
                const isUnlocked = mod.number === 1 && !!mod.id;
                const isLocked = !isUnlocked;
                const count = mod.id ? (lessonCounts[mod.id] ?? mod.lesson_count ?? 0) : (mod.lesson_count ?? 0);

                return (
                  <button
                    key={mod.id || mod.number}
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleModuleClick(mod)}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
                      isLocked
                        ? "bg-card/40 border-border/40 opacity-60 cursor-not-allowed"
                        : "bg-card border-border hover:border-primary/50 hover:shadow-md active:scale-[0.99]"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border-2",
                      isLocked
                        ? "bg-muted border-border/40"
                        : "bg-primary/10 border-primary/20"
                    )}>
                      {isLocked
                        ? <Lock className="w-5 h-5 text-muted-foreground/60" />
                        : <span>{mod.emoji}</span>
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        {isEs ? "Módulo" : "Модуль"} {mod.number}
                      </span>
                      <p className="font-semibold text-sm mt-0.5 truncate">
                        {isEs ? mod.title_es : mod.title_ru}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {count > 0
                          ? `${count} ${isEs ? "lecciones" : "уроков"}`
                          : isEs ? "En desarrollo" : "В разработке"
                        }
                      </p>
                    </div>

                    {!isLocked && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coming soon */}
          <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-primary/60 mx-auto" />
            <p className="text-sm font-semibold text-foreground">
              {isEs ? "Curso en desarrollo" : "Курс в разработке"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isEs
                ? "Estamos preparando el contenido completo"
                : "Готовим полный контент с теорией и практикой"}
            </p>
          </div>

        </div>
      </div>

      {import.meta.env.DEV && CourseStudio && (
        <Suspense fallback={null}>
          <CourseStudio />
        </Suspense>
      )}
    </Layout>
  );
};

export default Learning;
