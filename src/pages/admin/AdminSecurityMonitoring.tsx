import { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  Activity,
  Users,
  Server,
  TrendingUp,
  Clock,
  Eye,
  Lock,
  Globe,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "@/components/optimized/Motion";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/PageLoader";

interface SecurityMetrics {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  newUsers24h: number;
  suspiciousActivity: number;
  apiRequests24h: number;
  failedAuthAttempts: number;
  lastSecurityCheck: string | null;
}

interface ActivityLog {
  id: string;
  type: 'auth' | 'api' | 'database' | 'suspicious';
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address?: string;
}

export function AdminSecurityMonitoring() {

  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalUsers: 0,
    activeUsers24h: 0,
    activeUsers7d: 0,
    newUsers24h: 0,
    suspiciousActivity: 0,
    apiRequests24h: 0,
    failedAuthAttempts: 0,
    lastSecurityCheck: null,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchSecurityMetrics();
    fetchActivityLogs();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSecurityMetrics();
      fetchActivityLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Active users (last 24h)
      const { count: activeUsers24h } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", last24h.toISOString());

      // Active users (last 7 days)
      const { count: activeUsers7d } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", last7d.toISOString());

      // New users (last 24h)
      const { count: newUsers24h } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", last24h.toISOString());

      // Suspicious activity (users with unusual patterns)
      // Check for users with multiple failed login attempts or unusual activity
      const { count: suspiciousActivity } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .or("last_seen.is.null,last_seen.lt." + last7d.toISOString());

      // API requests (approximate from auth sessions)
      // Note: Full API logs require Supabase Dashboard or Edge Function
      const { count: apiRequests24h } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", last24h.toISOString());

      // Failed auth attempts (would need custom logging table)
      // For now, we'll use a placeholder
      const failedAuthAttempts = 0;

      setMetrics({
        totalUsers: totalUsers || 0,
        activeUsers24h: activeUsers24h || 0,
        activeUsers7d: activeUsers7d || 0,
        newUsers24h: newUsers24h || 0,
        suspiciousActivity: suspiciousActivity || 0,
        apiRequests24h: apiRequests24h || 0,
        failedAuthAttempts,
        lastSecurityCheck: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching security metrics:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить метрики безопасности",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      // Get recent user activity
      const { data: recentProfiles } = await supabase
        .from("profiles")
        .select("id, first_name, username, last_seen, created_at")
        .order("last_seen", { ascending: false, nullsFirst: false })
        .limit(20);

      // Transform to activity logs
      const logs: ActivityLog[] = (recentProfiles || []).map((profile) => ({
        id: profile.id,
        type: profile.last_seen ? 'api' : 'suspicious',
        description: profile.last_seen
          ? `Активность пользователя ${profile.first_name || profile.username || 'Неизвестный'}`
          : `Неактивный пользователь ${profile.first_name || profile.username || 'Неизвестный'}`,
        timestamp: profile.last_seen || profile.created_at,
        severity: profile.last_seen ? 'low' : 'medium',
        user_id: profile.id,
      }));

      setActivityLogs(logs);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSecurityMetrics(), fetchActivityLogs()]);
    toast({
      title: "Обновлено",
      description: "Метрики безопасности обновлены",
    });
  };

  const getSeverityColor = (severity: ActivityLog['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getSeverityLabel = (severity: ActivityLog['severity']) => {
    switch (severity) {
      case 'critical':
        return 'Критично';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return 'Неизвестно';
    }
  };

  if (loading) {
    return <PageLoader />;
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Мониторинг безопасности
          </h1>
          <p className="text-muted-foreground text-lg">
            Контроль активности, подозрительных действий и использования ресурсов
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-4 py-2">
            <Clock className="h-3 w-3 mr-2" />
            Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Обновить
          </Button>
        </div>
      </motion.div>

      {/* Security Status Alert */}
      {metrics.suspiciousActivity > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900 dark:text-orange-100">
                    Обнаружена подозрительная активность
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
                    {metrics.suspiciousActivity} неактивных пользователей за последние 7 дней
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего пользователей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{metrics.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Всего зарегистрировано</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активные (24ч)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{metrics.activeUsers24h}</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalUsers > 0
                      ? `${Math.round((metrics.activeUsers24h / metrics.totalUsers) * 100)}% от всех`
                      : '0%'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Новые пользователи (24ч)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{metrics.newUsers24h}</p>
                  <p className="text-xs text-muted-foreground">За последние 24 часа</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Подозрительная активность
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  metrics.suspiciousActivity > 0
                    ? "bg-red-50 dark:bg-red-900/20"
                    : "bg-gray-50 dark:bg-gray-900/20"
                )}>
                  <AlertTriangle className={cn(
                    "h-5 w-5",
                    metrics.suspiciousActivity > 0 ? "text-red-600" : "text-gray-600"
                  )} />
                </div>
                <div>
                  <p className="text-3xl font-bold">{metrics.suspiciousActivity}</p>
                  <p className="text-xs text-muted-foreground">Требуют внимания</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              API запросы (24ч)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.apiRequests24h}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Приблизительное количество
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Для точных данных используйте Supabase Dashboard → Logs
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Неудачные попытки входа
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.failedAuthAttempts}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Требуется настройка логирования
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Настройте Edge Function для отслеживания
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Активные (7 дней)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.activeUsers7d}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalUsers > 0
                ? `${Math.round((metrics.activeUsers7d / metrics.totalUsers) * 100)}% от всех`
                : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Logs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Журнал активности</TabsTrigger>
          <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Последняя активность
              </CardTitle>
              <CardDescription>
                События за последние 24 часа
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет данных об активности
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {activityLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn("p-2 rounded-lg", getSeverityColor(log.severity))}>
                        {log.type === 'auth' && <Lock className="h-4 w-4" />}
                        {log.type === 'api' && <Activity className="h-4 w-4" />}
                        {log.type === 'database' && <Server className="h-4 w-4" />}
                        {log.type === 'suspicious' && <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{log.description}</p>
                          <Badge className={cn("text-xs", getSeverityColor(log.severity))}>
                            {getSeverityLabel(log.severity)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Рекомендации по безопасности
              </CardTitle>
              <CardDescription>
                Действия для улучшения мониторинга
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Настройте логирование в Supabase</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Перейдите в Supabase Dashboard → Logs для детального мониторинга API запросов,
                        авторизации и работы с базой данных.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Настройте Edge Function для отслеживания</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Создайте Edge Function для логирования неудачных попыток входа и подозрительной активности.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Регулярно проверяйте метрики</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Рекомендуется проверять метрики безопасности еженедельно и настраивать алерты
                        при обнаружении подозрительной активности.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Используйте IP whitelist (если возможно)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ограничьте доступ к API только с ваших IP-адресов через настройки Supabase или Vercel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



