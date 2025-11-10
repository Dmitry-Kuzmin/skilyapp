import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
type Message = {
  role: "user" | "assistant";
  content: string;
};
const suggestedTopics = [{
  label: "🚦 Знаки",
  query: "Объясни основные дорожные знаки"
}, {
  label: "🚗 Манёвры",
  query: "Как правильно выполнять обгон?"
}, {
  label: "📝 Экзамен",
  query: "Что нужно знать для экзамена DGT?"
}, {
  label: "⚠️ Ситуации",
  query: "Что делать при ДТП?"
}];
const placeholders = ["Спроси: как правильно выполнять обгон?", "Что делать, если заглох двигатель в туннеле?", "Какие штрафы за парковку на пешеходном переходе?", "Расскажи про дорожные знаки приоритета"];
export const AISearchWidget = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(prev => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);
  const streamChat = async (userMessage: string) => {
    setIsLoading(true);
    const newMessages: Message[] = [...messages, {
      role: "user",
      content: userMessage
    }];
    setMessages(newMessages);
    try {
      // Get user session token for authentication (optional)
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use session token if available, otherwise use ANON key
      // Function supports both authenticated and anonymous requests
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          messages: newMessages
        })
      });
      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: ""
      }]);
      while (true) {
        const {
          done,
          value
        } = await reader.read();
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
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantMessage
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
      console.error("Error streaming chat:", error);
      const errorMessage = error instanceof Error ? error.message : "Произошла ошибка";
      
      // More specific error messages
      if (errorMessage.includes('not authenticated') || errorMessage.includes('Unauthorized')) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "⚠️ Необходима авторизация. Пожалуйста, войдите в систему."
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Произошла ошибка. Попробуйте ещё раз. Если проблема сохраняется, проверьте подключение к интернету."
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setIsExpanded(true);
    streamChat(userMessage);
  };
  const handleTopicClick = (query: string) => {
    setInput(query);
    setIsExpanded(true);
    streamChat(query);
  };
  const handleAction = (action: string) => {
    if (action === "test") {
      navigate("/tests");
    } else if (action === "learning") {
      navigate("/learning");
    }
  };
  const reset = () => {
    setMessages([]);
    setIsExpanded(false);
    setInput("");
  };
  return <div className="w-full max-w-4xl mx-auto">
      {/* Search Input */}
      <div className={`relative transition-all duration-500 ${isExpanded ? "mb-6" : "mb-8"}`}>
        <div className="relative group">
          <div className="absolute -inset-1 gradient-primary rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
          <div className="relative">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-2 bg-card rounded-2xl border-2 border-primary/20 p-2 shadow-card hover:border-primary/40 transition-all duration-300">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary-foreground animate-pulse-slow" />
                </div>
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder={placeholders[currentPlaceholder]} className="border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60" onFocus={() => !messages.length && setIsExpanded(true)} />
                {isExpanded && messages.length > 0 && <Button type="button" variant="ghost" size="icon" onClick={reset} className="flex-shrink-0">
                    <X className="w-5 h-5" />
                  </Button>}
                <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="flex-shrink-0 shadow-primary">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Suggested Topics */}
        {!messages.length && <div className="flex flex-wrap gap-2 mt-4 justify-center animate-in fade-in duration-500">
            {suggestedTopics.map((topic, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleTopicClick(topic.query)}
                className="hover-scale"
              >
                {topic.label}
              </Button>
            ))}
          </div>}
      </div>

      {/* Messages */}
      {messages.length > 0 && <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {messages.map((message, index) => <Card key={index} className={`p-4 ${message.role === "user" ? "ml-auto max-w-[80%] bg-primary/10 border-primary/30" : "mr-auto max-w-[90%] gradient-card"}`}>
              <div className="flex gap-3">
                {message.role === "assistant" && <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary flex-shrink-0">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>}
                <div className="flex-1 space-y-2">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  
                  {/* Action buttons for assistant messages */}
                  {message.role === "assistant" && index === messages.length - 1 && !isLoading && <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                      <Button variant="outline" size="sm" onClick={() => handleAction("test")} className="text-xs">
                        🚀 Пройти тест
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleAction("learning")} className="text-xs">
                        📖 Открыть урок
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                setInput("Объясни проще");
                streamChat("Объясни проще: " + message.content.slice(0, 100));
              }} className="text-xs">
                        💡 Объясни проще
                      </Button>
                    </div>}
                </div>
              </div>
            </Card>)}
          
          {/* Loading indicator */}
          {isLoading && <Card className="p-4 mr-auto max-w-[90%] gradient-card">
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{
              animationDelay: "0ms"
            }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{
              animationDelay: "150ms"
            }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{
              animationDelay: "300ms"
            }} />
                </div>
              </div>
            </Card>}
          
          <div ref={messagesEndRef} />
        </div>}
    </div>;
};