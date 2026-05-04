import { useState, useMemo } from "react";
import { Lock, ChevronRight, Layers } from "lucide-react";
import Layout from "@/components/Layout";
import { usePDDContext } from "@/contexts/PDDContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePDDTopicQuestions } from "@/hooks/usePDDTopics";
import { TopicDetailDialog } from "@/components/topics/TopicDetailDialog";
import { cn } from "@/lib/utils";
import { usePremium } from "@/hooks/usePremium";
import { useModalStore } from "@/store/modalStore";
import { useLanguage } from "@/contexts/LanguageContext";

const ACCENT_COLORS = [
  { bg: "bg-blue-500/10", border: "border-blue-500/30", num: "text-blue-500", bar: "bg-blue-500" },
  { bg: "bg-violet-500/10", border: "border-violet-500/30", num: "text-violet-500", bar: "bg-violet-500" },
  { bg: "bg-amber-500/10", border: "border-amber-500/30", num: "text-amber-500", bar: "bg-amber-500" },
  { bg: "bg-emerald-500/10", border: "border-emerald-500/30", num: "text-emerald-500", bar: "bg-emerald-500" },
  { bg: "bg-rose-500/10", border: "border-rose-500/30", num: "text-rose-500", bar: "bg-rose-500" },
  { bg: "bg-cyan-500/10", border: "border-cyan-500/30", num: "text-cyan-500", bar: "bg-cyan-500" },
  { bg: "bg-orange-500/10", border: "border-orange-500/30", num: "text-orange-500", bar: "bg-orange-500" },
  { bg: "bg-pink-500/10", border: "border-pink-500/30", num: "text-pink-500", bar: "bg-pink-500" },
  { bg: "bg-teal-500/10", border: "border-teal-500/30", num: "text-teal-500", bar: "bg-teal-500" },
  { bg: "bg-indigo-500/10", border: "border-indigo-500/30", num: "text-indigo-500", bar: "bg-indigo-500" },
];

const FREE_QUESTIONS_PER_TOPIC = 30;

