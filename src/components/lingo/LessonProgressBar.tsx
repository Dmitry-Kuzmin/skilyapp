import { Heart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  current: number;
  total: number;
  hearts: number;
  maxHearts?: number;
}

export function LessonProgressBar({ current, total, hearts, maxHearts = 3 }: Props) {
  const navigate = useNavigate();
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
        <button
          onClick={() => navigate('/lingo')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:bg-gray-100"
        >
          <X size={18} />
        </button>

        <div className="flex-1">
          <div className="mb-2 flex items-center justify-end">
            <p className="text-xs font-semibold text-gray-500 whitespace-nowrap">
              {current + 1} / {total}
            </p>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 gap-0.5 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1.5">
          {Array.from({ length: maxHearts }).map((_, i) => (
            <Heart
              key={i}
              size={16}
              className={i < hearts ? 'text-red-500 fill-red-500' : 'text-gray-200 fill-gray-200'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
