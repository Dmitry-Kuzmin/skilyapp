import React, { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check, Clock, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const QUEST_TRANSLATIONS: Record<string, Record<string, string>> = {
  warmup:          { ru: "Ответь на 10 вопросов",            es: "Responde 10 preguntas",              en: "Answer 10 questions" },
  early_bird:      { ru: "Пройди 5 вопросов в практике",     es: "Practica 5 preguntas",               en: "Practice 5 questions" },
  marathon:        { ru: "Ответь на 50 вопросов",            es: "Responde 50 preguntas",              en: "Answer 50 questions" },
  centurion:       { ru: "Ответь на 100 вопросов за день",   es: "Responde 100 preguntas en un día",   en: "Answer 100 questions" },
  legend:          { ru: "150 вопросов за день",             es: "150 preguntas en un día",            en: "150 questions in one day" },
  duelist_1:       { ru: "Сыграй 1 дуэль",                  es: "Juega 1 duelo",                      en: "Play 1 duel" },
  gladiator:       { ru: "Сразись в 3 дуэлях",              es: "Juega 3 duelos",                     en: "Play 3 duels" },
  duel_master:     { ru: "Выиграй 5 дуэлей",                es: "Gana 5 duelos",                      en: "Win 5 duels" },
  dominator:       { ru: "Выиграй 6 дуэлей за день",        es: "Gana 6 duelos en un día",            en: "Win 6 duels today" },
  duel_streak:     { ru: "Выиграй 3 дуэли подряд",          es: "Gana 3 duelos seguidos",             en: "Win 3 duels in a row" },
  winner:          { ru: "Одержи 1 победу в дуэли",         es: "Consigue 1 victoria en duelo",       en: "Get 1 duel win" },
  sniper:          { ru: "15 правильных подряд",             es: "15 aciertos seguidos",               en: "15 correct in a row" },
  sharp_shooter:   { ru: "10 правильных подряд",             es: "10 aciertos seguidos",               en: "10 correct in a row" },
  iron_focus:      { ru: "20 правильных подряд",             es: "20 aciertos seguidos",               en: "20 correct in a row" },
  question_master: { ru: "30 правильных ответов",            es: "30 respuestas correctas",            en: "30 correct answers" },
  ultra_accuracy:  { ru: "50 правильных ответов",            es: "50 respuestas correctas",            en: "50 correct answers" },
  exam_pass:       { ru: "Пройти 1 экзамен",                 es: "Completa 1 examen",                  en: "Complete 1 exam" },
  two_exams:       { ru: "Пройди 2 экзамена за день",        es: "Completa 2 exámenes en un día",      en: "Complete 2 exams today" },
  exam_blitz:      { ru: "Пройди 3 экзамена за день",        es: "Supera 3 exámenes en un día",        en: "Pass 3 exams today" },
  perfect_exam:    { ru: "Сдай экзамен на 100%",             es: "Aprueba un examen con 100%",         en: "Pass an exam with 100%" },
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

// Checkbox-индикатор вместо кругового SVG
const QuestCheckbox = ({ completed, claimed }: { completed: boolean; claimed: boolean }) => (
  <div className={cn(
    "w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 mt-[1px] transition-all duration-200",
    completed
      ? "bg-amber-400/15 border-amber-400/70"
      : "border-border/40 bg-transparent",
    claimed && "opacity-40",
  )}>
    {completed && (
      <Check className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" strokeWidth={3} />
    )}
  </div>
);

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
    // Explicitly wait for the supabase client's own session before making
    // an authenticated RPC call. UserContext.session is a React state copy
    // that can be set slightly before the client attaches the auth header.
    const { data: { session: clientSession } } = await supabase.auth.getSession();
    if (!clientSession) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_or_assign_daily_quests');

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

      <div className="flex flex-col gap-0">
        {quests.map((quest) => {
          const progress = Math.min(quest.current_progress / quest.target_value, 1);
          const showBar = !quest.is_completed && quest.target_value > 1;
          return (
            <div
              key={quest.id}
              className="group flex items-start gap-2.5 py-2 border-b border-border/30 dark:border-white/[0.04] last:border-0"
            >
              {/* Checkbox */}
              <QuestCheckbox completed={quest.is_completed} claimed={quest.is_claimed} />

              {/* Text + progress bar */}
              <div className={cn("flex-1 min-w-0", quest.is_claimed && "opacity-40")}>
                <span className={cn(
                  "text-[13px] font-medium leading-snug transition-all",
                  quest.is_completed
                    ? "line-through text-gray-400 dark:text-white/30"
                    : "text-foreground/80 dark:text-slate-300",
                )}>
                  {getQuestLabel(quest)}
                </span>

                {showBar && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-[3px] bg-border/25 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400/70 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground/50 tabular-nums shrink-0">
                      {quest.current_progress}/{quest.target_value}
                    </span>
                  </div>
                )}
              </div>

              {/* Reward / Claim */}
              <div className="shrink-0 flex items-start pt-[1px]">
                {quest.is_completed && !quest.is_claimed ? (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleClaimReward(quest)}
                    disabled={!!claimingId}
                    className={cn(
                      "relative h-6 px-2.5 rounded-md font-bold text-[10px] uppercase tracking-wide transition-all overflow-hidden",
                      "bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 hover:bg-amber-400/25",
                      "flex items-center gap-1",
                      claimingId === quest.id && "opacity-50 pointer-events-none"
                    )}
                  >
                    {claimingId === quest.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>+{quest.reward_sp}</span>
                      </>
                    )}
                  </motion.button>
                ) : (
                  <span className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    quest.is_claimed
                      ? "text-gray-400 line-through dark:text-white/25"
                      : "text-gray-500 dark:text-white/40",
                  )}>
                    +{quest.reward_sp} SP
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
