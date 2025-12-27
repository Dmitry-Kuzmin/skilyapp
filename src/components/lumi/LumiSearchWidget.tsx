import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LumiCharacter } from "./LumiCharacter";
import { LumiMessage } from "./LumiMessage";
import { useLumiChat } from "@/hooks/useLumiChat";
import { usePDDContext } from "@/contexts/PDDContext";
import { cn } from "@/lib/utils";

const suggestedTopics = [
  { label: "🚦 Знаки", query: "Расскажи про основные дорожные знаки в Испании" },
  { label: "🚗 Обгон", query: "Как правильно выполнять обгон по испанским правилам?" },
  { label: "📝 Экзамен", query: "Что нужно знать для сдачи экзамена DGT?" },
  { label: "⚠️ Скорость", query: "Какие ограничения скорости в Испании?" },
];

const placeholders = [
  "Спроси: как правильно выполнять обгон?",
  "Что делать, если заглох двигатель в туннеле?",
  "Какие штрафы за парковку на пешеходном переходе?",
  "Расскажи про дорожные знаки приоритета",
];

export const LumiSearchWidget = () => {
  const { selectedCountry } = usePDDContext();
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, error, sendMessage, clearMessages } = useLumiChat(selectedCountry);

  // Rotate placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExpanded]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    setIsExpanded(true);
    await sendMessage(message);
  };

  const handleQuickQuery = async (query: string) => {
    setIsExpanded(true);
    await sendMessage(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
    clearMessages();
  };

  return (
    <Card className="border-2 border-border overflow-hidden relative">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-muted/20 pointer-events-none" />

      <div className="relative p-4 md:p-6">
        {/* Header with Skily */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            <LumiCharacter size="lg" mood="happy" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Спроси Skily! 💡
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Твой личный эксперт по правилам DGT
                </p>
              </div>

              {isExpanded && messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Quick Topics - показываем только когда нет сообщений */}
            {!isExpanded || messages.length === 0 ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {suggestedTopics.map((topic) => (
                  <Button
                    key={topic.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickQuery(topic.query)}
                    disabled={isLoading}
                    className="text-xs h-8 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300 dark:border-yellow-800 dark:hover:bg-yellow-950/50"
                  >
                    {topic.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Messages Area - показываем только когда есть сообщения */}
        {isExpanded && messages.length > 0 && (
          <div className="mb-4 space-y-3 max-h-96 overflow-y-auto scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx}>
                {msg.role === "assistant" ? (
                  <LumiMessage
                    content={msg.content}
                    mood={idx === messages.length - 1 && isLoading ? "thinking" : "idle"}
                    showAvatar={false}
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
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholders[currentPlaceholder]}
            className={cn(
              "flex-1 bg-background transition-all duration-300",
              isExpanded && "border-yellow-300 dark:border-yellow-700"
            )}
            disabled={isLoading}
            onFocus={() => !isExpanded && setIsExpanded(true)}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-primary hover:bg-primary/90 shadow-md"
          >
            {isLoading ? (
              <Sparkles className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Hint text */}
        {!isExpanded && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Задай любой вопрос про правила дорожного движения в Испании
          </p>
        )}
      </div>
    </Card>
  );
};


