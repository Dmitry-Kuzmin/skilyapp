import { useState, useCallback } from "react";
import { CountryCode } from "@/types/pdd";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAIRequest, AILimitData, AIRequestMessage } from "@/hooks/useAIRequest";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type { AILimitData };

export const useSkilyAIChat = (country: CountryCode = 'spain') => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<AILimitData | null>(null);
  const { language } = useLanguage();
  const { sendRequest } = useAIRequest();

  const sendMessage = useCallback(async (userMessage: string, context?: string) => {
    setIsLoading(true);
    setError(null);

    const newUserMessage: ChatMessage = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    // Build message list with optional context prefix
    let messagesToSend: AIRequestMessage[] = [
      ...(context ? [{ role: 'user' as const, content: `Контекст: ${context}` }] : []),
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userMessage },
    ];

    // Add empty assistant bubble for streaming
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    let didReceiveContent = false;

    await sendRequest(
      { messages: messagesToSend, country, language },
      {
        onChunk: (text) => {
          didReceiveContent = true;
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + text };
            return updated;
          });
        },
        onDone: () => {
          setIsLoading(false);
        },
        onLimitReached: (data) => {
          setLimitReached(data);
          // Remove empty assistant bubble
          setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
          setIsLoading(false);
        },
        onError: () => {
          setError("Не удалось получить ответ. Попробуй ещё раз!");
          // Remove empty assistant bubble if nothing was streamed
          if (!didReceiveContent) {
            setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
          }
          setIsLoading(false);
        },
      },
    );
  }, [messages, language, country, sendRequest]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setLimitReached(null);
  }, []);

  const clearLimit = useCallback(() => setLimitReached(null), []);

  return {
    messages,
    isLoading,
    error,
    limitReached,
    clearLimit,
    sendMessage,
    clearMessages,
  };
};
