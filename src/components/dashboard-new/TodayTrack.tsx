import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, SlidersHorizontal, Loader2, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { playClickSound, playSuccessSound } from '@/services/audioService';
import { useSettingsStore } from '@/store/settingsStore';

// ─── Quest metadata ───────────────────────────────────────────────────────────

const QUEST_TRANSLATIONS: Record<string, Record<string, string>> = {
  warmup:          { ru: 'Ответь на 10 вопросов',            es: 'Responde 10 preguntas',            en: 'Answer 10 questions' },
  early_bird:      { ru: 'Пройди 5 вопросов в практике',     es: 'Practica 5 preguntas',             en: 'Practice 5 questions' },
  marathon:        { ru: 'Ответь на 50 вопросов',            es: 'Responde 50 preguntas',            en: 'Answer 50 questions' },
  centurion:       { ru: 'Ответь на 100 вопросов за день',   es: 'Responde 100 preguntas en un día', en: 'Answer 100 questions' },
  duelist_1:       { ru: 'Сыграй 1 дуэль',                  es: 'Juega 1 duelo',                    en: 'Play 1 duel' },
  duel_master:     { ru: 'Выиграй 5 дуэлей',                es: 'Gana 5 duelos',                    en: 'Win 5 duels' },
  duel_streak:     { ru: 'Выиграй 3 дуэли подряд',          es: 'Gana 3 duelos seguidos',           en: 'Win 3 duels in a row' },
  winner:          { ru: 'Одержи 1 победу в дуэли',         es: 'Consigue 1 victoria en duelo',     en: 'Get 1 duel win' },
  sniper:          { ru: '15 вопросов без ошибок подряд',    es: '15 seguidas sin errores',          en: '15 in a row no mistakes' },
  question_master: { ru: '30 вопросов без ошибок',           es: '30 preguntas sin errores',         en: '30 questions no mistakes' },
  ultra_accuracy:  { ru: '50 вопросов без ошибок',           es: '50 preguntas sin errores',         en: '50 questions no mistakes' },
  exam_pass:       { ru: 'Пройти 1 экзамен',                 es: 'Completa 1 examen',                en: 'Complete 1 exam' },
  two_exams:       { ru: 'Пройди 2 экзамена за день',        es: 'Completa 2 exámenes en un día',    en: 'Complete 2 exams today' },
  perfect_exam:    { ru: 'Сдай экзамен на 100%',             es: 'Aprueba un examen con 100%',       en: 'Pass exam with 100%' },
};

const QUEST_MINUTES: Record<string, number> = {
  early_bird: 5,
  warmup: 10,
  sniper: 10,
  duelist_1: 5,
  winner: 5,
  question_master: 20,
  marathon: 30,
  duel_streak: 15,
  duel_master: 25,
  exam_pass: 15,
  perfect_exam: 20,
  two_exams: 40,
  centurion: 60,
  ultra_accuracy: 35,
};

const getQuestRoute = (questId: string): string => {
  if (['duelist_1', 'duel_master', 'duel_streak', 'winner'].includes(questId)) return '/games/duel';
  if (['exam_pass', 'two_exams', 'perfect_exam'].includes(questId)) return '/test/exam';
  if (questId === 'early_bird') return '/test/practice?count=5';
  if (questId === 'warmup') return '/test/practice?count=10';
  if (questId === 'sniper' || questId === 'question_master') return '/test/practice?count=30&sort=hardest';
  if (questId === 'marathon') return '/test/practice?count=50';
  if (questId === 'ultra_accuracy') return '/test/practice?count=50&sort=hardest';
  if (questId === 'centurion') return '/test/practice?count=100';
  return '/test/practice?count=20';
};

