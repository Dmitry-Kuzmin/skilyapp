import React, { useState, useRef, useEffect } from "react";
import { X, Send, Lightbulb, Sparkles, ChevronDown, ChevronUp, ChevronRight, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LumiCharacter } from "./LumiCharacter";
import { LumiMessage } from "./LumiMessage";
import { useLumiChat } from "@/hooks/useLumiChat";
import { usePDDContext } from "@/contexts/PDDContext";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface LumiChatWidgetProps {
  onClose?: () => void;
  context?: string; // Контекст текущего вопроса/теста
  quickActions?: Array<{ label: string; message: string }>;
  initialMessage?: string;
  className?: string;
  compact?: boolean; // Компактный режим для мобильных
  lastAnswerCorrect?: boolean | null; // Статус последнего ответа
  questionExplanation?: string | null; // Объяснение из БД
  showExplanation?: boolean; // Показывать ли объяснение сразу
}

const defaultQuickActions = [
  { label: "Дай подсказку", message: "Дай мне подсказку, не раскрывая полный ответ" },
  { label: "Помоги разобраться", message: "Объясни это правило подробнее с примерами" },
  { label: "Как запомнить?", message: "Как лучше запомнить это правило?" },
];

export const LumiChatWidget = ({
  onClose,
  context,
  quickActions = defaultQuickActions,
  initialMessage,
  className,
  compact = false,
  lastAnswerCorrect = null,
  questionExplanation = null,
  showExplanation = false,
}: LumiChatWidgetProps) => {
  const { selectedCountry } = usePDDContext();
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, error, sendMessage } = useLumiChat(selectedCountry);
  const [hasShownExplanation, setHasShownExplanation] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Ваш браузер не поддерживает голосовой ввод");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedCountry === 'russia' ? 'ru-RU' : 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Показываем приветственное сообщение
  const hasMessages = messages.length > 0;
  const showWelcome = !hasMessages && !initialMessage && !questionExplanation;

  // Показываем объяснение из БД при открытии (если есть)
  useEffect(() => {
    if (showExplanation && questionExplanation && !hasShownExplanation) {
      setHasShownExplanation(true);
      // Не используем sendMessage - просто добавляем локально
      // Это экономит токены AI
    } else if (initialMessage && !hasMessages && !questionExplanation) {
      sendMessage(initialMessage, context);
    }
  }, [initialMessage, questionExplanation, showExplanation, hasShownExplanation, hasMessages, context, sendMessage]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message, context);
  };

  const handleQuickAction = async (message: string) => {
    await sendMessage(message, context);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden border-2 border-yellow-200/50 dark:border-yellow-800/50 shadow-xl bg-white dark:bg-gray-900",
        compact ? "h-full" : "h-full w-full",
        isMinimized && "h-auto",
        className
      )}
    >
      {/* Header со Skily - как Officer Frank */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center transition-transform group-hover:scale-105">
            <LumiCharacter size="sm" mood="happy" animate className="scale-50" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Привет! Я Skily 💡</h3>
            <p className="text-xs text-muted-foreground">Твой AI помощник по DGT</p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Свернуть"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {/* Объяснение из БД (экономит токены AI!) */}
            {showExplanation && questionExplanation && !hasMessages && (
              <div className="space-y-4 py-4">
                <LumiMessage
                  content={`**Объяснение:**\n\n${questionExplanation}`}
                  mood="idle"
                  showAvatar={true}
                />

                {/* Motivational message */}
                {lastAnswerCorrect === false && (
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-xl p-3 border border-pink-200/50 dark:border-pink-800/50">
                    <p className="text-xs font-medium text-center text-foreground">
                      Ошибки случаются — это топливо для твоего возвращения! 💪
                    </p>
                  </div>
                )}
              </div>
            )}

            {showWelcome && (
              <div className="space-y-4 py-4">
                {/* Welcome Card - как у Officer Frank */}
                <div className="bg-muted/30 dark:bg-slate-800/30 rounded-2xl p-5 border border-border shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <LumiCharacter size="lg" mood="happy" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-1">
                        Привет! Я Skily 💡
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Нужна подсказка или объяснение? Просто нажми на кнопку или напиши свой вопрос, и я помогу тебе прямо сейчас. Готов, когда ты готов!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Motivational message */}
                {lastAnswerCorrect === false && (
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-xl p-4 border border-pink-200/50 dark:border-pink-800/50">
                    <p className="text-sm font-medium text-center text-foreground">
                      Ошибки случаются — это топливо для твоего возвращения! 💪
                    </p>
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx}>
                {msg.role === "assistant" ? (
                  <LumiMessage
                    content={msg.content}
                    mood={idx === messages.length - 1 && isLoading ? "thinking" : "idle"}
                    isStreaming={idx === messages.length - 1 && isLoading}
                  />
                ) : (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] shadow-sm">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions - большие кнопки как у Officer Frank */}
          {!hasMessages && quickActions.length > 0 && (
            <div className="px-4 pb-4 space-y-3">
              {quickActions.slice(0, 2).map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="lg"
                  className="w-full h-auto py-4 text-base font-medium border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm transition-all"
                  onClick={() => handleQuickAction(action.message)}
                  disabled={isLoading}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Input Area - как у Officer Frank */}
          <div className="p-4 border-t border-border/50">
            <div className="relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Задай свой вопрос здесь..."
                className="flex-1 bg-background pr-20 h-12 rounded-xl text-base"
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 transition-colors",
                    isListening ? "text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30" : "text-muted-foreground hover:text-blue-500"
                  )}
                  onClick={toggleVoiceInput}
                  disabled={isLoading}
                  title="Голосовой ввод"
                >
                  {isListening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-blue-500 transition-colors"
                  disabled={isLoading}
                  onClick={() => handleQuickAction("Дай мне подсказку, не раскрывая полный ответ")}
                  title="Получить подсказку"
                >
                  <Lightbulb className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-full"
                >
                  {isLoading ? (
                    <Sparkles className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

