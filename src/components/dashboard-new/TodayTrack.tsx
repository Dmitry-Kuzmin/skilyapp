import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Settings2, Loader2, Zap, Clock, X, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { playClickSound, playSuccessSound } from '@/services/audioService';

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

// Estimated minutes per quest
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
  exam_pass: 20,
  perfect_exam: 20,
  two_exams: 40,
  centurion: 60,
  ultra_accuracy: 35,
};

// Deep link per quest type
const getQuestRoute = (questId: string): string => {
  if (['duelist_1', 'duel_master', 'duel_streak', 'winner'].includes(questId)) return '/duel';
  if (['exam_pass', 'two_exams', 'perfect_exam'].includes(questId)) return '/test/exam';
  if (questId === 'early_bird') return '/test/practice?count=5';
  if (questId === 'warmup') return '/test/practice?count=10';
  if (questId === 'sniper' || questId === 'question_master') return '/test/practice?count=30&sort=hardest';
  if (questId === 'marathon') return '/test/practice?count=50';
  if (questId === 'ultra_accuracy') return '/test/practice?count=50&sort=hardest';
  if (questId === 'centurion') return '/test/practice?count=100';
  return '/test/practice?count=20';
};

// ─── Intensity config ─────────────────────────────────────────────────────────

type Intensity = 'light' | 'standard' | 'hardcore';

const INTENSITY_STORAGE_KEY = 'skily_track_intensity';

const INTENSITY_CONFIG: Record<Intensity, { icon: string; label: Record<string, string>; desc: Record<string, string>; minutes: number }> = {
  light: {
    icon: '🌱',
    label: { ru: 'Лайт', es: 'Suave', en: 'Light' },
    desc: { ru: '1–2 задачи · до 15 мин', es: '1–2 tareas · hasta 15 min', en: '1–2 tasks · up to 15 min' },
    minutes: 15,
  },
  standard: {
    icon: '⚡',
    label: { ru: 'Стандарт', es: 'Estándar', en: 'Standard' },
    desc: { ru: '3–4 задачи · 30–40 мин', es: '3–4 tareas · 30–40 min', en: '3–4 tasks · 30–40 min' },
    minutes: 35,
  },
  hardcore: {
    icon: '🔥',
    label: { ru: 'Хардкор', es: 'Intensivo', en: 'Hardcore' },
    desc: { ru: '5+ задач · экзамены · 60+ мин', es: '5+ tareas · exámenes · 60+ min', en: '5+ tasks · exams · 60+ min' },
    minutes: 60,
  },
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

// ─── Circular checkbox ────────────────────────────────────────────────────────

const TrackCheckbox = ({ completed }: { completed: boolean }) => (
  <div className="relative flex-shrink-0 w-[22px] h-[22px]">
    <motion.div
      className={cn(
        'absolute inset-0 rounded-full border-2 transition-colors duration-300',
        completed ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-600'
      )}
    />
    <AnimatePresence>
      {completed && (
        <>
          <motion.div
            key="fill"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="absolute inset-[3px] rounded-full bg-emerald-500"
          />
          <motion.svg
            key="check"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 600, damping: 30 }}
            className="absolute inset-0 w-full h-full p-[5px]"
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
              transition={{ duration: 0.22, delay: 0.1 }}
            />
          </motion.svg>
          <motion.div
            key="ripple"
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-full bg-emerald-400 pointer-events-none"
          />
        </>
      )}
    </AnimatePresence>
  </div>
);

// ─── Intensity Modal ──────────────────────────────────────────────────────────

