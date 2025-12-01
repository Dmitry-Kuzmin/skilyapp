import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, ArrowRight, Loader2 } from 'lucide-react';
import { useLumiChat } from '@/hooks/useLumiChat';
import { playClickSound, playNotificationSound, playTabSwitchSound } from '@/services/audioService';
import { useLanguage } from '@/contexts/LanguageContext';

export const SkilyChat = React.memo(() => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, clearMessages } = useLumiChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isExpanded, isLoading]);

  const handleExpand = () => {
    playClickSound();
    setIsExpanded(true);
  };

  const handleCollapse = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    playClickSound();
    setIsExpanded(false);
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
          <div className="mb-8 transition-transform group-hover:scale-110 duration-700">
             <div className="relative w-36 h-36 flex items-center justify-center">
               <div className="absolute inset-0 rounded-full border-2 border-indigo-500 opacity-60 border-t-transparent border-b-transparent shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-spin-slow"></div>
               <div className="absolute inset-2 rounded-full border-2 border-purple-500 opacity-60 border-l-transparent border-r-transparent animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
               <div className="absolute inset-4 rounded-full border border-slate-400 opacity-30 animate-spin-slow"></div>
             </div>
          </div>

          <div className="text-center">
             <h3 className="font-bold text-white text-xl tracking-tight">{t('skilyChat.title')}</h3>
             <p className="text-xs text-slate-400 mt-2 font-medium">{t('skilyChat.subtitle')}</p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="w-full h-12 pl-5 pr-4 bg-slate-900/50 border border-slate-700 rounded-xl font-medium text-sm text-slate-400 flex items-center justify-between group-hover:bg-slate-900 group-hover:border-indigo-500/30 transition-all">
            <span>{t('skilyChat.placeholder')}</span>
            <Maximize2 size={16} className="text-indigo-400" />
          </div>
        </div>
      </div>

      {/* EXPANDED OVERLAY */}
      {isExpanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-8 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={handleCollapse}></div>
          
          <div className="relative w-full h-full max-h-[95vh] sm:max-h-[90vh] md:max-h-[88vh] sm:max-w-5xl bg-slate-900 rounded-none sm:rounded-[2rem] shadow-2xl shadow-black border border-slate-800 overflow-hidden flex flex-col animate-slide-up">
            
            {/* Header */}
            <div className="h-16 sm:h-20 md:h-24 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 md:px-8 bg-slate-900 z-20 flex-shrink-0">
               <div className="flex items-center gap-3 sm:gap-4 md:gap-6 min-w-0">
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500 opacity-60 border-t-transparent border-b-transparent shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-spin-slow"></div>
                    <div className="absolute inset-2 rounded-full border-2 border-purple-500 opacity-60 border-l-transparent border-r-transparent animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">{t('skilyChat.neuralCore')}</h2>
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLoading ? 'bg-pink-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                       <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         {isLoading ? t('skilyChat.processing') : t('skilyChat.online')}
                       </span>
                    </div>
                  </div>
               </div>

               <button 
                 onClick={handleCollapse}
                 className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
               >
                 <Minimize2 size={20} />
               </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-slate-950/50 relative overflow-hidden flex flex-col min-h-0">
               <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 space-y-4 sm:space-y-6 md:space-y-8 relative z-10 scroll-smooth">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-full py-8 sm:py-12 opacity-100">
                       <div className="mb-6 sm:mb-8 scale-100 sm:scale-125 md:scale-150 opacity-90 transition-all duration-500">
                          <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 opacity-60 border-t-transparent border-b-transparent shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-spin-slow"></div>
                            <div className="absolute inset-2 rounded-full border-2 border-purple-500 opacity-60 border-l-transparent border-r-transparent animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                          </div>
                       </div>
                       <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 text-center px-4">{t('skilyChat.ready')}</p>
                       <p className="text-sm sm:text-base text-slate-400 text-center max-w-sm px-4">
                         {t('skilyChat.description')}
                       </p>
                       <p className="mt-6 sm:mt-8 text-[10px] sm:text-xs text-slate-600 font-mono">{t('skilyChat.modelInfo')}</p>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] sm:max-w-[75%] p-4 sm:p-5 md:p-6 rounded-2xl text-sm sm:text-base md:text-lg shadow-sm leading-relaxed ${
                         msg.role === 'user' 
                           ? 'bg-indigo-600 text-white rounded-tr-none' 
                           : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                       }`}>
                          {msg.content}
                       </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                       <div className="bg-slate-800 px-4 sm:px-5 md:px-6 py-3 sm:py-4 rounded-2xl rounded-tl-none border border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 text-indigo-400 font-medium">
                          <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin flex-shrink-0" />
                          <span className="text-xs sm:text-sm">{t('skilyChat.analyzing')}</span>
                       </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Input */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-900 border-t border-slate-800 relative z-20 flex-shrink-0">
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
        </div>
      )}
    </>
  );
});

