import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { importRoadSigns, importLanguageTerms } from "@/utils/importData";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle2, Database, FileText, BookOpen, Map } from "lucide-react";
import * as XLSX from 'xlsx';

export default function DataImport() {
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [imported, setImported] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const handleFileUpload = async (file: File, type: 'roadSigns' | 'terms' | 'questions') => {
    setLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      if (file.type === 'text/csv') {
        const text = await file.text();
        if (type === 'roadSigns') {
          await importRoadSigns(text);
        } else if (type === 'terms') {
          await importLanguageTerms(text);
        }
      } else {
        // Excel файлы
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (type === 'questions') {
          // Очистка старых данных
          await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          // Импорт новых вопросов
          const questions = jsonData.map((row: any) => ({
            topic_es: row.topic_es || row['Тема (ES)'],
            topic_ru: row.topic_ru || row['Тема (RU)'],
            question_es: row.question_es || row['Вопрос (ES)'],
            question_ru: row.question_ru || row['Вопрос (RU)'],
            options_es: Array.isArray(row.options_es) ? row.options_es : JSON.parse(row.options_es || '[]'),
            options_ru: Array.isArray(row.options_ru) ? row.options_ru : JSON.parse(row.options_ru || '[]'),
            correct_answer_es: row.correct_answer_es || row['Правильный ответ (ES)'],
            correct_answer_ru: row.correct_answer_ru || row['Правильный ответ (RU)'],
            explanation_es: row.explanation_es || row['Объяснение (ES)'] || null,
            explanation_ru: row.explanation_ru || row['Объяснение (RU)'] || null,
          }));

          const { error } = await supabase.from('questions').insert(questions);
          if (error) throw error;
        }
      }

      setImported(prev => ({ ...prev, [type]: true }));
      toast({
        title: "Успешно!",
        description: `Данные ${type === 'roadSigns' ? 'знаков' : type === 'terms' ? 'терминов' : 'вопросов'} загружены`,
      });
    } catch (error) {
      console.error('Error importing:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const dataTypes = [
    {
      id: 'roadSigns',
      title: 'Дорожные знаки',
      description: 'CSV файл с дорожными знаками',
      icon: Map,
      accept: '.csv',
      color: 'primary'
    },
    {
      id: 'terms',
      title: 'Словарь терминов',
      description: 'CSV файл с терминами',
      icon: BookOpen,
      accept: '.csv',
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
                  <label htmlFor={`file-${dataType.id}`}>
                    <Button
                      variant={imported[dataType.id] ? "outline" : "default"}
                      className={`w-full group-hover:shadow-lg transition-all duration-300 ${
                        imported[dataType.id] ? 'bg-success/10 hover:bg-success/20 border-success/50' : ''
                      }`}
                      size="lg"
                      disabled={loading[dataType.id]}
                      asChild
                    >
                      <span className="cursor-pointer">
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
                      </span>
                    </Button>
                  </label>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Формат: {dataType.accept}
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
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Дорожные знаки:</strong> CSV с полями name_es, name_ru, description_es, description_ru, sign_type, image_url</li>
                  <li>• <strong>Термины:</strong> CSV с полями term_es, term_ru, description_es, description_ru, difficulty, category</li>
                  <li>• <strong>Вопросы:</strong> Excel с полями topic_es, topic_ru, question_es, question_ru, options_es, options_ru, correct_answer_es, correct_answer_ru</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
