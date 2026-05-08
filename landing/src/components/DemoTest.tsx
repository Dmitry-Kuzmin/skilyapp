import { useState, useEffect } from "react";
import questionsRaw from "../../../public/demo-questions.json";
import guestRaw from "../../../src/data/guest-questions.json";

/* ── Types ── */
interface DemoOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface DemoQuestion {
  id: string;
  text: string;
  imageUrl?: string;
  explanation: string;
  options: DemoOption[];
  topic?: string;
}

/* ── Normalize both JSON formats ── */
function normalizeGuest(raw: any[]): DemoQuestion[] {
  return raw.map((q) => ({
    id: q.id,
    text: q.question_es,
    imageUrl: q.image_url || undefined,
    explanation: q.explanation_es,
    topic: q.topics?.[0] || undefined,
    options: (q.answer_options || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((o: any) => ({ id: o.id, text: o.text_es, isCorrect: o.is_correct })),
  }));
}

function normalizePub(raw: any[]): DemoQuestion[] {
  return raw.map((q) => ({
    id: q.id,
    text: q.text,
    imageUrl: q.image || undefined,
    explanation: q.explanation,
    topic: q.topic || undefined,
    options: (q.options || []).map((o: any) => ({
      id: o.id,
      text: o.text,
      isCorrect: o.id === q.correctId,
    })),
  }));
}

const QUESTIONS: DemoQuestion[] = (() => {
  const guest = Array.isArray(guestRaw) ? normalizeGuest(guestRaw as any[]) : [];
  const pub = Array.isArray((questionsRaw as any).questions)
    ? normalizePub((questionsRaw as any).questions)
    : [];
  const combined = [...guest, ...pub];
  return combined.slice(0, 30);
})();

/* ── Option button ── */
function OptionButton({
  option,
  selected,
  revealed,
  onClick,
}: {
  option: DemoOption;
  selected: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  let cls =
    "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 ";

  if (!revealed) {
    cls += selected
      ? "border-white bg-white/10 text-white"
      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800";
  } else if (option.isCorrect) {
    cls += "border-emerald-500 bg-emerald-500/15 text-emerald-300";
  } else if (selected && !option.isCorrect) {
    cls += "border-red-500 bg-red-500/15 text-red-300";
  } else {
    cls += "border-zinc-800 bg-zinc-900/50 text-zinc-500";
  }

  return (
    <button className={cls} onClick={onClick} disabled={revealed}>
      {option.text}
    </button>
  );
}

const DEMO_STORAGE_KEY = "skilyapp_demo_results";

function saveToLocalStorage(answers: Array<{ questionId: string; isCorrect: boolean }>) {
  try {
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ answers, completedAt: new Date().toISOString() })
    );
  } catch {}
}

/* ── Results screen ── */
function Results({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  const pct = Math.round((score / total) * 100);
  const passed = pct >= 70;

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className={`text-6xl font-black ${passed ? "text-emerald-400" : "text-red-400"}`}>
        {pct}%
      </div>
      <div>
        <p className="text-xl font-bold text-white mb-1">
          {passed ? "¡Enhorabuena!" : "¡Sigue practicando!"}
        </p>
        <p className="text-zinc-400 text-sm">
          {score} correctas de {total} preguntas
        </p>
      </div>

      {passed ? (
        <p className="text-zinc-300 text-sm max-w-xs">
          Excelente resultado. Tu progreso se guardará al registrarte — continúa con{" "}
          <strong className="text-white">+2000 preguntas reales</strong> con IA y estadísticas.
        </p>
      ) : (
        <p className="text-zinc-300 text-sm max-w-xs">
          Tu progreso se guardará al registrarte. Con Skilyapp tienes{" "}
          <strong className="text-white">tests adaptativos</strong> que refuerzan exactamente lo que necesitas.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <a
          href="/login"
          className="flex-1 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black text-center hover:bg-zinc-100 transition-colors"
        >
          Crear cuenta gratis →
        </a>
        <button
          onClick={onRestart}
          className="flex-1 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
        >
          Repetir test
        </button>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function DemoTest() {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [imgError, setImgError] = useState(false);

  const q = QUESTIONS[idx];
  const total = QUESTIONS.length;

  useEffect(() => {
    setSelected(null);
    setRevealed(false);
    setImgError(false);
  }, [idx]);

  function handleSelect(optId: string) {
    if (revealed) return;
    setSelected(optId);
  }

  function handleConfirm() {
    if (!selected) return;
    const correct = q.options.find((o) => o.isCorrect)?.id;
    if (selected === correct) setScore((s) => s + 1);
    setRevealed(true);
  }

  function handleNext() {
    if (idx + 1 >= total) {
      setFinished(true);
    } else {
      setIdx((i) => i + 1);
    }
  }

  function handleRestart() {
    setIdx(0);
    setScore(0);
    setFinished(false);
    setSelected(null);
    setRevealed(false);
  }

  if (finished) {
    return <Results score={score} total={total} onRestart={handleRestart} />;
  }

  const progress = ((idx + (revealed ? 1 : 0)) / total) * 100;

  return (
    <div className="flex flex-col gap-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
          {idx + 1} / {total}
        </span>
      </div>

      {/* Topic badge */}
      {q.topic && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400">
          {q.topic}
        </span>
      )}

      {/* Question image */}
      {q.imageUrl && !imgError && (
        <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <img
            src={q.imageUrl}
            alt="Imagen de la pregunta"
            className="w-full object-contain max-h-52"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Question text */}
      <p className="text-base font-medium text-white leading-snug">{q.text}</p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {q.options.map((opt) => (
          <OptionButton
            key={opt.id}
            option={opt}
            selected={selected === opt.id}
            revealed={revealed}
            onClick={() => handleSelect(opt.id)}
          />
        ))}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Explicación</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {/* Score indicator */}
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <span className="text-emerald-500 font-semibold">{score}</span>
        <span>/</span>
        <span>{idx + (revealed ? 1 : 0)}</span>
        <span>correctas</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {!revealed ? (
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="flex-1 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex-1 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black hover:bg-zinc-100 transition-colors"
          >
            {idx + 1 >= total ? "Ver resultado" : "Siguiente →"}
          </button>
        )}
      </div>
    </div>
  );
}
