import { useState, useEffect } from "react";
import { 
  Database, RefreshCw, Trash2, AlertCircle, CheckCircle2, Clock, 
  Loader2, FileSpreadsheet, Upload, Download, Info, TrendingUp, 
  FileText, Settings, ExternalLink, Copy, Check, AlertTriangle, 
  XCircle, FileWarning, Languages
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
// ОПТИМИЗАЦИЯ: Импортируем только нужную функцию из date-fns
import { format } from "date-fns";
// ОПТИМИЗАЦИЯ: Импортируем только русскую локаль (tree-shaking работает)
import { ru } from "date-fns/locale/ru";

interface SyncStats {
  questions: number;
  topics: number;
  terms: number;
  signs: number;
  flashcards: number;
}

interface SyncResult {
  processed: number;
  skipped: number;
  errors: number;
  warnings: string[];
  details?: {
    created: number;
    updated: number;
    deleted: number;
  };
}

export function AdminSync() {
  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'all' | 'topics' | 'terms' | 'questions' | 'signs' | 'flashcards' | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats>({ questions: 0, topics: 0, terms: 0, signs: 0, flashcards: 0 });
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);
  const [syncWarnings, setSyncWarnings] = useState<string[]>([]);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>("");
  

  useEffect(() => {
    loadStats();
    fetchRecentQuestions();
    loadLastSyncTime();
    loadGoogleSheetsUrl();
  }, []);

  const loadStats = async () => {
    try {
      const [questionsRes, topicsRes, termsRes, signsRes, flashcardsRes] = await Promise.all([
        supabase.from("questions_new").select("id", { count: "exact", head: true }),
        supabase.from("topics").select("id", { count: "exact", head: true }),
        supabase.from("language_terms").select("id", { count: "exact", head: true }),
        supabase.from("road_signs").select("id", { count: "exact", head: true }),
        supabase.from("flashcards").select("id", { count: "exact", head: true }),
      ]);

      setSyncStats({
        questions: questionsRes.count || 0,
        topics: topicsRes.count || 0,
        terms: termsRes.count || 0,
        signs: signsRes.count || 0,
        flashcards: flashcardsRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const fetchRecentQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("questions_new")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentQuestions(data || []);
    } catch (error: any) {
      console.error("Error fetching recent questions:", error);
    }
  };

  const loadLastSyncTime = () => {
    const stored = localStorage.getItem("lastSyncTime");
    if (stored) {
      setLastSync(new Date(stored).toLocaleString('ru-RU'));
    }
  };

  const loadGoogleSheetsUrl = async () => {
    try {
      // Попробуем получить URL из секретов или настроек
      const sheetsId = import.meta.env.VITE_GOOGLE_SHEETS_ID;
      if (sheetsId) {
        setGoogleSheetsUrl(`https://docs.google.com/spreadsheets/d/${sheetsId}`);
      }
    } catch (error) {
      console.error("Error loading Google Sheets URL:", error);
    }
  };

  const addLog = (message: string) => {
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString('ru-RU')}] ${message}`]);
  };

  const handleSyncGoogleSheets = async (type: 'all' | 'topics' | 'terms' | 'questions' | 'signs' | 'flashcards') => {
    setSyncing(true);
    setSyncType(type);
    setSyncWarnings([]);
    setSyncResult(null);
    setSyncProgress(0);
    setSyncLogs([]);

    addLog(`Начало синхронизации: ${getTypeLabel(type)}`);

    try {
      addLog("Подключение к Google Sheets...");
      setSyncProgress(10);

      const { data, error } = await supabase.functions.invoke('sync-google-sheets', {
        body: { syncType: type }
      });

      if (error) {
        addLog(`❌ Ошибка: ${error.message}`);
        throw error;
      }

      setSyncProgress(50);
      addLog("Обработка данных...");

      // Парсим результат - функция возвращает разные поля в зависимости от типа
      console.log('Sync response data:', data);
      
      // Определяем обработанные данные в зависимости от типа синхронизации
      let processed = 0;
      let skipped = 0;
      let created = 0;
      let updated = 0;
      const deleted = 0;
      let allWarnings: string[] = [];

      if (type === 'all') {
        // Для "all" суммируем все типы
        processed = 
          (data?.topicsProcessed || 0) +
          (data?.questionsProcessed || 0) +
          (data?.termsProcessed || 0) +
          (data?.signsProcessed || 0) +
          (data?.flashcardsProcessed || 0);
        skipped = 
          (data?.questionsSkipped || 0) +
          (data?.termsSkipped || 0) +
          (data?.signsSkipped || 0) +
          (data?.flashcardsSkipped || 0);
        created = 
          (data?.questionsInserted || 0) +
          (data?.termsInserted || 0) +
          (data?.signsInserted || 0) +
          (data?.flashcardsInserted || 0);
        updated = 
          (data?.questionsUpdated || 0) +
          (data?.termsUpdated || 0) +
          (data?.signsUpdated || 0) +
          (data?.flashcardsUpdated || 0);
        allWarnings = [
          ...(data?.warnings || []),
          ...(data?.termsWarnings || []),
          ...(data?.signsWarnings || []),
          ...(data?.flashcardsWarnings || []),
        ];
      } else if (type === 'questions') {
        processed = data?.questionsProcessed || 0;
        skipped = data?.questionsSkipped || 0;
        created = data?.questionsInserted || 0;
        updated = data?.questionsUpdated || 0;
        allWarnings = data?.warnings || [];
      } else if (type === 'terms') {
        processed = data?.termsProcessed || 0;
        skipped = data?.termsSkipped || 0;
        created = data?.termsInserted || 0;
        updated = data?.termsUpdated || 0;
        allWarnings = data?.termsWarnings || [];
      } else if (type === 'signs') {
        processed = data?.signsProcessed || 0;
        skipped = data?.signsSkipped || 0;
        created = data?.signsInserted || 0;
        updated = data?.signsUpdated || 0;
        allWarnings = data?.signsWarnings || [];
      } else if (type === 'topics') {
        processed = data?.topicsProcessed || 0;
        skipped = 0; // Topics не имеют skipped
        created = data?.topicsProcessed || 0; // Topics всегда создаются/обновляются
        updated = 0;
        allWarnings = [];
      } else if (type === 'flashcards') {
        processed = data?.flashcardsProcessed || 0;
        skipped = data?.flashcardsSkipped || 0;
        created = data?.flashcardsInserted || 0;
        updated = data?.flashcardsUpdated || 0;
        allWarnings = data?.flashcardsWarnings || [];
      }

      // Собираем все причины пропуска
      const skipReasons = [
        ...(data?.skipReasons || []),
        ...(data?.termsSkipReasons || []),
        ...(data?.signsSkipReasons || []),
        ...(data?.flashcardsSkipReasons || []),
      ];

      const result: SyncResult = {
        processed,
        skipped,
        errors: skipReasons.length,
        warnings: allWarnings,
        details: {
          created,
          updated,
          deleted: 0, // Удаление не используется в синхронизации
        },
      };

      setSyncResult(result);
      setSyncWarnings(allWarnings);

      if (result.warnings && result.warnings.length > 0) {
        addLog(`⚠️ Синхронизация завершена с предупреждениями (${result.warnings.length})`);
      } else {
        addLog("✅ Синхронизация успешно завершена");
      }

      addLog(`Обработано: ${result.processed}, Пропущено: ${result.skipped}, Ошибок: ${result.errors}`);
      addLog(`Создано: ${result.details.created}, Обновлено: ${result.details.updated}`);

      setSyncProgress(100);

      toast({
        title: result.warnings && result.warnings.length > 0 
          ? "Синхронизация завершена с предупреждениями" 
          : "Синхронизация завершена",
        description: `Обработано: ${result.processed} записей${result.skipped > 0 ? `, пропущено: ${result.skipped}` : ''}`,
        variant: result.warnings && result.warnings.length > 0 ? "default" : "default",
      });

      const syncTime = new Date().toISOString();
      localStorage.setItem("lastSyncTime", syncTime);
      setLastSync(new Date(syncTime).toLocaleString('ru-RU'));

      await loadStats();
      await fetchRecentQuestions();

      setTimeout(() => {
        setSyncProgress(0);
      }, 2000);
    } catch (error: any) {
      console.error("Sync error:", error);
      addLog(`❌ Критическая ошибка: ${error.message || "Неизвестная ошибка"}`);
      setSyncProgress(0);
      toast({
        title: "Ошибка синхронизации",
        description: error.message || "Не удалось синхронизировать данные",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
      setSyncType(null);
    }
  };

  const handleClearAllQuestions = async () => {
    if (!confirm("⚠️ ВНИМАНИЕ! Вы уверены, что хотите удалить ВСЕ вопросы из таблицы questions_new?\n\nЭто действие НЕОБРАТИМО и удалит все данные!")) return;

    try {
      addLog("Начало очистки базы данных...");
      await supabase.from("question_tags").delete().neq("question_id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("questions_new").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      addLog("✅ База данных очищена");
      toast({
        title: "Успешно!",
        description: "Все вопросы удалены из базы данных",
      });

      await loadStats();
      await fetchRecentQuestions();
      setRecentQuestions([]);
    } catch (error: any) {
      addLog(`❌ Ошибка очистки: ${error.message}`);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось очистить базу данных",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      all: "Все данные",
      topics: "Темы",
      terms: "Термины",
      questions: "Вопросы",
      signs: "Дорожные знаки",
      flashcards: "Флеш-карточки",
    };
    return labels[type] || type;
  };

  // Парсинг и категоризация предупреждений
  interface ParsedWarning {
    type: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    details: {
      field?: string;
      row?: number;
      value?: string;
      issue?: string;
    };
    icon: any;
    color: string;
    bgColor: string;
    borderColor: string;
  }

  const parseWarning = (warning: string): ParsedWarning => {
    // Русские буквы в поле - улучшенный парсинг
    if (warning.includes('Русские буквы')) {
      // Пробуем разные варианты regex для извлечения данных
      let match = warning.match(/Русские буквы в (\w+).*?строка (\d+).*?:\s*"([^"]+)"/);
      if (!match) {
        // Альтернативный вариант без кавычек
        match = warning.match(/Русские буквы в (\w+).*?строка (\d+).*?:\s*(.+?)(?:\.\.\.|$)/);
      }
      if (!match) {
        // Еще один вариант
        match = warning.match(/Русские буквы в (\w+).*?\(строка (\d+)\).*?:\s*"?(.+?)"?/);
      }
      
      if (match) {
        const [, field, row, value] = match;
        const fullValue = value || '';
        // Находим русские буквы в тексте
        const cyrillicMatch = fullValue.match(/[а-яА-ЯЁё]+/g);
        const cyrillicText = cyrillicMatch ? cyrillicMatch.join('') : '';
        
        return {
          type: 'warning',
          category: 'Языковая ошибка',
          message: `В поле "${field}" обнаружены русские буквы (должен быть испанский текст)`,
          details: {
            field,
            row: parseInt(row),
            value: fullValue,
            issue: cyrillicText || 'Русские символы в испанском поле',
          },
          icon: Languages,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-300',
        };
      }
    }

    // Слишком длинный текст
    if (warning.includes('слишком длинный')) {
      const match = warning.match(/(\w+) (\d+) \(([A-Z]+)\).*?(\d+) символов.*?строка (\d+)/);
      if (match) {
        const [, field, num, lang, length, row] = match;
        return {
          type: 'warning',
          category: 'Превышение длины',
          message: `Поле "${field} ${num}" (${lang}) слишком длинное`,
          details: {
            field: `${field}_${num}`,
            row: parseInt(row),
            value: `${length} символов`,
            issue: `Максимум 200 символов, у вас ${length}`,
          },
          icon: FileWarning,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300',
        };
      }
    }

    // Вопрос пропущен
    if (warning.includes('пропущен') || warning.includes('отсутствует')) {
      const match = warning.match(/([^:]+):\s*(.+?)(?: \(строка (\d+)\))?/);
      if (match) {
        const [, reason, details, row] = match;
        return {
          type: 'error',
          category: 'Пропущенная запись',
          message: reason.trim(),
          details: {
            row: row ? parseInt(row) : undefined,
            value: details.trim(),
          },
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
        };
      }
    }

    // Общее предупреждение
    return {
      type: 'warning',
      category: 'Предупреждение',
      message: warning.replace(/⚠️\s*/, ''),
      details: {},
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
    };
  };

  const highlightCyrillic = (text: string): JSX.Element => {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    const regex = /[а-яА-ЯЁё]+/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Добавляем текст до совпадения
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Добавляем выделенный русский текст
      parts.push(
        <span key={match.index} className="bg-red-200 text-red-800 font-semibold px-1 rounded">
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
    // Добавляем оставшийся текст
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <>{parts.length > 0 ? parts : text}</>;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "Текст скопирован в буфер обмена",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="w-8 h-8" />
          Синхронизация базы данных
        </h1>
        <p className="text-muted-foreground">
          Синхронизация данных из Google Sheets и управление базой данных
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Вопросы</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.questions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">в базе данных</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Темы</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.topics.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">в базе данных</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Термины</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.terms.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">в базе данных</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Дорожные знаки</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.signs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">в базе данных</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Флеш-карточки</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.flashcards.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">в базе данных</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sync">Синхронизация</TabsTrigger>
          <TabsTrigger value="logs">Логи</TabsTrigger>
          <TabsTrigger value="recent">Последние вопросы</TabsTrigger>
          <TabsTrigger value="info">Информация</TabsTrigger>
        </TabsList>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-4">
          {/* Google Sheets Info */}
          {googleSheetsUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Google Sheets
                </CardTitle>
                <CardDescription>
                  Таблица для синхронизации данных
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <a
                    href={googleSheetsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Открыть таблицу
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(googleSheetsUrl)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sync Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className={cn("w-5 h-5", syncing && "animate-spin")} />
                Синхронизация с Google Sheets
              </CardTitle>
              <CardDescription>
                Загрузить данные из таблицы Google Sheets в базу данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Last Sync Info */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Последняя синхронизация:</span>
                    <span className="font-medium">{lastSync || "Никогда"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Автоматическая синхронизация: каждые 24 часа в 03:00 UTC
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {syncing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Синхронизация: {syncType ? getTypeLabel(syncType) : "..."}
                    </span>
                    <span className="font-medium">{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                </div>
              )}

              {/* Sync Result */}
              {syncResult && !syncing && (
                <Alert className={cn(
                  syncResult.errors > 0 ? "border-destructive" : 
                  syncResult.warnings.length > 0 ? "border-yellow-500 bg-yellow-50" : 
                  "border-green-500 bg-green-50"
                )}>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Результат синхронизации</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2 mt-2">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Обработано:</span>
                          <span className="font-semibold ml-2 text-green-600">{syncResult.processed}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Пропущено:</span>
                          <span className="font-semibold ml-2 text-yellow-600">{syncResult.skipped}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ошибок:</span>
                          <span className="font-semibold ml-2 text-red-600">{syncResult.errors}</span>
                        </div>
                      </div>
                      {syncResult.details && (
                        <div className="grid grid-cols-3 gap-4 text-xs pt-2 border-t">
                          <div>
                            <span className="text-muted-foreground">Создано:</span>
                            <span className="font-medium ml-2">{syncResult.details.created}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Обновлено:</span>
                            <span className="font-medium ml-2">{syncResult.details.updated}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Удалено:</span>
                            <span className="font-medium ml-2">{syncResult.details.deleted}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Sync Warnings - Improved Display */}
              {syncWarnings.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-lg">Предупреждения и ошибки</h3>
                    <Badge variant="outline" className="ml-auto">
                      {syncWarnings.length} {syncWarnings.length === 1 ? 'предупреждение' : 'предупреждений'}
                    </Badge>
                  </div>
                  <ScrollArea className="max-h-[400px] w-full rounded-md border p-4">
                    <div className="space-y-3">
                      {syncWarnings.map((warning, index) => {
                        const parsed = parseWarning(warning);
                        const Icon = parsed.icon;
                        
                        return (
                          <div
                            key={index}
                            className={cn(
                              "p-4 rounded-lg border-2 transition-all",
                              parsed.bgColor,
                              parsed.borderColor,
                              "hover:shadow-md"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("flex-shrink-0 mt-0.5", parsed.color)}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs font-semibold",
                                      parsed.type === 'error' && "border-red-300 text-red-700 bg-red-100",
                                      parsed.type === 'warning' && "border-yellow-300 text-yellow-700 bg-yellow-100",
                                      parsed.type === 'info' && "border-blue-300 text-blue-700 bg-blue-100"
                                    )}
                                  >
                                    {parsed.category}
                                  </Badge>
                                  {parsed.details.row && (
                                    <Badge variant="outline" className="text-xs">
                                      Строка {parsed.details.row}
                                    </Badge>
                                  )}
                                  {parsed.details.field && (
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {parsed.details.field}
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className={cn("font-medium", parsed.color)}>
                                  {parsed.message}
                                </p>
                                
                                {parsed.details.value && (
                                  <div className="mt-2 p-3 bg-background/50 rounded-md border border-border/50">
                                    <p className="text-xs text-muted-foreground mb-1">Проблемный текст:</p>
                                    <div className="text-sm font-mono break-words">
                                      {parsed.details.field?.includes('es') && parsed.details.value ? (
                                        highlightCyrillic(parsed.details.value)
                                      ) : (
                                        <span className="text-foreground">{parsed.details.value}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {parsed.details.issue && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground">
                                      <span className="font-semibold">Проблема:</span>{" "}
                                      <span className={cn("font-medium", parsed.color)}>
                                        {parsed.details.issue}
                                      </span>
                                    </p>
                                  </div>
                                )}
                                
                                {parsed.details.row && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        const url = googleSheetsUrl || '';
                                        if (url) {
                                          window.open(`${url}#gid=0&range=${parsed.details.row}:${parsed.details.row}`, '_blank');
                                        } else {
                                          toast({
                                            title: "Ошибка",
                                            description: "URL Google Sheets не настроен",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Открыть строку {parsed.details.row} в Google Sheets
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Separator />

              {/* Sync Buttons */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Синхронизация всех данных</h3>
                    <p className="text-sm text-muted-foreground">
                      Загрузить все данные: темы, вопросы, термины, знаки
                    </p>
                  </div>
                  <Button
                    onClick={() => handleSyncGoogleSheets('all')}
                    disabled={syncing}
                    size="lg"
                    className="gap-2"
                  >
                    <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                    {syncing && syncType === 'all' ? "Синхронизация..." : "Синхронизировать все"}
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Выборочная синхронизация</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleSyncGoogleSheets('topics')}
                      disabled={syncing}
                      className="gap-2 h-auto py-4 flex-col"
                    >
                      <Database className={cn("w-5 h-5", syncing && syncType === 'topics' && "animate-spin")} />
                      <span>Темы</span>
                      <span className="text-xs text-muted-foreground">{syncStats.topics} в БД</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSyncGoogleSheets('questions')}
                      disabled={syncing}
                      className="gap-2 h-auto py-4 flex-col"
                    >
                      <FileText className={cn("w-5 h-5", syncing && syncType === 'questions' && "animate-spin")} />
                      <span>Вопросы</span>
                      <span className="text-xs text-muted-foreground">{syncStats.questions} в БД</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSyncGoogleSheets('terms')}
                      disabled={syncing}
                      className="gap-2 h-auto py-4 flex-col"
                    >
                      <FileText className={cn("w-5 h-5", syncing && syncType === 'terms' && "animate-spin")} />
                      <span>Термины</span>
                      <span className="text-xs text-muted-foreground">{syncStats.terms} в БД</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSyncGoogleSheets('signs')}
                      disabled={syncing}
                      className="gap-2 h-auto py-4 flex-col"
                    >
                      <FileText className={cn("w-5 h-5", syncing && syncType === 'signs' && "animate-spin")} />
                      <span>Знаки</span>
                      <span className="text-xs text-muted-foreground">{syncStats.signs} в БД</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSyncGoogleSheets('flashcards')}
                      disabled={syncing}
                      className="gap-2 h-auto py-4 flex-col"
                    >
                      <FileText className={cn("w-5 h-5", syncing && syncType === 'flashcards' && "animate-spin")} />
                      <span>Карточки</span>
                      <span className="text-xs text-muted-foreground">{syncStats.flashcards} в БД</span>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Danger Zone */}
                <div className="p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-destructive mb-1">Опасная зона</h3>
                      <p className="text-sm text-muted-foreground">
                        Удалить все вопросы из базы данных. Это действие необратимо!
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleClearAllQuestions}
                      disabled={syncing}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Очистить все вопросы
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Логи синхронизации
              </CardTitle>
              <CardDescription>
                Детальная информация о процессе синхронизации
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {syncLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Логи будут отображаться здесь во время синхронизации
                  </p>
                ) : (
                  <div className="space-y-1 font-mono text-sm">
                    {syncLogs.map((log, index) => (
                      <div key={index} className={cn(
                        "py-1",
                        log.includes("❌") && "text-destructive",
                        log.includes("✅") && "text-green-600",
                        log.includes("⚠️") && "text-yellow-600"
                      )}>
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Questions Tab */}
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Последние вопросы</CardTitle>
              <CardDescription>
                Последние 10 вопросов, добавленных в систему
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentQuestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Нет вопросов в базе данных
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Вопрос (RU)</TableHead>
                      <TableHead>Вопрос (ES)</TableHead>
                      <TableHead>Тема</TableHead>
                      <TableHead>Дата создания</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-mono text-xs">
                          {question.source_id || question.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {question.question_ru || "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {question.question_es || "-"}
                        </TableCell>
                        <TableCell>
                          {question.topic_id ? (
                            <Badge variant="outline">Тема {question.topic_id}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(question.created_at), "dd.MM.yyyy HH:mm", { locale: ru })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Информация о синхронизации
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Как работает синхронизация</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Система читает данные из Google Sheets</li>
                  <li>Проверяет наличие записей по <code className="bg-muted px-1 rounded">source_id</code></li>
                  <li>Создает новые записи или обновляет существующие</li>
                  <li>Прогресс пользователей сохраняется при обновлении</li>
                </ul>
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Требования к Google Sheets</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Таблица должна быть публичной (Share → Anyone with the link → Viewer)</li>
                  <li>Обязательное поле: <code className="bg-muted px-1 rounded">source_id</code> (уникальный идентификатор)</li>
                  <li>Для вопросов: минимум 2 варианта ответа</li>
                  <li>Используйте формулу <code className="bg-muted px-1 rounded">="GS-" & ROW()-1</code> для source_id</li>
                </ul>
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Структура данных</h3>
                <p className="text-sm text-muted-foreground">
                  Подробная информация о структуре данных находится в документации:
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/GOOGLE_SHEETS_SYNC.md" target="_blank" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Открыть документацию
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
