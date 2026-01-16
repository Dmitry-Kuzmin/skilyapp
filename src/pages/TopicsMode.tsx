import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight, Play, Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { usePDDContext } from "@/contexts/PDDContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePDDTopicQuestions } from "@/hooks/usePDDTopics";
import { TopicDetailDialog } from "@/components/topics/TopicDetailDialog";
import { motion } from "@/components/optimized/Motion";
import { cn } from "@/lib/utils";

const PREMIUM_GRADIENTS = [
  "from-blue-500/20 to-cyan-500/20",
  "from-purple-500/20 to-pink-500/20",
  "from-orange-500/20 to-red-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-indigo-500/20 to-blue-500/20",
  "from-rose-500/20 to-orange-500/20",
];

const ICON_COLORS = [
  "text-blue-400",
  "text-purple-400",
  "text-orange-400",
  "text-emerald-400",
  "text-indigo-400",
  "text-rose-400",
];

const TopicsMode = () => {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string; count: number } | null>(null);

  // Безопасное получение контекста с fallback
  let selectedCountry: string = 'russia';
  try {
    const context = usePDDContext();
    selectedCountry = context?.selectedCountry || 'russia';
  } catch (error) {
    console.warn('[TopicsMode] PDDContext not available, using default:', error);
  }

  const country = selectedCountry || 'russia';

  // Загружаем темы из таблицы topics (как в Dashboard)
  const { data: topics = [], isLoading, error } = useQuery({
    queryKey: ['topics', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, number, title_ru, title_es, title_en, cover_image, gradient_from, gradient_to, is_premium')
        .order('number');

      if (error) throw error;
      return data || [];
    },
  });

  // Загружаем вопросы для выбранной темы
  const { data: topicQuestions = [] } = usePDDTopicQuestions(
    country as any,
    selectedTopic?.name || '',
    selectedTopic?.count || 0
  );

  const handleTopicSelect = (topicId: string, topicName: string, topicCount: number) => {
    if (!topicId) return;
    // Открываем попап с выбором билета вместо прямого перехода
    setSelectedTopic({ id: topicId, name: topicName, count: topicCount });
  };

  // Сортируем темы по number (возрастание)
  const sortedTopics = useMemo(() => [...topics].sort((a, b) => (a.number || 0) - (b.number || 0)), [topics]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#09090b] relative overflow-hidden font-sans pb-32">
        {/* Background Mesh Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-12 md:pt-20 relative z-10 space-y-12">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase">
                <Star className="w-3 h-3 fill-blue-400" />
                <span>Обучение по темам</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none">
                По <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Темам</span>
              </h1>
              <p className="text-zinc-400 text-lg md:text-xl max-w-2xl font-medium">
                Фокусируйтесь на конкретных разделах ПДД. Прорешайте все вопросы темы, чтобы закрепить знания.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-4 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Всего тем</span>
                <span className="text-2xl font-black text-white">{topics.length}</span>
              </div>
              <div className="w-px h-10 bg-zinc-800" />
              <div className="flex flex-col">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Вопросов</span>
                <span className="text-2xl font-black text-white">
                  {topics.reduce((acc, t) => acc + t.count, 0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Grid Section */}
          <div className="relative">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-3xl bg-zinc-900/40 border border-zinc-800/50 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
                  <Clock className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Ошибка загрузки</h3>
                <p className="text-zinc-400 text-center max-w-xs">
                  Не удалось загрузить список тем. Пожалуйста, попробуйте обновить страницу.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
                >
                  Обновить
                </button>
              </div>
            ) : sortedTopics.length === 0 ? (
              <div className="text-center py-24 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
                <p className="text-zinc-400 text-lg">Темы не найдены</p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
                initial="hidden"
                animate="show"
              >
                {sortedTopics.map((topic, index) => {
                  const gradient = PREMIUM_GRADIENTS[index % PREMIUM_GRADIENTS.length];
                  const iconColor = ICON_COLORS[index % ICON_COLORS.length];

                  return (
                    <motion.div
                      key={topic.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        show: { opacity: 1, y: 0 }
                      }}
                      whileHover={{ y: -8 }}
                      onClick={() => handleTopicSelect(topic.id, topic.title_es || topic.title_ru, 30)} // TODO: подсчёт вопросов
                      className="group relative flex flex-col h-full cursor-pointer"
                    >
                      {/* Card Body */}
                      <div className="flex-1 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] p-6 transition-all duration-300 group-hover:bg-zinc-800/60 group-hover:border-zinc-700/50 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden">
                        {/* Hover Glow */}
                        <div className={cn(
                          "absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500",
                          gradient
                        )} />

                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-6">
                            <div className={cn(
                              "p-4 rounded-2xl bg-gradient-to-br border transition-all duration-300 group-hover:scale-110",
                              gradient,
                              "border-white/5"
                            )}>
                              <BookOpen className={cn("w-6 h-6", iconColor)} />
                            </div>
                            <div className="flex flex-col items-end">
                              <Badge className="bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10 font-bold px-3 py-1 rounded-full text-[10px] tracking-widest uppercase">
                                30 вопросов
                              </Badge>
                            </div>
                          </div>

                          <h3 className="text-xl font-black text-white leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all duration-300">
                            {topic.title_es || topic.title_ru}
                          </h3>
                        </div>

                        <div className="relative z-10 mt-8 space-y-4">
                          {/* Progress Placeholder */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                              <span>Прогресс</span>
                              <span>0%</span>
                            </div>
                            <div className="h-1 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                              <motion.div
                                className={cn("h-full bg-gradient-to-r", gradient.replace('/20', ''))}
                                initial={{ width: 0 }}
                                whileInView={{ width: '0%' }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between group/btn">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">Начать тест</span>
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Попап выбора билета */}
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
