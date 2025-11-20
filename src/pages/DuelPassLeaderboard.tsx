import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Crown, Sparkles, Award, Star, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";
import { RankBadge, RankIcon, RankFrame, getRankFromLevel, type RankType } from "@/components/ranking/RankBadge";
import { motion } from "framer-motion";
import { LeaderboardRewardsModal } from "@/components/leaderboard/LeaderboardRewardsModal";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
  user_id: string;
  duel_pass_level: number;
  duel_pass_xp: number;
  rank?: string; // 'rookie', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'
  profile?: {
    first_name?: string | null;
    username?: string | null;
    photo_url?: string | null;
    avatar_url?: string | null;
  };
  active_skin?: {
    skin_id: string;
    skin_definitions?: {
      name_ru: string;
      rarity: string;
      metadata?: any;
    };
  } | null;
  displayed_badges?: Array<{
    badge_id: string;
    display_order: number;
    badge_definitions?: {
      name_ru: string;
      rarity: string;
      metadata?: any;
    };
  }>;
  claimed_rewards_count?: number;
}

const rarityColors = {
  common: "bg-gray-500/20 text-gray-700 border-gray-500/30",
  rare: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  legendary: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
};

const DuelPassLeaderboard = () => {
  const { profileId } = useUserContext();
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        // Получаем активный сезон
        const { data: activeSeason } = await supabase
          .from("duel_pass_seasons")
          .select("id")
          .eq("is_active", true)
          .order("season_number", { ascending: false })
          .limit(1)
          .single();

        if (activeSeason) {
          setActiveSeasonId(activeSeason.id);
        }

        const { data, error } = await supabase.functions.invoke("duel-pass-leaderboard", {
          body: { limit: 50 },
        });

        if (error) {
          throw error;
        }

        setLeaders(data?.leaderboard || []);
      } catch (err: any) {
        console.error("[DuelPassLeaderboard] Error:", err);
        setError("Не удалось загрузить рейтинг. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const getUserPosition = () => {
    if (!profileId) return null;
    return leaders.findIndex((leader) => leader.user_id === profileId);
  };

  const userPosition = getUserPosition();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="space-y-3 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-primary text-sm font-semibold">
              <Trophy className="w-4 h-4" />
              Турнирная таблица Duel Pass
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Топ игроков по Duel Pass
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Лучшие игроки, заработавшие больше всего уровней и наград в Duel Pass.
              Покажи свою косметику и достижения!
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/hall-of-fame")}
                className="gap-2"
              >
                <Trophy className="w-4 h-4" />
                Зал славы
              </Button>
            </div>
          </header>

          {/* Топ 3 - Премиум пьедестал */}
          {leaders.length >= 3 && (
            <div className="flex flex-row gap-3 md:gap-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {/* 2 место */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-shrink-0 w-[280px] md:w-auto md:flex-1"
              >
                <Card className="p-6 space-y-4 border-2 border-gray-300/60 bg-gradient-to-br from-gray-50/80 via-gray-100/80 to-gray-50/80 dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  {/* Декоративные элементы */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-gray-300/10 to-transparent rounded-full -mr-20 -mt-20" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-gray-200/10 to-transparent rounded-full -ml-16 -mb-16" />
                  
                  <div className="flex items-center justify-center relative z-10">
                    <div className="relative">
                      <motion.div
                        className="absolute -top-3 -right-3 bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-black text-base shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 10 }}
                      >
                        2
                      </motion.div>
                      <div className="relative">
                        <RankFrame rank={(leaders[1]?.rank || getRankFromLevel(leaders[1]?.duel_pass_level || 1)) as RankType} />
                        <Avatar className="w-24 h-24 border-4 border-gray-400/60 shadow-xl">
                          <AvatarImage
                            src={leaders[1]?.profile?.photo_url || leaders[1]?.profile?.avatar_url}
                            alt={leaders[1]?.profile?.first_name || "Игрок"}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white font-bold text-2xl">
                            {(leaders[1]?.profile?.first_name || "И")[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-3 relative z-10">
                    <h3 className="font-bold text-lg text-foreground">
                      {leaders[1]?.profile?.first_name || leaders[1]?.profile?.username || "Игрок"}
                    </h3>
                    <div className="flex flex-col items-center gap-2">
                      <RankBadge 
                        rank={(leaders[1]?.rank || getRankFromLevel(leaders[1]?.duel_pass_level || 1)) as RankType} 
                        size="sm" 
                        variant="pill"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">Уровень {leaders[1]?.duel_pass_level || 1}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {leaders[1]?.duel_pass_xp.toLocaleString("ru-RU") || 0} XP
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* 1 место - Золотое */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="flex-shrink-0 w-[280px] md:w-auto md:flex-1"
              >
                <Card className="p-6 md:p-8 space-y-4 md:space-y-5 border-2 border-yellow-400/80 bg-gradient-to-br from-yellow-50/90 via-amber-50/90 to-yellow-50/90 dark:from-yellow-900/30 dark:via-amber-900/30 dark:to-yellow-900/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-300 shadow-2xl shadow-yellow-500/20 h-full">
                  {/* Анимированный фон */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-amber-400/20 to-yellow-500/20"
                    animate={{
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full -mr-24 -mt-24 blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-amber-400/20 to-transparent rounded-full -ml-20 -mb-20 blur-2xl" />
                  
                  <div className="flex items-center justify-center relative z-10">
                    <div className="relative">
                      <motion.div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                        animate={{
                          y: [0, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Crown className="w-10 h-10 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
                      </motion.div>
                      <motion.div
                        className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-500 to-amber-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-black text-lg shadow-xl z-20"
                        whileHover={{ scale: 1.15, rotate: 15 }}
                        animate={{
                          boxShadow: [
                            "0 0 20px rgba(234, 179, 8, 0.5)",
                            "0 0 30px rgba(234, 179, 8, 0.7)",
                            "0 0 20px rgba(234, 179, 8, 0.5)",
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        1
                      </motion.div>
                      <div className="relative">
                        <RankFrame rank={(leaders[0]?.rank || getRankFromLevel(leaders[0]?.duel_pass_level || 1)) as RankType} />
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-yellow-400 shadow-2xl ring-4 ring-yellow-300/30">
                            <AvatarImage
                              src={leaders[0]?.profile?.photo_url || leaders[0]?.profile?.avatar_url}
                              alt={leaders[0]?.profile?.first_name || "Игрок"}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-amber-600 text-white font-bold text-3xl">
                              {(leaders[0]?.profile?.first_name || "И")[0]}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-3 relative z-10">
                    <h3 className="font-black text-xl text-foreground">
                      {leaders[0]?.profile?.first_name || leaders[0]?.profile?.username || "Игрок"}
                    </h3>
                    <div className="flex flex-col items-center gap-2">
                      <RankBadge 
                        rank={(leaders[0]?.rank || getRankFromLevel(leaders[0]?.duel_pass_level || 1)) as RankType} 
                        size="md" 
                        variant="pill"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span className="font-bold">Уровень {leaders[0]?.duel_pass_level || 1}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {leaders[0]?.duel_pass_xp.toLocaleString("ru-RU") || 0} XP
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* 3 место */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-shrink-0 w-[280px] md:w-auto md:flex-1"
              >
                <Card className="p-4 md:p-6 space-y-3 md:space-y-4 border-2 border-orange-400/60 bg-gradient-to-br from-orange-50/80 via-amber-50/80 to-orange-50/80 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-orange-900/20 backdrop-blur-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300 h-full">
                  {/* Декоративные элементы */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-orange-300/10 to-transparent rounded-full -mr-18 -mt-18" />
                  <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-amber-200/10 to-transparent rounded-full -ml-14 -mb-14" />
                  
                  <div className="flex items-center justify-center relative z-10">
                    <div className="relative">
                      <motion.div
                        className="absolute -top-3 -right-3 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-black text-base shadow-lg"
                        whileHover={{ scale: 1.1, rotate: -10 }}
                      >
                        3
                      </motion.div>
                      <div className="relative">
                        <RankFrame rank={(leaders[2]?.rank || getRankFromLevel(leaders[2]?.duel_pass_level || 1)) as RankType} />
                        <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-orange-400/60 shadow-xl">
                          <AvatarImage
                            src={leaders[2]?.profile?.photo_url || leaders[2]?.profile?.avatar_url}
                            alt={leaders[2]?.profile?.first_name || "Игрок"}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-600 text-white font-bold text-2xl">
                            {(leaders[2]?.profile?.first_name || "И")[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-3 relative z-10">
                    <h3 className="font-bold text-lg text-foreground">
                      {leaders[2]?.profile?.first_name || leaders[2]?.profile?.username || "Игрок"}
                    </h3>
                    <div className="flex flex-col items-center gap-2">
                      <RankBadge 
                        rank={(leaders[2]?.rank || getRankFromLevel(leaders[2]?.duel_pass_level || 1)) as RankType} 
                        size="sm" 
                        variant="pill"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">Уровень {leaders[2]?.duel_pass_level || 1}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {leaders[2]?.duel_pass_xp.toLocaleString("ru-RU") || 0} XP
                    </p>
                  </div>
                </Card>
              </motion.div>
            </div>
          )}

          <Card className="overflow-hidden border-2">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
              <div>
                <h2 className="text-xl font-bold">Полный рейтинг</h2>
                <p className="text-sm text-muted-foreground">
                  Сортировка по уровню и XP Duel Pass
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {leaders.length} игроков
              </Badge>
            </div>

            {loading ? (
              <div className="p-6 text-center text-muted-foreground">
                Загрузка...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-destructive font-semibold">
                {error}
              </div>
            ) : leaders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Пока нет игроков в рейтинге.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Игрок</TableHead>
                    <TableHead>Ранг</TableHead>
                    <TableHead>Уровень</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead>Скин</TableHead>
                    <TableHead>Бейджи</TableHead>
                    <TableHead>Награды</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaders.map((leader, index) => {
                    const name =
                      leader.profile?.first_name ||
                      leader.profile?.username ||
                      "Игрок";
                    const isCurrentUser = leader.user_id === profileId;
                    const skin = leader.active_skin?.skin_definitions;
                    const badges = leader.displayed_badges || [];
                    // Получаем ранг из данных или рассчитываем на основе уровня
                    const rank = (leader.rank || getRankFromLevel(leader.duel_pass_level)) as RankType;

                    return (
                      <TableRow
                        key={leader.user_id}
                        className={cn(
                          "transition-all hover:bg-muted/50",
                          isCurrentUser && "bg-primary/10 border-l-4 border-l-primary shadow-sm"
                        )}
                      >
                        <TableCell className="font-bold">
                          {index + 1}
                          {index < 3 && (
                            <Trophy className="w-4 h-4 inline-block ml-1 text-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <RankFrame rank={rank} />
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              >
                                <Avatar className={cn(
                                  "h-12 w-12 border-2 shadow-md transition-all",
                                  rank === "master" && "border-yellow-400/60 ring-2 ring-yellow-300/30",
                                  rank === "diamond" && "border-purple-400/60 ring-2 ring-purple-300/30",
                                  rank === "platinum" && "border-blue-400/60",
                                  rank === "gold" && "border-yellow-400/60",
                                  rank === "silver" && "border-gray-300/60",
                                  rank === "bronze" && "border-orange-400/60"
                                )}>
                                  <AvatarImage
                                    src={leader.profile?.photo_url || leader.profile?.avatar_url}
                                    alt={name}
                                  />
                                  <AvatarFallback className={cn(
                                    "font-bold",
                                    rank === "master" && "bg-gradient-to-br from-yellow-400 to-amber-600",
                                    rank === "diamond" && "bg-gradient-to-br from-purple-400 to-violet-600",
                                    rank === "platinum" && "bg-gradient-to-br from-blue-300 to-cyan-500",
                                    rank === "gold" && "bg-gradient-to-br from-yellow-400 to-amber-500",
                                    rank === "silver" && "bg-gradient-to-br from-gray-200 to-gray-400",
                                    rank === "bronze" && "bg-gradient-to-br from-orange-400 to-amber-600"
                                  )}>
                                    {name.slice(0, 1).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                            </div>
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                {name}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                                    Вы
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Уровень {leader.duel_pass_level}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RankBadge rank={rank} size="sm" variant="pill" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Star className="w-3 h-3" />
                            {leader.duel_pass_level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {leader.duel_pass_xp.toLocaleString("ru-RU")}
                        </TableCell>
                        <TableCell>
                          {skin ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                rarityColors[skin.rarity as keyof typeof rarityColors] ||
                                  rarityColors.common
                              )}
                            >
                              {skin.name_ru}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {badges.length > 0 ? (
                              badges.slice(0, 3).map((badge, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    badge.badge_definitions &&
                                      rarityColors[
                                        badge.badge_definitions.rarity as keyof typeof rarityColors
                                      ] || rarityColors.common
                                  )}
                                  title={badge.badge_definitions?.name_ru}
                                >
                                  <Award className="w-3 h-3 mr-1" />
                                  {badge.badge_definitions?.name_ru || "Бейдж"}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <Trophy className="w-3 h-3" />
                            {leader.claimed_rewards_count || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>

      {/* Модальное окно с призами */}
      {activeSeasonId && selectedPosition && (
        <LeaderboardRewardsModal
          open={rewardsModalOpen}
          onOpenChange={setRewardsModalOpen}
          seasonId={activeSeasonId}
          position={selectedPosition}
        />
      )}
    </Layout>
  );
};

export default DuelPassLeaderboard;

