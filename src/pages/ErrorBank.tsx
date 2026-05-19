import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Clock, BookOpen, Play, ChevronDown, Check, Crown, Lock } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePDDContext } from "@/contexts/PDDContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePremium } from "@/hooks/usePremium";
import { useModalStore } from "@/store/modalStore";
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
const FREE_SESSION_MAX = 10;
const COUNT_OPTIONS_FREE = [10] as const;
const COUNT_OPTIONS_PREMIUM = [10, 20, 50] as const;
const PAGE_SIZE = 24; // 6 rows × 4 cols


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
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40 gap-2">
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0",
            q.times_wrong >= 5 ? "text-red-500 bg-red-500/10" :
            q.times_wrong >= 3 ? "text-orange-500 bg-orange-500/10" :
            "text-amber-500 bg-amber-500/10"
          )}>
            {q.times_wrong === 1
              ? (language === "ru" ? "Ошибка 1 раз" : language === "es" ? "Fallado 1 vez" : "Failed 1×")
              : (language === "ru" ? `Ошибок: ${q.times_wrong}` : language === "es" ? `Fallado ${q.times_wrong}×` : `Failed ${q.times_wrong}×`)
            }
          </span>
          <div className="flex items-center gap-1 min-w-0">
            {Array.from({ length: STREAK_TO_MASTER }).map((_, i) => (
              <div key={i} className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                i < q.correct_streak ? "bg-emerald-500" : "bg-muted-foreground/20"
              )} />
            ))}
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {language === "ru"
                ? `${q.correct_streak}/${STREAK_TO_MASTER} к усвоению`
                : language === "es"
                  ? `${q.correct_streak}/${STREAK_TO_MASTER} para dominar`
                  : `${q.correct_streak}/${STREAK_TO_MASTER} to master`
              }
            </span>
          </div>
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
  const { isPremium } = usePremium();
  const openModal = useModalStore(s => s.openModal);

  const [questions, setQuestions] = useState<ErrorQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("hardest");
  const [count, setCount] = useState<number>(isPremium ? 20 : FREE_SESSION_MAX);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const dbCountry = selectedCountry === "russia" ? "russia" : "es";

  // Reset visible count when filter/preset changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [preset, topicFilter]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(v => v + PAGE_SIZE); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    if (!profileId) return;
    loadErrors();
  }, [profileId, selectedCountry, selectedCategory]);

  const loadErrors = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
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
              {(isPremium ? COUNT_OPTIONS_PREMIUM : COUNT_OPTIONS_FREE).map(n => (
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
              {/* Premium upsell for larger sessions */}
              {!isPremium && (
                <button
                  onClick={() => openModal('PAYWALL')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/25 text-amber-600 hover:bg-amber-500/20 transition-all"
                >
                  <Crown className="w-3 h-3" />
                  20 / 50
                </button>
              )}
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

          {/* Topic dropdown — Premium only */}
          <div className="relative">
            <button
              onClick={() => isPremium ? setTopicMenuOpen(v => !v) : openModal('PAYWALL')}
              className={cn(
                "flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border transition-all",
                !isPremium
                  ? "bg-muted/40 border-border/40 text-muted-foreground/50"
                  : preset === "topic"
                    ? "bg-violet-500/10 border-violet-500/30 text-violet-600"
                    : "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted"
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {preset === "topic" && topicFilter
                ? <span className="max-w-[120px] truncate">{topicFilter}</span>
                : l("По теме", "Por tema", "By topic")}
              {isPremium ? <ChevronDown className="w-3 h-3" /> : <Crown className="w-3 h-3 text-amber-500" />}
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
          {sorted.slice(0, visibleCount).map((q, i) => {
            // Cards in the last batch get a stagger entrance
            const batchIndex = i % PAGE_SIZE;
            const isNewBatch = i >= visibleCount - PAGE_SIZE;
            return (
              <motion.div
                key={q.question_id}
                initial={isNewBatch ? { opacity: 0, y: 20, scale: 0.97 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: isNewBatch ? batchIndex * 0.03 : 0,
                  duration: 0.25,
                  ease: [0.22, 1, 0.36, 1]
                }}
              >
                <ErrorCard q={q} language={language} />
              </motion.div>
            );
          })}

          {/* Shimmer placeholders while next batch loads */}
          {visibleCount < sorted.length && Array.from({ length: Math.min(4, sorted.length - visibleCount) }).map((_, i) => (
            <div key={`shimmer-${i}`} className="rounded-[1.5rem] border border-border/40 overflow-hidden">
              <div className="h-36 bg-muted animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-16 bg-muted animate-pulse rounded-full" />
                <div className="h-4 w-full bg-muted animate-pulse rounded-full" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded-full" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded-full mt-2" />
              </div>
            </div>
          ))}
        </div>

        {/* Invisible sentinel — triggers next page load */}
        {visibleCount < sorted.length && (
          <div ref={loaderRef} className="h-1" />
        )}

        {/* All loaded indicator */}
        {!loading && sorted.length > PAGE_SIZE && visibleCount >= sorted.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground/50"
          >
            <div className="h-px flex-1 bg-border/30" />
            <span>{l(`Все ${sorted.length} вопросов загружены`, `${sorted.length} preguntas cargadas`, `All ${sorted.length} loaded`)}</span>
            <div className="h-px flex-1 bg-border/30" />
          </motion.div>
        )}
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
