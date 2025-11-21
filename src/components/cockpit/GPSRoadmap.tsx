import { motion } from "framer-motion";
import { Send, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

interface GPSRoadmapProps {
  progress: number; // 0-100
  currentTopic?: string;
  accuracy?: number; // 0-100
  profileId?: string;
}

interface TopicData {
  id: string;
  number: number;
  title_ru: string;
  completed: boolean;
  isCurrent: boolean;
  progressPercent: number;
}

export function GPSRoadmap({
  progress,
  currentTopic,
  accuracy = 34,
  profileId,
}: GPSRoadmapProps) {
  const { profileId: contextProfileId } = useUserContext();
  const userId = profileId || contextProfileId;
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadTopics = async () => {
      try {
        // Загружаем все темы
        const { data: topicsData, error: topicsError } = await supabase
          .from("topics")
          .select("id, number, title_ru, order_index")
          .order("order_index", { ascending: true })
          .limit(15);

        if (topicsError) throw topicsError;

        if (!topicsData || topicsData.length === 0) {
          setLoading(false);
          return;
        }

        // Загружаем прогресс пользователя
        const topicIds = topicsData.map((t) => t.id);
        const { data: progressData } = await (supabase as any)
          .rpc("get_user_topics_progress_batch", {
            p_user_id: userId,
            p_topic_ids: topicIds,
          });

        const progressMap = new Map<string, any>();
        if (progressData && progressData.length > 0) {
          progressData.forEach((row: any) => {
            progressMap.set(row.topic_id, {
              completed: row.completed || false,
              progressPercent: Number(row.progress_percent) || 0,
            });
          });
        }

        // Формируем массив тем с прогрессом
        let currentIdx = 0;
        const topicsWithProgress: TopicData[] = topicsData.map((topic, index) => {
          const topicProgress = progressMap.get(topic.id) || {
            completed: false,
            progressPercent: 0,
          };

          // Первая тема всегда разблокирована, остальные - если предыдущая завершена
          const prevTopicProgress = index > 0 ? progressMap.get(topicsData[index - 1]?.id) : { completed: true };
          const isUnlocked = index === 0 || prevTopicProgress?.completed || false;

          // Текущая тема - первая незавершенная разблокированная
          const isCurrent = isUnlocked && !topicProgress.completed && 
            (index === 0 || progressMap.get(topicsData[index - 1]?.id)?.completed);
          
          if (isCurrent) {
            currentIdx = index;
          }

          return {
            id: topic.id,
            number: topic.number,
            title_ru: topic.title_ru,
            completed: topicProgress.completed,
            isCurrent: isCurrent,
            progressPercent: topicProgress.progressPercent,
          };
        });

        // Если все темы завершены, текущая - последняя
        if (topicsWithProgress.every((t) => t.completed)) {
          topicsWithProgress.forEach((t, idx) => {
            t.isCurrent = idx === topicsWithProgress.length - 1;
          });
          currentIdx = topicsWithProgress.length - 1;
        } else {
          // Убеждаемся, что только одна тема отмечена как текущая
          topicsWithProgress.forEach((t, idx) => {
            t.isCurrent = idx === currentIdx;
          });
        }

        setTopics(topicsWithProgress);
        setCurrentTopicIndex(currentIdx);
      } catch (error) {
        console.error("[GPSRoadmap] Error loading topics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, [userId]);

  // Если нет данных, показываем заглушку
  if (loading || topics.length === 0) {
    return (
      <div className="relative h-full min-h-[350px] bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden">
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-sm text-gray-400">Загрузка навигации...</div>
        </div>
      </div>
    );
  }

  // Рассчитываем позиции точек на горизонтальной линии (в процентах)
  const calculatePosition = (index: number, total: number) => {
    if (total === 1) return { x: 50, y: 50 };
    const t = index / Math.max(total - 1, 1);
    // Горизонтальная линия слева направо, слегка вверх
    const x = 10 + (t * 85); // 10% - 95% по ширине
    const y = 65 - (t * 10); // 65% - 55% по высоте (слегка вверх)
    return { x, y };
  };

  // Строим путь для SVG - горизонтальная пунктирная линия
  const buildPath = () => {
    if (topics.length < 2) return "";
    const first = calculatePosition(0, topics.length);
    const last = calculatePosition(topics.length - 1, topics.length);
    // Простая кривая через несколько контрольных точек для плавности
    const midY = (first.y + last.y) / 2;
    return `M ${first.x}% ${first.y}% Q ${(first.x + last.x) / 2}% ${midY - 5}% ${last.x}% ${last.y}%`;
  };

  const pathString = buildPath();

  return (
    <div className="relative h-full min-h-[350px] bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-slate-900">Navigation</h3>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          {Math.round(progress)}% complete
        </div>
      </div>

      {/* Route visualization */}
      <div className="relative flex-1 min-h-[220px]">
        {/* SVG Route Line - горизонтальная пунктирная линия */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ height: '220px' }}
          preserveAspectRatio="none"
        >
          {/* Background dashed line (full path) */}
          <motion.path
            d={pathString}
            fill="none"
            stroke="rgba(34, 197, 94, 0.3)"
            strokeWidth="2"
            strokeDasharray="8 4"
            vectorEffect="non-scaling-stroke"
          />
          {/* Animated progress line */}
          <motion.path
            d={pathString}
            fill="none"
            stroke="rgba(34, 197, 94, 1)"
            strokeWidth="2"
            strokeDasharray="8 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress / 100 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Accuracy Indicator (слева от текущей позиции) */}
        {currentTopicIndex >= 0 && accuracy > 0 && topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute z-20"
            style={{
              left: `${Math.max(calculatePosition(currentTopicIndex, topics.length).x - 18, 2)}%`,
              top: `${calculatePosition(currentTopicIndex, topics.length).y - 15}%`,
              transform: 'translateY(-50%)',
            }}
          >
            <div className="bg-gray-800 rounded-lg px-3 py-2 shadow-lg">
              <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5 font-semibold">ACCURACY</div>
              <div className="text-base font-bold text-white">{Math.round(accuracy)}%</div>
              <div className="absolute right-[-6px] top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full shadow-lg" style={{ boxShadow: '0 0 8px rgba(96, 165, 250, 0.8)' }} />
            </div>
          </motion.div>
        )}

        {/* Topic Markers */}
        {topics.slice(0, 7).map((topic, idx) => {
          const pos = calculatePosition(idx, Math.min(topics.length, 7));
          const isCurrent = topic.isCurrent;

          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05, type: "spring", stiffness: 200 }}
              className="absolute z-10 flex flex-col items-center"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Marker */}
              {isCurrent ? (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative"
                >
                  {/* Glowing effect */}
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-lg opacity-50 animate-pulse" />
                  {/* Teardrop marker - светящаяся голубая капля */}
                  <svg width="40" height="48" viewBox="0 0 24 32" className="relative z-10 drop-shadow-lg">
                    <defs>
                      <linearGradient id={`gradient-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
                      </linearGradient>
                      <filter id={`glow-${idx}`}>
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      d="M12 0C8 0 4 4 4 12c0 8 8 20 8 20s8-12 8-20c0-8-4-12-8-12z"
                      fill={`url(#gradient-${idx})`}
                      filter={`url(#glow-${idx})`}
                    />
                  </svg>
                </motion.div>
              ) : topic.completed ? (
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-400 shadow-lg" style={{ boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)' }} />
              ) : (
                <Circle className="w-6 h-6 text-gray-400 stroke-2 fill-none" />
              )}

              {/* Label */}
              <div
                className={`mt-2 text-[11px] font-medium text-center max-w-[80px] ${
                  isCurrent ? 'text-blue-600 font-semibold' : topic.completed ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {topic.title_ru || `Тема ${topic.number}`}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
