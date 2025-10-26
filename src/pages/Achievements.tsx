import { useEffect, useState } from "react";
import { Trophy, Star, Zap, Target, Award, Crown } from "lucide-react";
import Layout from "@/components/Layout";
import AchievementCard from "@/components/AchievementCard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  max_progress: number;
  unlocked_at?: string;
}

const Achievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAchievements(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить достижения",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
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
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Загрузка...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Достижения</h1>
          <p className="text-muted-foreground text-lg">
            Отслеживайте свой прогресс и открывайте новые награды
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="p-6 gradient-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-gold-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Общий прогресс</h3>
                  <p className="text-sm text-muted-foreground">
                    {unlockedCount} из {totalCount} достижений
                  </p>
                </div>
              </div>
              <div className="text-3xl font-bold text-primary">
                {Math.round(completionPercent)}%
              </div>
            </div>
            <Progress value={completionPercent} className="h-3" />
          </div>
        </Card>

        {/* Achievements Grid */}
        <div className="space-y-6">
          {Object.entries(
            achievements.reduce((acc, achievement) => {
              const type = achievement.achievement_type || 'other';
              if (!acc[type]) acc[type] = [];
              acc[type].push(achievement);
              return acc;
            }, {} as Record<string, Achievement[]>)
          ).map(([type, categoryAchievements]) => {
            const Icon = categoryIcons[type] || Trophy;
            const categoryUnlocked = categoryAchievements.filter(a => a.unlocked).length;
            
            return (
              <div key={type} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold capitalize">{type}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({categoryUnlocked}/{categoryAchievements.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      title={achievement.title}
                      description={achievement.description}
                      unlocked={achievement.unlocked}
                      progress={achievement.progress}
                      maxProgress={achievement.max_progress}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {achievements.length === 0 && (
          <Card className="p-12 text-center gradient-card">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Пока нет достижений</h3>
            <p className="text-muted-foreground">
              Начните проходить тесты и играть в игры, чтобы открывать достижения!
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Achievements;