const TopicsMode = () => {
  const { isPremium } = usePremium();
  const openModal = useModalStore((s) => s.openModal);
  const { language } = useLanguage();

  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string; count: number } | null>(null);

  let selectedCountry: string = 'russia';
  try {
    const context = usePDDContext();
    selectedCountry = context?.selectedCountry || 'russia';
  } catch {
    // fallback
  }

  const country = selectedCountry || 'russia';

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['topics-with-counts', country],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_topics_with_counts');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: topicQuestions = [] } = usePDDTopicQuestions(
    country as any,
    selectedTopic?.name || '',
    FREE_QUESTIONS_PER_TOPIC
  );

  const sortedTopics = useMemo(
    () => [...topics].sort((a, b) => (a.number || 0) - (b.number || 0)),
    [topics]
  );

  const totalQuestions = topics.reduce((acc, t) => acc + (t.questions_count || 0), 0);

  const t = (ru: string, es: string, en: string) =>
    language === 'es' ? es : language === 'en' ? en : ru;

  const getTitle = (topic: any) => {
    if (language === 'es') return topic.title_es || topic.title_ru;
    if (language === 'en') return topic.title_en || topic.title_es || topic.title_ru;
    return topic.title_ru || topic.title_es;
  };

  const handleTopicClick = (topic: any) => {
    setSelectedTopic({ id: topic.id, name: getTitle(topic), count: topic.questions_count });
  };

  const isFree = !isPremium && country === 'spain';
  const freeTotal = FREE_QUESTIONS_PER_TOPIC * topics.length;

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 space-y-6">

          {/* Header — same grid as cards so edges align perfectly */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            {/* Title block spans 2 cols on lg, 3 cols on xl */}
            <div className="lg:col-span-2 xl:col-span-3 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {country === 'spain' ? 'DGT España' : 'ПДД Россия'}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                {t('По темам', 'Por temas', 'By Topics')}
              </h1>
            </div>

            {/* Stats block in 3rd col — exactly 1 card wide */}
            <div className="flex items-center gap-5 px-5 py-4 rounded-2xl bg-card border border-border h-full min-h-[72px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t('Тем', 'Temas', 'Topics')}
                </p>
                <p className="text-xl font-black text-foreground">{topics.length}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t('Вопросов', 'Preguntas', 'Questions')}
                </p>
                <p className="text-xl font-black text-foreground">{totalQuestions.toLocaleString()}</p>
              </div>
              {isFree && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <button
                    onClick={() => openModal('PAYWALL')}
                    className="flex flex-col items-start text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[10px] font-bold leading-none">
                      {freeTotal}/{totalQuestions}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedTopics.map((topic, index) => {
                const colors = ACCENT_COLORS[index % ACCENT_COLORS.length];
                const totalCount = topic.questions_count || 0;
                const ticketCount = Math.ceil(totalCount / FREE_QUESTIONS_PER_TOPIC);
                const accessPct = totalCount > 0 ? Math.round((FREE_QUESTIONS_PER_TOPIC / totalCount) * 100) : 100;

                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicClick(topic)}
                    className={cn(
                      "group text-left w-full rounded-2xl border bg-card p-5 flex flex-col gap-4",
                      "transition-all duration-150 ease-out",
                      "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:shadow-none active:translate-y-0",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      colors.border
                    )}
                  >
                    {/* Top: number badge + count */}
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", colors.bg)}>
                        <span className={cn("text-sm font-black tabular-nums", colors.num)}>
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground pt-1 text-right">
                        {totalCount.toLocaleString()} {t('вопр.', 'preg.', 'q.')}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="font-bold text-foreground text-[15px] leading-snug line-clamp-2 flex-1">
                      {getTitle(topic)}
                    </p>

                    {/* Bottom */}
                    <div className="flex items-center gap-3">
                      {isFree ? (
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {t('Доступ', 'Acceso', 'Access')}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {FREE_QUESTIONS_PER_TOPIC}/{totalCount}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-300", colors.bar)}
                              style={{ width: `${accessPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground flex-1">
                          <Layers className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-semibold">
                            {ticketCount} {t('билета', 'tests', 'tickets')}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        "bg-foreground/5 transition-all duration-150",
                        "group-hover:bg-foreground group-hover:scale-110",
                      )}>
                        <ChevronRight className="w-4 h-4 text-foreground group-hover:text-background" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Premium upsell */}
          {isFree && !isLoading && topics.length > 0 && (
            <button
              onClick={() => openModal('PAYWALL')}
              className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 hover:from-amber-500/15 hover:to-orange-500/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 shrink-0">
                  <Lock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground text-sm">
                    {t(
                      `${totalQuestions - freeTotal} вопросов заблокировано`,
                      `${totalQuestions - freeTotal} preguntas bloqueadas`,
                      `${totalQuestions - freeTotal} questions locked`
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      `Открыто ${FREE_QUESTIONS_PER_TOPIC} на тему — разблокируй всё`,
                      `${FREE_QUESTIONS_PER_TOPIC} por tema gratuitas — desbloquea todo`,
                      `${FREE_QUESTIONS_PER_TOPIC} free per topic — unlock everything`
                    )}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-amber-500 shrink-0">
                {t('Премиум →', 'Premium →', 'Premium →')}
              </span>
            </button>
          )}
        </div>
      </div>

      {selectedTopic && (
        <TopicDetailDialog
          open={!!selectedTopic}
          onOpenChange={(open) => !open && setSelectedTopic(null)}
          topicId={selectedTopic.id}
          topicName={selectedTopic.name}
          topicCount={selectedTopic.count}
          freeQuestionIds={topicQuestions.map(q => q.id)}
          country={country}
          isPremium={isPremium}
        />
      )}
    </Layout>
  );
};

export default TopicsMode;
