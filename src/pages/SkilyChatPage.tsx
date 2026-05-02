import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSkilyAIChat } from '@/hooks/useSkilyAIChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePDDContext } from '@/contexts/PDDContext';
import { AISphere } from '@/components/ai/AISphere';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { SignWidget } from '@/components/chat/SignWidget';
import { playNotificationSound, playClickSound } from '@/services/audioService';
import { TelegramNavigation } from '@/components/TelegramNavigation';

type MarkdownProps = { children: string; className?: string; isDarkTheme: boolean };

const MarkdownContent: React.FC<MarkdownProps> = ({ children, className, isDarkTheme }) => (
  <div className={cn("text-sm leading-relaxed tracking-tight", isDarkTheme ? "text-slate-200" : "text-slate-700", className)}>
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => (
          <span className={cn("font-extrabold px-1.5 py-0.5 rounded-md mx-0.5", isDarkTheme ? "text-indigo-300 bg-indigo-500/20" : "text-indigo-700 bg-indigo-500/[0.08]")}>{children}</span>
        ),
        em: ({ children }) => (
          <span className={cn("font-bold not-italic", isDarkTheme ? "text-white" : "text-slate-900")}>{children}</span>
        ),
        code: ({ children }) => (
          <code className={cn("px-1.5 py-0.5 rounded font-mono text-[0.8em]", isDarkTheme ? "bg-slate-800 text-indigo-300" : "bg-slate-100 text-indigo-600")}>{children}</code>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 underline underline-offset-4 decoration-1 font-medium">{children}</a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);

export default function SkilyChatPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { selectedCountry } = usePDDContext();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage } = useSkilyAIChat(selectedCountry);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    playNotificationSound();
    const msg = input.trim();
    setInput('');
    await sendMessage(msg);
  };

  return (
    <>
      <TelegramNavigation />
      {/* 100dvh shrinks when keyboard opens — input stays visible */}
      <div
        className={cn("flex flex-col", isDarkTheme ? "bg-slate-900" : "bg-white")}
        style={{ height: '100dvh' }}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center gap-3 px-4 h-14 border-b flex-shrink-0",
          isDarkTheme ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
        )}>
          <button
            onClick={() => { playClickSound(); navigate(-1); }}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
              isDarkTheme ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
            )}
          >
            <ArrowLeft size={18} />
          </button>
          <AISphere size="sm" className="flex-shrink-0 scale-75" />
          <div className="min-w-0">
            <p className={cn("text-sm font-bold truncate", isDarkTheme ? "text-white" : "text-slate-900")}>{t('skilyChat.neuralCore')}</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-pink-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", isDarkTheme ? "text-slate-400" : "text-slate-500")}>
                {isLoading ? t('skilyChat.processing') : t('skilyChat.online')}
              </span>
            </div>
          </div>
        </div>

        {/* Messages — fills all available space */}
        <div
          ref={chatContainerRef}
          className={cn("flex-1 overflow-y-auto p-4 space-y-4 min-h-0", isDarkTheme ? "bg-slate-950/40" : "bg-[#F5F8FF]/80")}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-8 space-y-4">
              <AISphere size="md" />
              <p className={cn("text-xl font-black text-center leading-none tracking-tight", isDarkTheme ? "text-white" : "text-slate-900")}>{t('skilyChat.ready')}</p>
              <p className={cn("text-sm text-center leading-relaxed font-medium px-6", isDarkTheme ? "text-slate-400" : "text-slate-500")}>{t('skilyChat.description')}</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={cn(
                "max-w-[85%] p-4 rounded-3xl text-sm shadow-sm leading-relaxed",
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20'
                  : isDarkTheme
                    ? 'bg-slate-800/90 text-slate-200 border border-slate-700/50 rounded-tl-none'
                    : 'bg-white/95 text-slate-800 border border-indigo-100/50 rounded-tl-none'
              )}>
                {msg.role === 'assistant' ? (
                  <div>
                    {msg.content.split(/(\[\s*(?:WIDGET|W|WTON)\s*:[^\]]+\])/gi).map((part, i) => {
                      if (/^\[\s*(?:WIDGET|W|WTON)\s*:/i.test(part)) {
                        const match = part.match(/\[\s*(?:WIDGET|W)\s*:\s*(SIGN|CTA)\s*:\s*([^\]]+?)(?:\s*:\s*([\s\S]+))?\]/i);
                        if (match) {
                          const [_, type, param1, param2] = match;
                          if (type?.toUpperCase() === 'SIGN') return <SignWidget key={i} code={param1.trim()} description={param2} isDarkTheme={isDarkTheme} />;
                          if (type?.toUpperCase() === 'CTA' && param1?.trim().toUpperCase() === 'PREMIUM') {
                            return (
                              <div key={i} className="my-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col gap-2">
                                <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />Skily PRO</h4>
                                <p className="text-xs text-muted-foreground">{param2 || t('skilyChat.proDesc')}</p>
                                <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs h-7 px-3 font-bold" onClick={() => navigate('/pricing')}>
                                  {t('skilyChat.becomePro')}
                                </Button>
                              </div>
                            );
                          }
                        }
                        return null;
                      }
                      if (!part.trim()) return null;
                      return <MarkdownContent key={i} isDarkTheme={isDarkTheme}>{part}</MarkdownContent>;
                    })}
                  </div>
                ) : (
                  <span className="font-medium tracking-tight">{msg.content}</span>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className={cn(
                "px-4 py-3 rounded-2xl rounded-tl-none border shadow-sm flex items-center gap-2 font-medium",
                isDarkTheme ? "bg-slate-800 text-indigo-400 border-slate-700" : "bg-indigo-50 text-indigo-600 border-indigo-100"
              )}>
                <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs">{t('skilyChat.analyzing')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input — always at the bottom, above keyboard */}
        <div className={cn(
          "flex-shrink-0 px-3 py-3 border-t",
          isDarkTheme ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        )}
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('skilyChat.inputPlaceholder')}
              className={cn(
                "w-full h-12 pl-4 pr-14 border rounded-xl font-medium text-sm outline-none transition-all",
                isDarkTheme
                  ? "bg-slate-800 border-slate-700 focus:border-indigo-500 text-white placeholder:text-slate-500"
                  : "bg-slate-50 border-slate-200 focus:border-indigo-400 text-slate-900 placeholder:text-slate-400"
              )}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 w-9 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
