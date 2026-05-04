import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, XCircle, CheckCircle2, Zap, Brain, Trophy, Star, Filter, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Flashcard {
  id: string;
  topic: number;
  question_ru: string;
  question_es: string;
  question_eng: string;
  answer_ru: string;
  answer_es: string;
  answer_eng: string;
}

interface FlashcardProgress {
  flashcard_id: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
  last_position: number;
}

const RoadCardsGame = () => {
  const { profileId } = useUserContext();
  const { language, t } = useLanguage();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<number | 'all' | null>(null);
  const [stats, setStats] = useState({ total: 0, mastered: 0, learning: 0, new: 0 });
  const [topics, setTopics] = useState<number[]>([]);

  const loadTopics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('topic');
      
      if (error) throw error;
      const uniqueTopics = Array.from(new Set(data.map(item => item.topic))).sort((a, b) => a - b);
      setTopics(uniqueTopics);
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  }, []);

  const loadFlashcards = useCallback(async (topic: number | 'all') => {
    try {
      setLoading(true);
      let query = supabase.from("flashcards").select("*");
      
      if (topic !== 'all') {
        query = query.eq("topic", topic);
      }

      const { data: flashcardsData, error: flashcardsError } = await query.order("id", { ascending: true });

      if (flashcardsError) throw flashcardsError;
      
      // Shuffle if 'all'
      const finalData = topic === 'all' 
        ? [...(flashcardsData || [])].sort(() => Math.random() - 0.5)
        : (flashcardsData || []);
        
      setFlashcards(finalData);

      if (profileId && finalData.length > 0) {
        const { data: progressData } = await supabase
          .from("user_flashcard_progress")
          .select("flashcard_id, status")
          .eq("user_id", profileId);

        const total = finalData.length;
        const mastered = progressData?.filter(p => p.status === 'mastered' && finalData.some(f => f.id === p.flashcard_id)).length || 0;
        const learning = progressData?.filter(p => (p.status === 'learning' || p.status === 'review') && finalData.some(f => f.id === p.flashcard_id)).length || 0;
        const newCards = total - (mastered + learning);
        setStats({ total, mastered, learning, new: newCards });
      } else {
        setStats({ total: finalData.length, mastered: 0, learning: 0, new: finalData.length });
      }

      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error("Error loading flashcards:", error);
      toast.error("Ошибка при загрузке карточек");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
    setIsFlipped(false);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
    setIsFlipped(false);
  };

  const handleFlip = () => setIsFlipped(!isFlipped);

  const updateCardProgress = async (rating: 1 | 2 | 3 | 4) => {
    if (!profileId || !flashcards[currentIndex]) return;

    const currentCard = flashcards[currentIndex];
    let status: 'learning' | 'review' | 'mastered' = 'learning';
    
    if (rating === 4) status = 'mastered';
    else if (rating === 3) status = 'review';

    try {
      await supabase.from("user_flashcard_progress").upsert({
        user_id: profileId,
        flashcard_id: currentCard.id,
        topic: currentCard.topic,
        status: status,
        last_rating: rating,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,flashcard_id' });

      handleNext();
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const getQuestion = () => {
    const card = flashcards[currentIndex];
    if (!card) return "";
    return language === 'es' ? card.question_es : (language === 'eng' ? card.question_eng : card.question_ru);
  };

  const getAnswer = () => {
    const card = flashcards[currentIndex];
    if (!card) return "";
    return language === 'es' ? card.answer_es : (language === 'eng' ? card.answer_eng : card.answer_ru);
  };

  if (selectedTopic === null) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-80px)] p-6 flex flex-col items-center justify-center space-y-8 bg-zinc-950">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/30 shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)]">
              <Brain className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Дорожные карточки</h1>
            <p className="text-zinc-400 max-w-md mx-auto">
              Выберите тему для тренировки или запустите режим «Всё сразу» для максимальной проверки знаний
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            <Button
              onClick={() => {
                setSelectedTopic('all');
                loadFlashcards('all');
              }}
              className="h-32 rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 border-0 flex flex-col gap-2 hover:scale-105 transition-transform shadow-xl group"
            >
              <LayoutGrid className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-lg">Всё сразу</span>
            </Button>
            
            {topics.map((topic) => (
              <Button
                key={topic}
                variant="outline"
                onClick={() => {
                  setSelectedTopic(topic);
                  loadFlashcards(topic);
                }}
                className="h-32 rounded-3xl bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/80 hover:border-blue-500/50 flex flex-col gap-2 hover:scale-105 transition-transform"
              >
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Тема</span>
                <span className="text-3xl font-black text-white">{topic}</span>
              </Button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-80px)] flex flex-col bg-zinc-950 overflow-hidden">
        {/* Header */}
        <div className="p-6 flex items-center justify-between z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedTopic(null)}
            className="rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex flex-col items-center">
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-400 px-3 py-1 mb-1">
              {selectedTopic === 'all' ? 'Все темы' : `Тема ${selectedTopic}`}
            </Badge>
            <div className="text-xs text-zinc-500 font-medium">
              Карточка {currentIndex + 1} из {flashcards.length}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="hidden md:flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs text-emerald-400 font-bold">{stats.mastered}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-xs text-blue-400 font-bold">{stats.learning}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

          {loading ? (
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-zinc-500 text-sm font-medium">Синхронизация...</span>
            </div>
          ) : (
            <div className="w-full max-w-2xl perspective-[2000px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 1.1, rotateX: 10 }}
                  transition={{ type: "spring", damping: 20, stiffness: 100 }}
                  className="relative h-[450px] md:h-[500px] cursor-pointer group"
                  onClick={handleFlip}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 80 }}
                    className="w-full h-full relative"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Front */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl backface-hidden overflow-hidden"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
                      <div className="mb-6">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                          <Star className="w-6 h-6 text-blue-400" />
                        </div>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        {getQuestion()}
                      </h2>
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">
                        Нажми чтобы увидеть ответ
                      </div>
                    </div>

                    {/* Back */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-br from-blue-900 via-zinc-900 to-zinc-900 border border-blue-500/20 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
                      <h2 className="text-2xl md:text-3xl font-medium text-blue-50 leading-relaxed">
                        {getAnswer()}
                      </h2>
                      
                      {profileId && (
                        <div className="absolute bottom-10 inset-x-10 grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((rating) => (
                            <Button
                              key={rating}
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCardProgress(rating as any);
                              }}
                              className={cn(
                                "h-12 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/5 bg-white/5 hover:bg-white/10",
                                rating === 1 && "hover:bg-red-500/20 hover:text-red-400",
                                rating === 2 && "hover:bg-orange-500/20 hover:text-orange-400",
                                rating === 3 && "hover:bg-blue-500/20 hover:text-blue-400",
                                rating === 4 && "hover:bg-emerald-500/20 hover:text-emerald-400"
                              )}
                            >
                              <span className="text-[10px] font-black">{rating}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
              
              {/* Navigation Arrows (Desktop) */}
              <div className="absolute top-1/2 -left-24 -translate-y-1/2 hidden lg:block">
                <Button variant="ghost" size="icon" onClick={handlePrevious} className="w-14 h-14 rounded-full hover:bg-white/5">
                  <ChevronLeft className="w-8 h-8 text-zinc-600 hover:text-white" />
                </Button>
              </div>
              <div className="absolute top-1/2 -right-24 -translate-y-1/2 hidden lg:block">
                <Button variant="ghost" size="icon" onClick={handleNext} className="w-14 h-14 rounded-full hover:bg-white/5">
                  <ChevronRight className="w-8 h-8 text-zinc-600 hover:text-white" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Progress */}
        <div className="p-8 space-y-6 bg-zinc-950/50 backdrop-blur-xl border-t border-zinc-900">
          <div className="max-w-xl mx-auto w-full space-y-4">
            <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              <span>Прогресс обучения</span>
              <span className="text-blue-400">{Math.round(((currentIndex + 1) / flashcards.length) * 100)}%</span>
            </div>
            <Progress value={((currentIndex + 1) / flashcards.length) * 100} className="h-1.5 bg-zinc-900" indicatorClassName="bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </div>

          <div className="flex items-center justify-center gap-4 lg:hidden">
            <Button variant="outline" className="rounded-2xl bg-zinc-900 border-zinc-800 h-14 px-8" onClick={handlePrevious}>Назад</Button>
            <Button className="rounded-2xl bg-white text-black hover:bg-zinc-200 h-14 px-12 font-bold" onClick={handleNext}>Следующая</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RoadCardsGame;
