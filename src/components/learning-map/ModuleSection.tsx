import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleSectionProps {
  moduleNumber: number;
  title?: string;
  progress?: {
    completed: number;
    total: number;
  };
  children: ReactNode;
  className?: string;
  onShowAll?: () => void;
}

export const ModuleSection = ({
  moduleNumber,
  title,
  progress,
  children,
  className,
  onShowAll,
}: ModuleSectionProps) => {
  const progressPercent = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок модуля */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                Модуль {moduleNumber}
              </h2>
              {title && (
                <span className="text-sm text-gray-500 font-medium">
                  {title}
                </span>
              )}
            </div>
            {progress && (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold">
                    {progress.completed}/{progress.total}
                  </span>
                  <span>тем завершено</span>
                </div>
                <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {progressPercent}%
                </span>
              </div>
            )}
          </div>
        </div>
        {onShowAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowAll}
            className="text-gray-600 hover:text-gray-900"
          >
            Показать все
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Разделитель */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      {/* Карточки тем */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
        {children}
      </div>
    </div>
  );
};

