import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Upload, 
  CheckCircle2, 
  Database, 
  FileText, 
  Map, 
  Trash2, 
  Download, 
  BarChart3,
  Flag,
  Search,
  Filter,
  Edit,
  Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function AdminPDDRussia() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    questions: 0,
    signs: 0,
    penalties: 0,
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  

  useEffect(() => {
    loadStats();
    loadQuestions();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, selectedTicket, selectedCategory, searchQuery]);

  const loadStats = async () => {
    try {
      const [questionsCount, signsCount, penaltiesCount] = await Promise.all([
        supabase.from('pdd_russia_questions').select('*', { count: 'exact', head: true }),
        supabase.from('pdd_russia_signs').select('*', { count: 'exact', head: true }),
        supabase.from('pdd_russia_penalties').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        questions: questionsCount.count || 0,
        signs: signsCount.count || 0,
        penalties: penaltiesCount.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pdd_russia_questions')
        .select('*')
        .order('ticket_number', { ascending: true })
        .order('question_number', { ascending: true })
        .limit(100);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить вопросы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    // Фильтр по билету
    if (selectedTicket !== "all") {
      filtered = filtered.filter(q => q.ticket_number === parseInt(selectedTicket));
    }

    // Фильтр по категории
    if (selectedCategory !== "all") {
      filtered = filtered.filter(q => q.ticket_category === selectedCategory);
    }

    // Поиск по тексту
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.question_text?.toLowerCase().includes(query) ||
        q.topics?.some((t: string) => t.toLowerCase().includes(query))
      );
    }

    setFilteredQuestions(filtered);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Flag className="w-8 h-8" />
          ПДД Россия
        </h1>
        <p className="text-muted-foreground">
          Управление вопросами, знаками и штрафами ПДД России
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Вопросы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.questions}</div>
            <div className="text-sm text-muted-foreground">всего вопросов</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Map className="w-4 h-4" />
              Дорожные знаки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signs}</div>
            <div className="text-sm text-muted-foreground">всего знаков</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Штрафы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.penalties}</div>
            <div className="text-sm text-muted-foreground">всего штрафов</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Билет</label>
              <Select value={selectedTicket} onValueChange={setSelectedTicket}>
                <SelectTrigger>
                  <SelectValue placeholder="Все билеты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все билеты</SelectItem>
                  {Array.from({ length: 40 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      Билет {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Категория</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  <SelectItem value="A,B">A, B</SelectItem>
                  <SelectItem value="C,D">C, D</SelectItem>
                  <SelectItem value="ALL">Все</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Поиск</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по тексту вопроса..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Вопросы</CardTitle>
            <Badge variant="secondary">
              Показано: {filteredQuestions.length} из {questions.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Вопросы не найдены
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <Card key={question.id} className="hover:bg-zinc-900/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Билет {question.ticket_number}, Вопрос {question.question_number}
                          </Badge>
                          {question.ticket_category && (
                            <Badge variant="secondary">
                              {question.ticket_category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{question.question_text}</p>
                        {question.topics && question.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {question.topics.map((topic: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Информация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Импорт данных:</h3>
            <p className="text-sm text-muted-foreground">
              Для импорта вопросов ПДД России используй скрипт:
            </p>
            <code className="block p-2 bg-zinc-900 rounded text-sm">
              npm run import:pdd-russia /path/to/pdd_russia
            </code>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Структура:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>40 билетов по 20 вопросов = 800 вопросов</li>
              <li>Категории: A,B / C,D / ALL</li>
              <li>Вопросы сгруппированы по темам</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

