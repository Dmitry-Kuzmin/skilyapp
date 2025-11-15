import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { Crown, Coins, Sparkles, Gift, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface PremiumRewardUpsellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: {
    level: number;
    premium_reward: {
      type: string;
      amount?: number;
      id?: string;
    };
  };
  onGetPremium: () => void;
}

const rewardIcons = {
  coins: Coins,
  boost: Zap,
  skin: Gift,
  badge: Sparkles,
  sticker: Sparkles,
};

const rewardLabels = {
  coins: "монет",
  boost: "буст",
  skin: "скин",
  badge: "бейдж",
  sticker: "стикер",
};

export function PremiumRewardUpsell({
  open,
  onOpenChange,
  reward,
  onGetPremium,
}: PremiumRewardUpsellProps) {
  const Icon = rewardIcons[reward.premium_reward.type as keyof typeof rewardIcons] || Gift;
  const label = rewardLabels[reward.premium_reward.type as keyof typeof rewardLabels] || "награда";
  const [rewardName, setRewardName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Загружаем красивое название для косметики
  useEffect(() => {
    const loadRewardName = async () => {
      if (!reward.premium_reward.id || reward.premium_reward.type === "coins") {
        setRewardName(null);
        return;
      }

      setLoading(true);
      try {
        const tableName = 
          reward.premium_reward.type === "skin" ? "skin_definitions" :
          reward.premium_reward.type === "badge" ? "badge_definitions" :
          reward.premium_reward.type === "sticker" ? "sticker_definitions" :
          reward.premium_reward.type === "boost" ? "boost_definitions" : null;

        if (!tableName) {
          setRewardName(null);
          return;
        }

        const { data } = await supabase
          .from(tableName)
          .select("name_ru")
          .eq("id", reward.premium_reward.id)
          .single();

        if (data?.name_ru) {
          setRewardName(data.name_ru);
        }
      } catch (error) {
        console.error("Error loading reward name:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadRewardName();
    }
  }, [open, reward.premium_reward.id, reward.premium_reward.type]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0 border-2 border-yellow-500/30">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-amber-500/10" />
        
        <div className="relative z-10 p-6 space-y-4">
          {/* Header with Lumi */}
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
              >
                <LumiCharacter size="lg" mood="encouraging" animate />
              </motion.div>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2"
              >
                <Crown className="w-6 h-6 text-yellow-500" />
                <DialogTitle className="text-xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  Премиум награда!
                </DialogTitle>
              </motion.div>
            </div>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Уровень {reward.level}
            </DialogDescription>
          </DialogHeader>

          {/* Reward preview */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border-2 border-yellow-500/40"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground">Вы получите:</p>
                <p className="text-2xl font-black text-yellow-700 dark:text-yellow-500">
                  {reward.premium_reward.type === "coins" && reward.premium_reward.amount ? (
                    `+${reward.premium_reward.amount} ${label}`
                  ) : loading ? (
                    "Загрузка..."
                  ) : rewardName ? (
                    rewardName
                  ) : reward.premium_reward.id ? (
                    `Эксклюзивный ${label}`
                  ) : (
                    `Эксклюзивный ${label}`
                  )}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Lumi message */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card/50 rounded-lg p-3 border border-border/50"
          >
            <div className="flex items-start gap-2">
              <LumiCharacter size="sm" mood="happy" className="flex-shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                С Premium подпиской вы получаете <strong className="text-foreground">эксклюзивные награды</strong> на каждом уровне и <strong className="text-foreground">+20% к Season Points</strong>!
              </p>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => {
                onGetPremium();
                onOpenChange(false);
              }}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold h-11 shadow-lg"
            >
              <Crown className="w-4 h-4 mr-2" />
              Получить Premium
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Может быть позже
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

