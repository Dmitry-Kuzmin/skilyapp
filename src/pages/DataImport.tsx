import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { importRoadSigns, importLanguageTerms } from "@/utils/importData";
import { importQuestions } from "@/utils/importQuestions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle2, Database, FileText, BookOpen, Map, Trash2, Download, BarChart3 } from "lucide-react";
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function DataImport() {
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
      if (type === 'roadSigns') {
        await importRoadSigns(file);
      } else if (type === 'terms') {
        await importLanguageTerms(file);
      } else if (type === 'questions') {
        const result = await importQuestions(file);
        console.log(`Imported ${result.successCount}/${result.total} questions`);
      }

      setImported(prev => ({ ...prev, [type]: true }));
      await loadStats();
      
      toast({
        title: "Успешно!",
        description: `Данные ${type === 'roadSigns' ? 'знаков' : type === 'terms' ? 'терминов' : 'вопросов'} загружены`,
      });
    } catch (error) {
      console.error('Error importing:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleClearData = async (type: 'roadSigns' | 'terms' | 'questions') => {
    setLoading(prev => ({ ...prev, [`clear_${type}`]: true }));
    
    try {
      const tableName = type === 'roadSigns' ? 'road_signs' : type === 'terms' ? 'language_terms' : 'questions_new';
      
      // For questions, also clear related tables
      if (type === 'questions') {
        await supabase.from('question_tags').delete().neq('question_id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('answer_options').delete().neq('question_id', '00000000-0000-0000-0000-000000000000');
      }
      
      await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      await loadStats();
      
      toast({
        title: "Успешно!",
        description: `Данные ${type === 'roadSigns' ? 'знаков' : type === 'terms' ? 'терминов' : 'вопросов'} очищены`,
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось очистить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [`clear_${type}`]: false }));
    }
  };

  const handleExportData = async (type: 'roadSigns' | 'terms' | 'questions') => {
    try {
      const tableName = type === 'roadSigns' ? 'road_signs' : type === 'terms' ? 'language_terms' : 'questions_new';
      const { data, error } = await supabase.from(tableName).select('*');
      
      if (error) throw error;
      
      const ws = XLSX.utils.json_to_sheet(data || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tableName);
      XLSX.writeFile(wb, `${tableName}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: "Успешно!",
        description: "Данные экспортированы",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать данные",
        variant: "destructive",
      });
    }
  };

  const dataTypes = [
    {
      id: 'roadSigns',
      title: 'Дорожные знаки',
      description: 'CSV или Excel файл с дорожными знаками',
      icon: Map,
      accept: '.csv,.xlsx,.xls',
      color: 'primary'
    },
    {
      id: 'terms',
      title: 'Словарь терминов',
      description: 'CSV или Excel файл с терминами',
      icon: BookOpen,
      accept: '.csv,.xlsx,.xls',
      color: 'secondary'
    },
    {
      id: 'questions',
      title: 'Тестовые вопросы',
      description: 'Excel файл с вопросами',
      icon: FileText,
      accept: '.xlsx,.xls',
      color: 'success'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-primary mb-4">
            <Database className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Панель Администратора
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Управление базой данных приложения - загрузка знаков, терминов и тестовых вопросов
          </p>
        </div>

        {/* Statistics Card */}
        <Card className="mb-8 gradient-card border-primary/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardContent className="relative p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary shrink-0">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold">Статистика базы данных</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Map className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Дорожные знаки</span>
                </div>
                <p className="text-3xl font-bold text-primary">{stats.roadSigns || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-secondary" />
                  <span className="text-sm text-muted-foreground">Термины</span>
                </div>
                <p className="text-3xl font-bold text-secondary">{stats.terms || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-success" />
                  <span className="text-sm text-muted-foreground">Вопросы</span>
                </div>
                <p className="text-3xl font-bold text-success">{stats.questions || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">Темы</span>
                </div>
                <p className="text-3xl font-bold text-accent">{stats.topics || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Import Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataTypes.map((dataType) => (
            <Card
              key={dataType.id}
              className="group relative overflow-hidden gradient-card border-border/50 hover:border-primary/30 transition-all duration-500 hover:scale-105 hover:shadow-primary"
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="relative">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-${dataType.color}/10 group-hover:bg-${dataType.color}/20 transition-colors duration-300`}>
                    <dataType.icon className={`w-7 h-7 text-${dataType.color}`} />
                  </div>
                  {imported[dataType.id] && (
                    <CheckCircle2 className="w-6 h-6 text-success animate-pulse" />
                  )}
                </div>
                <CardTitle className="text-2xl">{dataType.title}</CardTitle>
                <CardDescription className="text-base">{dataType.description}</CardDescription>
              </CardHeader>

              <CardContent className="relative space-y-4">
                <div className="relative">
                  <input
                    type="file"
                    id={`file-${dataType.id}`}
                    accept={dataType.accept}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, dataType.id as any);
                    }}
                    className="hidden"
                    disabled={loading[dataType.id]}
                  />
                  <Button
                    variant={imported[dataType.id] ? "outline" : "default"}
                    className={`w-full group-hover:shadow-lg transition-all duration-300 ${
                      imported[dataType.id] ? 'bg-success/10 hover:bg-success/20 border-success/50' : ''
                    }`}
                    size="lg"
                    disabled={loading[dataType.id]}
                    onClick={() => document.getElementById(`file-${dataType.id}`)?.click()}
                  >
                    {loading[dataType.id] ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Загрузка...
                      </>
                    ) : imported[dataType.id] ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Загружено
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Выбрать файл
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Формат: {dataType.accept}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleExportData(dataType.id as any)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Экспорт
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-destructive/50 hover:bg-destructive/10"
                        disabled={loading[`clear_${dataType.id}`]}
                      >
                        {loading[`clear_${dataType.id}`] ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Очистить
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие удалит все данные из таблицы "{dataType.title}". 
                          Это действие нельзя отменить.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleClearData(dataType.id as any)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="mt-8 gradient-card border-primary/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardContent className="relative p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary shrink-0">
                <Database className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold">Инструкция по загрузке</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Дорожные знаки:</strong> CSV/Excel с полями: name_es, name_ru, description_es, description_ru, sign_type, image_url, sign_number</li>
                  <li>• <strong>Термины:</strong> CSV/Excel с полями: term_es, term_ru, description_es, description_ru, difficulty, category, image_url, audio_url</li>
                  <li>• <strong>Вопросы:</strong> Excel с полями:
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>- topic_number (1-10), difficulty (easy/medium/hard), is_premium (true/false), type (single/multiple)</li>
                      <li>- question_ru, question_es, question_en</li>
                      <li>- answer_1_ru, answer_1_es, answer_1_en, is_correct_1 (до answer_4)</li>
                      <li>- explanation_ru, explanation_es, explanation_en</li>
                      <li>- tags (через запятую: priority, signs, maneuvers и т.д.)</li>
                      <li>- image_url, sign_code, source, notes (опционально)</li>
                    </ul>
                  </li>
                  <li className="pt-2 border-t border-border/50">
                    <strong>Примечание:</strong> Загрузка новых данных добавляет записи к существующим. Используйте кнопку "Очистить" для полной замены данных.
                  </li>
                  <li className="pt-2 border-t border-border/50">
                    <strong>Google Sheets:</strong> Сделайте таблицу публичной (Share → Anyone with the link → Viewer), затем экспортируйте: File → Download → Microsoft Excel (.xlsx)
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
