import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight, Play, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { usePDDContext } from "@/contexts/PDDContext";
import { usePDDTopics } from "@/hooks/usePDDTopics";
import { motion } from "framer-motion";

const TopicsMode = () => {
  const navigate = useNavigate();
  const { selectedCountry } = usePDDContext();
  const { data: topics = [], isLoading, error } = usePDDTopics(selectedCountry || 'russia');

  const handleTopicSelect = (topicName: string) => {
    navigate(`/test/by-topic?topic=${encodeURIComponent(topicName)}&country=${selectedCountry}&count=30`);
  };

  // Сортируем темы по количеству вопросов (убывание)
  const sortedTopics = [...topics].sort((a, b) => b.count - a.count);

  return (
    <Layout>
      <div className="min-h-screen bg-background p-6 md:p-10 font-sans pb-24 text-foreground">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                  По Темам
                </h1>
                <p className="text-muted-foreground font-medium text-lg mt-1">
                  Выберите тему и прорешайте вопросы только по ней
                </p>
              </div>
            </div>
          </div>

          {/* Topics Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">Ошибка загрузки тем. Попробуйте обновить страницу.</p>
            </div>
          ) : sortedTopics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Темы не найдены</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTopics.map((topic, index) => (
                <motion.div
                  key={topic.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTopicSelect(topic.name)}
                  className="group relative overflow-hidden rounded-2xl p-6 cursor-pointer border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-800/70 hover:border-zinc-700/70 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 transition-all duration-500" />
                  
                  <div className="relative z-10 flex flex-col justify-between h-full min-h-[120px]">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-semibold">
                        {topic.count} вопросов
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-foreground line-clamp-2 leading-tight">
                        {topic.name}
                      </h3>
                      <button className="w-full h-12 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:scale-[1.01] transition-all">
                        <Play className="w-4 h-4 fill-black" />
                        <span>Начать</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TopicsMode;

