import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Target, Star, Zap, Crown, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const XP_PER_LEVEL = 225;

const MOCK_ACHIEVEMENT_DEFS = [
  { id: "leader_of_roads", title: "Лидер дорог", description: "Займите первое место в рейтинге", reward: 200, category: "master" },
  { id: "photomodel", title: "Фотомодель", description: "Добавьте фото в профиль", reward: 20, category: "beginner" },
  { id: "novice", title: "Новичок", description: "Завершите первый урок", reward: 30, category: "beginner" },
  { id: "weekend_warrior", title: "Воин выходного дня", description: "Пройдите тесты в выходные", reward: 50, category: "streak" },
  { id: "social_butterfly", title: "Душа компании", description: "Пригласите 3 друзей", reward: 80, category: "learning" },
  { id: "sign_sniper", title: "Снайпер знаков", description: "Узнайте 50 знаков без ошибок", reward: 120, category: "accuracy" },
  { id: "examiner", title: "Экзаменатор", description: "Пройдите 20 экзаменационных тестов", reward: 200, category: "games" },
];

const categoryIcons: Record<string, any> = {
  beginner: Star,
  master: Crown,
  streak: Zap,
  accuracy: Target,
  learning: Award,
  games: Trophy,
};

interface AchievementsModalContentProps {
  xp: number;
  level: number;
  xpToNextLevel: number;
  onClose?: () => void;
}

export const AchievementsModalContent = ({ xp, level, xpToNextLevel }: AchievementsModalContentProps) => {
  const [achievements, setAchievements] = useState(() => [] as typeof MOCK_ACHIEVEMENT_DEFS);

  useEffect(() => {
    const hydrated = MOCK_ACHIEVEMENT_DEFS.map((achievement) => ({
      ...achievement,
      unlocked: Math.random() > 0.6,
      progress: Math.floor(Math.random() * 100),
    }));
    setAchievements(hydrated);
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const completionPercent = achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0;

  const grouped = useMemo(() => {
    return achievements.reduce<Record<string, typeof achievements>>((acc, achievement) => {
      const key = achievement.category || "other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(achievement);
      return acc;
    }, {});
  }, [achievements]);

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-5 bg-gradient-to-br from-card via-card to-primary/5 border border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Всего опыта</p>
            <p className="text-3xl font-bold tabular-nums">{xp.toLocaleString()} XP</p>
            <p className="text-xs text-muted-foreground mt-1">До следующего уровня: {xpToNextLevel} XP</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Текущий уровень</p>
            <p className="text-2xl font-bold">Lv {level}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Progress value={((XP_PER_LEVEL - xpToNextLevel) / XP_PER_LEVEL) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">Осталось {xpToNextLevel} XP</p>
        </div>
      </Card>

      <Card className="p-4 border border-border/40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Открыто достижений</p>
            <p className="text-2xl font-bold">{unlockedCount} / {achievements.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Прогресс</p>
            <p className="text-2xl font-bold text-primary">{Math.round(completionPercent)}%</p>
          </div>
        </div>
        <Progress value={completionPercent} className="h-2" />
      </Card>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categoryAchievements]) => {
          const Icon = categoryIcons[category] || Trophy;
          const unlockedInCategory = categoryAchievements.filter((a) => a.unlocked).length;
          const percent = Math.round((unlockedInCategory / categoryAchievements.length) * 100);
          const topAchievements = categoryAchievements.slice(0, 2);

          return (
            <Card key={category} className="p-4 border border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-semibold capitalize">
                    {category === "beginner" && "Новичок"}
                    {category === "master" && "Мастер"}
                    {category === "streak" && "Серия"}
                    {category === "accuracy" && "Точность"}
                    {category === "learning" && "Обучение"}
                    {category === "games" && "Игры"}
                    {!["beginner","master","streak","accuracy","learning","games"].includes(category) && "Прочее"}
                  </span>
                </div>
                <Badge variant="secondary">{percent}%</Badge>
              </div>
              <Progress value={percent} className="h-1.5" />
              <div className="space-y-2">
                {topAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold text-primary">+{achievement.reward} XP</p>
                      <p className={cn("text-muted-foreground", achievement.unlocked && "text-green-600")}>
                        {achievement.unlocked ? "Получено" : `${achievement.progress}%`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
