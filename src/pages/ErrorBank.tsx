import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Clock, BookOpen, Play, ChevronDown, Check } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePDDContext } from "@/contexts/PDDContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getImageUrl } from "@/utils/imageUtils";

type ErrorQuestion = {
  id: string;
  question_id: string;
  times_wrong: number;
  correct_streak: number;
  last_wrong_at: string;
  mastered: boolean;
  question_es: string;
  question_ru: string;
  image_url: string | null;
  topic_title_es: string | null;
  topic_title_ru: string | null;
};

type Preset = "hardest" | "recent" | "topic";
const STREAK_TO_MASTER = 2;
const COUNT_OPTIONS = [10, 20, 50] as const;

const heatLevel = (n: number) => (n >= 5 ? 3 : n >= 3 ? 2 : 1);

const HeatBadge = ({ times }: { times: number }) => {
  const level = heatLevel(times);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: level }).map((_, i) => (
        <Flame key={i} className="w-3 h-3 text-orange-500 fill-orange-400" />
      ))}
      {level < 3 && Array.from({ length: 3 - level }).map((_, i) => (
        <Flame key={i} className="w-3 h-3 text-muted-foreground/20" />
      ))}
      <span className="text-[10px] font-bold text-orange-500 ml-1 tabular-nums">×{times}</span>
    </div>
  );
};

const StreakDots = ({ streak }: { streak: number }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: STREAK_TO_MASTER }).map((_, i) => (
      <div key={i} className={cn(
        "w-2 h-2 rounded-full transition-colors",
        i < streak ? "bg-emerald-500" : "bg-muted-foreground/20"
      )} />
    ))}
    <span className="text-[10px] text-muted-foreground ml-1">{streak}/{STREAK_TO_MASTER}</span>
  </div>
);

