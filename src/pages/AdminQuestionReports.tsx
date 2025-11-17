import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, XCircle, Clock, Loader2, MessageSquare, Filter, Search, ChevronDown, ChevronUp, User, Calendar, FileText, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getImageUrl } from "@/utils/imageUtils";
import { cn } from "@/lib/utils";
import { AdminAIReports } from "./admin/AdminAIReports";

type ReportStatus = "pending" | "in_progress" | "resolved" | "dismissed";
type ReportType = "wrong_translation" | "wrong_answer" | "wrong_image" | "unclear_question" | "other";

interface QuestionReport {
  id: string;
  user_id: string;
  question_id: string;
  report_type: ReportType;
  description: string;
  status: ReportStatus;
  admin_response: string | null;
  admin_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  question: {
    id: string;
    question_es: string;
    question_ru: string;
    image_url: string | null;
    topics: {
      id: string;
      title_es: string;
      title_ru: string;
    } | null;
    answer_options: Array<{
      id: string;
      text_es: string;
      text_ru: string;
      is_correct: boolean;
      position: number;
    }> | null;
  } | null;
  user: {
    id: string;
    first_name: string;
    last_name: string | null;
    username: string | null;
  };
  admin: {
    id: string;
    first_name: string;
    last_name: string | null;
  } | null;
}

const reportTypeLabels: Record<ReportType, { es: string; ru: string }> = {
  wrong_translation: { es: "Traducción incorrecta", ru: "Неправильный перевод" },
  wrong_answer: { es: "Respuesta incorrecta", ru: "Неправильный ответ" },
  wrong_image: { es: "Imagen incorrecta", ru: "Неправильное изображение" },
  unclear_question: { es: "Pregunta poco clara", ru: "Неясный вопрос" },
  other: { es: "Otro problema", ru: "Другая проблема" }
};

const statusLabels: Record<ReportStatus, { es: string; ru: string; color: string }> = {
  pending: { es: "Pendiente", ru: "Ожидает", color: "bg-yellow-500" },
  in_progress: { es: "En progreso", ru: "В работе", color: "bg-blue-500" },
  resolved: { es: "Resuelto", ru: "Решено", color: "bg-emerald-500" },
  dismissed: { es: "Descartado", ru: "Отклонено", color: "bg-gray-500" }
};

const AdminQuestionReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<QuestionReport | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState<ReportStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadReports();
  }, [filterStatus]);

  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("question_reports")
        .select(`
          *,
          question:questions_new(
            id,
            question_es,
            question_ru,
            image_url,
            topics:topics(id, title_es, title_ru),
            answer_options(id, text_es, text_ru, is_correct, position)
          ),
          user:profiles!question_reports_user_id_fkey(id, first_name, last_name, username),
          admin:profiles!question_reports_admin_id_fkey(id, first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReports(data || []);
    } catch (error: any) {
      console.error("Error loading reports:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить отчёты",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report: QuestionReport) => {
    setSelectedReport(report);
    setAdminResponse(report.admin_response || "");
    setNewStatus(report.status);
    setIsDialogOpen(true);
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const updateData: any = {
        status: newStatus,
        admin_id: profile.id
      };

      if (adminResponse.trim()) {
        updateData.admin_response = adminResponse.trim();
      }

      const { error } = await supabase
        .from("question_reports")
        .update(updateData)
        .eq("id", selectedReport.id);

      if (error) throw error;

      // Create notification for user when status changes
      // Use "finish" type so it's not filtered out (reminder type is filtered in NotificationsPanel)
      try {
        let notificationTitle = "";
        let notificationMessage = "";
        const responseText = adminResponse.trim();

        switch (newStatus) {
          case "resolved":
            notificationTitle = "Проблема решена";
            if (responseText) {
              notificationMessage = "Администратор решил проблему, которую вы сообщили.\n\nОтвет администратора:\n" + responseText;
            } else {
              notificationMessage = "Администратор решил проблему, которую вы сообщили.";
            }
            break;
          case "in_progress":
            notificationTitle = "Проблема на рассмотрении";
            if (responseText) {
              notificationMessage = "Администратор рассматривает ваш отчёт.\n\nКомментарий администратора:\n" + responseText;
            } else {
              notificationMessage = "Администратор рассматривает ваш отчёт.";
            }
            break;
          case "dismissed":
            notificationTitle = "Отчёт отклонён";
            if (responseText) {
              notificationMessage = "Администратор отклонил ваш отчёт.\n\nПричина:\n" + responseText;
            } else {
              notificationMessage = "Администратор отклонил ваш отчёт.";
            }
            break;
          case "pending":
            notificationTitle = "Статус отчёта обновлён";
            if (responseText) {
              notificationMessage = "Администратор обновил статус вашего отчёта.\n\nКомментарий:\n" + responseText;
            } else {
              notificationMessage = "Администратор обновил статус вашего отчёта.";
            }
            break;
        }

        // Only create notification if status actually changed or if there's an admin response
        if (newStatus !== selectedReport.status || responseText) {
          const { error: notifError } = await supabase
            .from("duel_notifications")
            .insert({
              user_id: selectedReport.user_id,
              type: "finish", // Use "finish" type so it appears in notification center (not filtered)
              title: notificationTitle,
              message: notificationMessage,
              icon: newStatus === "resolved" ? "check-circle" : newStatus === "in_progress" ? "clock" : "alert-circle",
              metadata: {
                report_id: selectedReport.id,
                question_id: selectedReport.question_id,
                notification_type: "question_report_update",
                status: newStatus
              }
            });

          if (notifError) {
            console.error("Failed to create notification:", notifError);
            // Don't throw - notification is optional, but log error for debugging
          } else {
            console.log("Notification created successfully for user:", selectedReport.user_id);
          }
        }
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
        // Don't throw - notification is optional
      }

      toast({
        title: "Успешно",
        description: "Отчёт обновлён. Пользователь получит уведомление.",
      });

      setIsDialogOpen(false);
      setSelectedReport(null);
      setAdminResponse("");
      loadReports();
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить отчёт",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: ReportStatus): JSX.Element => {
    const statusInfo = statusLabels[status];
    const badgeClassName = statusInfo.color + " text-white";
    return (
      <Badge className={badgeClassName}>
        {statusInfo.ru}
      </Badge>
    );
  };

  const getTypeBadge = (type: ReportType): JSX.Element => {
    const typeInfo = reportTypeLabels[type];
    return (
      <Badge variant="outline">
        {typeInfo.ru}
      </Badge>
    );
  };

  const toggleReportExpansion = (reportId: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const getStatusLabel = (status: ReportStatus): string => {
    return statusLabels[status].ru;
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-600" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "dismissed":
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesStatus = filterStatus === "all" || report.status === filterStatus;
    const matchesSearch = searchQuery === "" || 
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.question?.question_ru?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.question?.question_es?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.user?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = reports.filter(r => r.status === "pending").length;
  const inProgressCount = reports.filter(r => r.status === "in_progress").length;
  const resolvedCount = reports.filter(r => r.status === "resolved").length;

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Управление отчётами</h1>
        <p className="text-muted-foreground">
          Отчёты пользователей и аналитика AI помощника
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full max-w-[500px] grid-cols-2">
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Отчёты о вопросах
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            ИИ отчёты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6 mt-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Всего отчётов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reports.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Всего в системе</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-yellow-200 dark:border-yellow-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Ожидают
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Требуют внимания</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-600" />
                В работе
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{inProgressCount}</div>
              <p className="text-xs text-muted-foreground mt-1">На рассмотрении</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Решено
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{resolvedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Завершено</p>
            </CardContent>
          </Card>
        </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder="Поиск по описанию, вопросу или пользователю..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

      {/* Filter Tabs */}
      <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as ReportStatus | "all")}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Все ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ожидают ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex items-center gap-2">
              <Loader2 className="h-4 w-4" />
              В работе ({inProgressCount})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Решено ({resolvedCount})
            </TabsTrigger>
          </TabsList>
      </Tabs>

      {/* Reports Table */}
      <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Отчёты</CardTitle>
                <CardDescription className="mt-1">
                  Нажмите на отчёт для просмотра деталей и ответа пользователю
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                Найдено: {filteredReports.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-lg font-medium">Отчёты не найдены</p>
                <p className="text-muted-foreground/70 text-sm mt-2">
                  {searchQuery ? "Попробуйте изменить параметры поиска" : "Нет отчётов с выбранным фильтром"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">ID</TableHead>
                      <TableHead className="font-semibold">Тип проблемы</TableHead>
                      <TableHead className="font-semibold">Вопрос</TableHead>
                      <TableHead className="font-semibold">Пользователь</TableHead>
                      <TableHead className="font-semibold">Статус</TableHead>
                      <TableHead className="font-semibold">Дата создания</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow 
                        key={report.id} 
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleViewReport(report)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {report.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>{getTypeBadge(report.report_type)}</TableCell>
                        <TableCell>
                          <div className="max-w-[300px] truncate font-medium">
                            {report.question?.question_ru || report.question?.question_es || "Вопрос не найден"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {report.user?.first_name || report.user?.username || "Неизвестно"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(report.created_at).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader className="border-b pb-4">
                  <DialogTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                      <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    Детали отчёта
                  </DialogTitle>
                  <DialogDescription className="text-base mt-2">
                    Просмотрите отчёт и ответьте пользователю
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                  {/* Report Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Тип проблемы
                      </Label>
                      <div className="mt-1">{getTypeBadge(selectedReport.report_type)}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Статус
                      </Label>
                      <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Пользователь
                      </Label>
                      <div className="mt-1 font-medium">
                        {selectedReport.user?.first_name} {selectedReport.user?.last_name || ""}
                        {selectedReport.user?.username && (
                          <span className="text-muted-foreground ml-2">(@{selectedReport.user.username})</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Дата создания
                      </Label>
                      <div className="mt-1">
                        {new Date(selectedReport.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Question Details */}
                  <div className="border-2 rounded-xl p-5 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10">
                    <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Вопрос
                    </Label>
                    <div className="space-y-3">
                      <div className="bg-background rounded-lg p-4 border">
                        <p className="text-base font-medium leading-relaxed">
                          {selectedReport.question?.question_ru || selectedReport.question?.question_es || "Вопрос не найден"}
                        </p>
                      </div>
                      {selectedReport.question?.image_url && (
                        <div className="mt-3">
                          <img
                            src={getImageUrl(selectedReport.question.image_url)}
                            alt="Изображение вопроса"
                            className="max-w-[300px] rounded-lg border-2 shadow-md"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      {selectedReport.question?.topics && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            Тема: {selectedReport.question.topics.title_ru || selectedReport.question.topics.title_es}
                          </Badge>
                        </div>
                      )}
                      {selectedReport.question?.answer_options && selectedReport.question.answer_options.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-semibold text-muted-foreground mb-2">Варианты ответов:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {selectedReport.question.answer_options
                              .sort((a, b) => a.position - b.position)
                              .map((option) => (
                                <div
                                  key={option.id}
                                  className={cn(
                                    "text-sm p-3 rounded-lg border-2 transition-all",
                                    option.is_correct
                                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 font-medium"
                                      : "bg-muted/50 border-border"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{option.text_ru || option.text_es}</span>
                                    {option.is_correct && (
                                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 ml-2" />
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Description */}
                  <div className="border-2 rounded-xl p-5 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10">
                    <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-orange-600" />
                      Описание проблемы от пользователя
                    </Label>
                    <div className="bg-background rounded-lg p-4 border min-h-[100px]">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedReport.description}</p>
                    </div>
                  </div>

                  {/* Admin Response */}
                  <div className="border-2 rounded-xl p-5 bg-gradient-to-br from-primary/5 to-primary/10">
                    <Label htmlFor="admin-response" className="text-base font-semibold mb-3 block flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Ответ администратора
                    </Label>
                    <Textarea
                      id="admin-response"
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Введите ваш ответ пользователю... (необязательно)"
                      rows={6}
                      className="min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Пользователь получит уведомление с вашим ответом
                    </p>
                  </div>

                  {/* Status Update */}
                  <div className="border-2 rounded-xl p-5 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10">
                    <Label htmlFor="status" className="text-base font-semibold mb-3 block flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Изменить статус
                    </Label>
                    <Select value={newStatus} onValueChange={(value) => setNewStatus(value as ReportStatus)}>
                      <SelectTrigger id="status" className="h-12 text-base font-medium pl-10">
                        <div className="absolute left-3">
                          {getStatusIcon(newStatus)}
                        </div>
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            Ожидает
                          </div>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 text-blue-600" />
                            В работе
                          </div>
                        </SelectItem>
                        <SelectItem value="resolved">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Решено
                          </div>
                        </SelectItem>
                        <SelectItem value="dismissed">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-gray-600" />
                            Отклонено
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Previous Admin Response */}
                  {selectedReport.admin_response && (
                    <div className="border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 bg-blue-50/50 dark:bg-blue-900/20">
                      <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        Предыдущий ответ
                      </Label>
                      <div className="bg-background/80 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedReport.admin_response}</p>
                      </div>
                      {selectedReport.admin && (
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                          <User className="h-3 w-3" />
                          Ответил: {selectedReport.admin.first_name} {selectedReport.admin.last_name || ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter className="border-t pt-4 mt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="min-w-[120px]">
                    Отмена
                  </Button>
                  <Button onClick={handleUpdateReport} disabled={isSubmitting} className="min-w-[160px]">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Обновить отчёт
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        
        </TabsContent>

        {/* AI Reports Tab */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          <AdminAIReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminQuestionReports;

