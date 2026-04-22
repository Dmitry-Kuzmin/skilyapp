import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  X,
  Trophy,
  CreditCard,
  Settings,
  Play,
  RotateCcw,
  Volume2,
  Image as ImageIcon,
  BookOpen,
  Zap,
  Star,
  TrendingUp,
  Clock,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import Confetti from "react-confetti";
import { useUserContext } from "@/contexts/UserContext";
import { updateTermProgress } from "@/lib/termProgress";
import { cn } from "@/lib/utils";
import { useShakeDetector } from "@/hooks/useShakeDetector";

interface LanguageTerm {
  id: string;
  term_es: string;
  term_ru: string;
  description_es?: string;
  description_ru?: string;
  difficulty?: string;
  image_url?: string | null;
  audio_url?: string | null;
}

interface FlashCard {
  term: LanguageTerm;
  isFlipped: boolean;
  direction: 'es-ru' | 'ru-es';
  masteryLevel: number;
  timesPracticed: number;
}

interface GameSettings {
  cardCount: number; // 10, 20, 50, 0 (all)
  direction: 'es-ru' | 'ru-es' | 'mixed';
  difficulty: 'all' | 'Лёгкая' | 'Средняя' | 'Сложная';
  progressFilter: 'all' | 'new' | 'in-progress' | 'studied';
  showDescription: boolean;
  showImages: boolean;
  showAudio: boolean;
  autoFlip: boolean; // Автоматический переворот после показа
  autoFlipDelay: number; // Задержка в секундах
}

interface GameStats {
  currentCard: number;
  correctCount: number;
  incorrectCount: number;
  streak: number;
  maxStreak: number;
  startTime: number;
  totalTime: number;
}

