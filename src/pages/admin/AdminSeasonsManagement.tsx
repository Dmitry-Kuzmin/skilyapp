import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast as sonnerToast } from 'sonner';

// Совместимость с shadcn toast синтаксисом для sonner
const toast = (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
  if (options.variant === 'destructive') {
    sonnerToast.error(options.title, { description: options.description });
  } else {
    sonnerToast.success(options.title, { description: options.description });
  }
};

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
  Edit,
  Trash2,
  BarChart3,
  Settings,
  FileText,
  Zap,
  TrendingUp,
  Activity,
  Filter,
  Search,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle,
  XCircle,
  Info,
  Coins,
  Copy,
  Sparkles,
  Crown,
} from "lucide-react";
import { motion } from "@/components/optimized/Motion";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { RewardsEditor } from "@/components/admin/RewardsEditor";

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

interface SeasonStats {
  total_players: number;
  players_with_rewards: number;
  total_rewards_distributed: number;
  top_player_level: number;
  top_player_xp: number;
}

interface CronLog {
  id: string;
  job_name: string;
  status: string;
  result_data: any;
  error_message?: string;
  created_at: string;
}

export function AdminSeasonsManagement() {

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Record<number, LeaderboardReward[]>>({});
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rewardsDialogOpen, setRewardsDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [cronLogsDialogOpen, setCronLogsDialogOpen] = useState(false);
  const [distributeRewardsLoading, setDistributeRewardsLoading] = useState(false);
  const [checkSeasonsLoading, setCheckSeasonsLoading] = useState(false);
  const [seasonStats, setSeasonStats] = useState<Record<number, SeasonStats>>({});
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);

  // Форма для создания/редактирования сезона
  const [seasonForm, setSeasonForm] = useState({
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
    loadCronLogs();
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

        // Загружаем статистику для каждого сезона
        for (const season of data) {
          await loadSeasonStats(season.id);
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

  const loadSeasonStats = async (seasonId: number) => {
    try {
      // Подсчитываем игроков с призами
      const { count: playersWithRewards } = await supabase
        .from("user_leaderboard_rewards")
        .select("*", { count: "exact", head: true })
        .eq("season_id", seasonId);

      // Подсчитываем общее количество призов
      const { count: totalRewards } = await supabase
        .from("user_leaderboard_rewards")
        .select("*", { count: "exact", head: true })
        .eq("season_id", seasonId);

      // Находим топ игрока (можно улучшить, добавив запрос к profiles)
      setSeasonStats((prev) => ({
        ...prev,
        [seasonId]: {
          total_players: 0, // TODO: подсчитать из profiles
          players_with_rewards: playersWithRewards || 0,
          total_rewards_distributed: totalRewards || 0,
          top_player_level: 0,
          top_player_xp: 0,
        },
      }));
    } catch (error) {
      console.error("[AdminSeasonsManagement] Error loading stats:", error);
    }
  };

  const loadCronLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("cron_job_logs")
        .select("*")
        .eq("job_name", "check_and_log_ended_seasons")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCronLogs(data || []);
    } catch (error) {
      console.error("[AdminSeasonsManagement] Error loading cron logs:", error);
    }
  };

  const checkEndedSeasons = async () => {
    setCheckSeasonsLoading(true);
    try {
      // Сначала проверяем завершившиеся сезоны
      const { data: checkData, error: checkError } = await supabase.rpc("manual_check_seasons");

      if (checkError) throw checkError;

      // Если есть завершившиеся сезоны, автоматически распределяем призы
      if (checkData?.seasons_found > 0 && checkData?.seasons) {
        const seasonsToProcess = checkData.seasons as Array<{ season_id: number }>;

        toast({
          title: "Найдены завершившиеся сезоны",
          description: `Найдено ${seasonsToProcess.length} сезонов. Начинаю автоматическое распределение призов...`,
        });

        // Распределяем призы для каждого сезона
        for (const season of seasonsToProcess) {
          try {
            await distributeRewards(season.season_id);
          } catch (error) {
            console.error(`[AdminSeasonsManagement] Error distributing rewards for season ${season.season_id}:`, error);
          }
        }

        toast({
          title: "Распределение завершено",
          description: `Обработано ${seasonsToProcess.length} сезонов`,
        });
      } else {
        toast({
          title: "Проверка завершена",
          description: checkData?.message || `Найдено сезонов: ${checkData?.seasons_found || 0}`,
        });
      }

      await loadCronLogs();
      await loadSeasons();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось проверить сезоны",
        variant: "destructive",
      });
    } finally {
      setCheckSeasonsLoading(false);
    }
  };

  const createSeason = async () => {
    try {
      if (!seasonForm.start_date || !seasonForm.end_date) {
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
          season_number: seasonForm.season_number,
          name_ru: seasonForm.name_ru,
          name_es: seasonForm.name_es,
          name_en: seasonForm.name_en,
          theme: seasonForm.theme,
          start_date: seasonForm.start_date,
          end_date: seasonForm.end_date,
          description_ru: seasonForm.description_ru || null,
          description_es: seasonForm.description_es || null,
          description_en: seasonForm.description_en || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Сезон "${seasonForm.name_ru}" создан`,
      });

      setCreateDialogOpen(false);
      resetSeasonForm();
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

  const updateSeason = async () => {
    if (!selectedSeason) return;

    try {
      const { error } = await supabase
        .from("duel_pass_seasons")
        .update({
          season_number: seasonForm.season_number,
          name_ru: seasonForm.name_ru,
          name_es: seasonForm.name_es,
          name_en: seasonForm.name_en,
          theme: seasonForm.theme,
          start_date: seasonForm.start_date,
          end_date: seasonForm.end_date,
          description_ru: seasonForm.description_ru || null,
          description_es: seasonForm.description_es || null,
          description_en: seasonForm.description_en || null,
        })
        .eq("id", selectedSeason.id);

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Сезон "${seasonForm.name_ru}" обновлён`,
      });

      setEditDialogOpen(false);
      await loadSeasons();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить сезон",
        variant: "destructive",
      });
    }
  };

  const deleteSeason = async () => {
    if (!seasonToDelete) return;

    try {
      const { error } = await supabase
        .from("duel_pass_seasons")
        .delete()
        .eq("id", seasonToDelete.id);

      if (error) throw error;

      toast({
        title: "Успех",
        description: `Сезон "${seasonToDelete.name_ru}" удалён`,
      });

      setDeleteDialogOpen(false);
      setSeasonToDelete(null);
      await loadSeasons();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить сезон",
        variant: "destructive",
      });
    }
  };

  const planNextSeason = () => {
    const lastSeason = seasons[0]; // Самый новый сезон
    const nextNumber = lastSeason ? lastSeason.season_number + 1 : 1;
    const lastEndDate = lastSeason ? new Date(lastSeason.end_date) : new Date();
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1); // Начинается на следующий день
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setDate(nextEndDate.getDate() + 30); // Длится 30 дней

    setSeasonForm({
      season_number: nextNumber,
      name_ru: `Сезон ${nextNumber}`,
      name_es: `Temporada ${nextNumber}`,
      name_en: `Season ${nextNumber}`,
      theme: "special",
      start_date: nextStartDate.toISOString().slice(0, 16),
      end_date: nextEndDate.toISOString().slice(0, 16),
      description_ru: "",
      description_es: "",
      description_en: "",
    });

    setCreateDialogOpen(true);
  };

  const resetSeasonForm = () => {
    const lastSeason = seasons[0];
    setSeasonForm({
      season_number: lastSeason ? lastSeason.season_number + 1 : 1,
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
  };

  const openEditDialog = (season: Season) => {
    setSelectedSeason(season);
    setSeasonForm({
      season_number: season.season_number,
      name_ru: season.name_ru,
      name_es: season.name_es,
      name_en: season.name_en,
      theme: season.theme,
      start_date: season.start_date.slice(0, 16),
      end_date: season.end_date.slice(0, 16),
      description_ru: season.description_ru || "",
      description_es: season.description_es || "",
      description_en: season.description_en || "",
    });
    setEditDialogOpen(true);
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
        description: `Призы распределены. Обработано: ${data?.processed || 0} игроков, успешно: ${data?.successful || 0}, ошибок: ${data?.failed || 0}`,
      });

      await loadSeasons();
      await loadSeasonStats(seasonId);
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

  const filteredSeasons = seasons.filter((season) => {
    const matchesSearch =
      season.name_ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
      season.season_number.toString().includes(searchQuery);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && getSeasonStatus(season).label === "Активен") ||
      (statusFilter === "ended" && getSeasonStatus(season).label === "Завершён") ||
      (statusFilter === "upcoming" && getSeasonStatus(season).label === "Скоро");
    return matchesSearch && matchesStatus;
  });

  const activeSeasons = seasons.filter((s) => getSeasonStatus(s).label === "Активен");
  const endedSeasons = seasons.filter((s) => getSeasonStatus(s).label === "Завершён");

  return (
    <div className="space-y-6">
      {/* Улучшенный заголовок с градиентом */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Управление сезонами
                </h1>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">
                  Полный контроль над сезонами, призами и распределением наград
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={checkEndedSeasons}
              disabled={checkSeasonsLoading}
              className="gap-2 hover:bg-primary/10 hover:border-primary/30 transition-all"
            >
              <RefreshCw className={cn("w-4 h-4", checkSeasonsLoading && "animate-spin")} />
              Проверить сезоны
            </Button>
            <Button
              variant="outline"
              onClick={planNextSeason}
              className="gap-2 hover:bg-primary/10 hover:border-primary/30 transition-all"
            >
              <Calendar className="w-4 h-4" />
              Запланировать следующий
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
                  onClick={resetSeasonForm}
                >
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
                <SeasonForm
                  form={seasonForm}
                  setForm={setSeasonForm}
                  onSubmit={createSeason}
                  onCancel={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Улучшенная статистика с анимациями */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className="border-2 border-border/50 hover:border-primary/30 transition-all overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Всего сезонов</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {seasons.length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
        >
          <Card className="border-2 border-green-500/20 hover:border-green-500/40 transition-all overflow-hidden relative group bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Активных</p>
                  <p className="text-3xl font-black text-green-600">{activeSeasons.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
        >
          <Card className="border-2 border-orange-500/20 hover:border-orange-500/40 transition-all overflow-hidden relative group bg-gradient-to-br from-orange-500/5 to-transparent">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Завершённых</p>
                  <p className="text-3xl font-black text-orange-600">{endedSeasons.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.15 }}
        >
          <Card className="border-2 border-purple-500/20 hover:border-purple-500/40 transition-all overflow-hidden relative group bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">С призами</p>
                  <p className="text-3xl font-black text-purple-600">
                    {Object.keys(rewards).length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                  <Trophy className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Tabs defaultValue="seasons" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full md:w-auto grid-cols-4 gap-2">
            <TabsTrigger value="seasons" className="gap-2">
              <Calendar className="w-4 h-4" />
              Сезоны
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2">
              <Activity className="w-4 h-4" />
              Мониторинг
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="w-4 h-4" />
              Логи
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Руководство
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="seasons" className="space-y-4">
          {/* Фильтры */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию или номеру..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="ended">Завершённые</SelectItem>
                    <SelectItem value="upcoming">Скоро</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Список сезонов */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
          ) : filteredSeasons.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Сезоны не найдены</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredSeasons.map((season) => {
                const status = getSeasonStatus(season);
                const StatusIcon = status.icon;
                const daysRemaining = getDaysRemaining(season.end_date);
                const seasonRewards = rewards[season.id] || [];
                const hasRewards = seasonRewards.length > 0;
                const stats = seasonStats[season.id];

                return (
                  <SeasonCard
                    key={season.id}
                    season={season}
                    status={status}
                    StatusIcon={StatusIcon}
                    daysRemaining={daysRemaining}
                    seasonRewards={seasonRewards}
                    hasRewards={hasRewards}
                    stats={stats}
                    onEdit={() => openEditDialog(season)}
                    onDelete={() => {
                      setSeasonToDelete(season);
                      setDeleteDialogOpen(true);
                    }}
                    onToggleActive={() => toggleSeasonActive(season)}
                    onDistributeRewards={() => distributeRewards(season.id)}
                    distributeRewardsLoading={distributeRewardsLoading}
                    onViewRewards={() => {
                      setSelectedSeason(season);
                      setRewardsDialogOpen(true);
                    }}
                    onViewStats={() => {
                      setSelectedSeason(season);
                      setStatsDialogOpen(true);
                    }}
                    formatDate={formatDate}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <MonitoringTab
            seasons={seasons}
            rewards={rewards}
            seasonStats={seasonStats}
            getSeasonStatus={getSeasonStatus}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <CronLogsTab logs={cronLogs} onRefresh={loadCronLogs} />
        </TabsContent>

        <TabsContent value="guide" className="space-y-4">
          <GuideTab />
        </TabsContent>
      </Tabs>

      {/* Диалог редактирования */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать сезон</DialogTitle>
            <DialogDescription>Измените параметры сезона</DialogDescription>
          </DialogHeader>
          <SeasonForm
            form={seasonForm}
            setForm={setSeasonForm}
            onSubmit={updateSeason}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Диалог управления призами */}
      <Dialog open={rewardsDialogOpen} onOpenChange={setRewardsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Призы лидерборда: Сезон {selectedSeason?.season_number}</DialogTitle>
            <DialogDescription>
              Настройка призов для топ-3 и топ-10. Призы начисляются автоматически в конце сезона.
            </DialogDescription>
          </DialogHeader>
          {selectedSeason && (
            <RewardsDialogContent
              season={selectedSeason}
              rewards={rewards[selectedSeason.id] || []}
              onSave={loadSeasons}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог статистики */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Статистика сезона {selectedSeason?.season_number}</DialogTitle>
          </DialogHeader>
          {selectedSeason && (
            <StatsDialogContent
              season={selectedSeason}
              stats={seasonStats[selectedSeason.id]}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сезон?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить сезон "{seasonToDelete?.name_ru}"? Это действие
              нельзя отменить. Все связанные данные (призы, прогресс игроков) также будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSeason} className="bg-destructive">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Компонент формы сезона
function SeasonForm({
  form,
  setForm,
  onSubmit,
  onCancel,
}: {
  form: any;
  setForm: (form: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Номер сезона</Label>
          <Input
            type="number"
            value={form.season_number}
            onChange={(e) => setForm({ ...form, season_number: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div>
          <Label>Тема</Label>
          <Select value={form.theme} onValueChange={(value) => setForm({ ...form, theme: value })}>
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
          value={form.name_ru}
          onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
          placeholder="Операция Асфальт"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Название (ES)</Label>
          <Input
            value={form.name_es}
            onChange={(e) => setForm({ ...form, name_es: e.target.value })}
            placeholder="Operación Asfalto"
          />
        </div>
        <div>
          <Label>Название (EN)</Label>
          <Input
            value={form.name_en}
            onChange={(e) => setForm({ ...form, name_en: e.target.value })}
            placeholder="Operation Asphalt"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Дата начала</Label>
          <Input
            type="datetime-local"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Дата окончания (через 30 дней)</Label>
          <Input
            type="datetime-local"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Описание (RU)</Label>
        <Textarea
          value={form.description_ru}
          onChange={(e) => setForm({ ...form, description_ru: e.target.value })}
          placeholder="Первый сезон Duel Pass! Получайте награды за активность и обучение."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button onClick={onSubmit}>Сохранить</Button>
      </div>
    </div>
  );
}

// Компонент карточки сезона
function SeasonCard({
  season,
  status,
  StatusIcon,
  daysRemaining,
  seasonRewards,
  hasRewards,
  stats,
  onEdit,
  onDelete,
  onToggleActive,
  onDistributeRewards,
  distributeRewardsLoading,
  onViewRewards,
  onViewStats,
  formatDate,
}: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onToggleActive}>
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
                    {seasonRewards.length} призов
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-orange-600">
                    <AlertCircle className="w-3 h-3" />
                    Не настроены
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={onViewRewards}>
                  <Award className="w-4 h-4 mr-2" />
                  Управление
                </Button>
                <Button variant="outline" size="sm" onClick={onViewStats}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Статистика
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {new Date(season.end_date) <= new Date() && season.is_active && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const rewardsDistributed = stats?.total_rewards_distributed || 0;
                    const hasRewards = seasonRewards.length > 0;

                    if (rewardsDistributed > 0) {
                      return (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          Призы распределены ({rewardsDistributed} наград)
                        </div>
                      );
                    } else if (hasRewards) {
                      return (
                        <div className="flex items-center gap-2 text-orange-600">
                          <AlertCircle className="w-4 h-4" />
                          Сезон завершён. Нажмите "Проверить сезоны" для автоматического распределения.
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          Призы не настроены. Настройте призы перед распределением.
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {new Date(season.end_date) <= new Date() &&
                !(stats?.total_rewards_distributed) && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onDistributeRewards}
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
}

// Компонент диалога призов
function RewardsDialogContent({ season, rewards, onSave }: { season: Season; rewards: LeaderboardReward[]; onSave: () => void }) {
  const [showEditor, setShowEditor] = useState(false);

  if (showEditor) {
    return (
      <RewardsEditor
        seasonId={season.id}
        seasonNumber={season.season_number}
        onClose={() => setShowEditor(false)}
        onSave={() => {
          onSave();
          setShowEditor(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Призы лидерборда</h3>
          <p className="text-sm text-muted-foreground">Сезон {season.season_number}</p>
        </div>
        <Button onClick={() => setShowEditor(true)}>
          <Edit className="w-4 h-4 mr-2" />
          Редактировать призы
        </Button>
      </div>

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
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Текущие призы:</h4>
        {rewards.length > 0 ? (
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
              {rewards
                .sort((a, b) => a.position - b.position)
                .map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell className="font-bold">#{reward.position}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{reward.reward_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{reward.description_ru || "—"}</TableCell>
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
          <div className="p-4 bg-muted/50 rounded-lg text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Призы для этого сезона ещё не настроены.
            </p>
            <Button onClick={() => setShowEditor(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать призы
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Компонент диалога статистики
function StatsDialogContent({ season, stats }: { season: Season; stats?: SeasonStats }) {
  return (
    <div className="space-y-4">
      {stats ? (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Игроков с призами</p>
              <p className="text-2xl font-bold">{stats.players_with_rewards}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Призов распределено</p>
              <p className="text-2xl font-bold">{stats.total_rewards_distributed}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Статистика загружается...</p>
      )}
    </div>
  );
}

// Компонент вкладки мониторинга
function MonitoringTab({ seasons, rewards, seasonStats, getSeasonStatus, formatDate }: any) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Обзор системы</CardTitle>
          <CardDescription>Мониторинг сезонов и призов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Всего сезонов</p>
              <p className="text-2xl font-bold">{seasons.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">С призами</p>
              <p className="text-2xl font-bold">{Object.keys(rewards).length}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Активных</p>
              <p className="text-2xl font-bold">
                {seasons.filter((s: Season) => getSeasonStatus(s).label === "Активен").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Компонент вкладки руководства
function GuideTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">Руководство по управлению сезонами</CardTitle>
              <CardDescription>
                Полная инструкция по работе с сезонами, призами и автоматическим распределением
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Быстрый старт */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">🚀 Быстрый старт</h3>
                <p className="text-sm text-muted-foreground">Начни работу за 5 минут</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all overflow-hidden relative group h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                      Создание сезона
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <p>Нажми <strong className="text-primary">"Запланировать следующий"</strong> — система автоматически заполнит даты</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <p>Проверь даты начала и окончания (автоматически: текущий сезон + 30 дней)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <p>Заполни название (RU, ES, EN) и описание сезона</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        4
                      </div>
                      <p>Выбери тему (зима, весна, лето, осень, специальный) и сохрани</p>
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>Совет:</strong> Сезон автоматически активируется при создании. Можно деактивировать позже.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
              >
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all overflow-hidden relative group h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Award className="w-5 h-5 text-primary" />
                      </div>
                      Настройка призов
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <p>Открой карточку сезона и нажми <strong className="text-primary">"Управление"</strong> в разделе "Призы лидерборда"</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <p>Нажми <strong className="text-primary">"Применить шаблон"</strong> для позиций 1, 2, 3, 4-10</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <p>При необходимости отредактируй призы (измени количество монет, выбери другую косметику)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        4
                      </div>
                      <p>Готово! Призы настроены и готовы к автоматическому распределению</p>
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>Совет:</strong> Шаблоны создают стандартный набор призов. Можно добавить дополнительные призы вручную.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.section>

          {/* Автоматическое распределение */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">🤖 Автоматическое распределение призов</h3>
                <p className="text-sm text-muted-foreground">Как работает система автоматического распределения</p>
              </div>
            </div>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold mb-2">Как это работает:</p>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Сезон завершается в указанную дату</li>
                        <li>Триггер в БД автоматически логирует событие</li>
                        <li>Нажми <strong>"Проверить сезоны"</strong> — система найдёт все завершившиеся сезоны</li>
                        <li>Призы распределятся <strong>автоматически</strong> для каждого сезона</li>
                        <li>Статус отобразится в карточке сезона</li>
                      </ol>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/30 hover:border-green-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="font-bold text-green-600">✅ Призы распределены</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Показано количество распределённых наград. Все игроки получили свои призы.
                    </p>
                    <div className="mt-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-green-700 dark:text-green-400">
                        💡 Призы можно посмотреть в разделе "Статистика" сезона
                      </p>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-orange-500/20">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      </div>
                      <p className="font-bold text-orange-600">⏳ Сезон завершён</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Призы настроены, но ещё не распределены. Нажми "Проверить сезоны" для автоматического распределения.
                    </p>
                    <div className="mt-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <p className="text-xs text-orange-700 dark:text-orange-400">
                        💡 Система автоматически найдёт этот сезон и распределит призы
                      </p>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="p-5 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/30 hover:border-red-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-red-500/20">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <p className="font-bold text-red-600">⚠️ Призы не настроены</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Настрой призы через редактор перед распределением. Без призов распределение не произойдёт.
                    </p>
                    <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-700 dark:text-red-400">
                        💡 Используй шаблоны для быстрого создания призов
                      </p>
                    </div>
                  </motion.div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Технические детали
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                      <p className="font-semibold text-sm mb-2">Edge Function: season-end-rewards</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Функция вызывается автоматически при нажатии "Проверить сезоны". Она:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                        <li>Определяет топ-10 игроков по уровню и XP</li>
                        <li>Вызывает RPC `claim_leaderboard_rewards` для каждого игрока</li>
                        <li>Распределяет косметику (скины, бейджи, рамки) в инвентарь</li>
                        <li>Начисляет монеты в кошелёк</li>
                        <li>Создаёт уведомления для пользователей</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                      <p className="font-semibold text-sm mb-2">RPC: claim_leaderboard_rewards</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Функция в БД, которая обрабатывает начисление призов:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                        <li>Получает все призы для позиции из `leaderboard_season_rewards`</li>
                        <li>Создаёт запись в `user_leaderboard_rewards`</li>
                        <li>Логирует все операции для отслеживания</li>
                        <li>Возвращает JSON с результатом распределения</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Детальное описание редактора призов */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">🎁 Редактор призов — полное руководство</h3>
                <p className="text-sm text-muted-foreground">Всё о создании, редактировании и управлении призами</p>
              </div>
            </div>
            <Card className="border-2 border-primary/20">
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Copy className="w-4 h-4 text-primary" />
                        Быстрое создание через шаблоны
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p className="text-muted-foreground">
                          Шаблоны создают полный набор призов для каждой позиции одним кликом:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><strong>1 место:</strong> Скин + Бейдж + Рамка + Титул + Аура + 500 монет</li>
                          <li><strong>2 место:</strong> Скин + Бейдж + Рамка + Титул + Аура + 350 монет</li>
                          <li><strong>3 место:</strong> Скин + Бейдж + Рамка + Титул + Аура + 250 монет</li>
                          <li><strong>4-10 места:</strong> Бейдж + Рамка + Титул + Аура + 100 монет</li>
                        </ul>
                        <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <p className="text-xs text-blue-700 dark:text-blue-400">
                            💡 После применения шаблона можно отредактировать любой приз или добавить дополнительные.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Edit className="w-4 h-4 text-primary" />
                        Ручное создание призов
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p className="text-muted-foreground mb-3">
                          Для создания кастомных призов:
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-bold">1.</span>
                            <p>Нажми <strong>"Добавить приз"</strong> или <strong>"Добавить"</strong> для конкретной позиции</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-bold">2.</span>
                            <p>Выбери тип приза из списка</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-bold">3.</span>
                            <p>Заполни параметры (ID косметики, количество монет, описание)</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-primary font-bold">4.</span>
                            <p>Настрой дополнительные опции (эксклюзивность, автоактивация)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Типы призов и их параметры
                  </h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="w-4 h-4 text-yellow-600" />
                        <p className="font-semibold text-sm">Монеты</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Укажи количество монет (от 1 до 10000). Монеты начисляются автоматически в кошелёк пользователя.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <p className="font-semibold text-sm">Скин</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Выбери скин из списка доступных. Можно включить автоактивацию — скин автоматически активируется при получении.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-sm">Бейдж</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Выбери бейдж из списка. Можно включить автопоказ — бейдж автоматически отобразится в профиле.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <p className="font-semibold text-sm">Рамка</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Выбери рамку профиля. Рамка автоматически активируется при получении (если включена опция).
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-orange-600" />
                        <p className="font-semibold text-sm">Титул</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Укажи ID титула (например: "title_champion_season_1"). Титул отображается в профиле игрока.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-pink-600" />
                        <p className="font-semibold text-sm">Аура</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Укажи тип ауры (elite, champion, silver, bronze). Аура создаёт визуальный эффект вокруг аватара.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Важные настройки
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        Эксклюзивный приз
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Отметь эту опцию для уникальных призов (например, чемпионский скин). Эти призы больше не появятся в будущих сезонах и создают дополнительную мотивацию для игроков.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        Автоматическая активация/показ
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Для скинов и рамок: автоматически активируется при получении. Для бейджей: автоматически отображается в профиле. Это улучшает UX — игрок сразу видит награду.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Типичный workflow */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">📅 Типичный workflow</h3>
                <p className="text-sm text-muted-foreground">Пошаговые сценарии работы с сезонами</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Подготовка нового сезона
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Создай сезон</p>
                        <p className="text-sm text-muted-foreground">
                          Нажми "Запланировать следующий" → проверь даты (автоматически: следующий день после окончания текущего + 30 дней) → заполни название и описание → сохрани
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Настрой призы</p>
                        <p className="text-sm text-muted-foreground">
                          Открой "Управление призами" → примени шаблоны для позиций 1, 2, 3, 4-10 → при необходимости отредактируй призы → готово!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Активируй сезон</p>
                        <p className="text-sm text-muted-foreground">
                          Сезон автоматически активен при создании. Если нужно деактивировать — нажми "Деактивировать" в карточке сезона.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Завершение сезона
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Сезон завершается</p>
                        <p className="text-sm text-muted-foreground">
                          Автоматически в указанную дату. Триггер логирует событие в `cron_job_logs`.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Проверь сезоны</p>
                        <p className="text-sm text-muted-foreground">
                          Нажми "Проверить сезоны" → система найдёт завершившиеся → автоматически распределит призы для каждого сезона.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Проверь статус</p>
                        <p className="text-sm text-muted-foreground">
                          В карточке сезона будет показано: "Призы распределены (X наград)" с зелёным индикатором.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <HelpCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">❓ Часто задаваемые вопросы</h3>
                <p className="text-sm text-muted-foreground">Ответы на популярные вопросы</p>
              </div>
            </div>
            <div className="space-y-3">
              <motion.div
                whileHover={{ scale: 1.01, x: 4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="border-2 border-border/50 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Info className="w-4 h-4 text-primary" />
                      </div>
                      Нужно ли нажимать "Распределить призы" вручную?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Нет!</strong> Просто нажми <strong className="text-primary">"Проверить сезоны"</strong> — система автоматически найдёт все завершившиеся сезоны и распределит призы для каждого. Кнопка "Распределить призы" в карточке сезона нужна только для ручного распределения конкретного сезона (если автоматическое не сработало).
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.01, x: 4 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.05 }}
              >
                <Card className="border-2 border-border/50 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Info className="w-4 h-4 text-primary" />
                      </div>
                      Что если призы не настроены?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Система покажет красное предупреждение: "Призы не настроены". Открой "Управление призами" и настрой призы через редактор (используй шаблоны для быстрого создания), затем нажми "Проверить сезоны" для распределения.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.01, x: 4 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              >
                <Card className="border-2 border-border/50 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Info className="w-4 h-4 text-primary" />
                      </div>
                      Можно ли изменить призы после создания?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Да!</strong> Открой редактор призов и нажми ✏️ на любом призе. Измени параметры (тип, количество монет, косметику, описание) и сохрани. Изменения применятся сразу, но уже распределённые призы не изменятся.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.01, x: 4 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.15 }}
              >
                <Card className="border-2 border-border/50 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Info className="w-4 h-4 text-primary" />
                      </div>
                      Как создать призы для всех позиций сразу?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Используй шаблоны: нажми "Применить шаблон" для позиции 1, затем для 2, затем для 3, и наконец для 4-10 (создаст для всех позиций сразу). Это займёт меньше минуты!
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.01, x: 4 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
              >
                <Card className="border-2 border-border/50 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Info className="w-4 h-4 text-primary" />
                      </div>
                      Что делать, если призы не распределились?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div>1. Проверь, что призы настроены (зелёный/оранжевый статус в карточке сезона)</div>
                      <div>2. Проверь, что сезон действительно завершился (<code className="text-xs bg-muted px-1 py-0.5 rounded">end_date &lt;= NOW()</code>)</div>
                      <div>3. Нажми "Проверить сезоны" ещё раз</div>
                      <div>4. Проверь логи Edge Function <code className="text-xs bg-muted px-1 py-0.5 rounded">season-end-rewards</code> в Dashboard Supabase</div>
                      <div>5. Если не помогло — нажми "Распределить призы" вручную для конкретного сезона</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.01, x: 4 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.25 }}
              >
                <Card className="border-2 border-border/50 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Info className="w-4 h-4 text-primary" />
                      </div>
                      Можно ли создать сезон с нестандартной длительностью?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Да, можно указать любые даты начала и окончания. Но рекомендуется использовать стандартную длительность 30 дней для синхронизации с другими системами (Duel Pass, челленджи). При планировании следующего сезона система автоматически предлагает 30 дней.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.section>

          {/* Полезные советы */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">💡 Полезные советы и лучшие практики</h3>
                <p className="text-sm text-muted-foreground">Рекомендации для эффективной работы</p>
              </div>
            </div>
            <Card className="border-2 border-primary/20">
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Copy className="w-4 h-4 text-primary" />
                        Шаблоны призов
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Используй шаблоны для быстрого создания стандартных призов:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Crown className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>1 место</strong> — чемпионский набор (скин, бейдж, рамка, титул, аура, 500 монет)
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <Award className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>2 место</strong> — серебряный набор (350 монет)
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <Award className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>3 место</strong> — бронзовый набор (250 монет)
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>4-10 места</strong> — элитный набор (100 монет)
                          </div>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          💡 После применения шаблона можно отредактировать любой приз или добавить дополнительные.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Косметика
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        При выборе скина/бейджа/рамки:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>Список загружается из базы данных автоматически</div>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>Показывается редкость каждого предмета (common, rare, epic, legendary)</div>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>Можно создать новую косметику в таблицах `skin_definitions`, `badge_definitions`</div>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-xs text-purple-700 dark:text-purple-400">
                          💡 Для создания новой косметики используй SQL миграцию или админ-панель (если доступна).
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" />
                      Эксклюзивные призы
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Отметь "Эксклюзивный" для уникальных призов (например, чемпионский скин). Эти призы:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>Больше не появятся в будущих сезонах</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>Создают дополнительную мотивацию для игроков</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>Повышают ценность достижения топ-3</div>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Автоматизация
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Всё работает автоматически:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>Просто настрой призы один раз, и система сама распределит их при завершении сезона</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>Триггер в БД автоматически логирует завершившиеся сезоны</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>Edge Function автоматически определяет топ-10 и распределяет призы</div>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Техническая информация */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">⚙️ Техническая информация</h3>
                <p className="text-sm text-muted-foreground">Детали реализации и архитектуры</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Таблицы базы данных</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">duel_pass_seasons</p>
                    <p className="text-xs text-muted-foreground">Хранит информацию о сезонах</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">leaderboard_season_rewards</p>
                    <p className="text-xs text-muted-foreground">Определения призов для каждой позиции</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">user_leaderboard_rewards</p>
                    <p className="text-xs text-muted-foreground">Полученные призы пользователями</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">cron_job_logs</p>
                    <p className="text-xs text-muted-foreground">Логи автоматических проверок</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Edge Functions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">season-end-rewards</p>
                    <p className="text-xs text-muted-foreground">Распределение призов в конце сезона</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">duel-pass-leaderboard</p>
                    <p className="text-xs text-muted-foreground">Получение данных лидерборда</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">RPC функции</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">claim_leaderboard_rewards</p>
                    <p className="text-xs text-muted-foreground">Начисление призов пользователю</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">manual_check_seasons</p>
                    <p className="text-xs text-muted-foreground">Проверка завершившихся сезонов</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">check_and_log_ended_seasons</p>
                    <p className="text-xs text-muted-foreground">Автоматическая проверка и логирование</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Триггеры</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="font-semibold">trigger_auto_distribute_rewards</p>
                    <p className="text-xs text-muted-foreground">Автоматическое логирование завершившихся сезонов</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>
        </CardContent>
      </Card>
    </div>
  );
}

// Компонент вкладки логов
function CronLogsTab({ logs, onRefresh }: { logs: CronLog[]; onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Логи Cron задач</h3>
          <p className="text-sm text-muted-foreground">
            История выполнения автоматических проверок сезонов
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Логи не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Сезонов найдено</TableHead>
                  <TableHead>Детали</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString("ru-RU")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === "success"
                            ? "default"
                            : log.status === "error"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.result_data?.seasons_found || 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.result_data?.message || log.error_message || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
