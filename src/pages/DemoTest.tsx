import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { CheckCircle2, XCircle, ChevronRight, Sparkles, Trophy, Target, ArrowRight, X, Gift, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { useModalStore } from "@/store/modalStore";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

type DemoOption = { id: string; text: string };

type DemoQuestion = {
  id: string;
  topic: string;
  topicIcon: string;
  text: string;
  image: string;
  imageBg: string;
  options: DemoOption[];
  correctId: string;
  explanation: string;
};

type AnswerState = "idle" | "correct" | "wrong";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAYWALL_AFTER = 3; // show signup popup after this many answered questions
const DEMO_COINS_KEY = "skily_demo_coins_pending";
const DEMO_DONE_KEY = "skily_demo_completed";

// ─── Registration Paywall Modal ───────────────────────────────────────────────

const PaywallModal = ({
  score,
  total,
  onClose,
  onRegister,
}: {
  score: number;
  total: number;
  onClose: () => void;
  onRegister: () => void;
}) => {
  const accuracy = Math.round((score / total) * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
        >
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/5 pointer-events-none" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>

          <div className="relative p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Gift className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-0.5">
                  Skily IA · Diagnóstico completo
                </p>
                <h2 className="text-xl font-black text-white leading-tight">
                  ¡Muy bien! Ya vas {score}/{PAYWALL_AFTER}
                </h2>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <div className="text-xl font-black text-white">{score}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Correctas</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <div className={cn("text-xl font-black", accuracy >= 66 ? "text-emerald-400" : "text-orange-400")}>
                  {accuracy}%
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Precisión</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center">
                <div className="text-xl font-black text-amber-400">+100</div>
                <div className="text-[10px] text-amber-500/80 uppercase tracking-wider font-bold">Monedas</div>
              </div>
            </div>

            {/* Coins offer */}
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-indigo-500/15 border border-indigo-400/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">
                    Regístrate y recibe <span className="text-amber-400">100 monedas gratis</span>
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Úsalas para activar boosters de XP, retar a dueloss PvP y desbloquear el plan IA personalizado con tus errores de hoy.
                  </p>
                </div>
              </div>
            </div>

            {/* What you unlock */}
            <ul className="space-y-2 mb-6">
              {[
                { icon: "🧠", text: "Plan de estudio personalizado basado en tus fallos" },
                { icon: "⚔️", text: "Duelos PvP en tiempo real contra otros estudiantes" },
                { icon: "🏆", text: "Historial de errores + Challenge Bank automático" },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-base">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={onRegister}
              className="w-full h-14 rounded-2xl bg-white text-slate-900 font-black text-base hover:bg-indigo-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-white/10"
            >
              <Sparkles className="w-5 h-5" />
              Registrarme gratis y reclamar 100 monedas
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full h-10 text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium"
            >
              Continuar sin registrarme →
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Results Screen ───────────────────────────────────────────────────────────

const ResultsScreen = ({
  questions,
  answers,
  onRestart,
  onRegister,
  isAuthenticated,
  coinsAwarded,
}: {
  questions: DemoQuestion[];
  answers: Record<string, string>;
  onRestart: () => void;
  onRegister: () => void;
  isAuthenticated: boolean;
  coinsAwarded: boolean;
}) => {
  const correctCount = questions.filter((q) => answers[q.id] === q.correctId).length;
  const accuracy = Math.round((correctCount / questions.length) * 100);
  const passed = accuracy >= 70;

  const level =
    accuracy >= 85 ? "casi listo 🚀" : accuracy >= 65 ? "nivel intermedio 📈" : "base en construcción 🔨";

  const weakTopic =
    questions
      .filter((q) => answers[q.id] !== q.correctId)
      .map((q) => q.topic)[0] || null;

  const planDays = accuracy >= 85 ? 7 : accuracy >= 65 ? 14 : 21;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto px-4 pb-16 pt-4"
    >
      {/* Score ring */}
      <div className="text-center mb-8">
        <div className="relative w-36 h-36 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90">
            <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/5" />
            <motion.circle
              cx="72" cy="72" r="60"
              stroke={passed ? "#10b981" : "#f97316"}
              strokeWidth="10" fill="transparent"
              strokeDasharray={2 * Math.PI * 60}
              initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - correctCount / questions.length) }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-black", passed ? "text-emerald-400" : "text-orange-400")}>
              {correctCount}/{questions.length}
            </span>
          </div>
        </div>

        <h1 className={cn("text-2xl font-black mb-1", passed ? "text-emerald-400" : "text-orange-400")}>
          {passed ? "¡Buen resultado!" : "Hay que practicar más"}
        </h1>
        <p className="text-slate-400 text-sm">Test de diagnóstico Skily · {questions.length} preguntas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <div className="text-xl font-black text-white">{accuracy}%</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Precisión</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Trophy className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
          <div className="text-xl font-black text-indigo-300">{planDays}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Días plan</div>
        </div>
        <div className={cn("border rounded-2xl p-4 text-center", coinsAwarded ? "bg-amber-500/10 border-amber-500/20" : "bg-white/5 border-white/10")}>
          <Zap className={cn("w-5 h-5 mx-auto mb-1", coinsAwarded ? "text-amber-400" : "text-slate-500")} />
          <div className={cn("text-xl font-black", coinsAwarded ? "text-amber-400" : "text-slate-600")}>
            {coinsAwarded ? "+100" : "100"}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Monedas</div>
        </div>
      </div>

      {/* AI Plan preview */}
      <div className="mb-6 p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-500/15 via-sky-500/10 to-emerald-500/10 border border-indigo-400/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-0.5">Skily IA · Diagnóstico</p>
            <p className="font-black text-white">Tu nivel: <span className="text-indigo-300">{level}</span></p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          {weakTopic && (
            <div className="flex items-center gap-2 text-orange-300">
              <span>⚠️</span>
              <span>Punto débil detectado: <strong>{weakTopic}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Plan personalizado de <strong>{planDays} días</strong> preparado</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {coinsAwarded
                ? "✅ 100 monedas añadidas a tu cuenta"
                : "100 monedas esperándote al registrarte"}
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      {!isAuthenticated ? (
        <>
          <button
            onClick={onRegister}
            className="w-full h-14 rounded-2xl bg-white text-slate-900 font-black text-base hover:bg-indigo-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-white/10 mb-3"
          >
            <Sparkles className="w-5 h-5" />
            Guardar mi plan y reclamar 100 monedas
          </button>
          <button
            onClick={onRestart}
            className="w-full h-11 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
          >
            Repetir test
          </button>
        </>
      ) : (
        <button
          onClick={onRestart}
          className="w-full h-14 rounded-2xl bg-white/10 border border-white/10 text-white font-black text-base hover:bg-white/20 transition-all"
        >
          Repetir test
        </button>
      )}

      {/* Error review */}
      {questions.some((q) => answers[q.id] !== q.correctId) && (
        <div className="mt-8">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Respuestas incorrectas</h3>
          <div className="space-y-3">
            {questions
              .filter((q) => answers[q.id] !== q.correctId)
              .map((q) => {
                const correctOpt = q.options.find((o) => o.id === q.correctId);
                const userOpt = q.options.find((o) => o.id === answers[q.id]);
                return (
                  <div key={q.id} className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
                    <p className="text-sm font-semibold text-white mb-2">{q.text}</p>
                    {userOpt && (
                      <p className="text-xs text-red-400 mb-1">
                        ✗ Tu respuesta: {userOpt.text}
                      </p>
                    )}
                    <p className="text-xs text-emerald-400 mb-2">✓ Correcta: {correctOpt?.text}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{q.explanation}</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const DemoTest = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profileId } = useUserContext();
  const openModal = useModalStore((state) => state.openModal);

  const [questions, setQuestions] = useState<DemoQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [coinsAwarded, setCoinsAwarded] = useState(false);
  const paywallShownRef = useRef(false);

  // Load questions from static JSON
  useEffect(() => {
    fetch("/demo-questions.json")
      .then((r) => r.json())
      .then((d) => {
        setQuestions(d.questions);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Award coins if returning authenticated user who completed demo
  useEffect(() => {
    const awardCoins = async () => {
      if (!isAuthenticated || !profileId) return;
      const pending = localStorage.getItem(DEMO_COINS_KEY);
      if (pending !== "100") return;

      try {
        await supabase.rpc("increment_profile_value", {
          p_profile_id: profileId,
          p_column: "coins",
          p_amount: 100,
        });
        localStorage.removeItem(DEMO_COINS_KEY);
        localStorage.setItem(DEMO_DONE_KEY, "awarded");
        setCoinsAwarded(true);
      } catch (e) {
        console.error("[DemoTest] Failed to award coins:", e);
      }
    };

    awardCoins();
  }, [isAuthenticated, profileId]);

  const handleSelect = useCallback(
    (optionId: string) => {
      if (answerState !== "idle") return;
      const q = questions[currentIndex];
      const correct = optionId === q.correctId;
      setSelectedId(optionId);
      setAnswerState(correct ? "correct" : "wrong");
    },
    [answerState, currentIndex, questions]
  );

  const handleNext = useCallback(() => {
    const q = questions[currentIndex];
    const newAnswers = { ...answers, [q.id]: selectedId! };
    setAnswers(newAnswers);
    setAnswerState("idle");
    setSelectedId(null);

    const answeredCount = Object.keys(newAnswers).length;
    const isLast = currentIndex === questions.length - 1;

    // Show paywall after PAYWALL_AFTER questions for guests
    if (!isAuthenticated && answeredCount === PAYWALL_AFTER && !paywallShownRef.current) {
      paywallShownRef.current = true;
      setShowPaywall(true);
      setCurrentIndex((i) => i + 1);
      return;
    }

    if (isLast) {
      // Mark demo as complete, set coins pending
      localStorage.setItem(DEMO_DONE_KEY, "completed");
      if (!isAuthenticated) {
        localStorage.setItem(DEMO_COINS_KEY, "100");
      }
      setShowResults(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [answers, currentIndex, isAuthenticated, questions, selectedId]);

  const handleRegister = () => {
    setShowPaywall(false);
    openModal("AUTH", { initialStep: "email" });
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers({});
    setAnswerState("idle");
    setSelectedId(null);
    setShowResults(false);
    paywallShownRef.current = false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080f1e] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#080f1e] flex items-center justify-center text-slate-400">
        Error al cargar las preguntas
      </div>
    );
  }

  const q = questions[currentIndex];
  const totalAnswered = Object.keys(answers).length;
  const correctSoFar = Object.entries(answers).filter(([qId, aId]) => {
    const question = questions.find((x) => x.id === qId);
    return question?.correctId === aId;
  }).length;

  return (
    <div className="min-h-screen bg-[#080f1e] text-white" style={{ fontFamily: "var(--font-sans, sans-serif)" }}>
      {/* Paywall */}
      {showPaywall && (
        <PaywallModal
          score={correctSoFar}
          total={PAYWALL_AFTER}
          onClose={() => setShowPaywall(false)}
          onRegister={handleRegister}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#080f1e]/90 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-black text-white text-xs shadow-lg">
              S
            </div>
            <span className="font-black text-white hidden sm:block">Skily</span>
          </button>

          {!showResults && (
            <div className="flex items-center gap-3">
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {questions.map((_, i) => {
                  const qDone = answers[questions[i].id];
                  const isCurrent = i === currentIndex && !showResults;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        isCurrent
                          ? "w-5 h-2 bg-indigo-400"
                          : qDone
                          ? qDone === questions[i].correctId
                            ? "w-2 h-2 bg-emerald-500"
                            : "w-2 h-2 bg-red-500"
                          : "w-2 h-2 bg-white/10"
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-slate-500 font-medium tabular-nums">
                {currentIndex + 1}/{questions.length}
              </span>
            </div>
          )}

          {!isAuthenticated && (
            <button
              onClick={() => openModal("AUTH", { initialStep: "email" })}
              className="text-xs font-bold text-indigo-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
            >
              Entrar
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {showResults ? (
        <ResultsScreen
          questions={questions}
          answers={answers}
          onRestart={handleRestart}
          onRegister={handleRegister}
          isAuthenticated={isAuthenticated}
          coinsAwarded={coinsAwarded}
        />
      ) : (
        /* Question Screen */
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="max-w-lg mx-auto px-4 pt-4 pb-16"
          >
            {/* Topic badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <span>{q.topicIcon}</span>
                {q.topic}
              </span>
            </div>

            {/* Question image */}
            <div
              className="w-full mb-4 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: q.imageBg, minHeight: 180 }}
            >
              <img
                src={q.image}
                alt={q.topic}
                className="max-h-52 w-full object-contain p-4"
                loading="eager"
              />
            </div>

            {/* Question text */}
            <h2 className="text-lg font-bold text-white mb-5 leading-snug px-1">
              {q.text}
            </h2>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {q.options.map((opt) => {
                const isSelected = selectedId === opt.id;
                const isCorrect = opt.id === q.correctId;
                const showFeedback = answerState !== "idle";

                return (
                  <motion.button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    whileTap={answerState === "idle" ? { scale: 0.98 } : undefined}
                    disabled={answerState !== "idle"}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3",
                      !showFeedback && "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer",
                      showFeedback && isCorrect && "bg-emerald-500/15 border-emerald-500/40 text-emerald-100",
                      showFeedback && isSelected && !isCorrect && "bg-red-500/15 border-red-500/40 text-red-100",
                      showFeedback && !isSelected && !isCorrect && "opacity-40 bg-white/3 border-white/5"
                    )}
                  >
                    <span className="text-sm font-medium leading-relaxed flex-1">{opt.text}</span>
                    {showFeedback && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {answerState !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "mb-5 p-4 rounded-2xl border",
                    answerState === "correct"
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-red-500/10 border-red-500/20"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {answerState === "correct" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-black uppercase tracking-wider",
                        answerState === "correct" ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {answerState === "correct" ? "¡Correcto!" : "Incorrecto"}
                    </span>

                    {/* After 3rd answered question, tease the AI explanation for guests */}
                    {!isAuthenticated && totalAnswered >= PAYWALL_AFTER && (
                      <span className="ml-auto text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        ✦ Skily IA
                      </span>
                    )}
                  </div>

                  {/* Show explanation freely for first 3, lock for guests after */}
                  {(!isAuthenticated && totalAnswered >= PAYWALL_AFTER) ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 italic">
                        Regístrate para ver las explicaciones detalladas de la IA...
                      </p>
                      <button
                        onClick={handleRegister}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline-offset-2 underline"
                      >
                        Crear cuenta gratis →
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300 leading-relaxed">{q.explanation}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button */}
            {answerState !== "idle" && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNext}
                className="w-full h-14 rounded-2xl bg-white text-slate-900 font-black text-base hover:bg-indigo-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-white/10"
              >
                {currentIndex === questions.length - 1 ? (
                  <>Ver resultados <Trophy className="w-5 h-5" /></>
                ) : (
                  <>Siguiente pregunta <ChevronRight className="w-5 h-5" /></>
                )}
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default DemoTest;
