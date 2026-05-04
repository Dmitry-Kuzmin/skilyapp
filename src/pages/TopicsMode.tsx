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
import { useUserContext } from "@/contexts/UserContext";
import { useUserProgress } from "@/hooks/useUserProgress";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const FREE_QUESTIONS_PER_TOPIC = 30;

const TopicsMode = () => {
  const { isPremium } = usePremium();
  const openModal = useModalStore((s) => s.openModal);
  const { profileId } = useUserContext();
  const { language } = useLanguage();

  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string; count: number } | null>(null);

  let selectedCountry: string = 'russia';
  let selectedCategory: string = 'B';
  try {
    const context = usePDDContext();
    selectedCountry = context?.selectedCountry || 'russia';
    selectedCategory = context?.selectedCategory || 'B';
  } catch {
    // fallback
  }

  const country = selectedCountry || 'russia';
  const { data: userProgress = [] } = useUserProgress(profileId, country, selectedCategory);

  const progressByTopic = useMemo(() => {
    const counts: Record<string, number> = {};
    userProgress.forEach(p => {
      const topicId = p.questions_new?.topic_id;
      if (topicId) {
        counts[topicId] = (counts[topicId] || 0) + 1;
      }
    });
    return counts;
  }, [userProgress]);

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

                      {/* Bottom row - Progress styled like Non-stop */}
                      <div className="flex flex-col gap-3 w-full">
                        {(() => {
                          const answeredCount = progressByTopic[topic.id] || 0;
                          const progressPct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
                          
                          return (
                            <div className="space-y-2 animate-fade-in flex-1">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-amber-600/80 dark:text-amber-500/80">
                                <span className="flex items-center gap-1.5">
                                  {t('Пройдено', 'Completado', 'Progress')}: {answeredCount} / {totalCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  {progressPct}%
                                  <CheckCircle className="w-3 h-3" />
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden border border-amber-500/20 shadow-inner">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPct}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                />
                              </div>
                            </div>
                          );
                        })()}
                        
                        <div className="flex items-center justify-between mt-1">
                          {!isFree ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Layers className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {ticketCount} {t('билета', 'tests', 'tickets')}
                              </span>
                            </div>
                          ) : <div />}
                          
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                            "bg-blue-500/10 border-blue-500/20",
                            "group-hover:bg-blue-500 group-hover:border-blue-500 group-hover:scale-110"
                          )}>
                            <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
                          </div>
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
