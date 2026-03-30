import React, { useState } from 'react';
import { Crown, CheckCircle, Zap, XCircle } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    traditional: "Сплошной испанский",
    skily: "На русском языке",
    skilyDesc: "+ Мини-курс автоиспанского"
  },
  {
    traditional: "Строго по часам",
    skily: "24/7 в телефоне",
    skilyDesc: "+ Записи всех эфиров"
  },
  {
    traditional: "Скучные лекции",
    skily: "Геймификация",
    skilyDesc: "Симуляция реального экзамена DGT"
  },
  {
    traditional: "Учитель не успевает",
    skily: "Личный куратор",
    skilyDesc: "+ Мгновенные ответы AI"
  },
  {
    traditional: "Бюрократия",
    skily: "Документы под ключ",
    skilyDesc: "Помогаем с Cita, Tasa, Psicotécnico"
  }
];

export function CourseComparison() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative z-10 w-full">
      <div className="mb-20 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">Эволюция подготовки</h2>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">Skilyapp против традиционных автошкол</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto items-center">
        {/* LEFT: LEGACY (OLD SCHOOL) */}
        <div className="relative py-8 px-6 space-y-10 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 md:bg-transparent md:border-transparent">
          <h3 className="text-xl md:text-2xl font-bold text-zinc-500 text-center uppercase tracking-widest mb-8">Испанская автошкола</h3>

          {/* First Row (Price) */}
          <div className="text-center pb-8 border-b border-white/5 mx-8">
            <div className="text-3xl text-zinc-500 font-mono line-through decoration-red-500/50 decoration-4">€350+</div>
            <div className="text-xs text-zinc-600 mt-2 font-medium">Только за базовую теорию без гарантий</div>
          </div>

          {/* Other Rows */}
          <div className="space-y-8 px-2">
            {COMPARISON_ROWS.map((row, i) => (
              <div key={i} className="flex items-center justify-center text-zinc-500 group min-h-[4rem]">
                <span className="flex items-center gap-3 decoration-zinc-600 group-hover:line-through transition-all text-base md:text-lg font-medium text-center">
                  {row.traditional} <XCircle size={20} className="text-red-900/60 shrink-0" />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: SKILY (NEXT GEN) */}
        <div
          onMouseMove={handleSpotlightMove}
          className="relative bg-zinc-900/60 backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_60px_-10px_rgba(56,189,248,0.3),inset_0_0_30px_rgba(255,255,255,0.03)] overflow-hidden transform md:-translate-y-4 hover:border-sky-500/50 transition-all duration-300 group ring-0"
        >
          {/* Spotlight Effect */}
          <div
            className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2.5rem] z-0"
            style={{
              background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(56, 189, 248, 0.12), transparent 40%)`
            }}
          />

          <div className="absolute inset-0 bg-sky-500/5 pointer-events-none z-0"></div>
          <h3 className="relative z-10 text-2xl font-black text-white text-center uppercase tracking-widest mb-10 flex items-center justify-center gap-3">
            Skilyapp <Crown size={24} className="text-amber-400 fill-amber-400/20" />
          </h3>

          {/* Price */}
          <div className="text-center relative mx-4">
            <div className="text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
              от €199
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full mt-4 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Zap size={12} className="fill-current" /> 9 из 10 сдают сразу
            </div>
          </div>

          {/* Divider */}
          <div className="w-1/2 mx-auto border-t border-white/10 my-8"></div>

          {/* Other Rows */}
          <div className="space-y-8 px-2 relative z-10">
            {COMPARISON_ROWS.map((row, i) => (
              <div key={i} className="flex flex-col items-center justify-center min-h-[4rem] text-center">
                <span className="flex items-center gap-3 text-white font-black text-lg md:text-xl tracking-tight drop-shadow-lg">
                  {row.skily} <CheckCircle size={24} className="text-sky-400 fill-sky-400/20 shrink-0" />
                </span>
                {row.skilyDesc && (
                  <span className="text-xs md:text-sm font-medium text-sky-100/70 mt-1.5 block">
                    {row.skilyDesc}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
