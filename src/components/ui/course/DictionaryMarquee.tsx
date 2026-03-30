"use client";

import React from 'react';

const TERMS = [
  "Permiso de Conducir (Права)",
  "Examen Teórico (Теория)", 
  "Examen Práctico (Город/Практика)",
  "NIE (Номер иностранца)",
  "TIE (Карта резидента)",
  "Empadronamiento (Прописка)",
  "Cita (Запись)",
  "Tasa (Госпошлина)",
  "Matrícula (Регистрация)",
  "Traductor Jurado (Присяжный переводчик)",
  "DGT (Автоинспекция Испании)",
  "Clases Prácticas (Уроки вождения)",
  "Vehículo (Автомобиль)",
  "Señales (Дорожные знаки)",
  "Carnet por Puntos (Штрафные баллы)",
  "Psicotécnico (Медкомиссия)",
  "Multa (Штраф)",
  "Zona de Examen (Зона экзамена)"
];

const ITEM_COUNT = TERMS.length;

export function DictionaryMarquee() {
  return (
    <div className="w-full bg-zinc-900/50 border-y border-white/5 py-3 md:py-4 mt-8 mb-16 overflow-hidden flex whitespace-nowrap relative">
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-20 bg-gradient-to-r from-[hsl(222,47%,11%)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-20 bg-gradient-to-l from-[hsl(222,47%,11%)] to-transparent z-10 pointer-events-none" />
      
      {/* 
        Tailwind doesn't have animate-marquee by default unless added in config.
        We can use generic inline keyframes for the continuous scroll.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% - 2rem)); }
        }
        .animate-scroll {
          animation: scroll-left 45s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}} />

      <div className="flex gap-8 px-4 animate-scroll items-center shrink-0">
        {[...TERMS, ...TERMS, ...TERMS].map((term, i) => (
          <div key={i} className="flex items-center gap-4 text-xs md:text-sm font-medium">
            <span className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">DGT</span>
            <span className="text-zinc-300 hover:text-sky-400 transition-colors cursor-pointer">{term}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
