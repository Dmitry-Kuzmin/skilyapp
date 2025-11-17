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
    badgeBg: "bg-slate-50 dark:bg-slate-950/50",
    badgeText: "text-slate-700 dark:text-slate-300",
    badgeBorder: "border-slate-100 dark:border-slate-800",
    progressColor: "text-slate-600 dark:text-slate-400",
    glow: "bg-slate-500/10",
  },
  {
    badgeBg: "bg-neutral-50 dark:bg-neutral-950/50",
    badgeText: "text-neutral-700 dark:text-neutral-300",
    badgeBorder: "border-neutral-100 dark:border-neutral-800",
    progressColor: "text-neutral-600 dark:text-neutral-400",
    glow: "bg-neutral-500/10",
  },
  {
    badgeBg: "bg-zinc-50 dark:bg-zinc-950/50",
    badgeText: "text-zinc-700 dark:text-zinc-300",
    badgeBorder: "border-zinc-100 dark:border-zinc-800",
    progressColor: "text-zinc-600 dark:text-zinc-400",
    glow: "bg-zinc-500/10",
  },
  {
    badgeBg: "bg-gray-50 dark:bg-gray-950/50",
    badgeText: "text-gray-700 dark:text-gray-300",
    badgeBorder: "border-gray-100 dark:border-gray-800",
    progressColor: "text-gray-600 dark:text-gray-400",
    glow: "bg-gray-500/10",
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
      className: "bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800/50",
      icon: CheckCircle2,
    },
    active: {
      label: t("in_progress"),
      className: "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50",
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
              "relative overflow-hidden rounded-2xl border border-border",
              "bg-card/80 dark:bg-card/90 backdrop-blur-sm",
              "px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5"
            )}
          >
            <div className="relative space-y-3 sm:space-y-4">
              <header
                className={cn(
                  "relative rounded-xl overflow-hidden",
                  "p-2.5 sm:p-3 md:p-4 lg:p-5",
                  "flex flex-col gap-2.5 sm:gap-3 md:flex-row md:items-center md:justify-between",
                  topic.cover_image && "min-h-[100px] sm:min-h-[120px] md:min-h-[140px]"
                )}
              >
                {/* Подложка только под контент */}
                {topic.cover_image && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${topic.cover_image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                    {/* Легкое затемнение для читаемости */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent dark:from-black/60 dark:via-black/30 dark:to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/50 to-white/20 dark:from-black/85 dark:via-black/60 dark:to-black/30" />
                  </div>
                )}

                {/* Декоративная подложка без обложки */}
                {!topic.cover_image && (
                  <div className="absolute inset-0 rounded-xl opacity-40 pointer-events-none">
                    <div
                      className={cn(
                        "absolute -top-16 -right-12 w-48 h-48 blur-[100px] rounded-full",
                        palette.badgeBg
                      )}
                    />
                  </div>
                )}

                {/* Контент header с relative позиционированием для overlay */}
                <div className="relative z-10 flex-1 space-y-1.5 sm:space-y-2">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-lg font-bold shadow-md flex-shrink-0 transition-all",
                        topic.isCompleted 
                          ? "bg-slate-600 dark:bg-slate-500 text-white ring-2 ring-slate-300 dark:ring-slate-700" 
                          : `${palette.badgeBg} ${palette.badgeText}`,
                        !topic.topicId && "bg-muted text-muted-foreground",
                        topic.cover_image && "ring-2 ring-white/60 dark:ring-black/60 bg-white/90 dark:bg-black/90 backdrop-blur-sm"
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
                    "flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-2.5 sm:py-2 shadow-md transition-all w-full sm:w-auto",
                    topic.cover_image 
                      ? "bg-white/85 dark:bg-black/85 backdrop-blur-sm border border-white/80 dark:border-black/80" 
                      : "bg-muted/80 dark:bg-muted/60 backdrop-blur-sm border border-border/50"
                  )}>
                    <div className="relative flex-shrink-0">
                      <svg className="w-7 h-7 sm:w-9 sm:h-9 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-muted-foreground/20"
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
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-foreground">
                        {Math.round(topic.progressPercent)}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[9px] sm:text-[10px] uppercase tracking-[0.15em] font-medium truncate",
                        topic.cover_image ? "text-slate-600 dark:text-slate-400" : "text-muted-foreground"
                      )}>
                        {t("progress")}
                      </p>
                      <p className="text-[11px] sm:text-xs font-bold text-foreground truncate">
                        {topic.isCompleted ? t("completed") : t("in_progress")}
                      </p>
                    </div>
                  </div>

                  {topic.topicId && onTopicClick && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className={cn(
                        "rounded-lg sm:rounded-xl font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-md transition-all hover:scale-[1.02] w-full sm:w-auto text-[11px] sm:text-xs",
                        topic.cover_image
                          ? "bg-white/85 dark:bg-black/85 backdrop-blur-sm text-foreground hover:bg-white dark:hover:bg-black border border-white/80 dark:border-black/80"
                          : "bg-background/80 dark:bg-background/60 backdrop-blur-sm text-foreground hover:bg-muted border border-border/50"
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
