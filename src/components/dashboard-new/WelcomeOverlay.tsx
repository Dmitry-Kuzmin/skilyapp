import React, { useState, useEffect } from 'react';
import { Power, Fingerprint, ShieldCheck } from 'lucide-react';
import { playClickSound, playEngineSound, playBiometricSound } from '@/services/audioService';

interface WelcomeOverlayProps {
  onComplete: () => void;
  isLoading?: boolean;
  isPremium?: boolean;
}

type PreloaderMode = 'mechanical' | 'biometric';

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onComplete, isLoading = false, isPremium = false }) => {
  // Автоматический выбор режима: Bio для премиум, Std для остальных
  const [mode, setMode] = useState<PreloaderMode>(() => isPremium ? 'biometric' : 'mechanical');
  const [isIgniting, setIsIgniting] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);

  const handleStart = () => {
    if (isIgniting || isLoading) return;

    setIsIgniting(true);

    // Trigger Sound based on mode
    playClickSound();
    if (mode === 'mechanical') {
      playEngineSound();
    } else if (mode === 'biometric') {
      playBiometricSound();
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
            <p className={`text-xs font-mono tracking-[0.3em] animate-pulse transition-colors duration-500 ${isLoading ? 'text-amber-500' : 'text-indigo-400'}`}>
              {isLoading ? 'SYSTEM BOOTING...' : 'SYSTEM READY'}
            </p>
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

          <p className={`mt-12 text-slate-500 text-sm font-medium transition-all duration-500 ${isIgniting || isLoading ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}`}>
            Нажми для запуска
          </p>
        </div>
      )}

      {/* ==================================================================
          MODE 2: PREMIUM BIOMETRIC (Holographic DNA Scanner) 
         ================================================================== */}
      {mode === 'biometric' && (
        <div className="relative z-10 flex flex-col items-center animate-fade-in">

          {/* AMBIENT GLOW - Pulsating Sphere */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-1000 ${isIgniting ? 'bg-emerald-500/20 scale-125' : 'bg-cyan-500/10 scale-100'}`} style={{ filter: 'blur(80px)' }}></div>

          {/* SUCCESS PARTICLES - только при успехе */}
          {isIgniting && (
            <>
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-[particle1_1s_ease-out_forwards]"></div>
              <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-[particle2_1s_ease-out_0.1s_forwards]"></div>
              <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-cyan-400 rounded-full animate-[particle3_1s_ease-out_0.2s_forwards]"></div>
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-500 rounded-full animate-[particle4_1s_ease-out_0.05s_forwards]"></div>
            </>
          )}

          <div className="mb-10 text-center space-y-1">
            <p className={`text-[10px] font-mono tracking-[0.5em] uppercase transition-all duration-700 ${isLoading ? 'text-amber-500 animate-pulse' : isIgniting ? 'text-emerald-400' : 'text-cyan-400 animate-pulse'}`}>
              {isLoading ? 'Калибровка сенсора...' : isIgniting ? '✓ ОТПЕЧАТОК ПОДТВЕРЖДЁН' : 'Приложите палец'}
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={isLoading}
            className="group relative w-52 h-52 flex items-center justify-center cursor-pointer focus:outline-none"
          >
            {/* OUTER STATIC RING - No rotation */}
            <div className={`absolute inset-[-4px] rounded-full border transition-all duration-500 pointer-events-none ${isIgniting ? 'border-emerald-400/50' : 'border-cyan-500/20 group-hover:border-cyan-400/40'}`}></div>

            {/* MAIN SCANNER CONTAINER */}
            <div className={`relative w-44 h-44 rounded-full overflow-hidden transition-all duration-700 ${isIgniting ? 'bg-emerald-950/80 border-2 border-emerald-500/70 shadow-[0_0_60px_rgba(16,185,129,0.5),inset_0_0_30px_rgba(16,185,129,0.2)]' : 'bg-slate-950/70 border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.25)] group-hover:border-cyan-400/60 group-hover:shadow-[0_0_50px_rgba(6,182,212,0.4)]'}`}>

              {/* GLASS REFLECTION */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent rounded-full pointer-events-none"></div>

              {/* LASER SCAN LINE */}
              <div className={`absolute left-0 w-full h-[3px] transition-opacity duration-300 ${isIgniting ? 'opacity-100 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[laserScan_0.8s_ease-in-out_infinite]' : 'opacity-0'}`}
                style={{ boxShadow: '0 0 15px 3px rgba(52,211,153,0.8), 0 0 30px 6px rgba(52,211,153,0.4)' }}></div>

              {/* FINGERPRINT ICON / SUCCESS ICON */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isIgniting ? (
                  <div className="relative">
                    <ShieldCheck size={72} className="text-emerald-400 animate-[successPop_0.5s_ease-out]" strokeWidth={1.5} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full border-2 border-emerald-400/50 animate-[ripple_1s_ease-out_infinite]"></div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Fingerprint with pulse animation */}
                    <div className={`transition-all duration-500 ${isLoading ? 'opacity-50' : 'group-hover:scale-105'}`}>
                      <Fingerprint
                        size={80}
                        strokeWidth={1.2}
                        className={`transition-all duration-700 ${isLoading ? 'text-amber-500/50 animate-pulse' : 'text-cyan-400 group-hover:text-cyan-300'}`}
                      />
                    </div>

                    {/* Fingerprint glow effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-70 transition-opacity duration-500 blur-lg pointer-events-none">
                      <Fingerprint size={80} strokeWidth={1.2} className="text-cyan-400" />
                    </div>

                    {/* Touch active indicator - pulsing ring */}
                    {!isLoading && (
                      <div className="absolute inset-[-12px] rounded-full border border-cyan-400/20 animate-[touchPulse_1.5s_ease-in-out_infinite] group-hover:border-cyan-400/40"></div>
                    )}
                  </div>
                )}
              </div>

              {/* SCANNING PULSE WAVES - from center */}
              {!isIgniting && !isLoading && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full border border-cyan-400/30 animate-[scanPulse_2s_ease-out_infinite]"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full border border-cyan-400/20 animate-[scanPulse_2s_ease-out_infinite]" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full border border-cyan-400/10 animate-[scanPulse_2s_ease-out_infinite]" style={{ animationDelay: '1s' }}></div>
                  </div>
                </>
              )}

              {/* BOTTOM SENSOR INDICATORS */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isIgniting ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-cyan-500/40 group-hover:bg-cyan-400/60'}`}
                    style={{ transitionDelay: `${i * 100}ms` }}
                  ></div>
                ))}
              </div>
            </div>
          </button>

          <div className="mt-10 h-10 flex flex-col items-center justify-center gap-1">
            {isIgniting ? (
              <div className="flex items-center gap-2.5 text-emerald-400 animate-fade-in">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                </div>
                <span className="text-xs font-mono tracking-[0.2em] uppercase">Доступ разрешён</span>
              </div>
            ) : (
              <p className={`text-sm font-medium transition-all duration-500 ${isLoading ? 'text-amber-500/60' : 'text-slate-400 group-hover:text-cyan-400'}`}>
                {isLoading ? 'Подождите...' : 'Коснитесь для сканирования'}
              </p>
            )}
          </div>

          {/* CUSTOM ANIMATIONS */}
          <style>{`
            @keyframes laserScan {
              0% { top: 15%; }
              50% { top: 85%; }
              100% { top: 15%; }
            }
            @keyframes scanPulse {
              0% { transform: scale(1); opacity: 0.6; }
              100% { transform: scale(2.5); opacity: 0; }
            }
            @keyframes touchPulse {
              0%, 100% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.1); opacity: 0.6; }
            }
            @keyframes successPop {
              0% { transform: scale(0.5); opacity: 0; }
              50% { transform: scale(1.2); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes ripple {
              0% { transform: scale(1); opacity: 0.6; }
              100% { transform: scale(1.5); opacity: 0; }
            }
            @keyframes particle1 {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              100% { transform: translate(-100px, -80px) scale(0); opacity: 0; }
            }
            @keyframes particle2 {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              100% { transform: translate(90px, -60px) scale(0); opacity: 0; }
            }
            @keyframes particle3 {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              100% { transform: translate(-70px, 100px) scale(0); opacity: 0; }
            }
            @keyframes particle4 {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              100% { transform: translate(80px, 90px) scale(0); opacity: 0; }
            }
          `}</style>
        </div>
      )}

    </div>
  );
};

