import { useState, useMemo } from "react";
import { Lock, ChevronRight, Layers, BookOpen } from "lucide-react";
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
      <div className="min-h-screen bg-transparent p-6 md:p-10 font-sans pb-6 text-foreground">
        <div className="max-w-[1370px] mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fade-in">
            <div className="w-full md:w-auto space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {country === 'spain' ? 'DGT España' : 'ПДД Россия'}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                {t('По темам', 'Por temas', 'By Topics')}
              </h1>
              <p className="text-muted-foreground font-medium text-base md:text-lg">
                {t(
                  'Выберите тему для изучения',
                  'Elige un tema para estudiar',
                  'Choose a topic to study'
                )}
              </p>
            </div>

            {/* Stats badges — стиль из Tests.tsx */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 backdrop-blur-sm shadow-lg shadow-blue-500/10">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-bold text-blue-700 dark:text-blue-100">
                  {topics.length} <span className="text-blue-600/70 dark:text-blue-300/70 font-normal">{t('тем', 'temas', 'topics')}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 backdrop-blur-sm shadow-lg shadow-emerald-500/10">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-100">
                  {totalQuestions.toLocaleString()} <span className="text-emerald-600/70 dark:text-emerald-300/70 font-normal">{t('вопр.', 'preg.', 'q.')}</span>
                </span>
              </div>
              {isFree && (
                <button
                  onClick={() => openModal('PAYWALL')}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur-sm shadow-lg shadow-amber-500/10 hover:from-amber-500/30 hover:to-orange-500/30 transition-colors"
                >
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-100">
                    {freeTotal}/{totalQuestions} <span className="text-amber-600/70 dark:text-amber-300/70 font-normal">free</span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-48 rounded-[2rem] bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {sortedTopics.map((topic, index) => {
                const totalCount = topic.questions_count || 0;
                const ticketCount = Math.ceil(totalCount / FREE_QUESTIONS_PER_TOPIC);
                const accessPct = totalCount > 0 ? Math.round((FREE_QUESTIONS_PER_TOPIC / totalCount) * 100) : 100;

                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicClick(topic)}
                    className={cn(
                      "group relative overflow-hidden rounded-[2rem] p-6 cursor-pointer text-left",
                      "bg-white dark:bg-slate-800/40 backdrop-blur-md border border-slate-200 dark:border-white/5",
                      "transition-all duration-300 shadow-lg dark:shadow-xl",
                      "hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl",
                      "hover:border-blue-500/30 hover:shadow-blue-500/10",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {/* Ambient glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Watermark book icon */}
                    <BookOpen className="absolute w-32 h-32 text-slate-200/40 dark:text-white/[0.03] group-hover:text-blue-500/10 dark:group-hover:text-blue-500/[0.08] -bottom-6 -right-6 rotate-12 transition-all duration-500" />

                    <div className="relative z-10 flex flex-col h-full justify-between gap-5 min-h-[160px]">
                      {/* Top: number badge + count */}
                      <div className="flex justify-between items-start">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                          "bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 group-hover:scale-110 group-hover:rotate-3"
                        )}>
                          <span className="text-base font-black tabular-nums text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className="bg-transparent border-current text-blue-500 dark:text-blue-400 border border-blue-500/30 uppercase text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full">
                            {totalCount.toLocaleString()} {t('вопр.', 'preg.', 'q.')}
                          </span>
                          {isFree && (
                            <span className="bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                              30 {t('бесплатно', 'gratis', 'free')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {getTitle(topic)}
                        </h3>
                      </div>

                      {/* Bottom row */}
                      <div className="flex items-center gap-3">
                        {isFree ? (
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {t('Доступ', 'Acceso', 'Access')}
                              </span>
                              <span className="text-[10px] font-black tabular-nums text-muted-foreground">
                                {FREE_QUESTIONS_PER_TOPIC}/{totalCount}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                style={{ width: `${accessPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground flex-1">
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-widest">
                              {ticketCount} {t('билета', 'tests', 'tickets')}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                          "bg-blue-500/10 border-blue-500/20",
                          "group-hover:bg-blue-500 group-hover:border-blue-500 group-hover:scale-110"
                        )}>
                          <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
                        </div>
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
              className="w-full flex items-center justify-between gap-4 p-6 rounded-[2rem] bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 backdrop-blur-md border border-amber-500/25 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                    {t(
                      `${(totalQuestions - freeTotal).toLocaleString()} вопросов заблокировано`,
                      `${(totalQuestions - freeTotal).toLocaleString()} preguntas bloqueadas`,
                      `${(totalQuestions - freeTotal).toLocaleString()} questions locked`
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t(
                      `Открыто ${FREE_QUESTIONS_PER_TOPIC} на тему — разблокируй всё с Премиум`,
                      `${FREE_QUESTIONS_PER_TOPIC} por tema — desbloquea todo con Premium`,
                      `${FREE_QUESTIONS_PER_TOPIC} per topic — unlock everything with Premium`
                    )}
                  </p>
                </div>
              </div>
              <span className="text-sm font-black text-amber-500 shrink-0 uppercase tracking-widest">
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
