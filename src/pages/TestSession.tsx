import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useUserContext } from "@/contexts/UserContext";
import { Clock, CheckCircle2, XCircle, Languages, Lightbulb, ChevronLeft, ChevronRight, Grid3x3, X, Maximize2, AlertTriangle, Bot, MessageCircle, Bookmark, BookmarkCheck, MoreVertical, Trophy } from "lucide-react";
import { QuestionProgressBar } from "@/components/QuestionProgressBar";
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
import { AIWidget } from "@/components/AIWidget";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { TestSettingsMenu } from "@/components/TestSettingsMenu";
import { ChallengeBankNotification } from "@/components/ChallengeBankNotification";

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
            className="w-full h-auto object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.01] block"
            loading="lazy"
            onClick={() => compact && setIsDialogOpen(true)}
            onError={() => {
              console.error(`[TestSession] Failed to load image: ${imageSrc}`);
              setHasError(true);
            }}
            style={{
              minHeight: compact ? '200px' : '180px',
              maxHeight: compact ? '500px' : '288px',
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
          <div 
            className="relative w-full h-full flex items-center justify-center"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), var(--tg-content-safe-area-inset-top, 0px))',
              paddingBottom: 'max(env(safe-area-inset-bottom), var(--tg-content-safe-area-inset-bottom, 0px))',
              paddingLeft: 'max(env(safe-area-inset-left), 16px)',
              paddingRight: 'max(env(safe-area-inset-right), 16px)',
            }}
          >
            <img 
              src={imageSrc || ''} 
              alt="Вопрос - увеличенное изображение" 
              className="max-w-full max-h-full w-auto h-auto object-contain"
              style={{
                imageRendering: 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            />
            <button
              onClick={() => setIsDialogOpen(false)}
              className="absolute bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 transition-colors z-20 shadow-2xl"
              style={{
                top: 'calc(max(env(safe-area-inset-top), var(--tg-content-safe-area-inset-top, 0px)) + 16px)',
                right: 'calc(max(env(safe-area-inset-right), 16px) + 16px)',
              }}
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
  const [searchParams] = useSearchParams();
  const { profileId } = useUserContext();
  
  // Получаем количество вопросов из URL
  const questionCount = parseInt(searchParams.get('count') || '30');
  const [language, setLanguage] = useState<'ru' | 'es'>('es');
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
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
  const [showChallengeBankNotification, setShowChallengeBankNotification] = useState(false);
  const [isFirstWrongAnswer, setIsFirstWrongAnswer] = useState(true);
  const [isQuestionBookmarked, setIsQuestionBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showTestSettings, setShowTestSettings] = useState(false);
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
    return saved ? saved === 'true' : false;
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('test-font-size');
    return saved ? parseInt(saved) : 1;
  });
  const [testLanguage, setTestLanguage] = useState<'es' | 'ru' | 'en'>(() => {
    const saved = localStorage.getItem('test-language');
    return (saved as 'es' | 'ru' | 'en') || 'es';
  });
  
  // Mastery Mode - отслеживаем неправильные вопросы для повторения
  const [masteryWrongQuestions, setMasteryWrongQuestions] = useState<string[]>([]);
  const [masteryRound, setMasteryRound] = useState(1);
  
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
      const questionText = testLanguage === 'ru' ? currentQuestion.question_ru : 
                          testLanguage === 'en' ? currentQuestion.question_en :
                          currentQuestion.question_es;

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
      if (testLanguage === 'ru') {
        // Для русского: ищем женский Google или Yandex голос
        preferredVoice = voices.find(v => v.lang.startsWith('ru') && (v.name.includes('Google') || v.name.includes('Yandex') || v.name.includes('Female'))) ||
                        voices.find(v => v.lang.startsWith('ru'));
      } else if (testLanguage === 'en') {
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
      utterance.lang = testLanguage === 'ru' ? 'ru-RU' : 
                       testLanguage === 'en' ? 'en-US' : 
                       'es-ES';
      
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
  }, [mode, topic, testId, profileId]);

  // Проверяем, добавлен ли текущий вопрос в закладки
  useEffect(() => {
    if (profileId && questions.length > 0 && questions[currentIndex]?.id) {
      checkIfBookmarked();
    }
  }, [profileId, currentIndex, questions]);

  const checkIfBookmarked = async () => {
    if (!profileId || !questions.length || !questions[currentIndex]?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_challenge_questions')
        .select('id')
        .eq('user_id', profileId)
        .eq('question_id', questions[currentIndex].id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsQuestionBookmarked(!!data);
    } catch (error) {
      console.error('Error checking bookmark:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!profileId || !questions.length || !questions[currentIndex]?.id || bookmarkLoading) return;

    const questionId = questions[currentIndex].id;

    try {
      setBookmarkLoading(true);

      if (isQuestionBookmarked) {
        // Удаляем из закладок
        const { error } = await supabase
          .from('user_challenge_questions')
          .delete()
          .eq('user_id', profileId)
          .eq('question_id', questionId);

        if (error) throw error;
        toast.success("Удалено из закладок");
        setIsQuestionBookmarked(false);
      } else {
        // Добавляем в закладки
        const { data: existing } = await supabase
          .from('user_challenge_questions')
          .select('id, times_wrong')
          .eq('user_id', profileId)
          .eq('question_id', questionId)
          .maybeSingle();

        if (existing) {
          // Уже есть, просто показываем сообщение
          toast.success("Вопрос уже в закладках");
          setIsQuestionBookmarked(true);
        } else {
          // Создаем новую запись с times_wrong = 0 (добавлено вручную)
          const { error: insertError } = await supabase
            .from('user_challenge_questions')
            .insert({
              user_id: profileId,
              question_id: questionId,
              times_wrong: 0, // 0 означает добавлено вручную, не через ошибку
              last_wrong_at: new Date().toISOString(),
            });

          if (insertError) throw insertError;
          toast.success("Добавлено в закладки");
          setIsQuestionBookmarked(true);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error("Не удалось изменить закладку");
    } finally {
      setBookmarkLoading(false);
    }
  };

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
      
      // Если это режим Challenge Bank, загружаем вопросы с ошибками
      if (mode === 'challenge-bank' && profileId) {
        const { data: challengeQuestions, error: challengeError } = await supabase
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
        let query = supabase
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
        const { data, error } = await supabase
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

  const handleAnswer = async (optionId?: string) => {
    const answerId = optionId || selectedOption;
    if (!answerId) return;

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || !currentQuestion.answer_options) {
      toast.error("Ошибка: вопрос не найден");
      return;
    }
    const selectedAnswer = currentQuestion.answer_options.find(opt => opt.id === answerId);
    const isCorrect = selectedAnswer?.is_correct || false;

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      selectedAnswerId: answerId,
      isCorrect,
    };

    setAnswers([...(answers || []), newAnswer]);
    
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
        
        // Уведомление показываем только при ПЕРВОЙ ошибке
        if (showNotification) {
          console.log('[Challenge Bank] Показываем уведомление!');
          setIsFirstWrongAnswer(false);
          setShowChallengeBankNotification(true);
          // Скрываем уведомление через 5 секунд
          setTimeout(() => {
            setShowChallengeBankNotification(false);
          }, 5000);
        }

        // Добавляем или обновляем вопрос в Challenge Bank
        // @ts-ignore - таблица user_challenge_questions существует в БД, но типы не обновлены
        const { data: existing, error: selectError } = await supabase
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
          const { error: updateError } = await supabase
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
          const { error: insertError } = await supabase
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
          
          await supabase.from("user_progress").upsert(progressData);
        }
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    if (mode === "practice" || mode === "dgt" || mode === "mastery") {
      // НЕ открываем Lumi автоматически - только по клику пользователя
      // setShowAIExplanation(true); // ОТКЛЮЧЕНО для лучшего UX
      
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
      nextQuestion();
    }
  };
  
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
    if (window.confirm("Вы уверены, что хотите выйти из экзамена? Ваш прогресс не будет сохранен.")) {
      navigate("/tests");
    }
  };

  return (
    <Layout>
      {/* Layout: В экзамене - центрированный широкий блок, в practice - grid с AI Widget */}
        <div className={cn(
        "mx-auto transition-all duration-300",
        !isTelegramApp && mode === "practice" 
          ? "flex flex-col lg:grid lg:grid-cols-[1fr_400px] lg:gap-4 max-w-full lg:max-w-[1370px] px-2 sm:px-4" 
          : mode === "exam" && !isTelegramApp
          ? "lg:max-w-[1100px] lg:px-4"
          : "container px-2 sm:px-4"
        )}>
        {/* Основной контент */}
        <div className={cn(
          "pt-0 sm:pt-1 md:pt-3 pb-2 md:pb-3",
          isTelegramApp && "px-2 sm:px-4 !pt-12"
        )}>
        {/* Unified Progress Bar - переиспользуемый компонент */}
        <div className="mb-3 sm:mb-4 -mt-6 sm:-mt-3 md:mt-0">
          <QuestionProgressBar
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            onClose={!isTelegramApp ? handleClose : undefined}
            showClose={!isTelegramApp}
            onShowQuestionMap={() => setShowQuestionMap(true)}
            showQuestionMap={true}
            onToggleBookmark={profileId ? toggleBookmark : undefined}
            isBookmarked={isQuestionBookmarked}
            bookmarkLoading={bookmarkLoading}
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
              />
            }
            customLeftContent={
              <>
                {/* Timer для экзамена */}
            {mode === "exam" && (
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-background/80 backdrop-blur-md border border-border/50 shadow-sm shrink-0">
                    <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft < 300 ? "text-destructive" : "text-foreground/70"}`} />
                    <span className={`font-mono font-semibold text-xs sm:text-sm ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                )}

                {/* Mastery Round Indicator */}
                {mode === "mastery" && masteryRound > 1 && (
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-purple-500/10 backdrop-blur-md border border-purple-500/30 shadow-sm shrink-0">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-semibold text-xs sm:text-sm text-purple-600 dark:text-purple-400">
                      Раунд {masteryRound}
            </span>
          </div>
                )}
              </>
            }
          />
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
                    <h2 className={`${fontSizeClasses[fontSize]} font-semibold leading-relaxed sm:leading-relaxed text-foreground whitespace-pre-line transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                      {displayQuestion}
                    </h2>
                  </div>
                </div>

                {/* Translation Button (Practice Only) */}
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
                </div>
                )}

                {/* Answer Options */}
                <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
                  {sortedOptions.map((option, optionIndex) => {
                    const isSelected = selectedOption === option.id;
                    const isCorrect = option.is_correct;
                    const showResult = selectedOption !== null && mode === "practice";
                    // Ответы тоже учитывают showTranslation (кнопка перевода)
                    const displayText = showTranslation 
                      ? option.text_ru 
                      : (testLanguage === 'ru' ? option.text_ru : testLanguage === 'en' ? option.text_en : option.text_es);
                    
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
                        disabled={mode === "practice" && selectedOption !== null}
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

                {/* Report Problem Button - под ответами */}
                <div className="mb-4 sm:mb-5 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                    onClick={() => setShowReportModal(true)}
                    className="text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-all"
                    >
                    <AlertTriangle className="w-4 h-4 sm:w-4.5 sm:h-4.5 mr-2" />
                    <span>{language === "es" ? "Reportar problema" : "Сообщить о проблеме"}</span>
                    </Button>
            </div>

                {/* Navigation Buttons - с аватаром Lumi на мобильном */}
                <div className="flex gap-2 items-center">
                  {/* Lumi Avatar - на маленьких экранах в браузере и в Telegram (всегда видна в practice режиме) */}
                  {mode === "practice" && (
                    <button
                      onClick={() => setShowAIExplanation(true)}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg flex items-center justify-center transition-all active:scale-95 shrink-0 relative overflow-hidden lg:hidden"
                      aria-label="Спросить Lumi"
                    >
                      <LumiCharacter size="sm" mood="happy" animate={false} className="relative z-10" />
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-400 opacity-30 blur-md" />
                    </button>
                  )}
                  
                  {mode === "practice" && selectedOption ? (
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
            <h2 className={`${fontSizeClasses[fontSize]} font-semibold leading-relaxed sm:leading-relaxed text-foreground whitespace-pre-line transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {displayQuestion}
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
            </div>
          )}

          {/* Answer Options */}
          <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-6">
            {sortedOptions.map((option, optionIndex) => {
              const isSelected = selectedOption === option.id;
              const isCorrect = option.is_correct;
              const showResult = selectedOption !== null && mode === "practice";
              // Ответы тоже учитывают showTranslation (кнопка перевода)
              const displayText = showTranslation 
                ? option.text_ru 
                : (testLanguage === 'ru' ? option.text_ru : testLanguage === 'en' ? option.text_en : option.text_es);
              
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
                  disabled={mode === "practice" && selectedOption !== null}
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
            {mode === "practice" && (
              <button
                onClick={() => setShowAIExplanation(true)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg flex items-center justify-center transition-all active:scale-95 shrink-0 relative overflow-hidden lg:hidden"
                aria-label="Спросить Lumi"
              >
                <LumiCharacter size="sm" mood="happy" animate={false} className="relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-400 opacity-30 blur-md" />
              </button>
            )}
            {mode === "practice" && selectedOption ? (
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
                    className="flex-1 font-bold shadow-2xl text-sm sm:text-base md:text-lg bg-accent text-accent-foreground hover:bg-accent/90 h-10 sm:h-11 md:h-12"
              >
                Responder
              </Button>
            )}
          </div>
            </>
          )}
        </Card>
      </div>

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

      {/* Report Problem Modal */}
      <ReportProblemModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        questionId={currentQuestion.id}
        questionText={showTranslation ? currentQuestion.question_ru : currentQuestion.question_es}
      />


      {/* AI Explanation Dialog - работает всегда в practice режиме */}
      {mode === "practice" && (
        <AIExplanationDialog
          open={showAIExplanation}
          onClose={() => setShowAIExplanation(false)}
          question={testLanguage === 'ru' ? currentQuestion.question_ru : testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es}
          correctAnswer={
            sortedOptions.find((opt) => opt.is_correct)?.[testLanguage === 'ru' ? 'text_ru' : testLanguage === 'en' ? 'text_en' : 'text_es'] || ''
          }
          userAnswer={
            selectedOption ? sortedOptions.find((opt) => opt.id === selectedOption)?.[testLanguage === 'ru' ? 'text_ru' : testLanguage === 'en' ? 'text_en' : 'text_es'] : undefined
          }
          isCorrect={selectedOption ? (sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false) : false}
          explanation={selectedOption ? (testLanguage === 'ru' ? currentQuestion.explanation_ru : testLanguage === 'en' ? currentQuestion.explanation_en : currentQuestion.explanation_es) : null}
          topic={currentQuestion.topics?.[testLanguage === 'ru' ? 'title_ru' : 'title_es']}
          imageUrl={currentQuestion.image_url}
        />
      )}

      {/* AI Widget Lumi - только в режиме практики в браузере (не в Telegram), НЕ в экзамене */}
      {/* Только на больших экранах (lg+) - справа, на маленьких используется кнопка в навигации */}
      {!isTelegramApp && mode === "practice" && (
        <div className="hidden lg:flex lg:flex-col pt-0 md:pt-3 pb-2 md:pb-3">
          <div className="sticky top-4 h-full">
            <AIWidget
              explanation={selectedOption ? (testLanguage === 'ru' ? currentQuestion.explanation_ru : testLanguage === 'en' ? currentQuestion.explanation_en : currentQuestion.explanation_es) : null}
              question={testLanguage === 'ru' ? currentQuestion.question_ru : testLanguage === 'en' ? currentQuestion.question_en : currentQuestion.question_es}
              correctAnswer={sortedOptions.find((opt) => opt.is_correct)?.[testLanguage === 'ru' ? 'text_ru' : testLanguage === 'en' ? 'text_en' : 'text_es'] || ''}
              userAnswer={selectedOption ? sortedOptions.find((opt) => opt.id === selectedOption)?.[testLanguage === 'ru' ? 'text_ru' : testLanguage === 'en' ? 'text_en' : 'text_es'] : undefined}
              isCorrect={sortedOptions.find((opt) => opt.id === selectedOption)?.is_correct || false}
              topic={currentQuestion.topics?.[testLanguage === 'ru' ? 'title_ru' : 'title_es']}
              imageUrl={currentQuestion.image_url}
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
    </Layout>
  );
};

export default TestSession;
