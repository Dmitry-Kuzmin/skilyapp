import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star, Loader2, ImagePlus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LessonCallout, LessonTable, LessonList, LessonCardGrid, LessonStats,
  type CalloutVariant, type ListStyle,
} from "@/components/lesson/LessonKit";

const DEVImagePicker = import.meta.env.DEV
  ? lazy(() => import("@/components/dev/DEVImagePicker").then(m => ({ default: m.DEVImagePicker })))
  : null;

const V = "http://localhost:3030";

// ── Content blocks ────────────────────────────────────────────────────────────
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; url: string }
  | { type: "heading"; text: string }
  | { type: "callout"; variant?: CalloutVariant; title?: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][]; caption?: string }
  | { type: "list"; style?: ListStyle; title?: string; items: string[] }
  | { type: "card-grid"; cols?: 2 | 3; cards: { icon?: string; title: string; description: string; badge?: string }[] }
  | { type: "stats"; stats: { value: string; label: string; note?: string }[] };

function normalizeToBlocks(content: Record<string, any>): ContentBlock[] {
  if (Array.isArray(content.blocks)) return content.blocks;
  const blocks: ContentBlock[] = [];
  if (content.image_url) blocks.push({ type: "image", url: content.image_url });
  if (content.text) blocks.push({ type: "text", text: content.text });
  return blocks;
}

function injectImageIntoContent(
  content: Record<string, any>,
  url: string,
  insertAt: number
): Record<string, any> {
  const blocks = [...normalizeToBlocks(content)];
  blocks.splice(insertAt, 0, { type: "image", url });
  const { text: _t, image_url: _i, ...rest } = content;
  return { ...rest, blocks };
}

function replaceImageInContent(
  content: Record<string, any>,
  url: string,
  blockIdx: number
): Record<string, any> {
  const blocks = normalizeToBlocks(content).map((b, i) =>
    i === blockIdx ? { type: "image" as const, url } : b
  );
  const { text: _t, image_url: _i, ...rest } = content;
  return { ...rest, blocks };
}

const MAX_HEARTS = 3;

interface Step {
  id: string;
  lesson_id: string;
  order_index: number;
  type: "theory" | "quiz" | "flashcard";
  content_es: Record<string, any>;
  content_ru: Record<string, any>;
}

