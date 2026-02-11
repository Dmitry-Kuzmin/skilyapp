import { useEffect, useState } from "react";
import { Sparkles, Trophy, Star, Zap, Target, Award, Crown, CheckCircle2, Lock, Flag, Camera, BookOpen, Calendar, Users, CheckSquare, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

const XP_PER_LEVEL = 225;

interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  max_progress: number;
  unlocked_at?: string;
  category: string;
  reward_xp?: number;
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
  other: Trophy
};

const achievementIcons: Record<string, any> = {
  Trophy: Trophy,
  Flag: Flag,
  Camera: Camera,
  BookOpen: BookOpen,
  Calendar: Calendar,
  Users: Users,
  Target: Target,
  Award: Award,
  CheckSquare: CheckSquare,
  Lightbulb: Lightbulb,
  Crown: Crown
};

export const AchievementsModalContent = ({ xp, level, xpToNextLevel }: AchievementsModalContentProps) => {
  const { t } = useLanguage();
  const { profileId } = useUserContext();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      if (!profileId) return;

      try {
        setLoading(true);
        // Получаем достижения пользователя
        const { data: userAchievements, error: achievementsError } = await supabase
          .from('achievements')
          .select('*')
          .eq('user_id', profileId);

        if (achievementsError) throw achievementsError;

        // Если достижений нет, возможно они еще не инициализированы
        // В реальном приложении мы бы дождались инициализации или показали пустой список
        if (!userAchievements || userAchievements.length === 0) {
          setAchievements([]);
          return;
        }

        // Получаем определения наград (XP) из achievement_definitions
        const { data: definitions, error: defError } = await supabase
          .from('achievement_definitions')
          .select('id, reward_xp, category, icon');

        if (defError) {
          console.warn('[Achievements] Could not fetch definitions, using defaults');
        }

        const combined: Achievement[] = userAchievements.map(ua => {
          const def = definitions?.find(d => d.id === ua.achievement_type);
          return {
            ...ua,
            category: def?.category || 'other',
            reward_xp: def?.reward_xp || 50,
            icon: def?.icon || 'Trophy'
          };
        });

        setAchievements(combined);
      } catch (err) {
        console.error('[Achievements] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAchievements();
  }, [profileId]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
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

  // Если достижений пока нет в базе (например, новый пользователь или ошибка инициализации)
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <Trophy className="w-16 h-16 text-muted-foreground/30 animate-pulse" />
        <div className="space-y-1">
          <h3 className="text-xl font-bold">{t('achievementsModal.emptyTitle') || "Достижения загружаются"}</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            {t('achievementsModal.emptyDesc') || "Начните обучение, и ваши первые достижения появятся здесь в ближайшее время!"}
          </p>
        </div>
      </div>
    );
  }

  const grouped = achievements.reduce((acc, achievement) => {
    const cat = achievement.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <div className="space-y-6">
      <Card className="p-4 mt-2 border border-border/30 shadow-sm bg-gradient-to-br from-card via-card to-primary/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('achievementsModal.totalXP')}</p>
            <p className="text-3xl font-bold tabular-nums">{xp.toLocaleString()} XP</p>
            <p className="text-xs text-muted-foreground mt-1">{t('achievementsModal.xpToNextLevel', { xp: xpToNextLevel })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('achievementsModal.currentLevel')}</p>
            <p className="text-2xl font-bold">Lv {level}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Progress value={Math.max(0, Math.min(100, ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100))} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{t('achievementsModal.xpRemaining', { xp: xpToNextLevel })}</p>
        </div>
      </Card>

      <Card className="p-4 border border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">{t('achievementsModal.unlockedCount')}</p>
            <p className="text-2xl font-bold">{unlockedCount} / {totalCount}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('achievementsModal.progress')}</p>
            <p className="text-2xl font-bold text-primary">{Math.round(completionPercent)}%</p>
          </div>
        </div>
        <Progress value={completionPercent} className="h-2" />
      </Card>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, categoryAchievements]) => {
          const Icon = categoryIcons[category] || Trophy;
          const categoryUnlocked = categoryAchievements.filter((a) => a.unlocked).length;
          const categoryPercent = categoryAchievements.length > 0
            ? (categoryUnlocked / categoryAchievements.length) * 100
            : 0;

          const sortedAchievements = [...categoryAchievements].sort((a, b) => {
            if (a.unlocked && !b.unlocked) return -1;
            if (!a.unlocked && b.unlocked) return 1;
            const aPercent = (a.progress / a.max_progress) * 100;
            const bPercent = (b.progress / b.max_progress) * 100;
            return bPercent - aPercent;
          });

          return (
            <div key={category} className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">
                    {t(`achievementsModal.categories.${category}`)}
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
                    Math.round((achievement.progress / achievement.max_progress) * 100)
                  );
                  // Получаем переведенные данные (тип достижения используется как ключ в ru.ts)
                  const translatedTitle = t(`achievementsModal.list.${achievement.achievement_type}.title`) || achievement.title;
                  const translatedDesc = t(`achievementsModal.list.${achievement.achievement_type}.description`) || achievement.description;

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
                        <div className="z-10">
                          <div className="flex items-center gap-2 mb-1">
                            {isUnlocked ? (
                              <CheckCircle2 className="w-5 h-5 text-primary drop-shadow-lg" />
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground/80" />
                            )}
                            <span className="text-sm font-semibold">
                              {translatedTitle}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {translatedDesc}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full border z-10",
                            isUnlocked
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-border/60 text-muted-foreground bg-muted/20"
                          )}
                        >
                          {isUnlocked ? t('achievementsModal.unlocked') : `+${achievement.reward_xp ?? 0} XP`}
                        </div>
                      </div>
                      {!isUnlocked && (
                        <div className="relative z-10">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3">
                            <span>{t('achievementsModal.progressLabel')}</span>
                            <span>{percent}% ({achievement.progress}/{achievement.max_progress})</span>
                          </div>
                          <Progress value={percent} className="h-1.5 mt-1.5" />
                        </div>
                      )}
                      {isUnlocked && (
                        <>
                          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-70" />
                          <div className="absolute -right-2 -bottom-2 opacity-10">
                            <Sparkles className="w-16 h-16 text-primary" />
                          </div>
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

