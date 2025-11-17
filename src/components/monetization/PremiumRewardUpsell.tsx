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
  const [rewardData, setRewardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Загружаем полные данные косметики для превью
  useEffect(() => {
    const loadRewardData = async () => {
      if (!reward.premium_reward.id || reward.premium_reward.type === "coins") {
        setRewardData(null);
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
          setRewardData(null);
          return;
        }

        const { data } = await supabase
          .from(tableName)
          .select("*")
          .eq("id", reward.premium_reward.id)
          .single();

        if (data) {
          setRewardData(data);
        }
      } catch (error) {
        console.error("Error loading reward data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadRewardData();
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

          {/* Reward preview with visual */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            {/* Visual preview */}
            {loading ? (
              <div className="flex items-center justify-center h-32 bg-muted/30 rounded-xl">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Загрузка превью...</p>
                </div>
              </div>
            ) : rewardData ? (
              <div className="relative bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border-2 border-yellow-500/30 overflow-hidden">
                {/* Sparkle effects for legendary */}
                {rewardData.rarity === "legendary" && (
                  <>
                    <Sparkles className="absolute top-3 left-3 w-5 h-5 text-yellow-500 animate-spin" />
                    <Sparkles className="absolute bottom-3 right-3 w-5 h-5 text-yellow-500 animate-spin" style={{ animationDelay: "0.5s" }} />
                  </>
                )}

                {/* Preview based on type */}
                <div className="flex flex-col items-center gap-3">
                  {reward.premium_reward.type === "skin" && (
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl"
                      style={{
                        background: rewardData.metadata?.color || "#6366f1",
                      }}
                    >
                      {rewardData.name_ru?.charAt(0) || "S"}
                    </div>
                  )}
                  
                  {reward.premium_reward.type === "badge" && (
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl"
                      style={{
                        background: `${rewardData.metadata?.color || "#6366f1"}20`,
                      }}
                    >
                      {rewardData.metadata?.icon === "trophy" && "🏆"}
                      {rewardData.metadata?.icon === "flame" && "🔥"}
                      {rewardData.metadata?.icon === "star" && "⭐"}
                      {rewardData.metadata?.icon === "crown" && "👑"}
                      {rewardData.metadata?.icon === "calendar" && "📅"}
                      {!rewardData.metadata?.icon && "🏆"}
                    </div>
                  )}
                  
                  {reward.premium_reward.type === "sticker" && (
                    <div className="w-24 h-24 rounded-xl flex items-center justify-center text-6xl bg-muted/30 shadow-2xl">
                      {rewardData.metadata?.emoji || "😊"}
                    </div>
                  )}
                  
                  {reward.premium_reward.type === "boost" && (
                    <div className="w-24 h-24 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-500 shadow-2xl">
                      <Zap className="w-12 h-12 text-white" />
                    </div>
                  )}
                  
                  {/* Name and description */}
                  <div className="text-center space-y-1">
                    <h3 className="text-2xl font-black text-yellow-700 dark:text-yellow-500">
                      {rewardData.name_ru}
                    </h3>
                    {rewardData.description_ru && (
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {rewardData.description_ru}
                      </p>
                    )}
                    {/* Rarity badge */}
                    {rewardData.rarity && (
                      <div className="flex items-center justify-center gap-1 pt-1">
                        <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          rewardData.rarity === "legendary" ? "bg-yellow-500/20 text-yellow-700 border border-yellow-500/30" :
                          rewardData.rarity === "epic" ? "bg-blue-500/20 text-blue-700 border border-blue-500/30" :
                          rewardData.rarity === "rare" ? "bg-blue-500/20 text-blue-700 border border-blue-500/30" :
                          "bg-gray-500/20 text-gray-700 border border-gray-500/30"
                        }`}>
                          {rewardData.rarity === "legendary" ? "Легендарный" :
                           rewardData.rarity === "epic" ? "Эпический" :
                           rewardData.rarity === "rare" ? "Редкий" : "Обычный"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border-2 border-yellow-500/40">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-muted-foreground">Вы получите:</p>
                    <p className="text-2xl font-black text-yellow-700 dark:text-yellow-500">
                      {reward.premium_reward.type === "coins" && reward.premium_reward.amount
                        ? `+${reward.premium_reward.amount} ${label}`
                        : `Эксклюзивный ${label}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
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

