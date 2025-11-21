import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Gauge, Thermometer, Droplets, Battery } from "lucide-react";
import Layout from "@/components/Layout";
import { useUserContext } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Landing from "./Landing";
import { usePremium } from "@/hooks/usePremium";
import { useCoins } from "@/hooks/useCoins";
import { PaywallModal } from "@/components/monetization/PaywallModal";
import { useExamReadiness } from "@/hooks/useExamReadiness";
import { SystemBootScreen } from "@/components/cockpit/SystemBootScreen";
import { SpeedometerGauge } from "@/components/cockpit/SpeedometerGauge";
import { FuelGauge } from "@/components/cockpit/FuelGauge";
import { IgnitionButton } from "@/components/cockpit/IgnitionButton";
import { GPSNavigator } from "@/components/cockpit/GPSNavigator";
import { TelemetryPanel } from "@/components/cockpit/TelemetryPanel";

const Index = () => {
  const { isAuthenticated, profileId } = useUserContext();
  const { toast } = useToast();
  const { isPremium, isTrial, daysRemaining } = usePremium();
  const { balance } = useCoins();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBootScreen, setShowBootScreen] = useState(true);
  const [userStats, setUserStats] = useState({
    rank: "Ученик",
    xp: 0,
    nextRankXP: 5000,
    coins: 0,
    boosts: 0,
    testsCompleted: 0,
    accuracy: 0,
    streak: 0,
  });
  const [dailyBonus, setDailyBonus] = useState<any>(null);
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [weeklyRewards, setWeeklyRewards] = useState<any[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  
  // Get exam readiness
  const { readiness: examReadiness, loading: readinessLoading } = useExamReadiness(profileId);
  const examReadinessPercent = examReadiness?.percent || 0;

  useEffect(() => {
    if (isAuthenticated && profileId) {
      loadUserData();
    } else {
      setLoading(false);
      setShowBootScreen(false);
    }
  }, [isAuthenticated, profileId]);

  useEffect(() => {
    if (isTrial && daysRemaining <= 1) {
      setPaywallOpen(true);
    }
  }, [isTrial, daysRemaining]);

  const loadUserData = async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        const profileData = profile as any;
        // Get test sessions
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('user_id', profileData.id);

        const testsCompleted = sessions?.length || 0;
        const totalQuestions = sessions?.reduce((acc: number, s: any) => acc + (s.total_questions || 0), 0) || 0;
        const correctAnswers = sessions?.reduce((acc: number, s: any) => acc + (s.score || 0), 0) || 0;
        const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        setUserStats({
          rank: profileData.rank || "Ученик",
          xp: profileData.xp || 0,
          nextRankXP: 5000,
          coins: profileData.coins || 0,
          boosts: profileData.boosts || 0,
          testsCompleted,
          accuracy,
          streak: profileData.streak_days || 0,
        });

        // Load daily bonus rewards
        const { data: rewards } = await (supabase as any)
          .from('daily_bonus_def')
          .select('*')
          .order('day_number', { ascending: true })
          .limit(90);

        if (rewards) {
          setWeeklyRewards(rewards);
        }

        // Load user daily bonus
        const { data: bonus } = await (supabase as any)
          .from('user_daily_bonus')
          .select('*')
          .eq('user_id', profileData.id)
          .maybeSingle();

        if (bonus) {
          setDailyBonus(bonus);
          setCanClaimBonus(checkCanClaim((bonus as any).last_claimed_date));
        } else {
          const { data: newBonus } = await (supabase as any)
            .from('user_daily_bonus')
            .insert({
              user_id: profileData.id,
              current_streak: 0,
              total_claims: 0,
            })
            .select()
            .single();

          setDailyBonus(newBonus);
          setCanClaimBonus(true);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные пользователя",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCanClaim = (lastClaimedDate: string | null): boolean => {
    if (!lastClaimedDate) return true;
    const today = new Date().toISOString().split('T')[0];
    return lastClaimedDate !== today;
  };

  const handleClaimBonus = async () => {
    if (!dailyBonus || !profileId) return;

    try {
      setClaimingBonus(true);
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let newStreak = 1;
      if (dailyBonus.last_claimed_date === yesterday) {
        newStreak = Math.min((dailyBonus.current_streak || 0) + 1, 90);
      }

      const currentReward = weeklyRewards.find(r => r.day_number === newStreak);
      if (!currentReward) throw new Error('Reward not found');

      await (supabase as any)
        .from('user_daily_bonus')
        .update({
          current_streak: newStreak,
          last_claimed_date: today,
          total_claims: dailyBonus.total_claims + 1,
        })
        .eq('id', dailyBonus.id);

      await supabase.functions.invoke('coins-earn', {
        body: { user_id: profileId, reward_type: 'daily_login' },
      });

      await supabase.functions.invoke('season-sp', {
        body: { 
          user_id: profileId, 
          source_type: 'daily_login',
          metadata: { streak_days: newStreak }
        },
      });

      setDailyBonus({
        ...dailyBonus,
        current_streak: newStreak,
        last_claimed_date: today,
        total_claims: dailyBonus.total_claims + 1,
      });

      setUserStats({
        ...userStats,
        coins: userStats.coins + currentReward.reward.coins,
      });

      setCanClaimBonus(false);

      toast({
        title: "🎉 Награда получена!",
        description: `+${currentReward.reward.xp} XP${currentReward.reward.coins > 0 ? `, +${currentReward.reward.coins} монет` : ""}`,
      });
    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось получить награду",
        variant: "destructive",
      });
    } finally {
      setClaimingBonus(false);
    }
  };

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Show boot screen first
  if (showBootScreen) {
    return (
      <SystemBootScreen
        onComplete={() => {
          setShowBootScreen(false);
        }}
      />
    );
  }

  // Calculate fuel gauge value (current streak / 90 days)
  const fuelValue = dailyBonus ? (dailyBonus.current_streak / 90) * 100 : 0;
  const currentStreak = dailyBonus?.current_streak || 0;

  // Calculate completed days for GPS Navigator
  const completedDays: number[] = dailyBonus && dailyBonus.current_streak > 0
    ? Array.from({ length: dailyBonus.current_streak }, (_, i) => i + 1)
    : [];

  // Telemetry items
  const telemetryItems = [
    {
      icon: <Gauge className="w-6 h-6" />,
      label: "RPM",
      value: userStats.testsCompleted,
      unit: "",
      color: "blue" as const,
    },
    {
      icon: <Thermometer className="w-6 h-6" />,
      label: "TEMP",
      value: userStats.accuracy,
      unit: "%",
      color: (userStats.accuracy >= 80 ? "green" : userStats.accuracy >= 60 ? "orange" : "orange") as "blue" | "orange" | "green" | "yellow",
    },
    {
      icon: <Droplets className="w-6 h-6" />,
      label: "OIL",
      value: userStats.rank,
      unit: "",
      color: "yellow" as const,
    },
    {
      icon: <Battery className="w-6 h-6" />,
      label: "BAT",
      value: userStats.coins,
      unit: "",
      color: "green" as const,
    },
  ];

  return (
    <>
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black text-white">
          {/* Grid pattern overlay */}
          <div
            className="fixed inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
            }}
          />

          {/* Scanning lines effect */}
          <motion.div
            animate={{
              y: ["0%", "100%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            className="fixed inset-0 opacity-5 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.5), transparent)",
              height: "2px",
            }}
          />

          <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-8">
            {/* Top Status Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between p-4 rounded-lg border border-cyan-500/30 bg-black/50 backdrop-blur-xl font-mono text-sm"
            >
              <div className="flex items-center gap-4">
                <div className="text-cyan-400">SKILY</div>
                <div className="h-4 w-px bg-cyan-500/30" />
                <div className="text-gray-400">SYSTEM ONLINE</div>
              </div>
              <div className="flex items-center gap-4">
                {isPremium && (
                  <>
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Crown className="w-4 h-4" />
                      <span>PREMIUM</span>
                    </div>
                    <div className="h-4 w-px bg-cyan-500/30" />
                  </>
                )}
                <div className="text-green-400">● ACTIVE</div>
              </div>
            </motion.div>

            {/* Main Cockpit */}
            <div className="space-y-6 md:space-y-8">
              {/* Gauges Row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
              >
                {/* Speedometer - Exam Readiness */}
                <div className="flex justify-center">
                  <SpeedometerGauge
                    value={examReadinessPercent}
                    label="Вероятность сдачи"
                    unit="%"
                    size={280}
                    color={
                      examReadinessPercent >= 80
                        ? "success"
                        : examReadinessPercent >= 60
                        ? "warning"
                        : "danger"
                    }
                  />
                </div>

                {/* Fuel Gauge - Daily Streak */}
                <div className="flex justify-center">
                  <FuelGauge
                    value={fuelValue}
                    currentStreak={currentStreak}
                    maxStreak={90}
                    size={280}
                  />
                </div>
              </motion.div>

              {/* Ignition Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="flex justify-center px-4"
              >
                <div className="w-full max-w-md">
                  <IgnitionButton
                    onClick={() => navigate('/tests')}
                    disabled={loading || readinessLoading}
                  />
                </div>
              </motion.div>

              {/* GPS Navigator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <GPSNavigator
                  currentDay={currentStreak}
                  maxDays={90}
                  completedDays={completedDays}
                  rewards={weeklyRewards}
                />
              </motion.div>

              {/* Telemetry Panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <TelemetryPanel items={telemetryItems} />
              </motion.div>

              {/* Daily Bonus Claim (if available) */}
              {canClaimBonus && dailyBonus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="p-4 rounded-lg border-2 border-green-500/30 bg-black/50 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono">
                      <div className="text-green-400 text-sm uppercase tracking-wider mb-1">
                        Ежедневный бонус доступен
                      </div>
                      <div className="text-gray-400 text-xs">
                        Серия: {currentStreak} дней
                      </div>
                    </div>
                    <button
                      onClick={handleClaimBonus}
                      disabled={claimingBonus}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-mono font-bold uppercase tracking-wider hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50"
                    >
                      {claimingBonus ? "Получение..." : "Получить"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Corner accents */}
          <div className="fixed top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cyan-500/20 pointer-events-none" />
          <div className="fixed top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-cyan-500/20 pointer-events-none" />
          <div className="fixed bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-cyan-500/20 pointer-events-none" />
          <div className="fixed bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-cyan-500/20 pointer-events-none" />
        </div>
      </Layout>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
};

export default Index;
