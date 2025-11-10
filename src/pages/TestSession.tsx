import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserContext } from "@/contexts/UserContext";
import { Clock, CheckCircle2, XCircle, Languages, Lightbulb, ChevronLeft, ChevronRight, Grid3x3, X, Maximize2, AlertTriangle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isTelegramMiniApp } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { getImageUrl, preloadImage, getCachedImageAspectRatio } from "@/utils/imageUtils";
import { ReportProblemModal } from "@/components/ReportProblemModal";
import { AIExplanationDialog } from "@/components/AIExplanationDialog";

type QuestionData = {
  id: string;
  question_ru: string;
  question_es: string;
  question_en: string;
  image_url: string | null;
  explanation_ru: string | null;
  explanation_es: string | null;
  explanation_en: string | null;
  topics: {
    title_ru: string;
    title_es: string;
  } | null;
  // answer_options table was removed - now optional/not used
  answer_options?: {
    id: string;
    text_ru: string;
    text_es: string;
    text_en: string;
    is_correct: boolean;
    position: number;
  }[];
};

type Answer = {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
};

// Компонент для отображения изображения вопроса с обработкой ошибок
const QuestionImageComponent = ({ imageUrl, compact = false }: { imageUrl: string; compact?: boolean }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      
      // Получаем URL изображения
      const url = getImageUrl(imageUrl);
      
      if (!url) {
        console.warn(`[TestSession] Could not generate URL for image: ${imageUrl}`);
        setHasError(true);
        setIsLoading(false);
        return;
      }

      // Проверяем кэш на наличие aspect ratio
      const cachedAspectRatio = getCachedImageAspectRatio(imageUrl);
      if (cachedAspectRatio !== null) {
        // Изображение уже загружено, используем данные из кэша
        setImageAspectRatio(cachedAspectRatio);
        setImageSrc(url);
        setIsLoading(false);
        return;
      }

      // Загружаем изображение для определения размеров
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        setImageAspectRatio(aspectRatio);
        setImageSrc(url);
        setIsLoading(false);
      };
      img.onerror = () => {
        console.error(`[TestSession] Failed to load image: ${url}`);
        setHasError(true);
        setIsLoading(false);
      };
      img.src = url;
    };

    loadImage();
  }, [imageUrl]);

  // Показываем загрузку только если изображение еще не загрузилось
  if (isLoading) {
    return (
      <div className={`rounded-xl sm:rounded-2xl overflow-hidden border-2 border-border/30 shadow-lg bg-gradient-to-br from-muted/30 to-muted/10 animate-pulse ${compact ? 'w-full' : 'mb-4 sm:mb-6'}`}>
        <div className={`w-full ${compact ? 'h-full min-h-[300px] md:min-h-[400px]' : 'h-48 sm:h-64 md:h-72'} flex items-center justify-center`}>
          <div className="text-muted-foreground text-sm">Загрузка изображения...</div>
        </div>
      </div>
    );
  }

  // Не показываем изображение, если произошла ошибка
  if (hasError || !imageSrc) {
    return null;
  }

  return (
    <>
      <div 
        className={`relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-border/30 shadow-lg bg-gradient-to-br from-muted/30 to-muted/10 ${compact ? 'w-full' : 'mb-4 sm:mb-6'}`}
      >
        <div 
          className="relative w-full group flex items-center justify-center overflow-hidden"
          style={{
            minHeight: compact ? '200px' : 'auto',
            maxHeight: compact ? '500px' : 'none',
          }}
        >
          <img 
            src={imageSrc} 
            alt="Вопрос" 
            className="w-full h-full object-contain cursor-pointer transition-opacity duration-300 hover:opacity-90"
            loading="lazy"
            onClick={() => compact && setIsDialogOpen(true)}
            onError={() => {
              console.error(`[TestSession] Failed to load image: ${imageSrc}`);
              setHasError(true);
            }}
            style={{
              maxWidth: '100%',
              maxHeight: compact ? '500px' : '288px',
              height: 'auto',
              width: 'auto',
              display: 'block',
            }}
          />
          {/* Кнопка увеличения изображения */}
          {compact && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
              className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/85 backdrop-blur-md text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 z-10 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Ampliar imagen</span>
              <span className="sm:hidden">Ampliar</span>
            </button>
          )}
        </div>
      </div>

      {/* Модальное окно с увеличенным изображением */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          hideCloseButton 
          className="w-screen h-screen max-w-none max-h-none m-0 p-0 bg-black/95 border-none"
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img 
              src={imageSrc || ''} 
              alt="Вопрос - увеличенное изображение" 
              className="max-w-full max-h-full w-auto h-auto object-contain"
              style={{
                imageRendering: 'high-quality',
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            />
            <button
              onClick={() => setIsDialogOpen(false)}
              className="absolute top-6 right-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 transition-colors z-20 shadow-2xl"
              aria-label="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const TestSession = () => {
  const { mode, topic, testId } = useParams();
  const navigate = useNavigate();
  const { profileId } = useUserContext();
  const [language, setLanguage] = useState<'ru' | 'es'>('es');
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === "exam" ? 30 * 60 : 0);
  const [loading, setLoading] = useState(true);
  const [showQuestionMap, setShowQuestionMap] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [testInfo, setTestInfo] = useState<{ id: string; title: string } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [showAIExplanation, setShowAIExplanation] = useState(false);
  const isTelegramApp = isTelegramMiniApp();
  
  const handleCloseModal = useCallback(() => {
    if (isClosing) return; // Предотвращаем множественные вызовы
    setIsClosing(true);
    setIsDragging(false);
    setDragStartY(0);
    setDragCurrentY(0);
    // Закрываем сразу без задержки
    setShowQuestionMap(false);
    setTimeout(() => {
      setIsClosing(false);
    }, 100);
  }, [isClosing]);
  
  // Close modal with Escape key
  useEffect(() => {
    if (!showQuestionMap) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQuestionMap]);

  useEffect(() => {
    loadQuestions();
  }, [mode, topic, testId]);

  // Предзагрузка изображений следующих и предыдущих вопросов
  useEffect(() => {
    if (questions.length === 0 || loading) return;

    const preloadNextImages = async () => {
      const imagesToPreload: (string | null | undefined)[] = [];

      // Предзагружаем следующее изображение (если есть)
      if (currentIndex + 1 < questions.length && questions[currentIndex + 1]?.image_url) {
        imagesToPreload.push(questions[currentIndex + 1].image_url);
      }

      // Предзагружаем изображение через один вопрос (для еще более быстрой загрузки)
      if (currentIndex + 2 < questions.length && questions[currentIndex + 2]?.image_url) {
        imagesToPreload.push(questions[currentIndex + 2].image_url);
      }

      // Предзагружаем предыдущее изображение (на случай возврата назад)
      if (currentIndex > 0 && questions[currentIndex - 1]?.image_url) {
        imagesToPreload.push(questions[currentIndex - 1].image_url);
      }

      // Предзагружаем все изображения в фоне
      if (imagesToPreload.length > 0) {
        // Первое изображение предзагружаем сразу
        preloadImage(imagesToPreload[0]).catch(() => {
          // Игнорируем ошибки предзагрузки
        });
        
        // Остальные предзагружаем с небольшой задержкой, чтобы не перегружать сеть
        if (imagesToPreload.length > 1) {
          setTimeout(() => {
            imagesToPreload.slice(1).forEach((url) => {
              preloadImage(url).catch(() => {
                // Игнорируем ошибки предзагрузки
              });
            });
          }, 200);
        }
      }
    };

    // Предзагружаем после небольшой задержки, чтобы текущее изображение загрузилось первым
    // Уменьшена задержка для более быстрой предзагрузки
    const timeoutId = setTimeout(preloadNextImages, 300);

    return () => clearTimeout(timeoutId);
  }, [currentIndex, questions, loading]);

  useEffect(() => {
    if (mode === "exam" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            finishTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, timeLeft]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      // Если это DGT тест, загружаем из dgt_questions
      if (mode === 'dgt' && topic) {
        const category = topic.toUpperCase();
        
        // Загружаем случайные 30 вопросов из DGT базы
        const { data: dgtQuestions, error: dgtError } = await supabase
          .rpc('get_random_dgt_questions', {
            p_category: category,
            p_limit: 30
          });

        if (dgtError) throw dgtError;
        if (!dgtQuestions || dgtQuestions.length === 0) {
          toast.error("Вопросы для этой категории не найдены");
          navigate("/dgt-tests");
          return;
        }

        // Преобразуем DGT вопросы в формат TestSession
        const formattedQuestions = dgtQuestions.map((q: any) => ({
          id: q.id,
          question_ru: q.question_es,
          question_es: q.question_es,
          question_en: q.question_es,
          image_url: q.image_filename || null, // Используем filename, если есть
          explanation_ru: q.explanation_es || 'Нет объяснения',
          explanation_es: q.explanation_es || 'Sin explicación',
          explanation_en: q.explanation_es || 'No explanation',
          topics: {
            title_ru: `DGT Экзамен ${category}`,
            title_es: `Examen DGT ${category}`,
          },
          answer_options: [
            {
              id: `${q.id}_a`,
              question_id: q.id,
              text_ru: q.option_a_es,
              text_es: q.option_a_es,
              text_en: q.option_a_es,
              is_correct: q.correct_answer === 'a',
              position: 1,
            },
            {
              id: `${q.id}_b`,
              question_id: q.id,
              text_ru: q.option_b_es,
              text_es: q.option_b_es,
              text_en: q.option_b_es,
              is_correct: q.correct_answer === 'b',
              position: 2,
            },
            {
              id: `${q.id}_c`,
              question_id: q.id,
              text_ru: q.option_c_es,
              text_es: q.option_c_es,
              text_en: q.option_c_es,
              is_correct: q.correct_answer === 'c',
              position: 3,
            },
          ],
        }));

        setQuestions(formattedQuestions);
        setTestInfo({
          id: `dgt_${category}`,
          title: `DGT Экзамен ${category}`,
        });
      }
      // Если это sequential тест, загружаем вопросы через функцию
      else if (testId) {
        // Получаем информацию о тесте
        const { data: testData, error: testError } = await supabase
          .from("tests")
          .select(`
            *,
            topics (title_ru, title_es)
          `)
          .eq("id", testId)
          .single();

        if (testError) throw testError;
        if (!testData) throw new Error("Test not found");

        setTestInfo({
          id: testData.id,
          title: testData.title_ru,
        });

        // Проверяем доступность теста
        if (profileId) {
          const { data: progressData } = await supabase
            .from("user_test_progress")
            .select("*")
            .eq("user_id", profileId)
            .eq("test_id", testId)
            .single();

          if (progressData && progressData.status === 'locked') {
            toast.error("Этот тест заблокирован. Пройдите предыдущие тесты.");
            navigate("/tests/sequential");
            return;
          }

          // Устанавливаем статус "in_progress" и время начала
          setStartTime(Date.now());
          await supabase
            .from("user_test_progress")
            .upsert({
              user_id: profileId,
              test_id: testId,
              status: 'in_progress',
              started_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,test_id'
            });
        }

        // Загружаем вопросы через функцию
        const { data: questionsData, error: questionsError } = await supabase.rpc(
          'get_test_questions',
          { p_test_id: testId }
        );

        if (questionsError) {
          console.error("Error loading test questions:", questionsError);
          throw questionsError;
        }
        
        if (!questionsData || questionsData.length === 0) {
          toast.error("Вопросы для этого теста не найдены");
          navigate("/tests/sequential");
          return;
        }

        // Преобразуем question_id в id для совместимости
        const questionsWithId = questionsData.map((q: any) => ({
          ...q,
          id: q.question_id || q.id
        }));

        // Загружаем answer_options для каждого вопроса
        const questionIds = questionsWithId.map((q: any) => q.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from("answer_options")
          .select("*")
          .in("question_id", questionIds);

        if (optionsError) throw optionsError;

        // Получаем информацию о теме (уже загружена через join или загружаем отдельно)
        let topicData = testData.topics;
        if (!topicData && testData.topic_id) {
          const { data: loadedTopicData } = await supabase
            .from("topics")
            .select("title_ru, title_es")
            .eq("id", testData.topic_id)
            .single();

          if (loadedTopicData) {
            topicData = loadedTopicData;
          }
        }

        // Объединяем вопросы с опциями и темой
        const questionsWithOptions = questionsWithId.map((q: any) => {
          const options = (optionsData || []).filter((opt: any) => opt.question_id === q.id);
          return {
            ...q,
            answer_options: options,
            topics: topicData ? { title_ru: topicData.title_ru, title_es: topicData.title_es } : null,
          };
        });

        setQuestions(questionsWithOptions);

        // Предзагружаем первые несколько изображений для sequential тестов
        const firstImagesToPreload = questionsWithOptions
          .slice(0, 3)
          .map(q => q.image_url)
          .filter(Boolean) as string[];
        
        if (firstImagesToPreload.length > 0) {
          preloadImage(firstImagesToPreload[0]).catch(() => {});
          firstImagesToPreload.slice(1).forEach((url, index) => {
            setTimeout(() => {
              preloadImage(url).catch(() => {});
            }, (index + 1) * 300);
          });
        }
      } else {
        // Старый способ загрузки вопросов (для обычных тестов)
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      let profileId = null;
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        profileId = profile?.id;
      }

      let query = supabase
        .from("questions_new")
        .select(`
          *,
          topics (title_ru, title_es),
          answer_options (*)
        `);

      // Filter by topic if specified
      if (topic) {
        query = query.eq("topic_id", topic);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Убираем дубликаты вопросов по id (на случай если в базе есть дубликаты)
      const uniqueQuestionsMap = new Map<string, typeof data[0]>();
      (data || []).forEach(q => {
        if (!uniqueQuestionsMap.has(q.id)) {
          uniqueQuestionsMap.set(q.id, q);
        }
      });
      const uniqueQuestions = Array.from(uniqueQuestionsMap.values());

      // Shuffle and limit to 30 questions (не исключаем уже отвеченные)
      const shuffled = uniqueQuestions.sort(() => Math.random() - 0.5);
      const limited = shuffled.slice(0, 30);
      
      setQuestions(limited);

        // Предзагружаем первые несколько изображений для быстрого старта
        const firstImagesToPreload = limited
          .slice(0, 3)
          .map(q => q.image_url)
          .filter(Boolean) as string[];
        
        if (firstImagesToPreload.length > 0) {
          // Предзагружаем первое изображение сразу
          preloadImage(firstImagesToPreload[0]).catch(() => {});
          
          // Остальные предзагружаем с задержкой
          firstImagesToPreload.slice(1).forEach((url, index) => {
            setTimeout(() => {
              preloadImage(url).catch(() => {});
            }, (index + 1) * 300);
          });
        }
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Ошибка загрузки вопросов");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async () => {
    if (!selectedOption) return;

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || !currentQuestion.answer_options) {
      toast.error("Ошибка: вопрос не найден");
      return;
    }
    const selectedAnswer = currentQuestion.answer_options.find(opt => opt.id === selectedOption);
    const isCorrect = selectedAnswer?.is_correct || false;

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      selectedAnswerId: selectedOption,
      isCorrect,
    };

    setAnswers([...(answers || []), newAnswer]);

    // Save user progress
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const progressData = {
            user_id: profile.id,
            question_id: currentQuestion.id,
            is_answered: true,
            is_correct: isCorrect,
            attempts: Math.min(Math.max(1, 1), 10), // Ensure 1-10 range
            last_attempt_at: new Date().toISOString(),
          };
          
          await supabase.from("user_progress").upsert(progressData);
        }
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    if (mode === "practice" || mode === "dgt") {
      setShowExplanation(true);
      if (isCorrect) {
        toast.success("¡Correcto! ✅", { duration: 2000 });
      } else {
        toast.error("Incorrecto ❌", { duration: 2000 });
      }
    } else {
      // Exam mode: no feedback, no early termination, just move to next question
      // Don't finish test early - let user complete all questions
      // Reset selection and move to next question immediately
      setSelectedOption(null);
      setShowExplanation(false);
      nextQuestion();
    }
  };
  
  const jumpToQuestion = (index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    setSelectedOption(null);
    setShowExplanation(false);
    setShowTranslation(false);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      // Always reset explanation, especially for exam mode
      setShowExplanation(false);
      setShowTranslation(false);
    } else {
      finishTest();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setShowTranslation(false);
    }
  };

  const finishTest = async () => {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const timeSpent = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : (mode === "exam" ? 30 * 60 - timeLeft : 0);

    try {
      // Если это sequential тест, обновляем прогресс через функцию
      if (testId && profileId) {
        const { error: progressError } = await supabase.rpc('update_test_progress', {
          p_user_id: profileId,
          p_test_id: testId,
          p_correct_answers: correctCount,
          p_total_questions: questions.length,
          p_time_spent_seconds: timeSpent,
        });

        if (progressError) {
          console.error("Error updating test progress:", progressError);
        }
      }

      // Сохраняем в game_sessions для совместимости
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const duration = timeSpent;
          const sessionData = {
            user_id: profile.id,
            game_type: testId ? "test_sequential" : (mode === "exam" ? "test_exam" : "test_practice"),
            score: Math.min(Math.max(0, score), 100), // Ensure 0-100 range
            total_questions: Math.min(Math.max(1, questions.length), 100), // Ensure 1-100 range
            duration_seconds: Math.min(Math.max(0, duration), 7200), // Ensure 0-7200 range
          };
          
          await supabase.from("game_sessions").insert(sessionData);
        }
      }
    } catch (error) {
      console.error("Error saving results:", error);
    }

    navigate("/test/results", {
      state: {
        questions,
        answers,
        mode: testId ? "sequential" : mode,
        timeSpent,
        testId,
        testInfo,
      },
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Вопросы не найдены</p>
          <Button onClick={() => navigate("/tests")}>
            Вернуться к тестам
          </Button>
        </div>
      </Layout>
    );
  }

  if (!questions.length || !questions[currentIndex]) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Вопрос не найден</p>
          <Button onClick={() => navigate("/tests")}>
            Вернуться к тестам
          </Button>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Вопрос не найден</p>
          <Button onClick={() => navigate("/tests")}>
            Вернуться к тестам
          </Button>
        </div>
      </Layout>
    );
  }

  const progress = questions.length > 0 ? (answers.length / questions.length) * 100 : 0;
  const errorCount = answers.filter((a) => !a.isCorrect).length;
  
  const getQuestionText = (lang: 'ru' | 'es'): string => {
    return lang === 'es' ? currentQuestion.question_es : currentQuestion.question_ru;
  };

  const displayQuestion = showTranslation 
    ? currentQuestion.question_es
    : currentQuestion.question_es;
  const displayTopic = currentQuestion.topics?.title_es || 'Sin tema';
  
  const getExplanation = (lang: 'ru' | 'es'): string | null => {
    return lang === 'es' ? currentQuestion.explanation_es : currentQuestion.explanation_ru;
  };
  
  const displayExplanation = getExplanation('es');
  
  const toggleTranslation = async () => {
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    setShowTranslation(!showTranslation);
    setTimeout(() => setIsTransitioning(false), 150);
  };

  // Sort answer options by position - защита от null/undefined
  const sortedOptions = (currentQuestion.answer_options && Array.isArray(currentQuestion.answer_options))
    ? [...currentQuestion.answer_options].sort((a, b) => (a?.position || 0) - (b?.position || 0))
    : [];

  const handleClose = () => {
    if (window.confirm("Вы уверены, что хотите выйти из экзамена? Ваш прогресс не будет сохранен.")) {
      navigate("/tests");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4 pt-0 pb-1 sm:pt-1 sm:pb-2 md:py-3 max-w-6xl pb-16 md:pb-4">
        {/* Header Row - Title and Close button (browser only) */}
        <div className={cn(
          "mb-2 sm:mb-3 flex items-center justify-between",
          isTelegramApp ? "-mt-[21px] sm:-mt-3" : "-mt-6 sm:-mt-3 md:mt-0"
        )}>
          {/* Large Title - Bigger on mobile */}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-3xl md:text-4xl font-bold text-foreground text-center">
              {testId ? (testInfo?.title || "Тест") : (mode === "exam" ? "Экзамен" : "Практика")}
            </h1>
          </div>
          
          {/* Close button - Only in browser, not Telegram */}
          {!isTelegramApp && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="ml-2 shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>

        {/* Timer and Question Map */}
        <div className="mb-2 sm:mb-4 flex items-center justify-end gap-2 sm:gap-3">
          {mode === "exam" && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-background border-2 border-border/50 shadow-sm hover:shadow-md transition-shadow backdrop-blur-sm">
              <Clock className={`w-5 h-5 sm:w-6 sm:h-6 ${timeLeft < 300 ? "text-destructive" : "text-foreground/70"}`} />
              <span className={`font-mono font-semibold text-sm sm:text-base ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowQuestionMap(true)}
            className="relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-background shadow-sm hover:shadow-md hover:bg-muted/50 transition-all cursor-pointer active:scale-95 backdrop-blur-sm overflow-hidden border-2 border-border/50"
          >
            {/* Animated progress border - используем accent цвет вместо primary */}
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: `conic-gradient(
                  from -90deg,
                  hsl(var(--accent-foreground) / 0.6) 0deg,
                  hsl(var(--accent-foreground) / 0.6) ${(answers.length / questions.length) * 360}deg,
                  transparent ${(answers.length / questions.length) * 360}deg,
                  transparent 360deg
                )`,
                padding: '2px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
            
            {/* Content */}
            <div className="relative z-10 flex items-center gap-2">
              <Grid3x3 className="w-5 h-5 sm:w-6 sm:h-6 text-foreground/70" />
              <span className="font-semibold text-foreground text-sm sm:text-base">
                {currentIndex + 1}/{questions.length}
              </span>
            </div>
          </button>
        </div>


        {/* Question Card */}
        <Card className="p-3 sm:p-4 md:p-6 bg-background border-border/50 shadow-xl backdrop-blur-sm">
          {/* Two-column layout: Image on left, Question & Answers on right */}
          {currentQuestion.image_url ? (
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[350px_1fr] gap-4 md:gap-6">
              {/* Left Column: Image */}
              <div className="w-full md:sticky md:top-4 md:self-start">
                <QuestionImageComponent imageUrl={currentQuestion.image_url} compact />
            </div>

              {/* Right Column: Question Text & Answers */}
              <div className="flex flex-col">
                {/* Question Text */}
                <div className="mb-4 sm:mb-6">
                  <div className="p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-card border-2 border-border/50 shadow-sm">
                    <h2 className={`text-base sm:text-lg md:text-xl font-semibold leading-relaxed sm:leading-relaxed text-foreground whitespace-pre-line transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                      {showTranslation ? currentQuestion.question_ru : currentQuestion.question_es}
                    </h2>
                  </div>
                </div>

                {/* Translation & Explanation Buttons (Practice Only) and Report Button */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  {mode === "practice" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleTranslation}
                        className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3"
                      >
                        <Languages className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                        <span className="hidden sm:inline">{showTranslation ? "Español" : "Русский перевод"}</span>
                        <span className="sm:hidden">{showTranslation ? "ES" : "RU"}</span>
                      </Button>
                      {displayExplanation && !showExplanation && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowExplanation(true)}
                          className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3"
                        >
                          <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                          Подсказка
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReportModal(true)}
                    className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                  >
                    <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                    <span className="hidden sm:inline">{language === "es" ? "Reportar problema" : "Сообщить о проблеме"}</span>
                    <span className="sm:hidden">{language === "es" ? "Reportar" : "Проблема"}</span>
                  </Button>
                </div>

                {/* Answer Options */}
                <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
                  {sortedOptions.map((option) => {
                    const isSelected = selectedOption === option.id;
                    const isCorrect = option.is_correct;
                    const showResult = showExplanation && mode === "practice";
                    const displayText = showTranslation ? option.text_ru : option.text_es;

                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (mode === "exam") {
                            setSelectedOption(option.id);
                          } else if (!showExplanation) {
                            setSelectedOption(option.id);
                          }
                        }}
                        disabled={mode === "practice" && showExplanation}
                        className={`
                          w-full text-left p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 font-medium
                          ${showResult
                            ? isCorrect
                              ? "border-emerald-500 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 shadow-xl shadow-emerald-500/25 animate-fade-in"
                              : isSelected
                              ? "border-red-500 bg-gradient-to-r from-red-500/15 to-red-500/5 shadow-xl shadow-red-500/25 animate-fade-in"
                              : "border-border/20 opacity-40"
                            : isSelected
                            ? "border-accent bg-gradient-to-r from-accent/15 to-accent/5 shadow-xl shadow-accent/30 scale-[1.02] ring-2 ring-accent/20"
                            : "border-border/40 hover:border-accent/60 hover:bg-gradient-to-r hover:from-accent/5 hover:to-transparent hover:scale-[1.01] hover:shadow-lg"
                          }
                          ${!showExplanation && "cursor-pointer active:scale-[0.99]"}
                        `}
                      >
                        <div className="flex items-center justify-between gap-2 sm:gap-3">
                          <span className={`flex-1 text-xs sm:text-sm md:text-base transition-opacity duration-300 leading-relaxed ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                            {displayText}
                          </span>
                          {showResult && isCorrect && (
                            <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500/20 animate-scale-in shrink-0">
                              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          )}
                          {showResult && isSelected && !isCorrect && (
                            <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500/20 animate-scale-in shrink-0">
                              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation - Only in practice mode */}
                {mode === "practice" && showExplanation && (showTranslation ? currentQuestion.explanation_ru : currentQuestion.explanation_es) && (
                  <div className="mb-3 sm:mb-4 space-y-2">
                    <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-accent/10 border-2 border-accent/30 shadow-lg animate-fade-in">
                      <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/20 shrink-0 shadow-md">
                          <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-accent-foreground uppercase tracking-wide">
                            {showTranslation ? "Объяснение:" : "Explicación:"}
                          </p>
                          <p className={`text-xs sm:text-sm md:text-base leading-relaxed transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                            {showTranslation ? currentQuestion.explanation_ru : currentQuestion.explanation_es}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* AI Explanation Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAIExplanation(true)}
                      className="w-full text-xs sm:text-sm gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                      {showTranslation ? "Спросить AI: объясни по-другому" : "Preguntar a IA: explica de otra manera"}
                    </Button>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-2">
                  {currentIndex > 0 && mode === "practice" && (
                    <Button 
                      onClick={prevQuestion} 
                      variant="outline"
                      className="w-auto shrink-0 h-10 sm:h-11 px-3 sm:px-4"
                      size="sm"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Назад</span>
                      <span className="sm:hidden">←</span>
                    </Button>
                  )}
                  {mode === "practice" && showExplanation ? (
                    <Button 
                      onClick={nextQuestion} 
                      className="flex-1 font-bold shadow-2xl text-sm sm:text-base md:text-lg bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 h-10 sm:h-11 md:h-12"
                    >
                      {currentIndex < questions.length - 1 ? (
                        <>
                          <span className="hidden sm:inline">Siguiente</span>
                          <span className="sm:hidden">Siguiente</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Finalizar ✓</span>
                          <span className="sm:hidden">Finalizar</span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleAnswer} 
                      disabled={!selectedOption} 
                      className="flex-1 font-bold shadow-2xl text-sm sm:text-base md:text-lg bg-accent text-accent-foreground hover:bg-accent/90 h-10 sm:h-11 md:h-12"
                    >
                      Responder
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Layout без изображения (вертикальный)
            <>
          {/* Question Text */}
              <div className="mb-4 sm:mb-6">
                <div className="p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-card border-2 border-border/50 shadow-sm">
            <h2 className={`text-base sm:text-lg md:text-xl font-semibold leading-relaxed sm:leading-relaxed text-foreground whitespace-pre-line transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {showTranslation ? currentQuestion.question_ru : currentQuestion.question_es}
            </h2>
                </div>
          </div>

          {/* Translation & Explanation Buttons (Practice Only) */}
          {mode === "practice" && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTranslation}
                className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3"
              >
                <Languages className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                <span className="hidden sm:inline">{showTranslation ? "Español" : "Русский перевод"}</span>
                <span className="sm:hidden">{showTranslation ? "ES" : "RU"}</span>
              </Button>
              {displayExplanation && !showExplanation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExplanation(true)}
                  className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3"
                >
                  <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                  Подсказка
                </Button>
              )}
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
            {sortedOptions.map((option) => {
              const isSelected = selectedOption === option.id;
              const isCorrect = option.is_correct;
              const showResult = showExplanation && mode === "practice";
              const displayText = showTranslation ? option.text_ru : option.text_es;

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    if (mode === "exam") {
                      setSelectedOption(option.id);
                    } else if (!showExplanation) {
                      setSelectedOption(option.id);
                    }
                  }}
                  disabled={mode === "practice" && showExplanation}
                  className={`
                    w-full text-left p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 font-medium
                    ${showResult
                      ? isCorrect
                        ? "border-emerald-500 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 shadow-xl shadow-emerald-500/25 animate-fade-in"
                        : isSelected
                        ? "border-red-500 bg-gradient-to-r from-red-500/15 to-red-500/5 shadow-xl shadow-red-500/25 animate-fade-in"
                        : "border-border/20 opacity-40"
                      : isSelected
                          ? "border-accent bg-gradient-to-r from-accent/15 to-accent/5 shadow-xl shadow-accent/30 scale-[1.02] ring-2 ring-accent/20"
                          : "border-border/40 hover:border-accent/60 hover:bg-gradient-to-r hover:from-accent/5 hover:to-transparent hover:scale-[1.01] hover:shadow-lg"
                    }
                    ${!showExplanation && "cursor-pointer active:scale-[0.99]"}
                  `}
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <span className={`flex-1 text-xs sm:text-sm md:text-base transition-opacity duration-300 leading-relaxed ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                      {displayText}
                    </span>
                    {showResult && isCorrect && (
                      <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500/20 animate-scale-in shrink-0">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500/20 animate-scale-in shrink-0">
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation - Only in practice mode */}
          {mode === "practice" && showExplanation && (showTranslation ? currentQuestion.explanation_ru : currentQuestion.explanation_es) && (
            <div className="mb-3 sm:mb-4 space-y-2">
              <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-accent/10 border-2 border-accent/30 shadow-lg animate-fade-in">
                <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/20 shrink-0 shadow-md">
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-accent-foreground uppercase tracking-wide">
                      {showTranslation ? "Объяснение:" : "Explicación:"}
                    </p>
                    <p className={`text-xs sm:text-sm md:text-base leading-relaxed transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                      {showTranslation ? currentQuestion.explanation_ru : currentQuestion.explanation_es}
                    </p>
                  </div>
                </div>
              </div>
              {/* AI Explanation Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIExplanation(true)}
                className="w-full text-xs sm:text-sm gradient-primary text-primary-foreground hover:opacity-90"
              >
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                {showTranslation ? "Спросить AI: объясни по-другому" : "Preguntar a IA: explica de otra manera"}
              </Button>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            {currentIndex > 0 && mode === "practice" && (
              <Button 
                onClick={prevQuestion} 
                variant="outline"
                className="w-auto shrink-0 h-10 sm:h-11 px-3 sm:px-4"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Назад</span>
                <span className="sm:hidden">←</span>
              </Button>
            )}
            {mode === "practice" && showExplanation ? (
              <Button 
                onClick={nextQuestion} 
                className="flex-1 font-bold shadow-2xl text-sm sm:text-base md:text-lg bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 h-10 sm:h-11 md:h-12"
              >
                {currentIndex < questions.length - 1 ? (
                  <>
                    <span className="hidden sm:inline">Siguiente</span>
                    <span className="sm:hidden">Siguiente</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Finalizar ✓</span>
                    <span className="sm:hidden">Finalizar</span>
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleAnswer} 
                disabled={!selectedOption} 
                    className="flex-1 font-bold shadow-2xl text-sm sm:text-base md:text-lg bg-accent text-accent-foreground hover:bg-accent/90 h-10 sm:h-11 md:h-12"
              >
                Responder
              </Button>
            )}
          </div>
            </>
          )}
        </Card>

        {/* Question Map Bottom Sheet */}
        {showQuestionMap && (
          <>
            {/* Backdrop */}
            <div 
              className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
                isClosing ? 'opacity-0' : 'opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && !isClosing) {
                  handleCloseModal();
                }
              }}
            />
            {/* Bottom Sheet - Higher z-index than navbar (z-50) and padding for navbar on mobile only */}
            <div 
              className={`fixed left-0 right-0 z-[100] bg-card border-t border-border rounded-t-2xl sm:rounded-t-3xl shadow-2xl ${
                !isDragging && !isClosing ? 'transition-transform duration-300 ease-out' : isClosing ? 'transition-transform duration-300 ease-in' : ''
              } ${
                !isClosing && !isDragging ? 'translate-y-0' : 'translate-y-full'
              }`}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                bottom: isTelegramApp ? '75px' : '0px', // Отступ только на мобильных (60px navbar + 15px запас для легенды)
                maxHeight: isTelegramApp ? 'calc(90vh - 75px)' : '90vh',
                height: 'auto',
                transform: isDragging && dragCurrentY > dragStartY 
                  ? `translateY(${dragCurrentY - dragStartY}px)` 
                  : undefined
              }}
              onTouchStart={(e) => {
                if (isClosing) return;
                const touch = e.touches[0];
                if (touch) {
                  // Начинаем драг только если свайп начинается с верхней части модального окна
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const touchY = touch.clientY;
                  if (touchY - rect.top < 100) { // Только верхние 100px для начала драга
                    setIsDragging(true);
                    setDragStartY(touch.clientY);
                    setDragCurrentY(touch.clientY);
                  }
                }
              }}
              onTouchMove={(e) => {
                if (isDragging && !isClosing) {
                  e.preventDefault();
                  const touch = e.touches[0];
                  if (touch) {
                    const deltaY = touch.clientY - dragStartY;
                    if (deltaY > 0) {
                      setDragCurrentY(touch.clientY);
                    }
                  }
                }
              }}
              onTouchEnd={(e) => {
                if (isDragging && !isClosing) {
                  const dragDistance = dragCurrentY - dragStartY;
                  if (dragDistance > 50) {
                    handleCloseModal();
                  } else {
                    setIsDragging(false);
                    setDragStartY(0);
                    setDragCurrentY(0);
                  }
                }
              }}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="px-4 sm:px-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">Карта вопросов</h2>
                  <div className="flex items-center gap-2">
                    {/* Escape hint */}
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted/50">
                      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background border border-border rounded">Esc</kbd>
                      <span>закрыть</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseModal();
                      }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      aria-label="Закрыть"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content - Auto height based on content with padding for legend */}
              <div className="overflow-y-auto px-4 sm:px-6 py-4 pb-24" style={{ maxHeight: isTelegramApp ? 'calc(90vh - 220px)' : 'calc(90vh - 140px)' }}>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-3">
                  {questions.map((_, idx) => {
                    const answer = answers.find((a) => a.questionId === questions[idx].id);
                    const isAnswered = answer !== undefined;
                    const isCurrent = idx === currentIndex;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          jumpToQuestion(idx);
                          handleCloseModal();
                        }}
                        className={`
                          aspect-square w-full rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200
                          ${isCurrent 
                            ? "ring-2 ring-accent ring-offset-2 scale-110 shadow-lg z-10 bg-accent text-accent-foreground" 
                            : "hover:scale-105"
                          }
                          ${!isAnswered 
                            ? "bg-muted/30 text-muted-foreground border border-border/50 hover:border-muted-foreground/30 hover:bg-muted/50" 
                            : mode === "exam"
                              ? "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-2 border-blue-500/50 hover:bg-blue-500/30"
                              : answer.isCorrect
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500/50 hover:bg-emerald-500/30"
                                : "bg-red-500/20 text-red-700 dark:text-red-400 border-2 border-red-500/50 hover:bg-red-500/30"
                          }
                        `}
                        title={`Вопрос ${idx + 1}${isAnswered ? (mode === "exam" ? " (отвечен)" : (answer.isCorrect ? " (правильно)" : " (неправильно)")) : ""}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-border bg-muted/50" />
                      <span>Не отвечен</span>
                    </div>
                    {mode === "exam" ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border-2 border-blue-500/50 bg-blue-500/20" />
                        <span>Отвечен</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border-2 border-emerald-500/50 bg-emerald-500/20" />
                          <span>Правильно</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border-2 border-red-500/50 bg-red-500/20" />
                          <span>Неправильно</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded ring-2 ring-accent ring-offset-2 bg-accent text-accent-foreground" />
                      <span>Текущий</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Report Problem Modal */}
      <ReportProblemModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        questionId={currentQuestion.id}
        questionText={showTranslation ? currentQuestion.question_ru : currentQuestion.question_es}
      />

      {/* AI Explanation Dialog */}
      {(mode === "practice" || mode === "dgt") && showExplanation && (
        <AIExplanationDialog
          open={showAIExplanation}
          onClose={() => setShowAIExplanation(false)}
          question={showTranslation ? currentQuestion.question_ru : currentQuestion.question_es}
          correctAnswer={
            sortedOptions.find((opt) => opt.is_correct)?.[showTranslation ? 'text_ru' : 'text_es'] || ''
          }
          userAnswer={
            sortedOptions.find((opt) => opt.id === selectedOption)?.[showTranslation ? 'text_ru' : 'text_es']
          }
          isCorrect={sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false}
          explanation={showTranslation ? currentQuestion.explanation_ru : currentQuestion.explanation_es}
          topic={currentQuestion.topics?.[showTranslation ? 'title_ru' : 'title_es']}
          imageUrl={currentQuestion.image_url}
        />
      )}
    </Layout>
  );
};

export default TestSession;