type DailyQuest = {
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

// ─── Circular checkbox (competitor-style) ─────────────────────────────────────

const TrackCheckbox = ({ completed }: { completed: boolean }) => (
  <div className={cn(
    'relative flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 transition-all duration-300',
    completed
      ? 'border-emerald-500 bg-emerald-500'
      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-transparent'
  )}>
    <AnimatePresence>
      {completed && (
        <>
          <motion.svg
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.05 }}
            className="absolute inset-0 w-full h-full p-[4px]"
            viewBox="0 0 12 12"
            fill="none"
          >
            <motion.path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            />
          </motion.svg>
          <motion.div
            key="ripple"
            initial={{ scale: 1, opacity: 0.35 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 rounded-full bg-emerald-400 pointer-events-none"
          />
        </>
      )}
    </AnimatePresence>
  </div>
);

// ─── Single quest card (competitor-style rows) ────────────────────────────────

const QuestCard = ({
  quest,
  lang,
  claimingId,
  onClaim,
  isDark,
  navigate,
}: {
  quest: DailyQuest;
  lang: string;
  claimingId: string | null;
  onClaim: (q: DailyQuest) => void;
  isDark: boolean;
  navigate: (path: string) => void;
}) => {
  const label =
    QUEST_TRANSLATIONS[quest.quest_id]?.[lang] ??
    QUEST_TRANSLATIONS[quest.quest_id]?.['ru'] ??
    quest.description;
  const minutes = QUEST_MINUTES[quest.quest_id];
  const progress = quest.target_value > 1 ? Math.min(quest.current_progress / quest.target_value, 1) : 0;
  const showBar = !quest.is_completed && quest.target_value > 1 && quest.current_progress > 0;
  const isClaiming = claimingId === quest.id;
  const canClaim = quest.is_completed && !quest.is_claimed;
  const route = getQuestRoute(quest.quest_id);
  const minLabel = lang === 'en' ? 'min' : 'min';

  const handleClick = () => {
    if (quest.is_completed) return;
    playClickSound();
    navigate(route);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={cn(
        'relative flex items-center gap-3 px-3.5 pt-3 rounded-2xl border transition-all duration-200 select-none overflow-hidden',
        // bottom padding: more when progress bar shown, normal otherwise
        showBar ? 'pb-[14px]' : 'pb-3',
        quest.is_completed
          ? isDark
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-emerald-50 border-emerald-100'
          : isDark
            ? 'bg-slate-700/40 border-slate-600/50 cursor-pointer hover:bg-slate-700/60 active:scale-[0.99]'
            : 'bg-slate-50 border-slate-200/80 cursor-pointer hover:bg-slate-100/80 active:scale-[0.99]',
        quest.is_claimed && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <div className="shrink-0 self-start mt-[2px]">
        <TrackCheckbox completed={quest.is_completed} />
      </div>

      {/* Text block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {/* Label — stronger strikethrough matching competitor */}
          <span className={cn(
            'text-[14px] font-semibold leading-snug',
            quest.is_completed
              ? isDark
                ? 'text-slate-500 line-through decoration-slate-500 decoration-[1.5px]'
                : 'text-slate-400 line-through decoration-slate-400 decoration-[1.5px]'
              : isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            {label}
          </span>

          {/* Reward */}
          <div className="shrink-0 flex items-center mt-[1px]">
            {canClaim ? (
              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => { e.stopPropagation(); onClaim(quest); }}
                disabled={!!claimingId}
                className={cn(
                  'h-6 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1',
                  'bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/40 hover:bg-amber-400/30 transition-colors',
                  isClaiming && 'opacity-50 pointer-events-none'
                )}
              >
                {isClaiming
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <><Sparkles className="w-2.5 h-2.5" /><span>+{quest.reward_sp}</span></>
                }
              </motion.button>
            ) : (
              <span className={cn(
                'text-[12px] font-semibold tabular-nums flex items-center gap-0.5',
                quest.is_claimed
                  ? isDark ? 'text-slate-600 line-through' : 'text-slate-300 line-through'
                  : isDark ? 'text-slate-500' : 'text-slate-400'
              )}>
                <Zap className="w-3 h-3" />
                {quest.reward_sp}
              </span>
            )}
          </div>
        </div>

        {/* Time — second line */}
        {minutes && !quest.is_completed && (
          <span className={cn(
            'flex items-center gap-1 mt-1 text-[11px] font-medium',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )}>
            <Clock className="w-3 h-3" />
            {minutes} {minLabel}
          </span>
        )}
      </div>

      {/* Progress bar — competitor style: thick bar at bottom of card, full width */}
      {showBar && (
        <div className={cn(
          'absolute bottom-0 left-0 right-0 h-[4px]',
          isDark ? 'bg-slate-600/50' : 'bg-slate-200'
        )}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full bg-indigo-500 rounded-r-full"
          />
        </div>
      )}
    </motion.div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const TrackSkeleton = ({ isDark }: { isDark: boolean }) => (
  <div className="flex flex-col gap-2">
    {[85, 100, 70].map((w, i) => (
      <div
        key={i}
        className={cn(
          'h-[50px] rounded-2xl animate-pulse',
          isDark ? 'bg-slate-700/50' : 'bg-slate-100'
        )}
      />
    ))}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const TodayTrack: React.FC = () => {
  const { profileId } = useUserContext();
  const { language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const { trackIntensity, openSettings } = useSettingsStore();

  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    if (!profileId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_or_assign_daily_quests');
      if (error) { console.error('[TodayTrack]', error); return; }
      if (data) setQuests(data as DailyQuest[]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { fetchQuests(); }, [fetchQuests]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchQuests(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchQuests]);

  const handleClaim = useCallback(async (quest: DailyQuest) => {
    if (!profileId || claimingId) return;
    setClaimingId(quest.id);
    try {
      const levelBefore = (await supabase
        .from('user_season_progress')
        .select('level')
        .eq('user_id', profileId)
        .order('season_id', { ascending: false })
        .limit(1)
        .maybeSingle())?.data?.level ?? 1;

      const { data, error } = await supabase.rpc('claim_daily_quest_reward', {
        p_user_id: profileId,
        p_user_quest_id: quest.id,
      });
      if (error) throw error;

      if (data?.success) {
        playSuccessSound();
        toast.success(
          language === 'es' ? `+${quest.reward_sp} SP obtenidos!`
            : language === 'en' ? `+${quest.reward_sp} SP earned!`
            : `+${quest.reward_sp} SP получено!`,
          { icon: <Sparkles className="w-4 h-4 text-amber-400" /> }
        );
        setQuests((prev) => prev.map((q) => q.id === quest.id ? { ...q, is_claimed: true } : q));
        queryClient.setQueryData(['dashboard-data', profileId], (old: any) => {
          if (!old?.season_progress) return old;
          return { ...old, season_progress: { ...old.season_progress, season_points: (old.season_progress.season_points ?? 0) + quest.reward_sp } };
        });
        try {
          const sp = await supabase.functions.invoke('season-sp', {
            body: { user_id: profileId, source_type: 'challenge_reward', metadata: { sp_earned: quest.reward_sp } },
          });
          queryClient.invalidateQueries({ queryKey: ['dashboard-data', profileId] });
          const newLevel = sp.data?.level;
          if (newLevel && newLevel > levelBefore) {
            const { maybeTriggerLevelUp } = await import('@/store/levelUpStore');
            setTimeout(() => maybeTriggerLevelUp({ level_up: true, new_level: newLevel }, 'quest', false), 800);
          }
        } catch {
          queryClient.invalidateQueries({ queryKey: ['dashboard-data', profileId] });
        }
      } else {
        toast.error(data?.error ?? 'Error');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Error');
    } finally {
      setClaimingId(null);
    }
  }, [profileId, claimingId, language, queryClient]);

  if (!loading && quests.length === 0) return null;

  const completedCount = quests.filter((q) => q.is_completed).length;
  const totalCount = quests.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const title = language === 'es' ? 'Misión de hoy' : language === 'en' ? "Today's track" : 'Трек на сегодня';
  const adjustLabel = language === 'es' ? 'Ajustar' : language === 'en' ? 'Adjust' : 'Настроить';
  const completedLabel = language === 'es'
    ? `${completedCount} de ${totalCount} completadas`
    : language === 'en'
    ? `${completedCount} of ${totalCount} completed`
    : `${completedCount} из ${totalCount} выполнено`;

  const handleAdjust = () => {
    playClickSound();
    openSettings('cockpit');
  };

  return (
    <div className={cn(
      'rounded-3xl p-4 md:p-5 border flex flex-col gap-4 h-full',
      isDark
        ? 'bg-slate-800/60 border-slate-700/60 backdrop-blur-sm'
        : 'bg-white border-slate-200/80 shadow-[0_20px_45px_rgba(0,0,0,0.06)]'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={cn('text-base font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
          {title}
        </h3>
        <button
          onClick={handleAdjust}
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium transition-colors',
            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{adjustLabel}</span>
        </button>
      </div>

      {/* Quest cards */}
      <div className="flex flex-col gap-2 flex-1">
        {loading ? (
          <TrackSkeleton isDark={isDark} />
        ) : (
          <motion.div layout className="flex flex-col gap-2">
            {quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                lang={language}
                claimingId={claimingId}
                onClaim={handleClaim}
                isDark={isDark}
                navigate={nav}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Footer — competitor-style */}
      {!loading && totalCount > 0 && (
        <div className={cn(
          'flex items-center justify-between pt-3 border-t gap-4',
          isDark ? 'border-slate-700/50' : 'border-slate-100'
        )}>
          <span className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {completedLabel}
          </span>
          {/* Progress bar */}
          <div className={cn('flex-1 max-w-[80px] h-[5px] rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-slate-200')}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};
