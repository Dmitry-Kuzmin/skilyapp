import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, XCircle, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

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
  last_position: number;
  status: 'new' | 'learning' | 'review' | 'mastered';
  next_review_at: string | null;
  ease_factor?: number;
  interval_days?: number;
  repetitions?: number;
}

interface FlashCardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: number;
  language?: 'ru' | 'es' | 'eng';
}

export function FlashCardsModal({
  open,
  onOpenChange,
  topic,
  language = 'ru'
}: FlashCardsModalProps) {
  const { profileId } = useUserContext();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Map<string, FlashcardProgress>>(new Map());
  const [stats, setStats] = useState({ total: 0, mastered: 0, learning: 0, new: 0 });
  const savePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const savePosition = useCallback(async (index: number) => {
    if (!profileId || !flashcards.length || index >= flashcards.length) return;

    const currentCard = flashcards[index];
    if (!currentCard) return;

    // Отменяем предыдущий таймаут
    if (savePositionTimeoutRef.current) {
      clearTimeout(savePositionTimeoutRef.current);
    }

    // Сохраняем с задержкой (debounce)
    savePositionTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("user_flashcard_progress")
          .upsert({
            user_id: profileId,
            flashcard_id: currentCard.id,
            topic: currentCard.topic,
            last_position: index,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,flashcard_id'
          });

        if (error) {
          console.error("Error saving position:", error);
        }
      } catch (error) {
        console.error("Error saving position:", error);
      }
    }, 500);
  }, [profileId, flashcards]);

  const loadFlashcards = useCallback(async () => {
    try {
      setLoading(true);

      // Загружаем карточки
      const { data: flashcardsData, error: flashcardsError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("topic", topic)
        .order("id", { ascending: true });

      if (flashcardsError) throw flashcardsError;
      setFlashcards(flashcardsData || []);

      // Загружаем прогресс пользователя, если авторизован
      if (profileId && flashcardsData && flashcardsData.length > 0) {
        const flashcardIds = flashcardsData.map(f => f.id);
        const { data: progressData, error: progressError } = await supabase
          .from("user_flashcard_progress")
          .select("flashcard_id, last_position, status, next_review_at, ease_factor, interval_days, repetitions")
          .eq("user_id", profileId)
          .in("flashcard_id", flashcardIds);

        if (!progressError && progressData) {
          const progress = new Map<string, FlashcardProgress>();
          progressData.forEach(p => {
            progress.set(p.flashcard_id, {
              flashcard_id: p.flashcard_id,
              last_position: p.last_position,
              status: p.status,
              next_review_at: p.next_review_at,
              ease_factor: p.ease_factor ? parseFloat(p.ease_factor.toString()) : 2.5,
              interval_days: p.interval_days || 0,
              repetitions: p.repetitions || 0
            });
          });
          setProgressMap(progress);

          // Находим последнюю позицию для этой темы
          const lastPosition = Math.max(
            ...Array.from(progress.values())
              .filter(p => {
                const card = flashcardsData.find(f => f.id === p.flashcard_id);
                return card?.topic === topic;
              })
              .map(p => p.last_position),
            0
          );

          // Начинаем с последней позиции или с 0
          setCurrentIndex(Math.min(lastPosition, flashcardsData.length - 1));
        } else {
          setCurrentIndex(0);
        }

        // Подсчитываем статистику
        const total = flashcardsData.length;
        const mastered = progressData?.filter(p => p.status === 'mastered').length || 0;
        const learning = progressData?.filter(p => p.status === 'learning' || p.status === 'review').length || 0;
        const newCards = total - (progressData?.length || 0);
        setStats({ total, mastered, learning, new: newCards });
      } else {
        setCurrentIndex(0);
        setStats({
          total: flashcardsData?.length || 0,
          mastered: 0,
          learning: 0,
          new: flashcardsData?.length || 0
        });
      }

      setIsFlipped(false);
    } catch (error) {
      console.error("Error loading flashcards:", error);
    } finally {
      setLoading(false);
    }
  }, [topic, profileId]);

  useEffect(() => {
    if (open && topic) {
      loadFlashcards();
    }
  }, [open, topic, loadFlashcards]);

  // Сохраняем позицию при закрытии модалки
  useEffect(() => {
    if (!open && profileId && flashcards.length > 0 && currentIndex < flashcards.length) {
      savePosition(currentIndex);
    }
  }, [open, profileId, flashcards.length, currentIndex, savePosition]);


  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : flashcards.length - 1;
      savePosition(newIndex);
      return newIndex;
    });
    setIsFlipped(false);
  }, [flashcards.length, savePosition]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev < flashcards.length - 1 ? prev + 1 : 0;
      savePosition(newIndex);
      return newIndex;
    });
    setIsFlipped(false);
  }, [flashcards.length, savePosition]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    if (profileId && flashcards[0]) {
      savePosition(0);
    }
  };

  // Алгоритм Spaced Repetition (как в Anki)
  const updateCardProgress = useCallback(async (rating: 1 | 2 | 3 | 4) => {
    if (!profileId || !flashcards[currentIndex]) return;

    const currentCard = flashcards[currentIndex];
    const currentProgress = progressMap.get(currentCard.id);

    // Используем данные из локального прогресса или значения по умолчанию
    let easeFactor = currentProgress?.ease_factor || 2.5;
    let intervalDays = currentProgress?.interval_days || 0;
    let repetitions = currentProgress?.repetitions || 0;
    let status: 'new' | 'learning' | 'review' | 'mastered' = currentProgress?.status || 'new';
    let nextReviewAt: Date | null = null;

    if (rating === 1) {
      // Снова - сброс прогресса
      easeFactor = 2.5;
      intervalDays = 0;
      repetitions = 0;
      status = 'learning';
      nextReviewAt = new Date(Date.now() + 1 * 60 * 1000); // 1 минута
    } else if (rating === 2) {
      // Трудно
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      intervalDays = 0;
      status = 'learning';
      nextReviewAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут
    } else if (rating === 3) {
      // Хорошо
      if (repetitions === 0) {
        intervalDays = 1;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      repetitions = repetitions + 1;
      status = repetitions >= 3 ? 'review' : 'learning';
      nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
    } else if (rating === 4) {
      // Легко
      easeFactor = Math.min(2.5, easeFactor + 0.15);
      if (repetitions === 0) {
        intervalDays = 4;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      repetitions = repetitions + 1;
      status = repetitions >= 2 ? 'mastered' : 'review';
      nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
    }

    try {
      const { error } = await supabase
        .from("user_flashcard_progress")
        .upsert({
          user_id: profileId,
          flashcard_id: currentCard.id,
          topic: currentCard.topic,
          ease_factor: easeFactor,
          interval_days: intervalDays,
          repetitions: repetitions,
          last_rating: rating,
          status: status,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReviewAt?.toISOString() || null,
          last_position: currentIndex,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,flashcard_id'
        });

      if (error) {
        console.error("Error updating progress:", error);
      } else {
        // Обновляем локальный прогресс
        const newProgress = new Map(progressMap);
        newProgress.set(currentCard.id, {
          flashcard_id: currentCard.id,
          last_position: currentIndex,
          status: status,
          next_review_at: nextReviewAt?.toISOString() || null,
          ease_factor: easeFactor,
          interval_days: intervalDays,
          repetitions: repetitions
        });
        setProgressMap(newProgress);

        // Обновляем статистику
        const total = flashcards.length;
        const mastered = Array.from(newProgress.values()).filter(p => p.status === 'mastered').length;
        const learning = Array.from(newProgress.values()).filter(p => p.status === 'learning' || p.status === 'review').length;
        const newCards = total - newProgress.size;
        setStats({ total, mastered, learning, new: newCards });

        // Переходим к следующей карточке
        handleNext();
      }
    } catch (error) {
      console.error("Error updating card progress:", error);
    }
  }, [profileId, flashcards, currentIndex, progressMap, handleNext]);

  // Обработка клавиатуры
  useEffect(() => {
    if (!open) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        handleFlip();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "1" && isFlipped) {
        e.preventDefault();
        updateCardProgress(1);
      } else if (e.key === "2" && isFlipped) {
        e.preventDefault();
        updateCardProgress(2);
      } else if (e.key === "3" && isFlipped) {
        e.preventDefault();
        updateCardProgress(3);
      } else if (e.key === "4" && isFlipped) {
        e.preventDefault();
        updateCardProgress(4);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [open, handleFlip, handlePrevious, handleNext, isFlipped, updateCardProgress]);

  const getQuestion = () => {
    if (!flashcards[currentIndex]) return "";
    switch (language) {
      case 'es':
        return flashcards[currentIndex].question_es;
      case 'eng':
        return flashcards[currentIndex].question_eng;
      default:
        return flashcards[currentIndex].question_ru;
    }
  };

  const getAnswer = () => {
    if (!flashcards[currentIndex]) return "";
    switch (language) {
      case 'es':
        return flashcards[currentIndex].answer_es;
      case 'eng':
        return flashcards[currentIndex].answer_eng;
      default:
        return flashcards[currentIndex].answer_ru;
    }
  };

  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      title="Дорожные Карточки"
      modalType="default"
      fullscreen={false}
      className="max-w-5xl"
      contentClassName="p-0 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-emerald-950/80"
    >
      {loading ? (
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-muted-foreground">Загрузка карточек...</div>
        </div>
      ) : flashcards.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
          <p className="text-muted-foreground">Нет карточек для этой темы</p>
        </div>
      ) : (
        <div className="relative min-h-[600px] flex flex-col">
          {/* Инструкции и статистика */}
          <div className="py-4 px-6 space-y-3">
            <div className="text-center text-sm text-slate-300/70">
              Пробел — перевернуть • ← → — навигация
              {profileId && isFlipped && " • 1-4 — оценка карточки"}
            </div>
            {profileId && (
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                <span>Всего: {stats.total}</span>
                <span className="text-emerald-400">Изучено: {stats.mastered}</span>
                <span className="text-yellow-400">В процессе: {stats.learning}</span>
                <span className="text-slate-500">Новых: {stats.new}</span>
              </div>
            )}
          </div>

          {/* Основная карточка */}
          <div className="flex-1 flex items-center justify-center gap-6 px-6 py-6">
            {/* Стрелка влево */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="rounded-full w-14 h-14 shrink-0 bg-slate-800/30 hover:bg-slate-700/50 border-0 z-10"
              aria-label="Предыдущая карточка"
            >
              <ChevronLeft className="w-6 h-6 text-slate-400" />
            </Button>

            {/* Карточка */}
            <div className="flex-1 max-w-2xl relative">
              <div
                className="relative h-[450px] md:h-[500px] cursor-pointer"
                style={{
                  perspective: "1000px",
                }}
              >
                <div
                  className="relative w-full h-full transition-transform duration-500 ease-in-out"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Лицевая сторона (вопрос) */}
                  <div
                    className={cn(
                      "absolute inset-0 p-8 md:p-10 flex flex-col rounded-3xl overflow-hidden",
                      "bg-gradient-to-br from-indigo-900/50 via-slate-800/70 to-emerald-900/50",
                      "border border-slate-700/30 shadow-2xl backdrop-blur-md"
                    )}
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(0deg)",
                    }}
                    onClick={handleFlip}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 py-4">
                      <div className="flex-1 overflow-y-auto w-full px-6 md:px-8 flex items-center justify-center">
                        <p className="text-xl md:text-2xl font-normal text-white leading-snug text-center w-full">
                          {getQuestion()}
                        </p>
                      </div>
                      <div className="mt-4 shrink-0">
                        <Button
                          variant="ghost"
                          size="lg"
                          className="text-slate-300 hover:text-white hover:bg-slate-700/30 text-base px-6 py-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFlip();
                          }}
                        >
                          Показать ответ
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Обратная сторона (ответ) */}
                  <div
                    className={cn(
                      "absolute inset-0 p-8 md:p-10 flex flex-col rounded-3xl overflow-hidden",
                      "bg-gradient-to-br from-indigo-900/50 via-slate-800/70 to-emerald-900/50",
                      "border border-slate-700/30 shadow-2xl backdrop-blur-md"
                    )}
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    onClick={handleFlip}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 py-4">
                      <div className="flex-1 overflow-y-auto w-full px-6 md:px-8 flex items-center justify-center">
                        <p className="text-xl md:text-2xl font-normal text-white leading-snug text-center w-full">
                          {getAnswer()}
                        </p>
                      </div>
                      <div className="mt-4 shrink-0 space-y-3">
                        <Button
                          variant="ghost"
                          size="lg"
                          className="text-slate-300 hover:text-white hover:bg-slate-700/30 text-base px-6 py-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFlip();
                          }}
                        >
                          Показать вопрос
                        </Button>

                        {/* Кнопки оценки (только если пользователь авторизован) */}
                        {profileId && (
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-900/30 border-red-700/50 text-red-300 hover:bg-red-800/50 hover:text-red-200 text-xs px-3 py-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCardProgress(1);
                              }}
                              title="Снова (1)"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Снова
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-orange-900/30 border-orange-700/50 text-orange-300 hover:bg-orange-800/50 hover:text-orange-200 text-xs px-3 py-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCardProgress(2);
                              }}
                              title="Трудно (2)"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Трудно
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-900/30 border-blue-700/50 text-blue-300 hover:bg-blue-800/50 hover:text-blue-200 text-xs px-3 py-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCardProgress(3);
                              }}
                              title="Хорошо (3)"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Хорошо
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-emerald-900/30 border-emerald-700/50 text-emerald-300 hover:bg-emerald-800/50 hover:text-emerald-200 text-xs px-3 py-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCardProgress(4);
                              }}
                              title="Легко (4)"
                            >
                              <Zap className="w-4 h-4 mr-1" />
                              Легко
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Стрелка вправо */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="rounded-full w-14 h-14 shrink-0 bg-emerald-900/30 hover:bg-emerald-800/50 border-0 z-10"
              aria-label="Следующая карточка"
            >
              <ChevronRight className="w-6 h-6 text-emerald-400" />
            </Button>
          </div>

          {/* Управление внизу */}
          <div className="border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-6 px-6 py-5">
              {/* Перезапустить */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                className="gap-2 text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm">Перезапустить</span>
              </Button>

              {/* Прогресс */}
              <div className="flex-1 flex flex-col items-center gap-2 max-w-md">
                <Progress value={progress} className="h-1 bg-slate-800/50" />
                <div className="text-center text-sm text-slate-400">
                  Карточек: {currentIndex + 1} / {flashcards.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}

