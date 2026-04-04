import { AlertTriangle, CheckCircle2, Info, Lightbulb } from 'lucide-react';
import type { ExerciseInsight } from '@/data/lingo/types';

const TONE_STYLES: Record<
  NonNullable<ExerciseInsight['tone']>,
  { wrapper: string; iconBg: string; icon: typeof Info }
> = {
  info: {
    wrapper: 'border-sky-200 bg-[linear-gradient(180deg,#f5fbff_0%,#eff8ff_100%)] text-sky-800',
    iconBg: 'bg-sky-100 text-sky-700',
    icon: Info,
  },
  tip: {
    wrapper: 'border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fef3c7_100%)] text-amber-800',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: Lightbulb,
  },
  warning: {
    wrapper: 'border-rose-200 bg-[linear-gradient(180deg,#fff7f7_0%,#ffe8e8_100%)] text-rose-800',
    iconBg: 'bg-rose-100 text-rose-700',
    icon: AlertTriangle,
  },
  success: {
    wrapper: 'border-emerald-200 bg-[linear-gradient(180deg,#f2fff7_0%,#dcfce7_100%)] text-emerald-800',
    iconBg: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
  },
};

interface Props {
  insights?: ExerciseInsight[];
}

export function ExerciseInsights({ insights }: Props) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {insights.map((insight) => {
        const tone = insight.tone ?? 'info';
        const toneConfig = TONE_STYLES[tone];
        const Icon = toneConfig.icon;
        return (
          <div
            key={`${insight.label}-${insight.text}`}
            className={`rounded-[22px] border px-3.5 py-3 text-left shadow-sm ${toneConfig.wrapper}`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${toneConfig.iconBg}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
                  {insight.label}
                </p>
                <p className="mt-1 text-sm leading-5">{insight.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
