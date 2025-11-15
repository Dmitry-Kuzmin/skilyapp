import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Shield, Zap } from "lucide-react";

interface LeaderEntry {
  userId: string;
  total_profit: number;
  total_sp: number;
  insurance_refunds: number;
  wins: number;
  losses: number;
  draws: number;
  duels: number;
  profile?: {
    first_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
}

const formatCoins = (value: number) =>
  value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });

const DuelLeaderboard = () => {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("duel-leaderboard", {
          body: { limit: 30 },
        });

        if (error) {
          throw error;
        }

        setLeaders(data?.leaderboard || []);
      } catch (err: any) {
        console.error("[DuelLeaderboard] Error:", err);
        setError("Не удалось загрузить лидеров. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="space-y-3 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
              <Trophy className="w-4 h-4" />
              Доска почёта дуэлей
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Топ игроков по ставкам
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Лучшие дуэлянты, заработавшие больше всего монет и Season Points в
              дуэлях со ставками и страховкой.
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Лидер по прибыли
              </p>
              <p className="text-2xl font-black">
                {leaders[0]
                  ? `${formatCoins(leaders[0].total_profit)} монет`
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {leaders[0]?.profile?.first_name ||
                  leaders[0]?.profile?.username ||
                  "—"}
              </p>
            </Card>
            <Card className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Больше всего побед
              </p>
              <p className="text-2xl font-black">
                {leaders.length
                  ? Math.max(...leaders.map((l) => l.wins))
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                побед в дуэлях со ставками
              </p>
            </Card>
            <Card className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Страховка окупилась
              </p>
              <p className="text-2xl font-black">
                {leaders.length
                  ? `${formatCoins(
                      Math.max(...leaders.map((l) => l.insurance_refunds))
                    )} монет`
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                суммарных возвратов по страховке
              </p>
            </Card>
          </div>

          <Card className="overflow-hidden border-2">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
              <div>
                <h2 className="text-xl font-bold">Общий рейтинг</h2>
                <p className="text-sm text-muted-foreground">
                  Сортировка по прибыли и Season Points
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Обновляется автоматически
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
                Пока нет дуэлей со ставками.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Игрок</TableHead>
                    <TableHead>Прибыль</TableHead>
                    <TableHead>SP</TableHead>
                    <TableHead>Страховка</TableHead>
                    <TableHead>W / L / D</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaders.map((leader, index) => {
                    const name =
                      leader.profile?.first_name ||
                      leader.profile?.username ||
                      "Игрок";
                    return (
                      <TableRow key={leader.userId}>
                        <TableCell className="font-bold">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {name.slice(0, 1)}
                            </div>
                            <div>
                              <p className="font-semibold">{name}</p>
                              <p className="text-xs text-muted-foreground">
                                {leader.duels} дуэлей
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCoins(leader.total_profit)}
                        </TableCell>
                        <TableCell>+{leader.total_sp} SP</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              leader.insurance_refunds > 0 ? "default" : "outline"
                            }
                            className="flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            {leader.insurance_refunds > 0
                              ? `${formatCoins(leader.insurance_refunds)}`
                              : "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">
                            {leader.wins}
                          </span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-muted-foreground">
                            {leader.losses}
                          </span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-muted-foreground">
                            {leader.draws}
                          </span>
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

export default DuelLeaderboard;

