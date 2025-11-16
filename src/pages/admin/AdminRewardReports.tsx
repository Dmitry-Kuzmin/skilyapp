import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  User,
  Calendar,
  Zap,
  TrendingDown,
  Info,
  Eye,
  Loader2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AdminReport {
  id: string;
  user_id: string;
  report_type: string;
  session_id: string | null;
  test_result_id: string | null;
  reward_calculation_data: any;
  user_message: string | null;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: {
    first_name: string | null;
    email: string | null;
    telegram_id: string | null;
  };
}

export function AdminRewardReports() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reviewed" | "resolved" | "dismissed">("pending");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadReports();
    }
  }, [isAdmin, statusFilter]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Доступ запрещен", {
        description: "Необходима авторизация",
      });
      navigate("/");
      return;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error || !data) {
      toast.error("Доступ запрещен", {
        description: "Требуются права администратора",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setAuthLoading(false);
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("admin_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Загружаем профили пользователей
      const userIds = [...new Set((data || []).map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, email, telegram_id")
        .in("id", userIds);

      const profilesMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      const reportsWithProfiles = (data || []).map((report) => ({
        ...report,
        user_profile: profilesMap.get(report.user_id),
      }));

      setReports(reportsWithProfiles);
    } catch (error: any) {
      console.error("[AdminRewardReports] Error loading reports:", error);
      toast.error("Ошибка загрузки отчетов", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (
    reportId: string,
    status: "reviewed" | "resolved" | "dismissed"
  ) => {
    try {
      setUpdatingStatus(reportId);
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        status,
        resolved_by: user?.id || null,
        resolved_at: new Date().toISOString(),
      };

      if (adminNotes.trim()) {
        updateData.admin_notes = adminNotes.trim();
      }

      const { error } = await supabase
        .from("admin_reports")
        .update(updateData)
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Статус обновлен", {
        description: `Отчет помечен как ${getStatusLabel(status)}`,
      });

      setSelectedReport(null);
      setAdminNotes("");
      loadReports();
    } catch (error: any) {
      console.error("[AdminRewardReports] Error updating status:", error);
      toast.error("Ошибка обновления статуса", {
        description: error.message,
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Ожидает",
      reviewed: "Проверен",
      resolved: "Решен",
      dismissed: "Отклонен",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "default" as const, icon: Clock, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
      reviewed: { variant: "secondary" as const, icon: Eye, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      resolved: { variant: "default" as const, icon: CheckCircle2, className: "bg-green-500/10 text-green-600 border-green-500/20" },
      dismissed: { variant: "destructive" as const, icon: XCircle, className: "bg-red-500/10 text-red-600 border-red-500/20" },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={cn("flex items-center gap-1", config.className)}>
        <Icon className="w-3 h-3" />
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const filteredReports = reports.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Отчеты о наградах</h1>
          <p className="text-muted-foreground mt-1">
            Управление жалобами пользователей на расчет наград
          </p>
        </div>
        <Button onClick={loadReports} variant="outline" size="sm">
          <Loader2 className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="pending">Ожидают ({reports.filter((r) => r.status === "pending").length})</TabsTrigger>
              <TabsTrigger value="reviewed">Проверены ({reports.filter((r) => r.status === "reviewed").length})</TabsTrigger>
              <TabsTrigger value="resolved">Решены ({reports.filter((r) => r.status === "resolved").length})</TabsTrigger>
              <TabsTrigger value="dismissed">Отклонены ({reports.filter((r) => r.status === "dismissed").length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет отчетов с выбранным статусом</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    report.status === "pending" && "border-yellow-500/50"
                  )}
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(report.status)}
                          <span className="text-sm text-muted-foreground">
                            {formatDate(report.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {report.user_profile?.first_name || "Пользователь"}
                          </span>
                          {report.user_profile?.email && (
                            <span className="text-muted-foreground">
                              ({report.user_profile.email})
                            </span>
                          )}
                        </div>
                        {report.user_message && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{report.user_message}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {report.reward_calculation_data?.rewards?.abuse_penalty && (
                            <div className="flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              Штраф: {Math.round((1 - report.reward_calculation_data.rewards.abuse_penalty) * 100)}%
                            </div>
                          )}
                          {report.reward_calculation_data?.rewards?.diminishing_factor && (
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Снижение: {Math.round((1 - report.reward_calculation_data.rewards.diminishing_factor) * 100)}%
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(report);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Подробнее
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Отчет #{selectedReport.id.slice(0, 8)}
                  {getStatusBadge(selectedReport.status)}
                </DialogTitle>
                <DialogDescription>
                  Создан {formatDate(selectedReport.created_at)}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList>
                  <TabsTrigger value="details">Детали</TabsTrigger>
                  <TabsTrigger value="calculation">Расчет наград</TabsTrigger>
                  <TabsTrigger value="history">История тестов</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  {/* User Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Информация о пользователе</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Имя:</span>
                          <span className="ml-2 font-medium">
                            {selectedReport.user_profile?.first_name || "Не указано"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <span className="ml-2 font-medium">
                            {selectedReport.user_profile?.email || "Не указано"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Telegram ID:</span>
                          <span className="ml-2 font-medium">
                            {selectedReport.user_profile?.telegram_id || "Не указано"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">User ID:</span>
                          <span className="ml-2 font-mono text-xs">
                            {selectedReport.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Message */}
                  {selectedReport.user_message && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MessageCircle className="w-5 h-5" />
                          Сообщение пользователя
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{selectedReport.user_message}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Test Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Информация о тесте</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Session ID:</span>
                          <span className="ml-2 font-mono text-xs">
                            {selectedReport.session_id || "Не указано"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Test Result ID:</span>
                          <span className="ml-2 font-mono text-xs">
                            {selectedReport.test_result_id || "Не указано"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Режим:</span>
                          <span className="ml-2 font-medium">
                            {selectedReport.reward_calculation_data?.mode || "Не указано"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Score:</span>
                          <span className="ml-2 font-medium">
                            {selectedReport.reward_calculation_data?.score || 0}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Admin Notes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Заметки администратора</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <textarea
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Добавьте заметки..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                      {selectedReport.admin_notes && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Текущие заметки:</strong>
                          <p className="mt-1 whitespace-pre-wrap">{selectedReport.admin_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => updateReportStatus(selectedReport.id, "reviewed")}
                      disabled={updatingStatus === selectedReport.id}
                    >
                      {updatingStatus === selectedReport.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4 mr-2" />
                      )}
                      Пометить проверенным
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => updateReportStatus(selectedReport.id, "resolved")}
                      disabled={updatingStatus === selectedReport.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updatingStatus === selectedReport.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Решено
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => updateReportStatus(selectedReport.id, "dismissed")}
                      disabled={updatingStatus === selectedReport.id}
                    >
                      {updatingStatus === selectedReport.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Отклонить
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="calculation" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Детали расчета наград</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedReport.reward_calculation_data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Последние тесты пользователя</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedReport.reward_calculation_data?.recent_tests?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedReport.reward_calculation_data.recent_tests.map((test: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border bg-muted/50 text-sm"
                            >
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <span className="text-muted-foreground">Score:</span>
                                  <span className="ml-1 font-medium">{test.score}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Вопросов:</span>
                                  <span className="ml-1 font-medium">{test.questions_count}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Время:</span>
                                  <span className="ml-1 font-medium">
                                    {test.test_duration_seconds}s
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Дата:</span>
                                  <span className="ml-1 font-medium">
                                    {formatDate(test.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Нет данных о предыдущих тестах</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}





