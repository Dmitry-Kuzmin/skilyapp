import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Play,
  Zap,
  ChevronRight,
  Sparkles,
  Target,
  Layers3,
  Brain,
  Route,
  Clock3,
  ShieldCheck,
  BookOpenCheck,
  ArrowUpRight,
} from 'lucide-react';
import { useLingoCourse } from '@/hooks/useLingoCourse';
import { getNextLesson, LINGO_CHAPTERS } from '@/data/lingo';
import {
  LINGO_EXPERIENCE_PILLARS,
  LINGO_NEXT_GEN_LESSONS_TOTAL,
  LINGO_NEXT_GEN_MODULES,
  LINGO_NEXT_GEN_MODULES_TOTAL,
  LINGO_VERIFIED_TERM_TOTAL,
} from '@/data/lingo/nextGenBlueprint';
import {
  COURSE_TOPIC_INVENTORY,
  FULL_COURSE_MATERIAL_TOTAL,
  FULL_COURSE_TOPIC_TOTAL,
} from '@/data/courseInventory';
import { PageSkeleton } from '@/components/PageSkeleton';

/** Light-theme accent colors per chapter */
const CHAPTER_COLORS: Record<string, {
  border: string;
  text: string;
  accent: string;
  accentBg: string;
  progressBg: string;
  iconBg: string;
}> = {
  ch1: { border: 'border-t-blue-500', text: 'text-blue-600', accent: 'bg-blue-500', accentBg: 'bg-blue-50', progressBg: 'bg-blue-500', iconBg: 'bg-blue-100 text-blue-600' },
  ch2: { border: 'border-t-emerald-500', text: 'text-emerald-600', accent: 'bg-emerald-500', accentBg: 'bg-emerald-50', progressBg: 'bg-emerald-500', iconBg: 'bg-emerald-100 text-emerald-600' },
  ch3: { border: 'border-t-amber-500', text: 'text-amber-600', accent: 'bg-amber-500', accentBg: 'bg-amber-50', progressBg: 'bg-amber-500', iconBg: 'bg-amber-100 text-amber-600' },
  ch4: { border: 'border-t-purple-500', text: 'text-purple-600', accent: 'bg-purple-500', accentBg: 'bg-purple-50', progressBg: 'bg-purple-500', iconBg: 'bg-purple-100 text-purple-600' },
  ch5: { border: 'border-t-red-500', text: 'text-red-600', accent: 'bg-red-500', accentBg: 'bg-red-50', progressBg: 'bg-red-500', iconBg: 'bg-red-100 text-red-600' },
  ch6: { border: 'border-t-orange-500', text: 'text-orange-600', accent: 'bg-orange-500', accentBg: 'bg-orange-50', progressBg: 'bg-orange-500', iconBg: 'bg-orange-100 text-orange-600' },
};

function getColors(chId: string) {
  return CHAPTER_COLORS[chId] ?? CHAPTER_COLORS.ch1;
}

const PREMIUM_SESSION_STEPS = [
  {
    icon: Route,
    title: 'Понятный маршрут',
    text: 'Вы видите, какую тему проходите сейчас, что будет дальше и зачем это встретится на экзамене DGT.',
  },
  {
    icon: BookOpenCheck,
    title: 'Теория + словарь + практика',
    text: 'Каждая тема собрана в одном месте: объяснение, ключевые слова и следующее упражнение без хаоса.',
  },
  {
    icon: ShieldCheck,
    title: 'Подготовка к ловушкам DGT',
    text: 'Вы не просто учите перевод, а привыкаете к формулировкам и ошибкам, на которых чаще всего срезаются.',
  },
];

const FIRST_15_MINUTES_PLAN = [
  'Открыть следующий урок и быстро понять, о чём будет тема.',
  'Запомнить ключевые термины не по списку, а в дорожном контексте.',
  'Перейти в следующее задание без разрыва: теория, слова и закрепление идут подряд.',
];

