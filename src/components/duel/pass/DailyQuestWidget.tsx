import React, { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check, Flame, Trophy, Target, Zap, Clock, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const QUEST_TRANSLATIONS: Record<string, Record<string, string>> = {
  warmup:          { ru: "Ответь на 10 вопросов",            es: "Responde 10 preguntas",            en: "Answer 10 questions" },
  early_bird:      { ru: "Пройди 5 вопросов в практике",     es: "Practica 5 preguntas",             en: "Practice 5 questions" },
  marathon:        { ru: "Ответь на 50 вопросов",            es: "Responde 50 preguntas",            en: "Answer 50 questions" },
  centurion:       { ru: "Ответь на 100 вопросов за день",   es: "Responde 100 preguntas en un día", en: "Answer 100 questions" },
  duelist_1:       { ru: "Сыграй 1 дуэль",                  es: "Juega 1 duelo",                    en: "Play 1 duel" },
  duel_master:     { ru: "Выиграй 5 дуэлей",                es: "Gana 5 duelos",                    en: "Win 5 duels" },
  duel_streak:     { ru: "Выиграй 3 дуэли подряд",          es: "Gana 3 duelos seguidos",           en: "Win 3 duels in a row" },
  winner:          { ru: "Одержи 1 победу в дуэли",         es: "Consigue 1 victoria en duelo",     en: "Get 1 duel win" },
  sniper:          { ru: "15 вопросов без ошибок подряд",    es: "15 preguntas seguidas sin errores",en: "15 questions in a row without mistakes" },
  question_master: { ru: "30 вопросов без ошибок",           es: "30 preguntas sin errores",         en: "30 questions without mistakes" },
  ultra_accuracy:  { ru: "50 вопросов без ошибок",           es: "50 preguntas sin errores",         en: "50 questions without mistakes" },
  exam_pass:       { ru: "Пройти 1 экзамен",                 es: "Completa 1 examen",                en: "Complete 1 exam" },
  two_exams:       { ru: "Пройди 2 экзамена за день",        es: "Completa 2 exámenes en un día",    en: "Complete 2 exams today" },
  perfect_exam:    { ru: "Сдай экзамен на 100%",             es: "Aprueba un examen con 100%",       en: "Pass an exam with 100%" },
};

const CLAIM_LABEL: Record<string, string> = {
  ru: "ЗАБРАТЬ",
  es: "RECOGER",
  en: "CLAIM"
};


export type DailyQuest = {
  id: string;
  quest_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  current_progress: number;
  target_value: number;
  reward_sp: number;
  is_completed: boolean;
  is_claimed: boolean;
};

// Вспомогательный компонент для кругового прогресса
const CircularProgress = ({ progress, size = 32, strokeWidth = 2.5, completed = false, icon: Icon }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 1) * circumference);

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="absolute -rotate-90 transform" width={size} height={size}>
        {/* Background track */}
        <circle
          className="text-foreground/10 dark:text-white/10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress bar */}
        <circle
          className={cn(
            "transition-all duration-700 ease-out",
            completed ? "text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" : "text-amber-500/60"
          )}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className={cn(
        "relative z-10 transition-transform duration-300",
        completed ? "scale-110" : "scale-100"
      )}>
        {completed ? (
          <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <Icon className="w-3.5 h-3.5 text-muted-foreground/30 dark:text-white/50" />
        )}
      </div>
    </div>
  );
};

