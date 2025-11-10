import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, MessageSquare, Calendar, User, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AIFeedback {
  id: string;
  user_id: string | null;
  question: string;
  ai_response: string;
  rating: number;
  topic_number: number | null;
  model_used: string | null;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string | null;
    username: string | null;
  } | null;
}

export function AdminAIReports() {
  const [feedback, setFeedback] = useState<AIFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<"all" | "positive" | "negative">("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [stats, setStats] = useState({
    total: 0,
    positive: 0,
    negative: 0,
    satisfaction: 0,
  });

  useEffect(() => {
    loadFeedback();
    loadStats();
  }, [filterRating, filterTopic]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_feedback")
        .select("rating");

      if (error) throw error;

      const positive = data?.filter(f => f.rating === 1).length || 0;
      const negative = data?.filter(f => f.rating === -1).length || 0;
      const total = data?.length || 0;
      const satisfaction = total > 0 ? Math.round((positive / total) * 100) : 0;

      setStats({ total, positive, negative, satisfaction });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadFeedback = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("ai_feedback")
        .select(`
          *,
          user:profiles!ai_feedback_user_id_fkey(first_name, last_name, username)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterRating === "positive") {
        query = query.eq("rating", 1);
      } else if (filterRating === "negative") {
        query = query.eq("rating", -1);
      }

      if (filterTopic !== "all") {
        query = query.eq("topic_number", parseInt(filterTopic));
      }

      const { data, error } = await query;

      if (error) throw error;

      setFeedback(data || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM, HH:mm", { locale: ru });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Всего оценок</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Уникальных ответов</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Положительные</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">{stats.positive}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>{stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Отрицательные</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600">{stats.negative}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-red-600">
              <ThumbsDown className="h-3.5 w-3.5" />
              <span>{stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Удовлетворённость</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.satisfaction}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {stats.satisfaction >= 70 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              )}
              <span>{stats.satisfaction >= 70 ? "Отлично" : "Требует внимания"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterRating} onValueChange={(v) => setFilterRating(v as any)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Фильтр по оценке" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все оценки</SelectItem>
            <SelectItem value="positive">👍 Положительные</SelectItem>
            <SelectItem value="negative">👎 Отрицательные</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTopic} onValueChange={setFilterTopic}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Фильтр по теме" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все темы</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <SelectItem key={num} value={num.toString()}>Тема {num}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>Отзывы об AI ответах</CardTitle>
          <CardDescription>
            Последние {feedback.length} оценок от пользователей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Оценка</TableHead>
                  <TableHead className="w-[120px]">Дата</TableHead>
                  <TableHead className="w-[150px]">Пользователь</TableHead>
                  <TableHead className="w-[80px]">Тема</TableHead>
                  <TableHead>Вопрос</TableHead>
                  <TableHead>Ответ AI (краткий)</TableHead>
                  <TableHead className="w-[100px]">Модель</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      {item.rating === 1 ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Хорошо
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          Плохо
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[120px]">
                          {item.user?.first_name || "Аноним"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.topic_number ? (
                        <Badge variant="secondary" className="text-xs">
                          Тема {item.topic_number}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <p className="text-sm truncate" title={item.question}>
                        {item.question}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-xs text-muted-foreground truncate" title={item.ai_response}>
                        {item.ai_response.substring(0, 100)}...
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.model_used || "N/A"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && feedback.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Пока нет оценок</p>
              <p className="text-sm">Оценки будут появляться когда пользователи оценят AI ответы</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

