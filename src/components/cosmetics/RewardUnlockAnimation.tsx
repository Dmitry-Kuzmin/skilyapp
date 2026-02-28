import { useEffect, useState } from "react";
import { motion } from "@/components/optimized/Motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Confetti from "react-confetti";

interface RewardUnlockAnimationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: {
    type: "skin" | "badge" | "sticker";
    id: string;
    name_ru: string;
    description_ru?: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    metadata?: {
      color?: string;
      emoji?: string;
      icon?: string;
      effect?: string;
      animated?: boolean;
    };
  };
  onQuickApply?: () => Promise<void> | void;
  isApplying?: boolean;
}

const rarityColors = {
  common: {
    bg: "bg-gray-500/20",
    border: "border-gray-500",
    text: "text-gray-700",
    glow: "shadow-gray-500/50",
  },
  rare: {
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-700",
    glow: "shadow-blue-500/50",
  },
  epic: {
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-700",
    glow: "shadow-blue-500/50",
  },
  legendary: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500",
    text: "text-yellow-700",
    glow: "shadow-yellow-500/50",
  },
};

const rarityLabels = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

const typeIcons = {
  skin: Sparkles,
  badge: Trophy,
  sticker: Smile,
};

const typeLabels = {
  skin: "Скин",
  badge: "Бейдж",
  sticker: "Стикер",
};

export function RewardUnlockAnimation({
  open,
  onOpenChange,
  reward,
  onQuickApply,
  isApplying,
}: RewardUnlockAnimationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      setAnimate(true);

      // Останавливаем конфетти через 5 секунд
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => {
        clearTimeout(confettiTimer);
      };
    } else {
      setShowConfetti(false);
      setAnimate(false);
    }
  }, [open]);

  const TypeIcon = typeIcons[reward.type];
  const rarityStyle = rarityColors[reward.rarity];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 border-0">
        {/* Confetti */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-50">
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={200}
              gravity={0.3}
            />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 p-1 rounded-full hover:bg-muted/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative p-8 flex flex-col items-center text-center space-y-6">
          {/* Background gradient */}
          <div
            className={cn(
              "absolute inset-0 opacity-10",
              rarityStyle.bg
            )}
          />

          {/* Title */}
          <div className="relative z-10 space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              🎉 Награда получена!
            </h2>
            <p className="text-sm text-muted-foreground">
              Вы получили новый {typeLabels[reward.type].toLowerCase()}
            </p>
          </div>

          {/* Reward Display */}
          <div
            className={cn(
              "relative w-48 h-48 rounded-2xl flex items-center justify-center border-4 transition-all duration-500",
              rarityStyle.border,
              rarityStyle.bg,
              animate && "animate-bounce",
              `shadow-2xl ${rarityStyle.glow}`
            )}
          >
            {/* Sparkle effect for legendary */}
            {reward.rarity === "legendary" && (
              <>
                <Sparkles className="absolute top-4 left-4 w-6 h-6 text-yellow-500 animate-spin" />
                <Sparkles className="absolute bottom-4 right-4 w-6 h-6 text-yellow-500 animate-spin" style={{ animationDelay: "0.5s" }} />
              </>
            )}

            {/* Icon or Emoji */}
            {reward.type === "sticker" && reward.metadata?.emoji ? (
              <span className="text-8xl">{reward.metadata.emoji}</span>
            ) : reward.type === "skin" ? (
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Avatar Placeholder */}
                <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/5">
                  <Smile className="w-12 h-12 text-zinc-600" />
                </div>

                {/* Frame Preview */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full border-[6px]",
                    reward.id === 'frame_novice' && "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]",
                    reward.id === 'frame_season_1_premium' && "border-[#C5A059] shadow-[0_0_30px_rgba(197,160,89,0.6)] animate-pulse",
                    !['frame_novice', 'frame_season_1_premium'].includes(reward.id) && "border-primary"
                  )}
                  style={{
                    boxShadow: reward.id === 'frame_season_1_premium'
                      ? '0 0 30px rgba(197,160,89,0.6), inset 0 0 15px rgba(197,160,89,0.4)'
                      : undefined
                  }}
                >
                  {reward.id === 'frame_season_1_premium' && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-[2px] rounded-full border-2 border-dashed border-white/20"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div
                className="text-7xl"
                style={{ color: reward.metadata?.color || "#6366f1" }}
              >
                {reward.metadata?.icon === "trophy" && <Trophy className="w-24 h-24" />}
                {reward.metadata?.icon === "flame" && "🔥"}
                {reward.metadata?.icon === "star" && "⭐"}
                {reward.metadata?.icon === "crown" && "👑"}
                {reward.metadata?.icon === "calendar" && "📅"}
                {!reward.metadata?.icon && <Trophy className="w-24 h-24" />}
              </div>
            )}
          </div>

          {/* Reward Info */}
          <div className="relative z-10 space-y-3 w-full">
            <div className="flex items-center justify-center gap-2">
              <TypeIcon className="w-5 h-5" />
              <h3 className="text-2xl font-bold">{reward.name_ru}</h3>
            </div>

            {reward.description_ru && (
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {reward.description_ru}
              </p>
            )}

            <div className="flex items-center justify-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-sm font-semibold border-2",
                  rarityStyle.border,
                  rarityStyle.text
                )}
              >
                {rarityLabels[reward.rarity]}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {typeLabels[reward.type]}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative z-10 w-full space-y-3">
            {onQuickApply && (
              <Button
                onClick={onQuickApply}
                size="lg"
                variant="secondary"
                className="w-full"
                disabled={isApplying}
              >
                {isApplying ? "Сохраняем..." : "Сделать активным"}
              </Button>
            )}
            <Button
              onClick={() => onOpenChange(false)}
              size="lg"
              className="w-full"
              disabled={isApplying}
            >
              Продолжить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

