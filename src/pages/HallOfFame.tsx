import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
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

const HallOfFame = () => {
  const { profileId } = useUserContext();
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
        setSeasons(data);
        if (data.length > 0) {
          setSelectedSeason(data[0].id);
        }
      }
    } catch (error) {
      console.error("[HallOfFame] Error loading seasons:", error);
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

      // Загружаем информацию о сезонах
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
      console.error("[HallOfFame] Error loading champions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (position === 2) return <Award className="w-6 h-6 text-gray-400" />;
    if (position === 3) return <Award className="w-6 h-6 text-orange-500" />;
    return <Star className="w-5 h-5 text-blue-500" />;
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
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="space-y-3 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 text-yellow-600 text-sm font-semibold">
              <Trophy className="w-4 h-4" />
              Зал славы
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Легенды сезонов
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              История чемпионов и элитных игроков, которые достигли вершин в Duel Pass
            </p>
          </header>

          {/* Дополнительный контент для тестирования макета */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-yellow-500" />
                <h3 className="text-xl font-bold">Как попасть в Зал славы?</h3>
              </div>
              <p className="text-muted-foreground">
                Секрет прост: стабильно держи высокий темп прокачки Duel Pass, выполняй
                ежедневные задания и не пропускай сезонные события. Чем больше твоё
                финальное место и уровень, тем выше шанс оказаться среди легенд.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Тренируйся ежедневно, чтобы не выпадать из топ-10</li>
                <li>• Используй бусты опыта и сезонные наборы</li>
                <li>• Следи за уведомлениями о двойном XP</li>
              </ul>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="text-xl font-bold">Мини-аналитика сезонов</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border p-3">
                  <p className="text-muted-foreground">Средний уровень топ-3</p>
                  <p className="text-2xl font-black text-emerald-500">24</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-muted-foreground">Максимальное XP</p>
                  <p className="text-2xl font-black text-primary">1.2M</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-muted-foreground">Средний прогресс</p>
                  <p className="text-2xl font-black text-sky-500">87%</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-muted-foreground">Игроков с легендарным титулом</p>
                  <p className="text-2xl font-black text-rose-500">42</p>
                </div>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <h4 className="text-lg font-semibold mb-3">FAQ</h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Сколько длится один сезон?</p>
                  <p>В среднем 6–8 недель. Но бывают короткие «ивент-сезоны».</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Можно ли вернуться после падения?</p>
                  <p>Да! Даже если ты выпал из топа, достаточно серии побед, чтобы вернуться.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Что получают чемпионы?</p>
                  <p>Редкие скины, повышенный рейтинг профиля и упоминание в Hall of Fame.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <h4 className="text-lg font-semibold mb-4">«Маршрут чемпиона»</h4>
              <div className="flex flex-col gap-4">
                {[
                  { title: "Старт сезона", desc: "Быстро закрывай первые уровни задачами на 15–20 минут в день." },
                  { title: "Середина", desc: "Подключай командные ивенты, чтобы получить +25% к набранному опыту." },
                  { title: "Финиш", desc: "Фокус на метриках: XP, winrate, streak. Любое падение компенсируй бустами." },
                ].map((step, index) => (
                  <div key={step.title} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

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

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Загрузка...
            </div>
          ) : Object.keys(groupedBySeason).length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-bold mb-2">Пока нет чемпионов</h3>
              <p className="text-muted-foreground">
                Стань первым чемпионом сезона!
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
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
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-2xl font-bold">
                          {season?.name_ru || `Сезон ${seasonId}`}
                        </h2>
                        <Badge variant="secondary">
                          {seasonChampions.length} чемпионов
                        </Badge>
                      </div>

                      {/* Топ-3 */}
                      {top3.length > 0 && (
                        <div className="grid md:grid-cols-3 gap-4">
                          {top3.map((champion, index) => {
                            const name = champion.profile?.first_name || champion.profile?.username || "Игрок";
                            const rank = champion.final_duel_pass_level >= 26 ? "diamond" : 
                                        champion.final_duel_pass_level >= 21 ? "platinum" :
                                        champion.final_duel_pass_level >= 16 ? "gold" :
                                        champion.final_duel_pass_level >= 11 ? "silver" :
                                        champion.final_duel_pass_level >= 6 ? "bronze" : "rookie";

                            return (
                              <motion.div
                                key={champion.user_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                              >
                                <Card
                                  className={cn(
                                    "p-6 border-2 bg-gradient-to-br relative overflow-hidden",
                                    getPositionColor(champion.position),
                                    champion.position === 1 && "md:scale-105"
                                  )}
                                >
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-16 -mt-16" />
                                  
                                  <div className="relative z-10 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {getPositionIcon(champion.position)}
                                        <span className="font-black text-lg">#{champion.position}</span>
                                      </div>
                                      <RankBadge rank={rank as RankType} size="sm" variant="pill" />
                                    </div>

                                    <div className="flex items-center justify-center">
                                      <div className="relative">
                                        <RankFrame rank={rank as RankType} />
                                        <Avatar className="w-20 h-20 border-4 border-primary/30">
                                          <AvatarImage src={champion.profile?.photo_url} alt={name} />
                                          <AvatarFallback className="font-bold text-xl">
                                            {name[0].toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      </div>
                                    </div>

                                    <div className="text-center space-y-2">
                                      <h3 className="font-bold text-lg">{name}</h3>
                                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>Уровень {champion.final_duel_pass_level}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {champion.final_duel_pass_xp.toLocaleString("ru-RU")} XP
                                      </p>
                                    </div>
                                  </div>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}

                      {/* Топ-10 (4-10) */}
                      {top10.length > 0 && (
                        <Card className="p-6">
                          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-blue-500" />
                            Элита топ-10
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {top10.map((champion) => {
                              const name = champion.profile?.first_name || champion.profile?.username || "Игрок";
                              return (
                                <div key={champion.user_id} className="text-center space-y-2">
                                  <div className="relative inline-block">
                                    <RankFrame rank="silver" />
                                    <Avatar className="w-16 h-16 border-2 border-blue-400/30">
                                      <AvatarImage src={champion.profile?.photo_url} alt={name} />
                                      <AvatarFallback className="font-bold">
                                        {name[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{name}</p>
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
      </div>
    </Layout>
  );
};

export default HallOfFame;

