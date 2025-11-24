import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Maximize2, Trophy, Swords } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DuelWidgetProps {
  myScore: number;
  opponentScore: number;
  myName: string;
  opponentName: string;
  progress: number;
  totalQuestions: number;
  currentQuestion: number;
  onExpand: () => void;
}

export function DuelWidget({
  myScore,
  opponentScore,
  myName,
  opponentName,
  progress,
  totalQuestions,
  currentQuestion,
  onExpand,
}: DuelWidgetProps) {
  // Truncate long names with ellipsis
  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 2) + '..';
  };

  const displayMyName = truncateName(myName, 10);
  const displayOpponentName = truncateName(opponentName, 10);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
    >
      <Card className="p-4 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/30 shadow-2xl backdrop-blur-xl">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center">
                <Swords className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Дуэль активна</p>
                <p className="text-[10px] text-muted-foreground/70">Вопрос {currentQuestion}/{totalQuestions}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpand}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Scores */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5 truncate" title={myName}>
                {displayMyName}
              </p>
              <motion.p
                key={myScore}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-lg font-black text-primary"
              >
                {myScore}
              </motion.p>
            </div>

            <div className="text-muted-foreground/30 font-bold text-xs">VS</div>

            <div className="flex-1 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5 truncate" title={opponentName}>
                {displayOpponentName}
              </p>
              <motion.p
                key={opponentScore}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-lg font-black text-secondary"
              >
                {opponentScore}
              </motion.p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-bold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Expand Button */}
          <Button
            onClick={onExpand}
            size="sm"
            className="w-full h-8 text-xs font-bold bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
          >
            <Eye className="w-3 h-3 mr-1.5" />
            Развернуть игру
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

