import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topic } from "./TopicCard";

interface ModuleBannerProps {
  moduleNumber: number;
  sectionNumber: number;
  topicTitle: string;
  onHandbookClick?: () => void;
  className?: string;
}

export const ModuleBanner = ({
  moduleNumber,
  sectionNumber,
  topicTitle,
  onHandbookClick,
  className,
}: ModuleBannerProps) => {
  return (
    <div
      className={`bg-[#58CC02] text-white rounded-lg px-6 py-4 flex items-center justify-between shadow-md ${className}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ArrowLeft className="w-5 h-5 flex-shrink-0" />
        <span className="font-bold text-lg whitespace-nowrap">
          МОДУЛЬ {moduleNumber}, РАЗДЕЛ {sectionNumber}
        </span>
        <span className="text-base font-medium hidden lg:inline truncate ml-2">
          {topicTitle}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="bg-white/20 hover:bg-white/30 text-white border-white/30 flex-shrink-0"
        onClick={onHandbookClick}
      >
        <BookOpen className="w-4 h-4 mr-2" />
        СПРАВОЧНИК
      </Button>
    </div>
  );
};

