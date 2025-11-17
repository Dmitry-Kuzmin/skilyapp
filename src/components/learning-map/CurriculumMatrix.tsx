import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Lock, Play, Sparkles } from "lucide-react";
import { CurriculumBlueprintTopic, CurriculumSection } from "@/data/curriculumBlueprint";
import { useLanguage } from "@/contexts/LanguageContext";

export type ItemStatus = "completed" | "active" | "locked" | "placeholder";

export interface StructuredCurriculumItem {
  code?: string;
  title: string;
  subtopicId?: string;
  status: ItemStatus;
  /**
   * kind:
   * - undefined | "subtopic"  → обычная подтема
   * - "training_test"        → тренировочный тест по теме
   * - "final_test"           → итоговый тест по модулю
   */
  kind?: "subtopic" | "training_test" | "final_test";
}

export interface StructuredCurriculumSection extends CurriculumSection {
  items: StructuredCurriculumItem[];
}

export interface StructuredCurriculumTopic extends CurriculumBlueprintTopic {
  topicId?: string;
  progressPercent: number;
  isCompleted: boolean;
  sections: StructuredCurriculumSection[];
  cover_image?: string;
  gradient_from?: string;
  gradient_to?: string;
}

interface CurriculumMatrixProps {
  topics: StructuredCurriculumTopic[];
  onSubtopicClick: (subtopicId: string) => void;
  onTopicClick?: (topicId: string) => void;
  onTrainingTestClick?: (topicId: string) => void;
  onFinalTestClick?: (topicId: string) => void;
}

const palettes = [
  {
    badgeBg: "bg-sky-50 dark:bg-sky-950/50",
    badgeText: "text-sky-700 dark:text-sky-300",
    badgeBorder: "border-sky-100 dark:border-sky-800",
    progressColor: "text-sky-500 dark:text-sky-400",
    glow: "bg-sky-500/20",
  },
  {
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/50",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBorder: "border-emerald-100 dark:border-emerald-800",
    progressColor: "text-emerald-500 dark:text-emerald-400",
    glow: "bg-emerald-500/20",
  },
  {
    badgeBg: "bg-violet-50 dark:bg-violet-950/50",
    badgeText: "text-violet-700 dark:text-violet-300",
    badgeBorder: "border-violet-100 dark:border-violet-800",
    progressColor: "text-violet-500 dark:text-violet-400",
    glow: "bg-violet-500/20",
  },
  {
    badgeBg: "bg-amber-50 dark:bg-amber-950/50",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBorder: "border-amber-100 dark:border-amber-800",
    progressColor: "text-amber-500 dark:text-amber-400",
    glow: "bg-amber-500/20",
  },
];

