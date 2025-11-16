import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, CheckCircle2, XCircle, Search, Reply, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HelpFeedback {
  id: string;
  user_id: string;
  profile_id: string | null;
  section_id: string;
  subsection_id: string | null;
  helpful: boolean;
  feedback_text: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    first_name: string | null;
    username: string | null;
  };
}

export function AdminHelpFeedback() {
  const [feedbacks, setFeedbacks] = useState<HelpFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHelpful, setFilterHelpful] = useState<string>("all");
  const [replyingTo, setReplyingTo] = useState<HelpFeedback | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbacks();
  }, [filterHelpful]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("help_feedback")
        .select(`
          *,
          user:profiles!help_feedback_profile_id_fkey(first_name, username)
        `)
        .order("created_at", { ascending: false });

      if (filterHelpful !== "all") {
        query = query.eq("helpful", filterHelpful === "yes");
      }

      const { data, error } = await query;

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error: any) {
      console.error("Error fetching feedbacks:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить отзывы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyingTo || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { error } = await supabase
        .from("help_feedback")
        .update({
          admin_reply: replyText.trim(),
          replied_at: new Date().toISOString(),
          replied_by: user.id,
        })
        .eq("id", replyingTo.id);

      if (error) throw error;

      // Create notification for the user who left the feedback
      if (replyingTo.profile_id) {
        const { error: notificationError } = await supabase
          .from("duel_notifications")
          .insert({
            user_id: replyingTo.profile_id,
            type: "help_feedback_reply",
            title: "Ответ на ваш отзыв",
            message: `Администратор ответил на ваш отзыв по разделу "${replyingTo.section_id}"`,
            icon: "message-square",
            metadata: {
              feedback_id: replyingTo.id,
              section_id: replyingTo.section_id,
              subsection_id: replyingTo.subsection_id,
              admin_reply: replyText.trim(),
            },
          });

        if (notificationError) {
          console.error("Error creating notification:", notificationError);
          // Don't fail the whole operation if notification fails
        }
      }

      toast({
        title: "Успешно",
        description: "Ответ отправлен",
      });

      setReplyingTo(null);
      setReplyText("");
      fetchFeedbacks();
    } catch (error: any) {
      console.error("Error replying:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить ответ",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter((feedback) => {
    const matchesSearch =
      feedback.section_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.feedback_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.user?.username?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const stats = {
    total: feedbacks.length,
    helpful: feedbacks.filter((f) => f.helpful).length,
    notHelpful: feedbacks.filter((f) => !f.helpful).length,
    withReply: feedbacks.filter((f) => f.admin_reply).length,
    withoutReply: feedbacks.filter((f) => !f.admin_reply).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Отзывы из центра помощи
          </h1>
          <p className="text-muted-foreground mt-1">
            Просмотр и ответы на отзывы пользователей
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Полезно
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.helpful}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Не полезно
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.notHelpful}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">С ответами</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withReply}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Без ответов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.withoutReply}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по секции, тексту или пользователю..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterHelpful} onValueChange={setFilterHelpful}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Все отзывы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все отзывы</SelectItem>
                <SelectItem value="yes">Полезно</SelectItem>
                <SelectItem value="no">Не полезно</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Отзывы</CardTitle>
          <CardDescription>
            {filteredFeedbacks.length} из {feedbacks.length} отзывов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Нет отзывов</div>
          ) : (
            <div className="space-y-4">
              {filteredFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    feedback.admin_reply
                      ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                      : "bg-background border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={feedback.helpful ? "default" : "destructive"}
                          className={cn(
                            feedback.helpful
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          )}
                        >
                          {feedback.helpful ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Полезно
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Не полезно
                            </>
                          )}
                        </Badge>
                        <Badge variant="outline">{feedback.section_id}</Badge>
                        {feedback.subsection_id && (
                          <Badge variant="outline" className="text-xs">
                            {feedback.subsection_id}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>
                          <strong>Пользователь:</strong>{" "}
                          {feedback.user?.first_name || feedback.user?.username || "Неизвестно"}
                        </p>
                        <p>
                          <strong>Дата:</strong>{" "}
                          {new Date(feedback.created_at).toLocaleString("ru-RU")}
                        </p>
                      </div>

                      {feedback.feedback_text && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md">
                          <p className="text-sm whitespace-pre-wrap">{feedback.feedback_text}</p>
                        </div>
                      )}

                      {feedback.admin_reply && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Reply className="h-4 w-4 text-blue-600" />
                            <strong className="text-sm text-blue-900 dark:text-blue-100">
                              Ответ администратора
                            </strong>
                            {feedback.replied_at && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(feedback.replied_at).toLocaleString("ru-RU")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap text-blue-900 dark:text-blue-100">
                            {feedback.admin_reply}
                          </p>
                        </div>
                      )}
                    </div>

                    {!feedback.admin_reply && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(feedback);
                          setReplyText("");
                        }}
                        className="shrink-0"
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Ответить
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ответить на отзыв</DialogTitle>
            <DialogDescription>
              {replyingTo?.helpful
                ? "Пользователь отметил страницу как полезную"
                : "Пользователь отметил страницу как неполезную"}
            </DialogDescription>
          </DialogHeader>

          {replyingTo && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Секция:</strong> {replyingTo.section_id}
                </p>
                {replyingTo.feedback_text && (
                  <p className="text-sm whitespace-pre-wrap">{replyingTo.feedback_text}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply">Ваш ответ</Label>
                <Textarea
                  id="reply"
                  placeholder="Введите ответ пользователю..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplyingTo(null);
                setReplyText("");
              }}
              disabled={isSubmittingReply}
            >
              Отмена
            </Button>
            <Button onClick={handleReply} disabled={!replyText.trim() || isSubmittingReply}>
              {isSubmittingReply ? "Отправка..." : "Отправить ответ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

