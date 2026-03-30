"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PerspectiveBook } from "@/components/ui/perspective-book";
import { BookOpen, ChevronRight, ChevronLeft, X } from "lucide-react";

const DICTIONARY_TERMS = [
  { es: "Permiso de Conducir", ru: "Водительское удостоверение", hint: "Документ DGT после сдачи обоих экзаменов" },
  { es: "Examen Teórico", ru: "Теоретический экзамен", hint: "30 вопросов, 30 минут, ≥27 правильных" },
  { es: "Examen Práctico", ru: "Практический экзамен", hint: "Езда с инспектором DGT по городу" },
  { es: "DGT", ru: "Управление дорожным движением", hint: "Dirección General de Tráfico — испанская ГИБДД" },
  { es: "Psicotécnico", ru: "Медкомиссия", hint: "Проверка зрения и реакции, действует 3 мес." },
  { es: "Cita Previa", ru: "Предварительная запись", hint: "Онлайн-запись на сдачу экзамена" },
  { es: "Tasa DGT", ru: "Госпошлина", hint: "Обязательный платёж за сдачу экзамена" },
  { es: "TIE", ru: "Карта иностранца (ВНЖ)", hint: "Tarjeta de Identidad de Extranjero" },
  { es: "Carril VAO", ru: "Полоса для автомобилей с пассажирами", hint: "Для авто с 2+ людьми, обозначена ромбом" },
  { es: "Señales de Balizamiento", ru: "Временные дорожные знаки", hint: "На стройках, жёлтый фон — приоритет над стационарными" },
  { es: "Borrasca", ru: "Шторм / циклон", hint: "Важный термин для вопросов о видимости и скорости" },
  { es: "Autovía", ru: "Автомагистраль без платы", hint: "Ограничение 120 км/ч, без светофоров" },
];

interface DictionaryBookProps {
  className?: string;
}

export function DictionaryBook({ className = "" }: DictionaryBookProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const TERMS_PER_PAGE = 4;
  const totalPages = Math.ceil(DICTIONARY_TERMS.length / TERMS_PER_PAGE);
  const visibleTerms = DICTIONARY_TERMS.slice(page * TERMS_PER_PAGE, (page + 1) * TERMS_PER_PAGE);

  return (
    <div className={`flex items-start gap-8 ${className}`}>
      {/* Book */}
      <div
        className="cursor-pointer shrink-0"
        onClick={() => setOpen(true)}
        title="Открыть словарик"
      >
        <PerspectiveBook
          size="default"
          className="bg-gradient-to-br from-[#0f1535] via-[#1a2050] to-[#0a0e24] text-white"
          backCoverColor="#080c1c"
          spineContent={
            <span
              className="text-zinc-400 font-bold tracking-widest uppercase"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "9px" }}
            >
              СЛОВАРИК DGT
            </span>
          }
        >
          {/* Front cover content */}
          <div className="h-full flex flex-col justify-between p-4">
            <div>
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mb-3">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-400 mb-1">
                Словарик
              </div>
              <div className="text-[11px] font-black text-white leading-tight">
                Студента<br />автошколы
              </div>
            </div>
            <div className="space-y-1">
              {["DGT", "Psicotécnico", "Carril VAO", "Borrasca"].map((t) => (
                <div key={t} className="text-[8px] text-zinc-500 font-mono leading-none">{t}</div>
              ))}
              <div className="text-[8px] text-zinc-600">+{DICTIONARY_TERMS.length - 4} терминов</div>
            </div>
            <div className="text-[8px] text-zinc-600 border-t border-white/10 pt-2">
              Нажмите чтобы<br />открыть →
            </div>
          </div>
        </PerspectiveBook>
      </div>

      {/* Expanded content panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: "auto" }}
            exit={{ opacity: 0, x: -20, width: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 w-[340px] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-bold text-white">Словарик студента</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>

              {/* Terms */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2 mb-4"
                >
                  {visibleTerms.map((term, i) => (
                    <div
                      key={i}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-white">{term.es}</div>
                          <div className="text-xs text-sky-400 font-medium mt-0.5">{term.ru}</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{term.hint}</div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-zinc-300" />
                </button>
                <span className="text-xs text-zinc-500">
                  {page + 1} / {totalPages} · {DICTIONARY_TERMS.length} терминов
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
