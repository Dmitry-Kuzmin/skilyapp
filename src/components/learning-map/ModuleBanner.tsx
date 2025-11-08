import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topic } from "./TopicCard";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-r from-[#FF6B9D] to-[#C44569] text-white rounded-xl px-6 py-4 flex items-center justify-between shadow-lg border-2 border-white/20 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <motion.div
          whileHover={{ x: -3 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <ArrowLeft className="w-5 h-5 flex-shrink-0 cursor-pointer" />
        </motion.div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span className="font-bold text-lg whitespace-nowrap">
            МОДУЛЬ {moduleNumber}, РАЗДЕЛ {sectionNumber}
          </span>
          <span className="text-base font-medium hidden lg:inline truncate">
            {topicTitle}
          </span>
        </div>
      </div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/20 hover:bg-white/30 text-white border-white/30 flex-shrink-0 shadow-md"
          onClick={onHandbookClick}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">СПРАВОЧНИК</span>
          <span className="sm:hidden">📖</span>
        </Button>
      </motion.div>
    </motion.div>
  );
};

