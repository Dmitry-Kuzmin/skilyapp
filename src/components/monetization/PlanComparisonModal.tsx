'use client';

import { Crown, X, Check, ArrowLeft } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PlanComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlan?: () => void;
}

interface FeatureRow {
  label: string;
  free: string | boolean;
  premium: string | boolean;
}

interface FeatureSection {
  title: string;
  emoji: string;
  rows: FeatureRow[];
}

const SECTIONS: FeatureSection[] = [
  {
    title: "Обучение",
    emoji: "🎓",
    rows: [
      { label: "Тестов в день", free: "5 / день", premium: "∞ Безлимит" },
      { label: "База вопросов", free: "300", premium: "2 157" },
      { label: "Вопросов за сессию", free: "20", premium: "Без лимита" },
    ],
  },
  {
    title: "AI & Аналитика",
    emoji: "🤖",
    rows: [
      { label: "AI-Помощник", free: "5 / день", premium: "Безлимит" },
      { label: "AI помнит твои ошибки", free: false, premium: true },
      { label: "Глубокая статистика", free: "Базовая", premium: "Deep AI" },
      { label: "AI-прогноз сдачи", free: false, premium: true },
    ],
  },
  {
    title: "Дуэли & Прогресс",
    emoji: "⚔️",
    rows: [
      { label: "Комиссия дуэлей", free: "10%", premium: "0%" },
      { label: "Опыт (XP)", free: "× 1", premium: "× 2" },
    ],
  },
];

function CellValue({ value, isPremium }: { value: string | boolean; isPremium: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30">
        <Check className="w-3.5 h-3.5 text-violet-400" />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/5 border border-white/10">
        <X className="w-3.5 h-3.5 text-slate-600" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-sm font-bold px-3 py-1 rounded-full",
        isPremium
          ? "bg-violet-500/20 text-violet-300 border border-violet-500/20"
          : "text-slate-500"
      )}
    >
      {value}
    </span>
  );
}

export function PlanComparisonModal({ open, onOpenChange, onSelectPlan }: PlanComparisonModalProps) {
  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      showTitleBar={false}
      className="sm:max-w-lg"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-1 pt-2 pb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-500 mb-2">
            Детальное сравнение
          </p>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span className="text-slate-400 font-bold">Free</span>
            <span className="text-slate-600 text-base font-normal">vs</span>
            <Crown className="w-5 h-5 text-amber-400 fill-amber-400/20" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Premium
            </span>
          </h2>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="mt-1 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_100px] gap-2 px-1 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Функция</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center">Free</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400 text-center flex items-center justify-center gap-1">
          <Crown className="w-3 h-3 fill-violet-400/30" /> Premium
        </div>
      </div>

      {/* Table sections */}
      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-4">
          <div className="flex items-center gap-2 mb-2 py-1.5">
            <span className="text-base leading-none">{section.emoji}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{section.title}</span>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
            {section.rows.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-[1fr_80px_100px] gap-2 items-center px-4 py-3",
                  i < section.rows.length - 1 && "border-b border-white/5"
                )}
              >
                <span className="text-sm text-slate-300">{row.label}</span>
                <div className="flex justify-center">
                  <CellValue value={row.free} isPremium={false} />
                </div>
                <div className="flex justify-center">
                  <CellValue value={row.premium} isPremium={true} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer CTA */}
      <div className="pt-2 pb-4">
        <Button
          onClick={() => {
            onOpenChange(false);
            onSelectPlan?.();
          }}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm border-0 shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Выбрать план
        </Button>
      </div>
    </UnifiedModal>
  );
}
