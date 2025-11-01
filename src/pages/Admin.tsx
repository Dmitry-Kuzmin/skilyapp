import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Trash2, AlertCircle, RefreshCw, Database, Users, FileQuestion, Target, Activity, Loader2 } from "lucide-react";
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

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [terms, setTerms] = useState<any[]>([]);
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    topics: 0,
    questions: 0,
    users: 0,
    tags: 0,
  });
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
    fetchStats();
    fetchRecentQuestions();
  };

  const fetchStats = async () => {
    try {
      const [topicsRes, questionsRes, usersRes, tagsRes] = await Promise.all([
        supabase.from("topics").select("*", { count: "exact", head: true }),
        supabase.from("questions_new").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tags").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        topics: topicsRes.count || 0,
        questions: questionsRes.count || 0,
        users: usersRes.count || 0,
        tags: tagsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
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

  const handleSyncGoogleSheets = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets");
      
      if (error) throw error;

      const message = `
Синхронизация завершена:
✅ Темы обработано: ${data.topicsProcessed || 0}
✅ Вопросы загружено: ${data.questionsProcessed || 0}
⚠️ Вопросы пропущено: ${data.questionsSkipped || 0}

${data.questionsSkipped > 0 ? 'Причины пропуска вопросов:\n• Темы не найдены в базе\n• Неправильный формат данных\n• Отсутствуют обязательные поля' : ''}
      `.trim();

      toast({
        title: data.questionsProcessed > 0 ? "Синхронизация успешна!" : "Синхронизация завершена с предупреждениями",
        description: message,
        variant: data.questionsProcessed > 0 ? "default" : "destructive",
      });
      
      setSyncWarnings(data.warnings || []);
      setLastSync(new Date().toLocaleString("ru-RU"));
      await fetchStats();
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
  };

  const handleClearDatabase = async () => {
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
  };

  const handleClearAllQuestions = async () => {
    if (!confirm("Вы уверены, что хотите удалить ВСЕ вопросы из таблицы questions_new? Это действие необратимо!")) return;

    try {
      // Delete all answer options first (foreign key constraint)
      await supabase.from("answer_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
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
              <div className="text-2xl font-bold">{stats.topics}</div>
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
              <div className="text-2xl font-bold">{stats.questions}</div>
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
              <div className="text-2xl font-bold">{stats.users}</div>
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
              <div className="text-2xl font-bold">{stats.tags}</div>
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
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleClearAllQuestions}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Очистить все вопросы
                </Button>
                <Button
                  onClick={handleSyncGoogleSheets}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Синхронизация..." : "Синхронизировать сейчас"}
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