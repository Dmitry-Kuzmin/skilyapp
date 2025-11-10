import { useState, useEffect } from "react";
import { 
  Database, RefreshCw, Download, AlertCircle, CheckCircle2, 
  Loader2, FileSpreadsheet, Upload, Info, TrendingUp, 
  FileText, Settings, ExternalLink, Copy, Check, AlertTriangle,
  Globe, Lock, Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface ScrapeResult {
  success: boolean;
  topicsProcessed: number;
  testsProcessed: number;
  questionsProcessed: number;
  questionsByTopic: Record<number, number>;
  saved: number;
  errors: number;
  errorMessages: string[];
  excelFile?: string; // Base64 encoded Excel file
  timestamp: string;
}

interface Topic {
  number: number;
  title: string;
  testCount: number;
}

export function AdminScraper() {
  const [scraping, setScraping] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cookies, setCookies] = useState("");
  const [useCookies, setUseCookies] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapeLogs, setScrapeLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTopicsFromDatabase();
  }, []);

  const loadTopicsFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("number, title_es, title_ru")
        .order("number");

      if (error) throw error;

      const topics: Topic[] = (data || []).map((t) => ({
        number: t.number,
        title: t.title_ru || t.title_es || `Тема ${t.number}`,
        testCount: 0, // Will be updated after scraping starts
      }));

      setAvailableTopics(topics);
      // Select all topics by default
      setSelectedTopics(topics.map((t) => t.number));
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  };

  const addLog = (message: string) => {
    setScrapeLogs((prev) => [...prev, `[${new Date().toLocaleTimeString("ru-RU")}] ${message}`]);
  };

  const parseCookiesFromTable = (text: string): string => {
    // Парсинг табличного формата из DevTools
    const lines = text.split('\n').filter(line => line.trim());
    const cookiePairs: string[] = [];
    
    for (const line of lines) {
      // Разделяем по табуляции или множественным пробелам
      const parts = line.split(/\t+/).filter(p => p.trim());
      
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts[1].trim();
        
        // Проверяем домен (может быть в разных колонках)
        const domain = parts.find(p => p.includes('practicavial.com') || p.includes('google.com')) || '';
        
        // Включаем cookies для practicavial.com и app.practicavial.com
        // Google cookies не критичны, но могут быть полезны
        if (name && value && (
          domain.includes('practicavial.com') || 
          domain.includes('google.com') ||
          // Если домен не указан, но имя cookie похоже на нужное
          (name.includes('practica') || name.includes('session') || name.includes('XSRF') || name.includes('wfwaf'))
        )) {
          cookiePairs.push(`${name}=${value}`);
        }
      }
    }
    
    return cookiePairs.join('; ');
  };

  const handleScrape = async () => {
    if (!useCookies && (!username || !password)) {
      toast({
        title: "Ошибка",
        description: useCookies ? "Введите cookies из браузера" : "Введите логин и пароль PracticaVial или используйте cookies",
        variant: "destructive",
      });
      return;
    }

    if (useCookies && !cookies) {
      toast({
        title: "Ошибка",
        description: "Введите cookies из браузера",
        variant: "destructive",
      });
      return;
    }

    if (selectedTopics.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы одну тему для выгрузки",
        variant: "destructive",
      });
      return;
    }

    setScraping(true);
    setScrapeResult(null);
    setError(null);
    setScrapeProgress(0);
    setScrapeLogs([]);

    addLog("Начало выгрузки тестов из PracticaVial...");
    addLog(`Выбрано тем: ${selectedTopics.length}`);

    try {
      setScrapeProgress(10);
      addLog("Подключение к PracticaVial...");

      const { data, error: invokeError } = await supabase.functions.invoke("scrape-practicavial", {
        body: {
          ...(useCookies ? { cookies } : { username, password }),
          topics: selectedTopics,
        },
      });

      if (invokeError) {
        console.error("Invoke error:", invokeError);
        addLog(`❌ Ошибка вызова функции: ${invokeError.message}`);
        throw invokeError;
      }

      setScrapeProgress(50);
      addLog("Обработка данных...");

      console.log("Function response:", data);

      if (data?.error) {
        const errorDetails = data.details ? `\nДетали: ${data.details}` : '';
        addLog(`❌ Ошибка: ${data.error}${errorDetails}`);
        throw new Error(`${data.error}${errorDetails}`);
      }

      if (!data) {
        throw new Error("Пустой ответ от функции");
      }

      setScrapeProgress(90);
      addLog("Сохранение результатов...");

      const result: ScrapeResult = data;
      setScrapeResult(result);

      if (result.success) {
        addLog("✅ Выгрузка успешно завершена");
        addLog(`Обработано тем: ${result.topicsProcessed}`);
        addLog(`Обработано тестов: ${result.testsProcessed}`);
        addLog(`Обработано вопросов: ${result.questionsProcessed}`);
        addLog(`Сохранено в БД: ${result.saved}`);
        if (result.errors > 0) {
          addLog(`⚠️ Ошибок: ${result.errors}`);
        }

        toast({
          title: "Успешно!",
          description: `Выгружено ${result.questionsProcessed} вопросов из ${result.testsProcessed} тестов`,
        });
      } else {
        throw new Error("Выгрузка завершилась с ошибками");
      }

      setScrapeProgress(100);
    } catch (error: any) {
      console.error("Scrape error:", error);
      const errorMessage = error.message || "Не удалось выгрузить данные";
      addLog(`❌ Критическая ошибка: ${errorMessage}`);
      setError(errorMessage);
      setScrapeProgress(0);

      toast({
        title: "Ошибка выгрузки",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!scrapeResult?.excelFile) {
      toast({
        title: "Ошибка",
        description: "Excel файл не доступен",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert base64 to blob
      const binaryString = atob(scrapeResult.excelFile);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `practicavial-scrape-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Успешно!",
        description: "Excel файл загружен",
      });
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить Excel файл",
        variant: "destructive",
      });
    }
  };

  const toggleTopic = (topicNumber: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicNumber)
        ? prev.filter((t) => t !== topicNumber)
        : [...prev, topicNumber]
    );
  };

  const selectAllTopics = () => {
    setSelectedTopics(availableTopics.map((t) => t.number));
  };

  const deselectAllTopics = () => {
    setSelectedTopics([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Globe className="w-8 h-8" />
          Скрапер PracticaVial
        </h1>
        <p className="text-muted-foreground">
          Выгрузка тестов по ПДД с сайта PracticaVial с сохранением в базу данных и экспортом в Excel
        </p>
      </div>

      {/* Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Авторизация PracticaVial
          </CardTitle>
          <CardDescription>
            Авторизуйтесь на сайте PracticaVial и скопируйте cookies из браузера
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useCookies"
              checked={useCookies}
              onCheckedChange={(checked) => setUseCookies(checked as boolean)}
              disabled={scraping}
            />
            <Label htmlFor="useCookies" className="cursor-pointer">
              Использовать cookies из браузера (рекомендуется)
            </Label>
          </div>

          {useCookies ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cookies">Cookies из браузера</Label>
                <textarea
                  id="cookies"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs"
                  placeholder="Вставьте cookies здесь в формате: name=value; name2=value2; ..."
                  value={cookies}
                  onChange={(e) => {
                    const value = e.target.value;
                    
                    // Автоматическое преобразование табличного формата из DevTools
                    if (value.includes('\t') || (value.includes('practicavial.com') && value.includes('\n'))) {
                      const parsed = parseCookiesFromTable(value);
                      if (parsed && parsed.length > 0) {
                        setCookies(parsed);
                        toast({
                          title: "Автоматическое преобразование",
                          description: `Найдено ${parsed.split(';').length} cookies. Формат преобразован автоматически.`,
                        });
                        return;
                      }
                    }
                    
                    setCookies(value);
                  }}
                  disabled={scraping}
                />
                <p className="text-xs text-muted-foreground">
                  Поддерживается автоматическое преобразование из табличного формата DevTools
                </p>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Способ 1: Через консоль браузера (рекомендуется)</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p className="text-sm font-semibold">На странице <a href="https://teorica.practicavial.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">teorica.practicavial.com</a> после авторизации:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                    <li>Откройте консоль браузера (F12 или Cmd+Option+I)</li>
                    <li>Выполните одну из команд ниже (скопируйте и вставьте в консоль)</li>
                    <li>Cookies будут скопированы или выведены в консоль</li>
                    <li>Вставьте значение в поле выше</li>
                  </ol>
                  <div className="space-y-2 mt-3">
                    <div>
                      <p className="text-xs font-semibold mb-1">Вариант А: Автоматическое копирование (работает не всегда):</p>
                      <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                        navigator.clipboard.writeText(document.cookie).then(() =&gt; console.log('✅ Cookies скопированы!'))
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">Вариант Б: Вывод в консоль (всегда работает):</p>
                      <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                        console.log(document.cookie)
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Затем выделите текст из консоли и скопируйте (Ctrl+C / Cmd+C)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">Вариант В: Копирование через prompt (универсальный):</p>
                      <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                        prompt('Cookies (Ctrl+A, Ctrl+C):', document.cookie)
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Появится окно с cookies - выделите всё (Ctrl+A) и скопируйте (Ctrl+C)
                      </p>
                    </div>
                  </div>
                  <Alert variant="destructive" className="mt-3">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-xs space-y-1">
                      <p><strong>⚠️ КРИТИЧЕСКИ ВАЖНО:</strong></p>
                      <p>Вы должны получить cookies именно с домена <strong>teorica.practicavial.com</strong>, а НЕ с practicavial.com!</p>
                      <p>После авторизации откройте именно эту страницу: <a href="https://teorica.practicavial.com/permiso/b/tests/tema/all" target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono">teorica.practicavial.com/permiso/b/tests/tema/all</a></p>
                      <p>Затем откройте консоль (F12) на этой странице и выполните команду для копирования cookies.</p>
                      <p className="font-semibold mt-2">Нужные cookies: practica_session, PHPSESSID, XSRF-TOKEN (аналитические cookies Google не нужны и будут автоматически отфильтрованы)</p>
                    </AlertDescription>
                  </Alert>
                </AlertDescription>
              </Alert>
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>Способ 2: Из DevTools Application (если способ 1 не работает)</AlertTitle>
                <AlertDescription className="space-y-2">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Откройте DevTools (F12) на странице <a href="https://teorica.practicavial.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">PracticaVial</a></li>
                    <li>Перейдите на вкладку "Application" (Chrome) или "Storage" (Firefox)</li>
                    <li>В левом меню выберите "Cookies" → "https://teorica.practicavial.com"</li>
                    <li>Выделите всю таблицу cookies (можно скопировать как текст)</li>
                    <li>Вставьте в поле выше - система автоматически преобразует формат</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ Убедитесь, что вы авторизованы на сайте перед копированием cookies!
                  </p>
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Важно!</AlertTitle>
                <AlertDescription className="text-sm">
                  Cookies должны быть для домена <strong>teorica.practicavial.com</strong> или <strong>practicavial.com</strong>.
                  Убедитесь, что вы авторизованы на сайте перед копированием. Cookies для других доменов (например, google.com) не нужны, но не помешают.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Логин / Email</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="your-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={scraping}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="your-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={scraping}
                  />
                </div>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Автоматическая авторизация</AlertTitle>
                <AlertDescription>
                  Автоматическая авторизация может не работать из-за защиты сайта. Рекомендуется использовать cookies из браузера.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Важно</AlertTitle>
            <AlertDescription>
              Cookies не сохраняются и используются только для текущей сессии выгрузки.
              Убедитесь, что у вас есть премиум доступ к PracticaVial для выгрузки всех тестов.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Topics Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Выбор тем для выгрузки
          </CardTitle>
          <CardDescription>
            Выберите темы, которые нужно выгрузить. Всего доступно {availableTopics.length} тем.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllTopics}
              disabled={scraping || availableTopics.length === 0}
            >
              Выбрать все
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAllTopics}
              disabled={scraping || selectedTopics.length === 0}
            >
              Снять все
            </Button>
            <Badge variant="outline">
              Выбрано: {selectedTopics.length} из {availableTopics.length}
            </Badge>
          </div>

          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="space-y-2">
              {availableTopics.map((topic) => (
                <div
                  key={topic.number}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={`topic-${topic.number}`}
                    checked={selectedTopics.includes(topic.number)}
                    onCheckedChange={() => toggleTopic(topic.number)}
                    disabled={scraping}
                  />
                  <Label
                    htmlFor={`topic-${topic.number}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    Тема {topic.number}: {topic.title}
                  </Label>
                  {scrapeResult?.questionsByTopic[topic.number] !== undefined && (
                    <Badge variant="secondary">
                      {scrapeResult.questionsByTopic[topic.number]} вопросов
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Scrape Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleScrape}
            disabled={scraping || (useCookies ? !cookies : (!username || !password)) || selectedTopics.length === 0}
            size="lg"
            className="w-full gap-2"
          >
            {scraping ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Выгрузка...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Начать выгрузку
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {scraping && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Прогресс выгрузки</span>
                <span className="font-medium">{scrapeProgress}%</span>
              </div>
              <Progress value={scrapeProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Card */}
      {scrapeResult && !scraping && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Результаты выгрузки
            </CardTitle>
            <CardDescription>
              Выгрузка завершена {new Date(scrapeResult.timestamp).toLocaleString("ru-RU")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Темы</span>
                </div>
                <p className="text-3xl font-bold text-primary">{scrapeResult.topicsProcessed}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-secondary" />
                  <span className="text-sm text-muted-foreground">Тесты</span>
                </div>
                <p className="text-3xl font-bold text-secondary">{scrapeResult.testsProcessed}</p>
              </div>
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-sm text-muted-foreground">Вопросы</span>
                </div>
                <p className="text-3xl font-bold text-success">{scrapeResult.questionsProcessed}</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">Сохранено</span>
                </div>
                <p className="text-3xl font-bold text-accent">{scrapeResult.saved}</p>
              </div>
            </div>

            {scrapeResult.errors > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ошибки при выгрузке</AlertTitle>
                <AlertDescription>
                  Обнаружено {scrapeResult.errors} ошибок. Проверьте логи для деталей.
                </AlertDescription>
              </Alert>
            )}

            {scrapeResult.excelFile && (
              <Button
                onClick={handleDownloadExcel}
                className="w-full gap-2"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Скачать Excel файл
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs Card */}
      {scrapeLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Логи выгрузки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="space-y-1 font-mono text-sm">
                {scrapeLogs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      "py-1",
                      log.includes("❌") && "text-destructive",
                      log.includes("✅") && "text-green-600",
                      log.includes("⚠️") && "text-yellow-600"
                    )}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

