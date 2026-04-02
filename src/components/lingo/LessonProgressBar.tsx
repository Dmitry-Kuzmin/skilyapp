import { Heart } from 'lucide-react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  current: number;       // 0-based current exercise index
  total: number;
  hearts: number;        // 0-3
  maxHearts?: number;
}

export function LessonProgressBar({ current, total, hearts, maxHearts = 3 }: Props) {
  const navigate = useNavigate();
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 w-full">
      {/* Exit button */}
      <button
        onClick={() => navigate('/lingo')}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X size={18} />
      </button>

      {/* Progress bar */}
      <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Hearts */}
      <div className="flex shrink-0 gap-0.5">
        {Array.from({ length: maxHearts }).map((_, i) => (
          <Heart
            key={i}
            size={18}
            className={i < hearts ? 'text-red-500 fill-red-500' : 'text-slate-700 fill-slate-700'}
          />
        ))}
      </div>
    </div>
  );
}
