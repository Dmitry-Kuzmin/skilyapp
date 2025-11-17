import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TestCoverUploader } from "@/components/admin/TestCoverUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdminTestCovers() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedTopicForCover, setSelectedTopicForCover] = useState<string | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setTopicsLoading(true);
      const { data, error } = await supabase
        .from('topics')
        .select('id, number, title_ru, title_es, title_en, cover_image, gradient_from, gradient_to, is_premium')
        .order('number', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
    } catch (error: any) {
      console.error('Error loading topics:', error);
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить темы: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setTopicsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ImageIcon className="w-8 h-8 text-primary" />
          Управление обложками тестов
        </h1>
        <p className="text-muted-foreground mt-2">
          Загрузите обложки для тем тестов. Рекомендуемый размер: 800x400px, формат: JPG/PNG/WEBP
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Список тем</TabsTrigger>
              <TabsTrigger value="upload">Загрузить обложку</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="space-y-4 mt-4">
              {topicsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : topics.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Темы не найдены. Убедитесь, что темы загружены в базу данных.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.map((topic) => (
                    <Card
                      key={topic.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTopicForCover === topic.id
                          ? 'ring-2 ring-primary'
                          : ''
                      }`}
                      onClick={() => setSelectedTopicForCover(topic.id)}
                    >
                      <div className="relative">
                        {topic.cover_image ? (
                          <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
                            <img
                              src={topic.cover_image}
                              alt={topic.title_ru}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded">
                                Тема {topic.number}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="h-32 w-full rounded-t-lg relative overflow-hidden"
                            style={{
                              background: topic.gradient_from && topic.gradient_to
                                ? `linear-gradient(135deg, ${topic.gradient_from} 0%, ${topic.gradient_to} 100%)`
                                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-white text-3xl font-bold opacity-30">
                                {topic.number}
                              </div>
                            </div>
                            <div className="absolute bottom-2 left-2 right-2">
                              <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded">
                                Тема {topic.number} (без обложки)
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                          {topic.title_ru}
                        </h3>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {topic.cover_image ? '✓ Обложка загружена' : '✗ Нет обложки'}
                          </span>
                          {topic.is_premium && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded">
                              Premium
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4 mt-4">
              {topicsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : topics.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Темы не найдены. Убедитесь, что темы загружены в базу данных.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Выберите тему</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedTopicForCover || ''}
                      onChange={(e) => setSelectedTopicForCover(e.target.value)}
                    >
                      <option value="">-- Выберите тему --</option>
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          Тема {topic.number}: {topic.title_ru}
                          {topic.cover_image ? ' (обложка есть)' : ' (без обложки)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTopicForCover && (
                    <TestCoverUploader
                      topicId={selectedTopicForCover}
                      topicNumber={topics.find(t => t.id === selectedTopicForCover)?.number || 0}
                      currentCoverUrl={topics.find(t => t.id === selectedTopicForCover)?.cover_image}
                      onUploadComplete={(url) => {
                        // Обновляем локальное состояние
                        setTopics(prev => prev.map(t => 
                          t.id === selectedTopicForCover 
                            ? { ...t, cover_image: url || undefined }
                            : t
                        ));
                        toast({
                          title: "Успешно",
                          description: "Обложка обновлена",
                        });
                      }}
                    />
                  )}

                  {!selectedTopicForCover && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Выберите тему из списка выше, чтобы загрузить или обновить обложку.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

