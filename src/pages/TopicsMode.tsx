import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Play, Lock, ChevronRight, Layers } from "lucide-react";
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
  { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-400", bar: "bg-blue-500" },
  { bg: "bg-violet-500/10", border: "border-violet-500/20", icon: "text-violet-400", bar: "bg-violet-500" },
  { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400", bar: "bg-amber-500" },
  { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400", bar: "bg-emerald-500" },
  { bg: "bg-rose-500/10", border: "border-rose-500/20", icon: "text-rose-400", bar: "bg-rose-500" },
  { bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: "text-cyan-400", bar: "bg-cyan-500" },
  { bg: "bg-orange-500/10", border: "border-orange-500/20", icon: "text-orange-400", bar: "bg-orange-500" },
  { bg: "bg-pink-500/10", border: "border-pink-500/20", icon: "text-pink-400", bar: "bg-pink-500" },
  { bg: "bg-teal-500/10", border: "border-teal-500/20", icon: "text-teal-400", bar: "bg-teal-500" },
  { bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: "text-indigo-400", bar: "bg-indigo-500" },
];

const FREE_QUESTIONS_PER_TOPIC = 30;

const TopicsMode = () => {
  const navigate = useNavigate();
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
    selectedTopic?.count || 0
  );

  const sortedTopics = useMemo(
    () => [...topics].sort((a, b) => (a.number || 0) - (b.number || 0)),
    [topics]
  );

  const totalQuestions = topics.reduce((acc, t) => acc + (t.questions_count || 0), 0);

  const getTitle = (topic: any) => {
    if (language === 'es') return topic.title_es || topic.title_ru;
    if (language === 'en') return topic.title_en || topic.title_es || topic.title_ru;
    return topic.title_ru || topic.title_es;
  };

  const handleTopicClick = (topic: any) => {
    const name = getTitle(topic);
    setSelectedTopic({ id: topic.id, name, count: topic.questions_count });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 md:pt-12 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {country === 'spain' ? 'DGT España' : 'ПДД Россия'}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                {language === 'ru' ? 'По темам' : language === 'es' ? 'Por temas' : 'By Topics'}
              </h1>
            </div>
            <div className="flex items-center gap-6 px-5 py-3 rounded-2xl bg-card border border-border">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Тем</p>
                <p className="text-xl font-black text-foreground">{topics.length}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Вопросов</p>
                <p className="text-xl font-black text-foreground">{totalQuestions.toLocaleString()}</p>
              </div>
              {!isPremium && country === 'spain' && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <button
                    onClick={() => openModal('PAYWALL')}
                    className="flex items-center gap-1.5 text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">
                      {FREE_QUESTIONS_PER_TOPIC * topics.length}/{totalQuestions} free
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTopics.map((topic, index) => {
                const colors = ACCENT_COLORS[index % ACCENT_COLORS.length];
                const isFree = !isPremium && country === 'spain';
                const freeCount = FREE_QUESTIONS_PER_TOPIC;
                const totalCount = topic.questions_count;

                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicClick(topic)}
                    className={cn(
                      "group text-left w-full rounded-2xl border bg-card p-5 flex flex-col gap-4",
                      "transition-all duration-200 ease-out",
                      "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      colors.border
                    )}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn("p-2.5 rounded-xl", colors.bg)}>
                        <BookOpen className={cn("w-5 h-5", colors.icon)} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isFree && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            {freeCount} free
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {totalCount} {language === 'es' ? 'preguntas' : 'вопр.'}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <p className="font-bold text-foreground text-base leading-snug line-clamp-2 flex-1">
                      {getTitle(topic)}
                    </p>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between">
                      {isFree ? (
                        <div className="flex-1 mr-3">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                            <span>{language === 'es' ? 'Acceso' : 'Доступ'}</span>
                            <span>{Math.round((freeCount / totalCount) * 100)}%</span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", colors.bar)}
                              style={{ width: `${Math.round((freeCount / totalCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Layers className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">
                            {Math.ceil(totalCount / FREE_QUESTIONS_PER_TOPIC)} {language === 'es' ? 'partes' : 'части'}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                        "bg-foreground/5 group-hover:bg-foreground group-hover:scale-110",
                      )}>
                        {isFree
                          ? <Play className="w-3.5 h-3.5 fill-foreground text-foreground ml-0.5 group-hover:fill-background group-hover:text-background" />
                          : <ChevronRight className="w-4 h-4 text-foreground group-hover:text-background" />
                        }
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Premium upsell for free users */}
          {!isPremium && !isLoading && country === 'spain' && topics.length > 0 && (
            <button
              onClick={() => openModal('PAYWALL')}
              className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 hover:from-amber-500/15 hover:to-orange-500/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15">
                  <Lock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground text-sm">
                    {language === 'es'
                      ? `${totalQuestions - FREE_QUESTIONS_PER_TOPIC * topics.length} preguntas bloqueadas`
                      : `${totalQuestions - FREE_QUESTIONS_PER_TOPIC * topics.length} вопросов заблокировано`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'es'
                      ? `Tienes acceso a ${FREE_QUESTIONS_PER_TOPIC} por tema — desbloquea todo`
                      : `Открыто ${FREE_QUESTIONS_PER_TOPIC} на тему — разблокируй всё`}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-amber-500 shrink-0">
                {language === 'es' ? 'Premium →' : 'Премиум →'}
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
          allQuestionIds={topicQuestions.map(q => q.id)}
          country={country}
        />
      )}
    </Layout>
  );
};

export default TopicsMode;
