import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import DailyBonusCard from "@/components/DailyBonusCard";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import RankProgress from "@/components/RankProgress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

interface DailyBonusDef {
  day_number: number;
  reward: {
    xp: number;
    coins: number;
    badge?: string;
  };
  description: string;
}

interface UserDailyBonus {
  id: string;
  user_id: string;
  current_streak: number;
  last_claimed_date: string | null;
  total_claims: number;
}

const DailyBonus = () => {
  const [loading, setLoading] = useState(true);
  const [weeklyRewards, setWeeklyRewards] = useState<DailyBonusDef[]>([]);
  const [userBonus, setUserBonus] = useState<UserDailyBonus | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userStats, setUserStats] = useState({
    xp: 0,
    coins: 0,
    rank: "Ученик",
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, xp, coins, rank")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast({
          title: "Ошибка",
          description: "Профиль не найден",
          variant: "destructive",
        });
        return;
      }

      setProfileId(profile.id);
      setUserStats({
        xp: profile.xp,
        coins: profile.coins,
        rank: profile.rank,
      });

      // Load weekly rewards definitions
      const { data: rewards } = await (supabase as any)
        .from("daily_bonus_def")
        .select("*")
        .order("day_number", { ascending: true });

      if (rewards) {
        setWeeklyRewards(rewards as DailyBonusDef[]);
      }

      // Load user's bonus progress
      const { data: bonus } = await (supabase as any)
        .from("user_daily_bonus")
        .select("*")
        .eq("user_id", profile.id)
        .single();

      if (bonus) {
        setUserBonus(bonus as UserDailyBonus);
        setCanClaim(checkCanClaim(bonus.last_claimed_date));
      } else {
        // Create initial record
        const { data: newBonus } = await (supabase as any)
          .from("user_daily_bonus")
          .insert({
            user_id: profile.id,
            current_streak: 0,
            total_claims: 0,
          })
          .select()
          .single();

        setUserBonus(newBonus as UserDailyBonus);
        setCanClaim(true);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCanClaim = (lastClaimedDate: string | null): boolean => {
    if (!lastClaimedDate) return true;
    
    const today = new Date().toISOString().split("T")[0];
    return lastClaimedDate !== today;
  };

  const handleClaimBonus = async () => {
    if (!userBonus || !profileId) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      
      // Calculate new streak
      let newStreak = 1;
      if (userBonus.last_claimed_date === yesterday) {
        newStreak = (userBonus.current_streak % 7) + 1;
      }

      // Get reward for current day
      const currentReward = weeklyRewards.find(r => r.day_number === newStreak);
      if (!currentReward) {
        throw new Error("Reward not found");
      }

      // Update user_daily_bonus
      const { error: bonusError } = await (supabase as any)
        .from("user_daily_bonus")
        .update({
          current_streak: newStreak,
          last_claimed_date: today,
          total_claims: userBonus.total_claims + 1,
        })
        .eq("id", userBonus.id);

      if (bonusError) throw bonusError;

      // Update user profile with rewards
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          xp: userStats.xp + currentReward.reward.xp,
          coins: userStats.coins + currentReward.reward.coins,
        })
        .eq("id", profileId);

      if (profileError) throw profileError;

      // Update local state
      setUserBonus({
        ...userBonus,
        current_streak: newStreak,
        last_claimed_date: today,
        total_claims: userBonus.total_claims + 1,
      });

      setUserStats({
        ...userStats,
        xp: userStats.xp + currentReward.reward.xp,
        coins: userStats.coins + currentReward.reward.coins,
      });

      setCanClaim(false);

      toast({
        title: "🎉 Награда получена!",
        description: `+${currentReward.reward.xp} XP${currentReward.reward.coins > 0 ? `, +${currentReward.reward.coins} монет` : ""}`,
      });

      // Show special message for 7-day streak
      if (newStreak === 7) {
        setTimeout(() => {
          toast({
            title: "🏆 Недельный герой!",
            description: "Ты завершил недельную серию! Так держать!",
            duration: 5000,
          });
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error claiming bonus:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить награду",
        variant: "destructive",
      });
    }
  };

  const getTodayReward = (): DailyBonusDef["reward"] => {
    if (!userBonus || weeklyRewards.length === 0) {
      return { xp: 0, coins: 0 };
    }

    const nextDay = canClaim
      ? (userBonus.current_streak % 7) + 1
      : userBonus.current_streak || 1;
    
    const reward = weeklyRewards.find(r => r.day_number === nextDay);
    return reward?.reward || { xp: 0, coins: 0 };
  };

  const getTodayDescription = (): string => {
    if (!userBonus || weeklyRewards.length === 0) {
      return "Загрузка...";
    }

    const nextDay = canClaim
      ? (userBonus.current_streak % 7) + 1
      : userBonus.current_streak || 1;
    
    const reward = weeklyRewards.find(r => r.day_number === nextDay);
    return reward?.description || "";
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 pb-20 md:pb-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 pb-20 md:pb-4">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Ежедневный бонус
            </h1>
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Заходи каждый день, чтобы забрать награду! Чем длиннее серия — тем ценнее призы 🎁
          </p>
        </div>

        {/* User progress */}
        <RankProgress
          currentRank={userStats.rank}
          currentXP={userStats.xp}
          nextRankXP={1000}
          coins={userStats.coins}
        />

        {/* Daily bonus claim */}
        <DailyBonusCard
          currentStreak={userBonus?.current_streak || 0}
          canClaim={canClaim}
          todayReward={getTodayReward()}
          description={getTodayDescription()}
          onClaim={handleClaimBonus}
        />

        {/* Weekly calendar */}
        <WeeklyCalendar
          currentStreak={userBonus?.current_streak || 0}
          weeklyRewards={weeklyRewards}
        />
      </div>
    </Layout>
  );
};

export default DailyBonus;
