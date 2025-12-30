import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { useModalRoute } from "@/hooks/useModalRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Crown, Award, Star, Coins, Sparkles, Gem } from "lucide-react";
import { motion } from "@/components/optimized/Motion";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";

interface LeaderboardRewardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonId: number;
  position: number;
}

interface Reward {
  type: "skin" | "badge" | "frame" | "title" | "coins" | "aura";
  data: any;
  description_ru?: string;
  is_exclusive?: boolean;
}

export function LeaderboardRewardsModal({
  open,
  onOpenChange,
  seasonId,
  position,
}: LeaderboardRewardsModalProps) {
  const route = useModalRoute('leaderboard-rewards');
  const isOpen = open || route.isOpen;
  const handleOpenChange = (state: boolean) => {
    if (onOpenChange) onOpenChange(state);
    if (state) {
      route.openModal();
    } else {
      route.closeModal();
    }
  };
  const { profileId } = useUserContext();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && seasonId && position) {
      loadRewards();
    }
  }, [isOpen, seasonId, position]);

  const loadRewards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leaderboard_season_rewards")
        .select("*")
        .eq("season_id", seasonId)
        .eq("position", position)
        .order("reward_type");

      if (error) throw error;

      setRewards(data || []);
    } catch (error) {
      console.error("[LeaderboardRewardsModal] Error loading rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "skin":
        return <Sparkles className="w-5 h-5" />;
      case "badge":
        return <Award className="w-5 h-5" />;
      case "frame":
        return <Gem className="w-5 h-5" />;
      case "title":
        return <Crown className="w-5 h-5" />;
      case "coins":
        return <Coins className="w-5 h-5" />;
      case "aura":
        return <Star className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
    }
  };

  const getRewardColor = (type: string, position: number) => {
    if (position === 1) {
      return "from-yellow-500/20 via-amber-500/20 to-yellow-600/20 border-yellow-500/40";
    } else if (position === 2) {
      return "from-gray-300/20 via-gray-200/20 to-gray-300/20 border-gray-300/40";
    } else if (position === 3) {
      return "from-orange-500/20 via-amber-500/20 to-orange-600/20 border-orange-500/40";
    }
    return "from-blue-500/20 via-cyan-500/20 to-blue-600/20 border-blue-500/40";
  };

  const positionLabels = {
    1: { label: "Чемпион", emoji: "🏆", color: "text-yellow-600" },
    2: { label: "Серебряный призёр", emoji: "🥈", color: "text-gray-600" },
    3: { label: "Бронзовый финалист", emoji: "🥉", color: "text-orange-600" },
  };

  const positionLabel = positionLabels[position as keyof typeof positionLabels] || {
    label: "Элита топ-10",
    emoji: "⭐",
    color: "text-blue-600",
  };

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={positionLabel.label}
      showTitleBar={false}
      className="max-w-2xl max-h-[90vh] overflow-hidden"
      loading={loading && rewards.length === 0}
      skeletonVariant="default"
      modalRouteKey="leaderboard-rewards"
    >
      <div className="overflow-y-auto max-h-[90vh] px-4">
        <div className="flex items-center gap-3 py-4 border-b border-border/40">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="text-4xl"
            >
              {positionLabel.emoji}
            </motion.div>
            <div>
            <h2 className="text-2xl font-black">
                {positionLabel.label}
            </h2>
            <p className="text-base text-muted-foreground">
                Поздравляем! Вы заняли {position} место в сезоне!
            </p>
          </div>
          </div>

        {rewards.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Призы не найдены
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {rewards.map((reward, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={cn(
                    "p-4 border-2 bg-gradient-to-r",
                    getRewardColor(reward.type, position),
                    reward.is_exclusive && "ring-2 ring-yellow-400/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "rounded-lg p-3 bg-background/80",
                        position === 1 && "bg-yellow-500/20",
                        position === 2 && "bg-gray-300/20",
                        position === 3 && "bg-orange-500/20"
                      )}
                    >
                      {getRewardIcon(reward.type)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg capitalize">
                          {reward.type === "skin" && "Скин"}
                          {reward.type === "badge" && "Бейдж"}
                          {reward.type === "frame" && "Рамка"}
                          {reward.type === "title" && "Титул"}
                          {reward.type === "coins" && "Монеты"}
                          {reward.type === "aura" && "Аура"}
                        </h3>
                        {reward.is_exclusive && (
                          <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500/50 text-yellow-700">
                            Эксклюзив
                          </Badge>
                        )}
                      </div>
                      {reward.description_ru && (
                        <p className="text-sm text-muted-foreground">
                          {reward.description_ru}
                        </p>
                      )}
                      {reward.type === "coins" && reward.data.amount && (
                        <div className="flex items-center gap-2 text-lg font-bold text-yellow-600">
                          <Coins className="w-5 h-5" />
                          +{reward.data.amount} монет
                        </div>
                      )}
                      {reward.type === "aura" && reward.data && (
                        <div className="text-sm">
                          <Badge variant="outline">
                            Интенсивность: {reward.data.intensity === "high" ? "Высокая" : reward.data.intensity === "medium" ? "Средняя" : "Низкая"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Закрыть
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Понятно
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}