const IntensityModal = ({
  open,
  intensity,
  onSelect,
  onClose,
  lang,
  isDark,
}: {
  open: boolean;
  intensity: Intensity;
  onSelect: (v: Intensity) => void;
  onClose: () => void;
  lang: string;
  isDark: boolean;
}) => {
  const title = lang === 'es' ? 'Intensidad del día' : lang === 'en' ? 'Daily intensity' : 'Интенсивность';
  const subtitle = lang === 'es'
    ? 'Elige cuánto quieres estudiar hoy'
    : lang === 'en'
    ? 'Choose how much you want to study today'
    : 'Выбери, сколько учиться сегодня';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={cn(
              'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-3xl p-5 shadow-2xl border',
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={cn('font-bold text-base', isDark ? 'text-white' : 'text-slate-900')}>{title}</h3>
                <p className={cn('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>{subtitle}</p>
              </div>
              <button onClick={onClose} className={cn('p-1.5 rounded-xl transition-colors', isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {(Object.keys(INTENSITY_CONFIG) as Intensity[]).map((key) => {
                const cfg = INTENSITY_CONFIG[key];
                const selected = key === intensity;
                return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { playClickSound(); onSelect(key); onClose(); }}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all',
                      selected
                        ? isDark
                          ? 'bg-indigo-500/15 border-indigo-500/50 ring-1 ring-indigo-500/30'
                          : 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
                        : isDark
                          ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className="text-xl">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-sm font-semibold block', isDark ? 'text-white' : 'text-slate-900')}>
                        {cfg.label[lang] ?? cfg.label.en}
                      </span>
                      <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                        {cfg.desc[lang] ?? cfg.desc.en}
                      </span>
                    </div>
                    {selected && (
                      <motion.div
                        layoutId="intensity-check"
                        className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center"
                      >
                        <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <p className={cn('text-[10px] text-center mt-4', isDark ? 'text-slate-600' : 'text-slate-400')}>
              {lang === 'es' ? 'Más ajustes en Ajustes → Cockpit'
                : lang === 'en' ? 'More settings in Settings → Cockpit'
                : 'Подробнее в Настройки → Кокпит'}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Quest row ────────────────────────────────────────────────────────────────

const QuestRow = ({
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
  const progress = Math.min(quest.current_progress / quest.target_value, 1);
  const showBar = !quest.is_completed && quest.target_value > 1 && quest.current_progress > 0;
  const isClaiming = claimingId === quest.id;
  const canClaim = quest.is_completed && !quest.is_claimed;
  const route = getQuestRoute(quest.quest_id);

  const handleRowClick = () => {
    if (quest.is_completed) return;
    playClickSound();
    navigate(route);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: quest.is_claimed ? 0.4 : 1, y: 0 }}
      className={cn(
        'group flex items-start gap-3 py-3 border-b last:border-0 transition-colors duration-200 -mx-4 px-4',
        isDark ? 'border-white/[0.05]' : 'border-slate-100',
        !quest.is_completed && 'cursor-pointer hover:bg-slate-50/60 dark:hover:bg-white/[0.025] rounded-xl'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      <div className="mt-[1px]">
        <TrackCheckbox completed={quest.is_completed} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className={cn(
              'text-[13.5px] font-medium leading-snug block relative',
              quest.is_completed
                ? isDark ? 'text-slate-500' : 'text-slate-400'
                : isDark ? 'text-slate-200' : 'text-slate-800'
            )}>
              {/* Animated strikethrough */}
              <AnimatePresence>
                {quest.is_completed && (
                  <motion.span
                    key="strike"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none origin-left"
                  >
                    <span className={cn('w-full h-[1.5px] block', isDark ? 'bg-slate-600' : 'bg-slate-300')} />
                  </motion.span>
                )}
              </AnimatePresence>
              {label}
            </span>

            {/* Time estimate */}
            {minutes && !quest.is_completed && (
              <span className={cn(
                'flex items-center gap-1 mt-0.5 text-[11px] font-medium',
                isDark ? 'text-slate-500' : 'text-slate-400'
              )}>
                <Clock className="w-3 h-3" />
                {minutes} {lang === 'en' ? 'min' : lang === 'es' ? 'min' : 'мин'}
              </span>
            )}
          </div>

          {/* Right: reward or claim */}
          <div className="shrink-0 flex items-center mt-[1px]">
            {canClaim ? (
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.93 }}
                onClick={(e) => { e.stopPropagation(); onClaim(quest); }}
                disabled={!!claimingId}
                className={cn(
                  'h-6 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 transition-all',
                  'bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 hover:bg-amber-400/25',
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
                'text-[11px] font-semibold tabular-nums flex items-center gap-0.5',
                quest.is_claimed
                  ? 'text-slate-300 dark:text-slate-600 line-through'
                  : isDark ? 'text-slate-500' : 'text-slate-400'
              )}>
                <Zap className="w-2.5 h-2.5" />
                {quest.reward_sp}
              </span>
            )}

            {/* Arrow hint on hover for uncompleted */}
            {!quest.is_completed && !canClaim && (
              <ChevronRight className={cn(
                'w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-60 transition-opacity',
                isDark ? 'text-slate-400' : 'text-slate-400'
              )} />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <AnimatePresence>
          {showBar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-center gap-2"
            >
              <div className={cn('flex-1 h-[3px] rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-slate-200')}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-indigo-500"
                />
              </div>
              <span className={cn('text-[10px] font-semibold tabular-nums', isDark ? 'text-slate-500' : 'text-slate-400')}>
                {quest.current_progress}/{quest.target_value}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const TrackSkeleton = ({ isDark }: { isDark: boolean }) => (
  <div className="space-y-3 py-2">
    {[90, 70, 80].map((w, i) => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className={cn('w-[22px] h-[22px] rounded-full flex-shrink-0', isDark ? 'bg-slate-700' : 'bg-slate-200')} />
        <div className={cn('h-4 rounded-full', isDark ? 'bg-slate-700' : 'bg-slate-200')} style={{ width: `${w}%` }} />
      </div>
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

  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [intensity, setIntensity] = useState<Intensity>(() => {
    return (localStorage.getItem(INTENSITY_STORAGE_KEY) as Intensity) ?? 'standard';
  });

  const saveIntensity = useCallback((v: Intensity) => {
    setIntensity(v);
    localStorage.setItem(INTENSITY_STORAGE_KEY, v);
  }, []);

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
        const msg = language === 'es' ? `+${quest.reward_sp} SP obtenidos!`
          : language === 'en' ? `+${quest.reward_sp} SP earned!`
          : `+${quest.reward_sp} SP получено!`;
        toast.success(msg, { icon: <Sparkles className="w-4 h-4 text-amber-400" /> });

        setQuests((prev) => prev.map((q) => q.id === quest.id ? { ...q, is_claimed: true } : q));
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

        try {
          const spResult = await supabase.functions.invoke('season-sp', {
            body: { user_id: profileId, source_type: 'challenge_reward', metadata: { sp_earned: quest.reward_sp } },
          });
          queryClient.invalidateQueries({ queryKey: ['dashboard-data', profileId] });
          const newLevel = spResult.data?.level;
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

  const completedCount = quests.filter((q) => q.is_completed).length;
  const totalCount = quests.length;
  const allDone = !loading && completedCount === totalCount && totalCount > 0;

  const title = language === 'es' ? 'Misión de hoy' : language === 'en' ? "Today's track" : 'Трек на сегодня';
  const cfg = INTENSITY_CONFIG[intensity];
  const intensityLabel = cfg.label[language] ?? cfg.label.en;

  if (!loading && quests.length === 0) return null;

  return (
    <>
      <div className={cn(
        'rounded-3xl p-4 md:p-5 border flex flex-col h-full',
        isDark
          ? 'bg-slate-800/60 border-slate-700/60 backdrop-blur-sm'
          : 'bg-white border-slate-200/80 shadow-[0_20px_45px_rgba(0,0,0,0.06)]'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className={cn('text-base font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {title}
            </h3>
            {/* Done pill */}
            {!loading && totalCount > 0 && (
              <motion.span
                key={completedCount}
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums',
                  allDone
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                )}
              >
                {completedCount}/{totalCount}
              </motion.span>
            )}
          </div>

          {/* Intensity + settings button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => { playClickSound(); setModalOpen(true); }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all',
              isDark
                ? 'bg-slate-700/70 text-slate-300 hover:bg-slate-700 border border-slate-600/60'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            )}
          >
            <span>{cfg.icon}</span>
            <span>{intensityLabel}</span>
            <Settings2 className="w-3 h-3 opacity-60" />
          </motion.button>
        </div>

        {/* All-done banner */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium mb-3 overflow-hidden',
                isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              )}
            >
              <motion.span
                animate={{ rotate: [0, 15, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >🎉</motion.span>
              {language === 'es' ? '¡Todo listo! Vuelve mañana'
                : language === 'en' ? 'All done! See you tomorrow'
                : 'Все выполнено! Возвращайся завтра'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quest list */}
        <div className="flex-1">
          {loading ? (
            <TrackSkeleton isDark={isDark} />
          ) : (
            <motion.div layout className="flex flex-col">
              {quests.map((quest) => (
                <QuestRow
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
      </div>

      <IntensityModal
        open={modalOpen}
        intensity={intensity}
        onSelect={saveIntensity}
        onClose={() => setModalOpen(false)}
        lang={language}
        isDark={isDark}
      />
    </>
  );
};