interface Lesson {
  id: string;
  code: string;
  title_es: string;
  title_ru: string;
  xp_reward: number;
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({
  current, total, hearts, onClose,
}: { current: number; total: number; hearts: number; onClose: () => void }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="w-full border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur flex-shrink-0">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <button
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>
        <div className="flex-1">
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1.5">
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <Heart key={i} size={16}
              className={i < hearts ? "text-red-500 fill-red-500" : "text-gray-200 fill-gray-200"} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DEV: Insert image button between blocks ───────────────────────────────────
function InsertImageBtn({ onClick }: { onClick: () => void }) {
  if (!import.meta.env.DEV) return null;
  return (
    <button
      onClick={onClick}
      className="w-full py-1.5 flex items-center justify-center gap-1.5 text-violet-400 hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-all"
    >
      <Plus className="w-3.5 h-3.5" />
      <span className="text-[11px] font-semibold">вставить картинку</span>
    </button>
  );
}

// ── Theory card ───────────────────────────────────────────────────────────────
function TheoryCard({
  step, code, title, onContinue, onStepUpdated, onBack,
}: {
  step: Step;
  code: string;
  title: string;
  onContinue: () => void;
  onStepUpdated: (updated: Step) => void;
  onBack?: () => void;
}) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const content = isEs ? step.content_es : step.content_ru;

  // Always work with blocks internally
  const blocks = normalizeToBlocks(content);

  // pending picker: null = closed, number = insert-at index (for new), {replace: blockIdx} = replace
  const [picker, setPicker] = useState<null | number | { replace: number }>(null);
  const [saving, setSaving] = useState(false);

  const handleImageSelected = async (url: string) => {
    if (picker === null) return;
    setSaving(true);
    try {
      const isReplace = typeof picker === "object";
      const blockIdx = isReplace ? picker.replace : picker as number;

      const newEs = isReplace
        ? replaceImageInContent(step.content_es, url, blockIdx)
        : injectImageIntoContent(step.content_es, url, blockIdx);
      const newRu = isReplace
        ? replaceImageInContent(step.content_ru, url, blockIdx)
        : injectImageIntoContent(step.content_ru, url, blockIdx);

      await fetch(`${V}/api/course/step/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: step.id,
          lesson_id: step.lesson_id,
          order_index: step.order_index,
          type: step.type,
          content_es: newEs,
          content_ru: newRu,
        }),
      });

      onStepUpdated({ ...step, content_es: newEs, content_ru: newRu });
    } catch (e: any) { alert("Ошибка: " + e.message); }
    setSaving(false);
    setPicker(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col gap-5 w-full max-w-xl mx-auto"
      >
        {/* Card */}
        <div className="w-full rounded-3xl border-2 border-teal-200 bg-white shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-5 text-center">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">{code}</p>
            <p className="text-white text-lg font-black leading-snug">{title}</p>
          </div>

          {/* Blocks */}
          <div className="group">
            {/* Insert before first block */}
            {import.meta.env.DEV && (
              <InsertImageBtn onClick={() => setPicker(0)} />
            )}

            {blocks.map((block, i) => (
              <div key={i}>
                {/* Block content */}
                {block.type === "image" && (
                  <div className="relative group/img">
                    <img src={block.url} alt="" className="w-full aspect-video object-cover" />
                    {import.meta.env.DEV && (
                      <button
                        onClick={() => setPicker({ replace: i })}
                        className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100"
                      >
                        <span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <ImagePlus className="w-3.5 h-3.5" />Заменить
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {block.type === "text" && (
                  <div className="px-5 py-4">
                    <MarkdownBody text={block.text} />
                  </div>
                )}

                {block.type === "heading" && (
                  <div className="px-5 pt-4 pb-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-600">{block.text}</p>
                  </div>
                )}

                {block.type === "callout" && (
                  <LessonCallout variant={block.variant} title={block.title} text={block.text} />
                )}

                {block.type === "table" && (
                  <LessonTable headers={block.headers} rows={block.rows} caption={block.caption} />
                )}

                {block.type === "list" && (
                  <LessonList style={block.style} title={block.title} items={block.items} />
                )}

                {block.type === "card-grid" && (
                  <LessonCardGrid cards={block.cards} cols={block.cols} />
                )}

                {block.type === "stats" && (
                  <LessonStats stats={block.stats} />
                )}

                {/* Insert after each block */}
                {import.meta.env.DEV && (
                  <InsertImageBtn onClick={() => setPicker(i + 1)} />
                )}
              </div>
            ))}

            {/* Empty state: no image yet */}
            {blocks.every(b => b.type !== "image") && import.meta.env.DEV && (
              <button
                onClick={() => setPicker(0)}
                className="w-full h-24 border-2 border-dashed border-violet-300 bg-violet-50 hover:bg-violet-100 transition-colors flex flex-col items-center justify-center gap-1.5 text-violet-500"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs font-semibold">Добавить картинку</span>
              </button>
            )}
          </div>
        </div>

        <div className={cn("flex gap-3", onBack ? "flex-row" : "flex-col")}>
          {onBack && (
            <button
              onClick={onBack}
              className="flex-shrink-0 w-14 bg-gray-100 text-gray-500 font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform hover:bg-gray-200"
            >
              ←
            </button>
          )}
          <button
            onClick={onContinue}
            className="flex-1 bg-teal-500 text-white font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform shadow-md shadow-teal-200"
          >
            Понятно! Дальше →
          </button>
        </div>
      </motion.div>

      {/* DEV Image Picker */}
      <AnimatePresence>
        {picker !== null && DEVImagePicker && (
          <Suspense fallback={null}>
            <DEVImagePicker
              onSaved={handleImageSelected}
              onClose={() => setPicker(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {saving && (
        <div className="fixed inset-0 bg-black/20 z-[9000] flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
            <span className="text-sm font-semibold text-gray-700">Сохраняю...</span>
          </div>
        </div>
      )}
    </>
  );
}

// ── Quiz card ─────────────────────────────────────────────────────────────────
function QuizCard({
  content, onAnswer,
}: { content: Record<string, any>; onAnswer: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    onAnswer(i === content.correct);
  };

  const variant = (i: number) => {
    if (selected === null) return "idle";
    if (i === content.correct) return "correct";
    if (i === selected) return "wrong";
    return "dim";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex flex-col gap-5 w-full max-w-sm mx-auto"
    >
      {/* Question */}
      <div className="rounded-3xl border-2 border-blue-100 bg-white shadow-sm overflow-hidden text-center">
        {content.image_url && (
          <img
            src={content.image_url}
            alt=""
            className="w-full aspect-video object-cover"
          />
        )}
        <p className="text-gray-800 text-lg font-black leading-snug px-6 py-5">{content.text}</p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {(content.options as string[]).map((opt, i) => {
          const v = variant(i);
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => pick(i)}
              className={cn(
                "relative overflow-hidden w-full text-left rounded-2xl px-5 py-4 border-2 font-semibold text-sm transition-colors duration-150 flex items-center gap-3",
                v === "idle" && "border-gray-200 bg-white text-gray-800 active:bg-gray-50",
                v === "correct" && "border-emerald-400 bg-emerald-50 text-emerald-800",
                v === "wrong" && "border-red-400 bg-red-50 text-red-700",
                v === "dim" && "border-gray-100 bg-gray-50 text-gray-400",
              )}
            >
              <span className={cn(
                "relative w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0",
                v === "idle" && "border-gray-300 text-gray-500",
                v === "correct" && "border-emerald-500 bg-emerald-500 text-white",
                v === "wrong" && "border-red-400 bg-red-400 text-white",
                v === "dim" && "border-gray-200 text-gray-300",
              )}>
                {String.fromCharCode(65 + i)}
                {(v === "correct" || v === "wrong") && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(v === "correct" ? 8 : 5)].map((_, j) => (
                      <motion.div
                        key={j}
                        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                        animate={{
                          scale: [0, 1.2, 0],
                          x: (Math.cos((j / (v === "correct" ? 8 : 5)) * Math.PI * 2) * (30 + Math.random() * 20)),
                          y: (Math.sin((j / (v === "correct" ? 8 : 5)) * Math.PI * 2) * (30 + Math.random() * 20)),
                          opacity: [1, 1, 0],
                        }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        className={cn(
                          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                          v === "correct" ? "w-2 h-2 bg-emerald-300" : "w-1.5 h-1.5 bg-red-300",
                        )}
                      />
                    ))}
                  </div>
                )}
              </span>
              {opt}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Completed screen ──────────────────────────────────────────────────────────
function CompletedScreen({ xp, mistakes, onBack }: { xp: number; mistakes: number; onBack: () => void }) {
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0fdf4_0%,#ecfdf5_100%)] flex flex-col items-center justify-center px-6 gap-8">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.15, type: "spring", stiffness: 300 }}
          >
            <Star size={40} className={i < stars ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center space-y-2"
      >
        <h2 className="text-3xl font-black text-gray-900">
          {mistakes === 0 ? "¡Perfecto! 🎉" : "¡Lección completada!"}
        </h2>
        <p className="text-gray-500 text-sm">
          {mistakes === 0 ? "Sin ningún error" : `${mistakes} error${mistakes > 1 ? "es" : ""}`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55 }}
        className="flex gap-6"
      >
        <div className="text-center">
          <p className="text-3xl font-black text-emerald-600">+{xp}</p>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1">XP</p>
        </div>
        <div className="w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-3xl font-black text-amber-500">{stars}</p>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1">Estrellas</p>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={onBack}
        className="w-full max-w-xs rounded-2xl bg-emerald-500 text-white font-bold py-4 text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
      >
        Volver al módulo
      </motion.button>
    </div>
  );
}

// ── Bottom feedback sheet ─────────────────────────────────────────────────────
function FeedbackSheet({
  correct, explanation, onNext,
}: { correct: boolean; explanation?: string; onNext: () => void }) {
  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/10 z-40"
        onClick={onNext}
      />
      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl",
          correct
            ? "bg-[linear-gradient(180deg,#f3fff8_0%,#ecfdf3_100%)]"
            : "bg-[linear-gradient(180deg,#fff7f7_0%,#fef2f2_100%)]"
        )}
      >
        <div className="mx-auto max-w-sm">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-black",
              correct ? "bg-emerald-500" : "bg-red-400"
            )}>
              {correct ? "✓" : "✗"}
            </div>
            <div>
              <p className={cn("font-black text-lg", correct ? "text-emerald-700" : "text-red-600")}>
                {correct ? "¡Correcto!" : "Incorrecto"}
              </p>
              <p className={cn("text-sm", correct ? "text-emerald-600/70" : "text-red-500/70")}>
                {correct ? "Muy bien" : "No pasa nada"}
              </p>
            </div>
          </div>

          {/* Explanation */}
          {explanation && (
            <div className={cn(
              "rounded-2xl border px-4 py-3 mb-5 text-sm leading-relaxed",
              correct ? "border-emerald-200 bg-white/80 text-gray-700" : "border-red-200 bg-white/75 text-gray-700"
            )}>
              {explanation}
            </div>
          )}

          <button
            onClick={onNext}
            className={cn(
              "w-full rounded-2xl py-4 font-bold text-white text-base active:scale-[0.97] transition-transform shadow-lg",
              correct ? "bg-emerald-500 shadow-emerald-200" : "bg-red-400 shadow-red-200"
            )}
          >
            Continuar
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderInline(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
    seg.startsWith("**") && seg.endsWith("**")
      ? <strong key={j} className="text-gray-900">{seg.slice(2, -2)}</strong>
      : seg
  );
}

function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-gray-700">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.trim() === "---") return <hr key={i} className="border-gray-100 my-2" />;

        // Bullet: "• text" or "- text"
        const bulletMatch = line.match(/^([•\-])\s+(.*)/s);
        if (bulletMatch) {
          return (
            <p key={i} className="flex gap-2 items-start">
              <span className="shrink-0 mt-0.5">{bulletMatch[1] === "-" ? "–" : "•"}</span>
              <span className="min-w-0 break-words">{renderInline(bulletMatch[2])}</span>
            </p>
          );
        }

        return <p key={i} className="break-words">{renderInline(line)}</p>;
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LessonPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  const [idx, setIdx] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);
  const [pendingCorrect, setPendingCorrect] = useState<boolean | null>(null);

  type QuestionData = {
    text_es: string; text_ru: string;
    image_url?: string;
    options_es: string[]; options_ru: string[];
    correct: number;
  };
  const [questionData, setQuestionData] = useState<Record<string, QuestionData>>({});

  useEffect(() => {
    if (!lessonId) return;
    (async () => {
      const supabase = await getSupabaseClient();
      const [lr, sr] = await Promise.all([
        supabase.from("course_lessons").select("*").eq("id", lessonId).single(),
        supabase.from("lesson_steps").select("*").eq("lesson_id", lessonId).order("order_index"),
      ]);
      if (lr.data) setLesson(lr.data);
      const stepList: Step[] = sr.data ?? [];
      setSteps(stepList);

      // Resolve question_id references for quiz steps
      const refs = stepList
        .filter(s => s.type === "quiz" && s.content_es?.question_id)
        .map(s => ({ stepId: s.id, questionId: s.content_es.question_id as string }));

      if (refs.length > 0) {
        const ids = refs.map(r => r.questionId);
        const [{ data: qs }, { data: opts }] = await Promise.all([
          supabase.from("questions_new").select("id, question_es, question_ru, image_url").in("id", ids),
          supabase.from("answer_options")
            .select("question_id, text_es, text_ru, is_correct, position")
            .in("question_id", ids)
            .order("position"),
        ]);
        const map: Record<string, QuestionData> = {};
        for (const ref of refs) {
          const q = qs?.find(q => q.id === ref.questionId);
          const o = (opts ?? [])
            .filter(o => o.question_id === ref.questionId)
            .sort((a, b) => a.position - b.position);
          if (q && o.length) {
            map[ref.stepId] = {
              text_es: q.question_es ?? "",
              text_ru: q.question_ru ?? "",
              image_url: q.image_url ?? undefined,
              options_es: o.map(o => o.text_es ?? ""),
              options_ru: o.map(o => o.text_ru ?? ""),
              correct: o.findIndex(o => o.is_correct),
            };
          }
        }
        setQuestionData(map);
      }

      setLoading(false);
    })();
  }, [lessonId]);

  const step = steps[idx];

  const resolveStepContent = (s: Step) => {
    if (s.type === "quiz" && s.content_es?.question_id && questionData[s.id]) {
      const q = questionData[s.id];
      return {
        text: isEs ? q.text_es : q.text_ru,
        image_url: q.image_url,
        options: isEs ? q.options_es : q.options_ru,
        correct: q.correct,
        explanation: isEs ? s.content_es?.explanation : s.content_ru?.explanation,
      };
    }
    return isEs ? s.content_es : s.content_ru;
  };

  const content = step ? resolveStepContent(step) : null;
  const title = lesson ? (isEs ? lesson.title_es : lesson.title_ru) : "";

  const advance = useCallback(() => {
    setPendingCorrect(null);
    if (idx + 1 >= steps.length) setDone(true);
    else setIdx(i => i + 1);
  }, [idx, steps.length]);

  const goBack = useCallback(() => {
    if (idx > 0) setIdx(i => i - 1);
  }, [idx]);

  const handleAnswer = useCallback((correct: boolean) => {
    if (!correct) {
      setHearts(h => Math.max(0, h - 1));
      setMistakes(m => m + 1);
    }
    if (step.type === "theory") {
      advance();
    } else {
      setPendingCorrect(correct);
    }
  }, [step, advance]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!lesson || steps.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-gray-500 text-sm">Урок не найден</p>
        <button onClick={() => navigate(-1)} className="text-teal-500 text-sm font-semibold">← Назад</button>
      </div>
    );
  }

  if (done) {
    return <CompletedScreen xp={lesson.xp_reward} mistakes={mistakes} onBack={() => navigate(-1)} />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fdf9_0%,#f1f8f4_100%)] flex flex-col">
      <ProgressBar
        current={idx}
        total={steps.length}
        hearts={hearts}
        onClose={() => navigate(-1)}
      />

      {/* Exercise area */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          {step.type === "theory" && (
            <TheoryCard
              key={`theory-${idx}`}
              step={step}
              code={lesson.code}
              title={title}
              onContinue={() => handleAnswer(true)}
              onStepUpdated={(updated) => {
                setSteps(prev => prev.map((s, i) => i === idx ? updated : s));
              }}
              onBack={idx > 0 ? goBack : undefined}
            />
          )}
          {step.type === "quiz" && (
            <QuizCard
              key={`quiz-${idx}`}
              content={content!}
              onAnswer={handleAnswer}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Step counter pill */}
      <div className="pb-6 text-center flex-shrink-0">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-2 shadow-sm">
          <p className="text-gray-400 text-xs font-medium">{idx + 1} / {steps.length}</p>
          <span className="h-1 w-1 rounded-full bg-gray-300" />
          <p className="text-xs font-medium text-gray-500">
            {idx + 1 < steps.length
              ? `${steps.length - idx - 1} más`
              : "último paso"}
          </p>
        </div>
      </div>

      {/* Bottom feedback sheet */}
      <AnimatePresence>
        {pendingCorrect !== null && (
          <FeedbackSheet
            key="feedback"
            correct={pendingCorrect}
            explanation={content?.explanation}
            onNext={advance}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
