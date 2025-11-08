import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Target,
  FileQuestion,
  Users,
  Activity,
  Database,
  AlertTriangle,
  Edit,
  Upload,
  TrendingUp,
  Clock,
  BarChart3,
  Server,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SystemStatus, SystemHealthStatus } from "@/components/admin/SystemStatus";
import { StatsWidget } from "@/components/admin/StatsWidget";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    topics: 0,
    questions: 0,
    users: 0,
    tags: 0,
    reports: 0,
    activeUsers: 0,
    languageTerms: 0,
    roadSigns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const [
        topicsRes,
        questionsRes,
        usersRes,
        tagsRes,
        reportsRes,
        termsRes,
        signsRes,
        activeUsersRes,
      ] = await Promise.all([
        supabase.from("topics").select("*", { count: "exact", head: true }),
        supabase.from("questions_new").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tags").select("*", { count: "exact", head: true }),
        supabase
          .from("question_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("language_terms").select("*", { count: "exact", head: true }),
        supabase.from("road_signs").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("last_seen", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setStats({
        topics: topicsRes.count || 0,
        questions: questionsRes.count || 0,
        users: usersRes.count || 0,
        tags: tagsRes.count || 0,
        reports: reportsRes.count || 0,
        languageTerms: termsRes.count || 0,
        roadSigns: signsRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data } = await supabase
        .from("question_reports")
        .select("*, user:profiles!question_reports_user_id_fkey(first_name, username)")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentActivity(data || []);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const quickActions = [
    {
      title: "Отчёты о проблемах",
      description: "Просмотр и обработка отчётов",
      icon: AlertTriangle,
      path: "/admin/reports",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      count: stats.reports,
      delay: 0.1,
    },
    {
      title: "Редактор",
      description: "Редактирование материалов",
      icon: Edit,
      path: "/admin/editor",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      delay: 0.2,
    },
    {
      title: "Синхронизация",
      description: "Синхронизация с Google Sheets",
      icon: Database,
      path: "/admin/sync",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      delay: 0.3,
    },
    {
      title: "Импорт данных",
      description: "Импорт из файлов",
      icon: Upload,
      path: "/admin/import",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      delay: 0.4,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
          />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Центр управления
          </h1>
          <p className="text-muted-foreground text-lg">
            Обзор системы и мониторинг в реальном времени
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-4 py-2">
          <Clock className="h-3 w-3 mr-2" />
          {new Date().toLocaleTimeString('ru-RU')}
        </Badge>
      </motion.div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <SystemStatus onStatusChange={setSystemHealth} />
      </motion.div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsWidget
          title="Темы"
          value={stats.topics}
          icon={Target}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          description="Учебных тем"
        />
        <StatsWidget
          title="Вопросы"
          value={stats.questions}
          icon={FileQuestion}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          description="Тестовых вопросов"
        />
        <StatsWidget
          title="Пользователи"
          value={stats.users}
          icon={Users}
          iconColor="text-green-600"
          iconBgColor="bg-green-50 dark:bg-green-900/20"
          description={`${stats.activeUsers} активных за 24ч`}
        />
        <StatsWidget
          title="Термины"
          value={stats.languageTerms}
          icon={Activity}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-50 dark:bg-orange-900/20"
          description="Языковых терминов"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsWidget
          title="Дорожные знаки"
          value={stats.roadSigns}
          icon={Database}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatsWidget
          title="Теги"
          value={stats.tags}
          icon={BarChart3}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <StatsWidget
          title="Активные пользователи"
          value={stats.activeUsers}
          icon={Zap}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-50 dark:bg-yellow-900/20"
          description="За последние 24 часа"
        />
        <StatsWidget
          title="Отчёты"
          value={stats.reports}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-50 dark:bg-red-900/20"
          description="Требуют внимания"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold mb-4 flex items-center gap-2"
        >
          <TrendingUp className="h-6 w-6" />
          Быстрые действия
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.path}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onClick={() => navigate(action.path)}
              count={action.count}
              color={action.color}
              bgColor={action.bgColor}
              delay={action.delay}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity & System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Последняя активность
            </CardTitle>
            <CardDescription>Недавние отчёты о проблемах</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Нет активности
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {activity.user?.first_name || activity.user?.username || "Неизвестный пользователь"}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/admin/reports")}
                    >
                      Просмотр
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Информация о системе
            </CardTitle>
            <CardDescription>Техническая информация</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm font-medium">Версия приложения</span>
                <Badge variant="outline">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm font-medium">Среда выполнения</span>
                <Badge variant="outline">
                  {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm font-medium">База данных</span>
                <Badge
                  variant={systemHealth?.database === 'healthy' ? 'default' : 'destructive'}
                  className={cn(
                    systemHealth?.database === 'healthy' && 'bg-emerald-500'
                  )}
                >
                  {systemHealth?.database === 'healthy' ? 'Оперативна' : 'Проблемы'}
                </Badge>
              </div>
              {systemHealth?.latency && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm font-medium">Задержка</span>
                  <Badge variant="outline">{systemHealth.latency}ms</Badge>
                </div>
              )}
            </div>
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  fetchStats();
                  fetchRecentActivity();
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Обновить данные
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
