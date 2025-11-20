import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Copy,
  Sparkles,
  Award,
  Coins,
  Crown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

interface LeaderboardReward {
  id: string;
  season_id: number;
  position: number;
  reward_type: "skin" | "badge" | "frame" | "title" | "aura" | "coins";
  reward_data: any;
  is_exclusive: boolean;
  description_ru?: string;
  description_es?: string;
}

interface CosmeticItem {
  id: string;
  name_ru: string;
  rarity: string;
}

interface RewardForm {
  position: number;
  reward_type: "skin" | "badge" | "frame" | "title" | "aura" | "coins";
  reward_id?: string;
  amount?: number;
  is_exclusive: boolean;
  description_ru: string;
  description_es: string;
  auto_activate?: boolean;
  auto_display?: boolean;
}

const REWARD_TEMPLATES = {
  top1: {
    skin: { id: "skin_champion_season_1", auto_activate: true },
    badge: { id: "badge_champion_season_1", auto_display: true },
    frame: { id: "frame_champion_season_1", auto_activate: true },
    title: { id: "title_champion_season_1" },
    aura: { type: "champion", intensity: "high", color: "#fbbf24" },
    coins: { amount: 500 },
  },
  top2: {
    skin: { id: "skin_silver_runner_season_1", auto_activate: true },
    badge: { id: "badge_silver_runner_season_1", auto_display: true },
    frame: { id: "frame_silver_runner_season_1", auto_activate: true },
    title: { id: "title_silver_runner_season_1" },
    aura: { type: "silver", intensity: "medium", color: "#c0c0c0" },
    coins: { amount: 350 },
  },
  top3: {
    skin: { id: "skin_bronze_finalist_season_1", auto_activate: true },
    badge: { id: "badge_bronze_finalist_season_1", auto_display: true },
    frame: { id: "frame_bronze_finalist_season_1", auto_activate: true },
    title: { id: "title_bronze_finalist_season_1" },
    aura: { type: "bronze", intensity: "medium", color: "#cd7f32" },
    coins: { amount: 250 },
  },
  top10: {
    badge: { id: "badge_top_10_elite_season_1", auto_display: true },
    frame: { id: "frame_elite_top_10_season_1", auto_activate: true },
    title: { id: "title_elite_top_10_season_1" },
    aura: { type: "elite", intensity: "low", color: "#3b82f6" },
    coins: { amount: 100 },
  },
};

