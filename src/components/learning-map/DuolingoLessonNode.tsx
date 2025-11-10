import { Star, Lock, Trophy, Dumbbell, CheckCircle2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Subtopic } from "@/utils/materialApi";
import { Card } from "@/components/ui/card";

interface LessonNodeProps {
  subtopic: Subtopic;
  lessonIndex: number;
  isUnlocked: boolean;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  align: "left" | "right";
}

export const LessonNode = ({
  subtopic,
  lessonIndex,
  isUnlocked,
  isActive,
  isCompleted,
  onClick,
  align,
}: LessonNodeProps) => {
  const getIcon = () => {
    if (subtopic.type === "test") return <Trophy className="w-7 h-7" />;
    if (subtopic.type === "terms") return <BookOpen className="w-7 h-7" />;
    return <Star className="w-7 h-7" />; // material
  };

  const getNodeStyle = () => {
    if (!isUnlocked) return "bg-gray-300 text-gray-500 cursor-not-allowed border-4 border-gray-200";
    if (isCompleted) return "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white cursor-pointer hover:scale-110 shadow-xl border-4 border-yellow-300";
    if (isActive) return "bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:scale-110 ring-4 ring-blue-300 shadow-xl border-4 border-blue-400";
    return "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 cursor-pointer hover:scale-105 border-4 border-gray-300 shadow-lg";
  };

  const getCardStyle = () => {
    if (!isUnlocked) return "bg-gray-50 border-gray-200";
    if (isCompleted) return "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-md";
    if (isActive) return "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 shadow-lg ring-2 ring-blue-200";
    return "bg-white border-gray-200 shadow-sm hover:shadow-md";
  };

  return (
    <div className="relative">
      {/* Start label for first lesson */}
      {lessonIndex === 0 && isActive && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
          <span className="px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg">
            Начать
          </span>
        </div>
      )}
      
      <div className={cn("flex items-center gap-6", align === "right" && "flex-row-reverse")}>
        {/* Info Card */}
        <Card className={cn(
          "flex-1 p-4 transition-all duration-300",
          getCardStyle(),
          align === "right" ? "text-right" : "text-left"
        )}>
          <div className="flex items-center gap-3" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
            <div className="flex-shrink-0">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                !isUnlocked && "bg-gray-200",
                isCompleted && "bg-gradient-to-br from-yellow-400 to-orange-400",
                isActive && "bg-gradient-to-br from-blue-400 to-cyan-400",
                !isCompleted && !isActive && isUnlocked && "bg-gradient-to-br from-gray-200 to-gray-300"
              )}>
                {subtopic.type === "material" && <BookOpen className="w-6 h-6 text-white" />}
                {subtopic.type === "test" && <Trophy className="w-6 h-6 text-white" />}
                {subtopic.type === "terms" && <Dumbbell className="w-6 h-6 text-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground truncate">{subtopic.title_ru}</p>
              <p className="text-sm text-muted-foreground truncate">
                {subtopic.type === "material" ? "Материал" : subtopic.type === "test" ? "Тест" : "Термины"}
              </p>
            </div>
          </div>
        </Card>
        
        {/* Lesson node button */}
        <button
          onClick={onClick}
          disabled={!isUnlocked}
          className={cn(
            "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0",
            getNodeStyle()
          )}
        >
          {!isUnlocked && <Lock className="w-8 h-8" />}
          {isUnlocked && !isCompleted && getIcon()}
          {isCompleted && <CheckCircle2 className="w-10 h-10" />}
          
          {isActive && (
            <>
              <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-pulse" />
              <div className="absolute -inset-2 rounded-full border-4 border-blue-400/40 animate-ping" style={{ animationDuration: "2s" }} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

