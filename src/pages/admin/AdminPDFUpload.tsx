/**
 * Компонент для загрузки и обработки PDF файлов
 * Создает темы, подтемы и материалы из PDF
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, BookOpen, ExternalLink } from "lucide-react";
import { topicApi, subtopicApi, materialApi } from "@/utils/materialApi";
import { Progress } from "@/components/ui/progress";
import { PDFSection, createMaterialHTML } from "@/utils/pdfProcessor";

interface ProcessingStatus {
  stage: 'idle' | 'uploading' | 'processing' | 'creating' | 'done' | 'error';
  progress: number;
  message: string;
  details?: string;
}

export function AdminPDFUpload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [topicNumber, setTopicNumber] = useState<number>(1);
  const [topicTitle, setTopicTitle] = useState<string>("");
  const [topicTitleEs, setTopicTitleEs] = useState<string>("");
  const [topicTitleEn, setTopicTitleEn] = useState<string>("");
  const [existingTopics, setExistingTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [createdTopicId, setCreatedTopicId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Загружаем существующие темы
  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const topics = await topicApi.getAll();
      setExistingTopics(topics);
    } catch (error) {
      console.error('Ошибка загрузки тем:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      // Предполагаем название темы из имени файла
      const fileName = file.name.replace(/\.pdf$/i, '');
      if (!topicTitle) {
        setTopicTitle(fileName);
      }
    } else {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите PDF файл",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите PDF файл",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTopicId && (!topicTitle || !topicTitleEs || !topicTitleEn)) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите существующую тему или заполните названия темы",
        variant: "destructive",
      });
      return;
    }

    try {
      setStatus({ stage: 'processing', progress: 10, message: 'Обработка PDF файла...' });

      // Обрабатываем PDF напрямую на клиенте (не загружаем в Storage)
      // PDF будет обработан и контент сохранен в базе данных
      const { extractPDFContent } = await import('@/utils/pdfProcessor');
      
      setStatus({ 
        stage: 'processing', 
        progress: 20, 
        message: 'Извлечение текста из PDF...',
        details: `Файл: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`,
      });
      
      // Обрабатываем PDF с прогрессом
      const processedPDF = await extractPDFContent(selectedFile);
      
      setStatus({ 
        stage: 'processing', 
        progress: 50, 
        message: `Обработано страниц: ${processedPDF.totalPages}, разделов: ${processedPDF.sections.length}`,
        details: `Файл успешно обработан. Начинаем создание материалов...`,
      });

      setStatus({ 
        stage: 'creating', 
        progress: 70, 
        message: 'Создание материалов...',
        details: `Обработано разделов: ${processedPDF.sections.length}`,
      });

      let topicId = selectedTopicId;

      // Создаем тему если не выбрана существующая
      if (!topicId) {
        const topic = await topicApi.create({
          number: topicNumber,
          title_ru: topicTitle,
          title_es: topicTitleEs,
          title_en: topicTitleEn,
          order_index: topicNumber,
        });
        topicId = topic.id;
        setCreatedTopicId(topicId);
      } else {
        setCreatedTopicId(topicId);
      }

      // Получаем существующие подтемы для этой темы, чтобы избежать дубликатов
      const existingSubtopics = await subtopicApi.getByTopic(topicId);
      const maxOrderIndex = existingSubtopics.length > 0 
        ? Math.max(...existingSubtopics.map(s => s.order_index || 0))
        : 0;

      // Создаем подтемы и материалы для каждого раздела
      let createdCount = 0;
      let skippedCount = 0;
      
      for (let i = 0; i < processedPDF.sections.length; i++) {
        const section = processedPDF.sections[i];
        const orderIndex = maxOrderIndex + i + 1;
        
        // Проверяем, не существует ли уже подтема с таким order_index
        const existingWithSameOrder = existingSubtopics.find(s => s.order_index === orderIndex);
        if (existingWithSameOrder) {
          console.warn(`[AdminPDFUpload] Подтема с order_index ${orderIndex} уже существует, пропускаем`);
          skippedCount++;
          continue;
        }
        
        try {
          // Создаем HTML контент для материала
          const htmlContent = createMaterialHTML(section);
          
          // Создаем подтему
          const subtopic = await subtopicApi.create({
            topic_id: topicId,
            title_ru: section.title || `Раздел ${orderIndex}`,
            title_es: section.title || `Sección ${orderIndex}`,
            title_en: section.title || `Section ${orderIndex}`,
            order_index: orderIndex,
            type: 'material',
            is_required: true,
          });

          // Создаем материал
          await materialApi.create({
            subtopic_id: subtopic.id,
            title_ru: section.title || `Раздел ${orderIndex}`,
            title_es: section.title || `Sección ${orderIndex}`,
            title_en: section.title || `Section ${orderIndex}`,
            content: { html: htmlContent },
            type: 'theory',
            is_published: true,
          });

          createdCount++;
          setStatus({ 
            stage: 'creating', 
            progress: 70 + (createdCount / processedPDF.sections.length) * 20, 
            message: `Создано материалов: ${createdCount} из ${processedPDF.sections.length}`,
            details: skippedCount > 0 ? `Пропущено дубликатов: ${skippedCount}` : undefined,
          });
        } catch (error: any) {
          // Если ошибка дубликата, пропускаем
          if (error?.message?.includes('duplicate key') || error?.code === '23505') {
            console.warn(`[AdminPDFUpload] Дубликат подтемы, пропускаем раздел ${i + 1}`);
            skippedCount++;
            continue;
          }
          // Другие ошибки пробрасываем дальше
          throw error;
        }
        
        // Добавляем небольшую задержку для больших файлов, чтобы не перегружать базу
        if (processedPDF.sections.length > 10 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setStatus({ 
        stage: 'done', 
        progress: 100, 
        message: `Успешно создано ${createdCount} материалов!`,
        details: skippedCount > 0 ? `Пропущено дубликатов: ${skippedCount}` : undefined,
      });

      toast({
        title: "Успешно!",
        description: `Создано ${createdCount} материалов из PDF${skippedCount > 0 ? ` (пропущено дубликатов: ${skippedCount})` : ''}`,
      });

      // Сбрасываем форму (но оставляем createdTopicId для кнопок просмотра)
      setSelectedFile(null);
      setTopicTitle("");
      setTopicTitleEs("");
      setTopicTitleEn("");
      setSelectedTopicId("");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Не сбрасываем createdTopicId - он нужен для кнопок просмотра
    } catch (error: any) {
      console.error('Ошибка обработки PDF:', error);
      const errorMessage = error.message || "Не удалось обработать PDF файл";
      setStatus({ 
        stage: 'error', 
        progress: 0, 
        message: 'Ошибка обработки PDF',
        details: errorMessage,
      });
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Загрузка PDF материалов
          </CardTitle>
          <CardDescription>
            Загрузите PDF файл с учебным материалом. Система автоматически создаст тему, подтемы и материалы.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Выбор файла */}
          <div className="space-y-2">
            <Label htmlFor="pdf-file">PDF файл</Label>
            <div className="flex items-center gap-4">
              <Input
                id="pdf-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="flex-1"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  {selectedFile.name}
                  <span className="text-xs">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Выбор темы */}
          <div className="space-y-2">
            <Label>Тема</Label>
            <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите существующую тему или создайте новую" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Создать новую тему</SelectItem>
                {existingTopics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.number}. {topic.title_ru}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Поля для новой темы */}
          {!selectedTopicId && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="topic-number">Номер темы</Label>
                <Input
                  id="topic-number"
                  type="number"
                  min="1"
                  value={topicNumber}
                  onChange={(e) => setTopicNumber(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-title-ru">Название темы (RU)</Label>
                <Input
                  id="topic-title-ru"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="Например: Общие положения"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-title-es">Название темы (ES)</Label>
                <Input
                  id="topic-title-es"
                  value={topicTitleEs}
                  onChange={(e) => setTopicTitleEs(e.target.value)}
                  placeholder="Например: Disposiciones generales"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-title-en">Название темы (EN)</Label>
                <Input
                  id="topic-title-en"
                  value={topicTitleEn}
                  onChange={(e) => setTopicTitleEn(e.target.value)}
                  placeholder="Например: General provisions"
                />
              </div>
            </div>
          )}

          {/* Статус обработки */}
          {status.stage !== 'idle' && (
            <Card className="p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{status.message}</span>
                    {status.stage === 'done' && (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    )}
                    {status.stage === 'error' && (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    {(status.stage === 'uploading' || status.stage === 'processing' || status.stage === 'creating') && (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    )}
                  </div>
                  {status.details && (
                    <p className="text-sm text-muted-foreground">{status.details}</p>
                  )}
                  <Progress value={status.progress} className="h-2" />
                </div>
                
                {/* Кнопки для просмотра созданных материалов */}
                {status.stage === 'done' && createdTopicId && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/topic/${createdTopicId}`)}
                      className="gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      Открыть тему
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Карта обучения
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/admin/editor')}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Редактор материалов
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Кнопка загрузки */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || status.stage !== 'idle' && status.stage !== 'done' && status.stage !== 'error'}
            className="w-full"
            size="lg"
          >
            {status.stage === 'idle' && (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Загрузить и обработать PDF
              </>
            )}
            {status.stage !== 'idle' && status.stage !== 'done' && status.stage !== 'error' && (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Обработка...
              </>
            )}
            {status.stage === 'done' && (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Готово!
              </>
            )}
            {status.stage === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Попробовать снова
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

