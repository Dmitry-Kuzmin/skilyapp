import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Maximize2, Minimize2, Languages, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { triggerHapticFeedback } from "@/lib/telegram";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

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
  testLanguage?: 'es' | 'en'; // Язык теста для локализации интерфейса
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
}: AIWidgetProps) => {
  const { enabled: aiEnabled } = useFeatureFlag('ai_chat_enabled', true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false); // Полуразвернут по умолчанию
  const [messageRatings, setMessageRatings] = useState<Record<number, 1 | -1>>({});
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // 🚦 FEATURE FLAG: Если AI чат отключен, не показываем виджет
  if (!aiEnabled) {
    return null;
  }
  
  // Определяем язык интерфейса на основе языка теста
  // Используем язык теста для интерфейса, но если showTranslation активен, используем русский
  const interfaceLanguage = showTranslation ? 'ru' : testLanguage;

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
                console.log('[AIWidget] 📏 Test block height (fallback):', blockHeight);
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
          console.log('[AIWidget] 📏 Test block height:', blockHeight);
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

    const context = `
Вопрос: ${question}
Правильный ответ: ${correctAnswer}
${userAnswer ? `Ответ пользователя: ${userAnswer}` : ''}
Результат: ${isCorrect ? 'ПРАВИЛЬНО' : 'НЕПРАВИЛЬНО'}
${topic ? `Тема: ${topic}` : ''}
${explanation ? `\nОфициальное объяснение: ${explanation}` : ''}
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
            ...newMessages,
            { role: "system", content: context }
          ],
        }),
      });

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
          content: "Произошла ошибка. Попробуйте ещё раз.",
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
      
      toast({
        title: rating === 1 ? "Спасибо за отзыв!" : "Спасибо за обратную связь!",
        description: rating === 1 ? "Ваш лайк помогает улучшить ответы" : "Мы учтем ваше мнение",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  return (
    <Card 
      ref={widgetRef}
      className={cn(
      "flex flex-col overflow-hidden border border-border/50 shadow-lg bg-background transition-all duration-300 rounded-2xl",
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
      {/* Header - чистый стиль как у Officer Frank */}
      <div className="flex items-center justify-between px-4 xl:px-5 py-3 xl:py-4 border-b border-border/50 shrink-0 bg-background">
        <div className="flex items-center gap-2 xl:gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-md relative overflow-hidden shrink-0">
            <LumiCharacter size="md" mood="happy" animate className="scale-75" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm xl:text-base text-foreground truncate">
              {interfaceLanguage === 'ru' ? t('lumiGreeting') : 
               interfaceLanguage === 'en' ? "Hello! I'm Skily 💡" : 
               "¡Hola! Soy Skily 💡"}
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 xl:h-8 xl:w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? (interfaceLanguage === 'ru' ? t('lumiCollapse') : interfaceLanguage === 'en' ? 'Collapse' : 'Contraer') : (interfaceLanguage === 'ru' ? t('lumiExpand') : interfaceLanguage === 'en' ? 'Expand' : 'Expandir')}
        >
          {isExpanded ? <Minimize2 className="h-3.5 w-3.5 xl:h-4 xl:w-4" /> : <Maximize2 className="h-3.5 w-3.5 xl:h-4 xl:w-4" />}
        </Button>
      </div>

      {/* Messages Area - фиксированная высота с скроллом */}
      <div className="flex-1 overflow-y-auto p-4 xl:p-5 space-y-3 xl:space-y-4 scroll-smooth min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-4 xl:space-y-5">
            {/* Welcome Message */}
            <div className="text-foreground text-xs xl:text-sm leading-relaxed">
              <p>
                {interfaceLanguage === 'ru' ? t('lumiWelcome') : 
                 interfaceLanguage === 'en' ? 'Need a hint or a quick explanation? Just press the button or ask your question, and I\'ll help on the spot. Ready when you are!' : 
                 '¿Necesitas una pista o una explicación rápida? Simplemente presiona el botón o haz tu pregunta, y te ayudaré en el acto. ¡Listo cuando tú lo estés!'}
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
                <div className="flex justify-end">
                  <div className="max-w-[85%] xl:max-w-[80%] bg-blue-600 text-white rounded-xl xl:rounded-2xl px-3 xl:px-4 py-2 xl:py-2.5 shadow-sm">
                    <div className="text-xs xl:text-sm leading-relaxed break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              )}
              {message.role === "assistant" && (
                <div className="flex gap-2 xl:gap-3 items-start">
                  <div className="flex items-center justify-center w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex-shrink-0 shadow-sm">
                    <LumiCharacter size="sm" mood="happy" className="scale-75" />
                  </div>
                  <div className="flex-1 min-w-0 mt-0.5 xl:mt-1">
                    {message.content ? (
                      <div className="text-xs xl:text-sm leading-relaxed text-foreground prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 xl:prose-p:my-2">
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
      <div className="p-3 xl:p-4 border-t border-border/50 shrink-0 bg-background">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={interfaceLanguage === 'ru' ? t('lumiPlaceholder') : interfaceLanguage === 'en' ? 'Ask your question here...' : 'Haz tu pregunta aquí...'}
            className="w-full h-10 xl:h-12 pr-16 xl:pr-20 pl-3 xl:pl-4 text-xs xl:text-sm rounded-full border-border/50 focus:border-blue-300 focus:ring-blue-200 bg-background"
            disabled={isLoading}
          />
          <div className="absolute right-1.5 xl:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 xl:gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 xl:h-8 xl:w-8 text-muted-foreground hover:text-foreground shrink-0"
              disabled={isLoading}
              title="Голосовой ввод"
            >
              <Sparkles className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-7 w-7 xl:h-8 xl:w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm"
            >
              <Send className="h-3 w-3 xl:h-3.5 xl:w-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

