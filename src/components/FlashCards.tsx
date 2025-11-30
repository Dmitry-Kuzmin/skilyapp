import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Download, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
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

interface FlashCardsProps {
  topic: number; // Номер темы
  language?: 'ru' | 'es' | 'eng'; // Язык интерфейса
}

export function FlashCards({ topic, language = 'ru' }: FlashCardsProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlashcards();
  }, [topic]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .eq("topic", topic)
        .order("id", { ascending: true });

      if (error) throw error;
      setFlashcards(data || []);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error("Error loading flashcards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
    setIsFlipped(false);
  }, [flashcards.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
    setIsFlipped(false);
  }, [flashcards.length]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Обработка клавиатуры
  useEffect(() => {
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
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleFlip, handlePrevious, handleNext]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Загрузка карточек...</div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <HelpCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Нет карточек для этой темы</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const getQuestion = () => {
    switch (language) {
      case 'es':
        return currentCard.question_es;
      case 'eng':
        return currentCard.question_eng;
      default:
        return currentCard.question_ru;
    }
  };

  const getAnswer = () => {
    switch (language) {
      case 'es':
        return currentCard.answer_es;
      case 'eng':
        return currentCard.answer_eng;
      default:
        return currentCard.answer_ru;
    }
  };

  return (
    <div className="space-y-6">
      {/* Инструкции */}
      <div className="text-center text-sm text-muted-foreground">
        Переворачивайте карточки, нажимая Пробел, и с помощью стрелок переключайтесь между ними
      </div>

      {/* Основная карточка */}
      <div className="flex items-center justify-center gap-4">
        {/* Стрелка влево */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="rounded-full w-12 h-12"
          aria-label="Предыдущая карточка"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        {/* Карточка */}
        <div className="flex-1 max-w-2xl">
          <div
            className="relative h-[400px] cursor-pointer"
            style={{
              perspective: "1000px",
            }}
            onClick={handleFlip}
          >
            <div
              className="relative w-full h-full transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Лицевая сторона (вопрос) */}
              <Card
                className={cn(
                  "absolute inset-0 p-8 flex items-center justify-center",
                  "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
                  "border-2 border-slate-700 hover:border-slate-600"
                )}
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              >
                <div className="text-center space-y-4">
                  <p className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                    {getQuestion()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlip();
                    }}
                  >
                    Показать ответ
                  </Button>
                </div>
              </Card>

              {/* Обратная сторона (ответ) */}
              <Card
                className={cn(
                  "absolute inset-0 p-8 flex items-center justify-center",
                  "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
                  "border-2 border-slate-700 hover:border-slate-600"
                )}
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="text-center space-y-4">
                  <p className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                    {getAnswer()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlip();
                    }}
                  >
                    Показать вопрос
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Стрелка вправо */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="rounded-full w-12 h-12"
          aria-label="Следующая карточка"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Управление */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleRestart}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Перезапустить
        </Button>

        <div className="flex-1 space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="text-center text-sm text-muted-foreground">
            Карточек: {currentIndex + 1} / {flashcards.length}
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            // Экспорт карточек (можно реализовать позже)
            console.log("Export flashcards");
          }}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Скачать
        </Button>
      </div>
    </div>
  );
}

