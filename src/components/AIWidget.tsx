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
  
  // Определяем язык интерфейса на основе языка теста
  // Используем язык теста для интерфейса, но если showTranslation активен, используем русский
  const interfaceLanguage = showTranslation ? 'ru' : testLanguage;

  // Показываем explanation из БД при загрузке
  // Используем правильный язык: приоритет showTranslation, затем explanation (уже зависит от testLanguage)
  useEffect(() => {
    if (messages.length === 0) {
      let explanationToShow = null;
      
      // Приоритет: showTranslation > explanation (который уже зависит от testLanguage)
      if (showTranslation && explanationRu) {
        explanationToShow = explanationRu;
      } else if (explanation) {
        // explanation уже содержит правильный язык в зависимости от testLanguage
        explanationToShow = explanation;
      }
      
      if (explanationToShow) {
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

  // Измеряем высоту блока тестов (Question Card) и ограничиваем максимальную высоту виджета
  useEffect(() => {
    if (!widgetRef.current) return;

    // Находим Question Card по data-testid
    const questionCard = document.querySelector('[data-testid="question-card"]') as HTMLElement;
    
    if (!questionCard) {
      // Fallback: ищем Card с вопросом в блоке тестов
      const testBlock = document.querySelector('[data-testid="test-content-block"]');
      if (testBlock) {
        const card = testBlock.querySelector('.rounded-lg.border') as HTMLElement;
        if (card) {
          const updateMaxHeight = () => {
            const cardHeight = card.offsetHeight;
            if (cardHeight > 0) {
              setMaxHeight(cardHeight);
            }
          };
          
          updateMaxHeight();
          const resizeObserver = new ResizeObserver(updateMaxHeight);
          resizeObserver.observe(card);
          
          return () => resizeObserver.disconnect();
        }
      }
      return;
    }

    const updateMaxHeight = () => {
      const cardHeight = questionCard.offsetHeight;
      if (cardHeight > 0) {
        console.log('[AIWidget] 📏 Question Card height:', cardHeight);
        setMaxHeight(cardHeight);
      }
    };

    // Обновляем высоту при загрузке и изменении размера
    updateMaxHeight();
    
    const resizeObserver = new ResizeObserver(() => {
      updateMaxHeight();
    });

    resizeObserver.observe(questionCard);
    
    // Также наблюдаем за блоком тестов для надежности
    const testBlock = document.querySelector('[data-testid="test-content-block"]');
    if (testBlock) {
      resizeObserver.observe(testBlock as HTMLElement);
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
          maxHeight: `${maxHeight}px`
        } : maxHeight ? {
          maxHeight: `${maxHeight}px`
        } : {})
      }}
    >
      {/* Header - чистый стиль как у Officer Frank */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-md relative overflow-hidden">
            <LumiCharacter size="md" mood="happy" animate className="scale-75" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              {interfaceLanguage === 'ru' ? t('lumiGreeting') : 
               interfaceLanguage === 'en' ? 'Hello! I\'m Lumi 💡' : 
               '¡Hola! Soy Lumi 💡'}
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? (interfaceLanguage === 'ru' ? t('lumiCollapse') : interfaceLanguage === 'en' ? 'Collapse' : 'Contraer') : (interfaceLanguage === 'ru' ? t('lumiExpand') : interfaceLanguage === 'en' ? 'Expand' : 'Expandir')}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Messages Area - фиксированная высота с скроллом */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-5">
            {/* Welcome Message */}
            <div className="text-foreground text-sm leading-relaxed">
              <p>
                {interfaceLanguage === 'ru' ? t('lumiWelcome') : 
                 interfaceLanguage === 'en' ? 'Need a hint or a quick explanation? Just press the button or ask your question, and I\'ll help on the spot. Ready when you are!' : 
                 '¿Necesitas una pista o una explicación rápida? Simplemente presiona el botón o haz tu pregunta, y te ayudaré en el acto. ¡Listo cuando tú lo estés!'}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                className="h-auto py-2.5 px-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:border-blue-800 dark:hover:border-blue-700 rounded-lg"
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
                className="h-auto py-2.5 px-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:border-blue-800 dark:hover:border-blue-700 rounded-lg"
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
                  <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl px-4 py-2.5 shadow-sm">
                    <div className="text-sm leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                </div>
              )}
              {message.role === "assistant" && (
                <div className="flex gap-3 items-start">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex-shrink-0 shadow-sm">
                    <LumiCharacter size="sm" mood="happy" className="scale-75" />
                  </div>
                  <div className="flex-1 min-w-0 mt-1">
                    {message.content ? (
                      <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none dark:prose-invert">
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
      <div className="p-4 border-t border-border/50 shrink-0 bg-background">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={interfaceLanguage === 'ru' ? t('lumiPlaceholder') : interfaceLanguage === 'en' ? 'Ask your question here...' : 'Haz tu pregunta aquí...'}
            className="w-full h-12 pr-20 pl-4 text-sm rounded-full border-border/50 focus:border-blue-300 focus:ring-blue-200 bg-background"
            disabled={isLoading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              disabled={isLoading}
              title="Голосовой ввод"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

