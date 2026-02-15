import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Maximize2, Minimize2, Languages, ThumbsUp, ThumbsDown, Mic, MicOff, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SkilyAICharacter } from "@/components/skily-ai/SkilyAICharacter";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from 'sonner';
import { triggerHapticFeedback } from "@/lib/telegram";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { AILimitReachedModal } from "@/components/ai/AILimitReachedModal";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface AIWidgetProps {
  explanation?: string | null;
  explanationRu?: string | null;
  explanationEs?: string | null;
  explanationEn?: string | null;
  question: string;
  correctAnswer: string;
  userAnswer?: string;
  isCorrect: boolean;
  topic?: string;
  imageUrl?: string | null;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  testLanguage?: 'es' | 'en' | 'ru';
  country?: 'spain' | 'russia';
}

export const AIWidget = ({
  explanation,
  explanationRu,
  explanationEs,
  explanationEn,
  question,
  correctAnswer,
  userAnswer,
  isCorrect,
  topic,
  imageUrl,
  showTranslation = false,
  onToggleTranslation,
  testLanguage = 'es',
  country = 'spain',
}: AIWidgetProps) => {
  const { enabled: aiEnabled } = useFeatureFlag('ai_chat_enabled', true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [messageRatings, setMessageRatings] = useState<Record<number, 1 | -1>>({});
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // AI Limit Modal State
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitData, setLimitData] = useState({ currentCount: 0, limit: 10, message: '' });


  // 🚦 FEATURE FLAG: Если AI чат отключен, не показываем виджет
  if (!aiEnabled) {
    return null;
  }

  // Определяем язык интерфейса на основе языка теста
  // Используем язык теста для интерфейса, но если showTranslation активен или testLanguage явный 'ru', используем русский
  const interfaceLanguage = testLanguage === 'ru' || showTranslation ? 'ru' : testLanguage;

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Ваш браузер не поддерживает голосовой ввод");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = interfaceLanguage === 'ru' ? 'ru-RU' : 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true; // Включаем, чтобы видеть процесс
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      // Haptic feedback start
      triggerHapticFeedback('light');
    };

    recognition.onend = () => setIsListening(false);

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error("Доступ к микрофону запрещен");
      }
    };

    // Храним текущий ввод до начала диктовки, чтобы корректно добавлять interim результаты
    let initialInput = input;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const transcript = finalTranscript || interimTranscript;

      if (transcript) {
        // Обновляем инпут: старый текст + пробел + новый текст
        setInput((prev) => {
          // Если это interim обновление, мы хотим заменить только последнюю диктуемую часть?
          // Простой вариант для чата: просто добавляем.
          // Но с interim это будет дергаться.
          // Упростим: покажем interim прямо в input.
          const prefix = initialInput ? initialInput + ' ' : '';
          return prefix + transcript;
        });

        if (finalTranscript) {
          initialInput = initialInput ? initialInput + ' ' + finalTranscript : finalTranscript;
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Показываем explanation из БД при загрузке
  // Используем правильный язык: приоритет showTranslation, затем explanation (уже зависит от testLanguage)
  useEffect(() => {
    if (messages.length === 0) {
      let explanationToShow = null;

      // Приоритет: showTranslation > explanation (который уже зависит от testLanguage)
      if (showTranslation && explanationRu && explanationRu.trim()) {
        explanationToShow = explanationRu;
      } else if (explanation && explanation.trim()) {
        // explanation уже содержит правильный язык в зависимости от testLanguage
        explanationToShow = explanation;
      }

      if (explanationToShow && explanationToShow.trim()) {
        setMessages([
          {
            role: "assistant",
            content: explanationToShow
          }
        ]);
      }
    }
  }, [explanation, explanationRu, explanationEs, explanationEn, showTranslation]);

  // Обновляем первое сообщение при изменении showTranslation (если это explanation из БД)
  useEffect(() => {
    if (messages.length > 0 && messages[0]?.role === 'assistant') {
      // Проверяем, что это explanation из БД (не AI ответ)
      const isDbExplanation = explanationRu || explanationEs || explanationEn || explanation;
      if (isDbExplanation) {
        let explanationToShow = null;

        if (showTranslation && explanationRu) {
          explanationToShow = explanationRu;
        } else if (explanation) {
          explanationToShow = explanation;
        }

        if (explanationToShow && messages[0].content !== explanationToShow) {
          setMessages(prev => {
            const updated = [...prev];
            updated[0] = { ...updated[0], content: explanationToShow };
            return updated;
          });
        }
      }
    }
  }, [showTranslation, explanation, explanationRu, explanationEs, explanationEn]);

  // Сброс при смене вопроса
  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsExpanded(false);
  }, [question]);

  // Измеряем высоту всего блока тестов и ограничиваем максимальную высоту виджета
  useEffect(() => {
    if (!widgetRef.current) return;

    // Находим весь блок тестов по data-testid (включает Question Card + кнопки навигации + кнопку Reportar problema)
    const testBlock = document.querySelector('[data-testid="test-content-block"]') as HTMLElement;

    if (!testBlock) {
      // Fallback: ищем родительский grid-контейнер и первую колонку
      const gridContainer = widgetRef.current.closest('[class*="grid"]');
      if (gridContainer) {
        const firstChild = gridContainer.firstElementChild as HTMLElement;
        if (firstChild && firstChild !== widgetRef.current.closest('.lg\\:flex')?.parentElement) {
          // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для избежания forced layout
          const updateMaxHeight = () => {
            requestAnimationFrame(() => {
              const blockHeight = firstChild.offsetHeight;
              if (blockHeight > 0) {
                setMaxHeight(blockHeight);
              }
            });
          };

          updateMaxHeight();
          const resizeObserver = new ResizeObserver(updateMaxHeight);
          resizeObserver.observe(firstChild);
          resizeObserver.observe(gridContainer as HTMLElement);

          return () => resizeObserver.disconnect();
        }
      }
      return;
    }

    // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для избежания forced layout
    const updateMaxHeight = () => {
      // Батчим чтение layout свойств в requestAnimationFrame
      requestAnimationFrame(() => {
        const blockHeight = testBlock.offsetHeight;
        if (blockHeight > 0) {
          setMaxHeight(blockHeight);
        }
      });
    };

    // Обновляем высоту при загрузке и изменении размера
    updateMaxHeight();

    const resizeObserver = new ResizeObserver(() => {
      // ResizeObserver уже вызывается в правильное время, но всё равно батчим
      updateMaxHeight();
    });

    resizeObserver.observe(testBlock);

    // Также наблюдаем за Question Card для надежности
    const questionCard = document.querySelector('[data-testid="question-card"]');
    if (questionCard) {
      resizeObserver.observe(questionCard as HTMLElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [question, isExpanded]);

  const askAI = async (userMessage: string) => {
    setIsLoading(true);
    let assistantMessage = "";

    // Адаптивный контекст и системный промпт в зависимости от страны
    const getRussiaSystemPrompt = () => `
# Роль
Ты — Skily, профессиональный и эмпатичный ИИ-инструктор по вождению, эксперт по Правилам дорожного движения Российской Федерации (ПДД РФ). Твоя цель — помочь ученику понять логику дороги, выучить правила и успешно сдать теоретический экзамен в ГИБДД.

# База знаний
1. Твои знания основаны исключительно на актуальных ПДД РФ (последняя редакция 2024-2025 гг.), КоАП РФ и официальных билетах ГИБДД.
2. Ты знаешь номера знаков (например, 3.27 "Остановка запрещена"), типы разметки и пункты правил.
3. Ты игнорируешь правила других стран, если тебя специально не спросят о сравнении.

# Стиль общения
1. **Не давай прямой ответ сразу.** Твоя задача — научить думать. Наводящими вопросами подталкивай ученика к правильному решению.
2. **Объясняй "почему".** Не просто цитируй сухой закон. Объясни логику безопасности: почему это правило существует?
3. **Ссылайся на пункты.** Когда пользователь выбрал ответ (или просит объяснения), укажи конкретный пункт ПДД (например, "п. 8.5") или номер знака. Это повышает доверие.
4. **Тон.** Дружелюбный, поддерживающий, но строгий в вопросах безопасности. Используй эмодзи (🚗, 🛑, 💡), но не перебарщивай.
5. **Краткость.** В чате мало места. Пиши лаконично, разбивай текст на абзацы.

# Сценарии

## Если ученик просит подсказку:
Не говори "Правильный ответ 2".
Скажи: "Обрати внимание на знак справа. Это знак приоритета или предписывающий? Вспомни правило проезда нерегулируемых перекрестков..."

## Если ученик ошибся:
Мягко укажи на ошибку. "Не совсем так. Ты подумал про помеху справа, но здесь действует знак 'Главная дорога'. Посмотри пункт 13.9 ПДД."

## Если ученик спрашивает "А в жизни так же?":
Честно отвечай, как это работает на практике в России (ДДД - Дай Дорогу Дураку), но подчеркивай, что на экзамене мы отвечаем строго по книжке.

# Безопасность прежде всего
Всегда напоминай, что главная цель — не сдать тест, а выжить на дороге и не навредить другим.
`;

    const getSpainSystemPrompt = () => `
Eres Skily, un instructor de conducción amigable y experto en las normativas de tráfico de España (DGT). Tu objetivo es ayudar al estudiante a comprender la lógica de conducción segura y aprobar el examen teórico.

Estilo de comunicación:
1. Sé claro y directo, pero nunca des la respuesta correcta de inmediato. Guía al estudiante con preguntas reflexivas.
2. Explica el "por qué" detrás de cada regla: la seguridad es lo primero.
3. Referencias específicas: Menciona señales por número (ej. R-101), artículos de la Ley de Tráfico, o normas DGT cuando sea relevante.
4. Tono cercano y motivador. Usa emojis (🚗, 🛑, 💡) con moderación.
5. Respuestas breves: el espacio en el chat es limitado.

Escenarios:
- Si el estudiante pide ayuda: Haz preguntas que lo lleven a reflexionar.
- Si el estudiante se equivoca: Señala el error con tacto y explica la lógica.
- Si pregunta sobre la práctica real: Sé honesto sobre cómo es en la carretera, pero recuerda que en el examen debes responder según el reglamento.

Siempre recuerda: la meta no es solo aprobar, sino conducir con seguridad.
`;

    // Выбираем промпт в зависимости от СТРАНЫ (не языка UI)
    const systemPrompt = country === 'russia'
      ? getRussiaSystemPrompt()
      : getSpainSystemPrompt();

    const context = `
${systemPrompt}

# ${interfaceLanguage === 'ru' ? 'Информация о текущем вопросе' : interfaceLanguage === 'en' ? 'Current Question Info' : 'Información sobre la pregunta actual'}:
${interfaceLanguage === 'ru' ? 'Вопрос' : interfaceLanguage === 'en' ? 'Question' : 'Pregunta'}: ${question}
${interfaceLanguage === 'ru' ? 'Правильный ответ' : interfaceLanguage === 'en' ? 'Correct Answer' : 'Respuesta correcta'}: ${correctAnswer}
${userAnswer ? `${interfaceLanguage === 'ru' ? 'Ответ пользователя' : interfaceLanguage === 'en' ? 'User Answer' : 'Respuesta del usuario'}: ${userAnswer}` : ''}
${interfaceLanguage === 'ru' ? 'Результат' : interfaceLanguage === 'en' ? 'Result' : 'Resultado'}: ${isCorrect ? (interfaceLanguage === 'ru' ? 'ПРАВИЛЬНО ✅' : 'CORRECTO ✅') : (interfaceLanguage === 'ru' ? 'НЕПРАВИЛЬНО ❌' : 'INCORRECTO ❌')}
${topic ? `${interfaceLanguage === 'ru' ? 'Тема' : interfaceLanguage === 'en' ? 'Topic' : 'Tema'}: ${topic}` : ''}
${explanation ? `\n${interfaceLanguage === 'ru' ? 'Официальное объяснение из базы' : interfaceLanguage === 'en' ? 'Official Explanation' : 'Explicación oficial'}: ${explanation}` : ''}
`;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: context },
            ...newMessages
          ],
          country,
          language: interfaceLanguage,
        }),
      });

      // 🔒 Handle AI Limit Reached (429)
      if (response.status === 429) {
        const errorData = await response.json();
        if (errorData.error === 'daily_limit_reached') {
          setLimitData({
            currentCount: errorData.current_count || 10,
            limit: errorData.limit || 10,
            message: errorData.message || ''
          });
          setLimitModalOpen(true);
          // Удаляем пустое сообщение ассистента
          setMessages(prev => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
      }

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                assistantMessage += content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                  };
                  return updated;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Error asking AI:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: interfaceLanguage === 'ru' ? "Произошла ошибка. Попробуйте ещё раз." : interfaceLanguage === 'en' ? "An error occurred. Please try again." : "Ocurrió un error. Por favor, inténtalo de nuevo.",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    askAI(userMessage);
  };

  const submitFeedback = async (messageIndex: number, rating: 1 | -1) => {
    if (messageRatings[messageIndex]) return; // Уже оценено

    try {
      triggerHapticFeedback(rating === 1 ? 'success' : 'error');

      // Здесь можно отправить feedback на сервер
      // const { data: { session } } = await supabase.auth.getSession();
      // await supabase.from('ai_feedback').insert({
      //   message_index: messageIndex,
      //   rating: rating,
      //   question_id: questionId,
      //   ...
      // });

      setMessageRatings(prev => ({ ...prev, [messageIndex]: rating }));

      // Используем правильный API для sonner
      if (rating === 1) {
        toast.success(interfaceLanguage === 'ru' ? "Спасибо за отзыв!" : "¡Gracias por tu comentario!", {
          description: interfaceLanguage === 'ru' ? "Ваш лайк помогает улучшить ответы" : "Tu me gusta ayuda a mejorar las respuestas",
          duration: 2000,
        });
      } else {
        toast.info(interfaceLanguage === 'ru' ? "Спасибо за обратную связь!" : "¡Gracias por tus comentarios!", {
          description: interfaceLanguage === 'ru' ? "Мы учтем ваше мнение" : "Tendremos en cuenta tu opinión",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  return (
    <>
      <Card
        ref={widgetRef}
        className={cn(
          "flex flex-col overflow-hidden border shadow-lg transition-all duration-300 rounded-2xl",
          "bg-card border-border/50",
          "dark:bg-slate-800/95 dark:border-white/10 dark:shadow-xl",
          isExpanded ? "" : "h-auto"
        )}
        style={{
          ...(isExpanded && maxHeight ? {
            height: `${maxHeight}px`,
            maxHeight: `${maxHeight}px`,
            overflow: 'hidden'
          } : maxHeight ? {
            maxHeight: `${maxHeight}px`,
            overflow: 'hidden'
          } : {})
        }}
      >
        {/* Header */}
        <div className="p-3 xl:p-4 border-b flex items-center shrink-0 gap-3 bg-muted/30 dark:bg-slate-900/50 dark:border-white/5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 xl:h-8 xl:w-8 shrink-0 text-muted-foreground hover:text-foreground order-first"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? (interfaceLanguage === 'ru' ? t('lumiCollapse') : interfaceLanguage === 'en' ? 'Collapse' : 'Contraer') : (interfaceLanguage === 'ru' ? t('lumiExpand') : interfaceLanguage === 'en' ? 'Expand' : 'Expandir')}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5 xl:h-4 xl:w-4" /> : <Maximize2 className="h-3.5 w-3.5 xl:h-4 xl:w-4" />}
          </Button>
          <div className="flex items-center gap-2 xl:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 xl:w-10 xl:h-10 flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-105">
              <SkilyAICharacter size="sm" mood="happy" className="scale-75" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm xl:text-base text-foreground dark:text-slate-100 truncate">
                {interfaceLanguage === 'ru' ? 'Привет! Я Скили 🚗💡' :
                  interfaceLanguage === 'en' ? "Hello! I'm Skily 💡" :
                    "¡Hola! Soy Skily 💡"}
              </h3>
            </div>
          </div>
        </div>

        {/* Messages Area - фиксированная высота с скроллом */}
        <div className={cn(
          "flex-1 overflow-y-auto p-4 xl:p-5 space-y-4 xl:space-y-6 scroll-smooth min-h-0 relative transition-colors duration-500",
          "bg-[#F8FAFF] dark:bg-slate-900/40"
        )}>
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.png')] mix-blend-overlay"></div>

          {messages.length === 0 ? (
            <div className="space-y-4 xl:space-y-5">
              {/* Welcome Message */}
              <div className="text-foreground dark:text-slate-200 text-xs xl:text-sm leading-relaxed whitespace-pre-line">
                <p>
                  {interfaceLanguage === 'ru'
                    ? (country === 'russia'
                      ? 'Привет! Я Скили — твой эксперт по ПДД РФ 🚗\n\nМоя задача не просто дать ответ, а научить тебя думать как водитель. Задавай вопросы, и я помогу разобраться в логике правил!'
                      : 'Привет! Я Скили — твой эксперт по правилам вождения в Испании (DGT) 🚗\n\nМоя задача не просто дать ответ, а научить тебя думать как водитель. Задавай вопросы, и я помогу разобраться в логике правил!')
                    : interfaceLanguage === 'en'
                      ? 'Hello! I am Skily — your driving instructor expert for Spain (DGT). My goal is not just to give you an answer, but to teach you how to think like a safe driver. Ask me anything about the rules!'
                      : '¡Hola! Soy Skily: tu instructor experto en el reglamento de la DGT de España. Mi misión no es solo darte la respuesta, sino enseñarte a pensar como un conductor seguro. ¡Pregúntame lo que necesites!'}
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 xl:gap-2.5">
                <Button
                  variant="outline"
                  className="h-auto py-2 xl:py-2.5 px-2.5 xl:px-3 text-[10px] xl:text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:border-blue-800 dark:hover:border-blue-700 rounded-lg whitespace-normal break-words"
                  onClick={() => {
                    // "Дай мне подсказку" - запрашиваем подсказку у AI (не правильный ответ)
                    const hintPrompt = interfaceLanguage === 'ru'
                      ? "Дай мне подсказку к этому вопросу, но не говори правильный ответ напрямую. Помоги мне подумать самостоятельно."
                      : interfaceLanguage === 'en'
                        ? "Give me a hint for this question, but don't tell me the correct answer directly. Help me think independently."
                        : "Dame una pista para esta pregunta, pero no me digas la respuesta correcta directamente. Ayúdame a pensar por mí mismo.";
                    askAI(hintPrompt);
                  }}
                  disabled={isLoading}
                >
                  {interfaceLanguage === 'ru' ? t('lumiHintButton') :
                    interfaceLanguage === 'en' ? 'Give me a hint' :
                      'Dame una pista'}
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-2 xl:py-2.5 px-2.5 xl:px-3 text-[10px] xl:text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:border-blue-800 dark:hover:border-blue-700 rounded-lg whitespace-normal break-words"
                  onClick={() => {
                    // "Помоги понять" - показываем explanation из БД, если есть
                    if (explanation) {
                      setMessages([{
                        role: "assistant",
                        content: explanation
                      }]);
                    } else {
                      // Если explanation нет, запрашиваем у AI
                      askAI(interfaceLanguage === 'ru' ? "Помоги мне понять это" : interfaceLanguage === 'en' ? "Help me understand this" : "Ayúdame a entender esto");
                    }
                  }}
                  disabled={isLoading}
                >
                  {interfaceLanguage === 'ru' ? t('lumiHelpButton') :
                    interfaceLanguage === 'en' ? 'Help me understand this' :
                      'Ayúdame a entender esto'}
                </Button>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index}>
                {message.role === "user" && (
                  <div className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="max-w-[85%] xl:max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-md shadow-indigo-500/10">
                      <div className="text-xs xl:text-sm font-medium leading-relaxed break-words">
                        {message.content}
                      </div>
                    </div>
                  </div>
                )}
                {message.role === "assistant" && (
                  <div className="flex gap-2 xl:gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center justify-center w-8 h-8 xl:w-10 xl:h-10 flex-shrink-0 drop-shadow-lg">
                      <SkilyAICharacter size="sm" mood="happy" className="scale-75" />
                    </div>
                    <div className="flex-1 min-w-0 mt-0.5 xl:mt-1">
                      {message.content ? (
                        <div className={cn(
                          "max-w-[90%] p-4 rounded-2xl rounded-tl-none text-xs xl:text-sm leading-relaxed transition-all prose prose-sm dark:prose-invert prose-p:my-1.5 xl:prose-p:my-2",
                          "bg-white dark:bg-slate-800/90 backdrop-blur-md border border-indigo-100/30 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-black/20"
                        )}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75" />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150" />
                        </div>
                      )}

                      {/* Feedback buttons и кнопка перевода под каждым сообщением от AI */}
                      {message.content && (
                        <div className="flex items-center gap-1 mt-2">
                          {/* Кнопка перевода - только для первого сообщения из БД */}
                          {index === 0 && onToggleTranslation && explanationRu && (explanationEs || explanationEn || explanation) && (
                            <button
                              onClick={() => {
                                if (onToggleTranslation) {
                                  // Определяем новый контент ПЕРЕД переключением showTranslation
                                  // Если сейчас показываем русский (showTranslation === true), переключаем на оригинал
                                  // Если сейчас показываем оригинал (showTranslation === false), переключаем на русский
                                  const newContent = showTranslation
                                    ? (explanationEs || explanationEn || explanation || '')
                                    : (explanationRu || '');

                                  // Обновляем сообщение синхронно перед переключением
                                  setMessages(prev => {
                                    const updated = [...prev];
                                    if (updated[0] && updated[0].role === 'assistant') {
                                      updated[0] = { ...updated[0], content: newContent };
                                    }
                                    return updated;
                                  });

                                  // Переключаем состояние
                                  onToggleTranslation();
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors h-7"
                              title={showTranslation ? (interfaceLanguage === 'ru' ? t('lumiShowOriginal') : interfaceLanguage === 'en' ? 'Show original' : 'Mostrar original') : (interfaceLanguage === 'ru' ? t('lumiShowTranslation') : interfaceLanguage === 'en' ? 'Show Russian translation' : 'Mostrar traducción al ruso')}
                            >
                              <Languages className="w-3 h-3" />
                              <span>{showTranslation ? (testLanguage === 'en' ? "EN" : "ES") : "RU"}</span>
                            </button>
                          )}

                          {/* Кнопки лайков для всех сообщений от AI */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => submitFeedback(index, 1)}
                            disabled={!!messageRatings[index]}
                            className={`h-7 px-2 hover:bg-muted ${messageRatings[index] === 1 ? 'bg-muted' : ''}`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${messageRatings[index] === 1 ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => submitFeedback(index, -1)}
                            disabled={!!messageRatings[index]}
                            className={`h-7 px-2 hover:bg-muted ${messageRatings[index] === -1 ? 'bg-muted' : ''}`}
                          >
                            <ThumbsDown className={`w-3.5 h-3.5 ${messageRatings[index] === -1 ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - стиль Officer Frank */}
        <div className="p-3 xl:p-4 border-t shrink-0 bg-background dark:bg-slate-900/60 dark:border-white/5">
          <form onSubmit={handleSubmit} className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={interfaceLanguage === 'ru' ? t('lumiPlaceholder') : interfaceLanguage === 'en' ? 'Ask your question here...' : 'Haz tu pregunta aquí...'}
              className="w-full h-10 xl:h-12 pr-24 xl:pr-28 pl-3 xl:pl-4 text-xs xl:text-sm rounded-full border-border/50 focus:border-blue-300 focus:ring-blue-200 bg-background dark:bg-slate-950 dark:border-white/10 dark:text-slate-100 dark:placeholder:text-slate-500 transition-all"
              disabled={isLoading}
            />
            <div className="absolute right-1.5 xl:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 xl:gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7 xl:h-8 xl:w-8 shrink-0 transition-all rounded-full",
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 animate-pulse scale-110"
                    : "text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                )}
                onClick={toggleVoiceInput}
                disabled={isLoading}
                title="Голосовой ввод"
              >
                {isListening ? <MicOff className="h-3.5 w-3.5 xl:h-4 xl:w-4" /> : <Mic className="h-4 w-4 xl:h-4 xl:w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 xl:h-8 xl:w-8 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 shrink-0 transition-colors rounded-full"
                disabled={isLoading}
                onClick={() => {
                  const hintPrompt = interfaceLanguage === 'ru'
                    ? "Дай мне подсказку к этому вопросу, но не говори правильный ответ напрямую. Помоги мне подумать самостоятельно."
                    : interfaceLanguage === 'en'
                      ? "Give me a hint for this question, but don't tell me the correct answer directly. Help me think independently."
                      : "Dame una pista para esta pregunta, pero no me digas la respuesta correcta directamente. Ayúdame a pensar por mí mismo.";
                  askAI(hintPrompt);
                }}
                title={interfaceLanguage === 'ru' ? "Получить подсказку" : "Obtener pista"}
              >
                <Lightbulb className="h-4 w-4 xl:h-4 xl:w-4" />
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "h-7 w-7 xl:h-8 xl:w-8 rounded-full shrink-0 shadow-sm transition-all ml-1",
                  !input.trim() && !isLoading ? "bg-muted text-muted-foreground" : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-105"
                )}
              >
                {isLoading ? (
                  <Sparkles className="h-3 w-3 xl:h-3.5 xl:w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 xl:h-4 xl:w-4 ml-0.5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* AI Limit Modal */}
      <AILimitReachedModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        currentCount={limitData.currentCount}
        limit={limitData.limit}
        message={limitData.message}
      />
    </>
  );
};