export const CurriculumMatrix = ({
  topics,
  onSubtopicClick,
  onTopicClick,
  onTrainingTestClick,
  onFinalTestClick,
}: CurriculumMatrixProps) => {
  const { t } = useLanguage();

  const statusConfig: Record<
    ItemStatus,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    completed: {
      label: t("completed"),
      className: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50",
      icon: CheckCircle2,
    },
    active: {
      label: t("in_progress"),
      className: "bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 border border-sky-100 dark:border-sky-800/50",
      icon: Play,
    },
    locked: {
      label: t("locked"),
      className: "bg-muted/50 text-muted-foreground border border-border",
      icon: Lock,
    },
    placeholder: {
      label: t("coming_soon"),
      className: "bg-muted/50 text-muted-foreground border border-border border-dashed",
      icon: Sparkles,
    },
  };

  return (
    <div className="space-y-10">
      {topics.map((topic, index) => {
        const palette = palettes[index % palettes.length];

        return (
          <Card
            key={`${topic.number}-${topic.title}`}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border bg-card",
              "px-4 py-4 sm:px-6 sm:py-5"
            )}
          >
            <div className="absolute inset-0 opacity-60 pointer-events-none">
              <div
                className={cn(
                  "absolute -top-32 -right-20 w-72 h-72 blur-[120px] rounded-full",
                  palette.badgeBg
                )}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
            </div>

            <div className="relative space-y-4">
              <header
                className={cn(
                  "relative rounded-xl overflow-hidden p-3 sm:p-4 md:p-5 lg:p-6",
                  "flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between",
                  topic.cover_image && "min-h-[140px] sm:min-h-[160px] md:min-h-[140px]"
                )}
              >
                {/* Фоновое изображение с премиум качеством */}
                {topic.cover_image && (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${topic.cover_image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        imageRendering: "crisp-edges",
                        WebkitImageRendering: "-webkit-optimize-contrast",
                        willChange: "transform",
                      }}
                    />
                    {/* Усиленное затемнение для читаемости текста - более сильное на мобилке */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent dark:from-black/70 dark:via-black/40 dark:to-transparent md:from-black/40 md:via-black/20 md:to-transparent dark:md:from-black/60 dark:md:via-black/30 dark:md:to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/60 to-white/20 dark:from-black/90 dark:via-black/70 dark:to-black/40 md:from-white/70 md:via-white/40 md:to-white/10 dark:md:from-black/80 dark:md:via-black/50 dark:md:to-black/20" />
                  </>
                )}

                {/* Контент header с relative позиционированием для overlay */}
                <div className="relative z-10 flex-1 space-y-1.5 sm:space-y-2">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                    <div
                      className={cn(
                        "h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-lg font-bold shadow-lg flex-shrink-0",
                        topic.isCompleted 
                          ? "bg-emerald-500 dark:bg-emerald-600 text-white ring-2 ring-emerald-200 dark:ring-emerald-700" 
                          : `${palette.badgeBg} ${palette.badgeText}`,
                        !topic.topicId && "bg-muted text-muted-foreground",
                        topic.cover_image && "ring-2 ring-white/50 dark:ring-black/50"
                      )}
                    >
                      {topic.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-medium",
                          topic.cover_image 
                            ? "text-slate-800 dark:text-slate-200 drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] md:drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:md:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                            : "text-muted-foreground"
                        )}
                      >
                        {t("module")}
                      </p>
                      <h2
                        className={cn(
                          "text-sm sm:text-base md:text-lg font-bold tracking-tight break-words",
                          topic.cover_image 
                            ? "text-slate-900 dark:text-slate-50 drop-shadow-[0_3px_6px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)] md:drop-shadow-[0_2px_4px_rgba(255,255,255,0.9)] dark:md:drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" 
                            : "text-foreground"
                        )}
                      >
                        {topic.title}
                      </h2>
                    </div>
                  </div>
                  {topic.description && (
                    <p
                      className={cn(
                        "text-xs sm:text-sm max-w-2xl font-medium break-words",
                        topic.cover_image 
                          ? "text-slate-800 dark:text-slate-200 drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] md:drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:md:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                          : "text-muted-foreground"
                      )}
                    >
                      {topic.description}
                    </p>
                  )}
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 md:items-center md:justify-end w-full sm:w-auto">
                  <div className={cn(
                    "flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-lg transition-all w-full sm:w-auto",
                    topic.cover_image 
                      ? "bg-white/95 dark:bg-black/95 backdrop-blur-md border border-white/90 dark:border-black/90 ring-1 ring-white/50 dark:ring-black/50" 
                      : "bg-muted border border-border"
                  )}>
                    <div className="relative flex-shrink-0">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-muted-foreground/30"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={palette.progressColor}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          strokeDasharray={`${Math.min(topic.progressPercent, 100)}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-foreground">
                        {Math.round(topic.progressPercent)}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-medium truncate",
                        topic.cover_image ? "text-slate-600 dark:text-slate-400" : "text-muted-foreground"
                      )}>
                        {t("progress")}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {topic.isCompleted ? t("completed") : t("in_progress")}
                      </p>
                    </div>
                  </div>

                  {topic.topicId && onTopicClick && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className={cn(
                        "rounded-lg sm:rounded-xl font-bold px-3 py-2 sm:px-4 sm:py-3 shadow-lg transition-all hover:scale-105 w-full sm:w-auto text-xs sm:text-sm",
                        topic.cover_image
                          ? "bg-white/95 dark:bg-black/95 backdrop-blur-md text-foreground hover:bg-white dark:hover:bg-black border border-white/90 dark:border-black/90 ring-1 ring-white/50 dark:ring-black/50"
                          : "bg-background text-foreground hover:bg-muted border border-border"
                      )}
                      onClick={() => onTopicClick(topic.topicId!)}
                    >
                      {t("continue_topic")}
                    </Button>
                  )}
                </div>
              </header>

              <div className="space-y-2 sm:space-y-3">
                {topic.sections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-lg sm:rounded-xl border border-border bg-muted/30 p-2.5 sm:p-3 md:p-4 space-y-2 sm:space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {t("block")}
                        </p>
                        <h3 className="text-xs sm:text-sm font-semibold text-foreground break-words">{section.title}</h3>
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground flex-shrink-0">
                        {section.items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {section.items.map((item) => {
                        const config = statusConfig[item.status];
                        const Icon = config.icon;
                        const isTestItem =
                          item.kind === "training_test" || item.kind === "final_test";

                        const disabled =
                          item.status === "locked" ||
                          item.status === "placeholder" ||
                          (!item.subtopicId && !isTestItem);

                        return (
                          <button
                            key={`${section.title}-${item.code}-${item.title}`}
                            onClick={() => {
                              if (item.kind === "training_test" && topic.topicId && onTrainingTestClick) {
                                onTrainingTestClick(topic.topicId);
                                return;
                              }
                              if (item.kind === "final_test" && topic.topicId && onFinalTestClick) {
                                onFinalTestClick(topic.topicId);
                                return;
                              }
                              if (item.subtopicId) {
                                onSubtopicClick(item.subtopicId);
                              }
                            }}
                            disabled={disabled}
                            className={cn(
                              "group relative rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2 text-left transition-all duration-150",
                              "flex flex-col gap-1.5 sm:gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              config.className,
                              !item.subtopicId && "cursor-default"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 sm:gap-3">
                              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground flex-1 min-w-0">
                                {item.code && <span className="truncate">{item.code}</span>}
                                {item.code && <div className="h-1 w-1 rounded-full bg-muted-foreground/30 flex-shrink-0" />}
                                <span className="truncate">{config.label}</span>
                              </div>
                              <Icon className="w-3 h-3 flex-shrink-0" />
                            </div>
                            <p className="text-xs sm:text-sm font-medium leading-snug text-foreground break-words">
                              {item.title}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
