import { useMemo } from "react";
import { Flame, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { WalletWidget } from "@/components/navigation/WalletWidget";

interface DashboardHeaderProps {
  firstName?: string | null;
  streak?: number;
  language: "ru" | "es" | "en";
  onStartTest?: () => void;
  className?: string;
}

const i18n = {
  ru: {
    hero:   "Готов к экзамену,",
    punct:  "?",
    start:  "Начать тест",
    examIn: (days: number) => `Экзамен через ${days} ${daysRu(days)}`,
    noExam: "Укажите дату экзамена",
    streak: (n: number) => `${n}-дневная серия`,
  },
  es: {
    hero:   "¿Listo para conducir,",
    punct:  "?",
    start:  "Empezar",
    examIn: (days: number) => `Examen en ${days} días`,
    noExam: "Configura tu fecha de examen",
    streak: (n: number) => `Racha de ${n} días`,
  },
  en: {
    hero:   "Ready to drive,",
    punct:  "?",
    start:  "Start test",
    examIn: (days: number) => `Exam in ${days} day${days === 1 ? "" : "s"}`,
    noExam: "Set your exam date",
    streak: (n: number) => `${n}-day streak`,
  },
};

function daysRu(n: number) {
  const mod = n % 10, mod100 = n % 100;
  if (mod === 1 && mod100 !== 11) return "день";
  if (mod >= 2 && mod <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

function getTimeLabel(lang: "ru" | "es" | "en"): string {
  const h = new Date().getHours();
  const labels: Record<"ru" | "es" | "en", [string, string, string]> = {
    ru: ["ДОБРОЕ УТРО", "ДОБРЫЙ ДЕНЬ", "ДОБРЫЙ ВЕЧЕР"],
    es: ["BUENOS DÍAS", "BUENAS TARDES", "BUENAS NOCHES"],
    en: ["GOOD MORNING", "GOOD AFTERNOON", "GOOD EVENING"],
  };
  return labels[lang][h < 12 ? 0 : h < 18 ? 1 : 2];
}

function formatExamDate(isoDate: string, lang: "ru" | "es" | "en"): string {
  return new Date(isoDate).toLocaleDateString(
    lang === "ru" ? "ru-RU" : lang === "es" ? "es-ES" : "en-US",
    { day: "numeric", month: "short" },
  );
}

function daysUntil(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}

export function DashboardHeader({
  firstName,
  streak = 0,
  language,
  onStartTest,
  className,
}: DashboardHeaderProps) {
  const { examDate } = useSettingsStore();
  const s = i18n[language] ?? i18n.en;
  const timeLabel = useMemo(() => getTimeLabel(language), [language]);

  const examDays = useMemo(() => examDate ? daysUntil(examDate) : null, [examDate]);

  return (
    <div className={cn("hidden md:flex items-end justify-between gap-6 mb-6", className)}>

      {/* ── Left: hero text ── */}
      <div className="min-w-0">
        {/* Мелкая метка */}
        <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-muted-foreground/35 uppercase mb-2">
          <span className="inline-block w-4 h-px bg-muted-foreground/20" />
          {timeLabel}
        </p>

        {/* Главный заголовок */}
        <h1 className="text-[2.1rem] font-extrabold leading-tight tracking-[-0.02em]">
          <span className="text-foreground">{s.hero} </span>
          <span className="text-primary">{firstName || ""}</span>
          <span className="text-foreground">{s.punct}</span>
        </h1>

        {/* Мета-строка */}
        <div className="flex items-center gap-2.5 mt-2">
          {examDays !== null ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground/65 font-medium">
              <CalendarClock className="w-3.5 h-3.5 text-primary/50 shrink-0" />
              <span className="tabular-nums">{s.examIn(examDays)}</span>
            </span>
          ) : (
            <button
              onClick={() =>
                import("@/store/settingsStore").then(m =>
                  m.useSettingsStore.getState().openSettings("cockpit"),
                )
              }
              className="text-[13px] text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors"
            >
              {s.noExam}
            </button>
          )}

          {examDays !== null && streak > 0 && (
            <span className="text-muted-foreground/20 select-none">•</span>
          )}

          {streak > 0 && (
            <span className="inline-flex items-center gap-1 text-[13px] text-orange-500 font-semibold">
              <Flame className="w-3.5 h-3.5 shrink-0" />
              {s.streak(streak)}
            </span>
          )}
        </div>
      </div>

      {/* ── Right: Wallet ── */}
      <div className="flex items-center gap-3 shrink-0">
        <WalletWidget />
      </div>
    </div>
  );
}
