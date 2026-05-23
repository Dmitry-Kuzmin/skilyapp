import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { SnakeLearningPath, LessonNode } from "@/components/learning-map/SnakeLearningPath";

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

// Duolingo-style palette for banner (matches SnakeLearningPath PALETTE order)
const BANNER_COLORS = ['#58CC02','#FF4B4B','#1CB0F6','#FF9600','#CE82FF','#FF4B4B','#1CB0F6','#FF9600','#58CC02','#CE82FF'];

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

  const lessonNodes: LessonNode[] = modules.map((mod) => ({
    id: mod.id || String(mod.number),
    title: isEs ? mod.title_es : mod.title_ru,
    topic_number: mod.number,
    type: 'module',
    status: mod.number === 1 && !!mod.id ? 'active' : 'locked',
    emoji: mod.emoji,
    lesson_count: lessonCounts[mod.id] ?? mod.lesson_count,
  }));

  const activeNode = lessonNodes.find(n => n.status === 'active');
  const activeMod = activeNode ? modules.find(m => (m.id || String(m.number)) === activeNode.id) : null;
  const bannerColor = activeMod ? BANNER_COLORS[(activeMod.number - 1) % BANNER_COLORS.length] : '#58CC02';

  const handleStart = (lessonId: string) => {
    const mod = modules.find(m => m.id === lessonId);
    if (mod?.id) navigate(`/learning/module/${mod.id}`);
  };

  return (
    <Layout>
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-0 md:pt-6 pb-24 font-sans">
        <div className="max-w-sm mx-auto">

          {/* Duolingo-style active module banner */}
          {activeMod && (
            <div
              className="mb-6 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: bannerColor,
                boxShadow: `0 6px 24px ${bannerColor}55`,
              }}
            >
              {/* Top stripe */}
              <div
                style={{
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  padding: '10px 16px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isEs ? `MÓDULO ${activeMod.number}` : `МОДУЛЬ ${activeMod.number}`}
                </p>
              </div>

              {/* Content row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <span style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{activeMod.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>
                    {isEs ? activeMod.title_es : activeMod.title_ru}
                  </p>
                  {(lessonCounts[activeMod.id] ?? activeMod.lesson_count) && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
                      {lessonCounts[activeMod.id] ?? activeMod.lesson_count} {isEs ? 'lecciones' : 'уроков'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => activeMod.id && navigate(`/learning/module/${activeMod.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 16px',
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                    border: '2px solid rgba(255,255,255,0.3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isEs ? 'Empezar' : 'Начать'}
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          )}

          {/* Fallback header when no active module */}
          {!activeMod && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {isEs ? "Tu ruta de aprendizaje" : "Твой путь обучения"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isEs
                  ? "Completa los módulos en orden"
                  : "Проходи модули по порядку"}
              </p>
            </div>
          )}

          {/* Snake learning path */}
          {loadingModules ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <SnakeLearningPath lessons={lessonNodes} onStart={handleStart} />
          )}

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