export function DailyQuestWidget() {
  const { profileId } = useUserContext();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const getQuestLabel = (quest: DailyQuest) =>
    QUEST_TRANSLATIONS[quest.quest_id]?.[language] ??
    QUEST_TRANSLATIONS[quest.quest_id]?.['ru'] ??
    quest.description;

  const fetchQuests = useCallback(async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_or_assign_daily_quests', {
        p_user_id: profileId
      });

      if (error) {
        console.error("[DailyQuestWidget] Error fetching quests:", error);
        if (!error.message?.includes("does not exist")) {
          toast.error("Не удалось загрузить квесты");
        }
        return;
      }

      if (data) {
        setQuests(data as DailyQuest[]);
      }
    } catch (err) {
      console.error("[DailyQuestWidget] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchQuests(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchQuests]);

  const handleClaimReward = useCallback(async (quest: DailyQuest) => {
    if (!profileId || claimingId) return;
    setClaimingId(quest.id);
    try {
      // Уровень ДО claim — для детекта level-up
      const { data: progressBefore } = await supabase
        .from('user_season_progress')
        .select('level')
        .eq('user_id', profileId)
        .order('season_id', { ascending: false })
        .limit(1)
        .maybeSingle();
      const levelBefore = progressBefore?.level ?? 1;

      const { data, error } = await supabase.rpc('claim_daily_quest_reward', {
        p_user_id: profileId,
        p_user_quest_id: quest.id
      });

      if (error) throw error;

      if (data?.success) {
        const rewardMsg = language === 'es' ? `¡Recompensa obtenida! +${quest.reward_sp} SP`
          : language === 'en' ? `Reward collected! +${quest.reward_sp} SP`
          : `Награда получена! +${quest.reward_sp} SP`;
        toast.success(rewardMsg, { icon: <Sparkles className="w-4 h-4 text-amber-400" /> });

        // Локальное обновление для мгновенной реакции UI
        setQuests(prev => prev.map(q =>
          q.id === quest.id ? { ...q, is_claimed: true } : q
        ));

        // Оптимистичное обновление кэша dashboard — SP сразу появится в хедере и виджете
        queryClient.setQueryData(['dashboard-data', profileId], (old: any) => {
          if (!old?.season_progress) return old;
          return {
            ...old,
            season_progress: {
              ...old.season_progress,
              season_points: (old.season_progress.season_points ?? 0) + quest.reward_sp,
            },
          };
        });

        // Award season points to user_season_progress (with premium multiplier), then check level-up
        try {
          const spResult = await supabase.functions.invoke('season-sp', {
            body: { user_id: profileId, source_type: 'challenge_reward', metadata: { sp_earned: quest.reward_sp } }
          });
          const newLevel = spResult.data?.level;

          // После получения реального ответа от сервера — обновляем кэш точными данными
          queryClient.invalidateQueries({ queryKey: ['dashboard-data', profileId] });

          if (newLevel && newLevel > levelBefore) {
            const { maybeTriggerLevelUp } = await import('@/store/levelUpStore');
            setTimeout(() => {
              maybeTriggerLevelUp({ level_up: true, new_level: newLevel }, 'quest', false);
            }, 800);
          }
        } catch (lvlErr) {
          console.warn('[DailyQuestWidget] season-sp/level-up error', lvlErr);
          // Даже при ошибке season-sp — инвалидируем кэш для корректного состояния
          queryClient.invalidateQueries({ queryKey: ['dashboard-data', profileId] });
        }
      } else {
        toast.error(data?.error || (language === 'es' ? "Error al obtener recompensa" : language === 'en' ? "Failed to claim reward" : "Ошибка получения награды"));
      }
    } catch (err: any) {
      console.error("[DailyQuestWidget] Claim error:", err);
      toast.error(language === 'es' ? "Error al obtener recompensa" : language === 'en' ? "Failed to claim reward" : "Не удалось получить награду");
    } finally {
      setClaimingId(null);
    }
  }, [profileId, claimingId, language]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'questions': return Target;
      case 'duels': return Zap;
      case 'duel_wins': return Zap;
      case 'accuracy': return Target;
      case 'exams': return Trophy;
      case 'perfect_exams': return Trophy;
      default: return Flame;
    }
  };

  if (loading && quests.length === 0) {
    return (
      <div className="space-y-4 py-2 px-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted dark:bg-white/5" />
            <div className="flex-1 h-4 bg-muted dark:bg-white/5 rounded" />
            <div className="w-12 h-4 bg-muted dark:bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!loading && quests.length === 0) return null;

  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/20 dark:text-white/20">
          {language === 'es' ? 'Misiones del día' : language === 'en' ? 'Daily Quests' : 'Задания дня'}
        </h4>
        <div className="flex items-center gap-1 text-[9px] font-bold text-foreground/15 dark:text-white/15 uppercase tracking-tight">
          <Clock className="w-2.5 h-2.5" />
          00:00
        </div>
      </div>

      <div className="flex flex-col">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={cn(
              "group flex items-center gap-3 py-1.5 border-b border-border dark:border-white/[0.03] last:border-0 transition-opacity",
              quest.is_claimed && "opacity-40"
            )}
          >
            {/* Круговой прогресс и иконка */}
            <CircularProgress
              progress={quest.current_progress / quest.target_value}
              completed={quest.is_completed}
              icon={getCategoryIcon(quest.category)}
              size={20}
              strokeWidth={1.8}
            />

            {/* Описание квеста и прогресс */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className={cn(
                  "text-[13.5px] font-medium leading-none truncate transition-colors",
                  quest.is_completed ? "text-amber-600 dark:text-amber-400/80" : "text-foreground/80 dark:text-slate-400"
                )}>
                  {getQuestLabel(quest)}
                </span>
                {!quest.is_completed && quest.target_value > 1 && (
                  <span className="text-[9px] font-bold text-muted-foreground tabular-nums shrink-0">
                    {quest.current_progress}/{quest.target_value}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end">
              {quest.is_completed && !quest.is_claimed ? (
                <div className="relative">
                  {/* Subtle Golden Aura */}
                  <motion.div
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 blur-[8px] bg-amber-400/20 rounded-full"
                  />
                  
                  <motion.button
                    whileHover={{ scale: 1.05, translateY: -0.5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleClaimReward(quest)}
                    disabled={!!claimingId}
                    className={cn(
                      "relative h-7 px-4 rounded-full font-black text-[9px] uppercase tracking-[0.15em] transition-all overflow-hidden",
                      "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm hover:shadow-md",
                      "flex items-center justify-center gap-1.5 z-10",
                      claimingId === quest.id && "opacity-50 pointer-events-none"
                    )}
                  >
                    {/* Glassy Shine overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent opacity-60" />
                    
                    {/* Shimmer line */}
                    <motion.div
                      animate={{
                        x: ["-100%", "200%"],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                        repeatDelay: 1.5,
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/30 to-transparent -skew-x-12"
                    />
                    
                    {claimingId === quest.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                    ) : (
                      <>
                        <span className="relative z-10">{CLAIM_LABEL[language] || "CLAIM"}</span>
                        <Sparkles className="w-3 h-3 text-amber-500 animate-pulse relative z-10" />
                      </>
                    )}
                  </motion.button>
                </div>
              ) : (
                <div className="flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tabular-nums">
                    +{quest.reward_sp} SP
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
