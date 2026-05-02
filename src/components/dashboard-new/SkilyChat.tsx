import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, ArrowRight, Sparkles } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { useSkilyAIChat } from '@/hooks/useSkilyAIChat';
import { playClickSound, playNotificationSound, playTabSwitchSound } from '@/services/audioService';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePDDContext } from '@/contexts/PDDContext';
import { AISphere } from '@/components/ai/AISphere';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { SignWidget } from '@/components/chat/SignWidget';
// TON_DISABLED: import { TonPaymentWidget } from '@/components/monetization/LazyTonPaymentWidget';

// Типизация для markdown рендеринга
type MarkdownProps = {
  children: string;
  className?: string;
  isDarkTheme: boolean;
};

const MarkdownContent: React.FC<MarkdownProps> = ({ children, className, isDarkTheme }) => (
  <div className={cn(
    "text-sm sm:text-base leading-relaxed tracking-tight",
    isDarkTheme ? "text-slate-200" : "text-slate-700",
    className
  )}>
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => (
          <span className={cn(
            "font-extrabold px-1.5 py-0.5 rounded-md mx-0.5",
            isDarkTheme
              ? "text-indigo-300 bg-indigo-500/20"
              : "text-indigo-700 bg-indigo-500/[0.08]"
          )}>{children}</span>
        ),
        em: ({ children }) => (
          <span className={cn(
            "font-bold not-italic decoration-indigo-500/30 underline-offset-4 decoration-2",
            isDarkTheme ? "text-white" : "text-slate-900"
          )}>{children}</span>
        ),
        code: ({ children }) => (
          <code className={cn(
            "px-1.5 py-0.5 rounded font-mono text-[0.8em]",
            isDarkTheme ? "bg-slate-800 text-indigo-300" : "bg-slate-100 text-indigo-600"
          )}>{children}</code>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 underline underline-offset-4 decoration-1 font-medium transition-colors">
            {children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);

export const SkilyChat = React.memo(() => {
  const { t } = useLanguage();
  const { selectedCountry } = usePDDContext();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = (resolvedTheme ?? 'dark') !== 'light';
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, clearMessages } = useSkilyAIChat(selectedCountry);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Блокировка скролла body при открытом попапе
  useEffect(() => {
    if (isExpanded) {
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
    }

    return () => {
      // Очистка при размонтировании
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
    };
  }, [isExpanded]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleExpand = () => {
    playClickSound();
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    playClickSound();
    setIsExpanded(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Закрываем только если клик был именно по backdrop, а не по контенту
    if (e.target === e.currentTarget) {
      handleCollapse();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    // Предотвращаем закрытие при клике на контент
    e.stopPropagation();
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    playNotificationSound();
    const userMessage = input.trim();
    setInput('');
    await sendMessage(userMessage);
  };

  return (
    <>
      {/* COMPACT WIDGET */}
      <div
        onClick={handleExpand}
        className={cn(
          "h-full rounded-3xl xl:rounded-[2.5rem] p-5 md:p-6 xl:p-8 shadow-lg border flex flex-col justify-between group transition-all cursor-pointer relative overflow-hidden",
          isDarkTheme
            ? "bg-slate-800/80 backdrop-blur-md border-slate-700 hover:border-slate-600"
            : "bg-white border-slate-200/80 hover:border-slate-300 shadow-[0_20px_45px_rgba(0,0,0,0.06)]",
          isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div className="flex flex-col items-center justify-center flex-1 relative z-10">
          <div className="mb-8">
            <AISphere size="lg" />
          </div>

          <div className="text-center">
            <h3 className={cn(
              "font-bold text-xl tracking-tight",
              isDarkTheme ? "text-white" : "text-slate-900"
            )}>{t('skilyChat.title')}</h3>
            <p className={cn(
              "text-xs mt-2 font-medium",
              isDarkTheme ? "text-slate-400" : "text-slate-500"
            )}>{t('skilyChat.subtitle')}</p>
          </div>
        </div>

        <div className="relative z-10 w-full mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExpand();
            }}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>{t('skilyChat.title') || 'Спросить Skily'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* EXPANDED OVERLAY (RESPONSIVE MODAL) */}
      <ResponsiveModal
        open={isExpanded}
        onOpenChange={setIsExpanded}
        hideCloseButton={true}
        className={cn(
          "p-0 overflow-hidden",
          isDarkTheme ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}
        contentClassName={cn(
          "p-0 flex flex-col h-full",
          isDarkTheme ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"
        )}
        fullscreen={false} // Let it adapt height, usually 90-95% on mobile via drawer
        headerContent={
          <div className={cn(
            "h-14 sm:h-16 md:h-20 border-b flex items-center justify-between px-4 sm:px-6 backdrop-blur z-20 flex-shrink-0 w-full transition-colors",
            isDarkTheme ? "border-slate-800 bg-slate-900/95" : "border-slate-100 bg-white/95"
          )}>
            <div className="flex items-center gap-3">
              <AISphere size="sm" className="flex-shrink-0 scale-75 sm:scale-100" />
              <div className="min-w-0">
                <h2 className={cn(
                  "text-sm sm:text-lg font-bold truncate",
                  isDarkTheme ? "text-white" : "text-slate-900"
                )}>{t('skilyChat.neuralCore')}</h2>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLoading ? 'bg-pink-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className={cn(
                    "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest",
                    isDarkTheme ? "text-slate-400" : "text-slate-500"
                  )}>
                    {isLoading ? t('skilyChat.processing') : t('skilyChat.online')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors",
                isDarkTheme ? "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900"
              )}
            >
              <Minimize2 size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        }
      >
        <div className={cn(
          "flex flex-col h-full min-h-0 transition-colors duration-500 relative",
          isDarkTheme ? "bg-slate-950/40" : "bg-[#F5F8FF]/80"
        )}>
          {/* Subtle noise texture for premium feel */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.svg')] mix-blend-overlay"></div>

          {/* Chat Area */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative z-10 scroll-smooth min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-4 space-y-6">
                <div className="scale-90 sm:scale-110 mb-2 transition-transform drop-shadow-2xl">
                  <AISphere size="lg" />
                </div>
                <div className="space-y-3 max-w-sm sm:max-w-md">
                  <p className={cn(
                    "text-xl sm:text-3xl font-black mb-2 text-center px-4 leading-none tracking-tight",
                    isDarkTheme ? "text-white" : "text-slate-900"
                  )}>{t('skilyChat.ready')}</p>
                  <p className={cn(
                    "text-sm sm:text-base text-center px-4 leading-relaxed font-medium",
                    isDarkTheme ? "text-slate-400" : "text-slate-500"
                  )}>
                    {t('skilyChat.description')}
                  </p>
                </div>
                <div className={cn(
                  "p-2.5 sm:p-3 rounded-2xl border backdrop-blur-md transition-all",
                  isDarkTheme ? "bg-slate-900/40 border-slate-800/40" : "bg-white/60 border-indigo-100/50 shadow-sm"
                )}>
                  <p className={cn(
                    "text-[10px] sm:text-xs font-mono font-bold tracking-widest text-center uppercase",
                    isDarkTheme ? "text-indigo-400/60" : "text-indigo-500/60"
                  )}>
                    {t('skilyChat.modelInfo')}
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={cn(
                  "max-w-[90%] sm:max-w-[80%] p-4 sm:p-5 rounded-3xl text-sm sm:text-base shadow-sm leading-relaxed transition-all",
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20'
                    : isDarkTheme
                      ? 'bg-slate-800/90 backdrop-blur-md text-slate-200 border border-slate-700/50 rounded-tl-none shadow-black/20'
                      : 'bg-white/95 backdrop-blur-md text-slate-800 border border-indigo-100/50 rounded-tl-none shadow-[0_10px_30px_rgba(0,0,0,0.04)]'
                )}>
                  {msg.role === 'assistant' ? (
                    <div>
                      {msg.content.split(/(\[\s*(?:WIDGET|W|WTON)\s*:[^\]]+\])/gi).map((part, partIndex) => {
                        const isWidget = /^\[\s*(?:WIDGET|W|WTON)\s*:/i.test(part);
                        if (isWidget) {
                          const match = part.match(/\[\s*(?:WIDGET|W)\s*:\s*(SIGN|CTA|TON|WTON)\s*:\s*([^\]]+?)(?:\s*:\s*([\s\S]+))?\]/i) || part.match(/\[\s*(WTON)\s*:\s*([^\]]+?)(?:\s*:\s*([\s\S]+))?\]/i);
                          if (match) {
                            const [_, type, param1, param2] = match;
                            const upperType = type?.toUpperCase();
                            const upperParam1 = param1?.trim().toUpperCase();

                            if (upperType === 'SIGN') {
                              return <SignWidget key={partIndex} code={param1.trim()} description={param2} isDarkTheme={isDarkTheme} />;
                            }

                            // TON_DISABLED: TON widget removed

                            if (upperType === 'CTA' && upperParam1 === 'PREMIUM') {
                              return (
                                <div key={partIndex} className="my-4 p-4 bg-gradient-to-br from-amber-500/10 via-orange-400/5 to-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                                  <div className="relative z-10">
                                    <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><Sparkles className="w-4 h-4" />Skily PRO</h4>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{param2 || t('skilyChat.proDesc')}</p>
                                  </div>
                                  <Button size="sm" className="relative z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white shrink-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all text-xs h-8 px-4 font-bold" onClick={() => window.location.href = '/pricing'}>
                                    {t('skilyChat.becomePro')}
                                  </Button>
                                </div>
                              );
                            }
                          }
                          // Fallback if widget parsing fails or unknown widget type (don't show string to user if it's a known widget format)
                          return null;
                        }

                        // Render text parts 
                        if (!part.trim()) return null;
                        return (
                          <MarkdownContent key={partIndex} isDarkTheme={isDarkTheme}>{part}</MarkdownContent>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="font-medium tracking-tight prose-sm">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className={cn(
                  "px-4 py-3 rounded-2xl rounded-tl-none border shadow-sm flex items-center gap-2 font-medium transition-colors",
                  isDarkTheme ? "bg-slate-800 text-indigo-400 border-slate-700" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                )}>
                  <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-xs sm:text-sm">{t('skilyChat.analyzing')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className={cn(
            "p-3 sm:p-4 md:p-6 border-t relative z-20 flex-shrink-0 mt-auto transition-colors",
            isDarkTheme ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          )}>
            <div className="relative flex items-center">
              <input
                autoFocus
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('skilyChat.inputPlaceholder')}
                className={cn(
                  "w-full h-12 sm:h-14 md:h-16 pl-4 sm:pl-5 md:pl-6 pr-16 sm:pr-18 md:pr-20 border focus:ring-2 sm:focus:ring-4 rounded-xl font-medium text-sm sm:text-base md:text-lg transition-all outline-none transition-colors",
                  isDarkTheme
                    ? "bg-slate-800 border-slate-700 focus:border-indigo-500 focus:bg-slate-800 focus:ring-indigo-500/10 text-white placeholder:text-slate-500"
                    : "bg-slate-50 border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-indigo-500/5 text-slate-900 placeholder:text-slate-400"
                )}
              />
              <div className="absolute right-1.5 sm:right-2">
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
                >
                  <ArrowRight size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
});
