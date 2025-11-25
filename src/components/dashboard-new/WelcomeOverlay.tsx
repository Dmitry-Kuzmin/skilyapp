import React, { useState } from 'react';
import { Power, Fingerprint, Scan, ShieldCheck, Key } from 'lucide-react';
import { playClickSound, playEngineSound, playBiometricSound, playUnlockSound } from '@/services/audioService';

interface WelcomeOverlayProps {
  onComplete: () => void;
}

type PreloaderMode = 'mechanical' | 'biometric' | 'elite';

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<PreloaderMode>('mechanical');
  const [isIgniting, setIsIgniting] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);

  const handleStart = () => {
    if (isIgniting) return;
    
    setIsIgniting(true);
    
    // Trigger Sound based on mode
    playClickSound();
    if (mode === 'mechanical') {
      playEngineSound();
    } else if (mode === 'biometric') {
      playBiometricSound();
    } else if (mode === 'elite') {
      playUnlockSound();
    }
    
    // Ignition sequence timing
    setTimeout(() => {
      setIsLaunched(true);
      setTimeout(onComplete, 800); // Fade out after launch
    }, 1800);
  };

  if (isLaunched) {
    // Fade out state
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0f172a] transition-opacity duration-700 opacity-0 pointer-events-none"></div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center p-6 transition-all duration-500 overflow-hidden selection:bg-indigo-500/30">
      
      {/* Background Ambiance */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0f172a] to-[#0f172a]"></div>
      
      {/* ==================================================================
          MODE 1: MECHANICAL (Start Engine) 
         ================================================================== */}
      {mode === 'mechanical' && (
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="mb-12 text-center space-y-2">
             <p className="text-indigo-400 text-xs font-mono tracking-[0.3em] animate-pulse">SYSTEM READY</p>
          </div>

          <button 
            onClick={handleStart}
            className={`group relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 transform-gpu ${isIgniting ? 'animate-shake' : 'hover:scale-105'}`}
          >
            {/* Radial Gradient Glow (Fixes Square Shadow Bug) */}
            <div className={`absolute inset-[-50%] rounded-full transition-all duration-500 pointer-events-none mix-blend-screen ${isIgniting ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-60'}`}
                 style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0) 70%)' }}>
            </div>

            {/* Metal Ring */}
            <div className="absolute inset-0 rounded-full metal-ring shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_5px_rgba(255,255,255,0.5)] p-3 z-10">
              {/* Inner Dark Plastic */}
              <div className="w-full h-full rounded-full bg-[#111] shadow-[inset_0_5px_15px_rgba(0,0,0,0.9)] p-1.5">
                
                {/* Button Surface */}
                <div className={`w-full h-full rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#050505] border-t border-white/10 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 ${isIgniting ? 'border-indigo-500/50' : ''}`}>
                  
                  {/* Brushed Metal Texture */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>
                  
                  {/* LED Indicator */}
                  <div className="w-16 h-2 rounded-full bg-black/80 mb-4 overflow-hidden border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,1)]">
                    <div 
                      className={`h-full bg-gradient-to-r from-indigo-600 to-purple-400 shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all ease-out ${isIgniting ? 'w-full' : 'w-0'}`}
                      style={{ transitionDuration: '1500ms' }}
                    ></div>
                  </div>

                  <div className="flex flex-col items-center relative z-10">
                      <Power size={32} className={`mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] transition-colors duration-300 ${isIgniting ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      <span className={`text-xs font-bold tracking-[0.25em] uppercase transition-colors duration-300 ${isIgniting ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`}>Engine</span>
                      <span className="text-[10px] text-slate-700 font-bold tracking-widest uppercase mt-1">Start/Stop</span>
                  </div>
                  
                  {/* Bottom Gloss Reflection */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-8 bg-white/5 blur-md rounded-t-full opacity-50"></div>
                </div>
              </div>
            </div>
          </button>

          <p className={`mt-12 text-slate-500 text-sm font-medium transition-opacity duration-500 ${isIgniting ? 'opacity-0' : 'opacity-100'}`}>
             Нажми для запуска
          </p>
        </div>
      )}

      {/* ==================================================================
          MODE 2: PREMIUM BIOMETRIC (Holographic) 
         ================================================================== */}
      {mode === 'biometric' && (
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          
          {/* Scanning overlay line */}
          {isIgniting && (
            <div className="absolute inset-0 z-20 bg-indigo-500/10 animate-pulse pointer-events-none"></div>
          )}

          <div className="mb-8 text-center space-y-2">
             <p className="text-emerald-400 text-xs font-mono tracking-[0.3em] animate-pulse">SECURE ACCESS REQUIRED</p>
          </div>

          <button 
            onClick={handleStart}
            className="group relative w-56 h-56 flex items-center justify-center cursor-pointer focus:outline-none"
          >
            {/* Rotating outer ring */}
            <div className={`absolute inset-0 rounded-full border border-indigo-500/30 border-dashed transition-all ${isIgniting ? 'animate-spin-slow border-emerald-500/50' : ''}`} style={{ transitionDuration: '2s' }}></div>
            <div className={`absolute inset-2 rounded-full border border-indigo-500/20 border-dotted transition-all ${isIgniting ? 'animate-spin-slow border-emerald-500/30' : ''}`} style={{ animationDirection: 'reverse', transitionDuration: '3s' }}></div>

            {/* Hexagon Glass Container */}
            <div className={`relative w-40 h-40 bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] flex items-center justify-center overflow-hidden transition-all duration-500 ${isIgniting ? 'border-emerald-500/50 bg-emerald-900/20 shadow-[0_0_50px_rgba(16,185,129,0.4)]' : 'group-hover:border-indigo-400/50 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]'}`}>
               
               {/* Scanning Line */}
               <div className={`absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_10px_#fff] opacity-0 transition-opacity ${isIgniting ? 'opacity-100 animate-[scan_1.5s_ease-in-out_infinite]' : ''}`}></div>

               {/* Icon */}
               <div className="relative z-10 text-indigo-400 transition-all duration-500">
                  {isIgniting ? (
                     <Scan size={64} className="text-emerald-400 animate-pulse" />
                  ) : (
                     <Fingerprint size={64} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-300" />
                  )}
               </div>
            </div>
          </button>

          <div className="mt-10 h-8 flex items-center justify-center">
            {isIgniting ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck size={16} />
                <span className="text-xs font-mono tracking-widest uppercase">Identity Verified</span>
              </div>
            ) : (
              <p className="text-slate-500 text-sm font-medium opacity-60">
                Нажми для сканирования
              </p>
            )}
          </div>

        </div>
      )}

      {/* ==================================================================
          MODE 3: ELITE HYPER-KEY (Luxury) 
         ================================================================== */}
      {mode === 'elite' && (
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
           
           <div className="mb-12 text-center space-y-2">
             <p className="text-yellow-500/80 text-xs font-sans tracking-[0.4em] uppercase animate-pulse">Awaiting Authorization</p>
          </div>

          <button 
            onClick={handleStart}
            className={`relative w-24 h-44 rounded-2xl perspective-1000 transition-all duration-700 cursor-pointer ${isIgniting ? 'scale-110 -translate-y-10 opacity-0' : 'hover:-translate-y-2'}`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse"></div>
            
            {/* Key Body */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black border border-yellow-500/30 rounded-2xl flex flex-col items-center justify-between p-4 shadow-2xl overflow-hidden group">
               {/* Shimmer */}
               <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-400/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div>
               
               <div className="text-yellow-500/50">
                  <div className="text-xs font-bold">DGT</div>
               </div>

               <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                    <Key size={18} />
                  </div>
                  <div className="w-1 h-8 bg-yellow-500/20 rounded-full overflow-hidden">
                     <div className="w-full h-full bg-yellow-400 animate-[slideUp_1s_infinite]"></div>
                  </div>
               </div>

               <div className="text-[8px] text-yellow-500/40 font-mono uppercase tracking-widest">
                  Elite Access
               </div>
            </div>
          </button>

          <p className={`mt-12 text-yellow-500/40 text-xs font-medium tracking-widest uppercase transition-opacity duration-500 ${isIgniting ? 'opacity-0' : 'opacity-100'}`}>
             Вставить ключ
          </p>
        </div>
      )}

      {/* ==================================================================
          MODE SWITCHER 
         ================================================================== */}
      <div className="absolute bottom-8 flex gap-2 md:gap-4 p-2 bg-slate-900/50 backdrop-blur-md rounded-full border border-white/5">
        <button 
          onClick={() => setMode('mechanical')}
          className={`px-3 md:px-4 py-2 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-widest border transition-all ${mode === 'mechanical' ? 'bg-white text-slate-900 border-white' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
        >
          Std
        </button>
        <button 
          onClick={() => setMode('biometric')}
          className={`px-3 md:px-4 py-2 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-widest border transition-all ${mode === 'biometric' ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-slate-500 border-transparent hover:text-emerald-400'}`}
        >
          Bio
        </button>
        <button 
          onClick={() => setMode('elite')}
          className={`px-3 md:px-4 py-2 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-widest border transition-all ${mode === 'elite' ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'text-slate-500 border-transparent hover:text-yellow-400'}`}
        >
          Elite
        </button>
      </div>

    </div>
  );
};

