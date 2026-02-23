import { useEffect, useState } from "react";
import { Sparkles, Trophy, Star, Zap, Target, Award, Crown, CheckCircle2, Lock, Flag, Camera, BookOpen, Calendar, Users, CheckSquare, Lightbulb, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

const XP_PER_LEVEL = 225;

const CARD_PALETTES = [
  { border: 'border-indigo-500/50', bg: 'from-indigo-500/20 via-indigo-500/5', shadow: 'shadow-[0_8px_30px_rgba(99,102,241,0.2)]', text: 'text-indigo-400', tag: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' },
  { border: 'border-emerald-500/50', bg: 'from-emerald-500/20 via-emerald-500/5', shadow: 'shadow-[0_8px_30px_rgba(16,185,129,0.2)]', text: 'text-emerald-400', tag: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
  { border: 'border-rose-500/50', bg: 'from-rose-500/20 via-rose-500/5', shadow: 'shadow-[0_8px_30px_rgba(244,63,110,0.2)]', text: 'text-rose-400', tag: 'bg-rose-500/15 border-rose-500/30 text-rose-300' },
  { border: 'border-amber-500/50', bg: 'from-amber-500/20 via-amber-500/5', shadow: 'shadow-[0_8px_30px_rgba(245,158,11,0.2)]', text: 'text-amber-400', tag: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
  { border: 'border-cyan-500/50', bg: 'from-cyan-500/20 via-cyan-500/5', shadow: 'shadow-[0_8px_30px_rgba(6,182,212,0.2)]', text: 'text-cyan-400', tag: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' },
  { border: 'border-fuchsia-500/50', bg: 'from-fuchsia-500/20 via-fuchsia-500/5', shadow: 'shadow-[0_8px_30px_rgba(217,70,239,0.2)]', text: 'text-fuchsia-400', tag: 'bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300' }
];

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

const categoryIcons: Record<string, LucideIcon> = {
  beginner: Star,
  master: Crown,
  streak: Zap,
  accuracy: Target,
  games: Trophy,
  learning: Award,
  other: Trophy
};

const achievementIcons: Record<string, LucideIcon> = {
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

        const { data, error } = await supabase.rpc('get_user_achievements', {
          p_user_id: profileId,
        });

        if (error) {
          console.error('[Achievements] Error fetching achievements from RPC:', error);
          setAchievements([]);
          return;
        }

        setAchievements(data as Achievement[]);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedAchievements.map((achievement, index) => {
                  const isUnlocked = achievement.unlocked;
                  const percent = Math.min(
                    100,
                    Math.round((achievement.progress / achievement.max_progress) * 100)
                  );
                  // Получаем переведенные данные (тип достижения используется как ключ в ru.ts)
                  const translatedTitle = t(`achievementsModal.list.${achievement.achievement_type}.title`) || achievement.title;
                  const translatedDesc = t(`achievementsModal.list.${achievement.achievement_type}.description`) || achievement.description;
                  const palette = CARD_PALETTES[index % CARD_PALETTES.length];

                  return (
                    <Card
                      key={achievement.id}
                      className={cn(
                        "p-5 rounded-2xl border relative overflow-hidden transition-all duration-500 h-full flex flex-col justify-between",
                        isUnlocked
                          ? `${palette.border} bg-gradient-to-br ${palette.bg} to-transparent ${palette.shadow} hover:-translate-y-1 hover:scale-[1.02] cursor-pointer`
                          : "border-border/40 bg-card/40 backdrop-blur-sm opacity-80 grayscale-[0.2]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="z-10 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isUnlocked ? (
                              <div className={cn("p-1.5 rounded-full border border-white/10 shrink-0", palette.tag)}>
                                <CheckCircle2 className="w-5 h-5 drop-shadow-md" />
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-full bg-muted/50 border border-white/5 shrink-0">
                                <Lock className="w-4 h-4 text-muted-foreground/60" />
                              </div>
                            )}
                            <span className={cn(
                              "text-[15px] font-black tracking-tight leading-tight",
                              isUnlocked ? "text-white" : "text-muted-foreground"
                            )}>
                              {translatedTitle}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed">
                            {translatedDesc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 relative z-10">
                        {isUnlocked ? (
                          <div
                            className={cn(
                              "text-[11px] font-bold px-3 py-1.5 rounded-xl border w-fit shadow-inner",
                              palette.tag
                            )}
                          >
                            Активировано
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1.5">
                              <span className="uppercase tracking-wider">{t('achievementsModal.progressLabel')}</span>
                              <span className="tabular-nums font-mono">{percent}%</span>
                            </div>
                            <Progress value={percent} className="h-2 rounded-full bg-muted/50" />
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground/70">Награда</span>
                              <div className="text-[11px] font-bold px-2 py-1 rounded-md bg-muted/30 text-muted-foreground border border-white/5">
                                +{achievement.reward_xp ?? 0} XP
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {isUnlocked && (
                        <>
                          {/* Ambient abstract glows for unlocked cards */}
                          <div className={cn("absolute -top-10 -right-10 w-32 h-32 blur-[40px] opacity-30 pointer-events-none rounded-full bg-gradient-to-r", palette.bg)} />
                          <div className="absolute inset-0 pointer-events-none bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
                          <div className={cn("absolute -right-3 -bottom-3 opacity-10 drop-shadow-2xl transform rotate-12 scale-110", palette.text)}>
                            <Sparkles className="w-24 h-24" />
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

