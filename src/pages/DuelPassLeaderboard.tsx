import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Crown, Sparkles, Award, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/contexts/UserContext";

interface LeaderboardEntry {
  user_id: string;
  duel_pass_level: number;
  duel_pass_xp: number;
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
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
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
          </header>

          {/* Топ 3 */}
          {leaders.length >= 3 && (
            <div className="grid md:grid-cols-3 gap-4">
              {/* 2 место */}
              <Card className="p-6 space-y-4 border-2 border-gray-300/50 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 bg-gray-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <Avatar className="w-20 h-20 border-4 border-gray-300">
                      <AvatarImage
                        src={leaders[1]?.profile?.photo_url || leaders[1]?.profile?.avatar_url}
                        alt={leaders[1]?.profile?.first_name || "Игрок"}
                      />
                      <AvatarFallback className="bg-gray-400">
                        {(leaders[1]?.profile?.first_name || "И")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-lg">
                    {leaders[1]?.profile?.first_name || leaders[1]?.profile?.username || "Игрок"}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Star className="w-3 h-3" />
                      Уровень {leaders[1]?.duel_pass_level || 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {leaders[1]?.duel_pass_xp || 0} XP
                  </p>
                </div>
              </Card>

              {/* 1 место */}
              <Card className="p-6 space-y-4 border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-16 -mt-16" />
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-500 fill-yellow-500" />
                    <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <Avatar className="w-24 h-24 border-4 border-yellow-400 shadow-lg">
                      <AvatarImage
                        src={leaders[0]?.profile?.photo_url || leaders[0]?.profile?.avatar_url}
                        alt={leaders[0]?.profile?.first_name || "Игрок"}
                      />
                      <AvatarFallback className="bg-yellow-500">
                        {(leaders[0]?.profile?.first_name || "И")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-xl">
                    {leaders[0]?.profile?.first_name || leaders[0]?.profile?.username || "Игрок"}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Badge className="bg-yellow-500 gap-1">
                      <Crown className="w-3 h-3" />
                      Уровень {leaders[0]?.duel_pass_level || 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {leaders[0]?.duel_pass_xp || 0} XP
                  </p>
                </div>
              </Card>

              {/* 3 место */}
              <Card className="p-6 space-y-4 border-2 border-orange-300/50 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 bg-orange-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <Avatar className="w-20 h-20 border-4 border-orange-300">
                      <AvatarImage
                        src={leaders[2]?.profile?.photo_url || leaders[2]?.profile?.avatar_url}
                        alt={leaders[2]?.profile?.first_name || "Игрок"}
                      />
                      <AvatarFallback className="bg-orange-400">
                        {(leaders[2]?.profile?.first_name || "И")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-lg">
                    {leaders[2]?.profile?.first_name || leaders[2]?.profile?.username || "Игрок"}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Star className="w-3 h-3" />
                      Уровень {leaders[2]?.duel_pass_level || 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {leaders[2]?.duel_pass_xp || 0} XP
                  </p>
                </div>
              </Card>
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

                    return (
                      <TableRow
                        key={leader.user_id}
                        className={cn(
                          isCurrentUser && "bg-primary/5 border-l-4 border-l-primary"
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
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={leader.profile?.photo_url || leader.profile?.avatar_url}
                                alt={name}
                              />
                              <AvatarFallback>
                                {name.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                {name}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">
                                    Вы
                                  </Badge>
                                )}
                              </p>
                            </div>
                          </div>
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
    </Layout>
  );
};

export default DuelPassLeaderboard;

