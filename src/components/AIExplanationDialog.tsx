import React, { useState, useEffect, useRef } from "react";
import { Bot, Loader2, Sparkles, Send, ThumbsUp, ThumbsDown, Languages } from "lucide-react";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from "@/hooks/use-toast";
import { isTelegramMiniApp, triggerHapticFeedback } from "@/lib/telegram";
import { useLanguage } from "@/contexts/LanguageContext";

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
  explanationRu?: string | null;
  explanationEs?: string | null;
  explanationEn?: string | null;
  topic?: string;
  imageUrl?: string | null;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  testLanguage?: 'es' | 'en'; // Язык теста для локализации интерфейса
};

export function AIExplanationDialog({
  open,
  onClose,
  question,
  correctAnswer,
  userAnswer,
  isCorrect,
  explanation,
  explanationRu,
  explanationEs,
  explanationEn,
  topic,
  imageUrl,
  showTranslation = false,
  onToggleTranslation,
  testLanguage = 'es',
}: AIExplanationDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [messageRatings, setMessageRatings] = useState<Record<number, 1 | -1>>({});
  const hasAskedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Определяем язык интерфейса на основе языка теста
  // Используем язык теста для интерфейса, но если showTranslation активен, используем русский
  const interfaceLanguage = showTranslation ? 'ru' : testLanguage;

  // Автоматически показываем explanation из БД при открытии
  // Используем правильный язык: приоритет showTranslation, затем explanation (уже зависит от testLanguage)
  useEffect(() => {
    if (open && messages.length === 0) {
      let explanationToShow = null;
      
      // Приоритет: showTranslation > explanation (который уже зависит от testLanguage)
      if (showTranslation && explanationRu) {
        explanationToShow = explanationRu;
      } else if (explanation) {
        // explanation уже содержит правильный язык в зависимости от testLanguage
        explanationToShow = explanation;
      }
      
      if (explanationToShow) {
      // Добавляем explanation как первое сообщение (без вызова AI - экономим токены!)
      setMessages([
        {
          role: "assistant",
            content: explanationToShow
        }
      ]);
        console.log('[AI Chat] 📝 Показано explanation из БД (без AI вызова)', { 
          language: showTranslation ? 'ru' : (explanation === explanationEs ? 'es' : explanation === explanationEn ? 'en' : 'unknown'),
          hasRu: !!explanationRu,
          hasEs: !!explanationEs,
          hasEn: !!explanationEn
        });
      }
    }
  }, [open, explanation, explanationRu, explanationEs, explanationEn, showTranslation]);

  // Обновляем первое сообщение при изменении showTranslation (если это explanation из БД)
  useEffect(() => {
    if (open && messages.length > 0 && messages[0]?.role === 'assistant') {
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
  }, [showTranslation, explanation, explanationRu, explanationEs, explanationEn, open]);

  // Reset при закрытии и управление скроллом body
  useEffect(() => {
    if (open) {
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
      
      setMessages([]);
      setSmartSuggestions([]);
      hasAskedRef.current = false;
    }
    
    return () => {
      // Очистка при размонтировании
      if (!open) {
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
      }
    };
  }, [open]);

  // Отправка оценки качества ответа
  const submitFeedback = async (messageIndex: number, rating: 1 | -1) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant') return;

    // Вибрация в Telegram Web App при оценке ответа
    const isTelegram = isTelegramMiniApp();
    if (isTelegram) {
      if (rating === 1) {
        triggerHapticFeedback('success'); // Лайк - успешная вибрация
      } else {
        triggerHapticFeedback('light'); // Дизлайк - легкая вибрация
      }
    }

    // Находим предыдущий user message для контекста
    const userMessage = messages[messageIndex - 1]?.content || question;
    
    // Извлекаем номер темы из картинки
    const topicNumber = extractTopicFromImage(imageUrl);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.from('ai_feedback').insert({
        user_id: session?.user?.id || null,
        session_id: session?.user?.id || `anon_${Date.now()}`,
        question: userMessage,
        ai_response: message.content,
        topic_number: topicNumber,
        rating: rating,
        model_used: 'groq-llama-3.3', // TODO: получать из ответа
        used_knowledge: true, // TODO: определять из логов
      });

      // Обновляем локальное состояние
      setMessageRatings(prev => ({ ...prev, [messageIndex]: rating }));
      
      toast({
        description: rating === 1 ? "✓ Спасибо за оценку!" : "✓ Учтём для улучшения",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

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

  // ID беседы для группировки сообщений
  const conversationIdRef = useRef<string>(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Сохранение в историю чатов
  const saveToHistory = async (role: 'user' | 'assistant', content: string, messageIndex: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const topicNumber = extractTopicFromImage(imageUrl);

      await supabase.from('ai_chat_history').insert({
        user_id: session?.user?.id || null,
        session_id: session?.user?.id || `anon_${Date.now()}`,
        conversation_id: conversationIdRef.current,
        message_index: messageIndex,
        role: role,
        content: content,
        topic_number: topicNumber,
        model_used: role === 'assistant' ? 'groq-llama-3.3' : null,
      });
    } catch (error) {
      console.error('Error saving to chat history:', error);
      // Не показываем ошибку пользователю - это фоновая операция
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
    let assistantMessage = ""; // Объявляем здесь для доступа в finally

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
    
    // Сохраняем user message в историю
    if (!customPrompt || messages.length > 0) { // Не сохраняем первое автоматическое сообщение
      saveToHistory('user', userMessage, newMessages.length - 1);
    }

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
      
      // Сохраняем assistant message в историю (после полной генерации)
      if (assistantMessage) {
        const assistantIndex = newMessages.length; // index of assistant message
        saveToHistory('assistant', assistantMessage, assistantIndex);
      }
      
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

  // Auto-scroll отключен - пользователь читает сверху
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    }
  };

  const isTelegram = isTelegramMiniApp();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent hideCloseButton className="w-screen h-screen max-w-none max-h-none m-0 p-0 flex flex-col rounded-none">
        <DialogHeader 
          className="px-4 border-b shrink-0"
          style={{
            // Добавляем 48px для встроенной навигации Telegram (кнопки Назад, три точки, стрелка)
            paddingTop: isTelegram ? 'calc(var(--tg-content-safe-area-inset-top, 0px) + 48px + 12px)' : '12px',
            paddingBottom: '12px'
          }}
        >
          <DialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="text-base font-medium text-foreground">
              AI Помощник DGT
            </span>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleClose}
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              title="Закрыть"
            >
              <span className="text-lg">✕</span>
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 max-w-4xl mx-auto w-full">
          {messages.length === 0 && !explanation ? (
            // Приветственное сообщение, если еще не дан ответ
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex-shrink-0 mt-0.5 shadow-md">
                  <LumiCharacter size="sm" mood="happy" className="scale-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-relaxed text-foreground">
                    <p>
                      {interfaceLanguage === 'ru' ? t('lumiWelcome') : 
                       interfaceLanguage === 'en' ? 'Need a hint or a quick explanation? Just press the button or ask your question, and I\'ll help on the spot. Ready when you are ready!' : 
                       '¿Necesitas una pista o una explicación rápida? Simplemente presiona el botón o haz tu pregunta, y te ayudaré en el acto. ¡Listo cuando tú lo estés!'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pl-11">
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
              {message.role === "user" && index > 0 && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-muted/80 rounded-2xl px-4 py-2.5">
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              {message.role === "assistant" && (
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex-shrink-0 mt-0.5 shadow-md">
                      <LumiCharacter size="sm" mood={index === 0 ? "happy" : "encouraging"} className="scale-50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {message.content ? (
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-strong:font-semibold prose-strong:text-foreground prose-p:text-foreground prose-p:my-2 prose-li:text-foreground">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-base font-semibold mt-3 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-sm font-semibold mt-2 mb-1" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-medium mt-2 mb-1" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 space-y-1 my-2" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 space-y-1 my-2" {...props} />,
                              p: ({node, ...props}) => <p className="my-2 first:mt-0" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Думаю...</span>
                        </div>
                      )}
                      
                      {/* Feedback buttons и кнопка перевода */}
                      {message.content && (
                        <div className="flex items-center gap-1 mt-2">
                          {/* Кнопка перевода для первого сообщения из БД */}
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
                </div>
              )}
            </div>
          ))
          )}

          
          <div ref={messagesEndRef} />
        </div>

        {/* Smart AI-generated suggestions */}
        {messages.length > 0 && (
          <div className="px-4 pb-3 shrink-0">
            {isGeneratingSuggestions && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Создаю подсказки...</span>
              </div>
            )}
            {smartSuggestions.length > 0 && !isLoading && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {smartSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => askAI(suggestion)}
                    disabled={isLoading}
                    className="text-xs font-medium px-3 py-2 whitespace-nowrap rounded-md border-border bg-background hover:bg-muted transition-colors shrink-0"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Input */}
        <div 
          className="px-4 border-t shrink-0"
          style={{
            paddingTop: '12px',
            paddingBottom: isTelegram ? 'calc(var(--tg-content-safe-area-inset-bottom, 0px) + 12px)' : '12px',
          }}
        >
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={interfaceLanguage === 'ru' ? t('lumiPlaceholder') : interfaceLanguage === 'en' ? 'Ask your question here...' : 'Haz tu pregunta aquí...'}
              disabled={isLoading}
              className="flex-1 h-10"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="flex-shrink-0 h-10 w-10"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

