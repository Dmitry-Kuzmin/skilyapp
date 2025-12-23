import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useUserContext } from "@/contexts/UserContext";
import { Clock, CheckCircle2, XCircle, Languages, Lightbulb, ChevronLeft, ChevronRight, Grid3x3, X, AlertTriangle, Bot, MessageCircle, Bookmark, BookmarkCheck, MoreVertical, Trophy, ArrowRight } from "lucide-react";
import { QuestionProgressBar } from "@/components/QuestionProgressBar";
import { ExamHeader } from "@/components/exam/ExamHeader";
import { PenaltyAlert } from "@/components/exam/PenaltyAlert";
import { useExamTimer } from "@/hooks/useExamTimer";
import { ExamFailureModal } from "@/components/exam/ExamFailureModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UniversalQuestionCard } from "@/components/shared/question";
import { AppButton, AppProgressBar } from "@/components/shared/ui";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isTelegramMiniApp, triggerHapticFeedback } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { getImageUrl, preloadImage, getCachedImageAspectRatio, preloadImages } from "@/utils/imageUtils";
import { saveTestProgress, loadTestProgress, clearTestProgress } from "@/utils/testStorage";
import { ReportProblemModal } from "@/components/ReportProblemModal";
import { AIExplanationDialog } from "@/components/AIExplanationDialog";
import { AIWidget } from "@/components/AIWidget";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { TestSettingsMenu } from "@/components/TestSettingsMenu";
import { ChallengeBankNotification } from "@/components/ChallengeBankNotification";
import { AccountWatermark } from "@/components/anti-abuse/AccountWatermark";
import { usePremium } from "@/hooks/usePremium";
import { useTestQuestions } from "@/hooks/useTestQuestions";
import { useSequentialTestQuestions } from "@/hooks/useTestQuestions";
import {
  useChallengeBankQuestions,
  useDGTQuestions,
  useQuestionsByTopic,
  useTestInfo,
} from "@/hooks/useTestQuestionsByMode";
import { usePDDExamQuestions } from "@/hooks/usePDDExamQuestions";
import { useRussiaExam } from "@/hooks/useRussiaExam";
import { mapRussiaQuestionToUniversal } from "@/utils/pddAdapters";
import { usePDDTicketQuestions, usePDDRandomQuestions } from "@/hooks/usePDDQuestions";
import { usePDDTopicQuestions } from "@/hooks/usePDDTopics";
import { usePDDContext } from "@/contexts/PDDContext";
import { CountryCode } from "@/types/pdd";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { trackOfflineAction } from "@/utils/offlineAnalytics";
import { useOnlineStatus, checkOnlineStatus } from "@/hooks/useOnlineStatus";
import { useLanguage } from "@/contexts/LanguageContext";

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

type TestRewardResult = {
  coins_awarded?: number;
  sp_awarded?: number;
  base_coins?: number;
  base_sp?: number;
  abuse_penalty?: number;
  diminishing_factor?: number;
  message?: string;
  level_up?: boolean;
  new_level?: number;
  tests_today?: number;
};

// Компонент для отображения изображения вопроса с обработкой ошибок
// ОПТИМИЗАЦИЯ: Мемоизирован для предотвращения лишних ререндеров
const QuestionImageComponent = memo(({ imageUrl, compact = false }: { imageUrl: string; compact?: boolean }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);

      // Получаем URL изображения
      const url = getImageUrl(imageUrl);

      if (!url) {
        if (import.meta.env.DEV) {
          console.warn(`[TestSession] Could not generate URL for image: ${imageUrl}`);
        }
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
      // ОПТИМИЗАЦИЯ: Используем async decoding для неблокирующей загрузки
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        setImageAspectRatio(aspectRatio);
        setImageSrc(url);
        setIsLoading(false);
      };
      img.onerror = () => {
        if (import.meta.env.DEV) {
          console.error(`[TestSession] Failed to load image: ${url}`);
        }
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
        className={`relative rounded-2xl shadow-md overflow-hidden ${compact ? 'w-full' : 'mb-4 sm:mb-6'}`}
      >
        <div
          className="relative w-full group"
          style={{
            minHeight: compact ? '200px' : 'auto',
            maxHeight: compact ? '500px' : 'none',
          }}
        >
          <img
            src={imageSrc}
            alt="Вопрос"
            className="w-full h-auto object-contain block"
            loading="lazy"
            decoding="async"
            // ОПТИМИЗАЦИЯ: fetchPriority для первого изображения вопроса (может быть LCP)
            fetchPriority={compact ? 'auto' : 'high'}
            // КРИТИЧНО: width/height для предотвращения CLS
            // Используем aspect ratio из кэша или стандартные размеры
            width={imageAspectRatio ? Math.round((compact ? 500 : 800) * imageAspectRatio) : (compact ? 500 : 800)}
            height={imageAspectRatio ? (compact ? 500 : 800) : Math.round((compact ? 500 : 800) / (imageAspectRatio || 1.5))}
            style={{
              aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : 'auto',
              minHeight: compact ? '200px' : '180px',
              // Для горизонтальных изображений увеличиваем maxHeight
              maxHeight: imageAspectRatio && imageAspectRatio > 1.2
                ? (compact ? '600px' : '500px')
                : (compact ? '500px' : '400px'),
            }}
            onError={() => {
              if (import.meta.env.DEV) {
                console.error(`[TestSession] Failed to load image: ${imageSrc}`);
              }
              setHasError(true);
            }}
          />
        </div>
      </div>
    </>
  );
});

