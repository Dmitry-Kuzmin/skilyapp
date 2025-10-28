import { useEffect, useState } from "react";
import { Trophy, Star, Zap, Target, Award, Crown, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import AchievementCard from "@/components/AchievementCard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface AchievementDef {
  id: string;
  title: { ru: string; en: string };
  description: { ru: string; en: string };
  reward: { xp?: number; coins?: number; badge?: string };
  type: string;
  progress_target: number;
  icon: string;
  category: string;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked: boolean;
  progress: number;
  status: string;
  unlocked_at?: string;
}

const Achievements = () => {
  const [achievementDefs, setAchievementDefs] = useState<AchievementDef[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      // Load achievement definitions
      const { data: defsData, error: defsError } = await supabase
        .from("achievement_def")
        .select("*");

      if (defsError) throw defsError;

      // Load user achievements
      const { data: userAchData, error: userAchError } = await supabase
        .from("user_achievement")
        .select("*");

      if (userAchError) throw userAchError;

      setAchievementDefs(defsData || []);
      setUserAchievements(userAchData || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить достижения",
        variant: "destructive",
      });
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  // Combine achievement definitions with user progress
  const combinedAchievements = achievementDefs.map(def => {
    const userAch = userAchievements.find(ua => ua.achievement_id === def.id);
    return {
      ...def,
      unlocked: userAch?.unlocked || false,
      progress: userAch?.progress || 0,
      unlocked_at: userAch?.unlocked_at,
    };
  });

  const unlockedCount = combinedAchievements.filter(a => a.unlocked).length;
  const totalCount = combinedAchievements.length;
  const completionPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const categoryIcons: Record<string, any> = {
    beginner: Star,
    master: Crown,
    streak: Zap,
    accuracy: Target,
    games: Trophy,
    learning: Award,
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
          <div className="text-center space-y-2">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Достижения
            </h1>
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Отслеживайте свой прогресс и открывайте новые награды
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="p-5 md:p-6 bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/20 shadow-lg">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
                  <Trophy className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold">Общий прогресс</h3>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {unlockedCount} из {totalCount} достижений
                  </p>
                </div>
              </div>
              <div className="text-4xl md:text-5xl font-bold text-primary tabular-nums">
                {Math.round(completionPercent)}%
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={completionPercent} className="h-3" />
              <p className="text-xs text-muted-foreground text-right">
                {totalCount - unlockedCount} {totalCount - unlockedCount === 1 ? 'достижение' : 'достижений'} осталось
              </p>
            </div>
          </div>
        </Card>

        {/* Achievements Grid by Category */}
        <div className="space-y-8">
          {Object.entries(
            combinedAchievements.reduce((acc, achievement) => {
              const cat = achievement.category || 'other';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(achievement);
              return acc;
            }, {} as Record<string, typeof combinedAchievements[0][]>)
          ).map(([category, categoryAchievements]) => {
            const Icon = categoryIcons[category] || Trophy;
            const categoryUnlocked = categoryAchievements.filter(a => a.unlocked).length;
            const categoryPercent = categoryAchievements.length > 0 
              ? (categoryUnlocked / categoryAchievements.length) * 100 
              : 0;

            // Sort: unlocked first, then by progress
            const sortedAchievements = [...categoryAchievements].sort((a, b) => {
              if (a.unlocked && !b.unlocked) return -1;
              if (!a.unlocked && b.unlocked) return 1;
              if (!a.unlocked && !b.unlocked) {
                const aPercent = (a.progress / a.progress_target) * 100;
                const bPercent = (b.progress / b.progress_target) * 100;
                return bPercent - aPercent;
              }
              return 0;
            });
            
            return (
              <div key={category} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b-2 border-border/50">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary" strokeWidth={2.5} />
                    <h2 className="text-xl md:text-2xl font-bold capitalize">
                      {category === 'beginner' && 'Новичок'}
                      {category === 'master' && 'Мастер'}
                      {category === 'streak' && 'Серия'}
                      {category === 'accuracy' && 'Точность'}
                      {category === 'games' && 'Игры'}
                      {category === 'learning' && 'Обучение'}
                      {category === 'other' && 'Другое'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">
                      {categoryUnlocked}/{categoryAchievements.length}
                    </span>
                    <span className="text-base font-bold text-primary tabular-nums">
                      {Math.round(categoryPercent)}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedAchievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      title={achievement.title.ru}
                      description={achievement.description.ru}
                      unlocked={achievement.unlocked}
                      progress={achievement.progress}
                      maxProgress={achievement.progress_target}
                      icon={achievement.icon}
                      reward={achievement.reward}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {combinedAchievements.length === 0 && (
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-card to-muted/30">
            <Trophy className="w-16 h-16 md:w-20 md:h-20 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-bold mb-2">Пока нет достижений</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Начните проходить тесты и играть в игры, чтобы открывать достижения!
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Achievements;
