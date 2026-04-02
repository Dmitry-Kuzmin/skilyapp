import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, Play, Zap, BookOpen, ChevronRight } from 'lucide-react';
import { useLingoCourse } from '@/hooks/useLingoCourse';
import { LINGO_CHAPTERS, getNextLesson } from '@/data/lingo';
import { PageSkeleton } from '@/components/PageSkeleton';

/** Light-theme accent colors per chapter */
const CHAPTER_COLORS: Record<string, {
  border: string;
  text: string;
  accent: string;
  accentBg: string;
  progressBg: string;
  iconBg: string;
}> = {
  ch1: { border: 'border-t-blue-500', text: 'text-blue-600', accent: 'bg-blue-500', accentBg: 'bg-blue-50', progressBg: 'bg-blue-500', iconBg: 'bg-blue-100 text-blue-600' },
  ch2: { border: 'border-t-emerald-500', text: 'text-emerald-600', accent: 'bg-emerald-500', accentBg: 'bg-emerald-50', progressBg: 'bg-emerald-500', iconBg: 'bg-emerald-100 text-emerald-600' },
  ch3: { border: 'border-t-amber-500', text: 'text-amber-600', accent: 'bg-amber-500', accentBg: 'bg-amber-50', progressBg: 'bg-amber-500', iconBg: 'bg-amber-100 text-amber-600' },
  ch4: { border: 'border-t-purple-500', text: 'text-purple-600', accent: 'bg-purple-500', accentBg: 'bg-purple-50', progressBg: 'bg-purple-500', iconBg: 'bg-purple-100 text-purple-600' },
  ch5: { border: 'border-t-red-500', text: 'text-red-600', accent: 'bg-red-500', accentBg: 'bg-red-50', progressBg: 'bg-red-500', iconBg: 'bg-red-100 text-red-600' },
  ch6: { border: 'border-t-orange-500', text: 'text-orange-600', accent: 'bg-orange-500', accentBg: 'bg-orange-50', progressBg: 'bg-orange-500', iconBg: 'bg-orange-100 text-orange-600' },
};

function getColors(chId: string) {
  return CHAPTER_COLORS[chId] ?? CHAPTER_COLORS.ch1;
}

