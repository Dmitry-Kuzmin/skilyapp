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
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700",
    badgeBorder: "border-sky-100",
    progressColor: "text-sky-500",
  },
  {
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-100",
    progressColor: "text-emerald-500",
  },
  {
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-700",
    badgeBorder: "border-violet-100",
    progressColor: "text-violet-500",
  },
  {
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-100",
    progressColor: "text-amber-500",
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
      className: "bg-emerald-50 text-emerald-800 border border-emerald-100",
      icon: CheckCircle2,
    },
    active: {
      label: t("in_progress"),
      className: "bg-sky-50 text-sky-800 border border-sky-100",
      icon: Play,
    },
    locked: {
      label: t("locked"),
      className: "bg-slate-50 text-slate-400 border border-slate-200",
      icon: Lock,
    },
    placeholder: {
      label: t("coming_soon"),
      className: "bg-slate-50 text-slate-400 border border-slate-200 border-dashed",
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
              "relative overflow-hidden rounded-2xl border border-slate-200 bg-white",
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
                  topic.cover_image && "min-h-[140px] md:min-h-[120px]"
                )}
                style={
                  topic.cover_image
                    ? {
                        backgroundImage: `url(${topic.cover_image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }
                    : undefined
                }
              >
                {/* Overlay для читаемости текста поверх картинки */}
                {topic.cover_image && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/90 to-white/70 md:from-white/90 md:via-white/85 md:to-white/60" />
                )}

                {/* Контент header с relative позиционированием для overlay */}
                <div className="relative z-10 flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm",
                        topic.isCompleted ? "bg-emerald-500 text-white" : palette.badgeBg,
                        !topic.topicId && "bg-slate-200 text-slate-500"
                      )}
                    >
                      {topic.number}
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-[11px] uppercase tracking-[0.2em]",
                          topic.cover_image ? "text-slate-600" : "text-slate-400"
                        )}
                      >
                        {t("module")}
                      </p>
                      <h2
                        className={cn(
                          "text-base sm:text-lg font-semibold tracking-tight",
                          topic.cover_image ? "text-slate-900 drop-shadow-sm" : "text-slate-900"
                        )}
                      >
                        {topic.title}
                      </h2>
                    </div>
                  </div>
                  {topic.description && (
                    <p
                      className={cn(
                        "text-sm max-w-2xl",
                        topic.cover_image ? "text-slate-700" : "text-slate-600"
                      )}
                    >
                      {topic.description}
                    </p>
                  )}
                </div>

                <div className="relative z-10 flex flex-wrap gap-3 md:items-center md:justify-end">
                  <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-xl px-3 py-2 shadow-sm">
                    <div className="relative">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-sky-500"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          strokeDasharray={`${Math.min(topic.progressPercent, 100)}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-800">
                        {Math.round(topic.progressPercent)}%
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {t("progress")}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {topic.isCompleted ? t("completed") : t("in_progress")}
                      </p>
                    </div>
                  </div>

                  {topic.topicId && onTopicClick && (
                    <Button
                      variant="secondary"
                      className="rounded-xl bg-white/95 backdrop-blur-sm text-slate-900 hover:bg-white border border-slate-200/80 font-semibold px-4 py-3 shadow-sm"
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
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                          {t("block")}
                        </p>
                        <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                      </div>
                      <span className="text-[11px] text-slate-400">
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
                              "flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                              config.className,
                              !item.subtopicId && "cursor-default"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                                {item.code && <span>{item.code}</span>}
                                <div className="h-1 w-1 rounded-full bg-white/30" />
                                <span>{config.label}</span>
                              </div>
                              <Icon className="w-3 h-3" />
                            </div>
                            <p className="text-sm font-medium leading-snug text-slate-900">
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
