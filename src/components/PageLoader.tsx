export const PageLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center animate-in fade-in duration-500">
    <div className="relative flex flex-col items-center gap-6">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>

      <div className="relative flex flex-col items-center gap-4">
        <div className="text-indigo-400 text-[10px] font-mono tracking-[0.4em] uppercase animate-pulse">
          Initializing System
        </div>

        {/* Progress bar style loader */}
        <div className="w-32 h-[1px] bg-white/5 relative overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full animate-[progress-scan_1.5s_ease-in-out_infinite]"></div>
        </div>
      </div>

      <style>{`
        @keyframes progress-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  </div>
);

