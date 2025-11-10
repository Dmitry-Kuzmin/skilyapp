import { useState, useEffect, useRef } from "react";
import { Bot, Loader2, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AIExplanationDialogProps = {
  open: boolean;
  onClose: () => void;
  question: string;
  correctAnswer: string;
  userAnswer?: string;
  isCorrect: boolean;
  explanation?: string | null;
  topic?: string;
  imageUrl?: string | null;
};

export function AIExplanationDialog({
  open,
  onClose,
  question,
  correctAnswer,
  userAnswer,
  isCorrect,
  explanation,
  topic,
  imageUrl,
}: AIExplanationDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const hasAskedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Определение языка ответа AI
  const detectLanguage = (text: string): 'ru' | 'es' => {
    // Проверяем наличие кириллицы
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(text);
    // Проверяем испанские специфичные слова и символы
    const hasSpanishChars = /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(text);
    const hasSpanishWords = /(autopista|autovía|carretera|rotonda|señal|carril)/i.test(text);
    
    if (hasCyrillic) return 'ru';
    if (hasSpanishChars || hasSpanishWords) return 'es';
    
    // По умолчанию русский (т.к. вопросы обычно на русском)
    return 'ru';
  };

  // Генерация умных подсказок на основе контекста
  const generateSmartSuggestions = async () => {
    if (smartSuggestions.length > 0 || isGeneratingSuggestions) return;
    
    setIsGeneratingSuggestions(true);
    
    // Определяем язык последнего ответа AI (берём последний assistant message)
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]?.content || '';
    const language = detectLanguage(lastAssistantMessage);
    
    console.log('[AI Suggestions] Detected language:', language, 'from text:', lastAssistantMessage.substring(0, 100));
    
    // Извлекаем номер темы из картинки
    const topicNumber = extractTopicFromImage(imageUrl);
    
    const context = `
Вопрос: ${question}
Правильный ответ: ${correctAnswer}
Тема: ${topic || 'ПДД Испании'}
${topicNumber ? `Номер темы: ${topicNumber}` : ''}
`;

    const promptRu = `${context}

Предложи 3 КОНКРЕТНЫХ вопроса-подсказки (4-7 слов), которые РАСШИРЯТ знания пользователя по ЭТОЙ конкретной теме.

Требования:
- Вопросы должны быть КОНКРЕТНЫМИ к этой теме (не общие!)
- Помогают узнать дополнительные детали
- Касаются смежных правил или исключений
- Практичные для экзамена DGT

Формат (СТРОГО):
1. [конкретный вопрос по теме]
2. [конкретный вопрос по теме]
3. [конкретный вопрос по теме]

Примеры ХОРОШИХ подсказок для темы "estrechamiento":
- Какие знаки регулируют сужение?
- Что если оба въехали одновременно?
- Какой штраф за игнорирование приоритета?

Примеры ПЛОХИХ (слишком общие):
- Какие приоритеты на дороге? ❌
- Что такое правила DGT? ❌
- Как сдать экзамен? ❌

Отвечай ТОЛЬКО списком из 3 конкретных вопросов. Только русский язык.`;

    const promptEs = `${context}

Sugiere 3 preguntas CONCRETAS (4-7 palabras) que AMPLÍEN el conocimiento del usuario sobre ESTE tema específico.

Requisitos:
- Preguntas CONCRETAS sobre este tema (no generales!)
- Ayudan a conocer detalles adicionales
- Sobre reglas relacionadas o excepciones
- Prácticas para el examen DGT

Formato (ESTRICTO):
1. [pregunta concreta sobre el tema]
2. [pregunta concreta sobre el tema]
3. [pregunta concreta sobre el tema]

Ejemplos de BUENAS sugerencias para "estrechamiento":
- ¿Qué señales regulan el estrechamiento?
- ¿Qué pasa si entraron simultáneamente?
- ¿Cuál es la multa por ignorar prioridad?

Ejemplos de MALAS (demasiado generales):
- ¿Cuáles son las prioridades en la carretera? ❌
- ¿Qué son las reglas DGT? ❌
- ¿Cómo aprobar el examen? ❌

Responde SOLO con lista de 3 preguntas concretas. Solo español.`;

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
          messages: [{
            role: "user",
            content: language === 'ru' ? promptRu : promptEs
          }],
          topicNumber: topicNumber, // Передаём номер темы для поиска в учебниках
          imageUrl: imageUrl || '', // Передаём URL изображения
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to generate suggestions");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

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
                fullResponse += content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Парсим список подсказок
      const suggestions = fullResponse
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0 && line.length < 60)
        .slice(0, 3);

      if (suggestions.length > 0) {
        setSmartSuggestions(suggestions);
      } else {
        throw new Error("No suggestions generated");
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      // Fallback подсказки в зависимости от языка
      const lastAssistantMessage = messages.find(m => m.role === 'assistant')?.content || '';
      const language = detectLanguage(lastAssistantMessage);
      
      const fallbackRu = [
        "Объясни проще",
        "Приведи пример",
        "Какой штраф?"
      ];
      
      const fallbackEs = [
        "Explícalo más simple",
        "Dame un ejemplo",
        "¿Cuál es la multa?"
      ];
      
      setSmartSuggestions(language === 'ru' ? fallbackRu : fallbackEs);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Извлечение номера темы из названия картинки
  const extractTopicFromImage = (imageUrl: string | null | undefined): number | null => {
    if (!imageUrl) return null;
    
    // Извлекаем имя файла из URL
    const filename = imageUrl.split('/').pop() || '';
    
    // Извлекаем первую цифру из названия файла
    const match = filename.match(/^(\d)/);
    
    if (match) {
      const topicNum = parseInt(match[1], 10);
      console.log(`[AI Dialog] Extracted topic ${topicNum} from image: ${filename}`);
      return topicNum;
    }
    
    return null;
  };

  const askAI = async (customPrompt?: string) => {
    setIsLoading(true);

    // Извлекаем номер темы из картинки
    const topicNumber = extractTopicFromImage(imageUrl);

    // Формируем контекст для AI
    const context = `
Вопрос: ${question}

Правильный ответ: ${correctAnswer}
${userAnswer ? `Ответ пользователя: ${userAnswer}` : ''}
Результат: ${isCorrect ? 'ПРАВИЛЬНО' : 'НЕПРАВИЛЬНО'}
${topic ? `Тема: ${topic}` : ''}
${topicNumber ? `Номер темы: ${topicNumber}` : ''}
${explanation ? `\nОфициальное объяснение: ${explanation}` : ''}
${imageUrl ? `\n📷 К вопросу есть изображение дорожной ситуации. Упоминай элементы изображения (знаки, разметку, ситуацию), если это помогает лучше понять правило.` : ''}
`;

    const userMessage = customPrompt || `Объясни мне этот вопрос простым языком. Почему правильный ответ именно такой? Разжуй тему, приведи примеры из реальной жизни.`;

    const newMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: messages.length === 0 ? context + "\n\n" + userMessage : userMessage,
      },
    ];
    setMessages(newMessages);

    try {
      // Get user session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          topicNumber: topicNumber, // Передаём номер темы для точного поиска
          imageUrl: imageUrl || '', // Передаём URL изображения для анализа
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
        },
      ]);

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
      console.error("Error getting AI explanation:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Произошла ошибка. Попробуйте ещё раз.",
        },
      ]);
    } finally {
      setIsLoading(false);
      
      // Генерируем умные подсказки после первого ответа AI
      // Проверяем, что это первое объяснение (есть только 1 сообщение пользователя + 1 AI)
      if (!customPrompt && messages.length <= 1) {
        setTimeout(() => generateSmartSuggestions(), 1000);
      }
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInput("");
    setSmartSuggestions([]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput("");
    askAI(userMessage);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    }
  };

  // Автоматически спрашиваем AI при открытии (только один раз)
  useEffect(() => {
    if (open && !hasAskedRef.current) {
      hasAskedRef.current = true;
      askAI();
    }
    
    if (!open) {
      hasAskedRef.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-2 pb-3 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground">
                AI Помощник
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                Объяснение правил DGT
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {messages.map((message, index) => (
            <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {message.role === "user" && index > 0 && (
                <Card className="p-3 ml-auto max-w-[80%] bg-primary/5 border-primary/20">
                  <div className="text-sm leading-relaxed font-medium prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </Card>
              )}
              {message.role === "assistant" && (
                <Card className="p-4 bg-muted/30 border-border/40">
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      {message.content ? (
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground prose-li:text-foreground">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-primary" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 my-2" {...props} />,
                              p: ({node, ...props}) => <p className="my-2" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Думаю...
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <Card className="p-4 bg-muted/30 border-border/40">
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </Card>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Smart AI-generated suggestions */}
        {messages.length > 0 && (
          <div className="px-4 pb-3">
            {isGeneratingSuggestions && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Создаю подсказки...</span>
              </div>
            )}
            {smartSuggestions.length > 0 && !isLoading && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="grid grid-cols-3 gap-2.5">
                  {smartSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => askAI(suggestion)}
                      disabled={isLoading}
                      className="text-xs font-medium px-4 py-3 h-auto min-h-[3rem] whitespace-normal text-left justify-start rounded-lg border-border/60 bg-card hover:bg-primary/5 hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Задай свой вопрос..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          
          {/* Close button */}
          <div className="flex justify-center mt-3">
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="text-sm"
            >
              ✓ Понятно, закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

