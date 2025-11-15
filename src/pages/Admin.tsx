import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Trash2,
  AlertCircle,
  RefreshCw,
  Database,
  Users,
  FileQuestion,
  Target,
  Activity,
  Loader2,
  Gauge,
  Gamepad2,
  Coins,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

type DashboardMetrics = {
  topics: number;
  questions: number;
  users: number;
  tags: number;
  materials: number;
  materialsDrafts: number;
  activeDuels: number;
  duelsToday: number;
  gameSessionsToday: number;
  dailyBonusClaimsToday: number;
  telegramUsers: number;
  boostsInInventory: number;
  avgQuestionsPerTopic: number;
  dbSizeMb: number;
};

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [terms, setTerms] = useState<any[]>([]);
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);
  const [syncWarnings, setSyncWarnings] = useState<string[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Access denied",
        description: "Please log in.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    const { data, error } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (error || !data) {
      toast({
        title: "Access denied",
        description: "Admin privileges required.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setAuthLoading(false);
    await fetchDashboardMetrics();
    fetchRecentQuestions();
  };

  const fetchDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      const { data, error } = await supabase.rpc("get_admin_dashboard_metrics");
      if (error) throw error;
      setMetrics(data as DashboardMetrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
    }
    setMetricsLoading(false);
  };

  const fetchRecentQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("questions_new")
        .select("id, question_ru, question_es, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setRecentQuestions(data);
      }
    } catch (error) {
      console.error("Error fetching recent questions:", error);
    }
  };

  const handleSyncGoogleSheets = async (syncType: 'all' | 'questions' | 'terms' | 'signs' = 'all') => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: { syncType }
      });
      
      if (error) throw error;

      let message = '';
      if (syncType === 'all' || syncType === 'questions') {
        message += `
Синхронизация вопросов:
✅ Темы обработано: ${data.topicsProcessed || 0}
📥 Вопросов добавлено: ${data.questionsInserted || 0}
🔄 Вопросов обновлено: ${data.questionsUpdated || 0}
📊 Всего обработано: ${data.questionsProcessed || 0}
⚠️ Вопросов пропущено: ${data.questionsSkipped || 0}
        `.trim();
      }
      
      if (syncType === 'all' || syncType === 'terms') {
        if (message) message += '\n\n';
        message += `
Синхронизация терминов:
📥 Терминов добавлено: ${data.termsInserted || 0}
🔄 Терминов обновлено: ${data.termsUpdated || 0}
📊 Всего обработано: ${data.termsProcessed || 0}
⚠️ Терминов пропущено: ${data.termsSkipped || 0}
        `.trim();
      }
      
      if (syncType === 'all' || syncType === 'signs') {
        if (message) message += '\n\n';
        message += `
Синхронизация дорожных знаков:
📥 Знаков добавлено: ${data.signsInserted || 0}
🔄 Знаков обновлено: ${data.signsUpdated || 0}
📊 Всего обработано: ${data.signsProcessed || 0}
⚠️ Знаков пропущено: ${data.signsSkipped || 0}
        `.trim();
      }

      const hasErrors = (syncType === 'all' || syncType === 'questions' ? (data.questionsSkipped || 0) > 0 : false) ||
                        (syncType === 'all' || syncType === 'terms' ? (data.termsSkipped || 0) > 0 : false) ||
                        (syncType === 'all' || syncType === 'signs' ? (data.signsSkipped || 0) > 0 : false);

      toast({
        title: !hasErrors ? "Синхронизация успешна!" : "Синхронизация завершена с предупреждениями",
        description: message,
        variant: !hasErrors ? "default" : "destructive",
      });
      
      setSyncWarnings([...(data.warnings || []), ...(data.termsWarnings || []), ...(data.signsWarnings || [])]);
      setLastSync(new Date().toLocaleString("ru-RU"));
      await fetchDashboardMetrics();
      await fetchRecentQuestions();
    } catch (error: any) {
      toast({
        title: "Ошибка синхронизации",
        description: `Не удалось синхронизировать данные: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, загрузите файл Excel (.xlsx или .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Preview the data
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        setTerms(jsonData);
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось прочитать файл Excel",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleUpload = async () => {
    // Legacy "questions" table removed for security
    // This functionality is disabled - use questions_new table instead
    toast({
      title: "Функция недоступна",
      description: "Legacy таблица 'questions' была удалена из соображений безопасности. Используйте импорт данных для questions_new.",
      variant: "destructive",
    });
    
    /* DISABLED - Legacy questions table removed
    if (!file || terms.length === 0) return;

    setIsUploading(true);

    try {
      // Clear existing questions
      const { error: deleteError } = await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) throw deleteError;

      // Insert new questions
      const formattedQuestions = terms.map((term: any) => {
        const optionsEs = term["Opciones (ES)"] || term["opciones_es"] || "";
        const optionsRu = term["Варианты (RU)"] || term["opciones_ru"] || "";
        
        return {
          topic_es: term["Tema (ES)"] || term["tema_es"] || "",
          topic_ru: term["Тема (RU)"] || term["tema_ru"] || "",
          question_es: term["Pregunta (ES)"] || term["pregunta_es"] || "",
          question_ru: term["Вопрос (RU)"] || term["pregunta_ru"] || "",
          options_es: typeof optionsEs === 'string' ? optionsEs.split(',').map((s: string) => s.trim()) : [],
          options_ru: typeof optionsRu === 'string' ? optionsRu.split(',').map((s: string) => s.trim()) : [],
          correct_answer_es: term["Respuesta Correcta (ES)"] || term["respuesta_es"] || "",
          correct_answer_ru: term["Правильный Ответ (RU)"] || term["respuesta_ru"] || "",
          explanation_es: term["Explicación (ES)"] || term["explicacion_es"] || null,
          explanation_ru: term["Пояснение (RU)"] || term["explicacion_ru"] || null,
        };
      });

      const { error: insertError } = await supabase.from("questions").insert(formattedQuestions);

      if (insertError) throw insertError;

      toast({
        title: "Успешно!",
        description: `Загружено ${terms.length} вопросов`,
      });

      setFile(null);
      setTerms([]);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
    */
  };

  const handleClearDatabase = async () => {
    // Legacy "questions" table removed for security
    toast({
      title: "Функция недоступна",
      description: "Legacy таблица 'questions' была удалена.",
      variant: "destructive",
    });
    /* DISABLED
    if (!confirm("Вы уверены, что хотите удалить все вопросы из базы данных?")) return;

    try {
      const { error } = await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "База данных очищена",
      });

      setTerms([]);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось очистить базу данных",
        variant: "destructive",
      });
    }
    */
  };

  const handleClearAllQuestions = async () => {
    if (!confirm("Вы уверены, что хотите удалить ВСЕ вопросы из таблицы questions_new? Это действие необратимо!")) return;

    try {
      // Note: answer_options table was removed. Question deletion now works directly.
      // Delete all answer options first (foreign key constraint) - REMOVED
      
      // Delete all question tags
      await supabase.from("question_tags").delete().neq("question_id", "00000000-0000-0000-0000-000000000000");
      
      // Delete all questions
      const { error } = await supabase.from("questions_new").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Все вопросы удалены из базы данных",
      });

      await fetchStats();
      await fetchRecentQuestions();
      setRecentQuestions([]);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось очистить базу данных",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Админ-панель</h1>
          <p className="text-muted-foreground text-lg">
            Управление системой и данными
          </p>
        </div>

        {/* Monitoring Panel */}
        <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">Системное состояние</p>
                <div className="text-3xl font-bold mt-1">
                  {metricsLoading ? "—" : `${metrics?.dbSizeMb?.toLocaleString("ru-RU") ?? 0} МБ`}
                </div>
                <p className="text-sm text-muted-foreground">Оценка размера базы данных Supabase</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={fetchDashboardMetrics} disabled={metricsLoading} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${metricsLoading ? "animate-spin" : ""}`} />
                  Обновить метрики
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Активные дуэли",
                  value: metrics?.activeDuels,
                  icon: <Swords className="w-4 h-4 text-primary" />,
                  note: "Waiting + active",
                },
                {
                  label: "Дуэлей сегодня",
                  value: metrics?.duelsToday,
                  icon: <Activity className="w-4 h-4 text-primary" />,
                  note: "Создано за сутки",
                },
                {
                  label: "Игровых сессий сегодня",
                  value: metrics?.gameSessionsToday,
                  icon: <Gamepad2 className="w-4 h-4 text-primary" />,
                  note: "Все режимы",
                },
                {
                  label: "Бонусов за день",
                  value: metrics?.dailyBonusClaimsToday,
                  icon: <Coins className="w-4 h-4 text-primary" />,
                  note: "User Daily Bonus",
                },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/60 bg-background/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    {metric.label}
                    {metric.icon}
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {metricsLoading ? "—" : (metric.value ?? 0).toLocaleString("ru-RU")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{metric.note}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Материалы",
                  value: metrics?.materials,
                  sub: `Черновиков: ${metrics?.materialsDrafts ?? 0}`,
                  icon: <FileQuestion className="w-4 h-4 text-primary" />,
                },
                {
                  label: "Пользователи",
                  value: metrics?.users,
                  sub: `Telegram: ${metrics?.telegramUsers ?? 0}`,
                  icon: <Users className="w-4 h-4 text-primary" />,
                },
                {
                  label: "Вопросов на тему",
                  value: metrics?.avgQuestionsPerTopic,
                  sub: "Среднее значение",
                  icon: <Gauge className="w-4 h-4 text-primary" />,
                  formatter: (val?: number | null) =>
                    metricsLoading ? "—" : (val ?? 0).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                },
                {
                  label: "Всего бустов",
                  value: metrics?.boostsInInventory,
                  sub: "Инвентарь игроков",
                  icon: <Database className="w-4 h-4 text-primary" />,
                },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/60 bg-background/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    {metric.label}
                    {metric.icon}
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {metric.formatter
                      ? metric.formatter(metric.value)
                      : metricsLoading
                        ? "—"
                        : (metric.value ?? 0).toLocaleString("ru-RU")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{metric.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Темы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? "—" : (metrics?.topics ?? 0).toLocaleString("ru-RU")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileQuestion className="w-4 h-4" />
                Вопросы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? "—" : (metrics?.questions ?? 0).toLocaleString("ru-RU")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Пользователи
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? "—" : (metrics?.users ?? 0).toLocaleString("ru-RU")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Теги
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricsLoading ? "—" : (metrics?.tags ?? 0).toLocaleString("ru-RU")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Google Sheets Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Синхронизация с Google Sheets
            </CardTitle>
            <CardDescription>
              Загрузить данные из таблицы Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Последняя синхронизация: {lastSync || "Никогда"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Автоматическая синхронизация: каждые 24 часа в 03:00 UTC
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  onClick={handleClearAllQuestions}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Очистить все вопросы
                </Button>
                <Button
                  onClick={() => handleSyncGoogleSheets('all')}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Синхронизация..." : "Синхронизировать все"}
                </Button>
                <Button
                  onClick={() => handleSyncGoogleSheets('questions')}
                  disabled={syncing}
                  variant="outline"
                  className="gap-2"
                >
                  <FileQuestion className="w-4 h-4" />
                  Синхронизировать вопросы
                </Button>
                <Button
                  onClick={() => handleSyncGoogleSheets('terms')}
                  disabled={syncing}
                  variant="outline"
                  className="gap-2"
                >
                  <Target className="w-4 h-4" />
                  Синхронизировать термины
                </Button>
                <Button
                  onClick={() => handleSyncGoogleSheets('signs')}
                  disabled={syncing}
                  variant="outline"
                  className="gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Синхронизировать знаки
                </Button>
              </div>
            </div>

            {syncWarnings.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Найдены проблемы при импорте:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {syncWarnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {recentQuestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Последние импортированные вопросы:</h4>
                <div className="space-y-2">
                  {recentQuestions.map((q) => (
                    <div key={q.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                      <p className="text-sm font-medium">🇷🇺 {q.question_ru?.substring(0, 80)}...</p>
                      <p className="text-sm text-muted-foreground">🇪🇸 {q.question_es?.substring(0, 80)}...</p>
                      <p className="text-xs text-muted-foreground">
                        Импортировано: {new Date(q.created_at).toLocaleString("ru-RU")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Формат Excel файла: столбцы "Tema (ES)", "Тема (RU)", "Pregunta (ES)", "Вопрос (RU)", 
            "Opciones (ES)" (через запятую), "Варианты (RU)" (через запятую), "Respuesta Correcta (ES)", 
            "Правильный Ответ (RU)", "Explicación (ES)", "Пояснение (RU)"
          </AlertDescription>
        </Alert>

        <Card className="p-6 gradient-card">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="excel-file">Загрузить Excel файл</Label>
              <div className="flex gap-4">
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading || terms.length === 0}
                  className="min-w-[120px]"
                >
                  {isUploading ? (
                    "Загрузка..."
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Загрузить
                    </>
                  )}
                </Button>
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  Выбран файл: {file.name} ({terms.length} терминов)
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={handleClearDatabase}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Очистить базу данных
              </Button>
            </div>
          </div>
        </Card>

        {terms.length > 0 && (
          <Card className="p-6 gradient-card">
            <h3 className="text-xl font-bold mb-4">Предпросмотр данных</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тема</TableHead>
                    <TableHead>Вопрос</TableHead>
                    <TableHead>Варианты ответа</TableHead>
                    <TableHead>Правильный ответ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.slice(0, 10).map((term, index) => (
                    <TableRow key={index}>
                      <TableCell className="max-w-[150px] truncate">
                        {term["Тема (RU)"] || term["tema_ru"] || "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {term["Вопрос (RU)"] || term["pregunta_ru"] || "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {term["Варианты (RU)"] || term["opciones_ru"] || "-"}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {term["Правильный Ответ (RU)"] || term["respuesta_ru"] || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {terms.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Показано 10 из {terms.length} вопросов
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Admin;