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
    <div className="flex items-center gap-3 px-4 py-3 w-full bg-white border-b border-gray-100">
      <button
        onClick={() => navigate('/lingo')}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
      >
        <X size={18} />
      </button>

      <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex shrink-0 gap-0.5">
        {Array.from({ length: maxHearts }).map((_, i) => (
          <Heart
            key={i}
            size={18}
            className={i < hearts ? 'text-red-500 fill-red-500' : 'text-gray-200 fill-gray-200'}
          />
        ))}
      </div>
    </div>
  );
}
