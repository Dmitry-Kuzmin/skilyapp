import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { importRoadSigns, importLanguageTerms } from "@/utils/importData";
import { importQuestions } from "@/utils/importQuestions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle2, Database, FileText, BookOpen, Map, Trash2, Download, BarChart3 } from "lucide-react";
import { loadXLSX } from "@/utils/xlsxLoader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function AdminImport() {
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [imported, setImported] = useState<{[key: string]: boolean}>({});
  const [stats, setStats] = useState<{[key: string]: number}>({});
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [signsCount, termsCount, questionsCount, topicsCount] = await Promise.all([
        supabase.from('road_signs').select('*', { count: 'exact', head: true }),
        supabase.from('language_terms').select('*', { count: 'exact', head: true }),
        supabase.from('questions_new').select('*', { count: 'exact', head: true }),
        supabase.from('topics').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        roadSigns: signsCount.count || 0,
        terms: termsCount.count || 0,
        questions: questionsCount.count || 0,
        topics: topicsCount.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFileUpload = async (file: File, type: 'roadSigns' | 'terms' | 'questions') => {
    setLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      // Lazy load XLSX только когда нужен
      const XLSX = await loadXLSX();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      let result;
      switch (type) {
        case 'roadSigns':
          result = await importRoadSigns(data as any[]);
          break;
        case 'terms':
          result = await importLanguageTerms(data as any[]);
          break;
        case 'questions':
          result = await importQuestions(data as any[]);
          break;
      }

      if (result.success) {
        toast({
          title: "Успешно!",
          description: `Импортировано ${result.count || 0} записей`,
        });
        setImported(prev => ({ ...prev, [type]: true }));
        await loadStats();
      } else {
        throw new Error(result.error || 'Ошибка импорта');
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось импортировать данные",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const importOptions = [
    {
      id: 'roadSigns',
      title: 'Дорожные знаки',
      description: 'Импорт дорожных знаков из Excel файла',
      icon: Map,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      count: stats.roadSigns,
      label: 'знаков',
    },
    {
      id: 'terms',
      title: 'Языковые термины',
      description: 'Импорт языковых терминов из Excel файла',
      icon: BookOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      count: stats.terms,
      label: 'терминов',
    },
    {
      id: 'questions',
      title: 'Вопросы',
      description: 'Импорт вопросов из Excel файла',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      count: stats.questions,
      label: 'вопросов',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Импорт данных</h1>
        <p className="text-muted-foreground">
          Импорт данных из Excel файлов в базу данных
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Map className="w-4 h-4" />
              Дорожные знаки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.roadSigns || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Термины
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.terms || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Вопросы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.questions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Темы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topics || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Import Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {importOptions.map((option) => {
          const Icon = option.icon;
          const isImporting = loading[option.id as keyof typeof loading];
          const isImported = imported[option.id as keyof typeof imported];

          return (
            <Card key={option.id} className="relative">
              <CardHeader>
                <div className={`p-3 rounded-lg ${option.bgColor} w-fit mb-2`}>
                  <Icon className={`h-6 w-6 ${option.color}`} />
                </div>
                <CardTitle>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{option.count}</div>
                    <div className="text-sm text-muted-foreground">{option.label}</div>
                  </div>
                  {isImported && (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  )}
                </div>

                <div className="relative">
                  <input
                    type="file"
                    id={`file-${option.id}`}
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, option.id as 'roadSigns' | 'terms' | 'questions');
                      }
                    }}
                    disabled={isImporting}
                  />
                  <label htmlFor={`file-${option.id}`}>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full gap-2"
                      disabled={isImporting}
                    >
                      <span>
                        {isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Импорт...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Загрузить файл
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Инструкции
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Формат файлов:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Файлы должны быть в формате Excel (.xlsx или .xls)</li>
              <li>Первая строка должна содержать заголовки столбцов</li>
              <li>Данные должны соответствовать структуре базы данных</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Процесс импорта:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Выберите тип данных для импорта</li>
              <li>Загрузите файл Excel</li>
              <li>Дождитесь завершения импорта</li>
              <li>Проверьте статистику после импорта</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

