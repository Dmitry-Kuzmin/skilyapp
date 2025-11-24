import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, ArrowRight, Loader2 } from 'lucide-react';
import { useLumiChat } from '@/hooks/useLumiChat';
import { playClickSound, playNotificationSound, playTabSwitchSound } from '@/services/audioService';

export const SkilyChat = React.memo(() => {
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
        className={`h-full bg-slate-800/80 backdrop-blur-md rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-lg border border-slate-700 flex flex-col justify-between group hover:border-slate-600 transition-all cursor-pointer relative overflow-hidden ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
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
             <h3 className="font-bold text-white text-xl tracking-tight">AI Помощник</h3>
             <p className="text-xs text-slate-400 mt-2 font-medium">Интеллектуальный ассистент</p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="w-full h-12 pl-5 pr-4 bg-slate-900/50 border border-slate-700 rounded-xl font-medium text-sm text-slate-400 flex items-center justify-between group-hover:bg-slate-900 group-hover:border-indigo-500/30 transition-all">
            <span>Задать вопрос...</span>
            <Maximize2 size={16} className="text-indigo-400" />
          </div>
        </div>
      </div>

      {/* EXPANDED OVERLAY */}
      {isExpanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={handleCollapse}></div>
          
          <div className="relative w-full max-w-4xl h-[85vh] bg-slate-900 rounded-[2rem] shadow-2xl shadow-black border border-slate-800 overflow-hidden flex flex-col animate-slide-up">
            
            {/* Header */}
            <div className="h-24 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900 z-20">
               <div className="flex items-center gap-6">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500 opacity-60 border-t-transparent border-b-transparent shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-spin-slow"></div>
                    <div className="absolute inset-2 rounded-full border-2 border-purple-500 opacity-60 border-l-transparent border-r-transparent animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">AI Neural Core</h2>
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-pink-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         {isLoading ? 'ОБРАБОТКА...' : 'ОНЛАЙН'}
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
            <div className="flex-1 bg-slate-950/50 relative overflow-hidden flex flex-col">
               <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 relative z-10 scroll-smooth">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-100">
                       <div className="mb-8 scale-150 opacity-90 transition-all duration-500">
                          <div className="relative w-48 h-48 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 opacity-60 border-t-transparent border-b-transparent shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-spin-slow"></div>
                            <div className="absolute inset-2 rounded-full border-2 border-purple-500 opacity-60 border-l-transparent border-r-transparent animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                          </div>
                       </div>
                       <p className="text-2xl font-bold text-white mb-2">Системы готовы.</p>
                       <p className="text-base text-slate-400 text-center max-w-sm">
                         Доступ к базе данных DGT в реальном времени. Задай свой вопрос.
                       </p>
                       <p className="mt-8 text-xs text-slate-600 font-mono">MODEL: GEMINI-2.5-FLASH // LATENCY: 24ms</p>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] p-6 rounded-2xl text-lg shadow-sm leading-relaxed ${
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
                       <div className="bg-slate-800 px-6 py-4 rounded-2xl rounded-tl-none border border-slate-700 shadow-sm flex items-center gap-3 text-indigo-400 font-medium">
                          <Loader2 size={18} className="animate-spin" />
                          <span className="text-sm">Анализирую правила...</span>
                       </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Input */}
            <div className="p-6 bg-slate-900 border-t border-slate-800 relative z-20">
               <div className="relative flex items-center">
                  <input
                    autoFocus
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Напиши свой вопрос..."
                    className="w-full h-16 pl-6 pr-20 bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/10 rounded-xl font-medium text-white text-lg transition-all outline-none placeholder:text-slate-500"
                  />
                  <div className="absolute right-2">
                     <button 
                       onClick={handleSendMessage}
                       disabled={!input.trim() || isLoading}
                       className="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
                     >
                        <ArrowRight size={24} />
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