const ErrorCard = ({ q, language }: { q: ErrorQuestion; language: string }) => {
  const text = language === "ru" ? q.question_ru : q.question_es;
  const topic = language === "ru" ? q.topic_title_ru : q.topic_title_es;
  const imgSrc = q.image_url ? getImageUrl(q.image_url) : null;

  return (
    <div className={cn(
      "flex flex-col rounded-[1.5rem] border bg-background overflow-hidden transition-all",
      q.correct_streak > 0 ? "border-emerald-500/20" : "border-border/60"
    )}>
      {imgSrc && (
        <div className="w-full h-36 overflow-hidden bg-muted shrink-0">
          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {topic && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 truncate">{topic}</span>
        )}
        <p className="text-sm font-medium text-foreground leading-snug flex-1 line-clamp-4">{text}</p>
        <div className="flex items-center justify-between mt-auto">
          <HeatBadge times={q.times_wrong} />
          <StreakDots streak={q.correct_streak} />
        </div>
      </div>
    </div>
  );
};

export default function ErrorBank() {
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const { selectedCountry, selectedCategory } = usePDDContext();
  const { language } = useLanguage();

  const [questions, setQuestions] = useState<ErrorQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("hardest");
  const [count, setCount] = useState<number>(20);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);

  const dbCountry = selectedCountry === "russia" ? "russia" : "es";

  useEffect(() => {
    if (!profileId) return;
    loadErrors();
  }, [profileId, selectedCountry, selectedCategory]);

  const loadErrors = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("user_challenge_questions")
        .select(`
          question_id,
          times_wrong,
          correct_streak,
          last_wrong_at,
          mastered,
          questions_new!inner (
            id,
            question_es,
            question_ru,
            image_url,
            country,
            topics ( title_es, title_ru )
          )
        `)
        .eq("user_id", profileId)
        .eq("mastered", false)
        .eq("questions_new.country", dbCountry)
        .limit(200);

      if (error) throw error;

      const mapped: ErrorQuestion[] = (data || []).map((r: any) => ({
        id: r.questions_new.id,
        question_id: r.question_id,
        times_wrong: r.times_wrong || 1,
        correct_streak: r.correct_streak || 0,
        last_wrong_at: r.last_wrong_at,
        mastered: r.mastered,
        question_es: r.questions_new.question_es,
        question_ru: r.questions_new.question_ru,
        image_url: r.questions_new.image_url,
        topic_title_es: r.questions_new.topics?.title_es || null,
        topic_title_ru: r.questions_new.topics?.title_ru || null,
      }));

      setQuestions(mapped);
    } catch (e) {
      console.error("ErrorBank load error", e);
    } finally {
      setLoading(false);
    }
  };

  const topics = useMemo(() => {
    const seen = new Set<string>();
    const list: { key: string; label: string }[] = [];
    for (const q of questions) {
      const label = language === "ru" ? q.topic_title_ru : q.topic_title_es;
      if (label && !seen.has(label)) {
        seen.add(label);
        list.push({ key: label, label });
      }
    }
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [questions, language]);

  const sorted = useMemo(() => {
    let base = [...questions];
    if (preset === "hardest") base.sort((a, b) => b.times_wrong - a.times_wrong);
    else if (preset === "recent") base.sort((a, b) => new Date(b.last_wrong_at).getTime() - new Date(a.last_wrong_at).getTime());
    else if (preset === "topic" && topicFilter) {
      base = base.filter(q =>
        (language === "ru" ? q.topic_title_ru : q.topic_title_es) === topicFilter
      );
    }
    return base;
  }, [questions, preset, topicFilter, language]);

  const sessionCount = Math.min(count, sorted.length);
  const countLabel = language === "ru" ? "вопр." : "preg.";

  const handleStart = (sortKey: 'hardest' | 'recent') => {
    navigate(
      `/test/challenge-bank?count=${sessionCount}&sort=${sortKey}&category=${selectedCategory}${selectedCountry === "russia" ? "&country=russia" : ""}`
    );
  };

  const l = (ru: string, es: string, en: string) =>
    language === "ru" ? ru : language === "es" ? es : en;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
          <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-52 bg-muted rounded-[1.5rem] animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold">{l("Ошибок нет!", "¡Sin errores!", "No errors!")}</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            {l("Все вопросы освоены. Проходи тесты чтобы наполнить банк.", "Has dominado todo. Haz más tests para llenar el banco.", "All mastered. Take more tests to fill the bank.")}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 py-8 pb-28 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Flame className="w-7 h-7 text-orange-500 fill-orange-400" />
              {l("Banco de Errores", "Banco de Errores", "Error Bank")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {l(
                `${questions.length} вопросов ждут искупления`,
                `${questions.length} preguntas esperan redención`,
                `${questions.length} questions awaiting redemption`
              )}
            </p>
          </div>

          {/* Count selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">{l("Вопросов в сессии:", "Preguntas por sesión:", "Questions per session:")}</span>
            <div className="flex gap-1.5">
              {COUNT_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    count === n ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preset tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setPreset("hardest"); setTopicFilter(null); }}
            className={cn(
              "flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border transition-all",
              preset === "hardest"
                ? "bg-orange-500/10 border-orange-500/30 text-orange-600"
                : "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted"
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            {l("Сложнее всего", "Más difíciles", "Hardest")}
          </button>

          <button
            onClick={() => { setPreset("recent"); setTopicFilter(null); }}
            className={cn(
              "flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border transition-all",
              preset === "recent"
                ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                : "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {l("Недавние", "Recientes", "Recent")}
          </button>

          {/* Topic dropdown */}
          <div className="relative">
            <button
              onClick={() => setTopicMenuOpen(v => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border transition-all",
                preset === "topic"
                  ? "bg-violet-500/10 border-violet-500/30 text-violet-600"
                  : "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted"
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {preset === "topic" && topicFilter
                ? <span className="max-w-[120px] truncate">{topicFilter}</span>
                : l("По теме", "Por tema", "By topic")}
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {topicMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-10 left-0 z-50 w-64 max-h-64 overflow-y-auto rounded-2xl border border-border bg-background shadow-xl"
                >
                  {topics.map(t => (
                    <button
                      key={t.key}
                      onClick={() => { setPreset("topic"); setTopicFilter(t.key); setTopicMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-muted/60 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      {t.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((q, i) => (
            <motion.div
              key={q.question_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.2 }}
            >
              <ErrorCard q={q} language={language} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 sm:bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none px-4">
        <button
          onClick={() => handleStart(preset === "recent" ? "recent" : "hardest")}
          className="pointer-events-auto flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 font-bold text-sm"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>
            {l(
              `Искупить ${sessionCount} ${countLabel}`,
              `Redimir ${sessionCount} ${countLabel}`,
              `Redeem ${sessionCount} ${countLabel}`
            )}
          </span>
          {preset === "hardest" && <Flame className="w-4 h-4 fill-orange-300 text-orange-300" />}
          {preset === "recent" && <Clock className="w-4 h-4 opacity-70" />}
          {preset === "topic" && <BookOpen className="w-4 h-4 opacity-70" />}
        </button>
      </div>
    </Layout>
  );
}
