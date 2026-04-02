import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, Play, Zap, BookOpen, ChevronRight } from 'lucide-react';
import { useLingoCourse } from '@/hooks/useLingoCourse';
import { LINGO_CHAPTERS, getNextLesson } from '@/data/lingo';
import { PageSkeleton } from '@/components/PageSkeleton';

export default function LingoPage() {
  const navigate = useNavigate();
  const { isLoading, chapterStates, completedIds, totalXP, completedLessons, totalLessons } =
    useLingoCourse();

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">Авто-Испанский</h1>
          <p className="text-slate-400 text-sm">
            Язык экзамена DGT за 30 уроков
          </p>

          {/* Stats strip */}
          <div className="mt-4 flex gap-3">
            <div className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
              <Zap size={18} className="text-yellow-400" />
              <div>
                <p className="text-yellow-300 font-bold text-sm">{totalXP} XP</p>
                <p className="text-slate-600 text-xs">заработано</p>
              </div>
            </div>
            <div className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" />
              <div>
                <p className="text-blue-300 font-bold text-sm">{completedLessons}/{totalLessons}</p>
                <p className="text-slate-600 text-xs">уроков</p>
              </div>
            </div>
            <div className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
              <span className="text-base leading-none">🎯</span>
              <div>
                <p className="text-purple-300 font-bold text-sm">
                  {totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%
                </p>
                <p className="text-slate-600 text-xs">готово</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div className="px-4 max-w-sm mx-auto flex flex-col gap-6">
        {chapterStates.map((chapter, chIdx) => {
          const nextLesson = getNextLesson(chapter.id, completedIds);
          const isFullyDone = chapter.doneCount === chapter.lessons.length;

          return (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: chIdx * 0.08 }}
              className={[
                'rounded-2xl border overflow-hidden',
                chapter.unlocked ? chapter.color.border : 'border-white/10',
                chapter.unlocked ? chapter.color.bg : 'bg-slate-900',
              ].join(' ')}
            >
              {/* Chapter header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{chapter.emoji}</span>
                    <div>
                      <p
                        className={[
                          'font-bold text-base',
                          chapter.unlocked ? chapter.color.text : 'text-slate-600',
                        ].join(' ')}
                      >
                        {chapter.title}
                      </p>
                      <p className="text-slate-600 text-xs">
                        Глава {chIdx + 1} · {chapter.lessons.length} уроков
                      </p>
                    </div>
                  </div>
                  {!chapter.unlocked && (
                    <Lock size={18} className="text-slate-600 shrink-0" />
                  )}
                  {isFullyDone && (
                    <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                  )}
                </div>

                {/* Progress bar */}
                {chapter.unlocked && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={chapter.color.text}>{chapter.doneCount}/{chapter.lessons.length}</span>
                      <span className="text-slate-600">
                        {Math.round(chapter.progress * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${chapter.color.accent} transition-all duration-700`}
                        style={{ width: `${chapter.progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Start / Continue button */}
                {chapter.unlocked && !isFullyDone && nextLesson && (
                  <button
                    onClick={() => navigate(`/lingo/lesson/${nextLesson.id}`)}
                    className={[
                      'mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm text-white transition-opacity active:opacity-80',
                      chapter.color.accent,
                    ].join(' ')}
                  >
                    <Play size={16} className="fill-white" />
                    {chapter.doneCount === 0 ? 'Начать главу' : 'Продолжить'}
                  </button>
                )}

                {isFullyDone && (
                  <button
                    onClick={() => navigate(`/lingo/lesson/${chapter.lessons[0].id}`)}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 border border-white/10 text-slate-400 text-sm font-medium"
                  >
                    Повторить
                    <ChevronRight size={14} />
                  </button>
                )}

                {!chapter.unlocked && (
                  <p className="mt-3 text-center text-slate-700 text-xs">
                    Пройди предыдущую главу чтобы разблокировать
                  </p>
                )}
              </div>

              {/* Lessons list (only for unlocked) */}
              {chapter.unlocked && (
                <div className="border-t border-white/5">
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
                          'w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/5 last:border-0 transition-colors',
                          isLocked && 'opacity-40 cursor-not-allowed',
                          !isLocked && 'hover:bg-white/5 active:bg-white/5',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {/* Status icon */}
                        <div
                          className={[
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm',
                            lesson.completed
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isNext
                              ? `${chapter.color.accent} text-white`
                              : 'bg-white/5 text-slate-600',
                          ].join(' ')}
                        >
                          {lesson.completed ? (
                            <CheckCircle size={16} />
                          ) : isLocked ? (
                            <Lock size={14} />
                          ) : isNext ? (
                            <Play size={14} className="fill-white" />
                          ) : (
                            <span className="text-xs font-bold">{lIdx + 1}</span>
                          )}
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={[
                              'font-medium text-sm',
                              lesson.completed
                                ? 'text-slate-400'
                                : isNext
                                ? 'text-white'
                                : 'text-slate-500',
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
                                className={n <= lesson.stars ? 'text-yellow-400' : 'text-slate-700'}
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

      {/* Bottom padding for nav */}
      <div className="h-6" />
    </div>
  );
}