export default function LingoPage() {
  const navigate = useNavigate();
  const { isLoading, chapterStates, completedIds, totalXP, completedLessons, totalLessons } =
    useLingoCourse();

  if (isLoading) return <PageSkeleton />;

  const pctDone = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 px-4 pt-6 pb-5">
        <div className="max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Авто-Испанский</h1>
          <p className="text-gray-400 text-sm">
            Язык экзамена DGT за 30 уроков
          </p>

          {/* Stats strip */}
          <div className="mt-4 flex gap-2.5">
            <div className="flex-1 rounded-2xl bg-white border border-gray-100 shadow-sm p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Zap size={16} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-gray-900 font-bold text-sm">{totalXP}</p>
                <p className="text-gray-400 text-[10px]">XP</p>
              </div>
            </div>
            <div className="flex-1 rounded-2xl bg-white border border-gray-100 shadow-sm p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <BookOpen size={16} className="text-blue-500" />
              </div>
              <div>
                <p className="text-gray-900 font-bold text-sm">{completedLessons}/{totalLessons}</p>
                <p className="text-gray-400 text-[10px]">уроков</p>
              </div>
            </div>
            <div className="flex-1 rounded-2xl bg-white border border-gray-100 shadow-sm p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                <span className="text-sm">🎯</span>
              </div>
              <div>
                <p className="text-gray-900 font-bold text-sm">{pctDone}%</p>
                <p className="text-gray-400 text-[10px]">готово</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div className="px-4 pt-5 max-w-sm mx-auto flex flex-col gap-5">
        {chapterStates.map((chapter, chIdx) => {
          const nextLesson = getNextLesson(chapter.id, completedIds);
          const isFullyDone = chapter.doneCount === chapter.lessons.length;
          const colors = getColors(chapter.id);

          return (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: chIdx * 0.07 }}
              className={[
                'rounded-3xl bg-white shadow-sm border border-gray-100 overflow-hidden border-t-4',
                chapter.unlocked ? colors.border : 'border-t-gray-200',
                !chapter.unlocked && 'opacity-60',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Chapter header */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${chapter.unlocked ? colors.iconBg : 'bg-gray-100 text-gray-400'}`}>
                      {chapter.emoji}
                    </div>
                    <div>
                      <p className={`font-bold text-base ${chapter.unlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                        {chapter.title}
                      </p>
                      <p className="text-gray-400 text-xs">
                        Глава {chIdx + 1} · {chapter.lessons.length} уроков
                      </p>
                    </div>
                  </div>
                  {!chapter.unlocked && (
                    <Lock size={18} className="text-gray-300 shrink-0" />
                  )}
                  {isFullyDone && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle size={18} className="text-emerald-500" />
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {chapter.unlocked && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className={`font-semibold ${colors.text}`}>
                        {chapter.doneCount}/{chapter.lessons.length}
                      </span>
                      <span className="text-gray-400">
                        {Math.round(chapter.progress * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.progressBg} transition-all duration-700`}
                        style={{ width: `${chapter.progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA button */}
                {chapter.unlocked && !isFullyDone && nextLesson && (
                  <button
                    onClick={() => navigate(`/lingo/lesson/${nextLesson.id}`)}
                    className={`mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm text-white active:scale-[0.97] transition-transform shadow-md ${colors.accent}`}
                  >
                    <Play size={16} className="fill-white" />
                    {chapter.doneCount === 0 ? 'Начать главу' : 'Продолжить'}
                  </button>
                )}

                {isFullyDone && (
                  <button
                    onClick={() => navigate(`/lingo/lesson/${chapter.lessons[0].id}`)}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-3 border-2 border-gray-200 text-gray-500 text-sm font-semibold active:bg-gray-50 transition-colors"
                  >
                    Повторить
                    <ChevronRight size={14} />
                  </button>
                )}

                {!chapter.unlocked && (
                  <p className="mt-4 text-center text-gray-400 text-xs">
                    Пройди предыдущую главу чтобы разблокировать
                  </p>
                )}
              </div>

              {/* Lessons list */}
              {chapter.unlocked && (
                <div className="border-t border-gray-100">
                  {chapter.lessons.map((lesson, lIdx) => {
                    const isNext = nextLesson?.id === lesson.id && !lesson.completed;
                    const isLocked =
                      !lesson.completed &&
                      lIdx > 0 &&
                      !chapter.lessons[lIdx - 1].completed;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          if (!isLocked) navigate(`/lingo/lesson/${lesson.id}`);
                        }}
                        disabled={isLocked}
                        className={[
                          'w-full flex items-center gap-3 px-5 py-3.5 text-left border-b border-gray-50 last:border-0 transition-colors',
                          isLocked && 'opacity-35 cursor-not-allowed',
                          !isLocked && 'hover:bg-gray-50 active:bg-gray-50',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {/* Status icon */}
                        <div
                          className={[
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold',
                            lesson.completed
                              ? 'bg-emerald-100 text-emerald-600'
                              : isNext
                              ? `${colors.accent} text-white shadow-sm`
                              : 'bg-gray-100 text-gray-400',
                          ].join(' ')}
                        >
                          {lesson.completed ? (
                            <CheckCircle size={16} />
                          ) : isLocked ? (
                            <Lock size={14} />
                          ) : isNext ? (
                            <Play size={14} className="fill-white" />
                          ) : (
                            <span className="text-xs">{lIdx + 1}</span>
                          )}
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={[
                              'font-semibold text-sm',
                              lesson.completed
                                ? 'text-gray-400'
                                : isNext
                                ? 'text-gray-900'
                                : 'text-gray-500',
                            ].join(' ')}
                          >
                            {lesson.emoji} {lesson.title}
                          </p>
                        </div>

                        {/* Stars */}
                        {lesson.completed && lesson.stars > 0 && (
                          <div className="flex gap-0.5 shrink-0">
                            {[1, 2, 3].map((n) => (
                              <span
                                key={n}
                                className={`text-sm ${n <= lesson.stars ? 'text-yellow-400' : 'text-gray-200'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="h-6" />
    </div>
  );
}