export default function LingoPage() {
  const navigate = useNavigate();
  const { isLoading, chapterStates, completedIds, totalXP, completedLessons, totalLessons } =
    useLingoCourse();

  if (isLoading) return <PageSkeleton />;

  const pctDone = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const firstUnlockedChapter = chapterStates[0];
  const flatInteractiveLessons = LINGO_CHAPTERS.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({
      ...lesson,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
    }))
  );
  const nextLesson =
    firstUnlockedChapter
      ? chapterStates
          .map((chapter) => getNextLesson(chapter.id, completedIds))
          .find((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson)) ??
        firstUnlockedChapter.lessons[0]
      : null;
  const highlightedModule = LINGO_NEXT_GEN_MODULES[Math.min(Math.floor((pctDone / 100) * LINGO_NEXT_GEN_MODULES.length), LINGO_NEXT_GEN_MODULES.length - 1)];
  const interactiveChapterMap = new Map(chapterStates.map((chapter) => [chapter.id, chapter]));

  return (
    <div className="min-h-screen bg-[#f6f7f2] pb-24 text-slate-900">
      <div className="relative overflow-hidden border-b border-black/5 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.15),_transparent_32%),linear-gradient(180deg,#fbfcf7_0%,#f5f7f0_100%)] px-4 pt-6 pb-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.03)_50%,rgba(15,23,42,0)_100%)]" />
        <div className="mx-auto max-w-6xl relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur">
            <Sparkles size={12} className="text-amber-500" />
            Испанский для экзамена DGT
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <h1 className="max-w-3xl text-4xl leading-[1.02] font-black tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
                Учите испанские
                <br />
                формулировки DGT так,
                <br />
                чтобы на экзамене не теряться
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Здесь собраны ключевые слова, формулировки и короткие уроки по темам, которые чаще всего встречаются в вопросах DGT. Вы учите не “испанский вообще”, а язык экзамена и дороги.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[28px] border border-black/5 bg-slate-950 px-5 py-5 text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.75)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Терминов</p>
                  <p className="mt-2 text-4xl font-black">{LINGO_VERIFIED_TERM_TOTAL}</p>
                  <p className="mt-1 text-sm text-white/65">по темам экзамена DGT</p>
                </div>
                <div className="rounded-[28px] border border-black/5 bg-white/88 px-5 py-5 shadow-sm backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Модулей</p>
                  <p className="mt-2 text-4xl font-black text-slate-950">{LINGO_NEXT_GEN_MODULES_TOTAL}</p>
                  <p className="mt-1 text-sm text-slate-500">от базовых тем до ловушек DGT</p>
                </div>
                <div className="rounded-[28px] border border-black/5 bg-white/88 px-5 py-5 shadow-sm backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ваш прогресс</p>
                  <p className="mt-2 text-4xl font-black text-slate-950">{pctDone}%</p>
                  <p className="mt-1 text-sm text-slate-500">{completedLessons}/{totalLessons} уроков завершено</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/78 p-4 shadow-sm backdrop-blur">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Zap size={18} />
                  </div>
                  <p className="mt-3 text-2xl font-black">{totalXP}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">XP</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/78 p-4 shadow-sm backdrop-blur">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <Layers3 size={18} />
                  </div>
                  <p className="mt-3 text-2xl font-black">{LINGO_NEXT_GEN_MODULES_TOTAL}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">модулей</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/78 p-4 shadow-sm backdrop-blur">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Brain size={18} />
                  </div>
                  <p className="mt-3 text-2xl font-black">{LINGO_NEXT_GEN_LESSONS_TOTAL}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">уроков</p>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-black/5 bg-white/82 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    Как устроен курс
                  </span>
                  <span className="rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    10 тем
                  </span>
                  <span className="rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    73 больших материала
                  </span>
                  <span className="rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    30 интерактивных уроков
                  </span>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Интерактивный блок `/lingo` нужен для быстрого входа, закрепления терминов и коротких учебных сессий. Полный курс шире: он включает все большие материалы по темам DGT, примеры, заметки, таблицы и словарь терминов.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Интерактив</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{LINGO_NEXT_GEN_LESSONS_TOTAL}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">Коротких уроков для ежедневной практики</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Материалы</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{FULL_COURSE_MATERIAL_TOTAL}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">Полных объяснений, схем и примеров по темам</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Темы</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{FULL_COURSE_TOPIC_TOTAL}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">От дорожных основ до техники и безопасного вождения</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-black/5 bg-white/88 p-5 shadow-sm backdrop-blur lg:sticky lg:top-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Следующий шаг
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {nextLesson ? nextLesson.title : 'Выберите первый урок'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {nextLesson
                      ? 'Начните с ближайшего урока: разберёте тему, увидите ключевые слова и сразу закрепите их в упражнениях.'
                      : 'Откройте первый доступный урок и начните с базовых формулировок экзамена.'}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-100 px-3 py-2 text-right text-emerald-700">
                  <Clock3 size={16} className="ml-auto mb-1" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]">10-15 мин</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {PREMIUM_SESSION_STEPS.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-black/5 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{item.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (nextLesson) navigate(`/lingo/lesson/${nextLesson.id}`);
                }}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-[24px] bg-slate-950 py-4 text-sm font-bold text-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.8)] transition-transform active:scale-[0.98]"
              >
                <Play size={16} className="fill-white" />
                {nextLesson ? 'Начать следующий урок' : 'Открыть курс'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Target size={16} className="text-rose-500" />
              <p className="text-sm font-bold">Что вы получите в этом курсе</p>
            </div>
            <div className="mt-4 grid gap-3">
              {LINGO_EXPERIENCE_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-black/5 bg-slate-50 p-4"
                >
                  <div
                    className={`inline-flex rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white ${pillar.accent}`}
                  >
                    {pillar.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>

          {highlightedModule && (
            <div className={`overflow-hidden rounded-[30px] border border-black/5 bg-gradient-to-br ${highlightedModule.accentFrom} ${highlightedModule.accentTo} p-[1px] shadow-sm`}>
              <div className="rounded-[29px] bg-slate-950/95 p-6 text-white h-full">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Рекомендуемый модуль</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-2xl">{highlightedModule.emoji}</span>
                      <h2 className="text-2xl font-black leading-7">{highlightedModule.title}</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/70">{highlightedModule.subtitle}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                    <p className="text-lg font-black">{highlightedModule.targetTerms}</p>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">слов</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">Что вы сделаете за первые 15 минут</p>
                  <div className="mt-3 space-y-2">
                    {FIRST_15_MINUTES_PLAN.map((item, index) => (
                      <div key={item} className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[10px] font-black text-emerald-300">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-5 text-white/75">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Результат модуля</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">{highlightedModule.outcome}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Единый маршрут
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Полный курс по темам: теория, практика и закрепление
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Ниже уже не просто обзор словаря. Это реальная карта всего курса: сначала открываете материал темы, затем проходите интерактивную практику, если она уже готова для этой темы.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {COURSE_TOPIC_INVENTORY.map((topic) => {
            const chapter = topic.interactiveChapterId
              ? interactiveChapterMap.get(topic.interactiveChapterId)
              : null;
            const practiceLesson = chapter
              ? getNextLesson(chapter.id, completedIds) ?? chapter.lessons[0]
              : null;

            return (
              <motion.div
                key={topic.topicId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: topic.topicNumber * 0.03 }}
                className="rounded-[28px] border border-black/5 bg-white/92 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Тема {topic.topicNumber}
                    </p>
                    <h3 className="mt-2 text-xl font-black leading-7 text-slate-950">
                      {topic.shortTitle}
                    </h3>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white shadow-sm">
                    <p className="text-lg font-black leading-none">{topic.materialCount}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/60">
                      материалов
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Шаг 1. Теория
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {topic.materialCount} больших материала по теме
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Полные объяснения, примеры, таблицы и заметки по теме.
                    </p>
                    <button
                      onClick={() => navigate(`/materials/topic/${topic.topicNumber}`)}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
                    >
                      Открыть тему
                      <ArrowUpRight size={15} />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Шаг 2. Практика
                    </p>
                    {chapter && practiceLesson ? (
                      <>
                        <p className="mt-2 text-sm font-black text-slate-900">
                          {topic.interactiveLessonCount} интерактивных уроков
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          Следующий урок: {practiceLesson.title}
                        </p>
                        <button
                          onClick={() => navigate(`/lingo/lesson/${practiceLesson.id}`)}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
                        >
                          Начать практику
                          <Play size={14} className="fill-current" />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-sm font-black text-slate-900">
                          Интерактивный блок будет следующим этапом
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          Сначала проходите большие материалы темы. После этого сюда добавим отдельную практику.
                        </p>
                        <div className="mt-4 inline-flex items-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-400">
                          Практика в работе
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Интерактивный тренажёр
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              30 коротких уроков для быстрого закрепления терминов
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Этот блок не равен всему курсу. Это отдельный слой практики поверх большого контента.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {LINGO_NEXT_GEN_MODULES.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`overflow-hidden rounded-[28px] border border-black/5 bg-gradient-to-br ${module.accentFrom} ${module.accentTo} p-[1px] shadow-sm`}
            >
              <div className="rounded-[27px] bg-white/92 p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {module.phase}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xl">{module.emoji}</span>
                      <h3 className="text-lg font-black leading-6 text-slate-950">
                        {module.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{module.subtitle}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white shadow-sm">
                    <p className="text-lg font-black leading-none">{module.targetTerms}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/60">
                      слов
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Результат модуля
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-700">{module.outcome}</p>
                </div>

                <div className="mt-4 grid gap-2">
                  {module.lessons.map((lesson, lessonIndex) => (
                    (() => {
                      const absoluteLessonNumber = index * 3 + lessonIndex + 1;
                      const interactiveLesson = flatInteractiveLessons[absoluteLessonNumber - 1];

                      return (
                        <button
                          key={lesson.title}
                          onClick={() => {
                            if (interactiveLesson) {
                              navigate(`/lingo/lesson/${interactiveLesson.id}`);
                            }
                          }}
                          className="flex w-full items-start gap-3 rounded-2xl border border-black/5 bg-white px-3 py-3 text-left transition-colors hover:bg-slate-50 active:scale-[0.99]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                            {absoluteLessonNumber}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{lesson.title}</p>
                                <p className="mt-0.5 text-xs leading-5 text-slate-500">{lesson.focus}</p>
                              </div>
                              {interactiveLesson && (
                                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                  Урок {absoluteLessonNumber}
                                </span>
                              )}
                            </div>
                            {interactiveLesson && (
                              <p className="mt-2 text-xs text-slate-400">
                                Открыть интерактивный урок по теме «{interactiveLesson.title}»
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Выбор темы
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Начинайте с любой главы, которая нужна вам прямо сейчас
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Жёсткой блокировки больше нет. Можно идти по порядку, а можно сразу открыть нужную тему и начать с неё.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-1">
        {chapterStates.map((chapter, chIdx) => {
          const nextLesson = getNextLesson(chapter.id, completedIds);
          const isFullyDone = chapter.doneCount === chapter.lessons.length;
          const colors = getColors(chapter.id);

          return (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: chIdx * 0.07 }}
              className={[
                'rounded-3xl bg-white shadow-sm border border-black/5 overflow-hidden border-t-4',
                colors.border,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Chapter header */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${colors.iconBg}`}>
                      {chapter.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-base text-gray-900">
                        {chapter.title}
                      </p>
                      <p className="text-gray-400 text-xs">
                        Глава {chIdx + 1} · {chapter.lessons.length} уроков
                      </p>
                    </div>
                  </div>
                  {isFullyDone && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle size={18} className="text-emerald-500" />
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={`font-semibold ${colors.text}`}>
                      {chapter.doneCount}/{chapter.lessons.length}
                    </span>
                    <span className="text-gray-400">
                      {Math.round(chapter.progress * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors.progressBg} transition-all duration-700`}
                      style={{ width: `${chapter.progress * 100}%` }}
                    />
                  </div>
                </div>

                {/* CTA button */}
                {!isFullyDone && nextLesson && (
                  <button
                    onClick={() => navigate(`/lingo/lesson/${nextLesson.id}`)}
                    className={`mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm text-white active:scale-[0.97] transition-transform shadow-md ${colors.accent}`}
                  >
                    <Play size={16} className="fill-white" />
                    {chapter.doneCount === 0 ? 'Открыть главу' : 'Продолжить с нужного места'}
                  </button>
                )}

                {isFullyDone && (
                  <button
                    onClick={() => navigate(`/lingo/lesson/${chapter.lessons[0].id}`)}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-3 border-2 border-gray-200 text-gray-500 text-sm font-semibold active:bg-gray-50 transition-colors"
                  >
                    Повторить
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {/* Lessons list */}
              <div className="border-t border-gray-100">
                {chapter.lessons.map((lesson, lIdx) => {
                  const isNext = nextLesson?.id === lesson.id && !lesson.completed;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => navigate(`/lingo/lesson/${lesson.id}`)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50 active:bg-gray-50"
                    >
                        {/* Status icon */}
                        <div
                          className={[
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold',
                            lesson.completed
                              ? 'bg-emerald-100 text-emerald-600'
                              : isNext
                              ? `${colors.accent} text-white shadow-sm`
                              : `${colors.accentBg} ${colors.text}`,
                          ].join(' ')}
                        >
                          {lesson.completed ? (
                            <CheckCircle size={16} />
                          ) : isNext ? (
                            <Play size={14} className="fill-white" />
                          ) : (
                            <span className="text-xs">{lIdx + 1}</span>
                          )}
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={[
                              'font-semibold text-sm',
                              lesson.completed
                                ? 'text-gray-400'
                                : isNext
                                ? 'text-gray-900'
                                : 'text-gray-700',
                            ].join(' ')}
                          >
                            {lesson.emoji} {lesson.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {lesson.completed
                              ? 'Урок уже завершён, можно повторить'
                              : isNext
                              ? 'Лучший следующий шаг'
                              : 'Можно открыть сразу'}
                          </p>
                        </div>

                        {/* Stars */}
                        {lesson.completed && lesson.stars > 0 && (
                          <div className="flex gap-0.5 shrink-0">
                            {[1, 2, 3].map((n) => (
                              <span
                                key={n}
                                className={`text-sm ${n <= lesson.stars ? 'text-yellow-400' : 'text-gray-200'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="h-6" />
    </div>
  );
}
