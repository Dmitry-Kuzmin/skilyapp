import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { usePremium } from "@/hooks/usePremium";
import { Loader2 } from "lucide-react";

type Reward = {
  level: number;
  xp_required: number;
  free_reward: { type: string; amount?: number; id?: string };
  premium_reward: { type: string; amount?: number; id?: string };
};

export function DuelPassProgress() {
  const { profileId } = useUserContext();
  const { isPremium } = usePremium();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [profile, setProfile] = useState<{ duel_pass_level: number; duel_pass_xp: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!profileId) return;
      setLoading(true);
      const [{ data: rewardData }, { data: profileData }] = await Promise.all([
        supabase.from("duel_pass_rewards").select("*").order("level", { ascending: true }),
        supabase.from("profiles").select("duel_pass_level, duel_pass_xp").eq("id", profileId).single(),
      ]);
      if (rewardData) setRewards(rewardData as Reward[]);
      if (profileData) setProfile(profileData);
      setLoading(false);
    };
    loadData();
  }, [profileId]);

  const claimReward = async (level: number) => {
    if (!profileId) return;
    setClaimingLevel(level);
    try {
      const { error } = await supabase.functions.invoke("duel-pass-claim", {
        body: { user_id: profileId, level, is_premium: isPremium },
      });
      if (!error) {
        // Optionally refresh profile state
      }
    } catch (err) {
      console.error("[DuelPassProgress] claim error", err);
    } finally {
      setClaimingLevel(null);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalLevels = rewards.length || 10;
  const progressPercent = Math.min((profile.duel_pass_level / totalLevels) * 100, 100);

  return (
    <div className="rounded-2xl border p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Duel Pass</h3>
          <p className="text-sm text-muted-foreground">
            Уровень {profile.duel_pass_level} · XP: {profile.duel_pass_xp}
          </p>
        </div>
        <span className="text-sm font-medium">{progressPercent.toFixed(0)}%</span>
      </div>
      <Progress value={progressPercent} />

      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {rewards.map((reward) => {
          const unlocked = profile.duel_pass_level >= reward.level;
          return (
            <div
              key={reward.level}
              className={`rounded-xl border p-3 flex items-center justify-between ${
                unlocked ? "border-green-300 bg-green-50" : ""
              }`}
            >
              <div>
                <p className="text-sm font-semibold">Уровень {reward.level}</p>
                <p className="text-xs text-muted-foreground">
                  +{reward.xp_required} XP · Бесплатно: {reward.free_reward.type}
                  {reward.free_reward.amount ? ` (+${reward.free_reward.amount})` : ""}
                </p>
                {isPremium && (
                  <p className="text-xs text-yellow-700">
                    Premium: {reward.premium_reward.type}
                    {reward.premium_reward.amount ? ` (+${reward.premium_reward.amount})` : ""}
                  </p>
                )}
              </div>
              {unlocked && (
                <Button
                  size="sm"
                  onClick={() => claimReward(reward.level)}
                  disabled={claimingLevel === reward.level}
                >
                  {claimingLevel === reward.level ? "..." : "Забрать"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


