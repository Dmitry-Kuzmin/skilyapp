import { useEffect, useState, useContext } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { useModalRoute } from "@/hooks/useModalRoute";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { Trophy, Crown, Award, Star, Calendar, TrendingUp, ChevronLeft } from "lucide-react";
import { motion } from "@/components/optimized/Motion";
import { cn } from "@/lib/utils";
import { UserContext } from "@/contexts/UserContext";
import { RankBadge, RankFrame, type RankType } from "@/components/ranking/RankBadge";

interface Champion {
  season_id: number;
  season_name: string;
  season_number: number;
  position: number;
  user_id: string;
  profile: {
    first_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
    id: string;
  };
  final_duel_pass_level: number;
  final_duel_pass_xp: number;
  claimed_at: string;
}

export function HallOfFameView({ onBack }: { onBack: () => void }) {
  // КРИТИЧНО: Безопасное получение UserContext - не выбрасывает ошибку если провайдер отсутствует
  const userContext = useContext(UserContext);
  const profileId = userContext?.profileId ?? null;
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<Array<{ id: number; season_number: number; name_ru: string }>>([]);

  useEffect(() => {
    loadSeasons();
    loadChampions();
  }, []);

  const loadSeasons = async () => {
    try {
      const { data } = await supabase
        .from("duel_pass_seasons")
        .select("id, season_number, name_ru")
        .order("season_number", { ascending: false });

      if (data) {
        setSeasons(data as any[]);
        // Default to the most recent season that has champions, not just the latest season
        const { data: seasonWithChampions } = await supabase
          .from("user_leaderboard_rewards")
          .select("season_id")
          .order("season_id", { ascending: false })
          .limit(1)
          .single();

        if (seasonWithChampions) {
          setSelectedSeason(seasonWithChampions.season_id);
        } else if (data.length > 0) {
          setSelectedSeason((data as any[])[0].id);
        }
      }
    } catch (error) {
      console.error("[HallOfFameModal] Error loading seasons:", error);
    }
  };

  const loadChampions = async () => {
    setLoading(true);
    try {
      const { data: rewardsData, error } = await supabase
        .from("user_leaderboard_rewards")
        .select(`
          season_id,
          final_position,
          final_duel_pass_level,
          final_duel_pass_xp,
          claimed_at,
          user_id,
          profiles:user_id (
            first_name,
            username,
            photo_url,
            id
          )
        `)
        .lte("final_position", 10)
        .order("season_id", { ascending: false })
        .order("final_position", { ascending: true });

      if (error) throw error;

      const seasonIds = [...new Set(rewardsData?.map((r: any) => r.season_id) || [])];
      const { data: seasonsData } = await supabase
        .from("duel_pass_seasons")
        .select("id, season_number, name_ru")
        .in("id", seasonIds);

      const seasonsMap = new Map((seasonsData as any[])?.map((s: any) => [s.id, s]) || []);

      const championsList: Champion[] = (rewardsData || []).map((reward: any) => ({
        season_id: reward.season_id,
        season_name: seasonsMap.get(reward.season_id)?.name_ru || `Сезон ${seasonsMap.get(reward.season_id)?.season_number || reward.season_id}`,
        season_number: seasonsMap.get(reward.season_id)?.season_number || reward.season_id,
        position: reward.final_position,
        user_id: reward.user_id,
        profile: reward.profiles || {},
        final_duel_pass_level: reward.final_duel_pass_level,
        final_duel_pass_xp: reward.final_duel_pass_xp,
        claimed_at: reward.claimed_at,
      }));

      setChampions(championsList);
    } catch (error) {
      console.error("[HallOfFameModal] Error loading champions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Award className="w-5 h-5 text-orange-500" />;
    return <Star className="w-4 h-4 text-blue-500" />;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return "from-yellow-500/20 via-amber-500/20 to-yellow-600/20 border-yellow-500/40";
    if (position === 2) return "from-gray-300/20 via-gray-200/20 to-gray-300/20 border-gray-300/40";
    if (position === 3) return "from-orange-500/20 via-amber-500/20 to-orange-600/20 border-orange-500/40";
    return "from-blue-500/20 via-cyan-500/20 to-blue-600/20 border-blue-500/40";
  };

  const filteredChampions = selectedSeason
    ? champions.filter((c) => c.season_id === selectedSeason)
    : champions;

  const groupedBySeason = filteredChampions.reduce((acc, champion) => {
    if (!acc[champion.season_id]) {
      acc[champion.season_id] = [];
    }
    acc[champion.season_id].push(champion);
    return acc;
  }, {} as Record<number, Champion[]>);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 overflow-y-auto w-full"
    >
      <div className="space-y-6 py-4 px-4 sm:px-6">
        <header className="space-y-4 text-left relative flex flex-col pt-2">
          {/* Кнопка Назад и Плашка на одном уровне */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-slate-900/50 hover:bg-slate-800 text-white border border-white/5 backdrop-blur-md shrink-0 cursor-pointer"
              onClick={onBack}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 text-yellow-600 text-[10px] uppercase tracking-wider font-bold">
              <Trophy className="w-3 h-3" />
              Легенды сезонов
            </div>
          </div>

          <div className="flex flex-col pt-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 bg-clip-text text-transparent mb-2">
              Зал славы
            </h1>
            <p className="text-sm text-muted-foreground max-w-md">
              История чемпионов и элитных игроков, которые достигли вершин в Duel Pass
            </p>
          </div>
        </header>

        {/* Дополнительный контент */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5 space-y-3 bg-white/5 border-white/10 backdrop-blur-sm rounded-3xl">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h3 className="font-bold text-lg">Как попасть в Hall of Fame?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Держи высокий темп прокачки, не пропускай сезонные ивенты и используй бусты XP — стабильность даёт шанс попасть в топ.
            </p>
          </Card>

          <Card className="p-5 space-y-3 bg-white/5 border-white/10 backdrop-blur-sm rounded-3xl">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-lg">Элита Duel Pass</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              В Зал славы попадают только 10 лучших игроков каждого сезона. Их имена навсегда вписываются в историю, а аватары украшаются знаками отличия.
            </p>
          </Card>
        </div>

        {/* Фильтр по сезонам */}
        {seasons.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge
              variant={selectedSeason === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedSeason(null)}
            >
              Все сезоны
            </Badge>
            {seasons.map((season) => (
              <Badge
                key={season.id}
                variant={selectedSeason === season.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedSeason(season.id)}
              >
                {season.name_ru}
              </Badge>
            ))}
          </div>
        )}

        {/* Контент */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Загрузка...
          </div>
        ) : Object.keys(groupedBySeason).length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-lg font-bold mb-2">Пока нет чемпионов</h3>
            <p className="text-sm text-muted-foreground">
              Стань первым чемпионом сезона!
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBySeason)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([seasonId, seasonChampions]) => {
                const season = seasons.find((s) => s.id === Number(seasonId));
                const top3 = seasonChampions.filter((c) => c.position <= 3).sort((a, b) => a.position - b.position);
                const top10 = seasonChampions.filter((c) => c.position > 3).sort((a, b) => a.position - b.position);

                return (
                  <motion.div
                    key={seasonId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-xl font-bold">
                        {season?.name_ru || `Сезон ${seasonId}`}
                      </h2>
                      <Badge variant="secondary" className="text-xs">
                        {seasonChampions.length}
                      </Badge>
                    </div>

                    {/* Топ-3 */}
                    {top3.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {top3.map((champion, index) => {
                          const name = champion.profile?.first_name || champion.profile?.username || "Игрок";
                          const rank = champion.final_duel_pass_level >= 26 ? "diamond" :
                            champion.final_duel_pass_level >= 21 ? "platinum" :
                              champion.final_duel_pass_level >= 16 ? "gold" :
                                champion.final_duel_pass_level >= 11 ? "silver" :
                                  champion.final_duel_pass_level >= 6 ? "bronze" : "rookie";

                          return (
                            <Card
                              key={champion.user_id}
                              className={cn(
                                "p-4 border-2 bg-gradient-to-br relative overflow-hidden",
                                getPositionColor(champion.position),
                                champion.position === 1 && "sm:scale-105"
                              )}
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getPositionIcon(champion.position)}
                                    <span className="font-black text-base">#{champion.position}</span>
                                  </div>
                                  <RankBadge rank={rank as RankType} size="sm" variant="pill" />
                                </div>

                                <div className="flex items-center justify-center">
                                  <UserAvatar
                                    profileId={champion.profile?.id}
                                    size="xl"
                                    showPremiumGlow={champion.position === 1}
                                  />
                                </div>

                                <div className="text-center space-y-1">
                                  <h3 className="font-bold text-sm">{name}</h3>
                                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Уровень {champion.final_duel_pass_level}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {champion.final_duel_pass_xp.toLocaleString("ru-RU")} XP
                                  </p>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* Топ-10 (4-10) */}
                    {top10.length > 0 && (
                      <Card className="p-4">
                        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                          <Star className="w-4 h-4 text-blue-500" />
                          Элита топ-10
                        </h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {top10.map((champion) => {
                            const name = champion.profile?.first_name || champion.profile?.username || "Игрок";
                            return (
                              <div key={champion.user_id} className="text-center space-y-2">
                                <div className="relative inline-block">
                                  <UserAvatar
                                    profileId={champion.profile?.id}
                                    size="lg"
                                    showPremiumGlow={false}
                                  />
                                </div>
                                <div>
                                  <p className="font-semibold text-xs">{name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    #{champion.position}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

