import { useEffect, useState } from "react";
import { Sparkles, Trophy, Star, Zap, Target, Award, Crown, CheckCircle2, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const XP_PER_LEVEL = 225;

const MOCK_ACHIEVEMENT_DEFS = [
  { id: "leader_of_roads", title: { ru: "Лидер дорог" }, description: { ru: "Занять первое место в рейтинге среди учеников" }, reward: { xp: 200 }, type: "one_time", progress_target: 1, icon: "Trophy", category: "beginner" },
  { id: "spanish_driver", title: { ru: "Испанский водитель" }, description: { ru: "Пройти финальный тест по ПДД" }, reward: { xp: 150 }, type: "one_time", progress_target: 1, icon: "Flag", category: "master" },
  { id: "photomodel", title: { ru: "Фотомодель" }, description: { ru: "Добавить фото в профиль" }, reward: { xp: 20 }, type: "one_time", progress_target: 1, icon: "Camera", category: "beginner" },
  { id: "novice", title: { ru: "Новичок" }, description: { ru: "Завершить первый урок по ПДД" }, reward: { xp: 30 }, type: "one_time", progress_target: 1, icon: "BookOpen", category: "beginner" },
  { id: "weekend_warrior", title: { ru: "Воин выходного дня" }, description: { ru: "Пройти тест в субботу и воскресенье" }, reward: { xp: 50 }, type: "one_time", progress_target: 2, icon: "Shield", category: "streak" },
  { id: "enthusiast", title: { ru: "Энтузиаст" }, description: { ru: "Заниматься 3 дня подряд" }, reward: { xp: 40 }, type: "one_time", progress_target: 3, icon: "Calendar", category: "streak" },
  { id: "social_butterfly", title: { ru: "Душа компании" }, description: { ru: "Пригласить 3 друзей в приложение" }, reward: { xp: 80 }, type: "progressive", progress_target: 3, icon: "Users", category: "learning" },
  { id: "strategist", title: { ru: "Стратег" }, description: { ru: "Завершить все дополнительные тесты" }, reward: { xp: 120 }, type: "one_time", progress_target: 10, icon: "Target", category: "accuracy" },
  { id: "true_student", title: { ru: "Настоящий ученик" }, description: { ru: "Завершить 10 дней подряд без пропусков" }, reward: { xp: 200 }, type: "one_time", progress_target: 10, icon: "Calendar", category: "streak" },
  { id: "flawless_driver", title: { ru: "Безошибочный водитель" }, description: { ru: "Пройти 20 уроков без ошибок" }, reward: { xp: 250 }, type: "progressive", progress_target: 20, icon: "Award", category: "accuracy" },
  { id: "examiner", title: { ru: "Экзаменатор" }, description: { ru: "Пройти 20 экзаменационных тестов" }, reward: { xp: 200 }, type: "progressive", progress_target: 20, icon: "CheckSquare", category: "games" },
  { id: "sign_sniper", title: { ru: "Снайпер знаков" }, description: { ru: "Узнать 50 знаков без ошибок" }, reward: { xp: 200 }, type: "progressive", progress_target: 50, icon: "Target", category: "accuracy" },
  { id: "pdd_genius", title: { ru: "Гений ПДД" }, description: { ru: "Набрать 100% правильных ответов в экзаменационном тесте" }, reward: { xp: 500 }, type: "one_time", progress_target: 100, icon: "Lightbulb", category: "master" },
  { id: "sign_master", title: { ru: "Знаток знаков" }, description: { ru: "Выучить 100 дорожных знаков" }, reward: { xp: 500 }, type: "progressive", progress_target: 100, icon: "Flag", category: "master" },
  { id: "pdd_master", title: { ru: "Мастер ПДД" }, description: { ru: "Набрать 4000 очков опыта" }, reward: { xp: 0, badge: "master_pdd" }, type: "one_time", progress_target: 4000, icon: "Crown", category: "master" },
];

interface AchievementDef {
  id: string;
  title: { ru: string };
  description: { ru: string };
  reward: { xp?: number; coins?: number; badge?: string };
  type: string;
  progress_target: number;
  icon: string;
  category: string;
}

interface CombinedAchievement extends AchievementDef {
  unlocked: boolean;
  progress: number;
  unlocked_at?: string;
}

interface AchievementsModalContentProps {
  xp: number;
  level: number;
  xpToNextLevel: number;
}

const categoryIcons: Record<string, any> = {
  beginner: Star,
  master: Crown,
  streak: Zap,
  accuracy: Target,
  games: Trophy,
  learning: Award,
};

export const AchievementsModalContent = ({ xp, level, xpToNextLevel }: AchievementsModalContentProps) => {
  const { t } = useLanguage();
  const [combinedAchievements, setCombinedAchievements] = useState<CombinedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockData: CombinedAchievement[] = MOCK_ACHIEVEMENT_DEFS.map((def) => ({
      ...def,
      unlocked: Math.random() > 0.6,
      progress: Math.floor(Math.random() * def.progress_target),
      unlocked_at: Math.random() > 0.6 ? new Date().toISOString() : undefined,
    }));
    mockData[11].progress = 33;
    mockData[11].unlocked = false;
    mockData[13].progress = 33;
    mockData[13].unlocked = false;
    setCombinedAchievements(mockData);
    setLoading(false);
  }, []);

  const unlockedCount = combinedAchievements.filter((a) => a.unlocked).length;
  const totalCount = combinedAchievements.length;
  const completionPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            {t('achievements.title')}
          </h2>
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm">
          {t('achievements.description')}
        </p>
      </div>

      <Card className="p-4 border border-border/30 shadow-sm bg-gradient-to-br from-card via-card to-primary/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('achievements.totalXP')}</p>
            <p className="text-3xl font-bold tabular-nums">{xp.toLocaleString()} XP</p>
            <p className="text-xs text-muted-foreground mt-1">{t('achievements.xpToNextLevel', { xp: xpToNextLevel })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('achievements.currentLevel')}</p>
            <p className="text-2xl font-bold">Lv {level}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Progress value={Math.max(0, Math.min(100, ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100))} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{t('achievements.xpRemaining', { xp: xpToNextLevel })}</p>
        </div>
      </Card>

      <Card className="p-4 border border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">{t('achievements.unlockedCount')}</p>
            <p className="text-2xl font-bold">{unlockedCount} / {totalCount}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('achievements.progress')}</p>
            <p className="text-2xl font-bold text-primary">{Math.round(completionPercent)}%</p>
          </div>
        </div>
        <Progress value={completionPercent} className="h-2" />
      </Card>

      <div className="space-y-6">
        {Object.entries(
          combinedAchievements.reduce((acc, achievement) => {
            const cat = achievement.category || "other";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(achievement);
            return acc;
          }, {} as Record<string, CombinedAchievement[]>)
        ).map(([category, categoryAchievements]) => {
          const Icon = categoryIcons[category] || Trophy;
          const categoryUnlocked = categoryAchievements.filter((a) => a.unlocked).length;
          const categoryPercent = categoryAchievements.length > 0
            ? (categoryUnlocked / categoryAchievements.length) * 100
            : 0;
          const sortedAchievements = [...categoryAchievements].sort((a, b) => {
            if (a.unlocked && !b.unlocked) return -1;
            if (!a.unlocked && b.unlocked) return 1;
            const aPercent = (a.progress / a.progress_target) * 100;
            const bPercent = (b.progress / b.progress_target) * 100;
            return bPercent - aPercent;
          });

          return (
            <div key={category} className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold capitalize">
                    {t(`achievements.categories.${category}`)}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{categoryUnlocked}/{categoryAchievements.length}</span>
                  <span className="font-semibold text-primary">{Math.round(categoryPercent)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedAchievements.map((achievement) => {
                  const isUnlocked = achievement.unlocked;
                  const percent = Math.min(
                    100,
                    Math.round((achievement.progress / achievement.progress_target) * 100)
                  );
                  return (
                    <Card
                      key={achievement.id}
                      className={cn(
                        "p-4 border relative overflow-hidden transition-all",
                        isUnlocked
                          ? "border-primary/50 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent shadow-[0_10px_30px_rgba(79,70,229,0.25)]"
                          : "border-border/50 bg-card/60 backdrop-blur-sm opacity-80"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isUnlocked ? (
                              <CheckCircle2 className="w-5 h-5 text-primary drop-shadow-lg" />
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground/80" />
                            )}
                            <span className="text-sm font-semibold">{achievement.title.ru}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{achievement.description.ru}</p>
                        </div>
                        <div
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full border",
                            isUnlocked
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-border/60 text-muted-foreground bg-muted/20"
                          )}
                        >
                          {isUnlocked ? t('achievements.unlocked') : `+${achievement.reward.xp ?? 0} XP`}
                        </div>
                      </div>
                      {!isUnlocked && (
                        <>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3">
                            <span>{t('achievements.progressLabel')}</span>
                            <span>{percent}%</span>
                          </div>
                          <Progress value={percent} className="h-1.5 mt-1.5" />
                        </>
                      )}
                      {isUnlocked && (
                        <>
                          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-70 animate-[pulse_5s_ease-in-out_infinite]" />
                          <span className="absolute bottom-3 right-3 text-[11px] uppercase tracking-[0.2em] text-primary/70">
                            PREMIUM
                          </span>
                        </>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
