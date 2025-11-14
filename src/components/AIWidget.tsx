import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Maximize2, Minimize2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
}: AIWidgetProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false); // Полуразвернут по умолчанию
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Показываем explanation из БД при загрузке
  // Используем правильный язык в зависимости от showTranslation
  useEffect(() => {
    if (messages.length === 0) {
      let explanationToShow = null;
      
      if (showTranslation && explanationRu) {
        explanationToShow = explanationRu;
      } else if (explanation) {
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
  }, [explanation, explanationRu, showTranslation]);

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

  return (
    <Card className={cn(
      "flex flex-col overflow-hidden border border-border/50 shadow-lg bg-background transition-all duration-300 rounded-2xl",
      isExpanded ? "h-full" : "h-[500px]"
    )}>
      {/* Header - чистый стиль как у Officer Frank */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-md relative overflow-hidden">
            <LumiCharacter size="md" mood="happy" animate className="scale-75" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Привет! Я Lumi 💡</h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Свернуть" : "Развернуть"}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="space-y-5">
            {/* Welcome Message */}
            <div className="text-foreground text-sm leading-relaxed">
              <p>Нужна подсказка или быстрое объяснение? Просто нажми кнопку или задай свой вопрос, и я помогу на месте. Готов, когда ты!</p>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                className="h-auto py-2.5 px-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:border-blue-800 dark:hover:border-blue-700 rounded-lg"
                onClick={() => askAI("Дай мне подсказку")}
                disabled={isLoading}
              >
                Дай мне подсказку
              </Button>
              <Button
                variant="outline"
                className="h-auto py-2.5 px-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:border-blue-800 dark:hover:border-blue-700 rounded-lg"
                onClick={() => askAI("Помоги мне понять это")}
                disabled={isLoading}
              >
                Помоги понять это
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
                    {/* Кнопка перевода для первого сообщения из БД - внизу сообщения */}
                    {message.content && index === 0 && onToggleTranslation && explanationRu && (explanationEs || explanationEn || explanation) && (
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => {
                            if (onToggleTranslation) {
                              onToggleTranslation();
                              // Обновляем первое сообщение при переключении
                              const newContent = showTranslation 
                                ? (explanationEs || explanationEn || explanation || '')
                                : (explanationRu || '');
                              setMessages(prev => {
                                const updated = [...prev];
                                updated[0] = { ...updated[0], content: newContent };
                                return updated;
                              });
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors h-7"
                          title={showTranslation ? "Показать оригинал" : "Показать перевод на русский"}
                        >
                          <Languages className="w-3 h-3" />
                          <span>{showTranslation ? "ES" : "RU"}</span>
                        </button>
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
            placeholder="Задай свой вопрос здесь..."
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

