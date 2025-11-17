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
                  "relative rounded-xl overflow-hidden p-4 sm:p-5 md:p-6",
                  "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
                  topic.cover_image && "min-h-[160px] md:min-h-[140px]"
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
                    {/* Легкий blur для премиум эффекта */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/10 dark:from-black/20 dark:via-transparent dark:to-black/30" />
                    {/* Улучшенный overlay для читаемости - адаптивный под тему */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/75 to-white/55 md:from-white/80 md:via-white/70 md:to-white/45 dark:from-black/85 dark:via-black/75 dark:to-black/55 dark:md:from-black/80 dark:md:via-black/70 dark:md:to-black/45" />
                    {/* Дополнительный радиальный градиент для глубины */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.4),transparent_60%)] dark:bg-[radial-gradient(circle_at_20%_30%,rgba(0,0,0,0.4),transparent_60%)]" />
                  </>
                )}

                {/* Контент header с relative позиционированием для overlay */}
                <div className="relative z-10 flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg",
                        topic.isCompleted 
                          ? "bg-emerald-500 dark:bg-emerald-600 text-white ring-2 ring-emerald-200 dark:ring-emerald-700" 
                          : `${palette.badgeBg} ${palette.badgeText}`,
                        !topic.topicId && "bg-muted text-muted-foreground",
                        topic.cover_image && "ring-2 ring-white/50 dark:ring-black/50"
                      )}
                    >
                      {topic.number}
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-[11px] uppercase tracking-[0.2em] font-medium",
                          topic.cover_image 
                            ? "text-slate-700 dark:text-slate-300 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                            : "text-muted-foreground"
                        )}
                      >
                        {t("module")}
                      </p>
                      <h2
                        className={cn(
                          "text-base sm:text-lg font-bold tracking-tight",
                          topic.cover_image 
                            ? "text-slate-900 dark:text-slate-100 drop-shadow-[0_2px_4px_rgba(255,255,255,0.9)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" 
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
                        "text-sm max-w-2xl font-medium",
                        topic.cover_image 
                          ? "text-slate-800 dark:text-slate-200 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                          : "text-muted-foreground"
                      )}
                    >
                      {topic.description}
                    </p>
                  )}
                </div>

                <div className="relative z-10 flex flex-wrap gap-3 md:items-center md:justify-end">
                  <div className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 shadow-lg transition-all",
                    topic.cover_image 
                      ? "bg-white/95 dark:bg-black/95 backdrop-blur-md border border-white/90 dark:border-black/90 ring-1 ring-white/50 dark:ring-black/50" 
                      : "bg-muted border border-border"
                  )}>
                    <div className="relative">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
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
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                        {Math.round(topic.progressPercent)}%
                      </span>
                    </div>
                    <div>
                      <p className={cn(
                        "text-[11px] uppercase tracking-[0.2em] font-medium",
                        topic.cover_image ? "text-slate-600 dark:text-slate-400" : "text-muted-foreground"
                      )}>
                        {t("progress")}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {topic.isCompleted ? t("completed") : t("in_progress")}
                      </p>
                    </div>
                  </div>

                  {topic.topicId && onTopicClick && (
                    <Button
                      variant="secondary"
                      className={cn(
                        "rounded-xl font-bold px-4 py-3 shadow-lg transition-all hover:scale-105",
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

              <div className="space-y-3">
                {topic.sections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {t("block")}
                        </p>
                        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {section.items.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
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
                              "group relative rounded-xl px-3 py-2 min-w-[180px] text-left transition-all duration-150",
                              "flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              config.className,
                              !item.subtopicId && "cursor-default"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                                {item.code && <span>{item.code}</span>}
                                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <span>{config.label}</span>
                              </div>
                              <Icon className="w-3 h-3" />
                            </div>
                            <p className="text-sm font-medium leading-snug text-foreground">
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
