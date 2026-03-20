import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { Check, Flame, Trophy, Target, Zap, Gift, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
          className="text-white/10"
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
          <Check className="w-4 h-4 text-amber-400" />
        ) : (
          <Icon className="w-3.5 h-3.5 text-white/50" />
        )}
      </div>
    </div>
  );
};

export function DailyQuestWidget() {
  const { profileId } = useUserContext();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc('get_or_assign_daily_quests', {
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

  const handleClaimReward = useCallback(async (quest: DailyQuest) => {
    if (!profileId || claimingId) return;
    setClaimingId(quest.id);
    try {
      const { data, error } = await (supabase as any).rpc('claim_daily_quest_reward', {
        p_user_id: profileId,
        p_user_quest_id: quest.id
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Награда получена! +${quest.reward_sp} SP`, {
          icon: <Sparkles className="w-4 h-4 text-amber-400" />
        });
        setQuests(prev => prev.map(q =>
          q.id === quest.id ? { ...q, is_claimed: true } : q
        ));
      } else {
        toast.error(data?.error || "Ошибка получения награды");
      }
    } catch (err: any) {
      console.error("[DailyQuestWidget] Claim error:", err);
      toast.error("Не удалось получить награду");
    } finally {
      setClaimingId(null);
    }
  }, [profileId, claimingId]);

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
            <div className="w-8 h-8 rounded-full bg-white/5" />
            <div className="flex-1 h-4 bg-white/5 rounded" />
            <div className="w-12 h-4 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!loading && quests.length === 0) return null;

  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
          Daily Quests
        </h4>
        <div className="flex items-center gap-1 text-[9px] font-bold text-white/15 uppercase tracking-tight">
          <Clock className="w-2.5 h-2.5" />
          00:00
        </div>
      </div>

      <div className="flex flex-col">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={cn(
              "group flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-0 transition-opacity",
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
                  quest.is_completed ? "text-amber-400/80" : "text-slate-400"
                )}>
                  {quest.description}
                </span>
                {!quest.is_completed && quest.target_value > 1 && (
                  <span className="text-[9px] font-bold text-slate-500 tabular-nums shrink-0">
                    {quest.current_progress}/{quest.target_value}
                  </span>
                )}
              </div>
            </div>

            {/* Награда — Капсула (Pill Badge) */}
            <div className="shrink-0 flex items-center h-full">
              {quest.is_claimed ? (
                <div className="flex items-center px-1.5 py-0.5 rounded-full bg-white/5">
                  <span className="text-[9px] font-bold text-white/20 uppercase">{quest.reward_sp} SP</span>
                </div>
              ) : quest.is_completed ? (
                <Button
                  onClick={() => handleClaimReward(quest)}
                  disabled={!!claimingId}
                  className="h-6 px-2.5 rounded-full bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
                >
                  {claimingId === quest.id ? (
                    <Sparkles className="w-3 h-3 animate-spin" />
                  ) : (
                    "CLAIM"
                  )}
                </Button>
              ) : (
                <div className="flex items-center px-2 py-0.5 rounded-full bg-amber-500/15">
                  <span className="text-[10px] font-black text-amber-500 tabular-nums">
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
