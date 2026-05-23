import { useState, useRef, useEffect } from 'react';
import { Lock, Check, X, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LessonStatus = 'locked' | 'active' | 'completed';

export interface LessonNode {
  id: string;
  title: string;
  topic_number: number;
  type: string;
  status: LessonStatus;
  emoji?: string;
  lesson_count?: number;
}

interface SnakeLearningPathProps {
  lessons: LessonNode[];
  onStart?: (lessonId: string) => void;
  className?: string;
}

const NODE = 76;
const ROW = 132;
const PAD_TOP = 28;
const POPOVER_W = 248;

// Duolingo-like wide sine wave: period ~5 nodes, amplitude 55% of half-width
function offsetX(idx: number, halfWidth: number): number {
  return Math.sin(idx * (Math.PI / 2.5)) * halfWidth * 0.55;
}

function buildPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  return pts.reduce((d, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const my = ((prev.y + pt.y) / 2).toFixed(1);
    return `${d} C ${prev.x.toFixed(1)} ${my}, ${pt.x.toFixed(1)} ${my}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');
}

// Duolingo-inspired palette: [main, shadow/border-bottom]
const PALETTE: [string, string][] = [
  ['#58CC02', '#45A300'],  // green
  ['#FF4B4B', '#EA2929'],  // red
  ['#1CB0F6', '#0E9BD7'],  // blue
  ['#FF9600', '#D97E00'],  // orange
  ['#CE82FF', '#9B50D4'],  // purple
  ['#FF4B4B', '#EA2929'],
  ['#1CB0F6', '#0E9BD7'],
  ['#FF9600', '#D97E00'],
  ['#58CC02', '#45A300'],
  ['#CE82FF', '#9B50D4'],
];

const LOCKED_BG = '#1E293B';
const LOCKED_BORDER = '#0F172A';

export function SnakeLearningPath({ lessons, onStart, className }: SnakeLearningPathProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const half = width / 2;
  const totalHeight = PAD_TOP + lessons.length * ROW + 48;

  const centers = lessons.map((_, i) => ({
    x: half + offsetX(i, half),
    y: PAD_TOP + i * ROW + NODE / 2,
  }));

  const pathD = buildPath(centers);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full select-none', className)}
      style={{ height: totalHeight }}
      onClick={() => setOpenId(null)}
    >
      {/* Path track */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        width={width}
        height={totalHeight}
        style={{ overflow: 'visible' }}
      >
        {/* Wide soft glow behind path */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(88,204,2,0.04)"
          strokeWidth={NODE + 28}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dashed road */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(100,116,139,0.20)"
          strokeWidth={5}
          strokeDasharray="14 10"
          strokeLinecap="round"
        />
      </svg>

      {/* Nodes */}
      {lessons.map((lesson, i) => {
        const { x, y } = centers[i];
        const isOpen = openId === lesson.id;
        const [main, shadow] = lesson.status === 'completed'
          ? ['#58CC02', '#45A300']
          : lesson.status === 'active'
            ? PALETTE[i % PALETTE.length]
            : [LOCKED_BG, LOCKED_BORDER];

        const isActive = lesson.status === 'active';
        const isCompleted = lesson.status === 'completed';
        const isLocked = lesson.status === 'locked';

        const clampedX = Math.max(POPOVER_W / 2, Math.min(x, width - POPOVER_W / 2));
        const popoverShift = clampedX - x;

        return (
          <div
            key={lesson.id}
            className="absolute"
            style={{
              left: x - NODE / 2,
              top: y - NODE / 2,
              zIndex: isOpen ? 100 : 1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pulse ring for active */}
            {isActive && (
              <div
                className="absolute animate-ping rounded-full pointer-events-none"
                style={{
                  top: -14,
                  left: -14,
                  width: NODE + 28,
                  height: NODE + 28,
                  borderRadius: '50%',
                  backgroundColor: main + '28',
                }}
              />
            )}
            {/* Static outer ring */}
            {isActive && (
              <div
                className="absolute pointer-events-none"
                style={{
                  top: -7,
                  left: -7,
                  width: NODE + 14,
                  height: NODE + 14,
                  borderRadius: '50%',
                  border: `3px solid ${main}50`,
                }}
              />
            )}

            {/* Main node button */}
            <button
              title={lesson.title}
              disabled={isLocked}
              onClick={() => isActive && setOpenId(isOpen ? null : lesson.id)}
              className={cn(
                'relative flex items-center justify-center outline-none transition-transform duration-150',
                isActive && 'hover:scale-110 active:scale-95 cursor-pointer',
                isCompleted && 'hover:scale-105 active:scale-95 cursor-pointer',
                isLocked && 'cursor-not-allowed',
              )}
              style={{
                width: NODE,
                height: NODE,
                borderRadius: '50%',
                backgroundColor: main,
                borderBottom: `5px solid ${shadow}`,
                boxShadow: isActive
                  ? `0 0 24px ${main}55, 0 3px 10px rgba(0,0,0,0.4)`
                  : '0 3px 8px rgba(0,0,0,0.3)',
              }}
            >
              {isLocked && (
                <>
                  {lesson.emoji && (
                    <span
                      style={{ fontSize: 24, opacity: 0.2, position: 'absolute' }}
                    >
                      {lesson.emoji}
                    </span>
                  )}
                  <Lock className="w-6 h-6 relative z-10" style={{ color: '#475569' }} />
                </>
              )}

              {isActive && (
                <>
                  {lesson.emoji
                    ? <span style={{ fontSize: 30, lineHeight: 1 }}>{lesson.emoji}</span>
                    : <Sparkles className="w-8 h-8 text-white" />
                  }
                </>
              )}

              {isCompleted && (
                <>
                  {lesson.emoji
                    ? <span style={{ fontSize: 28, lineHeight: 1 }}>{lesson.emoji}</span>
                    : <Check className="w-8 h-8 text-white" strokeWidth={3} />
                  }
                  {lesson.emoji && (
                    <span
                      className="absolute flex items-center justify-center rounded-full"
                      style={{
                        bottom: -1,
                        right: -1,
                        width: 22,
                        height: 22,
                        backgroundColor: 'white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      <Check style={{ width: 12, height: 12, color: '#58CC02' }} strokeWidth={3.5} />
                    </span>
                  )}
                </>
              )}

              {/* Number badge */}
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: '#0f172a',
                  color: 'rgba(255,255,255,0.55)',
                  border: '2px solid rgba(255,255,255,0.08)',
                }}
              >
                {lesson.topic_number}
              </span>
            </button>

            {/* Popover */}
            {isActive && isOpen && (
              <div
                role="dialog"
                aria-label={lesson.title}
                className="absolute z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150"
                style={{
                  width: POPOVER_W,
                  bottom: `calc(100% + 18px)`,
                  left: '50%',
                  transform: `translateX(calc(-50% + ${popoverShift}px))`,
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Color accent strip */}
                <div style={{ height: 5, backgroundColor: main }} />

                <div
                  style={{
                    backgroundColor: 'hsl(var(--card))',
                    padding: '14px 16px 16px',
                  }}
                >
                  {/* Arrow */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      bottom: -9,
                      left: `calc(50% - ${popoverShift}px - 8px)`,
                      width: 16,
                      height: 16,
                      backgroundColor: 'hsl(var(--card))',
                      transform: 'rotate(45deg)',
                      borderRight: '1px solid rgba(255,255,255,0.06)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  />

                  <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                    {lesson.emoji && (
                      <span
                        style={{
                          fontSize: 30,
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          backgroundColor: main + '22',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {lesson.emoji}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: main,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 3,
                      }}>
                        Модуль {lesson.topic_number}
                      </p>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'hsl(var(--foreground))',
                        lineHeight: 1.35,
                      }}>
                        {lesson.title}
                      </p>
                      {lesson.lesson_count != null && (
                        <p style={{
                          fontSize: 11,
                          color: 'hsl(var(--muted-foreground))',
                          marginTop: 4,
                        }}>
                          {lesson.lesson_count} {
                            lesson.lesson_count === 1 ? 'урок' :
                            lesson.lesson_count < 5 ? 'урока' : 'уроков'
                          }
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setOpenId(null)}
                      style={{
                        flexShrink: 0,
                        color: 'hsl(var(--muted-foreground))',
                        padding: 4,
                        marginTop: -2,
                      }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>

                  <button
                    onClick={() => { onStart?.(lesson.id); setOpenId(null); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '12px 0',
                      borderRadius: 12,
                      backgroundColor: main,
                      borderBottom: `4px solid ${shadow}`,
                      color: 'white',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    Начать урок
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
