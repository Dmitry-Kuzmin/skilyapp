import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, ArrowRight, Loader2 } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { useLumiChat } from '@/hooks/useLumiChat';
import { playClickSound, playNotificationSound, playTabSwitchSound } from '@/services/audioService';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePDDContext } from '@/contexts/PDDContext';
import { AISphere } from '@/components/ai/AISphere';

export const SkilyChat = React.memo(() => {
  const { t } = useLanguage();
  const { selectedCountry } = usePDDContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, clearMessages } = useLumiChat(selectedCountry);
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
        className={`h-full bg-slate-800/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-lg border border-slate-700 flex flex-col justify-between group hover:border-slate-600 transition-all cursor-pointer relative overflow-hidden ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div className="flex flex-col items-center justify-center flex-1 relative z-10">
          <div className="mb-8">
            <AISphere size="lg" />
          </div>

          <div className="text-center">
            <h3 className="font-bold text-white text-xl tracking-tight">{t('skilyChat.title')}</h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">{t('skilyChat.subtitle')}</p>
          </div>
        </div>

        <div className="relative z-10 w-full mt-auto">
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
        className="bg-slate-900 border-slate-800 p-0 overflow-hidden"
        contentClassName="bg-slate-900 text-slate-200 p-0 flex flex-col h-full"
        fullscreen={false} // Let it adapt height, usually 90-95% on mobile via drawer
        headerContent={
          <div className="h-14 sm:h-16 md:h-20 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-slate-900/95 backdrop-blur z-20 flex-shrink-0 w-full">
            <div className="flex items-center gap-3">
              <AISphere size="sm" className="flex-shrink-0 scale-75 sm:scale-100" />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold text-white truncate">{t('skilyChat.neuralCore')}</h2>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLoading ? 'bg-pink-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isLoading ? t('skilyChat.processing') : t('skilyChat.online')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <Minimize2 size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        }
      >
        <div className="flex flex-col h-full min-h-0 bg-slate-950/50">
          {/* Chat Area */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10 scroll-smooth min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-4 opacity-100">
                <div className="scale-75 sm:scale-100 mb-4 transition-transform">
                  <AISphere size="lg" />
                </div>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-2 text-center px-4 leading-tight">{t('skilyChat.ready')}</p>
                <p className="text-xs sm:text-sm md:text-base text-slate-400 text-center max-w-xs sm:max-w-md px-4 leading-relaxed">
                  {t('skilyChat.description')}
                </p>
                <div className="mt-6 p-2 sm:p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <p className="text-[10px] sm:text-xs text-slate-500 font-mono text-center">
                    {t('skilyChat.modelInfo')}
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-5 rounded-2xl text-sm sm:text-base shadow-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-700 shadow-sm flex items-center gap-2 text-indigo-400 font-medium">
                  <Loader2 size={16} className="animate-spin flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{t('skilyChat.analyzing')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 md:p-6 bg-slate-900 border-t border-slate-800 relative z-20 flex-shrink-0 mt-auto">
            <div className="relative flex items-center">
              <input
                autoFocus
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('skilyChat.inputPlaceholder')}
                className="w-full h-12 sm:h-14 md:h-16 pl-4 sm:pl-5 md:pl-6 pr-16 sm:pr-18 md:pr-20 bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:bg-slate-800 focus:ring-2 sm:focus:ring-4 focus:ring-indigo-500/10 rounded-xl font-medium text-white text-sm sm:text-base md:text-lg transition-all outline-none placeholder:text-slate-500"
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

