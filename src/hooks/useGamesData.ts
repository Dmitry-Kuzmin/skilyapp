import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GamesStats {
  gamesPlayed: number;
  studiedTerms: number;
  averageResult: number;
}

interface OnlinePlayer {
  id: string;
  name: string;
  photoUrl: string | null;
  initials: string;
}

const fallbackPlayers: OnlinePlayer[] = [
  { id: "fallback-1", name: "Lola", photoUrl: null, initials: "LO" },
  { id: "fallback-2", name: "David", photoUrl: null, initials: "DA" },
  { id: "fallback-3", name: "Inés", photoUrl: null, initials: "IN" },
];

// ОПТИМИЗАЦИЯ: React Query hook для статистики игр
export const useGamesStats = (profileId: string | null) => {
  return useQuery<GamesStats>({
    queryKey: ['games-stats', profileId],
    queryFn: async () => {
      if (!profileId) {
        return { gamesPlayed: 0, studiedTerms: 0, averageResult: 0 };
      }

      // Параллельно загружаем все данные
      const [gamesResult, termsResult, avgResult] = await Promise.all([
        // Количество игр
        supabase
          .from('game_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profileId),
        
        // Изученные термины
        supabase
          .from('user_term_progress')
          .select('term_id', { count: 'exact', head: true })
          .eq('user_id', profileId)
          .gte('times_practiced', 3),
        
        // Средний результат
        supabase
          .from('game_sessions')
          .select('score, total_questions')
          .eq('user_id', profileId)
          .not('total_questions', 'is', null)
          .gt('total_questions', 0),
      ]);

      const gamesPlayed = gamesResult.count || 0;
      const studiedTerms = termsResult.count || 0;

      // Вычисляем средний результат
      let averageResult = 0;
      if (avgResult.data && avgResult.data.length > 0) {
        const totalCorrect = avgResult.data.reduce((sum, session) => sum + (session.score || 0), 0);
        const totalQuestions = avgResult.data.reduce((sum, session) => sum + (session.total_questions || 0), 0);
        averageResult = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      }

      return { gamesPlayed, studiedTerms, averageResult };
    },
    enabled: !!profileId,
    staleTime: 30 * 1000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// ОПТИМИЗАЦИЯ: React Query hook для онлайн игроков
export const useOnlinePlayers = () => {
  return useQuery<{ players: OnlinePlayer[]; count: number }>({
    queryKey: ['online-players'],
    queryFn: async () => {
      try {
        // Получаем текущее время минус 15 минут
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        
        // ОПТИМИЗАЦИЯ: Делаем только один запрос
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, username, photo_url, last_login')
          .gte('last_login', fifteenMinutesAgo)
          .order('last_login', { ascending: false })
          .limit(100);

        if (error) throw error;

        const actualCount = data?.length || 0;
        
        // Форматируем первых 3 для отображения
        const formatted = (data || [])
          .slice(0, 3)
          .map((profile) => {
            const displayName = profile.first_name || profile.username || 'Player';
            return {
              id: profile.id,
              name: displayName,
              photoUrl: profile.photo_url,
              initials: displayName
                .split(' ')
                .map((part) => part.charAt(0))
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'PL',
            };
          });

        return {
          players: formatted.length > 0 ? formatted : fallbackPlayers,
          count: Math.max(actualCount, 10), // Минимум 10
        };
      } catch (error) {
        console.error('Error loading online players:', error);
        return {
          players: fallbackPlayers,
          count: 75,
        };
      }
    },
    staleTime: 60 * 1000, // 1 минута - онлайн игроки обновляются редко
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

