import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Trophy, Star, Zap, Target, Award, Crown, CheckCircle2, Lock, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion";
import Confetti from 'react-confetti';
import { useWindowSize } from 'usehooks-ts';

const XP_PER_LEVEL = 225;

const CATEGORY_PALETTES: Record<string, any> = {
  beginner: { border: 'border-indigo-500/20', bg: 'bg-indigo-500/5', tag: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', glow: 'group-hover:shadow-indigo-500/10' },
  master: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', tag: 'bg-amber-500/10 border-amber-500/20 text-amber-500', glow: 'group-hover:shadow-amber-500/10' },
  streak: { border: 'border-rose-500/20', bg: 'bg-rose-500/5', tag: 'bg-rose-500/10 border-rose-500/20 text-rose-500', glow: 'group-hover:shadow-rose-500/10' },
  accuracy: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', tag: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500', glow: 'group-hover:shadow-cyan-500/10' },
  games: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', tag: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500', glow: 'group-hover:shadow-emerald-500/10' },
  learning: { border: 'border-fuchsia-500/20', bg: 'bg-fuchsia-500/5', tag: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-500', glow: 'group-hover:shadow-fuchsia-500/10' },
  other: { border: 'border-zinc-500/20', bg: 'bg-zinc-500/5', tag: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400', glow: 'group-hover:shadow-zinc-500/10' }
};

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
  hideHeader?: boolean;
  onStatsUpdate?: (stats: { unlockedCount: number; totalCount: number; completionPercent: number }) => void;
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

export const AchievementsModalContent = ({
  xp,
  level,
  xpToNextLevel,
  hideHeader = false,
  onStatsUpdate
}: AchievementsModalContentProps) => {
  const { t } = useLanguage();
  const { width, height } = useWindowSize();
  // ПРАВИЛО ХУКОВ: Все хуки вызываем только здесь, на верхнем уровне компонента
  const { profileId, supabaseUser } = useUserContext();
  const queryClient = useQueryClient();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * ЖЕЛЕЗНАЯ ЛОГИКА загрузки аватара:
   * 1. Все переменные берём из замыкания — хуки вызываются только на верхнем уровне
   * 2. Не используем refreshProfile — он вызывает перезапрос сессии → SIGNED_OUT
   * 3. Вместо этого точечно инвалидируем React Query кэш — без触затрагивания auth
   * 4. Используем supabaseUser.id (auth.uid()) для папки в Storage согласно RLS
   */
  const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!profileId || !supabaseUser?.id) {
      console.warn('[AvatarUpload] Not ready:', { profileId: !!profileId, userId: !!supabaseUser?.id });
      toast.error('Профиль не загружен, попробуйте позже');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5МБ');
      return;
    }

    const toastId = 'avatar-upload';
    toast.loading('Загружаем аватар...', { id: toastId });

    try {
      setIsUploading(true);

      const fileExt = file.name.split('.').pop() || 'jpg';
      // КРИТИЧНО: Папка = auth.uid() — именно это проверяет RLS политика в Supabase
      const filePath = `${supabaseUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error('[AvatarUpload] Storage error:', uploadError);
        throw new Error(uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Обновляем профиль в базе — без auth операций
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', profileId);

      if (updateError) {
        console.error('[AvatarUpload] DB update error:', updateError);
        throw new Error(updateError.message);
      }

      toast.success('Аватар обновлён!', { id: toastId });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      // БЕЗОПАСНОЕ обновление UI через React Query — НЕ трогает auth сессию
      // Инвалидируем все кэши профиля точечно
      queryClient.invalidateQueries({ queryKey: ['profile-data'] });
      queryClient.invalidateQueries({ queryKey: ['avatar-data'] });
      queryClient.invalidateQueries({ queryKey: ['user-avatar-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });

      // Обновляем список достижений через 1 сек (чтобы БД обработала)
      setTimeout(() => fetchAchievements(), 1000);

    } catch (error: any) {
      console.error('[AvatarUpload] Error:', error);
      toast.error(`Ошибка: ${error.message || 'Не удалось загрузить аватар'}`, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [profileId, supabaseUser, queryClient]);

  const fetchAchievements = async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_achievements', { p_user_id: profileId });
      if (error) throw error;
      setAchievements(data as Achievement[]);
    } catch (err) {
      console.error('[Achievements] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [profileId]);

  const stats = useMemo(() => {
    const unlocked = achievements.filter((a) => a.unlocked).length;
    const total = achievements.length;
    const percent = total > 0 ? (unlocked / total) * 100 : 0;

    const res = { unlockedCount: unlocked, totalCount: total, completionPercent: percent };

    return res;
  }, [achievements]);

  // Вызываем callback при изменении статистики
  useEffect(() => {
    if (onStatsUpdate && stats.totalCount > 0) {
      onStatsUpdate(stats);
    }
  }, [stats, onStatsUpdate]);

  const { grouped } = useMemo(() => {
    const groups = achievements.reduce((acc, achievement) => {
      const cat = achievement.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(achievement);
      return acc;
    }, {} as Record<string, Achievement[]>);

    return { grouped: groups };
  }, [achievements]);

  if (loading) return (
    <div className="space-y-4 p-2">
      {!hideHeader && <Skeleton className="h-16 w-full rounded-2xl" />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  if (stats.totalCount === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <Trophy className="w-16 h-16 text-muted-foreground/20 animate-pulse" />
      <h3 className="text-xl font-bold">Достижения загружаются...</h3>
    </div>
  );

  const handleAchievementClick = (achievement: Achievement) => {
    if (achievement.unlocked) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } else if (achievement.achievement_type === 'profile_photo') {
      fileInputRef.current?.click();
    }

    setExpandedId(expandedId === achievement.id ? null : achievement.id);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-4 relative"
    >
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[100]">
            <Confetti width={width} height={height} recycle={false} numberOfPieces={200} gravity={0.15} colors={['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']} />
          </div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" disabled={isUploading} />

      {!hideHeader && (
        <div className="flex flex-col sm:flex-row gap-2 mb-2 p-1">
          <div className="flex-1 flex items-center justify-between gap-4 p-3 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group shadow-xl">
            <div className="z-10 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] group-hover:scale-110 transition-transform duration-500">
                <Zap size={16} className="fill-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] leading-none mb-1">Lvl {level}</p>
                <p className="text-sm font-black tabular-nums leading-none tracking-tight">{xp.toLocaleString()} <span className="text-[10px] opacity-40 font-bold ml-1">XP</span></p>
              </div>
            </div>
            <div className="z-10 text-right">
              <p className="text-[10px] font-black text-primary mb-1.5 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]">{Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)}%</p>
              <div className="w-14 h-1.5 rounded-full bg-white/5 overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-between gap-4 p-3 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group shadow-xl">
            <div className="z-10 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-500">
                < Trophy size={16} className="fill-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] leading-none mb-1">Достижения</p>
                <p className="text-sm font-black tabular-nums leading-none tracking-tight">{stats.unlockedCount} <span className="text-[10px] opacity-40 font-bold ml-1">/ {stats.totalCount}</span></p>
              </div>
            </div>
            <div className="z-10 text-right">
              <p className="text-[10px] font-black text-emerald-500 mb-1.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{Math.round(stats.completionPercent)}%</p>
              <div className="w-14 h-1.5 rounded-full bg-white/5 overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.completionPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-10 pt-4 px-1">
        {Object.entries(grouped)
          .sort(([a], [b]) => a === 'beginner' ? -1 : 1)
          .map(([category, categoryAchievements]) => {
            const Icon = categoryIcons[category] || Trophy;
            const categoryUnlocked = categoryAchievements.filter((a) => a.unlocked).length;
            const palette = CATEGORY_PALETTES[category] || CATEGORY_PALETTES.other;

            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center justify-between group/cat cursor-default">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/5 group-hover/cat:border-primary/30 transition-colors duration-500">
                      <Icon className="w-3.5 h-3.5 text-primary group-hover/cat:scale-110 transition-transform duration-500" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover/cat:text-zinc-200 transition-colors duration-500">
                      {t(`achievementsModal.categories.${category}`)}
                    </span>
                  </div>
                  <div className="text-[10px] font-black text-muted-foreground/60 bg-white/[0.02] px-3 py-1 rounded-full border border-white/5 group-hover/cat:border-white/10 transition-colors duration-500">
                    {categoryUnlocked} <span className="opacity-30 mx-1">/</span> {categoryAchievements.length}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements
                    .sort((a, b) => (a.unlocked === b.unlocked) ? 0 : a.unlocked ? -1 : 1)
                    .map((achievement) => {
                      const isUnlocked = achievement.unlocked;
                      const isExpanded = expandedId === achievement.id;
                      const percent = Math.min(100, Math.round((achievement.progress / achievement.max_progress) * 100));
                      const translatedTitle = t(`achievementsModal.list.${achievement.achievement_type}.title`) || achievement.title;
                      const translatedDesc = t(`achievementsModal.list.${achievement.achievement_type}.description`) || achievement.description;

                      return (
                        <motion.div key={achievement.id} variants={itemVariants} layout>
                          <Card
                            onClick={() => handleAchievementClick(achievement)}
                            className={cn(
                              "p-4 rounded-[20px] border relative overflow-hidden transition-all duration-500 flex flex-col justify-between group shadow-sm",
                              "hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md",
                              isUnlocked
                                ? `${palette.border} bg-white/[0.05] ${palette.glow} hover:-translate-y-1.5 cursor-pointer border-solid`
                                : `${palette.border} bg-white/[0.02] opacity-70 grayscale hover:grayscale-0 hover:opacity-100 cursor-pointer border-dashed hover:bg-white/[0.04]`,
                              isExpanded ? "h-auto min-h-[120px]" : "h-[120px]"
                            )}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                            <div className="z-10 min-w-0">
                              <div className="flex items-center gap-3 mb-2.5">
                                <div className={cn("p-1.5 rounded-xl border border-white/10 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500", palette.tag)}>
                                  {isUnlocked ? <CheckCircle2 size={14} className="text-current fill-current/10" /> : <Lock size={14} className="opacity-40" />}
                                </div>
                                <span className="text-[13px] font-black tracking-tight leading-none text-zinc-100 truncate group-hover:text-white transition-colors">
                                  {translatedTitle}
                                </span>
                              </div>
                              <p className={cn(
                                "text-[11px] font-medium leading-[1.5] text-zinc-400 transition-colors group-hover:text-zinc-300",
                                !isExpanded && "line-clamp-2"
                              )}>
                                {translatedDesc}
                              </p>
                            </div>

                            <div className="mt-4 relative z-10 flex items-center justify-between">
                              {isUnlocked ? (
                                <div className={cn("text-[8px] font-black px-2.5 py-1 rounded-lg border border-current/20 uppercase tracking-[0.15em] bg-current/5 shadow-sm", palette.tag)}>
                                  Получено
                                </div>
                              ) : (
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em]">
                                    <span className="text-primary font-black drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]">{percent}%</span>
                                    <span className="opacity-50">+{achievement.reward_xp ?? 0} <span className="text-[7px]">XP</span></span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden shadow-inner">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percent}%` }}
                                      transition={{ duration: 1, ease: "circOut" }}
                                      className="h-full bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.4)]"
                                    />
                                  </div>
                                </div>
                              )}

                              {isUnlocked && achievement.reward_xp && !isExpanded && (
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-primary/40 group-hover:text-primary/70 transition-colors">
                                  <Zap size={10} className="fill-current" />
                                  <span>{achievement.reward_xp}</span>
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
};