const FlashCardsGame = () => {
  const navigate = useNavigate();

  const { profileId } = useUserContext();

  // Состояния
  const [terms, setTerms] = useState<LanguageTerm[]>([]);
  const [userProgress, setUserProgress] = useState<Map<string, { mastery_level: number; times_practiced: number }>>(new Map());
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  // Настройки игры
  const [settings, setSettings] = useState<GameSettings>({
    cardCount: 20,
    direction: 'mixed',
    difficulty: 'all',
    progressFilter: 'all',
    showDescription: true,
    showImages: true,
    showAudio: false,
    autoFlip: false,
    autoFlipDelay: 3,
  });

  // Статистика
  const [stats, setStats] = useState<GameStats>({
    currentCard: 0,
    correctCount: 0,
    incorrectCount: 0,
    streak: 0,
    maxStreak: 0,
    startTime: 0,
    totalTime: 0,
  });

  // Ответы пользователя
  const [userAnswers, setUserAnswers] = useState<Map<number, 'correct' | 'incorrect'>>(new Map());
  const [isAnswering, setIsAnswering] = useState(false);

  // Refs
  const autoFlipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const confettiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Загрузка терминов и прогресса
  useEffect(() => {
    loadTermsAndProgress();
  }, []);

  // Автопереворот карточки
  useEffect(() => {
    if (isGameActive && !isGameOver && settings.autoFlip && isFlipped && currentCardIndex < cards.length) {
      autoFlipTimerRef.current = setTimeout(() => {
        handleNextCard();
      }, settings.autoFlipDelay * 1000);

      return () => {
        if (autoFlipTimerRef.current) {
          clearTimeout(autoFlipTimerRef.current);
        }
      };
    }
  }, [isFlipped, settings.autoFlip, currentCardIndex, cards.length, isGameActive, isGameOver]);

  // Очистка всех таймеров и ресурсов при размонтировании
  useEffect(() => {
    return () => {
      if (autoFlipTimerRef.current) {
        clearTimeout(autoFlipTimerRef.current);
      }
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadTermsAndProgress = async () => {
    try {
      // Загружаем все термины (фильтрация будет при подготовке карточек)
      const { data: termsData, error: termsError } = await supabase
        .from("language_terms")
        .select("id, term_es, term_ru, description_es, description_ru, difficulty, image_url, audio_url");

      if (termsError) {
        toast.error(`Не удалось загрузить термины: ${termsError.message}`);
        return;
      }

      if (!termsData || termsData.length === 0) {
        toast.error("Не найдено терминов по выбранным фильтрам");
        return;
      }

      setTerms(termsData);

      // Загружаем прогресс пользователя
      if (profileId) {
        const { data: progressData } = await supabase
          .from("user_term_progress")
          .select("term_id, mastery_level, times_practiced")
          .eq("user_id", profileId);

        if (progressData) {
          const progressMap = new Map(
            progressData.map(p => [p.term_id, { mastery_level: p.mastery_level, times_practiced: p.times_practiced }])
          );
          setUserProgress(progressMap);
        }
      }
    } catch (err: any) {
      console.error("Error loading terms:", err);
      toast.error(`Произошла ошибка: ${err?.message || "Неизвестная ошибка"}`);
    }
  };


  // Алгоритм Spaced Repetition для выбора карточек
  const selectCardsWithSpacedRepetition = (terms: LanguageTerm[], count: number): LanguageTerm[] => {
    // Разделяем термины по приоритету
    const priorityTerms: LanguageTerm[] = [];
    const mediumTerms: LanguageTerm[] = [];
    const lowTerms: LanguageTerm[] = [];

    terms.forEach(term => {
      const progress = userProgress.get(term.id);
      const masteryLevel = progress?.mastery_level || 0;
      const timesPracticed = progress?.times_practiced || 0;

      if (timesPracticed === 0 || masteryLevel < 30) {
        priorityTerms.push(term); // Новые или плохо изученные
      } else if (masteryLevel < 70) {
        mediumTerms.push(term); // В процессе изучения
      } else {
        lowTerms.push(term); // Хорошо изученные
      }
    });

    // Выбираем карточки с приоритетом
    const selected: LanguageTerm[] = [];

    // 50% приоритетных терминов
    const priorityCount = Math.min(Math.floor(count * 0.5), priorityTerms.length);
    selected.push(...shuffleArray(priorityTerms).slice(0, priorityCount));

    // 30% средних терминов
    const mediumCount = Math.min(Math.floor(count * 0.3), mediumTerms.length);
    selected.push(...shuffleArray(mediumTerms).slice(0, mediumCount));

    // 20% хорошо изученных (для повторения)
    const lowCount = Math.min(count - selected.length, lowTerms.length);
    selected.push(...shuffleArray(lowTerms).slice(0, lowCount));

    // Если не хватило, добавляем случайные
    if (selected.length < count) {
      const remaining = shuffleArray(terms.filter(t => !selected.includes(t))).slice(0, count - selected.length);
      selected.push(...remaining);
    }

    return selected.slice(0, count);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startGame = () => {
    if (terms.length === 0) {
      toast.error("Загрузите термины перед началом игры");
      return;
    }

    // Подготавливаем карточки синхронно
    let filteredTerms = [...terms];

    // Фильтр по сложности
    if (settings.difficulty !== 'all') {
      filteredTerms = filteredTerms.filter(term => term.difficulty === settings.difficulty);
    }

    // Фильтр по прогрессу
    if (profileId && settings.progressFilter !== 'all') {
      filteredTerms = filteredTerms.filter(term => {
        const progress = userProgress.get(term.id);
        const timesPracticed = progress?.times_practiced || 0;

        switch (settings.progressFilter) {
          case 'new':
            return timesPracticed === 0;
          case 'in-progress':
            return timesPracticed > 0 && timesPracticed < 3;
          case 'studied':
            return timesPracticed >= 3;
          default:
            return true;
        }
      });
    }

    // Если после фильтрации нет терминов, используем все
    if (filteredTerms.length === 0) {
      filteredTerms = [...terms];
    }

    // Ограничиваем количество карточек
    let selectedTerms = filteredTerms;
    if (settings.cardCount > 0 && filteredTerms.length > settings.cardCount) {
      selectedTerms = selectCardsWithSpacedRepetition(filteredTerms, settings.cardCount);
    }

    // Создаем карточки
    const newCards: FlashCard[] = selectedTerms.map(term => {
      const progress = userProgress.get(term.id);
      const direction = settings.direction === 'mixed'
        ? (Math.random() > 0.5 ? 'es-ru' : 'ru-es')
        : settings.direction;

      return {
        term,
        isFlipped: false,
        direction,
        masteryLevel: progress?.mastery_level || 0,
        timesPracticed: progress?.times_practiced || 0,
      };
    });

    // Перемешиваем карточки
    const shuffled = shuffleArray(newCards);

    if (shuffled.length === 0) {
      toast.error("Не удалось подготовить карточки. Попробуйте изменить фильтры.");
      return;
    }

    setCards(shuffled);
    setIsGameActive(true);
    setShowSettings(false);
    setIsGameOver(false);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsAnswering(false);
    setUserAnswers(new Map());
    setStats({
      currentCard: 0,
      correctCount: 0,
      incorrectCount: 0,
      streak: 0,
      maxStreak: 0,
      startTime: Date.now(),
      totalTime: 0,
    });
  };

  const flipCard = () => {
    if (isAnswering) return;
    setIsFlipped(!isFlipped);
    sounds.flip();
    haptics.light();
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (isAnswering || currentCardIndex >= cards.length) return;

    setIsAnswering(true);
    const currentCard = cards[currentCardIndex];

    // Сохраняем ответ
    setUserAnswers(prev => new Map(prev).set(currentCardIndex, isCorrect ? 'correct' : 'incorrect'));

    // Обновляем статистику
    setStats(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        ...prev,
        correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
        incorrectCount: isCorrect ? prev.incorrectCount : prev.incorrectCount + 1,
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
      };
    });

    // Обновляем прогресс термина
    if (profileId && currentCard.term.id) {
      await updateTermProgress(profileId, currentCard.term.id, isCorrect);
    }

    // Звуки и вибрация
    if (isCorrect) {
      sounds.success();
      haptics.success();
    } else {
      sounds.error();
      haptics.error();
    }

    // Переход к следующей карточке через 1.5 секунды
    setTimeout(() => {
      handleNextCard();
    }, 1500);
  };

  const handleNextCard = () => {
    if (currentCardIndex + 1 >= cards.length) {
      endGame();
      return;
    }

    setCurrentCardIndex(prev => prev + 1);
    setIsFlipped(false);
    setIsAnswering(false);
    setStats(prev => ({
      ...prev,
      currentCard: prev.currentCard + 1,
    }));
  };

  // 🥚 Easter egg: встряхни телефон → случайная карточка
  useShakeDetector(() => {
    if (!isGameActive || isGameOver || cards.length < 2) return;
    const randomIndex = Math.floor(Math.random() * cards.length);
    setCurrentCardIndex(randomIndex);
    setIsFlipped(false);
    setIsAnswering(false);
    setStats(prev => ({ ...prev, currentCard: randomIndex + 1 }));
    haptics.boostActivated();
    toast('🎲 Случайная карточка!', { duration: 1500 });
  }, { threshold: 18, cooldown: 2000 });

  const endGame = async () => {
    setIsGameActive(false);
    setIsGameOver(true);

    // Используем функциональное обновление для получения актуальных значений
    setStats(prev => {
      const totalTime = Math.floor((Date.now() - prev.startTime) / 1000);
      const accuracy = prev.correctCount + prev.incorrectCount > 0
        ? (prev.correctCount / (prev.correctCount + prev.incorrectCount)) * 100
        : 0;

      // Конфетти при хорошем результате
      if (accuracy >= 80 && prev.correctCount >= 10) {
        sounds.victory();
        haptics.victory();
        setShowConfetti(true);
        confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 5000);
      }

      // Сохраняем сессию
      if (profileId) {
        const sessionData = {
          user_id: profileId,
          game_type: "flashcards",
          score: prev.correctCount,
          total_questions: cards.length,
          duration_seconds: totalTime,
        };

        supabase.from("game_sessions").insert(sessionData).then(({ error }) => {
          if (error) {
            console.error("Failed to save game session:", error);
          }
        });
      }

      return { ...prev, totalTime };
    });
  };

  const restartGame = () => {
    setIsGameOver(false);
    setShowSettings(true);
    setCards([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setUserAnswers(new Map());
  };

  // Swipe жесты для мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeStartRef.current) return;

    const swipeEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = swipeEnd.x - swipeStartRef.current.x;
    const deltaY = swipeEnd.y - swipeStartRef.current.y;

    // Горизонтальный свайп для переворота
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Свайп вправо - переворот
        flipCard();
      }
    }

    swipeStartRef.current = null;
  };

  // Клавиатурные горячие клавиши
  useEffect(() => {
    if (!isGameActive || isGameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswering) return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (!isFlipped) {
            flipCard();
          }
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          if (isFlipped) {
            handleAnswer(true);
          }
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          if (isFlipped) {
            handleAnswer(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameActive, isGameOver, isFlipped, isAnswering]);

  // Воспроизведение аудио
  const playAudio = () => {
    const currentCard = cards[currentCardIndex];
    if (!currentCard || !currentCard.term.audio_url) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(currentCard.term.audio_url);
    audioRef.current.play().catch(err => {
      console.error("Error playing audio:", err);
    });
  };

  const currentCard = cards[currentCardIndex];
  const progress = currentCardIndex > 0 ? (currentCardIndex / cards.length) * 100 : 0;
  const accuracy = stats.correctCount + stats.incorrectCount > 0
    ? Math.round((stats.correctCount / (stats.correctCount + stats.incorrectCount)) * 100)
    : 0;

  return (
    <Layout>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      <div className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        {!isGameActive && (
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/games")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
        )}

        {/* Title */}
        {!isGameActive && (
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">Флэш-карточки</h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Классический метод изучения с карточками
            </p>
          </div>
        )}

        {/* Настройки перед игрой */}
        {showSettings && !isGameActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Настройки игры</h2>
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>

              <div className="space-y-6">
                {/* Количество карточек */}
                <div className="space-y-2">
                  <Label>Количество карточек</Label>
                  <Select
                    value={settings.cardCount.toString()}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, cardCount: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 карточек</SelectItem>
                      <SelectItem value="20">20 карточек</SelectItem>
                      <SelectItem value="50">50 карточек</SelectItem>
                      <SelectItem value="0">Все доступные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Направление перевода */}
                <div className="space-y-2">
                  <Label>Направление перевода</Label>
                  <Select
                    value={settings.direction}
                    onValueChange={(value: 'es-ru' | 'ru-es' | 'mixed') =>
                      setSettings(prev => ({ ...prev, direction: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es-ru">Испанский → Русский</SelectItem>
                      <SelectItem value="ru-es">Русский → Испанский</SelectItem>
                      <SelectItem value="mixed">Смешанно</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Сложность */}
                <div className="space-y-2">
                  <Label>Сложность</Label>
                  <Select
                    value={settings.difficulty}
                    onValueChange={(value: 'all' | 'Лёгкая' | 'Средняя' | 'Сложная') =>
                      setSettings(prev => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="Лёгкая">Лёгкая</SelectItem>
                      <SelectItem value="Средняя">Средняя</SelectItem>
                      <SelectItem value="Сложная">Сложная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Фильтр по прогрессу */}
                {profileId && (
                  <div className="space-y-2">
                    <Label>Фильтр по прогрессу</Label>
                    <Select
                      value={settings.progressFilter}
                      onValueChange={(value: 'all' | 'new' | 'in-progress' | 'studied') =>
                        setSettings(prev => ({ ...prev, progressFilter: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все термины</SelectItem>
                        <SelectItem value="new">Новые</SelectItem>
                        <SelectItem value="in-progress">В процессе</SelectItem>
                        <SelectItem value="studied">Изученные</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Дополнительные опции */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Показывать описание</Label>
                      <p className="text-xs text-muted-foreground">Отображать описание термина на обратной стороне</p>
                    </div>
                    <Switch
                      checked={settings.showDescription}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showDescription: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Показывать изображения</Label>
                      <p className="text-xs text-muted-foreground">Отображать изображения терминов (если доступны)</p>
                    </div>
                    <Switch
                      checked={settings.showImages}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showImages: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Воспроизводить аудио</Label>
                      <p className="text-xs text-muted-foreground">Автоматически воспроизводить произношение</p>
                    </div>
                    <Switch
                      checked={settings.showAudio}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showAudio: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Автопереворот</Label>
                      <p className="text-xs text-muted-foreground">Автоматически переворачивать карточку</p>
                    </div>
                    <Switch
                      checked={settings.autoFlip}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoFlip: checked }))}
                    />
                  </div>

                  {settings.autoFlip && (
                    <div className="space-y-2 pl-6">
                      <Label>Задержка автопереворота (сек)</Label>
                      <Select
                        value={settings.autoFlipDelay.toString()}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, autoFlipDelay: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 секунды</SelectItem>
                          <SelectItem value="3">3 секунды</SelectItem>
                          <SelectItem value="5">5 секунд</SelectItem>
                          <SelectItem value="10">10 секунд</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={startGame}
                className="w-full"
                size="lg"
                disabled={terms.length === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                Начать игру
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Игровой экран */}
        {isGameActive && !isGameOver && currentCard && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Статистика */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  {currentCardIndex + 1} / {cards.length}
                </Badge>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-sm font-semibold text-success">{stats.correctCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">{stats.incorrectCount}</span>
                </div>
                {stats.streak > 0 && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-warning" />
                    <span className="text-sm font-semibold text-warning">Серия: {stats.streak}</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Точность: {accuracy}%
              </div>
            </div>

            {/* Прогресс-бар */}
            <Progress value={progress} className="h-2" />

            {/* Карточка */}
            <motion.div
              key={currentCardIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <Card
                className={cn(
                  "relative h-[400px] md:h-[500px] cursor-pointer overflow-hidden",
                  "perspective-1000",
                  isFlipped && "flipped"
                )}
                onClick={flipCard}
              >
                <motion.div
                  className="absolute inset-0 w-full h-full"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring" }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Лицевая сторона */}
                  <div
                    className="absolute inset-0 w-full h-full backface-hidden p-8 flex flex-col items-center justify-center text-center space-y-6"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {currentCard.term.image_url && settings.showImages && (
                      <div className="w-full max-w-xs h-48 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={currentCard.term.image_url}
                          alt={currentCard.term.term_es}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-4">
                      <Badge variant="outline" className="text-xs">
                        {currentCard.direction === 'es-ru' ? 'Испанский' : 'Русский'}
                      </Badge>
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold break-words">
                        {currentCard.direction === 'es-ru'
                          ? currentCard.term.term_es
                          : currentCard.term.term_ru}
                      </h2>
                    </div>

                    {settings.showAudio && currentCard.term.audio_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio();
                        }}
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        Произношение
                      </Button>
                    )}

                    <p className="text-sm text-muted-foreground">
                      Нажмите или свайпните для переворота
                    </p>
                  </div>

                  {/* Обратная сторона */}
                  <div
                    className="absolute inset-0 w-full h-full backface-hidden p-8 flex flex-col items-center justify-center text-center space-y-6"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)"
                    }}
                  >
                    <div className="space-y-4 w-full">
                      <Badge variant="outline" className="text-xs">
                        {currentCard.direction === 'es-ru' ? 'Русский' : 'Испанский'}
                      </Badge>
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold break-words">
                        {currentCard.direction === 'es-ru'
                          ? currentCard.term.term_ru
                          : currentCard.term.term_es}
                      </h2>

                      {settings.showDescription && (
                        <div className="space-y-2 pt-4">
                          {currentCard.term.description_es && (
                            <p className="text-sm text-muted-foreground">
                              <strong>ES:</strong> {currentCard.term.description_es}
                            </p>
                          )}
                          {currentCard.term.description_ru && (
                            <p className="text-sm text-muted-foreground">
                              <strong>RU:</strong> {currentCard.term.description_ru}
                            </p>
                          )}
                        </div>
                      )}

                      {currentCard.masteryLevel > 0 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Star className="w-4 h-4 text-warning fill-warning" />
                          <span className="text-xs text-muted-foreground">
                            Уровень: {currentCard.masteryLevel}%
                          </span>
                        </div>
                      )}
                    </div>

                    {!isAnswering && (
                      <div className="flex gap-4 pt-4">
                        <Button
                          variant="destructive"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnswer(false);
                          }}
                          className="flex-1"
                        >
                          <X className="w-5 h-5 mr-2" />
                          Не знаю
                        </Button>
                        <Button
                          variant="default"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnswer(true);
                          }}
                          className="flex-1"
                        >
                          <Check className="w-5 h-5 mr-2" />
                          Знаю
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </Card>
            </motion.div>

            {/* Подсказки */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Пробел/Enter - перевернуть | A/← - не знаю | D/→ - знаю</p>
            </div>
          </div>
        )}

        {/* Экран результатов */}
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="p-6 md:p-8 space-y-6">
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="mx-auto w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"
                >
                  <Trophy className="w-10 h-10 text-primary" />
                </motion.div>

                <div>
                  <h2 className="text-3xl font-bold mb-2">Игра завершена!</h2>
                  <p className="text-muted-foreground">
                    Вы прошли {cards.length} карточек
                  </p>
                </div>
              </div>

              {/* Статистика */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-success">{stats.correctCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Правильно</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-destructive">{stats.incorrectCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Неправильно</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-warning">{stats.maxStreak}</div>
                  <div className="text-xs text-muted-foreground mt-1">Макс. серия</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-primary">{accuracy}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Точность</div>
                </div>
              </div>

              {stats.totalTime > 0 && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Время: {Math.floor(stats.totalTime / 60)}м {stats.totalTime % 60}с</span>
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={restartGame}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Начать заново
                </Button>
                <Button
                  onClick={() => navigate("/games")}
                  className="flex-1"
                >
                  К играм
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </Layout>
  );
};

export default FlashCardsGame;