const TestSession = () => {
  const params = useParams();
  const topic = params.topic;
  const testId = params.testId;
  const rawMode = params.mode;
  const countryParam = params.country as CountryCode | undefined;
  const ticketIdParam = params.ticketId;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const { enqueue: enqueueOfflineAction } = useOfflineQueue(profileId);
  const { selectedCountry } = usePDDContext();
  const { language: userLanguage } = useLanguage();
  const mode = useMemo(() => {
    if (rawMode) return rawMode;
    if (location.pathname.includes("/learn/") && ticketIdParam) return "pdd-ticket";
    if (location.pathname.includes("/test/sequential")) return "sequential";
    if (location.pathname.includes("/test/challenge-bank")) return "challenge-bank";
    if (location.pathname.includes("/test/module")) return "module";
    if (location.pathname.includes("/test/dgt")) return "dgt";
    if (location.pathname.includes("/test/exam-russia") || searchParams.get('mode') === 'exam-russia') return "exam-russia";
    if (location.pathname.includes("/test/by-topic") || searchParams.get('topic')) return "by-topic";
    if (location.pathname.includes("/test/nonstop")) return "nonstop";
    return "practice";
  }, [rawMode, location.pathname, searchParams, ticketIdParam]);

  // Определяем страну для ПДД билета
  const pddCountry = useMemo(() => {
    if (mode === 'pdd-ticket') {
      return countryParam || selectedCountry || 'russia';
    }
    return null;
  }, [mode, countryParam, selectedCountry]);

  // Определяем номер билета
  const ticketNumber = useMemo(() => {
    if (mode === 'pdd-ticket' && ticketIdParam) {
      const parsed = parseInt(ticketIdParam);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }, [mode, ticketIdParam]);

  // Получаем количество вопросов из URL
  const countParam = searchParams.get('count');
  const questionCount = countParam ? parseInt(countParam) : (mode === 'nonstop' && selectedCountry === 'russia' ? 800 : 30);
  const blitzDuration = parseInt(searchParams.get('timer') || '300') || 300;
  const initialTimeBudget = mode === "exam" ? 30 * 60 : mode === "blitz" ? blitzDuration : 0;
  const [language, setLanguage] = useState<'ru' | 'es'>('es');
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  // Removed local timeLeft state, using hook instead
  const [loading, setLoading] = useState(true);
  const [showQuestionMap, setShowQuestionMap] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const hasLoadedProgressRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [contentScrollTop, setContentScrollTop] = useState(0);
  const [testInfo, setTestInfo] = useState<{ id: string; title: string } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [showAIExplanation, setShowAIExplanation] = useState(false);
  const [showChallengeBankNotification, setShowChallengeBankNotification] = useState(false);
  const [isFirstWrongAnswer, setIsFirstWrongAnswer] = useState(true);
  const [isQuestionBookmarked, setIsQuestionBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showTestSettings, setShowTestSettings] = useState(false);
  // Состояние для модального окна штрафа в exam-russia
  const [showPenaltyAlert, setShowPenaltyAlert] = useState(false);
  const [penaltyBlock, setPenaltyBlock] = useState<number | null>(null);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState<string>("");
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [voiceOver, setVoiceOver] = useState(() => {
    const saved = localStorage.getItem('test-voice-over');
    return saved ? saved === 'true' : false; // По умолчанию ВЫКЛЮЧЕНА
  });
  const [answerPopularity, setAnswerPopularity] = useState(() => {
    const saved = localStorage.getItem('test-answer-popularity');
    return saved ? saved === 'true' : true;
  });
  const [ambientMusic, setAmbientMusic] = useState(() => {
    const saved = localStorage.getItem('test-ambient-music');
    return saved ? saved === 'true' : false; // По умолчанию выключено
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('test-font-size');
    return saved ? parseInt(saved) : 1;
  });
  const [testLanguage, setTestLanguage] = useState<'es' | 'en'>(() => {
    const saved = localStorage.getItem('test-language');
    // Если сохранен 'ru', заменяем на 'es' (русский доступен только через кнопку перевода)
    if (saved === 'ru') {
      localStorage.setItem('test-language', 'es');
      return 'es';
    }
    return (saved === 'en' ? 'en' : 'es') as 'es' | 'en';
  });
  const testSessionIdRef = useRef<string | null>(null);
  const testSessionStartedRef = useRef<boolean>(false); // Флаг для отслеживания старта сессии
  const getOrCreateSessionId = () => {
    if (!testSessionIdRef.current) {
      const fallbackId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      testSessionIdRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : fallbackId;
    }
    return testSessionIdRef.current;
  };

  // КРИТИЧНО: Вызываем start-test-session Edge Function при старте теста
  useEffect(() => {
    const startTestSession = async () => {
      // Проверяем условия: вопросы загружены, есть profileId, сессия еще не начата
      if (!profileId || questions.length === 0 || testSessionStartedRef.current) {
        return;
      }

      const sessionId = getOrCreateSessionId();

      try {
        // Проверяем онлайн статус
        const realOnline = await checkOnlineStatus();
        if (!realOnline) {
          console.log('[TestSession] Offline mode - skipping start-test-session');
          // В offline режиме не вызываем Edge Function, но помечаем как начатую локально
          testSessionStartedRef.current = true;
          return;
        }

        console.log('[TestSession] Starting test session via Edge Function:', {
          session_id: sessionId,
          user_id: profileId,
          questions_count: questions.length,
          mode,
          test_id: testId || null,
        });

        const { data, error } = await supabase.functions.invoke('start-test-session', {
          body: {
            user_id: profileId,
            session_id: sessionId,
            test_id: testId || null,
            questions_count: questions.length,
            mode: mode || null,
          },
        });

        if (error) {
          console.error('[TestSession] Error starting test session:', error);
          // Не блокируем тест, но логируем ошибку
          toast.warning("Не удалось зарегистрировать начало теста. Результаты могут быть не сохранены.");
        } else {
          console.log('[TestSession] Test session started successfully:', data);
          testSessionStartedRef.current = true;
        }
      } catch (error) {
        console.error('[TestSession] Unexpected error starting test session:', error);
        // Не блокируем тест
      }
    };

    startTestSession();
  }, [profileId, questions.length, mode, testId]); // Вызываем когда вопросы загружены

  // Mastery Mode - отслеживаем неправильные вопросы для повторения
  const [masteryWrongQuestions, setMasteryWrongQuestions] = useState<string[]>([]);
  const [masteryRound, setMasteryRound] = useState(1);

  // КРИТИЧНО: Состояния для отслеживания онлайн/офлайн и синхронизации
  // FIX: Используем useOnlineStatus вместо navigator.onLine (Safari bug)
  const isOnline = useOnlineStatus();
  const [pendingSync, setPendingSync] = useState(false);

  // КРИТИЧНО: Состояния для обработки конфликтов во время активной сессии
  const [conflictNotification, setConflictNotification] = useState<{
    visible: boolean;
    conflicts: Array<{
      questionId: string;
      questionNumber: number;
      localAnswer: boolean;
      serverAnswer: boolean;
    }>;
  }>({ visible: false, conflicts: [] });

  const isTelegramApp = isTelegramMiniApp();

  // Сохраняем настройки в localStorage
  useEffect(() => {
    localStorage.setItem('test-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('test-language', testLanguage);
  }, [testLanguage]);

  useEffect(() => {
    localStorage.setItem('test-voice-over', voiceOver.toString());
  }, [voiceOver]);

  useEffect(() => {
    localStorage.setItem('test-answer-popularity', answerPopularity.toString());
  }, [answerPopularity]);

  useEffect(() => {
    localStorage.setItem('test-ambient-music', ambientMusic.toString());
  }, [ambientMusic]);

  // Ambient Music Effect - стабильная работа с обработкой ошибок
  useEffect(() => {
    let audioElement: HTMLAudioElement | null = null;
    let unlockAttempted = false;
    let currentTrackIndex = 0;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let failedTracks = new Set<number>(); // Треки, которые не загрузились
    let trackTimeout: NodeJS.Timeout | null = null; // Таймер для принудительного переключения
    const MAX_TRACK_DURATION = 5 * 60 * 1000; // Максимальная длительность трека: 5 минут
    let handleEndedRef: (() => void) | null = null;
    let handleErrorRef: (() => void) | null = null;
    let handleTimeUpdateRef: (() => void) | null = null;
    let playlist: string[] = []; // Будет загружен из Supabase Storage

    // Загрузка плейлиста из Supabase Storage
    const loadPlaylist = async () => {
      try {
        console.log('[Ambient Music] Загрузка плейлиста из Supabase Storage...');

        const { data, error } = await supabase.storage
          .from('ambient-music')
          .list('', {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (error) {
          console.error('[Ambient Music] ❌ Ошибка загрузки плейлиста:', error);
          // Fallback: используем 2 проверенных Pixabay трека
          playlist = [
            'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
            'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
          ];
          console.log('[Ambient Music] Используем fallback плейлист (2 трека)');
          return playlist;
        }

        if (!data || data.length === 0) {
          console.warn('[Ambient Music] ⚠️ Bucket пустой, используем fallback');
          // Fallback: используем 2 проверенных Pixabay трека
          playlist = [
            'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
            'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
          ];
          return playlist;
        }

        // Фильтруем только аудио файлы и получаем public URLs
        const audioFiles = data.filter(file =>
          file.name.endsWith('.mp3') ||
          file.name.endsWith('.wav') ||
          file.name.endsWith('.ogg')
        );

        if (audioFiles.length === 0) {
          console.warn('[Ambient Music] ⚠️ Нет аудио файлов в bucket, используем fallback');
          playlist = [
            'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
            'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
          ];
          return playlist;
        }

        // Получаем public URLs для всех файлов
        playlist = audioFiles.map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('ambient-music')
            .getPublicUrl(file.name);
          return publicUrl;
        });

        console.log(`[Ambient Music] ✅ Плейлист загружен: ${playlist.length} треков из Supabase Storage`);
        return playlist;
      } catch (error) {
        console.error('[Ambient Music] ❌ Критическая ошибка загрузки:', error);
        // Fallback
        playlist = [
          'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
          'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
        ];
        return playlist;
      }
    };

    if (ambientMusic) {
      // Сначала загружаем плейлист, затем инициализируем аудио
      loadPlaylist().then(() => {
        if (playlist.length === 0) {
          console.error('[Ambient Music] ❌ Плейлист пустой после загрузки');
          return;
        }

        audioElement = new Audio();
        audioElement.volume = 0.10;
        // НЕ устанавливаем crossOrigin для Supabase Storage
        audioElement.preload = "auto";
        audioElement.loop = false; // ВАЖНО: отключаем зацикливание для автоматического переключения

        // Выбираем первый трек последовательно (начинаем с 0)
        currentTrackIndex = 0;

        // Функция для загрузки и воспроизведения трека с обработкой ошибок
        const playTrack = async (index: number, retry: number = 0) => {
          if (!audioElement) return;

          // Если трек уже провалился, пропускаем его
          if (failedTracks.has(index) && failedTracks.size < playlist.length) {
            console.log(`[Ambient Music] Пропускаем трек ${index} (уже провалился)`);
            nextTrack();
            return;
          }

          try {
            audioElement.src = playlist[index];

            // Ждем загрузки метаданных перед воспроизведением
            await new Promise<void>((resolve, reject) => {
              const onLoadedMetadata = () => {
                audioElement?.removeEventListener('loadedmetadata', onLoadedMetadata);
                audioElement?.removeEventListener('error', onError);
                resolve();
              };

              const onError = (e: Event) => {
                audioElement?.removeEventListener('loadedmetadata', onLoadedMetadata);
                audioElement?.removeEventListener('error', onError);
                reject(e);
              };

              audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
              audioElement.addEventListener('error', onError);

              // Таймаут на загрузку (5 секунд)
              setTimeout(() => {
                audioElement?.removeEventListener('loadedmetadata', onLoadedMetadata);
                audioElement?.removeEventListener('error', onError);
                reject(new Error('Timeout loading track'));
              }, 5000);
            });

            // Пробуем воспроизвести
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
              await playPromise;
              unlockAttempted = true;
              retryCount = 0; // Сбрасываем счетчик при успехе

              // Очищаем предыдущий таймер, если был
              if (trackTimeout) {
                clearTimeout(trackTimeout);
                trackTimeout = null;
              }

              // Устанавливаем таймер для принудительного переключения
              // Используем реальную длительность трека или максимум 5 минут
              const duration = audioElement.duration * 1000 || MAX_TRACK_DURATION;
              const switchTime = Math.min(duration, MAX_TRACK_DURATION);

              trackTimeout = setTimeout(() => {
                console.log(`[Ambient Music] ⏰ Принудительное переключение трека ${index} (таймаут)`);
                if (audioElement && !audioElement.ended) {
                  nextTrack();
                }
              }, switchTime);

              console.log(`[Ambient Music] ✅ Трек ${index} воспроизводится (длительность: ${Math.round(duration / 1000)}с)`);
            }
          } catch (error: any) {
            console.warn(`[Ambient Music] ⚠️ Ошибка загрузки трека ${index}:`, error);

            // Если это ошибка загрузки (403, 404 и т.д.)
            if (error?.target?.error || error?.message?.includes('Timeout')) {
              failedTracks.add(index);

              // Если все треки провалились, пробуем заново
              if (failedTracks.size >= playlist.length) {
                console.log('[Ambient Music] Все треки провалились, очищаем список и пробуем заново');
                failedTracks.clear();
                retryCount++;

                if (retryCount < MAX_RETRIES) {
                  setTimeout(() => {
                    currentTrackIndex = Math.floor(Math.random() * playlist.length);
                    playTrack(currentTrackIndex, retryCount);
                  }, 2000);
                } else {
                  console.error('[Ambient Music] ❌ Превышено количество попыток, музыка отключена');
                }
                return;
              }

              // Пробуем следующий трек
              if (retry < MAX_RETRIES) {
                setTimeout(() => nextTrack(), 500);
              }
            } else {
              // Autoplay blocked - ждем пользовательского взаимодействия
              console.log('[Ambient Music] Autoplay заблокирован, ждем взаимодействия');
            }
          }
        };

        // Функция перехода к следующему треку
        // Используем последовательное переключение для гарантированного разнообразия
        const nextTrack = () => {
          if (!audioElement) return;

          const previousIndex = currentTrackIndex;
          const workingTracks = playlist
            .map((_, index) => index)
            .filter(index => !failedTracks.has(index));

          // Если нет рабочих треков, пробуем все заново
          if (workingTracks.length === 0) {
            console.log('[Ambient Music] Нет рабочих треков, очищаем список и пробуем заново');
            failedTracks.clear();
            currentTrackIndex = (previousIndex + 1) % playlist.length;
            playTrack(currentTrackIndex);
            return;
          }

          // Если только один рабочий трек, используем его
          if (workingTracks.length === 1) {
            currentTrackIndex = workingTracks[0];
            playTrack(currentTrackIndex);
            return;
          }

          // Находим следующий рабочий трек после текущего (последовательно)
          const currentIndexInWorking = workingTracks.indexOf(previousIndex);
          let nextIndexInWorking = currentIndexInWorking + 1;

          // Если текущий трек не в списке рабочих или это последний, берем первый
          if (currentIndexInWorking === -1 || nextIndexInWorking >= workingTracks.length) {
            nextIndexInWorking = 0;
          }

          currentTrackIndex = workingTracks[nextIndexInWorking];
          console.log(`[Ambient Music] Переключаем с трека ${previousIndex} на трек ${currentTrackIndex} (рабочих треков: ${workingTracks.length})`);
          playTrack(currentTrackIndex);
        };

        // Обработчик окончания трека - переход к следующему
        handleEndedRef = () => {
          if (!audioElement) return;

          // Очищаем таймер, так как трек закончился естественным образом
          if (trackTimeout) {
            clearTimeout(trackTimeout);
            trackTimeout = null;
          }

          console.log('[Ambient Music] 🎵 Трек закончился, переключаем на следующий');
          nextTrack();
        };

        // Обработчик для отслеживания прогресса (на случай если ended не сработает)
        handleTimeUpdateRef = () => {
          if (!audioElement) return;

          // Если трек почти закончился (осталось меньше 1 секунды), переключаем
          if (audioElement.duration && audioElement.currentTime >= audioElement.duration - 1) {
            console.log('[Ambient Music] ⏱️ Трек почти закончился, готовимся к переключению');
          }
        };

        // Обработчик ошибки воспроизведения
        handleErrorRef = () => {
          if (!audioElement) return;
          console.warn('[Ambient Music] Ошибка воспроизведения, переключаем трек');
          failedTracks.add(currentTrackIndex);
          nextTrack();
        };

        audioElement.addEventListener('ended', handleEndedRef);
        audioElement.addEventListener('error', handleErrorRef);
        audioElement.addEventListener('timeupdate', handleTimeUpdateRef);

        // Пробуем запустить первый трек
        playTrack(currentTrackIndex);

        // Если autoplay заблокирован - ждем первого клика
        // ОПТИМИЗАЦИЯ SSG: Проверка document для безопасности
        if (typeof document === 'undefined') return;

        const unlockAudio = () => {
          if (audioElement && !unlockAttempted) {
            playTrack(currentTrackIndex);
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
          }
        };

        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
        document.addEventListener('touchstart', unlockAudio, { once: true });
      });
    }

    return () => {
      // Очищаем таймер
      if (trackTimeout) {
        clearTimeout(trackTimeout);
        trackTimeout = null;
      }

      if (audioElement) {
        if (handleEndedRef) audioElement.removeEventListener('ended', handleEndedRef);
        if (handleErrorRef) audioElement.removeEventListener('error', handleErrorRef);
        if (handleTimeUpdateRef) audioElement.removeEventListener('timeupdate', handleTimeUpdateRef);
        audioElement.pause();
        audioElement.src = '';
        audioElement = null;
      }
    };
  }, [ambientMusic]);

  // Voice Over Effect - озвучка вопросов (только когда включена)
  useEffect(() => {
    // Проверяем что озвучка включена и есть вопрос
    if (!voiceOver || !questions[currentIndex]) {
      // Если озвучка выключена, останавливаем любую активную озвучку
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const speakQuestion = async () => {
      // Проверяем поддержку Web Speech API
      if (!('speechSynthesis' in window)) {
        console.warn('[TestSession] 🔊 Speech synthesis not supported');
        return;
      }

      // Останавливаем предыдущую озвучку
      window.speechSynthesis.cancel();

      const currentQuestion = questions[currentIndex];
      const questionText = testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es;

      // Ждем загрузки голосов
      await new Promise(resolve => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          resolve(voices);
        } else {
          window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
        }
      });

      const voices = window.speechSynthesis.getVoices();

      // Выбираем лучший голос для языка
      let preferredVoice = null;
      if (testLanguage === 'en') {
        // Для английского: ищем Google US Female
        preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google') && v.name.includes('Female')) ||
          voices.find(v => v.lang === 'en-US');
      } else {
        // Для испанского: ищем Google ES Female
        preferredVoice = voices.find(v => v.lang === 'es-ES' && (v.name.includes('Google') || v.name.includes('Female'))) ||
          voices.find(v => v.lang === 'es-ES') ||
          voices.find(v => v.lang.startsWith('es'));
      }

      const utterance = new SpeechSynthesisUtterance(questionText);
      utterance.lang = testLanguage === 'en' ? 'en-US' : 'es-ES';

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Параметры для более естественной речи
      utterance.rate = 0.85; // Немного медленнее для четкости
      utterance.pitch = 1.05; // Чуть выше для естественности
      utterance.volume = 0.9;

      // Ждем небольшую задержку перед озвучкой
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
        console.log('[TestSession] 🔊 Speaking question with voice:', preferredVoice?.name || 'default');
      }, 500);
    };

    speakQuestion();

    // Cleanup - останавливаем озвучку при размонтировании или смене вопроса
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [voiceOver, currentIndex, questions, testLanguage]);

  const handleCloseModal = useCallback(() => {
    if (isClosingRef.current || isClosing) return;

    isClosingRef.current = true;
    setIsClosing(true);
    setIsDragging(false);
    setDragStartY(0);
    setDragCurrentY(0);

    setTimeout(() => {
      setShowQuestionMap(false);
      setIsClosing(false);
      isClosingRef.current = false;
    }, 300);
  }, [isClosing]);

  // Reset drag state when modal closes and prevent body scroll
  useEffect(() => {
    if (showQuestionMap) {
      // Сохраняем текущую позицию скролла перед блокировкой
      const scrollY = window.scrollY;

      // Блокируем скролл фона при открытом модальном окне
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.left = '0';
      document.body.style.right = '0';

      // Сохраняем позицию скролла в data-атрибут для восстановления
      document.body.setAttribute('data-scroll-y', scrollY.toString());

      // Сбрасываем позицию скролла контента
      setContentScrollTop(0);
      isClosingRef.current = false;
    } else {
      // Восстанавливаем позицию скролла
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');

      // Разблокируем скролл при закрытии
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.left = '';
      document.body.style.right = '';

      // Восстанавливаем позицию скролла
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }

      setIsDragging(false);
      setIsClosing(false);
      setDragStartY(0);
      setDragCurrentY(0);
      setContentScrollTop(0);
      isClosingRef.current = false;

      // Отменяем анимацию если она была активна
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      // Очистка при размонтировании
      const scrollY = document.body.getAttribute('data-scroll-y');
      document.body.removeAttribute('data-scroll-y');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.left = '';
      document.body.style.right = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY, 10));
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showQuestionMap]);

  // Close modal with Escape key
  useEffect(() => {
    if (!showQuestionMap) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClosingRef.current && !isClosing) {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQuestionMap, isClosing]);

  // ОПТИМИЗАЦИЯ: Используем React Query хуки для загрузки вопросов в зависимости от режима
  const challengeBankQuestions = useChallengeBankQuestions(
    mode === 'challenge-bank' ? profileId : null,
    30
  );
  const dgtQuestions = useDGTQuestions(mode === 'dgt' ? topic || null : null, 30);

  // Для России используем ПДД вопросы, для других стран - questions_new
  const shouldUsePDD = selectedCountry === 'russia' && (mode === 'practice' || mode === 'blitz' || mode === 'exam' || mode === 'mastery' || mode === 'hardest' || mode === 'by-topic' || mode === 'nonstop');
  const pddRandomQuestions = usePDDRandomQuestions(
    shouldUsePDD ? selectedCountry : 'russia', // Используем selectedCountry только если shouldUsePDD
    shouldUsePDD ? questionCount : 0
  );

  const practiceQuestions = useQuestionsByTopic(
    (mode === 'practice' || mode === 'blitz' || mode === 'exam') && !shouldUsePDD ? topic || null : null,
    questionCount,
    (mode === 'practice' || mode === 'blitz' || mode === 'exam') && !shouldUsePDD
  );
  const masteryQuestions = useQuestionsByTopic(
    mode === 'mastery' && !shouldUsePDD ? topic || null : null,
    questionCount,
    mode === 'mastery' && !shouldUsePDD
  );
  const hardestQuestions = useQuestionsByTopic(
    mode === 'hardest' && !shouldUsePDD ? null : null,
    questionCount,
    mode === 'hardest' && !shouldUsePDD
  );
  const moduleQuestions = useQuestionsByTopic(
    mode === 'module' && topic ? topic : null,
    20,
    mode === 'module' && !!topic
  );
  const sequentialQuestions = useSequentialTestQuestions(mode === 'sequential' ? testId || null : null);
  const testInfoData = useTestInfo(mode === 'sequential' ? testId || null : null);

  // ПДД РФ экзамен
  const pddExamQuestions = usePDDExamQuestions();

  // ПДД билет (для любой страны)
  const pddTicketQuestions = usePDDTicketQuestions(
    pddCountry || 'russia',
    ticketNumber || 0
  );

  // ПДД вопросы по теме (для России)
  const topicName = searchParams.get('topic');
  const pddTopicQuestions = usePDDTopicQuestions(
    selectedCountry || 'russia',
    topicName || '',
    questionCount || 30
  );

  // Преобразуем вопросы ПДД РФ в универсальный формат
  const universalPDDQuestions = useMemo(() => {
    if (mode === 'exam-russia' && pddExamQuestions.data) {
      return pddExamQuestions.data.selectedQuestions;
    }
    if (mode === 'pdd-ticket' && pddTicketQuestions.data) {
      return pddTicketQuestions.data;
    }
    return null;
  }, [mode, pddExamQuestions.data, pddTicketQuestions.data]);

  const allQuestionsByBlock = useMemo(() => {
    if (mode === 'exam-russia' && pddExamQuestions.data) {
      return pddExamQuestions.data.allQuestionsByBlock;
    }
    return undefined;
  }, [mode, pddExamQuestions.data]);

  // Хук для управления экзаменом РФ
  const russiaExam = useRussiaExam(universalPDDQuestions || [], allQuestionsByBlock);

  // Timer Hook - Manages time robustly (Moved here to have access to state)
  const { timeLeft, addPenalty, clearTimer } = useExamTimer({
    examId: mode === 'pdd-ticket'
      ? `ticket_${ticketIdParam || 'unknown'}`
      : `russia_exam_${testId || searchParams.get('session') || 'random'}`,
    initialDurationSeconds: 20 * 60,
    onTimeExpired: (mode === 'exam' || mode === 'exam-russia') ? () => {
      toast.error("Время вышло! Экзамен не сдан.");
      navigate('/test/results', {
        state: {
          questions: questions,
          answers: answers,
          mode: mode,
          testInfo: testInfo,
          timeSpent: 20 * 60 + (russiaExam.state?.extraTimeAdded || 0),
          russiaExamStats: russiaExam.stats,
        },
      });
    } : undefined,
    sessionId: getOrCreateSessionId()
  });

  // Формируем массив ответов для прогресс-бара РФ
  const russiaExamAnswers = useMemo(() => {
    if (!russiaExam.state) return [];

    const main = Array.from({ length: 20 }).map((_, i) => {
      const ans = russiaExam.state?.mainAnswers[i];
      return ans ? { questionId: ans.questionId, isCorrect: ans.isCorrect } : null;
    }).filter((a): a is { questionId: string; isCorrect: boolean } => a !== null);

    const extra = Array.from({ length: russiaExam.state?.extraQuestions.length || 0 }).map((_, i) => {
      const ans = russiaExam.state?.extraAnswers[i];
      return ans ? { questionId: ans.questionId, isCorrect: ans.isCorrect } : null;
    }).filter((a): a is { questionId: string; isCorrect: boolean } => a !== null);

    return [...main, ...extra];
  }, [russiaExam.state]);

  // Обработка успешного завершения экзамена РФ
  useEffect(() => {
    if (mode === 'exam-russia' && russiaExam.status === 'passed') {
      // Небольшая задержка для завершения анимаций
      const timer = setTimeout(() => {
        navigate('/test/results', {
          state: {
            questions: questions,
            answers: answers,
            mode: mode,
            testInfo: testInfo,
            timeSpent: russiaExam.stats?.timeSpent ?? 0,
            russiaExamStats: russiaExam.stats,
          },
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mode, russiaExam.status, russiaExam.stats, questions, answers, testInfo, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentQ = mode === 'exam-russia' ? russiaExam.currentQuestion : questions[currentIndex];
      if (!currentQ) return;

      const currentAnswers = mode === 'exam-russia'
        ? russiaExam.currentQuestion?.answers
        : currentQ.answer_options;

      if (!currentAnswers) return;

      // Select option 1-9
      if (/^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key) - 1;
        if (index < currentAnswers.length) {
          const answerId = currentAnswers[index].id;
          if (!isAnswerLocked) {
            setSelectedOption(answerId);
          }
        }
      }

      // Confirm with Enter
      if (e.key === 'Enter') {
        if (selectedOption && !isAnswerLocked) {
          handleAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, russiaExam.currentQuestion, questions, currentIndex, selectedOption, isAnswerLocked]);

  // ОПТИМИЗАЦИЯ: Загружаем вопросы из хуков в зависимости от режима
  useEffect(() => {
    if (mode === 'challenge-bank') {
      if (challengeBankQuestions.data) {
        setQuestions(challengeBankQuestions.data);
        setTestInfo({ id: 'challenge_bank', title: '💡 Банк Сложных Вопросов™' });
        setLoading(false);
      } else if (challengeBankQuestions.isLoading) {
        setLoading(true);
      } else if (challengeBankQuestions.error) {
        toast.error("Ошибка загрузки вопросов");
        setLoading(false);
      }
    } else if (mode === 'dgt') {
      if (dgtQuestions.data) {
        if (dgtQuestions.data.length === 0) {
          toast.error("Вопросы для этой категории не найдены");
          navigate("/dgt-tests");
          return;
        }
        setQuestions(dgtQuestions.data);
        setTestInfo({ id: `dgt_${topic?.toUpperCase()}`, title: `DGT Экзамен ${topic?.toUpperCase()}` });
        setLoading(false);
      } else if (dgtQuestions.isLoading) {
        setLoading(true);
      } else if (dgtQuestions.error) {
        toast.error("Ошибка загрузки вопросов");
        setLoading(false);
      }
    } else if (mode === 'by-topic') {
      // Режим по темам для России
      if (pddTopicQuestions.data && pddTopicQuestions.data.length > 0) {
        const convertedQuestions: QuestionData[] = pddTopicQuestions.data.map((q) => ({
          id: q.id,
          question_ru: q.text,
          question_es: q.text,
          question_en: q.text,
          image_url: q.image,
          explanation_ru: q.explanation || null,
          explanation_es: q.explanation || null,
          explanation_en: q.explanation || null,
          topics: q.topics && q.topics.length > 0 ? { title_ru: q.topics[0], title_es: q.topics[0] } : null,
          answer_options: q.answers.map(a => ({
            id: a.id,
            text_ru: a.text,
            text_es: a.text,
            text_en: a.text,
            is_correct: a.isCorrect,
            position: a.position || 0,
          })),
        }));
        setQuestions(convertedQuestions);
        setTestInfo({ id: `topic_${topicName}`, title: `Тема: ${topicName}` });
        setLoading(false);
      } else if (pddTopicQuestions.isLoading) {
        setLoading(true);
      } else if (pddTopicQuestions.error) {
        toast.error("Ошибка загрузки вопросов по теме");
        setLoading(false);
      }
    } else if (mode === 'practice' || mode === 'blitz' || mode === 'exam' || mode === 'nonstop') {
      // Для России используем ПДД вопросы
      if (shouldUsePDD) {
        if (pddRandomQuestions.data && pddRandomQuestions.data.length > 0) {
          const convertedQuestions: QuestionData[] = pddRandomQuestions.data.map((q) => ({
            id: q.id,
            question_ru: q.text,
            question_es: q.text,
            question_en: q.text,
            image_url: q.image,
            explanation_ru: q.explanation || null,
            explanation_es: q.explanation || null,
            explanation_en: q.explanation || null,
            topics: q.topics && q.topics.length > 0 ? { title_ru: q.topics[0], title_es: q.topics[0] } : null,
            answer_options: q.answers.map(a => ({
              id: a.id,
              text_ru: a.text,
              text_es: a.text,
              text_en: a.text,
              is_correct: a.isCorrect,
              position: a.position || 0,
            })),
          }));
          setQuestions(convertedQuestions);
          if (mode === 'nonstop') {
            setTestInfo({ id: 'nonstop_russia', title: '🚀 Режим Нон-стоп (800)' });

            // Загружаем прогресс для нон-стоп ОДИН РАЗ
            if (hasLoadedProgressRef.current !== 'nonstop_russia') {
              hasLoadedProgressRef.current = 'nonstop_russia';
              loadTestProgress('nonstop_russia').then((savedProgress) => {
                if (savedProgress && savedProgress.answers.length > 0) {
                  setAnswers(savedProgress.answers.map(a => ({
                    questionId: a.questionId,
                    selectedAnswerId: a.selectedAnswerId,
                    isCorrect: a.isCorrect,
                  })));
                  setCurrentIndex(savedProgress.currentIndex);
                  toast.info('Прогресс восстановлен');
                }
              }).catch(console.error);
            }
          } else if (mode === 'practice') {
            setTestInfo({ id: 'practice_russia', title: '📖 Практика' });
          } else if (mode === 'blitz') {
            setTestInfo({ id: 'blitz_russia', title: '⚡️ Блиц' });
          } else if (mode === 'exam') {
            setTestInfo({ id: 'exam_russia_training', title: '🚦 Тренировочный Экзамен' });
          }
          setLoading(false);
        } else if (pddRandomQuestions.isLoading) {
          setLoading(true);
        } else if (pddRandomQuestions.error) {
          toast.error("Ошибка загрузки вопросов ПДД");
          setLoading(false);
        }
      } else {
        // Для других стран используем обычные вопросы
        if (practiceQuestions.data) {
          setQuestions(practiceQuestions.data);
          setLoading(false);
        } else if (practiceQuestions.isLoading) {
          setLoading(true);
        } else if (practiceQuestions.error) {
          toast.error("Ошибка загрузки вопросов");
          setLoading(false);
        }
      }
    } else if (mode === 'mastery') {
      // Для России используем ПДД вопросы
      if (shouldUsePDD) {
        if (pddRandomQuestions.data && pddRandomQuestions.data.length > 0) {
          const convertedQuestions: QuestionData[] = pddRandomQuestions.data.map((q) => ({
            id: q.id,
            question_ru: q.text,
            question_es: q.text,
            question_en: q.text,
            image_url: q.image,
            explanation_ru: q.explanation || null,
            explanation_es: q.explanation || null,
            explanation_en: q.explanation || null,
            topics: q.topics && q.topics.length > 0 ? { title_ru: q.topics[0], title_es: q.topics[0] } : null,
            answer_options: q.answers.map(a => ({
              id: a.id,
              text_ru: a.text,
              text_es: a.text,
              text_en: a.text,
              is_correct: a.isCorrect,
              position: a.position || 0,
            })),
          }));
          setQuestions(convertedQuestions);
          setTestInfo({ id: 'mastery_mode', title: '🏆 Режим Мастерства' });
          setLoading(false);
        } else if (pddRandomQuestions.isLoading) {
          setLoading(true);
        } else if (pddRandomQuestions.error) {
          toast.error("Ошибка загрузки вопросов ПДД");
          setLoading(false);
        }
      } else {
        // Для других стран используем обычные вопросы
        if (masteryQuestions.data) {
          setQuestions(masteryQuestions.data);
          setTestInfo({ id: 'mastery_mode', title: '🏆 Режим Мастерства' });
          setLoading(false);
        } else if (masteryQuestions.isLoading) {
          setLoading(true);
        } else if (masteryQuestions.error) {
          toast.error("Ошибка загрузки вопросов");
          setLoading(false);
        }
      }
    } else if (mode === 'hardest') {
      // Для России используем ПДД вопросы
      if (shouldUsePDD) {
        if (pddRandomQuestions.data && pddRandomQuestions.data.length > 0) {
          const convertedQuestions: QuestionData[] = pddRandomQuestions.data.map((q) => ({
            id: q.id,
            question_ru: q.text,
            question_es: q.text,
            question_en: q.text,
            image_url: q.image,
            explanation_ru: q.explanation || null,
            explanation_es: q.explanation || null,
            explanation_en: q.explanation || null,
            topics: q.topics && q.topics.length > 0 ? { title_ru: q.topics[0], title_es: q.topics[0] } : null,
            answer_options: q.answers.map(a => ({
              id: a.id,
              text_ru: a.text,
              text_es: a.text,
              text_en: a.text,
              is_correct: a.isCorrect,
              position: a.position || 0,
            })),
          }));
          setQuestions(convertedQuestions);
          setTestInfo({ id: 'hardest_questions', title: '⚠️ Сложные Вопросы' });
          setLoading(false);
        } else if (pddRandomQuestions.isLoading) {
          setLoading(true);
        } else if (pddRandomQuestions.error) {
          toast.error("Ошибка загрузки вопросов ПДД");
          setLoading(false);
        }
      } else {
        // Для других стран используем обычные вопросы
        if (hardestQuestions.data) {
          setQuestions(hardestQuestions.data);
          setTestInfo({ id: 'hardest_questions', title: '⚠️ Сложные Вопросы' });
          setLoading(false);
        } else if (hardestQuestions.isLoading) {
          setLoading(true);
        } else if (hardestQuestions.error) {
          toast.error("Ошибка загрузки вопросов");
          setLoading(false);
        }
      }
    } else if (mode === 'module') {
      if (moduleQuestions.data) {
        setQuestions(moduleQuestions.data);
        setTestInfo({ id: `module_${topic}`, title: "Итоговый тест по модулю" });
        setLoading(false);
      } else if (moduleQuestions.isLoading) {
        setLoading(true);
      } else if (moduleQuestions.error) {
        toast.error("Ошибка загрузки вопросов");
        setLoading(false);
      }
    } else if (mode === 'exam-russia') {
      if (universalPDDQuestions && universalPDDQuestions.length > 0) {
        // Преобразуем UniversalQuestion обратно в QuestionData для совместимости
        const convertedQuestions: QuestionData[] = universalPDDQuestions.map((q, idx) => ({
          id: q.id,
          question_ru: q.text,
          question_es: q.text,
          question_en: q.text,
          image_url: q.image,
          explanation_ru: q.explanation || null,
          explanation_es: q.explanation || null,
          explanation_en: q.explanation || null,
          topics: q.topics && q.topics.length > 0 ? { title_ru: q.topics[0], title_es: q.topics[0] } : null,
          answer_options: q.answers.map(a => ({
            id: a.id,
            text_ru: a.text,
            text_es: a.text,
            text_en: a.text,
            is_correct: a.isCorrect,
            position: a.position || 0,
          })),
        }));
        setQuestions(convertedQuestions);
        setTestInfo({ id: 'exam_russia', title: '🚦 Экзамен ПДД РФ' });
        // setTimeLeft removed - handled by hook

        setLoading(false);
      } else if (pddExamQuestions.isLoading) {
        setLoading(true);
      } else if (pddExamQuestions.error) {
        toast.error("Ошибка загрузки вопросов");
        setLoading(false);
      }
    } else if (mode === 'pdd-ticket') {
      if (universalPDDQuestions && universalPDDQuestions.length > 0) {
        // Преобразуем UniversalQuestion обратно в QuestionData для совместимости
        const convertedQuestions: QuestionData[] = universalPDDQuestions.map((q) => ({
          id: q.id,
          question_ru: q.text,
          question_es: q.text,
          question_en: q.text,
          image_url: q.image,
          explanation_ru: q.explanation || null,
          explanation_es: q.explanation || null,
          explanation_en: q.explanation || null,
          topics: q.topics && q.topics.length > 0 ? { title_ru: q.topics[0], title_es: q.topics[0] } : null,
          answer_options: q.answers.map(a => ({
            id: a.id,
            text_ru: a.text,
            text_es: a.text,
            text_en: a.text,
            is_correct: a.isCorrect,
            position: a.position || 0,
          })),
        }));
        setQuestions(convertedQuestions);
        setTestInfo({
          id: `pdd_ticket_${ticketNumber}`,
          title: `Билет ${ticketNumber}`
        });
        setLoading(false);
      } else if (pddTicketQuestions.isLoading) {
        setLoading(true);
      } else if (pddTicketQuestions.error) {
        toast.error("Ошибка загрузки вопросов билета");
        setLoading(false);
        navigate(`/learn/${pddCountry}`);
      }
    } else if (mode === 'sequential' && testId) {
      if (sequentialQuestions.data && testInfoData.data) {
        if (sequentialQuestions.data.length === 0) {
          toast.error("Вопросы для этого теста не найдены");
          navigate("/tests/sequential");
          return;
        }
        setQuestions(sequentialQuestions.data);
        setTestInfo({ id: testInfoData.data.id, title: testInfoData.data.title_ru });

        // КРИТИЧНО: Загружаем сохраненный прогресс из локального хранилища
        if (testId) {
          loadTestProgress(testId).then((savedProgress) => {
            if (savedProgress && savedProgress.answers.length > 0) {
              // Восстанавливаем прогресс
              setAnswers(savedProgress.answers.map(a => ({
                questionId: a.questionId,
                selectedAnswerId: a.selectedAnswerId,
                isCorrect: a.isCorrect,
              })));
              setCurrentIndex(savedProgress.currentIndex);
              setStartTime(savedProgress.startTime);

              toast.info('Прогресс восстановлен из локального хранилища', {
                description: `Восстановлено ${savedProgress.answers.length} ответов`,
                duration: 3000,
              });
            }
          }).catch((error) => {
            console.error('[TestSession] Error loading saved progress:', error);
          });
        }

        // Проверяем доступность теста и устанавливаем статус
        if (profileId) {
          (supabase as any)
            .from("user_test_progress")
            .select("*")
            .eq("user_id", profileId)
            .eq("test_id", testId)
            .single()
            .then(({ data: progressData }) => {
              if (progressData && progressData.status === 'locked') {
                toast.error("Этот тест заблокирован. Пройдите предыдущие тесты.");
                navigate("/tests/sequential");
                return;
              }
              setStartTime(Date.now());
              (supabase as any)
                .from("user_test_progress")
                .upsert({
                  user_id: profileId,
                  test_id: testId,
                  status: 'in_progress',
                  started_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id,test_id'
                })
                .catch((error) => {
                  // Обработка ошибок upsert (не критично, продолжаем работу)
                  console.error("[TestSession] Ошибка обновления прогресса:", error);
                });
            })
            .catch((error) => {
              // Обработка ошибок: если запись не найдена (PGRST116) - это нормально для нового теста
              if (error?.code === 'PGRST116') {
                // Запись не найдена - это нормально, создаем новую
                setStartTime(Date.now());
                (supabase as any)
                  .from("user_test_progress")
                  .upsert({
                    user_id: profileId,
                    test_id: testId,
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                  }, {
                    onConflict: 'user_id,test_id'
                  })
                  .then(({ error: upsertError }) => {
                    if (upsertError) console.error("[TestSession] Ошибка создания прогресса:", upsertError);
                  });
              } else {
                // Другая ошибка - логируем, но не блокируем тест
                console.error("[TestSession] Ошибка проверки прогресса:", error);
                setStartTime(Date.now());
              }
            });
        }

        // Предзагружаем изображения
        const firstImagesToPreload = sequentialQuestions.data
          .slice(0, 3)
          .map(q => q.image_url)
          .filter(Boolean) as string[];

        if (firstImagesToPreload.length > 0) {
          preloadImage(firstImagesToPreload[0]).catch(() => { });
          firstImagesToPreload.slice(1).forEach((url, index) => {
            setTimeout(() => {
              preloadImage(url).catch(() => { });
            }, (index + 1) * 300);
          });
        }

        setLoading(false);
      } else if (sequentialQuestions.isLoading || testInfoData.isLoading) {
        setLoading(true);
      } else if (sequentialQuestions.error || testInfoData.error) {
        toast.error("Ошибка загрузки вопросов");
        setLoading(false);
      }
    }
  }, [
    mode,
    challengeBankQuestions.data,
    challengeBankQuestions.isLoading,
    challengeBankQuestions.error,
    dgtQuestions.data,
    dgtQuestions.isLoading,
    dgtQuestions.error,
    practiceQuestions.data,
    practiceQuestions.isLoading,
    practiceQuestions.error,
    masteryQuestions.data,
    masteryQuestions.isLoading,
    masteryQuestions.error,
    hardestQuestions.data,
    hardestQuestions.isLoading,
    hardestQuestions.error,
    moduleQuestions.data,
    moduleQuestions.isLoading,
    moduleQuestions.error,
    sequentialQuestions.data,
    sequentialQuestions.isLoading,
    sequentialQuestions.error,
    testInfoData.data,
    testInfoData.isLoading,
    testInfoData.error,
    testId,
    topic,
    profileId,
    navigate,
    universalPDDQuestions,
    pddTicketQuestions.isLoading,
    pddTicketQuestions.error,
    ticketNumber,
    pddCountry,
    shouldUsePDD,
    pddRandomQuestions.data,
    pddRandomQuestions.isLoading,
    pddRandomQuestions.error,
    selectedCountry,
  ]);

  // Проверяем, добавлен ли текущий вопрос в закладки
  useEffect(() => {
    if (profileId && questions.length > 0 && questions[currentIndex]?.id) {
      checkIfBookmarked();
    }
  }, [profileId, currentIndex, questions]);

  const checkIfBookmarked = async () => {
    if (!profileId || !questions.length || !questions[currentIndex]?.id) {
      console.log('[Bookmark] Check skipped:', { profileId, hasQuestions: questions.length > 0, questionId: questions[currentIndex]?.id });
      return;
    }

    try {
      console.log('[Bookmark] Checking if bookmarked:', { profileId, questionId: questions[currentIndex].id });
      const { data, error } = await (supabase as any).from('user_challenge_questions')
        .select('id')
        .eq('user_id', profileId)
        .eq('question_id', questions[currentIndex].id)
        .maybeSingle();

      console.log('[Bookmark] Check result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('[Bookmark] Check error:', error);
        throw error;
      }
      setIsQuestionBookmarked(!!data);
    } catch (error) {
      console.error('[Bookmark] Error checking bookmark:', error);
    }
  };

  const toggleBookmark = async () => {
    console.log('[Bookmark] Toggle called:', {
      profileId,
      questionId: questions[currentIndex]?.id,
      bookmarkLoading,
      isQuestionBookmarked,
      isTelegramApp
    });

    if (!profileId) {
      console.error('[Bookmark] No profileId available');
      toast.error("Необходима авторизация для добавления в закладки");
      return;
    }

    if (!questions.length || !questions[currentIndex]?.id) {
      console.error('[Bookmark] No question available');
      return;
    }

    if (bookmarkLoading) {
      console.log('[Bookmark] Already loading, skipping');
      return;
    }

    const questionId = questions[currentIndex].id;

    try {
      setBookmarkLoading(true);

      if (isQuestionBookmarked) {
        // Удаляем из закладок
        console.log('[Bookmark] Removing bookmark:', { profileId, questionId });
        const { error, data } = await (supabase as any)
          .from('user_challenge_questions')
          .delete()
          .eq('user_id', profileId)
          .eq('question_id', questionId)
          .select();

        console.log('[Bookmark] Delete result:', { error, data });

        if (error) {
          console.error('[Bookmark] Delete error:', error);
          throw error;
        }
        toast.success("Удалено из закладок");
        setIsQuestionBookmarked(false);
      } else {
        // Добавляем в закладки
        console.log('[Bookmark] Adding bookmark:', { profileId, questionId });

        // Сначала проверяем, есть ли уже запись
        const { data: existing, error: checkError } = await (supabase as any)
          .from('user_challenge_questions')
          .select('id, times_wrong')
          .eq('user_id', profileId)
          .eq('question_id', questionId)
          .maybeSingle();

        console.log('[Bookmark] Check existing:', { existing, checkError });

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('[Bookmark] Check error:', checkError);
          throw checkError;
        }

        if (existing) {
          // Уже есть, просто показываем сообщение
          console.log('[Bookmark] Already exists:', existing);
          toast.success("Вопрос уже в закладках");
          setIsQuestionBookmarked(true);
        } else {
          // Создаем новую запись с times_wrong = 0 (добавлено вручную)
          console.log('[Bookmark] Inserting new bookmark');
          const { data: insertData, error: insertError } = await (supabase as any)
            .from('user_challenge_questions')
            .insert({
              user_id: profileId,
              question_id: questionId,
              times_wrong: 0, // 0 означает добавлено вручную, не через ошибку
              last_wrong_at: new Date().toISOString(),
            })
            .select();

          console.log('[Bookmark] Insert result:', { insertData, insertError });

          if (insertError) {
            console.error('[Bookmark] Insert error details:', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint
            });
            throw insertError;
          }
          toast.success("Добавлено в закладки");
          setIsQuestionBookmarked(true);
        }
      }
    } catch (error: any) {
      console.error('[Bookmark] Error toggling bookmark:', error);
      const errorMessage = error?.message || error?.details || "Не удалось изменить закладку";
      console.error('[Bookmark] Full error object:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error
      });
      toast.error(`Не удалось изменить закладку: ${errorMessage}`);
    } finally {
      setBookmarkLoading(false);
    }
  };

  // ОПТИМИЗАЦИЯ: Агрессивная предзагрузка изображений следующих вопросов
  useEffect(() => {
    if (questions.length === 0 || loading) return;

    const preloadNextImages = async () => {
      const imagesToPreload: (string | null | undefined)[] = [];

      // КРИТИЧНО: Предзагружаем следующее изображение ПРИОРИТЕТНО (для мгновенного переключения)
      if (currentIndex + 1 < questions.length && questions[currentIndex + 1]?.image_url) {
        imagesToPreload.push(questions[currentIndex + 1].image_url);
      }

      // Предзагружаем изображения следующих 3-5 вопросов (для плавной прокрутки)
      for (let i = 2; i <= 5 && currentIndex + i < questions.length; i++) {
        if (questions[currentIndex + i]?.image_url) {
          imagesToPreload.push(questions[currentIndex + i].image_url);
        }
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



  const loadQuestions = async () => {
    try {
      setLoading(true);

      // Если это режим Challenge Bank, загружаем вопросы с ошибками
      if (mode === 'challenge-bank' && profileId) {
        const { data: challengeQuestions, error: challengeError } = await (supabase as any)
          .rpc('get_challenge_bank_questions', {
            p_user_id: profileId,
            p_limit: 30,
            p_only_not_mastered: true
          });

        if (challengeError) throw challengeError;
        if (!challengeQuestions || challengeQuestions.length === 0) {
          toast.error("Нет вопросов в Банке Сложных Вопросов");
          navigate("/tests/challenge-bank");
          return;
        }

        // Преобразуем Challenge Bank вопросы в формат TestSession
        // Загружаем answer_options для каждого вопроса
        const questionIds = challengeQuestions.map((q: any) => q.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from("answer_options")
          .select("*")
          .in("question_id", questionIds);

        if (optionsError) throw optionsError;

        const formattedQuestions = challengeQuestions.map((q: any) => {
          const options = (optionsData || []).filter((opt: any) => opt.question_id === q.id);
          return {
            ...q,
            answer_options: options,
            topics: q.topic_title_ru ? {
              title_ru: q.topic_title_ru,
              title_es: q.topic_title_es || q.topic_title_ru,
            } : null,
          };
        });

        setQuestions(formattedQuestions);
        setTestInfo({
          id: 'challenge_bank',
          title: '💡 Банк Сложных Вопросов™',
        });
      }
      // Режим Mastery - случайные вопросы для прохождения "до победного"
      else if (mode === 'mastery') {
        let query = (supabase as any)
          .from("questions_new")
          .select(`
            *,
            topics (title_ru, title_es),
            answer_options (*)
          `);

        // Если указана тема
        if (topic) {
          query = query.eq("topic_id", topic);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Перемешиваем и берём заданное количество вопросов
        const shuffled = (data || []).sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, questionCount);

        setQuestions(limited);
        setTestInfo({
          id: 'mastery_mode',
          title: '🏆 Режим Мастерства',
        });
      }
      // Режим Hardest - самые сложные вопросы
      else if (mode === 'hardest') {
        // TODO: Загружать из статистики самые сложные вопросы
        // Пока загружаем случайные вопросы
        const { data, error } = await (supabase as any)
          .from("questions_new")
          .select(`
            *,
            topics (title_ru, title_es),
            answer_options (*)
          `);

        if (error) throw error;

        // Перемешиваем и берём заданное количество
        const shuffled = (data || []).sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, questionCount);

        setQuestions(limited);
        setTestInfo({
          id: 'hardest_questions',
          title: '⚠️ Сложные Вопросы',
        });
      }
      // Если это DGT тест, загружаем из dgt_questions
      else if (mode === 'dgt' && topic) {
        const category = topic.toUpperCase();

        // Загружаем случайные 30 вопросов из DGT базы
        const { data: dgtQuestions, error: dgtError } = await (supabase as any)
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
      // Итоговый тест по модулю: короткий экзамен по одной теме
      else if (mode === "module" && topic) {
        const { data, error } = await (supabase as any)
          .from("questions_new")
          .select(
            `
            *,
            topics (title_ru, title_es),
            answer_options (*)
          `
          )
          .eq("topic_id", topic);

        if (error) throw error;

        const uniqueQuestionsMap = new Map<string, (typeof data)[0]>();
        (data || []).forEach((q) => {
          if (!uniqueQuestionsMap.has(q.id)) {
            uniqueQuestionsMap.set(q.id, q);
          }
        });
        const uniqueQuestions = Array.from(uniqueQuestionsMap.values());

        const shuffled = uniqueQuestions.sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, 20); // короче, чем обычный экзамен

        setQuestions(limited);
        setTestInfo({
          id: `module_${topic}`,
          title: "Итоговый тест по модулю",
        });
      }
      // Если это sequential тест, загружаем вопросы через функцию
      else if (testId) {
        // Получаем информацию о тесте
        const { data: testData, error: testError } = await (supabase as any)
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
          const { data: progressData } = await (supabase as any)
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
          (supabase as any)
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
        const { data: questionsData, error: questionsError } = await (supabase as any).rpc(
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
          const { data: loadedTopicData } = await (supabase as any)
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
          preloadImage(firstImagesToPreload[0]).catch(() => { });
          firstImagesToPreload.slice(1).forEach((url, index) => {
            setTimeout(() => {
              preloadImage(url).catch(() => { });
            }, (index + 1) * 300);
          });
        }
      } else {
        // Старый способ загрузки вопросов (для обычных тестов)
        // Get current user profile
        const { data: { user } } = await supabase.auth.getUser();
        let profileId = null;

        if (user) {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
          profileId = profile?.id;
        }

        let query = (supabase as any)
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

        // Shuffle and limit questions (не исключаем уже отвеченные)
        const shuffled = uniqueQuestions.sort(() => Math.random() - 0.5);
        const limited = shuffled.slice(0, questionCount);

        setQuestions(limited);

        // Предзагружаем первые несколько изображений для быстрого старта
        const firstImagesToPreload = limited
          .slice(0, 3)
          .map(q => q.image_url)
          .filter(Boolean) as string[];

        if (firstImagesToPreload.length > 0) {
          // Предзагружаем первое изображение сразу
          preloadImage(firstImagesToPreload[0]).catch(() => { });

          // Остальные предзагружаем с задержкой
          firstImagesToPreload.slice(1).forEach((url, index) => {
            setTimeout(() => {
              preloadImage(url).catch(() => { });
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

  const practiceLikeModes = ["practice", "blitz", "mastery", "sequential", "module", "challenge-bank", "dgt", "pdd-ticket"];
  const isPracticeLikeMode = practiceLikeModes.includes(mode);

  const handleAnswer = async (optionId?: string) => {
    const answerId = optionId || selectedOption;
    if (!answerId) return;

    // Специальная обработка для экзамена ПДД РФ
    if (mode === 'exam-russia' && russiaExam.currentQuestion) {
      const selectedAnswer = russiaExam.currentQuestion.answers.find(a => a.id === answerId);
      const isCorrect = selectedAnswer?.isCorrect || false;

      const result = russiaExam.handleAnswer(isCorrect);

      if (!result.shouldContinue) {
        // Провал экзамена - показываем модалку вместо мгновенного перехода
        setFailureReason(result.failureReason || "Экзамен не сдан");
        setShowFailureModal(true);
        // Не блокируем UI сразу, позволяем модалке перекрыть всё

        // Обновляем состояние ответа, чтобы пользователь видел свою ошибку под модалкой (если видно)
        const newAnswer: Answer = {
          questionId: russiaExam.currentQuestion.id,
          selectedAnswerId: answerId,
          isCorrect,
        };
        setAnswers([...answers, newAnswer]);
        return;
      }

      // Блокируем интерфейс при ошибке
      if (!isCorrect && result?.shouldAddExtra) {
        setIsAnswerLocked(true);
        setPenaltyBlock(result.blockId || null);
        setShowPenaltyAlert(true);

        // Добавляем штрафное время (используем хук таймера)
        if (result.extraTime) {
          addPenalty(result.extraTime / 60); // Hook expects minutes
          toast.info(`+${Math.floor(result.extraTime / 60)} минут добавлено за ошибку`, {
            icon: "⏱️",
            className: "bg-orange-500 text-white border-none",
          });
        }

        // Вибрация при ошибке
        if (isTelegramApp) {
          triggerHapticFeedback('error');
        }

        // Обновляем состояние ответа
        const newAnswer: Answer = {
          questionId: russiaExam.currentQuestion.id,
          selectedAnswerId: answerId,
          isCorrect,
        };
        setAnswers([...answers, newAnswer]);

        // Не переходим к следующему вопросу - ждем закрытия модального окна
        return;
      }

      // Обновляем состояние
      const newAnswer: Answer = {
        questionId: russiaExam.currentQuestion.id,
        selectedAnswerId: answerId,
        isCorrect,
      };
      setAnswers([...answers, newAnswer]);

      // Если экзамен завершен (сдан или провален) - это теперь обрабатывается в useEffect


      // Переходим к следующему вопросу
      if (russiaExam.isExtraMode) {
        setCurrentIndex(russiaExam.progress.current - 1);
      } else {
        setCurrentIndex(russiaExam.progress.current - 1);
      }

      setSelectedOption(null);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);
      return;
    }

    // Обычная логика для других режимов
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || !currentQuestion.answer_options) {
      toast.error("Ошибка: вопрос не найден");
      return;
    }
    const selectedAnswer = currentQuestion.answer_options.find(opt => opt.id === answerId);
    const isCorrect = selectedAnswer?.is_correct || false;

    // Вибрация в Telegram Web App при ответе
    if (isTelegramApp) {
      if (isCorrect) {
        triggerHapticFeedback('success');
      } else {
        triggerHapticFeedback('error');
      }
    }

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      selectedAnswerId: answerId,
      isCorrect,
    };

    const updatedAnswers = [...(answers || []), newAnswer];
    setAnswers(updatedAnswers);

    // КРИТИЧНО: Сохраняем ответ локально для offline режима
    if (testInfo?.id) {
      saveTestProgress(
        testInfo.id,
        mode,
        updatedAnswers.map(a => ({
          questionId: a.questionId,
          selectedAnswerId: a.selectedAnswerId,
          isCorrect: a.isCorrect,
          timestamp: Date.now(),
        })),
        currentIndex,
        startTime
      ).catch((error) => {
        console.error('[TestSession] Error saving progress locally:', error);
      });
    }

    // Mastery Mode: добавляем неправильные вопросы для повторения
    if (mode === "mastery" && !isCorrect) {
      if (!masteryWrongQuestions.includes(currentQuestion.id)) {
        setMasteryWrongQuestions([...masteryWrongQuestions, currentQuestion.id]);
      }
    }

    // НЕ показываем Lumi автоматически - только по клику на floating button
    // Это экономит токены AI

    // Добавляем вопрос в Challenge Bank при первой ошибке (не в mastery mode)
    if (!isCorrect && profileId && mode !== "mastery") {
      try {
        console.log('[Challenge Bank] Условия: isCorrect=', isCorrect, 'profileId=', profileId, 'mode=', mode);

        // Проверяем, первая ли это ошибка в тесте
        const wrongAnswersInThisTest = answers.filter(a => !a.isCorrect).length;
        const showNotification = wrongAnswersInThisTest === 0 && isFirstWrongAnswer;

        console.log('[Challenge Bank] wrongAnswersInThisTest=', wrongAnswersInThisTest, 'isFirstWrongAnswer=', isFirstWrongAnswer, 'showNotification=', showNotification);

        // Закрашиваем иконку синим при ЛЮБОЙ ошибке
        setIsQuestionBookmarked(true);

        // Уведомление показываем только при ПЕРВОЙ ошибке и если пользователь не скрыл его
        const isNotificationHidden = localStorage.getItem('challenge-bank-notification-hidden') === 'true';
        if (showNotification && !isNotificationHidden) {
          console.log('[Challenge Bank] Показываем уведомление!');
          setIsFirstWrongAnswer(false);
          setShowChallengeBankNotification(true);
        }

        // Добавляем или обновляем вопрос в Challenge Bank
        // @ts-ignore - таблица user_challenge_questions существует в БД, но типы не обновлены
        const { data: existing, error: selectError } = await (supabase as any)
          .from('user_challenge_questions')
          .select('id, times_wrong')
          .eq('user_id', profileId)
          .eq('question_id', currentQuestion.id)
          .maybeSingle();

        if (selectError) {
          console.error('[Challenge Bank] Ошибка при проверке существующего вопроса:', selectError);
        }

        if (existing) {
          // Обновляем существующую запись
          // @ts-ignore - таблица user_challenge_questions существует в БД, но типы не обновлены
          const { error: updateError } = await (supabase as any)
            .from('user_challenge_questions')
            .update({
              times_wrong: existing.times_wrong + 1,
              last_wrong_at: new Date().toISOString(),
              mastered: false, // Сбрасываем статус "освоено"
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('[Challenge Bank] Ошибка при обновлении:', updateError);
          } else {
            console.log('[Challenge Bank] Вопрос обновлен в БД');
          }
        } else {
          // Создаем новую запись
          // @ts-ignore - таблица user_challenge_questions существует в БД, но типы не обновлены
          const { error: insertError } = await (supabase as any)
            .from('user_challenge_questions')
            .insert({
              user_id: profileId,
              question_id: currentQuestion.id,
              times_wrong: 1,
              last_wrong_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('[Challenge Bank] Ошибка при вставке:', insertError);
          } else {
            console.log('[Challenge Bank] Новый вопрос добавлен в БД');
          }
        }
      } catch (error) {
        console.error('[Challenge Bank] Общая ошибка:', error);
      }
    } else {
      console.log('[Challenge Bank] Условия не выполнены: isCorrect=', isCorrect, 'profileId=', !!profileId, 'mode=', mode);
    }

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

          const { error } = await (supabase as any)
            .from("user_progress")
            .upsert(progressData, {
              onConflict: 'user_id,question_id',
            });

          if (error) {
            // Игнорируем ошибки 409 (Conflict) - это нормально при параллельных запросах
            if (error.code !== '23505' && !error.message?.includes('409')) {
              console.error('[TestSession] Error upserting user_progress:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    if (isPracticeLikeMode) {
      // НЕ открываем Lumi автоматически - только по клику пользователя
      // setShowAIExplanation(true); // ОТКЛЮЧЕНО для лучшего UX

      // Уведомления убраны - результат виден в UI через цветовую индикацию ответов
    } else {
      // Exam mode: no feedback, no early termination, just move to next question
      // Don't finish test early - let user complete all questions
      // Reset selection and move to next question immediately
      setSelectedOption(null);
      nextQuestion();
    }
  };

  // КРИТИЧНО: Отслеживание онлайн/офлайн статуса и синхронизация
  // FIX: Используем useOnlineStatus хук, события обрабатываются там
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    // Отслеживаем изменение с offline на online
    if (!prevOnlineRef.current && isOnline) {
      setPendingSync(true);

      // Синхронизируем сохраненные ответы при восстановлении связи
      if (testInfo?.id && answers.length > 0) {
        toast.success('Соединение восстановлено', {
          description: 'Синхронизируем ваши ответы...',
          duration: 3000,
        });

        // Здесь можно добавить синхронизацию с сервером
        // Пока просто сохраняем локально
        saveTestProgress(
          testInfo.id,
          mode,
          answers.map(a => ({
            questionId: a.questionId,
            selectedAnswerId: a.selectedAnswerId,
            isCorrect: a.isCorrect,
            timestamp: Date.now(),
          })),
          currentIndex,
          startTime
        ).then(() => {
          setPendingSync(false);
          toast.success('Прогресс синхронизирован', { duration: 2000 });
        }).catch((error) => {
          console.error('[TestSession] Error syncing progress:', error);
          setPendingSync(false);
        });
      }
    }

    // Отслеживаем изменение с online на offline
    if (prevOnlineRef.current && !isOnline) {
      toast.warning('Потеряно соединение с интернетом', {
        description: 'Ваши ответы сохраняются локально',
        duration: 5000,
      });
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline, testInfo, answers, currentIndex, startTime, mode]);

  // Прокрутка вверх при изменении вопроса
  useEffect(() => {
    if (questions.length > 0 && currentIndex >= 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex, questions.length]);

  const jumpToQuestion = (index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    setSelectedOption(null);
    setShowTranslation(false);
    setShowAIExplanation(false); // Закрываем AI чат
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      // Always reset translation and AI chat, especially for exam mode
      setShowTranslation(false);
      setShowAIExplanation(false);
    } else {
      finishTest();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
      setShowTranslation(false);
      setShowAIExplanation(false); // Закрываем AI чат
    }
  };

  const finishTest = async () => {
    // КРИТИЧНО: Очищаем локальное сохранение после завершения теста
    if (testInfo?.id) {
      clearTestProgress(testInfo.id).catch((error) => {
        console.error('[TestSession] Error clearing saved progress:', error);
      });
    }

    // MASTERY MODE: Если есть неправильные вопросы - повторяем!
    if (mode === "mastery" && masteryWrongQuestions.length > 0) {
      const wrongQuestionsData = questions.filter(q => masteryWrongQuestions.includes(q.id));

      if (wrongQuestionsData.length > 0) {
        toast.info(
          `Раунд ${masteryRound} завершён! Повторяем ${wrongQuestionsData.length} неправильных вопросов 🔄`,
          { duration: 3000 }
        );

        // Перезапускаем с неправильными вопросами
        setQuestions(wrongQuestionsData);
        setMasteryWrongQuestions([]); // Очищаем для следующего раунда
        setMasteryRound(masteryRound + 1);
        setCurrentIndex(0);
        setAnswers([]);
        setSelectedOption(null);
        setShowTranslation(false);
        setShowAIExplanation(false);
        return; // НЕ завершаем тест!
      }
    }

    // Если Mastery Mode и все правильно - показываем поздравление!
    if (mode === "mastery") {
      toast.success(`🎉 ИДЕАЛЬНО! Все вопросы правильно за ${masteryRound} раундов!`, { duration: 5000 });
    }

    const correctCount = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctCount / Math.max(1, questions.length)) * 100);
    const timeSpent = startTime > 0
      ? Math.floor((Date.now() - startTime) / 1000)
      : initialTimeBudget > 0
        ? initialTimeBudget - timeLeft
        : 0;

    let rewardResult: TestRewardResult | null = null;

    try {
      // Если это sequential тест, обновляем прогресс через функцию
      if (testId && profileId) {
        const { error: progressError } = await (supabase as any).rpc('update_test_progress', {
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

      // Для module-теста сохраняем прогресс по теме с мягким порогом (>= 70%)
      if (mode === "module" && profileId && topic) {
        try {
          await (supabase as any)
            .from("user_topic_progress")
            .upsert(
              {
                user_id: profileId,
                topic_id: topic,
                subtopic_id: null,
                completed: score >= 70,
                score,
              },
              { onConflict: "user_id,topic_id,subtopic_id" }
            );
        } catch (progressError) {
          console.error("Error updating module topic progress:", progressError);
        }
      }

      // Сохраняем в game_sessions для совместимости
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const duration = timeSpent;
          const sessionData = {
            user_id: profile.id,
            game_type: testId
              ? "test_sequential"
              : mode === "exam"
                ? "test_exam"
                : mode === "blitz"
                  ? "test_blitz"
                  : mode === "module"
                    ? "test_module"
                    : "test_practice",
            score: Math.min(Math.max(0, score), 100), // Ensure 0-100 range
            total_questions: Math.min(Math.max(1, questions.length), 100), // Ensure 1-100 range
            duration_seconds: Math.min(Math.max(0, duration), 7200), // Ensure 0-7200 range
          };

          await (supabase as any).from("game_sessions").insert(sessionData);
        }
      }
    } catch (error) {
      console.error("Error saving results:", error);
    }

    if (profileId) {
      try {
        const sessionId = getOrCreateSessionId();

        // OFFLINE-FIRST: Если offline - добавляем в очередь вместо прямой отправки
        // FIX: Используем checkOnlineStatus() вместо navigator.onLine
        const realOnline = await checkOnlineStatus();
        if (!realOnline) {
          console.log("[TestSession] Offline mode detected, queuing test result for later sync");

          await enqueueOfflineAction('test-result', {
            user_id: profileId,
            session_id: sessionId,
            test_id: testId || null,
            score,
            questions_count: questions.length,
            correct_count: correctCount,
            test_duration_seconds: Math.max(timeSpent, 0),
            premium_flag: Boolean(isPremium),
            double_sp_active: false,
          });

          // Базовые награды для UI (будут пересчитаны при sync)
          const baseCoins = Math.max(2, Math.floor(score / 10));
          const baseSP = Math.max(1, Math.floor(score / 20));

          rewardResult = {
            coins_awarded: baseCoins,
            sp_awarded: baseSP,
            message: "Результат сохранён локально. Награды будут начислены при восстановлении сети.",
          } as TestRewardResult;

          trackOfflineAction('test-submit', true);

          toast.info("Результат сохранён. Награды будут начислены при восстановлении соединения.", {
            duration: 4000,
          });
        } else {
          // ONLINE: Обычная отправка
          const { data: rewardData, error: rewardError } = await supabase.functions.invoke("complete-test-and-award", {
            body: {
              user_id: profileId,
              session_id: sessionId,
              test_id: testId || null,
              score,
              questions_count: questions.length,
              correct_count: correctCount,
              test_duration_seconds: Math.max(timeSpent, 0),
              premium_flag: Boolean(isPremium),
              double_sp_active: false,
            },
          });

          if (rewardError) throw rewardError;
          rewardResult = rewardData as TestRewardResult;

          trackOfflineAction('test-submit', true);
          console.log("[TestSession] Rewards awarded successfully:", rewardResult);
        }
      } catch (awardError: any) {
        console.error("[TestSession] Error awarding test:", awardError);

        trackOfflineAction('test-submit', false, awardError.message);

        // Fallback: показываем базовые награды локально (без начисления в БД)
        // Пользователь сможет повторить тест или награды начислятся при следующем запуске
        const baseCoins = Math.max(2, Math.floor(score / 10));
        const baseSP = Math.max(1, Math.floor(score / 20));

        rewardResult = {
          success: false,
          coins_awarded: baseCoins,
          sp_awarded: baseSP,
          message: "Награды будут начислены позже",
        } as TestRewardResult;

        // Показываем предупреждение (не ошибку), чтобы не пугать пользователя
        toast.warning("Результаты сохранены. Награды будут начислены при восстановлении соединения.", {
          duration: 5000,
        });
      }
    }

    navigate("/test/results", {
      state: {
        questions,
        answers,
        mode: testId ? "sequential" : mode,
        timeSpent,
        testId,
        testInfo,
        rewardResult,
        sessionId: testSessionIdRef.current,
      },
    });
  };

  const formatTime = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds)) return "20:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

  // Для экзамена РФ используем вопрос из russiaExam
  const currentQuestion = mode === 'exam-russia' && russiaExam.currentQuestion
    ? {
      id: russiaExam.currentQuestion.id,
      question_ru: russiaExam.currentQuestion.text,
      question_es: russiaExam.currentQuestion.text,
      question_en: russiaExam.currentQuestion.text,
      image_url: russiaExam.currentQuestion.image,
      explanation_ru: russiaExam.currentQuestion.explanation,
      explanation_es: russiaExam.currentQuestion.explanation,
      explanation_en: russiaExam.currentQuestion.explanation,
      topics: russiaExam.currentQuestion.topics && russiaExam.currentQuestion.topics.length > 0
        ? { title_ru: russiaExam.currentQuestion.topics[0], title_es: russiaExam.currentQuestion.topics[0] }
        : null,
      answer_options: russiaExam.currentQuestion.answers.map(a => ({
        id: a.id,
        text_ru: a.text,
        text_es: a.text,
        text_en: a.text,
        is_correct: a.isCorrect,
        position: a.position || 0,
      })),
    }
    : questions[currentIndex];

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

  // Для экзамена РФ используем прогресс из russiaExam
  const progress = mode === 'exam-russia' && russiaExam.progress
    ? (russiaExam.progress.current / russiaExam.progress.total) * 100
    : questions.length > 0 ? (answers.length / questions.length) * 100 : 0;
  const errorCount = mode === 'exam-russia' && russiaExam.stats
    ? russiaExam.stats.totalErrors
    : answers.filter((a) => !a.isCorrect).length;

  const getQuestionText = (lang: 'ru' | 'es' | 'en'): string => {
    if (lang === 'ru') return currentQuestion.question_ru;
    if (lang === 'en') return currentQuestion.question_en;
    return currentQuestion.question_es;
  };

  // Приоритет: showTranslation (кнопка) > testLanguage (настройки)
  const displayQuestion = showTranslation
    ? currentQuestion.question_ru
    : getQuestionText(testLanguage);
  const displayTopic = currentQuestion.topics?.title_es || 'Sin tema';

  // Размеры шрифта
  const fontSizeClasses = [
    'text-sm sm:text-base md:text-lg', // small
    'text-base sm:text-lg md:text-xl', // default
    'text-lg sm:text-xl md:text-2xl',  // large
  ];

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
    const modeLabel = mode === "exam" ? "экзамена" : mode === "blitz" ? "Blitz-теста" : "теста";
    if (window.confirm(`Вы уверены, что хотите выйти из ${modeLabel}? Ваш прогресс не будет сохранен.`)) {
      navigate("/tests");
    }
  };

  return (
    <Layout>
      {/* Layout: В экзамене - центрированный широкий блок, в practice - grid с AI Widget */}
      <div className={cn(
        "mx-auto transition-all duration-300",
        !isTelegramApp && isPracticeLikeMode
          ? "flex flex-col lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] lg:items-start lg:gap-3 xl:gap-4 max-w-full lg:max-w-[1370px] px-2 sm:px-4"
          : mode === "exam" && !isTelegramApp
            ? "lg:max-w-[1100px] lg:px-4"
            : "container px-2 sm:px-4"
      )}>
        {/* Основной контент */}
        <div
          data-testid="test-content-block"
          className={cn(
            // Для Telegram: Layout уже применяет padding-top через safe-area, поэтому не добавляем дополнительный отступ
            // Для мобильной версии браузера добавляем небольшой отступ сверху
            isTelegramApp
              ? "px-2 sm:px-4 pt-0"
              : "pt-4 sm:pt-1 md:pt-3 pb-2 md:pb-3"
          )}
        >
          {/* КРИТИЧНО: Индикатор офлайн статуса */}
          {!isOnline && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Офлайн режим: ответы сохраняются локально</span>
            </div>
          )}
          {pendingSync && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Синхронизация прогресса...</span>
            </div>
          )}

          {/* Progress Bar - SegmentedExamProgress для exam-russia, QuestionProgressBar для остальных */}
          <div className={cn(
            "mb-3 sm:mb-4",
            mode === 'exam-russia' ? "sticky top-0 z-50 -mx-4 px-4 py-4 bg-background/95 backdrop-blur-md border-b border-border/50" : "mt-2 sm:mt-3 md:mt-4"
          )}>
            {mode === 'exam-russia' && russiaExam.state && russiaExam.progress ? (
              <ExamHeader
                timeLeft={timeLeft}
                totalQuestions={20}
                currentQuestionIndex={russiaExam.isExtraMode ? 20 + russiaExam.progress.current - 1 : russiaExam.progress.current - 1}
                extraQuestionsCount={russiaExam.state.extraQuestions.length}
                answers={russiaExamAnswers}
                errorsCount={russiaExam.stats?.totalErrors || 0}
                maxErrors={2} // Max allowed errors
                mode="exam-russia"
              />
            ) : (
              <QuestionProgressBar
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                answers={answers}
                hideScoreIndicators={mode === "exam" || mode === "exam-russia"}
                onClose={!isTelegramApp ? handleClose : undefined}
                showClose={!isTelegramApp}
                onShowQuestionMap={() => setShowQuestionMap(true)}
                showQuestionMap={mode !== 'exam-russia'}
                onToggleBookmark={profileId ? toggleBookmark : undefined}
                isBookmarked={isQuestionBookmarked}
                bookmarkLoading={bookmarkLoading}
                customLeftContent={
                  <>
                    {/* Timer для экзамена и блица */}
                    {(mode === "exam" || mode === "blitz") && (
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-background/80 backdrop-blur-md border border-border/50 shadow-sm shrink-0">
                        <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft < 300 ? "text-destructive" : "text-foreground/70"}`} />
                        <span className={`font-mono font-semibold text-xs sm:text-sm ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                    )}

                    {/* Mastery Round Indicator */}
                    {mode === "mastery" && masteryRound > 1 && (
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-500/10 backdrop-blur-md border border-blue-500/30 shadow-sm shrink-0">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                          Раунд {masteryRound}
                        </span>
                      </div>
                    )}
                  </>
                }
                SettingsMenuComponent={
                  <TestSettingsMenu
                    open={showTestSettings}
                    onOpenChange={setShowTestSettings}
                    voiceOver={voiceOver}
                    onVoiceOverChange={setVoiceOver}
                    answerPopularity={answerPopularity}
                    onAnswerPopularityChange={setAnswerPopularity}
                    ambientMusic={ambientMusic}
                    onAmbientMusicChange={setAmbientMusic}
                    fontSize={fontSize}
                    onFontSizeChange={setFontSize}
                    language={testLanguage}
                    onLanguageChange={setTestLanguage}
                    hideLanguageSelector={mode === 'pdd-ticket' || mode === 'exam-russia'}
                  />
                }
              />
            )}
          </div>


          {/* Question Card - используем UniversalQuestionCard для exam-russia */}
          {mode === 'exam-russia' && russiaExam.currentQuestion ? (
            <motion.div
              key={russiaExam.currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "max-w-4xl mx-auto w-full mt-6",
                isAnswerLocked && "opacity-50 pointer-events-none"
              )}
            >
              <UniversalQuestionCard
                mode="exam-russia"
                question={russiaExam.currentQuestion.text}
                image={russiaExam.currentQuestion.image}
                imageAspectRatio={russiaExam.currentQuestion.image ? getCachedImageAspectRatio(russiaExam.currentQuestion.image) : null}
                explanation={russiaExam.currentQuestion.explanation || null}
                answers={russiaExam.currentQuestion.answers.map(a => ({
                  id: a.id,
                  text: a.text,
                  isCorrect: a.isCorrect,
                }))}
                selectedAnswerId={selectedOption}
                showResult={false} // на экзамене не показываем результат сразу
                disabled={isAnswerLocked || selectedOption !== null}
                onAnswerClick={(answerId) => {
                  if (mode === "exam-russia" && !isAnswerLocked) {
                    setSelectedOption(answerId);
                  }
                }}
                onShowExplanation={selectedOption ? () => setShowAIExplanation(true) : undefined}
                fontSize={fontSize}
                header={
                  russiaExam.isExtraMode && (
                    <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        ДОПОЛНИТЕЛЬНЫЙ БЛОК: ОШИБКИ НЕДОПУСТИМЫ
                      </p>
                    </div>
                  )
                }
                footer={
                  <div className="flex gap-2 items-center mt-6">
                    <AppButton
                      context="primary"
                      onClick={() => handleAnswer()}
                      disabled={!selectedOption || isAnswerLocked}
                      className={cn(
                        "flex-1 h-12 sm:h-14 text-lg font-bold rounded-xl shadow-lg transition-all duration-300 relative overflow-hidden group",
                        selectedOption && !isAnswerLocked
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 scale-100 shadow-slate-900/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 scale-[0.98] shadow-none"
                      )}
                    >
                      {selectedOption && !isAnswerLocked && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        ПОДТВЕРДИТЬ
                        {selectedOption && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                      </span>
                    </AppButton>
                  </div>
                }
              />
            </motion.div>
          ) : (
            <Card
              data-testid="question-card"
              className="p-3 sm:p-4 md:p-6 bg-background border-border/50 shadow-xl backdrop-blur-sm"
            >
              {/* Layout: для России - вертикальный (изображение сверху), для других стран - двухколоночный */}
              {currentQuestion.image_url ? (
                selectedCountry === 'russia' ? (
                  // Вертикальный layout для России (изображение сверху)
                  <div className="space-y-4 md:space-y-6">
                    {/* Image on top */}
                    <div className="w-full">
                      <QuestionImageComponent imageUrl={currentQuestion.image_url} compact />
                    </div>
                    {/* Question text and answers below */}
                    <div className="flex flex-col">
                      {/* Question Text */}
                      <div className="mb-4 sm:mb-6">
                        <div className="relative p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-card border-2 border-border/50 shadow-sm">
                          <h2 className={`${fontSizeClasses[fontSize]} font-semibold leading-relaxed sm:leading-relaxed text-foreground whitespace-pre-line transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'} pr-12`}>
                            {displayQuestion}
                          </h2>
                          {/* Translation Button (Practice Only) - в правом нижнем углу */}
                          {/* Скрываем для русских тестов ПДД - вопросы уже на русском */}
                          {isPracticeLikeMode && mode !== 'pdd-ticket' && mode !== 'exam-russia' && (
                            <button
                              onClick={toggleTranslation}
                              className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors z-10"
                              title={showTranslation ? "Показать оригинал" : "Показать перевод на русский"}
                            >
                              <Languages className="w-3 h-3" />
                              <span>{showTranslation ? "ES" : "RU"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Answer Options */}
                      <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
                        {sortedOptions.map((option, optionIndex) => {
                          const isSelected = selectedOption === option.id;
                          const isCorrect = option.is_correct;
                          const showResult = selectedOption !== null && isPracticeLikeMode;
                          // Ответы тоже учитывают showTranslation (кнопка перевода)
                          const displayText = showTranslation
                            ? option.text_ru
                            : (testLanguage === 'en' ? option.text_en : option.text_es);

                          // Mock popularity data (в реальной версии загружать из БД)
                          const mockPopularity = isCorrect ? Math.floor(75 + Math.random() * 20) : Math.floor(5 + Math.random() * 20);

                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                if (mode === "exam") {
                                  setSelectedOption(option.id);
                                } else if (!selectedOption) {
                                  setSelectedOption(option.id);
                                  handleAnswer(option.id);
                                }
                              }}
                              disabled={isPracticeLikeMode && selectedOption !== null}
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
                          ${selectedOption === null && "cursor-pointer active:scale-[0.99]"}
                        `}
                            >
                              <div className="flex items-center justify-between gap-2 sm:gap-3">
                                <span className={`flex-1 ${fontSizeClasses[fontSize]} transition-opacity duration-300 leading-relaxed ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                                  {displayText}
                                </span>

                                {/* Answer Popularity - как на driving-tests.org */}
                                {answerPopularity && showResult && (
                                  <span className={cn(
                                    "text-xs sm:text-sm font-bold px-2 py-1 rounded-md shrink-0",
                                    isCorrect ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" : "text-muted-foreground"
                                  )}>
                                    {mockPopularity}%
                                  </span>
                                )}

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

                      {/* Explanation убрано - теперь показывается через Lumi */}

                      {/* Navigation Buttons - с аватаром Lumi на мобильном */}
                      <div className="flex gap-2 items-center">
                        {/* Lumi Avatar - на маленьких экранах в браузере и в Telegram (всегда видна в practice режиме) */}
                        {isPracticeLikeMode && (
                          <button
                            onClick={() => setShowAIExplanation(true)}
                            className="group w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 via-orange-500 to-orange-600 hover:from-yellow-400 hover:via-orange-400 hover:to-orange-500 shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90 shrink-0 relative overflow-hidden lg:hidden ring-2 ring-orange-400/50 hover:ring-orange-300/80"
                            aria-label="Спросить Skily"
                          >
                            {/* Пульсирующий эффект */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 opacity-60 animate-pulse" />
                            {/* Светящийся эффект при hover */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 opacity-0 group-hover:opacity-40 transition-opacity duration-300 blur-sm" />
                            {/* Lumi аватар */}
                            <LumiCharacter size="sm" mood="happy" animate={true} className="relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                            {/* Внешнее свечение */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300" />
                          </button>
                        )}

                        {isPracticeLikeMode && selectedOption ? (
                          <Button
                            onClick={nextQuestion}
                            className="flex-1 font-bold shadow-2xl text-sm sm:text-base md:text-lg bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 h-10 sm:h-11 md:h-12"
                          >
                            {currentIndex < questions.length - 1 ? (
                              <>
                                <span>{selectedCountry === 'russia' ? 'Следующий' : 'Siguiente'}</span>
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </>
                            ) : (
                              <>
                                <span>{selectedCountry === 'russia' ? 'Завершить ✓' : 'Finalizar ✓'}</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleAnswer()}
                            disabled={!selectedOption}
                            variant={undefined}
                            className="!flex-1 !font-medium text-sm sm:text-base md:text-lg !bg-slate-900 hover:!bg-slate-800 dark:!bg-slate-50 dark:hover:!bg-slate-100 !text-white dark:!text-slate-900 disabled:!bg-zinc-100 disabled:hover:!bg-zinc-100 dark:disabled:!bg-zinc-900 dark:disabled:hover:!bg-zinc-900 disabled:!text-zinc-600 dark:disabled:!text-zinc-400 disabled:!cursor-not-allowed disabled:!shadow-none disabled:!opacity-100 h-10 sm:h-11 md:h-12 !rounded-lg transition-all duration-200 !shadow-sm hover:!shadow-md active:scale-[0.98] !border !border-zinc-300 dark:!border-zinc-700 disabled:!border-zinc-300 dark:disabled:!border-zinc-700"
                          >
                            {selectedCountry === 'russia' ? 'Ответить' : 'Responder'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Двухколоночный layout для других стран
                  <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[350px_1fr] gap-4 md:gap-6">
                    {/* Left Column: Image */}
                    <div className="w-full md:sticky md:top-4 md:self-start">
                      <QuestionImageComponent imageUrl={currentQuestion.image_url} compact />
                    </div>

                    {/* Right Column: Question Text & Answers */}
                    <div className="flex flex-col">
                      {/* Question Text */}
                      <div className="mb-4 sm:mb-6">
                        <div className="relative p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-card border-2 border-border/50 shadow-sm">
                          <h2 className={`${fontSizeClasses[fontSize]} font-semibold leading-relaxed sm:leading-relaxed text-foreground whitespace-pre-line transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'} pr-12`}>
                            {displayQuestion}
                          </h2>
                          {/* Translation Button (Practice Only) - в правом нижнем углу */}
                          {/* Скрываем для русских тестов ПДД - вопросы уже на русском */}
                          {isPracticeLikeMode && mode !== 'pdd-ticket' && mode !== 'exam-russia' && (
                            <button
                              onClick={toggleTranslation}
                              className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors z-10"
                              title={showTranslation ? "Показать оригинал" : "Показать перевод на русский"}
                            >
                              <Languages className="w-3 h-3" />
                              <span>{showTranslation ? "ES" : "RU"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Answer Options */}
                      <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
                        {sortedOptions.map((option, optionIndex) => {
                          const isSelected = selectedOption === option.id;
                          const isCorrect = option.is_correct;
                          const showResult = selectedOption !== null && isPracticeLikeMode;
                          // Ответы тоже учитывают showTranslation (кнопка перевода)
                          const displayText = showTranslation
                            ? option.text_ru
                            : (testLanguage === 'en' ? option.text_en : option.text_es);

                          // Mock popularity data
                          const mockPopularity = isCorrect ? Math.floor(75 + Math.random() * 20) : Math.floor(5 + Math.random() * 20);

                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                if (mode === "exam") {
                                  setSelectedOption(option.id);
                                } else if (!selectedOption) {
                                  setSelectedOption(option.id);
                                  handleAnswer(option.id);
                                }
                              }}
                              disabled={isPracticeLikeMode && selectedOption !== null}
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
                            ${selectedOption === null && "cursor-pointer active:scale-[0.99]"}
                          `}
                            >
                              <div className="flex items-center justify-between gap-2 sm:gap-3">
                                <span className={`flex-1 ${fontSizeClasses[fontSize]} transition-opacity duration-300 leading-relaxed ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                                  {displayText}
                                </span>

                                {/* Answer Popularity - как на driving-tests.org */}
                                {answerPopularity && showResult && (
                                  <span className={cn(
                                    "text-xs sm:text-sm font-bold px-2 py-1 rounded-md shrink-0",
                                    isCorrect ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" : "text-muted-foreground"
                                  )}>
                                    {mockPopularity}%
                                  </span>
                                )}

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

                      {/* Explanation убрано - теперь показывается через Lumi */}

                      {/* Navigation Buttons - с аватаром Lumi на мобильном */}
                      <div className="flex gap-2 items-center">
                        {/* Lumi Avatar - на маленьких экранах в браузере и в Telegram (всегда видна в practice режиме) */}
                        {isPracticeLikeMode && (
                          <button
                            onClick={() => setShowAIExplanation(true)}
                            className="group w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 via-orange-500 to-orange-600 hover:from-yellow-400 hover:via-orange-400 hover:to-orange-500 shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90 shrink-0 relative overflow-hidden lg:hidden ring-2 ring-orange-400/50 hover:ring-orange-300/80"
                            aria-label="Спросить Skily"
                          >
                            {/* Пульсирующий эффект */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 opacity-60 animate-pulse" />
                            {/* Светящийся эффект при hover */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 opacity-0 group-hover:opacity-40 transition-opacity duration-300 blur-sm" />
                            {/* Lumi аватар */}
                            <LumiCharacter size="sm" mood="happy" animate={true} className="relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                            {/* Внешнее свечение */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300" />
                          </button>
                        )}

                        {isPracticeLikeMode && selectedOption ? (
                          <Button
                            onClick={nextQuestion}
                            className="flex-1 font-bold shadow-2xl text-sm sm:text-base md:text-lg bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 h-10 sm:h-11 md:h-12"
                          >
                            {currentIndex < questions.length - 1 ? (
                              <>
                                <span>{selectedCountry === 'russia' ? 'Следующий' : 'Siguiente'}</span>
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </>
                            ) : (
                              <>
                                <span>{selectedCountry === 'russia' ? 'Завершить ✓' : 'Finalizar ✓'}</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleAnswer()}
                            disabled={!selectedOption}
                            variant={undefined}
                            className="!flex-1 !font-medium text-sm sm:text-base md:text-lg !bg-slate-900 hover:!bg-slate-800 dark:!bg-slate-50 dark:hover:!bg-slate-100 !text-white dark:!text-slate-900 disabled:!bg-zinc-100 disabled:hover:!bg-zinc-100 dark:disabled:!bg-zinc-900 dark:disabled:hover:!bg-zinc-900 disabled:!text-zinc-600 dark:disabled:!text-zinc-400 disabled:!cursor-not-allowed disabled:!shadow-none disabled:!opacity-100 h-10 sm:h-11 md:h-12 !rounded-lg transition-all duration-200 !shadow-sm hover:!shadow-md active:scale-[0.98] !border !border-zinc-300 dark:!border-zinc-700 disabled:!border-zinc-300 dark:disabled:!border-zinc-700"
                          >
                            {selectedCountry === 'russia' ? 'Ответить' : 'Responder'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // Layout без изображения (вертикальный)
                <>
                  {/* Question Text */}
                  <div className="mb-4 sm:mb-6">
                    <div className="relative p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-card border-2 border-border/50 shadow-sm">
                      <h2 className={`${fontSizeClasses[fontSize]} font-semibold leading-relaxed sm:leading-relaxed text-foreground whitespace-pre-line transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'} pr-12`}>
                        {displayQuestion}
                      </h2>
                      {/* Translation Button (Practice Only) - в правом нижнем углу */}
                      {/* Скрываем для русских тестов ПДД - вопросы уже на русском */}
                      {isPracticeLikeMode && mode !== 'pdd-ticket' && mode !== 'exam-russia' && (
                        <button
                          onClick={toggleTranslation}
                          className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors z-10"
                          title={showTranslation ? "Показать оригинал" : "Показать перевод на русский"}
                        >
                          <Languages className="w-3 h-3" />
                          <span>{showTranslation ? "ES" : "RU"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
                    {sortedOptions.map((option, optionIndex) => {
                      const isSelected = selectedOption === option.id;
                      const isCorrect = option.is_correct;
                      const showResult = selectedOption !== null && isPracticeLikeMode;
                      // Ответы тоже учитывают showTranslation (кнопка перевода)
                      const displayText = showTranslation
                        ? option.text_ru
                        : (testLanguage === 'en' ? option.text_en : option.text_es);

                      // Mock popularity data
                      const mockPopularity = isCorrect ? Math.floor(75 + Math.random() * 20) : Math.floor(5 + Math.random() * 20);

                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            if (mode === "exam") {
                              setSelectedOption(option.id);
                            } else if (!selectedOption) {
                              setSelectedOption(option.id);
                              handleAnswer(option.id);
                            }
                          }}
                          disabled={isPracticeLikeMode && selectedOption !== null}
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
                    ${selectedOption === null && "cursor-pointer active:scale-[0.99]"}
                  `}
                        >
                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            <span className={`flex-1 ${fontSizeClasses[fontSize].replace('md:', 'sm:')} transition-opacity duration-300 leading-relaxed ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                              {displayText}
                            </span>

                            {/* Answer Popularity - как на driving-tests.org */}
                            {answerPopularity && showResult && (
                              <span className={cn(
                                "text-xs sm:text-sm font-bold px-2 py-1 rounded-md shrink-0",
                                isCorrect ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" : "text-muted-foreground"
                              )}>
                                {mockPopularity}%
                              </span>
                            )}

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

                  {/* Explanation убрано - теперь показывается через Lumi */}

                  {/* Navigation Buttons - с аватаром Lumi на мобильном */}
                  <div className="flex gap-2 items-center">
                    {/* Lumi Avatar - на маленьких экранах в браузере и в Telegram (всегда видна в practice режиме) */}
                    {isPracticeLikeMode && (
                      <button
                        onClick={() => setShowAIExplanation(true)}
                        className="group w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 via-orange-500 to-orange-600 hover:from-yellow-400 hover:via-orange-400 hover:to-orange-500 shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90 shrink-0 relative overflow-hidden lg:hidden ring-2 ring-orange-400/50 hover:ring-orange-300/80"
                        aria-label="Спросить Skily"
                      >
                        {/* Пульсирующий эффект */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 opacity-60 animate-pulse" />
                        {/* Светящийся эффект при hover */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 opacity-0 group-hover:opacity-40 transition-opacity duration-300 blur-sm" />
                        {/* Lumi аватар */}
                        <LumiCharacter size="sm" mood="happy" animate={true} className="relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
                        {/* Внешнее свечение */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300" />
                      </button>
                    )}
                    {isPracticeLikeMode && selectedOption ? (
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
                        onClick={() => handleAnswer()}
                        disabled={!selectedOption}
                        variant={undefined}
                        className="!flex-1 !font-medium text-sm sm:text-base md:text-lg !bg-slate-900 hover:!bg-slate-800 dark:!bg-slate-50 dark:hover:!bg-slate-100 !text-white dark:!text-slate-900 disabled:!bg-zinc-100 disabled:hover:!bg-zinc-100 dark:disabled:!bg-zinc-900 dark:disabled:hover:!bg-zinc-900 disabled:!text-zinc-600 dark:disabled:!text-zinc-400 disabled:!cursor-not-allowed disabled:!shadow-none disabled:!opacity-100 h-10 sm:h-11 md:h-12 !rounded-lg transition-all duration-200 !shadow-sm hover:!shadow-md active:scale-[0.98] !border !border-zinc-300 dark:!border-zinc-700 disabled:!border-zinc-300 dark:disabled:!border-zinc-700"
                      >
                        {selectedCountry === 'russia' ? 'Ответить' : 'Responder'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Report Problem Button - под блоком с тестом */}
          <div className="mt-4 sm:mt-5 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReportModal(true)}
              className="text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5 bg-muted/50 hover:bg-muted border-border/60 hover:border-border text-foreground/80 hover:text-foreground font-medium shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 sm:w-4.5 sm:h-4.5 mr-2 text-muted-foreground" />
              <span>{userLanguage === "es" ? "Reportar problema" : "Сообщить о проблеме"}</span>
            </Button>
          </div>
        </div>

        {/* Question Map Bottom Sheet */}
        {showQuestionMap && (
          <>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'
                }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && !isClosing) {
                  handleCloseModal();
                }
              }}
            />
            {/* Bottom Sheet - Dynamic height based on content, width equals body (1370px) */}
            <div
              className={`fixed left-1/2 bottom-0 z-[100] bg-card border-t border-border rounded-t-2xl sm:rounded-t-3xl shadow-2xl overflow-hidden flex flex-col ${!isDragging && !isClosing ? 'transition-transform duration-300 ease-out' : isClosing ? 'transition-transform duration-300 ease-in' : ''
                } ${!isClosing && !isDragging ? 'translate-y-0' : 'translate-y-full'
                }`}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxHeight: 'calc(90vh - 40px)', // Максимальная высота с небольшим запасом
                height: 'auto', // Автоматическая высота по контенту
                bottom: '0px',
                maxWidth: '1370px', // Ширина равна ширине body
                width: '100%',
                left: '50%',
                transform: isDragging && dragCurrentY > dragStartY
                  ? `translate(-50%, ${dragCurrentY - dragStartY}px)`
                  : 'translateX(-50%)'
              }}
              onTouchStart={(e) => {
                if (isClosingRef.current || isClosing) return;
                const touch = e.touches[0];
                if (touch) {
                  // Начинаем драг только если свайп начинается с верхней части модального окна (drag handle или header)
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const touchY = touch.clientY;
                  const touchX = touch.clientX;
                  const relativeY = touchY - rect.top;

                  // Проверяем, что касание в верхней части (drag handle + header, примерно 120px)
                  // И что контент не прокручен (можно свайпать только когда контент вверху)
                  if (relativeY < 120 && touchX > rect.left && touchX < rect.right && contentScrollTop === 0) {
                    e.stopPropagation();
                    setIsDragging(true);
                    setDragStartY(touch.clientY);
                    setDragCurrentY(touch.clientY);
                  }
                }
              }}
              onTouchMove={(e) => {
                if (isDragging && !isClosingRef.current && !isClosing) {
                  e.preventDefault();
                  e.stopPropagation();

                  const touch = e.touches[0];
                  if (touch) {
                    const deltaY = touch.clientY - dragStartY;
                    // Разрешаем свайп только вниз
                    if (deltaY > 0) {
                      // Используем requestAnimationFrame для плавности
                      if (animationFrameRef.current !== null) {
                        cancelAnimationFrame(animationFrameRef.current);
                      }

                      animationFrameRef.current = requestAnimationFrame(() => {
                        setDragCurrentY(touch.clientY);
                      });
                    }
                  }
                }
              }}
              onTouchEnd={(e) => {
                if (isDragging && !isClosingRef.current) {
                  e.preventDefault();
                  e.stopPropagation();

                  // Отменяем анимацию
                  if (animationFrameRef.current !== null) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                  }

                  const dragDistance = dragCurrentY - dragStartY;
                  // Порог для закрытия: 80px или 20% высоты экрана
                  const threshold = Math.max(80, window.innerHeight * 0.2);

                  if (dragDistance > threshold) {
                    handleCloseModal();
                  } else {
                    // Возвращаем на место с анимацией
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
                        e.preventDefault();
                        if (!isClosingRef.current && !isClosing) {
                          handleCloseModal();
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      aria-label="Закрыть"
                      disabled={isClosingRef.current || isClosing}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content - Auto height based on content with padding for legend */}
              <div
                className="overflow-y-auto px-4 sm:px-6 py-4 bg-card"
                style={{ maxHeight: 'calc(90vh - 200px)' }} // Максимальная высота с учетом header и legend
                onScroll={(e) => {
                  // Отслеживаем позицию скролла контента
                  setContentScrollTop(e.currentTarget.scrollTop);
                }}
                onTouchStart={(e) => {
                  // Предотвращаем начало свайпа при скролле контента
                  if (isDragging) {
                    e.stopPropagation();
                  }
                }}
              >
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
                <div className="mt-6 pt-4 border-t border-border pb-6">
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

              {/* Белый фон снизу для закрытия прозрачного пространства - расширяем до самого низа */}
              <div className="absolute bottom-0 left-0 right-0 bg-card" style={{
                height: '100px',
                transform: 'translateY(100%)',
                zIndex: -1
              }} />
            </div>
          </>
        )}

        {/* Report Problem Modal */}
        <ReportProblemModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          questionId={currentQuestion.id}
          questionText={showTranslation ? currentQuestion.question_ru : (testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es)}
        />


        {/* AI Explanation Dialog - работает в practice режиме и exam-russia */}
        {(isPracticeLikeMode || mode === 'exam-russia') && (
          <AIExplanationDialog
            open={showAIExplanation}
            onClose={() => setShowAIExplanation(false)}
            question={mode === 'exam-russia' && russiaExam.currentQuestion
              ? russiaExam.currentQuestion.text
              : (showTranslation ? currentQuestion.question_ru : (testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es))}
            correctAnswer={mode === 'exam-russia' && russiaExam.currentQuestion
              ? russiaExam.currentQuestion.answers.find(a => a.isCorrect)?.text || ''
              : (sortedOptions.find((opt) => opt.is_correct)?.[showTranslation ? 'text_ru' : (testLanguage === 'en' ? 'text_en' : 'text_es')] || '')}
            userAnswer={mode === 'exam-russia' && russiaExam.currentQuestion && selectedOption
              ? russiaExam.currentQuestion.answers.find(a => a.id === selectedOption)?.text
              : (selectedOption ? sortedOptions.find((opt) => opt.id === selectedOption)?.[showTranslation ? 'text_ru' : (testLanguage === 'en' ? 'text_en' : 'text_es')] : undefined)}
            isCorrect={mode === 'exam-russia' && russiaExam.currentQuestion && selectedOption
              ? (russiaExam.currentQuestion.answers.find(a => a.id === selectedOption)?.isCorrect || false)
              : (selectedOption ? (sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false) : false)}
            explanation={mode === 'exam-russia' && russiaExam.currentQuestion
              ? (selectedOption ? russiaExam.currentQuestion.explanation : null)
              : (selectedOption ? (showTranslation ? currentQuestion.explanation_ru : (testLanguage === 'en' ? currentQuestion.explanation_en : currentQuestion.explanation_es)) : null)}
            explanationRu={mode === 'exam-russia' && russiaExam.currentQuestion
              ? (selectedOption ? russiaExam.currentQuestion.explanation : null)
              : (selectedOption ? currentQuestion.explanation_ru : null)}
            explanationEs={mode === 'exam-russia' && russiaExam.currentQuestion
              ? (selectedOption ? russiaExam.currentQuestion.explanation : null)
              : (selectedOption ? currentQuestion.explanation_es : null)}
            explanationEn={mode === 'exam-russia' && russiaExam.currentQuestion
              ? (selectedOption ? russiaExam.currentQuestion.explanation : null)
              : (selectedOption ? currentQuestion.explanation_en : null)}
            topic={mode === 'exam-russia' && russiaExam.currentQuestion
              ? (russiaExam.currentQuestion.topics && russiaExam.currentQuestion.topics.length > 0 ? russiaExam.currentQuestion.topics[0] : undefined)
              : currentQuestion.topics?.title_es}
            imageUrl={mode === 'exam-russia' && russiaExam.currentQuestion
              ? russiaExam.currentQuestion.image
              : currentQuestion.image_url}
            showTranslation={showTranslation}
            onToggleTranslation={toggleTranslation}
            testLanguage={testLanguage}
          />
        )}

        {/* AI Widget Lumi - только в режиме практики в браузере (не в Telegram), НЕ в экзамене */}
        {/* Только на больших экранах (lg+) - справа, на маленьких используется кнопка в навигации */}
        {!isTelegramApp && isPracticeLikeMode && (
          <div className={cn(
            "hidden lg:flex lg:flex-col pt-0 md:pt-3",
            !isTelegramApp && "pb-2 md:pb-3"
          )}>
            <div className="sticky top-4 w-full flex flex-col">
              <AIWidget
                explanation={selectedOption ? (showTranslation ? currentQuestion.explanation_ru : (testLanguage === 'en' ? currentQuestion.explanation_en : currentQuestion.explanation_es)) : null}
                explanationRu={selectedOption ? currentQuestion.explanation_ru : null}
                explanationEs={selectedOption ? currentQuestion.explanation_es : null}
                explanationEn={selectedOption ? currentQuestion.explanation_en : null}
                question={showTranslation ? currentQuestion.question_ru : (testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es)}
                correctAnswer={sortedOptions.find((opt) => opt.is_correct)?.[showTranslation ? 'text_ru' : (testLanguage === 'en' ? 'text_en' : 'text_es')] || ''}
                userAnswer={selectedOption ? sortedOptions.find((opt) => opt.id === selectedOption)?.[showTranslation ? 'text_ru' : (testLanguage === 'en' ? 'text_en' : 'text_es')] : undefined}
                isCorrect={sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false}
                topic={currentQuestion.topics?.title_es}
                imageUrl={currentQuestion.image_url}
                showTranslation={showTranslation}
                onToggleTranslation={toggleTranslation}
                testLanguage={testLanguage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Challenge Bank Notification - fixed позиционирование относительно viewport */}
      <ChallengeBankNotification
        isVisible={showChallengeBankNotification}
        onClose={() => setShowChallengeBankNotification(false)}
      />

      {/* Account Watermark - защита от передачи аккаунтов */}
      <AccountWatermark variant="default" />

      {/* Penalty Alert Modal для exam-russia */}
      {mode === 'exam-russia' && (
        <>
          <PenaltyAlert
            open={showPenaltyAlert}
            blockNumber={penaltyBlock || 0}
            questionsAdded={russiaExam.state?.extraQuestions.length || 0}
            minutesAdded={5}
            onContinue={() => {
              setShowPenaltyAlert(false);
              setPenaltyBlock(null);
              setIsAnswerLocked(false);

              // Переходим к следующему вопросу
              if (russiaExam.isExtraMode) {
                setCurrentIndex(russiaExam.progress.current - 1);
              } else {
                setCurrentIndex(russiaExam.progress.current - 1);
              }

              setSelectedOption(null);
              setIsTransitioning(true);
              setTimeout(() => setIsTransitioning(false), 300);
            }}
          />

          <ExamFailureModal
            open={showFailureModal}
            reason={failureReason}
            onViewResults={() => {
              navigate('/test/results', {
                state: {
                  questions: questions,
                  answers: answers,
                  mode: mode,
                  testInfo: testInfo,
                  // Используем timeSpent из статистики, если есть
                  timeSpent: russiaExam.stats?.timeSpent ?? Math.floor((Date.now() - startTime) / 1000),
                  russiaExamStats: russiaExam.stats,
                },
              });
            }}
          />
        </>
      )}
    </Layout>
  );
};

export default TestSession;