export function RewardsEditor({
  seasonId,
  seasonNumber,
  onClose,
  onSave,
}: {
  seasonId: number;
  seasonNumber: number;
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [rewards, setRewards] = useState<LeaderboardReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReward, setEditingReward] = useState<LeaderboardReward | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<LeaderboardReward | null>(null);
  const [skins, setSkins] = useState<CosmeticItem[]>([]);
  const [badges, setBadges] = useState<CosmeticItem[]>([]);
  const [form, setForm] = useState<RewardForm>({
    position: 1,
    reward_type: "coins",
    is_exclusive: false,
    description_ru: "",
    description_es: "",
    amount: 100,
  });

  useEffect(() => {
    loadRewards();
    loadCosmetics();
  }, [seasonId]);

  const loadRewards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leaderboard_season_rewards")
        .select("*")
        .eq("season_id", seasonId)
        .order("position", { ascending: true })
        .order("reward_type", { ascending: true });

      if (error) throw error;
      setRewards(data || []);
    } catch (error: any) {
      console.error("[RewardsEditor] Error loading rewards:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить призы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCosmetics = async () => {
    try {
      const [skinsResult, badgesResult] = await Promise.all([
        supabase.from("skin_definitions").select("id, name_ru, rarity").order("name_ru"),
        supabase.from("badge_definitions").select("id, name_ru, rarity").order("name_ru"),
      ]);

      if (skinsResult.data) setSkins(skinsResult.data);
      if (badgesResult.data) setBadges(badgesResult.data);
    } catch (error) {
      console.error("[RewardsEditor] Error loading cosmetics:", error);
    }
  };

  const applyTemplate = (position: number) => {
    let template: any;
    if (position === 1) template = REWARD_TEMPLATES.top1;
    else if (position === 2) template = REWARD_TEMPLATES.top2;
    else if (position === 3) template = REWARD_TEMPLATES.top3;
    else template = REWARD_TEMPLATES.top10;

    const rewardsToCreate: Array<{
      position: number;
      reward_type: string;
      reward_data: any;
      is_exclusive: boolean;
      description_ru: string;
      description_es: string;
    }> = [];

    Object.entries(template).forEach(([type, data]: [string, any]) => {
      let description_ru = "";
      let description_es = "";

      if (type === "skin") {
        description_ru = `Скин для ${position} места`;
        description_es = `Skin para ${position} lugar`;
      } else if (type === "badge") {
        description_ru = `Бейдж для ${position} места`;
        description_es = `Insignia para ${position} lugar`;
      } else if (type === "frame") {
        description_ru = `Рамка для ${position} места`;
        description_es = `Marco para ${position} lugar`;
      } else if (type === "title") {
        description_ru = `Титул для ${position} места`;
        description_es = `Título para ${position} lugar`;
      } else if (type === "aura") {
        description_ru = `Аура для ${position} места`;
        description_es = `Aura para ${position} lugar`;
      } else if (type === "coins") {
        description_ru = `${data.amount} монет`;
        description_es = `${data.amount} monedas`;
      }

      rewardsToCreate.push({
        position,
        reward_type: type as any,
        reward_data: data,
        is_exclusive: position <= 3,
        description_ru,
        description_es,
      });
    });

    createRewardsBatch(rewardsToCreate);
  };

  const createRewardsBatch = async (
    rewardsToCreate: Array<{
      position: number;
      reward_type: string;
      reward_data: any;
      is_exclusive: boolean;
      description_ru: string;
      description_es: string;
    }>
  ) => {
    try {
      const { error } = await supabase.from("leaderboard_season_rewards").insert(
        rewardsToCreate.map((r) => ({
          season_id: seasonId,
          position: r.position,
          reward_type: r.reward_type,
          reward_data: r.reward_data,
          is_exclusive: r.is_exclusive,
          description_ru: r.description_ru,
          description_es: r.description_es,
        }))
      );

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Создано ${rewardsToCreate.length} призов`,
      });

      await loadRewards();
      onSave();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать призы",
        variant: "destructive",
      });
    }
  };

  const saveReward = async () => {
    try {
      if (!form.reward_type) {
        toast({
          title: "Ошибка",
          description: "Выберите тип приза",
          variant: "destructive",
        });
        return;
      }

      let rewardData: any = {};

      if (form.reward_type === "coins") {
        if (!form.amount || form.amount <= 0) {
          toast({
            title: "Ошибка",
            description: "Укажите количество монет",
            variant: "destructive",
          });
          return;
        }
        rewardData = { amount: form.amount };
      } else if (form.reward_type === "skin" || form.reward_type === "badge" || form.reward_type === "frame") {
        if (!form.reward_id) {
          toast({
            title: "Ошибка",
            description: "Выберите косметику",
            variant: "destructive",
          });
          return;
        }
        rewardData = { id: form.reward_id };
        if (form.auto_activate) rewardData.auto_activate = true;
        if (form.auto_display) rewardData.auto_display = true;
      } else if (form.reward_type === "title") {
        if (!form.reward_id) {
          toast({
            title: "Ошибка",
            description: "Укажите ID титула",
            variant: "destructive",
          });
          return;
        }
        rewardData = { id: form.reward_id };
      } else if (form.reward_type === "aura") {
        rewardData = {
          type: form.reward_id || "elite",
          intensity: "medium",
          color: "#3b82f6",
        };
      }

      if (editingReward) {
        // Обновление
        const { error } = await supabase
          .from("leaderboard_season_rewards")
          .update({
            position: form.position,
            reward_type: form.reward_type,
            reward_data: rewardData,
            is_exclusive: form.is_exclusive,
            description_ru: form.description_ru,
            description_es: form.description_es,
          })
          .eq("id", editingReward.id);

        if (error) throw error;

        toast({
          title: "Успех",
          description: "Приз обновлён",
        });
      } else {
        // Создание
        const { error } = await supabase.from("leaderboard_season_rewards").insert({
          season_id: seasonId,
          position: form.position,
          reward_type: form.reward_type,
          reward_data: rewardData,
          is_exclusive: form.is_exclusive,
          description_ru: form.description_ru,
          description_es: form.description_es,
        });

        if (error) throw error;

        toast({
          title: "Успех",
          description: "Приз создан",
        });
      }

      setCreateDialogOpen(false);
      setEditingReward(null);
      resetForm();
      await loadRewards();
      onSave();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить приз",
        variant: "destructive",
      });
    }
  };

  const deleteReward = async () => {
    if (!rewardToDelete) return;

    try {
      const { error } = await supabase
        .from("leaderboard_season_rewards")
        .delete()
        .eq("id", rewardToDelete.id);

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Приз удалён",
      });

      setDeleteDialogOpen(false);
      setRewardToDelete(null);
      await loadRewards();
      onSave();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить приз",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setForm({
      position: 1,
      reward_type: "coins",
      is_exclusive: false,
      description_ru: "",
      description_es: "",
      amount: 100,
    });
  };

  const openEditDialog = (reward: LeaderboardReward) => {
    setEditingReward(reward);
    setForm({
      position: reward.position,
      reward_type: reward.reward_type,
      reward_id: reward.reward_data?.id,
      amount: reward.reward_data?.amount,
      is_exclusive: reward.is_exclusive,
      description_ru: reward.description_ru || "",
      description_es: reward.description_es || "",
      auto_activate: reward.reward_data?.auto_activate,
      auto_display: reward.reward_data?.auto_display,
    });
    setCreateDialogOpen(true);
  };

  const openCreateDialog = (position?: number) => {
    setEditingReward(null);
    resetForm();
    if (position) setForm((f) => ({ ...f, position }));
    setCreateDialogOpen(true);
  };

  const rewardsByPosition = rewards.reduce((acc, reward) => {
    if (!acc[reward.position]) acc[reward.position] = [];
    acc[reward.position].push(reward);
    return acc;
  }, {} as Record<number, LeaderboardReward[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Призы лидерборда</h2>
          <p className="text-muted-foreground">Сезон {seasonNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Закрыть
          </Button>
          <Button onClick={() => openCreateDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить приз
          </Button>
        </div>
      </div>

      {/* Быстрое создание по шаблонам */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">1 место</h3>
                <Crown className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-sm text-muted-foreground">Чемпион</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => applyTemplate(1)}
              >
                <Copy className="w-3 h-3 mr-2" />
                Применить шаблон
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">2 место</h3>
                <Award className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground">Серебро</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => applyTemplate(2)}
              >
                <Copy className="w-3 h-3 mr-2" />
                Применить шаблон
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">3 место</h3>
                <Award className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-muted-foreground">Бронза</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => applyTemplate(3)}
              >
                <Copy className="w-3 h-3 mr-2" />
                Применить шаблон
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">4-10 места</h3>
                <Sparkles className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-sm text-muted-foreground">Элита</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  for (let pos = 4; pos <= 10; pos++) {
                    applyTemplate(pos);
                  }
                }}
              >
                <Copy className="w-3 h-3 mr-2" />
                Применить шаблон
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список призов по позициям */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((position) => {
            const positionRewards = rewardsByPosition[position] || [];

            return (
              <Card key={position}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                          position === 1 && "bg-gradient-to-br from-yellow-400 to-yellow-600",
                          position === 2 && "bg-gradient-to-br from-gray-300 to-gray-500",
                          position === 3 && "bg-gradient-to-br from-orange-400 to-orange-600",
                          position > 3 && "bg-gradient-to-br from-blue-400 to-blue-600"
                        )}
                      >
                        {position}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {position === 1
                            ? "🥇 Чемпион"
                            : position === 2
                              ? "🥈 Серебро"
                              : position === 3
                                ? "🥉 Бронза"
                                : `Позиция ${position}`}
                        </CardTitle>
                        <CardDescription>
                          {positionRewards.length} призов
                        </CardDescription>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openCreateDialog(position)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {positionRewards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Призы не настроены
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Тип</TableHead>
                          <TableHead>Описание</TableHead>
                          <TableHead>Данные</TableHead>
                          <TableHead>Эксклюзив</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positionRewards.map((reward) => (
                          <TableRow key={reward.id}>
                            <TableCell>
                              <Badge variant="outline">{reward.reward_type}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {reward.description_ru || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {reward.reward_type === "coins"
                                ? `${reward.reward_data?.amount || 0} монет`
                                : reward.reward_data?.id || JSON.stringify(reward.reward_data)}
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditDialog(reward)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setRewardToDelete(reward);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Диалог создания/редактирования приза */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReward ? "Редактировать приз" : "Создать приз"}
            </DialogTitle>
            <DialogDescription>
              Настройте приз для позиции {form.position}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Позиция</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label>Тип приза</Label>
                <Select
                  value={form.reward_type}
                  onValueChange={(value: any) =>
                    setForm({ ...form, reward_type: value, reward_id: undefined, amount: undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coins">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        Монеты
                      </div>
                    </SelectItem>
                    <SelectItem value="skin">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Скин
                      </div>
                    </SelectItem>
                    <SelectItem value="badge">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Бейдж
                      </div>
                    </SelectItem>
                    <SelectItem value="frame">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        Рамка
                      </div>
                    </SelectItem>
                    <SelectItem value="title">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Титул
                      </div>
                    </SelectItem>
                    <SelectItem value="aura">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Аура
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.reward_type === "coins" && (
              <div>
                <Label>Количество монет</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({ ...form, amount: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            )}

            {(form.reward_type === "skin" || form.reward_type === "badge" || form.reward_type === "frame") && (
              <>
                <div>
                  <Label>
                    {form.reward_type === "skin"
                      ? "Скин"
                      : form.reward_type === "badge"
                        ? "Бейдж"
                        : "Рамка"}
                  </Label>
                  <Select
                    value={form.reward_id || ""}
                    onValueChange={(value) => setForm({ ...form, reward_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите косметику" />
                    </SelectTrigger>
                    <SelectContent>
                      {(form.reward_type === "skin" ? skins : badges).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex items-center gap-2">
                            <span>{item.name_ru}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.rarity}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.reward_type === "skin" || form.reward_type === "frame" ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.auto_activate || false}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, auto_activate: checked })
                      }
                    />
                    <Label>Автоматически активировать</Label>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.auto_display || false}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, auto_display: checked })
                      }
                    />
                    <Label>Автоматически показывать</Label>
                  </div>
                )}
              </>
            )}

            {form.reward_type === "title" && (
              <div>
                <Label>ID титула</Label>
                <Input
                  value={form.reward_id || ""}
                  onChange={(e) => setForm({ ...form, reward_id: e.target.value })}
                  placeholder="title_champion_season_1"
                />
              </div>
            )}

            {form.reward_type === "aura" && (
              <div className="space-y-2">
                <div>
                  <Label>Тип ауры</Label>
                  <Input
                    value={form.reward_id || "elite"}
                    onChange={(e) => setForm({ ...form, reward_id: e.target.value })}
                    placeholder="elite, champion, silver, bronze"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_exclusive}
                onCheckedChange={(checked) => setForm({ ...form, is_exclusive: checked })}
              />
              <Label>Эксклюзивный приз (больше не появится)</Label>
            </div>

            <div>
              <Label>Описание (RU)</Label>
              <Textarea
                value={form.description_ru}
                onChange={(e) => setForm({ ...form, description_ru: e.target.value })}
                placeholder="Описание приза"
              />
            </div>

            <div>
              <Label>Описание (ES)</Label>
              <Textarea
                value={form.description_es}
                onChange={(e) => setForm({ ...form, description_es: e.target.value })}
                placeholder="Descripción del premio"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={saveReward}>
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить приз?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот приз? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={deleteReward} className="bg-destructive">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

