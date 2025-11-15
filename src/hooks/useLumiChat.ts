import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const useLumiChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userMessage: string, context?: string) => {
    setIsLoading(true);
    setError(null);

    // Добавляем сообщение пользователя
    const newUserMessage: ChatMessage = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Получаем токен сессии
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Формируем сообщения с контекстом если есть
      let messagesToSend = [...messages, newUserMessage];
      if (context) {
        messagesToSend = [
          { role: "user", content: `Контекст: ${context}` },
          ...messagesToSend
        ];
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ messages: messagesToSend }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Не удалось получить ответ от Lumi");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      // Добавляем пустое сообщение ассистента
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

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
                assistantContent += content;
                
                // Обновляем последнее сообщение
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch (e) {
              // Игнорируем невалидный JSON
            }
          }
        }
      }
    } catch (err) {
      console.error("Error in Lumi chat:", err);
      setError("Не удалось получить ответ. Попробуй еще раз!");
      
      // Удаляем пустое сообщение ассистента при ошибке
      setMessages(prev => prev.filter((_, idx) => idx !== prev.length - 1));
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
};














