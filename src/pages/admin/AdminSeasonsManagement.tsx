import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Trophy,
  Users,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Plus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Season {
  id: number;
  season_number: number;
  name_ru: string;
  name_es: string;
  name_en: string;
  theme: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description_ru?: string;
  description_es?: string;
  description_en?: string;
}

interface LeaderboardReward {
  id: string;
  season_id: number;
  position: number;
  reward_type: string;
  reward_data: any;
  is_exclusive: boolean;
  description_ru?: string;
}

export function AdminSeasonsManagement() {
  const { toast } = useToast();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Record<number, LeaderboardReward[]>>({});
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [rewardsDialogOpen, setRewardsDialogOpen] = useState(false);
  const [distributeRewardsLoading, setDistributeRewardsLoading] = useState(false);

  // Форма для создания сезона
  const [newSeason, setNewSeason] = useState({
    season_number: 1,
    name_ru: "",
    name_es: "",
    name_en: "",
    theme: "special",
    start_date: "",
    end_date: "",
    description_ru: "",
    description_es: "",
    description_en: "",
  });

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("duel_pass_seasons")
        .select("*")
        .order("season_number", { ascending: false });

      if (error) throw error;

      setSeasons(data || []);

      // Загружаем призы для каждого сезона
      if (data && data.length > 0) {
        const seasonIds = data.map((s) => s.id);
        const { data: rewardsData } = await supabase
          .from("leaderboard_season_rewards")
          .select("*")
          .in("season_id", seasonIds)
          .order("position", { ascending: true });

        if (rewardsData) {
          const rewardsMap: Record<number, LeaderboardReward[]> = {};
          rewardsData.forEach((reward) => {
            if (!rewardsMap[reward.season_id]) {
              rewardsMap[reward.season_id] = [];
            }
            rewardsMap[reward.season_id].push(reward);
          });
          setRewards(rewardsMap);
        }
      }
    } catch (error: any) {
      console.error("[AdminSeasonsManagement] Error loading seasons:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить сезоны",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSeason = async () => {
    try {
      if (!newSeason.start_date || !newSeason.end_date) {
        toast({
          title: "Ошибка",
          description: "Укажите даты начала и окончания сезона",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("duel_pass_seasons")
        .insert({
          season_number: newSeason.season_number,
          name_ru: newSeason.name_ru,
          name_es: newSeason.name_es,
          name_en: newSeason.name_en,
          theme: newSeason.theme,
          start_date: newSeason.start_date,
          end_date: newSeason.end_date,
          description_ru: newSeason.description_ru || null,
          description_es: newSeason.description_es || null,
          description_en: newSeason.description_en || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Сезон "${newSeason.name_ru}" создан`,
      });

      setCreateDialogOpen(false);
      setNewSeason({
        season_number: newSeason.season_number + 1,
        name_ru: "",
        name_es: "",
        name_en: "",
        theme: "special",
        start_date: "",
        end_date: "",
        description_ru: "",
        description_es: "",
        description_en: "",
      });

      await loadSeasons();
    } catch (error: any) {
      console.error("[AdminSeasonsManagement] Error creating season:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать сезон",
        variant: "destructive",
      });
    }
  };

  const toggleSeasonActive = async (season: Season) => {
    try {
      const { error } = await supabase
        .from("duel_pass_seasons")
        .update({ is_active: !season.is_active })
        .eq("id", season.id);

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Сезон ${season.is_active ? "деактивирован" : "активирован"}`,
      });

      await loadSeasons();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить сезон",
        variant: "destructive",
      });
    }
  };

  const distributeRewards = async (seasonId: number) => {
    setDistributeRewardsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("season-end-rewards", {
        body: { season_id: seasonId },
      });

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Призы для сезона распределены. Обработано: ${data?.processed || 0} игроков`,
      });

      await loadSeasons();
    } catch (error: any) {
      console.error("[AdminSeasonsManagement] Error distributing rewards:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось распределить призы",
        variant: "destructive",
      });
    } finally {
      setDistributeRewardsLoading(false);
    }
  };

  const getSeasonStatus = (season: Season) => {
    const now = new Date();
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);

    if (!season.is_active) {
      return { label: "Неактивен", color: "bg-gray-500", icon: Pause };
    }

    if (now < start) {
      return { label: "Скоро", color: "bg-blue-500", icon: Clock };
    }

    if (now >= start && now <= end) {
      return { label: "Активен", color: "bg-green-500", icon: Play };
    }

    return { label: "Завершён", color: "bg-orange-500", icon: CheckCircle2 };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Управление сезонами</h1>
          <p className="text-muted-foreground mt-2">
            Создание сезонов, управление призами лидерборда и распределение наград
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Создать сезон
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать новый сезон</DialogTitle>
              <DialogDescription>
                Сезон длится 30 дней. Призы лидерборда можно настроить после создания.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Номер сезона</Label>
                  <Input
                    type="number"
                    value={newSeason.season_number}
                    onChange={(e) =>
                      setNewSeason({ ...newSeason, season_number: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div>
                  <Label>Тема</Label>
                  <Select
                    value={newSeason.theme}
                    onValueChange={(value) => setNewSeason({ ...newSeason, theme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="winter">Зима</SelectItem>
                      <SelectItem value="spring">Весна</SelectItem>
                      <SelectItem value="summer">Лето</SelectItem>
                      <SelectItem value="autumn">Осень</SelectItem>
                      <SelectItem value="special">Специальный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Название (RU)</Label>
                <Input
                  value={newSeason.name_ru}
                  onChange={(e) => setNewSeason({ ...newSeason, name_ru: e.target.value })}
                  placeholder="Операция Асфальт"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Название (ES)</Label>
                  <Input
                    value={newSeason.name_es}
                    onChange={(e) => setNewSeason({ ...newSeason, name_es: e.target.value })}
                    placeholder="Operación Asfalto"
                  />
                </div>
                <div>
                  <Label>Название (EN)</Label>
                  <Input
                    value={newSeason.name_en}
                    onChange={(e) => setNewSeason({ ...newSeason, name_en: e.target.value })}
                    placeholder="Operation Asphalt"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Дата начала</Label>
                  <Input
                    type="datetime-local"
                    value={newSeason.start_date}
                    onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Дата окончания (через 30 дней)</Label>
                  <Input
                    type="datetime-local"
                    value={newSeason.end_date}
                    onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Описание (RU)</Label>
                <Textarea
                  value={newSeason.description_ru}
                  onChange={(e) => setNewSeason({ ...newSeason, description_ru: e.target.value })}
                  placeholder="Первый сезон Duel Pass! Получайте награды за активность и обучение."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={createSeason}>Создать сезон</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : seasons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Сезоны не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {seasons.map((season) => {
            const status = getSeasonStatus(season);
            const StatusIcon = status.icon;
            const daysRemaining = getDaysRemaining(season.end_date);
            const seasonRewards = rewards[season.id] || [];
            const hasRewards = seasonRewards.length > 0;

            return (
              <motion.div
                key={season.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={cn("overflow-hidden", season.is_active && "border-primary/50")}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-2xl">
                            Сезон {season.season_number}: {season.name_ru}
                          </CardTitle>
                          <Badge className={cn("gap-1.5", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <CardDescription className="text-base">
                          {season.description_ru || "Без описания"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSeasonActive(season)}
                        >
                          {season.is_active ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Деактивировать
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Активировать
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Начало</p>
                          <p className="font-semibold">{formatDate(season.start_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Окончание</p>
                          <p className="font-semibold">{formatDate(season.end_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Осталось дней</p>
                          <p className="font-semibold">
                            {daysRemaining > 0 ? `${daysRemaining} дней` : "Завершён"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Призы лидерборда
                        </h3>
                        <div className="flex items-center gap-2">
                          {hasRewards ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {seasonRewards.length} призов настроено
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-orange-600">
                              <AlertCircle className="w-3 h-3" />
                              Призы не настроены
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSeason(season);
                              setRewardsDialogOpen(true);
                            }}
                          >
                            <Award className="w-4 h-4 mr-2" />
                            Управление призами
                          </Button>
                        </div>
                      </div>

                      {hasRewards && (
                        <div className="mt-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Позиция</TableHead>
                                <TableHead>Тип</TableHead>
                                <TableHead>Описание</TableHead>
                                <TableHead>Эксклюзив</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {seasonRewards
                                .sort((a, b) => a.position - b.position)
                                .slice(0, 5)
                                .map((reward) => (
                                  <TableRow key={reward.id}>
                                    <TableCell className="font-bold">
                                      #{reward.position}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{reward.reward_type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {reward.description_ru || "—"}
                                    </TableCell>
                                    <TableCell>
                                      {reward.is_exclusive ? (
                                        <Badge variant="outline" className="bg-yellow-500/20">
                                          Да
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground">Нет</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {new Date(season.end_date) <= new Date() && season.is_active && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertCircle className="w-4 h-4" />
                            Сезон завершён. Распределите призы лидерборда.
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {new Date(season.end_date) <= new Date() && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => distributeRewards(season.id)}
                            disabled={distributeRewardsLoading}
                            className="gap-2"
                          >
                            {distributeRewardsLoading ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Обработка...
                              </>
                            ) : (
                              <>
                                <Trophy className="w-4 h-4" />
                                Распределить призы
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/duel-pass-leaderboard`, "_blank")}
                          className="gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Турнирная таблица
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Диалог управления призами */}
      <Dialog open={rewardsDialogOpen} onOpenChange={setRewardsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Призы лидерборда: Сезон {selectedSeason?.season_number}
            </DialogTitle>
            <DialogDescription>
              Настройка призов для топ-3 и топ-10. Призы начисляются автоматически в конце сезона.
            </DialogDescription>
          </DialogHeader>
          {selectedSeason && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                <p className="font-semibold mb-2">📋 Структура призов:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Топ-3:</strong> Эксклюзивный скин + бейдж + рамка + титул + аура + монеты
                    (500/350/250)
                  </li>
                  <li>
                    <strong>Топ-10 (4-10):</strong> Бейдж + рамка + титул + аура + 100 монет
                  </li>
                </ul>
                <p className="mt-3 text-xs">
                  💡 Призы настраиваются через SQL миграции. См.{" "}
                  <code className="bg-background px-1 rounded">20251120190200_seed_leaderboard_rewards.sql</code>
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Текущие призы:</h4>
                {rewards[selectedSeason.id] && rewards[selectedSeason.id].length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Позиция</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Описание</TableHead>
                        <TableHead>Эксклюзив</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewards[selectedSeason.id]
                        .sort((a, b) => a.position - b.position)
                        .map((reward) => (
                          <TableRow key={reward.id}>
                            <TableCell className="font-bold">#{reward.position}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{reward.reward_type}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {reward.description_ru || "—"}
                            </TableCell>
                            <TableCell>
                              {reward.is_exclusive ? (
                                <Badge variant="outline" className="bg-yellow-500/20">
                                  Да
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Нет</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                    Призы для этого сезона ещё не настроены. Используй SQL миграцию для создания
                    призов.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setRewardsDialogOpen(false)}>
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

