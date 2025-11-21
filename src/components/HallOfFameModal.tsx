import { useEffect, useState } from "react";
import { InstagramBottomSheet } from "@/components/ui/instagram-bottom-sheet";
import { useModalRoute } from "@/hooks/useModalRoute";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Award, Star, Calendar, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
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
  };
  final_duel_pass_level: number;
  final_duel_pass_xp: number;
  claimed_at: string;
}

export function HallOfFameModal() {
  const { isOpen, closeModal } = useModalRoute('hall-of-fame');
  const { profileId } = useUserContext();
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<Array<{ id: number; season_number: number; name_ru: string }>>([]);

  // Отладка
  useEffect(() => {
    console.log('[HallOfFameModal] isOpen:', isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadSeasons();
      loadChampions();
    }
  }, [isOpen]);

  const loadSeasons = async () => {
    try {
      const { data } = await supabase
        .from("duel_pass_seasons")
        .select("id, season_number, name_ru")
        .order("season_number", { ascending: false });

      if (data) {
        setSeasons(data);
        if (data.length > 0) {
          setSelectedSeason(data[0].id);
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
            photo_url
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

      const seasonsMap = new Map(seasonsData?.map((s) => [s.id, s]) || []);

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
    <InstagramBottomSheet
      open={isOpen}
      onOpenChange={(open) => !open && closeModal()}
      title="Зал славы"
      snapPoints={['55%', '95%']}
      initialSnap={0}
    >
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 text-yellow-600 text-xs font-semibold">
            <Trophy className="w-3 h-3" />
            Легенды сезонов
          </div>
          <p className="text-sm text-muted-foreground">
            История чемпионов и элитных игроков, которые достигли вершин в Duel Pass
          </p>
        </div>

        {/* Дополнительный контент для тестирования */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <h3 className="font-semibold text-base">Как попасть в Hall of Fame?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Держи высокий темп прокачки, не пропускай сезонные ивенты и используй бусты XP — стабильность даёт шанс попасть в топ.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 border-t border-border/50 pt-2">
              <li>• Выполняй ежедневные задания для ускорения прогресса</li>
              <li>• Подключай бусты и наборы за дуэльные монеты</li>
              <li>• Финальные недели сезона решают всё — увеличь активность</li>
            </ul>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-base">Мини-аналитика топа</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border p-2">
                <p className="text-muted-foreground mb-1">Средний уровень топ-3</p>
                <p className="text-xl font-black text-emerald-500">24</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-muted-foreground mb-1">Максимальное XP</p>
                <p className="text-xl font-black text-primary">1.2M</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-muted-foreground mb-1">Игроков с легендарным титулом</p>
                <p className="text-xl font-black text-sky-500">42</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-muted-foreground mb-1">Рекорд серии побед</p>
                <p className="text-xl font-black text-rose-500">18</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4 space-y-3">
          <h4 className="font-semibold text-base">Маршрут чемпиона</h4>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <p className="text-foreground font-medium">Старт сезона</p>
                <p>Сконцентрируйся на ежедневных заданиях и удвоенных XP акциях.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <p className="text-foreground font-medium">Середина</p>
                <p>Подключай дуэли и командные события, чтобы удержаться в топе.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <p className="text-foreground font-medium">Финиш</p>
                <p>Следи за рейтингом, бусти опыт и закрывай пропущенные задачи.</p>
              </div>
            </div>
          </div>
        </Card>

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
                                  <div className="relative">
                                    <RankFrame rank={rank as RankType} />
                                    <Avatar className="w-16 h-16 border-4 border-primary/30">
                                      <AvatarImage src={champion.profile?.photo_url} alt={name} />
                                      <AvatarFallback className="font-bold">
                                        {name[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
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
                                  <RankFrame rank="silver" />
                                  <Avatar className="w-12 h-12 border-2 border-blue-400/30">
                                    <AvatarImage src={champion.profile?.photo_url} alt={name} />
                                    <AvatarFallback className="font-bold text-sm">
                                      {name[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
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
    </InstagramBottomSheet>
  );
}

